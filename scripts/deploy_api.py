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

LOCAL_DIST = Path(__file__).parent.parent / 'h5-video-tool-api' / 'dist'


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

    def upload_dir(local_dir: Path, remote_dir: str) -> None:
        remote_mkdir(remote_dir)
        for item in local_dir.iterdir():
            remote_path = f'{remote_dir}/{item.name}'
            if item.is_dir():
                upload_dir(item, remote_path)
            else:
                sftp.put(str(item), remote_path)

    def ssh(cmd: str) -> str:
        _stdin, stdout, _stderr = client.exec_command(cmd)
        stdout.channel.recv_exit_status()
        return stdout.read().decode('utf-8', errors='replace').strip()

    print(f'正在上传后端产物到 {config.target}: {LOCAL_DIST} -> {config.api_dir}')
    upload_dir(LOCAL_DIST, config.api_dir)
    print('上传完成')

    sftp.close()

    print(f'重启 PM2 进程 {config.pm2_name}...')
    ssh(f'pm2 restart {config.pm2_name}')
    time.sleep(3)

    raw = ssh('pm2 jlist')
    data = json.loads(raw)
    for process in data:
        env = process.get('pm2_env', {})
        if env.get('name') != config.pm2_name:
            continue
        print(f"PM2 {env.get('name')} = {env.get('status')} (restarts={env.get('restart_time')})")

    client.close()
    print('后端部署完成')
    return True


if __name__ == '__main__':
    main()
