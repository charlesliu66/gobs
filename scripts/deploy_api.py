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
DEFAULT_SSH_TIMEOUT_SECONDS = 30
DEFAULT_CHANNEL_TIMEOUT_SECONDS = 120
DEFAULT_KEEPALIVE_SECONDS = 30


class DeployRuntimeError(RuntimeError):
    pass


def close_quietly(resource: object | None) -> None:
    if resource is None:
        return
    close = getattr(resource, 'close', None)
    if not callable(close):
        return
    try:
        close()
    except Exception:
        pass


def configure_ssh_keepalive(
    client: paramiko.SSHClient,
    *,
    interval_seconds: int = DEFAULT_KEEPALIVE_SECONDS,
) -> None:
    transport = client.get_transport()
    if transport is not None:
        transport.set_keepalive(interval_seconds)


def configure_sftp_timeout(
    sftp: paramiko.SFTPClient,
    *,
    timeout_seconds: int = DEFAULT_CHANNEL_TIMEOUT_SECONDS,
) -> None:
    channel = sftp.get_channel()
    channel.settimeout(timeout_seconds)


def connect_ssh_client(config, *, timeout_seconds: int = DEFAULT_SSH_TIMEOUT_SECONDS) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        config.host,
        username=config.user,
        password=config.password,
        timeout=timeout_seconds,
        banner_timeout=timeout_seconds,
        auth_timeout=timeout_seconds,
    )
    configure_ssh_keepalive(client)
    return client


def run_remote_command(
    client: paramiko.SSHClient,
    cmd: str,
    *,
    timeout_seconds: float = DEFAULT_CHANNEL_TIMEOUT_SECONDS,
    poll_interval_seconds: float = 0.1,
) -> str:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout_seconds)
    channel = stdout.channel
    channel.settimeout(timeout_seconds)
    close_quietly(stdin)

    stdout_chunks: list[bytes] = []
    stderr_chunks: list[bytes] = []
    deadline = time.monotonic() + timeout_seconds

    try:
        while True:
            while channel.recv_ready():
                stdout_chunks.append(channel.recv(65536))
            while channel.recv_stderr_ready():
                stderr_chunks.append(channel.recv_stderr(65536))

            if channel.exit_status_ready():
                break

            if time.monotonic() >= deadline:
                close_quietly(channel)
                raise DeployRuntimeError(f'远端命令超时 ({timeout_seconds:.0f}s): {cmd}')

            time.sleep(poll_interval_seconds)

        while channel.recv_ready():
            stdout_chunks.append(channel.recv(65536))
        while channel.recv_stderr_ready():
            stderr_chunks.append(channel.recv_stderr(65536))

        exit_code = channel.recv_exit_status()
        stdout_text = b''.join(stdout_chunks).decode('utf-8', errors='replace').strip()
        stderr_text = b''.join(stderr_chunks).decode('utf-8', errors='replace').strip()

        if exit_code != 0:
            detail = stderr_text or stdout_text or '(no remote output)'
            raise DeployRuntimeError(f'远端命令失败 ({exit_code}): {cmd}\n{detail}')

        return stdout_text
    finally:
        close_quietly(stderr)
        close_quietly(stdout)


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

    client: paramiko.SSHClient | None = None
    sftp: paramiko.SFTPClient | None = None

    try:
        client = connect_ssh_client(config)
        sftp = client.open_sftp()
        configure_sftp_timeout(sftp)

        def remote_mkdir(remote_path: str) -> None:
            assert sftp is not None
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
            assert sftp is not None
            remote_mkdir(remote_dir)
            for item in sorted(local_dir.iterdir(), key=lambda path: path.name):
                remote_path = f'{remote_dir}/{item.name}'
                if item.is_dir():
                    upload_dir(item, remote_path)
                else:
                    sftp.put(str(item), remote_path)

        def upload_runtime_scripts(remote_dir: str) -> None:
            assert sftp is not None
            script_paths = get_runtime_script_paths()
            ensure_runtime_scripts_exist(script_paths)
            remote_mkdir_p(remote_dir)
            for script_path in script_paths:
                sftp.put(str(script_path), f'{remote_dir}/{script_path.name}')

        print(f'正在上传后端产物到 {config.target}: {LOCAL_DIST} -> {config.api_dir}')
        upload_dir(LOCAL_DIST, config.api_dir)
        runtime_scripts_dir = get_remote_runtime_scripts_dir(config.api_dir)
        print(f'Uploading backend runtime scripts: {LOCAL_RUNTIME_SCRIPT_DIR} -> {runtime_scripts_dir}')
        upload_runtime_scripts(runtime_scripts_dir)
        print('上传完成')

        print(f'重启 PM2 进程 {config.pm2_name}...')
        run_remote_command(client, f'pm2 restart {config.pm2_name}')
        time.sleep(3)

        raw = run_remote_command(client, 'pm2 jlist')
        data = json.loads(raw)
        ensure_pm2_online(data, config.pm2_name)

        print('后端部署完成')
        return True
    except DeployRuntimeError as exc:
        print(f'[ERROR] {exc}')
        return False
    finally:
        close_quietly(sftp)
        close_quietly(client)


if __name__ == '__main__':
    raise SystemExit(0 if main() else 1)
