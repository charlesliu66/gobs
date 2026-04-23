"""
上传后端编译产物到目标环境，并重启对应 PM2 进程。
用法：
  python scripts/deploy_api.py --target staging
  python scripts/deploy_api.py --target prod
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import paramiko

try:
    from scripts.deploy_config import DeployConfigError, build_target_config
except ModuleNotFoundError:
    from deploy_config import DeployConfigError, build_target_config

LOCAL_API_ROOT = Path(__file__).parent.parent / 'h5-video-tool-api'
LOCAL_DIST = LOCAL_API_ROOT / 'dist'
LOCAL_RUNTIME_SCRIPT_DIR = LOCAL_API_ROOT / 'scripts'
RUNTIME_SCRIPT_NAMES = ('imagen_generate.py',)


class DeployRuntimeError(RuntimeError):
    pass


def remote_parent(remote_path: str) -> str:
    normalized = remote_path.rstrip('/')
    if not normalized or normalized == '/':
        return '/'
    parent = normalized.rsplit('/', 1)[0]
    return parent or '/'


def get_remote_runtime_scripts_dir(api_dir: str) -> str:
    return f'{remote_parent(api_dir)}/scripts'


def get_runtime_script_paths(script_dir: Path = LOCAL_RUNTIME_SCRIPT_DIR) -> list[Path]:
    return [script_dir / name for name in RUNTIME_SCRIPT_NAMES]


def ensure_runtime_scripts_exist(script_paths: list[Path]) -> None:
    missing = [str(path) for path in script_paths if not path.exists()]
    if missing:
        rendered = '\n'.join(f'- {path}' for path in missing)
        raise DeployRuntimeError(f'Missing backend runtime scripts:\n{rendered}')


def ensure_pm2_online(processes: list[dict], pm2_name: str) -> None:
    for process in processes:
        env = process.get('pm2_env', {})
        if env.get('name') != pm2_name:
            continue
        status = str(env.get('status', '')).strip()
        restart_time = env.get('restart_time')
        print(f"PM2 {env.get('name')} = {status} (restarts={restart_time})")
        if status != 'online':
            raise DeployRuntimeError(f'PM2 进程 {pm2_name} 状态异常: {status}')
        return

    raise DeployRuntimeError(f'未找到 PM2 进程 {pm2_name}')


def main() -> bool:
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', choices=['staging', 'prod'], default='prod')
    args = parser.parse_args()

    try:
        config = build_target_config(args.target)
    except DeployConfigError as exc:
        print(f'[ERROR] {exc}')
        return False

    if not LOCAL_DIST.exists():
        print(f'[ERROR] 后端构建产物不存在: {LOCAL_DIST}')
        print('请先运行: cd h5-video-tool-api && npm run build')
        return False

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(config.host, username=config.user, password=config.password, timeout=30)
    sftp = client.open_sftp()

    def remote_mkdir(remote_path: str) -> None:
        try:
            sftp.stat(remote_path)
        except FileNotFoundError:
            sftp.mkdir(remote_path)

    def remote_mkdir_p(remote_path: str) -> None:
        current = ''
        for part in remote_path.strip('/').split('/'):
            if not part:
                continue
            current = f'{current}/{part}'
            remote_mkdir(current)

    def upload_dir(local_dir: Path, remote_dir: str) -> None:
        remote_mkdir(remote_dir)
        for item in local_dir.iterdir():
            remote_path = f'{remote_dir}/{item.name}'
            if item.is_dir():
                upload_dir(item, remote_path)
            else:
                sftp.put(str(item), remote_path)

    def upload_runtime_scripts(remote_dir: str) -> None:
        script_paths = get_runtime_script_paths()
        ensure_runtime_scripts_exist(script_paths)
        remote_mkdir_p(remote_dir)
        for script_path in script_paths:
            sftp.put(str(script_path), f'{remote_dir}/{script_path.name}')

    def ssh(cmd: str) -> str:
        _stdin, stdout, _stderr = client.exec_command(cmd)
        stdout.channel.recv_exit_status()
        return stdout.read().decode('utf-8', errors='replace').strip()

    print(f'正在上传后端产物到 {config.target}: {LOCAL_DIST} -> {config.api_dir}')
    upload_dir(LOCAL_DIST, config.api_dir)
    runtime_scripts_dir = get_remote_runtime_scripts_dir(config.api_dir)
    print(f'Uploading backend runtime scripts: {LOCAL_RUNTIME_SCRIPT_DIR} -> {runtime_scripts_dir}')
    upload_runtime_scripts(runtime_scripts_dir)
    print('上传完成')

    sftp.close()

    print(f'重启 PM2 进程 {config.pm2_name}...')
    ssh(f'pm2 restart {config.pm2_name}')
    time.sleep(3)

    raw = ssh('pm2 jlist')
    data = json.loads(raw)
    ensure_pm2_online(data, config.pm2_name)

    client.close()
    print('后端部署完成')
    return True


if __name__ == '__main__':
    main()
