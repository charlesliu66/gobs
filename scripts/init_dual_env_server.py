"""
初始化单机双环境服务器布局。

目标：
1. 将当前 /home/ubuntu/qas-h5/api + frontend 迁移为 prod/staging 双目录
2. 创建 qas-api-prod(3001) / qas-api-staging(3002) 两个 PM2 进程
3. 将 Nginx 改为 prod:80 / staging:8080

运行前要求：
- 本地 .env 中已有 SERVER_HOST / SERVER_USER / SERVER_PASSWORD
- 运行命令时显式提供 DEPLOY_STAGING_* 与 DEPLOY_PROD_* 变量
"""
from __future__ import annotations

import argparse
import datetime as dt
from pathlib import PurePosixPath

import paramiko

try:
    from scripts.deploy_config import build_target_config
    from scripts.server_layout import apply_env_overrides, render_dual_env_nginx_config
except ModuleNotFoundError:
    from deploy_config import build_target_config
    from server_layout import apply_env_overrides, render_dual_env_nginx_config


CURRENT_API_DIR = '/home/ubuntu/qas-h5/api'
CURRENT_FRONTEND_DIR = '/home/ubuntu/qas-h5/frontend'
CURRENT_NGINX_SITE = '/etc/nginx/sites-enabled/qas-h5'
UTC = dt.timezone.utc
LEGACY_DATA_PATHS = [
    'output',
    'editor-projects',
    'quickfilm',
    'uploads',
    'data',
    'db',
    '.data',
    'exports',
    'assets',
    'asset-index.json',
    'drive-cache',
]


def _exec(client: paramiko.SSHClient, cmd: str, *, check: bool = True) -> tuple[int, str, str]:
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if check and exit_code != 0:
        raise RuntimeError(f'Command failed ({exit_code}): {cmd}\nSTDOUT:\n{out}\nSTDERR:\n{err}')
    return exit_code, out, err


def _write_remote_file(client: paramiko.SSHClient, remote_path: str, content: str, *, sudo: bool = False) -> None:
    sftp = client.open_sftp()
    temp_path = f'/tmp/{_remote_name(remote_path)}.codex.tmp'
    with sftp.file(temp_path, 'w') as handle:
        handle.write(content)
    sftp.close()
    if sudo:
        _exec(client, f"sudo mkdir -p {_remote_parent(remote_path)} && sudo mv {temp_path} {remote_path}")
    else:
        _exec(client, f"mkdir -p {_remote_parent(remote_path)} && mv {temp_path} {remote_path}")


def _read_remote_file(client: paramiko.SSHClient, remote_path: str) -> str:
    _, out, _ = _exec(client, f'cat {remote_path}')
    return out


def _ensure_seed_copy(client: paramiko.SSHClient, source_dir: str, target_dir: str) -> None:
    _exec(client, f'mkdir -p {target_dir}')
    _exec(client, f'cp -a {source_dir}/. {target_dir}/')


def _configure_env(client: paramiko.SSHClient, env_path: str, *, port: int, data_dir: str, environment: str) -> None:
    current_text = _read_remote_file(client, env_path)
    updated_text = apply_env_overrides(
        current_text,
        {
            'PORT': str(port),
            'API_DATA_DIR': data_dir,
            'APP_ENVIRONMENT': environment,
        },
    )
    _write_remote_file(client, env_path, updated_text, sudo=False)


def _legacy_data_migration_commands(source_root: str, target_root: str) -> list[str]:
    commands: list[str] = []
    for relative_path in LEGACY_DATA_PATHS:
        source_path = f'{source_root}/{relative_path}'
        target_path = f'{target_root}/{relative_path}'
        target_parent = _remote_parent(target_path)
        commands.append(
            ' '.join([
                f"if [ -d '{source_path}' ]; then",
                f"mkdir -p '{target_path}'",
                f"cp -an '{source_path}/.' '{target_path}/'",
                'fi',
            ])
        )
        commands.append(
            ' '.join([
                f"if [ -f '{source_path}' ]; then",
                f"mkdir -p '{target_parent}'",
                f"cp -n '{source_path}' '{target_path}'",
                'fi',
            ])
        )
    return commands


def _restart_pm2_process(client: paramiko.SSHClient, *, name: str, script_path: str, cwd: str) -> None:
    _exec(client, f'pm2 delete {name}', check=False)
    _exec(client, f'pm2 start {script_path} --name {name} --cwd {cwd}')


def _remote_parent(remote_path: str) -> str:
    return str(PurePosixPath(remote_path).parent)


def _remote_name(remote_path: str) -> str:
    return PurePosixPath(remote_path).name


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--staging-listen-port', type=int, default=8080)
    args = parser.parse_args()

    prod = build_target_config('prod')
    staging = build_target_config('staging')

    if (prod.host, prod.user, prod.password) != (staging.host, staging.user, staging.password):
        raise SystemExit('prod/staging server credentials must match for same-host initialization')

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        prod.host,
        username=prod.user,
        password=prod.password,
        look_for_keys=False,
        allow_agent=False,
        timeout=30,
    )

    try:
        prod_base = _remote_parent(prod.api_dir)
        staging_base = _remote_parent(staging.api_dir)
        prod_env_path = f'{prod.api_dir}/.env'
        staging_env_path = f'{staging.api_dir}/.env'
        backup_stamp = dt.datetime.now(UTC).strftime('%Y%m%d%H%M%S')

        for remote_dir in [
            prod.api_dir,
            prod.frontend_dir,
            f'{prod_base}/shared-data',
            staging.api_dir,
            staging.frontend_dir,
            f'{staging_base}/shared-data',
        ]:
            _exec(client, f'mkdir -p {remote_dir}')

        _ensure_seed_copy(client, CURRENT_API_DIR, prod.api_dir)
        _ensure_seed_copy(client, CURRENT_FRONTEND_DIR, prod.frontend_dir)
        _ensure_seed_copy(client, CURRENT_API_DIR, staging.api_dir)
        _ensure_seed_copy(client, CURRENT_FRONTEND_DIR, staging.frontend_dir)

        _exec(client, f'cp {CURRENT_API_DIR}/.env {prod_env_path}')
        _exec(client, f'cp {CURRENT_API_DIR}/.env {staging_env_path}')

        _configure_env(
            client,
            prod_env_path,
            port=3001,
            data_dir=f'{prod_base}/shared-data',
            environment='prod',
        )
        _configure_env(
            client,
            staging_env_path,
            port=3002,
            data_dir=f'{staging_base}/shared-data',
            environment='staging',
        )

        for cmd in _legacy_data_migration_commands(CURRENT_API_DIR, f'{prod_base}/shared-data'):
            _exec(client, cmd)
        for cmd in _legacy_data_migration_commands(CURRENT_API_DIR, f'{staging_base}/shared-data'):
            _exec(client, cmd)

        _exec(client, 'pm2 delete qas-api', check=False)
        _restart_pm2_process(client, name=prod.pm2_name, script_path=f'{prod.api_dir}/index.js', cwd=prod.api_dir)
        _restart_pm2_process(client, name=staging.pm2_name, script_path=f'{staging.api_dir}/index.js', cwd=staging.api_dir)
        _exec(client, 'pm2 save')

        nginx_backup_path = f'{CURRENT_NGINX_SITE}.bak-{backup_stamp}'
        _exec(client, f'sudo cp {CURRENT_NGINX_SITE} {nginx_backup_path}')

        nginx_content = render_dual_env_nginx_config(
            server_name=prod.host,
            prod_root=prod.frontend_dir,
            prod_api_port=3001,
            staging_root=staging.frontend_dir,
            staging_listen_port=args.staging_listen_port,
            staging_api_port=3002,
        )
        _write_remote_file(client, CURRENT_NGINX_SITE, nginx_content, sudo=True)
        _exec(client, 'sudo nginx -t')
        _exec(client, 'sudo systemctl reload nginx')

        for cmd in [
            'pm2 list',
            'curl -s http://127.0.0.1:3001/api/system/version',
            'curl -s http://127.0.0.1:3002/api/system/version',
            'curl -s http://127.0.0.1/api/system/version',
            f'curl -s http://127.0.0.1:{args.staging_listen_port}/api/system/version',
        ]:
            _exec(client, cmd)
    finally:
        client.close()


if __name__ == '__main__':
    main()
