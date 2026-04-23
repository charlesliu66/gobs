from __future__ import annotations

import argparse
import getpass
import json
import shlex
from pathlib import PurePosixPath
from typing import Any

import paramiko

try:
    from scripts.deploy_all import get_remote_version_payload
    from scripts.deploy_config import DeployConfigError, build_target_config
    from scripts.release_guard import build_verified_release_payload, get_remote_release_ready_path
except ModuleNotFoundError:
    from deploy_all import get_remote_version_payload
    from deploy_config import DeployConfigError, build_target_config
    from release_guard import build_verified_release_payload, get_remote_release_ready_path


def _write_remote_json(target: str, remote_path: str, payload: dict[str, Any]) -> None:
    config = build_target_config(target)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(config.host, username=config.user, password=config.password, timeout=30)
    sftp = client.open_sftp()
    try:
        remote_dir = str(PurePosixPath(remote_path).parent)
        _stdin, stdout, _stderr = client.exec_command(f'mkdir -p {shlex.quote(remote_dir)}')
        stdout.channel.recv_exit_status()
        with sftp.file(remote_path, 'w') as handle:
            handle.write(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    finally:
        sftp.close()
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Record that the current staging build has been manually validated and is ready for prod promotion.',
    )
    parser.add_argument('--target', choices=['staging'], default='staging')
    parser.add_argument('--updated-by', default=getpass.getuser())
    args = parser.parse_args()

    try:
        config = build_target_config(args.target)
    except DeployConfigError as exc:
        print(f'[ERROR] {exc}')
        return 1

    try:
        version_payload = get_remote_version_payload(config.version_url)
    except Exception as exc:
        print(f'[ERROR] 无法读取 {config.target} 版本信息: {exc}')
        return 1

    commit_sha = str(version_payload.get('commitSha', '')).strip()
    commit_short = str(version_payload.get('commitShort', '')).strip() or commit_sha[:8]
    if not commit_sha:
        print('[ERROR] staging 版本信息缺少 commitSha，无法标记为已验证。')
        return 1

    payload = build_verified_release_payload(
        target=config.target,
        commit_sha=commit_sha,
        commit_short=commit_short,
        verified_by=args.updated_by,
    )

    remote_path = get_remote_release_ready_path(config.api_dir)
    _write_remote_json(config.target, remote_path, payload)
    print(json.dumps({'target': config.target, 'remotePath': remote_path, 'releaseReady': payload}, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
