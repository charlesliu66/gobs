"""
上传后端编译产物到目标环境，并重启对应 PM2 进程。
用法：
  python scripts/deploy_api.py --target staging
  python scripts/deploy_api.py --target prod
"""
from __future__ import annotations

import argparse
import json
import shlex
import tarfile
import time
import tempfile
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
SFTP_WINDOW_SIZE = 64 * 1024 * 1024
SFTP_MAX_PACKET_SIZE = 256 * 1024


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
    socket_timeout_seconds: int = DEFAULT_CHANNEL_TIMEOUT_SECONDS,
) -> None:
    transport = client.get_transport()
    if transport is not None:
        transport.set_keepalive(interval_seconds)
        sock = getattr(transport, 'sock', None)
        settimeout = getattr(sock, 'settimeout', None)
        if callable(settimeout):
            settimeout(socket_timeout_seconds)


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


def open_sftp_client(client: paramiko.SSHClient) -> paramiko.SFTPClient:
    transport = client.get_transport()
    if transport is None:
        raise DeployRuntimeError('SSH transport is not available for SFTP upload.')
    sftp = paramiko.SFTPClient.from_transport(
        transport,
        window_size=SFTP_WINDOW_SIZE,
        max_packet_size=SFTP_MAX_PACKET_SIZE,
    )
    if sftp is None:
        raise DeployRuntimeError('Unable to open SFTP client.')
    configure_sftp_timeout(sftp)
    return sftp


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


def create_directory_archive(source_dir: Path, archive_path: Path) -> None:
    with tarfile.open(archive_path, 'w:gz') as archive:
        for item in sorted(source_dir.rglob('*'), key=lambda path: path.as_posix()):
            archive.add(item, arcname=str(item.relative_to(source_dir)), recursive=False)


def build_remote_archive_name(kind: str, target: str) -> str:
    safe_kind = ''.join(ch for ch in kind if ch.isalnum() or ch in ('-', '_')) or 'deploy'
    safe_target = ''.join(ch for ch in target if ch.isalnum() or ch in ('-', '_')) or 'target'
    return f'qas-{safe_kind}-{safe_target}-{int(time.time())}.tar.gz'


def upload_and_extract_archive(
    *,
    client: paramiko.SSHClient,
    sftp: paramiko.SFTPClient,
    archive_path: Path,
    remote_dir: str,
    remote_archive_name: str,
) -> None:
    remote_archive_path = f'/tmp/{remote_archive_name}'
    size_mb = archive_path.stat().st_size / (1024 * 1024)
    print(f'  archive {archive_path.name} ({size_mb:.2f} MB) -> {remote_archive_path}')
    progress_marks: set[int] = set()

    def progress(transferred: int, total: int) -> None:
        if total <= 0:
            return
        percent = int(transferred * 100 / total)
        mark = min(100, (percent // 25) * 25)
        if mark and mark not in progress_marks:
            progress_marks.add(mark)
            print(f'  upload {mark}% ({transferred}/{total} bytes)')

    sftp.put(str(archive_path), remote_archive_path, callback=progress, confirm=False)
    run_remote_command(
        client,
        ' && '.join([
            f'mkdir -p {shlex.quote(remote_dir)}',
            f'tar -xzf {shlex.quote(remote_archive_path)} -C {shlex.quote(remote_dir)}',
            f'rm -f {shlex.quote(remote_archive_path)}',
        ]),
    )


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
        sftp = open_sftp_client(client)

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

        def upload_runtime_scripts(remote_dir: str) -> None:
            assert sftp is not None
            script_paths = get_runtime_script_paths()
            ensure_runtime_scripts_exist(script_paths)
            remote_mkdir_p(remote_dir)
            for script_path in script_paths:
                sftp.put(str(script_path), f'{remote_dir}/{script_path.name}', confirm=False)
                print(f'  runtime/{script_path.name}')

        print(f'正在上传后端产物到 {config.target}: {LOCAL_DIST} -> {config.api_dir}')
        with tempfile.TemporaryDirectory() as temp_dir:
            archive_path = Path(temp_dir) / 'api-dist.tar.gz'
            create_directory_archive(LOCAL_DIST, archive_path)
            upload_and_extract_archive(
                client=client,
                sftp=sftp,
                archive_path=archive_path,
                remote_dir=config.api_dir,
                remote_archive_name=build_remote_archive_name('api', config.target),
            )
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
