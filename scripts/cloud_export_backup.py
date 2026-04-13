#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from datetime import datetime
import hashlib
import os
import paramiko


def read_env_value(env_path: Path, key: str) -> str:
    if not env_path.exists():
        return ""
    for line in env_path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s.startswith(f"{key}="):
            return s.split("=", 1)[1].strip()
    return ""


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 180) -> tuple[int, str, str]:
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(1024 * 1024)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    env_path = root / "h5-video-tool-api/.env"
    host = read_env_value(env_path, "SERVER_HOST")
    user = read_env_value(env_path, "SERVER_USER")
    pwd = read_env_value(env_path, "SERVER_PASSWORD")
    port = int(read_env_value(env_path, "SERVER_PORT") or "22")
    if not host or not user or not pwd:
        raise RuntimeError("missing SERVER_HOST/SERVER_USER/SERVER_PASSWORD in local env")

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    remote_tgz = f"/home/ubuntu/gobs-export-{ts}.tar.gz"
    remote_meta = f"/home/ubuntu/gobs-export-{ts}.meta.txt"
    local_dir = root / "backups" / "cloud-export"
    local_dir.mkdir(parents=True, exist_ok=True)
    local_tgz = local_dir / f"gobs-export-{ts}.tar.gz"
    local_meta = local_dir / f"gobs-export-{ts}.meta.txt"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, port=port, username=user, password=pwd, timeout=25)
    try:
        cmd_meta = (
            "bash -lc 'set -e; "
            f"echo \"timestamp={ts}\" > {remote_meta}; "
            "echo \"hostname=$(hostname)\" >> " + remote_meta + "; "
            "echo \"cwd=$(pwd)\" >> " + remote_meta + "; "
            "echo \"node=$(node -v 2>/dev/null || echo n/a)\" >> " + remote_meta + "; "
            "echo \"npm=$(npm -v 2>/dev/null || echo n/a)\" >> " + remote_meta + "; "
            "echo \"python3=$(python3 --version 2>/dev/null || echo n/a)\" >> " + remote_meta + "; "
            "echo \"pm2=$(pm2 -v 2>/dev/null || echo n/a)\" >> " + remote_meta + "; "
            "echo \"--- pm2 list ---\" >> " + remote_meta + "; "
            "pm2 list >> " + remote_meta + " 2>&1 || true; "
            "echo \"--- disk ---\" >> " + remote_meta + "; "
            "df -h >> " + remote_meta + " 2>&1 || true; "
            "echo \"--- gobs size ---\" >> " + remote_meta + "; "
            "du -sh /home/ubuntu/gobs >> " + remote_meta + " 2>&1 || true; "
            "'"
        )
        code, out, err = run(ssh, cmd_meta, timeout=120)
        if code != 0:
            raise RuntimeError(f"remote meta collect failed: {err or out}")

        # 打包整个 /home/ubuntu/gobs（含 node_modules、dist、.env、uploads、.data 等）
        cmd_tar = (
            "bash -lc 'set -e; "
            f"tar -czf {remote_tgz} /home/ubuntu/gobs {remote_meta}; "
            f"ls -lh {remote_tgz}; "
            "'"
        )
        code, out, err = run(ssh, cmd_tar, timeout=3600)
        if code != 0:
            raise RuntimeError(f"remote tar failed: {err or out}")
        print(out.strip())

        sftp = ssh.open_sftp()
        try:
            sftp.get(remote_tgz, str(local_tgz))
            sftp.get(remote_meta, str(local_meta))
        finally:
            sftp.close()

        code, out, err = run(
            ssh,
            "bash -lc 'set -e; "
            f"sha256sum {remote_tgz} {remote_meta}; "
            "'",
            timeout=120,
        )
        if out.strip():
            print(out.strip())
        if code != 0:
            print(err.strip())

        local_hash = sha256_file(local_tgz)
        print(f"LOCAL_ARCHIVE={local_tgz}")
        print(f"LOCAL_META={local_meta}")
        print(f"LOCAL_SHA256={local_hash}")
        print(f"REMOTE_ARCHIVE={remote_tgz}")
    finally:
        ssh.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

