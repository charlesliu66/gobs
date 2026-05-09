"""
上传前端构建产物到目标环境。
用法：
  python scripts/deploy_frontend.py --target staging
  python scripts/deploy_frontend.py --target prod
"""
from __future__ import annotations

import argparse
import shlex
import tempfile
from pathlib import Path

import paramiko

try:
    from scripts.deploy_config import DeployConfigError, build_target_config
    from scripts.deploy_api import (
        build_remote_archive_name,
        close_quietly,
        connect_ssh_client,
        create_directory_archive,
        run_remote_command,
        upload_and_extract_archive,
    )
except ModuleNotFoundError:
    from deploy_config import DeployConfigError, build_target_config
    from deploy_api import (
        build_remote_archive_name,
        close_quietly,
        connect_ssh_client,
        create_directory_archive,
        run_remote_command,
        upload_and_extract_archive,
    )

LOCAL_DIST = Path(__file__).parent.parent / 'h5-video-tool' / 'dist'


def promote_frontend_from_target(
    client: paramiko.SSHClient,
    *,
    source_dir: str,
    target_dir: str,
) -> None:
    run_remote_command(
        client,
        ' && '.join([
            f'test -d {shlex.quote(source_dir)}',
            f'mkdir -p {shlex.quote(target_dir)}',
            f'tar -C {shlex.quote(source_dir)} -czf - . | tar -xzf - -C {shlex.quote(target_dir)}',
        ]),
        timeout_seconds=300,
    )


def main() -> bool:
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', choices=['staging', 'prod'], default='prod')
    parser.add_argument(
        '--source-target',
        choices=['staging'],
        help='Promote frontend files from another server-side environment instead of uploading local dist.',
    )
    args = parser.parse_args()

    try:
        config = build_target_config(args.target)
        source_config = build_target_config(args.source_target) if args.source_target else None
    except DeployConfigError as exc:
        print(f'[ERROR] {exc}')
        return False

    if source_config is None and not LOCAL_DIST.exists():
        print(f'[ERROR] 找不到前端构建产物: {LOCAL_DIST}')
        print('请先运行: cd h5-video-tool && npm run build')
        return False

    client: paramiko.SSHClient | None = None

    try:
        client = connect_ssh_client(config)

        if source_config is not None:
            if source_config.host != config.host:
                raise RuntimeError('source-target and target must be on the same host for server-side promotion.')
            print(
                f'正在提升前端产物: {source_config.target}:{source_config.frontend_dir} '
                f'-> {config.target}:{config.frontend_dir}'
            )
            promote_frontend_from_target(
                client,
                source_dir=source_config.frontend_dir,
                target_dir=config.frontend_dir,
            )
            print('前端部署完成')
            return True

        print(f'正在上传前端产物到 {config.target}: {LOCAL_DIST} -> {config.frontend_dir}')
        with tempfile.TemporaryDirectory() as temp_dir:
            archive_path = Path(temp_dir) / 'frontend-dist.tar.gz'
            create_directory_archive(LOCAL_DIST, archive_path)
            upload_and_extract_archive(
                client=client,
                archive_path=archive_path,
                remote_dir=config.frontend_dir,
                remote_archive_name=build_remote_archive_name('frontend', config.target),
            )

        print('前端部署完成')
        return True
    except Exception as exc:
        print(f'[ERROR] 前端部署失败: {exc}')
        return False
    finally:
        close_quietly(client)


if __name__ == '__main__':
    raise SystemExit(0 if main() else 1)
