"""
上传前端构建产物到目标环境。
用法：
  python scripts/deploy_frontend.py --target staging
  python scripts/deploy_frontend.py --target prod
"""
from __future__ import annotations

import argparse
from pathlib import Path

import paramiko

try:
    from scripts.deploy_config import DeployConfigError, build_target_config
    from scripts.deploy_api import close_quietly, configure_sftp_timeout, connect_ssh_client
except ModuleNotFoundError:
    from deploy_config import DeployConfigError, build_target_config
    from deploy_api import close_quietly, configure_sftp_timeout, connect_ssh_client

LOCAL_DIST = Path(__file__).parent.parent / 'h5-video-tool' / 'dist'


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
        print(f'[ERROR] 找不到前端构建产物: {LOCAL_DIST}')
        print('请先运行: cd h5-video-tool && npm run build')
        return False

    client: paramiko.SSHClient | None = None
    sftp: paramiko.SFTPClient | None = None

    try:
        client = connect_ssh_client(config)
        sftp = client.open_sftp()
        configure_sftp_timeout(sftp)

        def remote_exists(remote_path: str) -> bool:
            assert sftp is not None
            try:
                sftp.stat(remote_path)
                return True
            except FileNotFoundError:
                return False

        def remote_mkdir(remote_path: str) -> None:
            assert sftp is not None
            if not remote_exists(remote_path):
                sftp.mkdir(remote_path)

        def upload_dir(local_dir: Path, remote_dir: str) -> None:
            assert sftp is not None
            remote_mkdir(remote_dir)
            for item in sorted(local_dir.iterdir(), key=lambda path: path.name):
                remote_path = f'{remote_dir}/{item.name}'
                if item.is_dir():
                    upload_dir(item, remote_path)
                else:
                    sftp.put(str(item), remote_path)
                    print(f'  {item.relative_to(LOCAL_DIST)}')

        print(f'正在上传前端产物到 {config.target}: {LOCAL_DIST} -> {config.frontend_dir}')
        upload_dir(LOCAL_DIST, config.frontend_dir)

        print('前端部署完成')
        return True
    except Exception as exc:
        print(f'[ERROR] 前端部署失败: {exc}')
        return False
    finally:
        close_quietly(sftp)
        close_quietly(client)


if __name__ == '__main__':
    raise SystemExit(0 if main() else 1)
