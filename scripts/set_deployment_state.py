from __future__ import annotations

import argparse
import datetime as dt
import getpass
import json
import shlex
from pathlib import PurePosixPath
from typing import Any

import paramiko

try:
    from scripts.deploy_config import DeployConfigError, build_target_config
except ModuleNotFoundError:
    from deploy_config import DeployConfigError, build_target_config


UTC = dt.timezone.utc

VALID_PHASES = ('idle', 'preparing', 'deploying', 'verifying')
DEFAULT_LEVEL_BY_PHASE = {
    'idle': 'info',
    'preparing': 'warning',
    'deploying': 'critical',
    'verifying': 'info',
}


def get_remote_deployment_state_path(api_dir: str) -> str:
    env_root = PurePosixPath(api_dir).parent
    return str(env_root / 'shared-data' / '.data' / 'deployment-state.json')


def _to_iso8601_z(now: dt.datetime) -> str:
    return now.astimezone(UTC).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def build_deployment_state_payload(
    phase: str,
    *,
    updated_by: str,
    message_zh: str = '',
    message_en: str = '',
    allow_writes: bool | None = None,
    now: dt.datetime | None = None,
) -> dict[str, Any]:
    normalized_phase = phase.strip().lower()
    if normalized_phase not in VALID_PHASES:
        raise ValueError(f'Unsupported deployment phase: {phase}')

    resolved_now = now or dt.datetime.now(UTC)
    resolved_allow_writes = normalized_phase != 'deploying' if allow_writes is None else allow_writes
    normalized_updated_by = updated_by.strip() or 'operator'

    return {
        'active': normalized_phase != 'idle',
        'phase': normalized_phase,
        'level': DEFAULT_LEVEL_BY_PHASE[normalized_phase],
        'messageZh': message_zh.strip(),
        'messageEn': message_en.strip(),
        'allowWrites': resolved_allow_writes,
        'updatedAt': _to_iso8601_z(resolved_now),
        'updatedBy': normalized_updated_by,
    }


def _read_remote_state(sftp: paramiko.SFTPClient, remote_path: str) -> dict[str, Any]:
    try:
        with sftp.file(remote_path, 'r') as handle:
            return json.loads(handle.read().decode('utf-8'))
    except (FileNotFoundError, json.JSONDecodeError):
        return build_deployment_state_payload('idle', updated_by='system')


def _write_remote_state(
    client: paramiko.SSHClient,
    sftp: paramiko.SFTPClient,
    remote_path: str,
    payload: dict[str, Any],
) -> None:
    remote_dir = str(PurePosixPath(remote_path).parent)
    stdin, stdout, _stderr = client.exec_command(f'mkdir -p {shlex.quote(remote_dir)}')
    stdout.channel.recv_exit_status()
    with sftp.file(remote_path, 'w') as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Show or update deployment-state.json on staging/prod via SSH.',
    )
    parser.add_argument('--target', choices=['staging', 'prod'], required=True)
    parser.add_argument('--show', action='store_true', help='Print the current remote deployment state and exit.')
    parser.add_argument('--phase', choices=VALID_PHASES, help='Deployment phase to write.')
    parser.add_argument('--message-zh', default='', help='Optional Chinese banner copy. Leave empty to use frontend fallback copy.')
    parser.add_argument('--message-en', default='', help='Optional English banner copy. Leave empty to use frontend fallback copy.')
    parser.add_argument(
        '--allow-writes',
        choices=['true', 'false'],
        help='Override whether new write actions are allowed during this phase.',
    )
    parser.add_argument('--updated-by', default=getpass.getuser(), help='Operator name recorded in deployment-state.json.')
    args = parser.parse_args()

    if args.show and args.phase:
        parser.error('Use either --show or --phase, not both.')
    if not args.show and not args.phase:
        parser.error('Either --show or --phase is required.')

    try:
        config = build_target_config(args.target)
    except DeployConfigError as exc:
        print(f'[ERROR] {exc}')
        return 1

    remote_path = get_remote_deployment_state_path(config.api_dir)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        config.host,
        username=config.user,
        password=config.password,
        look_for_keys=False,
        allow_agent=False,
        timeout=30,
    )
    sftp = client.open_sftp()

    try:
        if args.show:
            payload = _read_remote_state(sftp, remote_path)
        else:
            payload = build_deployment_state_payload(
                args.phase or 'idle',
                updated_by=args.updated_by,
                message_zh=args.message_zh,
                message_en=args.message_en,
                allow_writes=None if args.allow_writes is None else args.allow_writes == 'true',
            )
            _write_remote_state(client, sftp, remote_path, payload)

        print(json.dumps(
            {
                'target': config.target,
                'remotePath': remote_path,
                'state': payload,
            },
            ensure_ascii=False,
            indent=2,
        ))
        return 0
    finally:
        sftp.close()
        client.close()


if __name__ == '__main__':
    raise SystemExit(main())
