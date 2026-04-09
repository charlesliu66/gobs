#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import posixpath
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import paramiko


def read_env_value(env_path: Path, key: str) -> str:
    text = env_path.read_text(encoding="utf-8")
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip()
    return ""


def ssh_connect(host: str, user: str, password: str, timeout: int = 20) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=timeout)
    return client


def run_remote(client: paramiko.SSHClient, command: str, timeout: int = 180) -> Tuple[int, str, str]:
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def discover_repo(client: paramiko.SSHClient, candidates: List[str]) -> str:
    for candidate in candidates:
        cmd = (
            "bash -lc "
            + repr(
                f'if [ -d "{candidate}/.git" ]; then echo "{candidate}"; fi'
            )
        )
        code, out, _ = run_remote(client, cmd, timeout=30)
        if code == 0 and out.strip():
            return out.strip().splitlines()[0]
    return ""


def sync_remote_repo(client: paramiko.SSHClient, repo_path: str, commit_message: str) -> Dict[str, str]:
    # cloud-first: remote becomes canonical, then push to origin
    body = f"""
set -e
cd "{repo_path}"
branch=$(git rev-parse --abbrev-ref HEAD)
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "{commit_message}"
  committed=1
else
  committed=0
fi
git push origin "$branch"
sha=$(git rev-parse HEAD)
printf 'BRANCH=%s\\n' "$branch"
printf 'SHA=%s\\n' "$sha"
printf 'COMMITTED=%s\\n' "$committed"
"""
    code, out, err = run_remote(client, "bash -lc " + repr(body), timeout=300)
    if code != 0:
        raise RuntimeError(f"remote sync failed: {err or out}")

    result: Dict[str, str] = {}
    for line in out.splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            result[k.strip()] = v.strip()
    return result


def list_remote_frontend(client: paramiko.SSHClient, remote_frontend_dir: str) -> Dict[str, str]:
    code, out, err = run_remote(
        client,
        "bash -lc "
        + repr(
            f'if [ -d "{remote_frontend_dir}" ]; then '
            f'echo "EXISTS=1"; '
            f'count=$(find "{remote_frontend_dir}" -type f | wc -l); echo "FILE_COUNT=$count"; '
            "else echo \"EXISTS=0\"; fi"
        ),
        timeout=60,
    )
    if code != 0:
        raise RuntimeError(err or out)
    result: Dict[str, str] = {}
    for line in out.splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            result[k.strip()] = v.strip()
    return result


def sftp_download_dir(
    sftp: paramiko.SFTPClient, remote_dir: str, local_dir: Path, max_files: int = 4000
) -> int:
    local_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    stack = [remote_dir.rstrip("/")]
    base = remote_dir.rstrip("/")
    while stack:
        current = stack.pop()
        for entry in sftp.listdir_attr(current):
            remote_path = posixpath.join(current, entry.filename)
            rel = remote_path[len(base) :].lstrip("/")
            local_path = local_dir / rel
            is_dir = (entry.st_mode & 0o170000) == 0o040000
            if is_dir:
                local_path.mkdir(parents=True, exist_ok=True)
                stack.append(remote_path)
            else:
                local_path.parent.mkdir(parents=True, exist_ok=True)
                sftp.get(remote_path, str(local_path))
                count += 1
                if count >= max_files:
                    return count
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description="Cloud/Git/local sync helper")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--env", required=True, help="Path to .env file")
    parser.add_argument("--repo-candidates", nargs="*", default=["~/gobs", "~/app", "~/project"])
    parser.add_argument("--commit-message", default="sync(cloud): align with cloud server state")
    parser.add_argument("--mode", choices=["sync-git", "snapshot-frontend"], default="sync-git")
    parser.add_argument("--remote-frontend", default="~/gobs/frontend")
    parser.add_argument("--local-snapshot-dir", default="deploy/cloud-baseline/frontend")
    args = parser.parse_args()

    env_path = Path(args.env)
    password = read_env_value(env_path, "SERVER_PASSWORD")
    if not password:
        print(json.dumps({"ok": False, "error": "SERVER_PASSWORD_NOT_FOUND"}, ensure_ascii=False))
        return 2

    candidates = [c.replace("~", "/home/" + args.user, 1) for c in args.repo_candidates]
    remote_frontend = args.remote_frontend.replace("~", "/home/" + args.user, 1)

    client = ssh_connect(args.host, args.user, password)
    try:
        if args.mode == "sync-git":
            repo = discover_repo(client, candidates)
            if not repo:
                print(json.dumps({"ok": False, "error": "REMOTE_GIT_REPO_NOT_FOUND"}, ensure_ascii=False))
                return 4
            result = sync_remote_repo(client, repo, args.commit_message)
            payload = {"ok": True, "repo": repo, **result}
            print(json.dumps(payload, ensure_ascii=False))
            return 0

        # snapshot-frontend
        info = list_remote_frontend(client, remote_frontend)
        if info.get("EXISTS") != "1":
            print(json.dumps({"ok": False, "error": "REMOTE_FRONTEND_DIR_NOT_FOUND"}, ensure_ascii=False))
            return 5
        sftp = client.open_sftp()
        try:
            count = sftp_download_dir(sftp, remote_frontend, Path(args.local_snapshot_dir))
        finally:
            sftp.close()
        print(
            json.dumps(
                {
                    "ok": True,
                    "mode": "snapshot-frontend",
                    "remote_frontend": remote_frontend,
                    "downloaded_files": count,
                    "local_snapshot_dir": args.local_snapshot_dir,
                },
                ensure_ascii=False,
            )
        )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
