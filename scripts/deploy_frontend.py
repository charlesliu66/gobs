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
except ModuleNotFoundError:
    from deploy_config import DeployConfigError, build_target_config

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

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(config.host, username=config.user, password=config.password, timeout=30)
    sftp = client.open_sftp()

    def remote_exists(remote_path: str) -> bool:
        try:
            sftp.stat(remote_path)
            return True
        except FileNotFoundError:
            return False

    def remote_mkdir(remote_path: str) -> None:
        if not remote_exists(remote_path):
            sftp.mkdir(remote_path)

    def upload_dir(local_dir: Path, remote_dir: str, depth: int = 0) -> None:
        remote_mkdir(remote_dir)
        for item in local_dir.iterdir():
            remote_path = f'{remote_dir}/{item.name}'
            if item.is_dir():
                upload_dir(item, remote_path, depth + 1)
            else:
                sftp.put(str(item), remote_path)
                if depth == 0:
                    print(f'  {item.name}')

    print(f'正在上传前端产物到 {config.target}: {LOCAL_DIST} -> {config.frontend_dir}')
    upload_dir(LOCAL_DIST, config.frontend_dir)

    sftp.close()
    client.close()
    print('前端部署完成')
    return True


if __name__ == '__main__':
    main()
