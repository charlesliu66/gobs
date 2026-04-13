#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import argparse
import paramiko


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 300) -> tuple[int, str, str]:
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def main() -> int:
    p = argparse.ArgumentParser(description="Restore exported gobs backup to a new server")
    p.add_argument("--host", required=True)
    p.add_argument("--user", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--port", type=int, default=22)
    p.add_argument("--archive", required=True, help="Local backup archive path")
    args = p.parse_args()

    local_archive = Path(args.archive).resolve()
    if not local_archive.exists():
        raise RuntimeError(f"archive not found: {local_archive}")

    remote_archive = f"/home/{args.user}/{local_archive.name}"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(args.host, port=args.port, username=args.user, password=args.password, timeout=25)
    try:
        sftp = ssh.open_sftp()
        try:
            sftp.put(str(local_archive), remote_archive)
        finally:
            sftp.close()

        cmd = (
            "bash -lc 'set -e; "
            "mkdir -p /home/{u}/gobs; "
            "tar -xzf {arc} -C /; "
            "rm -f {arc}; "
            "if command -v pm2 >/dev/null 2>&1; then "
            "pm2 restart gobs-api || true; "
            "pm2 save || true; "
            "fi; "
            "echo RESTORE_DONE; "
            "'"
        ).format(u=args.user, arc=remote_archive)
        code, out, err = run(ssh, cmd, timeout=1200)
        print(out.strip())
        if err.strip():
            print(err.strip())
        if code != 0:
            raise RuntimeError("restore failed")
    finally:
        ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

