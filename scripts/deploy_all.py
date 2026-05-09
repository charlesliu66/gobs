"""
一键全量部署脚本。

默认行为：
  1. 检查发布门禁（release-scope 干净、HEAD 已在 origin/main、prod 只能发已通过 staging 验证的 SHA）
  2. prod 自动切换 deployment-state：preparing -> deploying -> verifying
  3. 编译并上传后端 / 前端
  4. 轮询 /api/system/version，要求目标环境与本地 commit 一致，否则视为失败

用法：
  python scripts/deploy_all.py --target staging
  python scripts/deploy_all.py --target prod --updated-by wei.liu
  python scripts/deploy_all.py --target prod --prepare-wait-seconds 0
  python scripts/deploy_all.py --target staging --api-only
"""
from __future__ import annotations

import argparse
import getpass
import json
import shlex
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

import paramiko

try:
    from scripts.deploy_config import DeployConfigError, DeployTargetConfig, build_target_config
    from scripts.release_guard import (
        evaluate_promotion_readiness,
        get_remote_release_ready_path,
        select_release_blocking_paths,
    )
except ModuleNotFoundError:
    from deploy_config import DeployConfigError, DeployTargetConfig, build_target_config
    from release_guard import (
        evaluate_promotion_readiness,
        get_remote_release_ready_path,
        select_release_blocking_paths,
    )

ROOT = Path(__file__).parent.parent


class DeployGuardError(RuntimeError):
    pass


def run_cmd(cmd: str, cwd: str | None = None) -> None:
    print(f'\n$ {cmd}')
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=False)
    if result.returncode != 0:
        raise DeployGuardError(f'命令失败: {cmd} (exit={result.returncode})')


def run_cmd_output(cmd: str, cwd: str | None = None) -> str:
    print(f'\n$ {cmd}')
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        stderr = (result.stderr or '').strip()
        raise DeployGuardError(stderr or f'命令失败: {cmd} (exit={result.returncode})')
    return result.stdout


def parse_git_status_paths(status_output: str) -> list[str]:
    paths: list[str] = []
    for raw_line in status_output.splitlines():
        if not raw_line.strip():
            continue
        candidate = raw_line[3:].strip() if len(raw_line) >= 4 else raw_line.strip()
        if ' -> ' in candidate:
            candidate = candidate.split(' -> ', 1)[1].strip()
        if candidate:
            paths.append(candidate.replace('\\', '/'))
    return paths


def ensure_release_paths_clean(status_output: str) -> None:
    blocking_paths = select_release_blocking_paths(parse_git_status_paths(status_output))
    if blocking_paths:
        rendered = '\n'.join(f'- {path}' for path in blocking_paths)
        raise DeployGuardError(
            '发布被阻止：当前工作区仍有会影响发布产物或发布脚本的未提交改动。\n'
            f'{rendered}'
        )


def ensure_head_on_origin_main(branch_output: str) -> None:
    if not any(line.strip() == 'origin/main' for line in branch_output.splitlines()):
        raise DeployGuardError('发布被阻止：当前 HEAD 尚未包含在 origin/main 中，请先 git push origin main。')


def ensure_prod_promotion_is_ready(
    *,
    local_sha: str,
    staging_live_sha: str,
    staging_verified_sha: str,
    emergency_bypass: bool = False,
) -> None:
    if emergency_bypass:
        print('[WARN] 已启用 emergency bypass：跳过 staging verified SHA 校验。')
        return
    allowed, reason = evaluate_promotion_readiness(
        local_sha=local_sha,
        staging_live_sha=staging_live_sha,
        staging_verified_sha=staging_verified_sha,
    )
    if not allowed:
        raise DeployGuardError(f'发布被阻止：{reason}')


def build_auto_phase_sequence(target: str) -> list[str]:
    return ['preparing', 'deploying', 'verifying'] if target == 'prod' else []


def get_local_sha() -> str:
    return run_cmd_output('git rev-parse HEAD', cwd=str(ROOT)).strip()[:8]


def get_remote_version_payload(version_url: str) -> dict[str, Any]:
    req = urllib.request.Request(
        version_url,
        headers={'User-Agent': 'deploy-script/1.0'},
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode())


def get_remote_sha(version_url: str) -> str:
    try:
        payload = get_remote_version_payload(version_url)
    except Exception as exc:
        return f'error: {exc}'
    return str(payload.get('commitShort') or str(payload.get('commitSha', 'unknown'))[:8])


def _read_remote_json(config: DeployTargetConfig, remote_path: str) -> dict[str, Any]:
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
        with sftp.file(remote_path, 'r') as handle:
            return json.loads(handle.read().decode('utf-8'))
    except FileNotFoundError:
        return {}
    finally:
        sftp.close()
        client.close()


def get_verified_staging_sha() -> str:
    staging_config = build_target_config('staging')
    payload = _read_remote_json(
        staging_config,
        get_remote_release_ready_path(staging_config.api_dir),
    )
    return str(payload.get('commitShort') or payload.get('commitSha') or '').strip()


def ensure_release_guardrails(target: str, local_sha: str, *, emergency_bypass: bool = False) -> None:
    print('\n=== 步骤 0: 检查发布门禁 ===')
    ensure_release_paths_clean(
        run_cmd_output('git status --short --untracked-files=all', cwd=str(ROOT)),
    )
    print('[PASS] release-scope 工作区干净')

    run_cmd('git fetch origin main --quiet', cwd=str(ROOT))
    ensure_head_on_origin_main(run_cmd_output('git branch -r --contains HEAD', cwd=str(ROOT)))
    print('[PASS] 当前 HEAD 已包含在 origin/main 中')

    if target != 'prod':
        return

    staging_config = build_target_config('staging')
    staging_live_sha = str(
        get_remote_version_payload(staging_config.version_url).get('commitShort', ''),
    ).strip()
    staging_verified_sha = get_verified_staging_sha()
    ensure_prod_promotion_is_ready(
        local_sha=local_sha,
        staging_live_sha=staging_live_sha,
        staging_verified_sha=staging_verified_sha,
        emergency_bypass=emergency_bypass,
    )
    if emergency_bypass:
        print('[WARN] 当前 prod 发布已绕过 staging verified gate，请确认这是已明确批准的紧急场景。')
    else:
        print(f'[PASS] staging 已运行并验证 commit {local_sha}')


def _build_set_state_command(target: str, phase: str, updated_by: str) -> str:
    return (
        'python scripts/set_deployment_state.py '
        f'--target {shlex.quote(target)} '
        f'--phase {shlex.quote(phase)} '
        f'--updated-by {shlex.quote(updated_by)}'
    )


def build_frontend_deploy_command(target: str) -> str:
    command = f'python scripts/deploy_frontend.py --target {shlex.quote(target)}'
    if target == 'prod':
        command += ' --source-target staging'
    return command


def run_phase_transition(target: str, phase: str, updated_by: str) -> None:
    run_cmd(_build_set_state_command(target, phase, updated_by), cwd=str(ROOT))


def validate_remote_version_payload(
    *,
    target: str,
    local_sha: str,
    payload: dict[str, Any],
) -> None:
    remote_sha = str(payload.get('commitShort') or str(payload.get('commitSha', ''))[:8]).strip()
    remote_env = str(payload.get('environment', '')).strip().lower()
    if not remote_sha:
        raise DeployGuardError('目标环境未返回 commit 信息，无法确认部署版本。')
    if not (local_sha.startswith(remote_sha) or remote_sha.startswith(local_sha)):
        raise DeployGuardError(f'目标环境版本不一致：expected={local_sha}, actual={remote_sha}')
    if remote_env and remote_env != target:
        raise DeployGuardError(f'目标环境标识不一致：expected={target}, actual={remote_env}')


def wait_for_remote_version(
    *,
    target: str,
    local_sha: str,
    version_url: str,
    attempts: int = 12,
    sleep_seconds: int = 5,
) -> dict[str, Any]:
    last_error = 'unknown'
    for _attempt in range(attempts):
        try:
            payload = get_remote_version_payload(version_url)
            validate_remote_version_payload(target=target, local_sha=local_sha, payload=payload)
            return payload
        except Exception as exc:
            last_error = str(exc)
            time.sleep(sleep_seconds)
    raise DeployGuardError(f'等待目标环境版本收敛失败：{last_error}')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', choices=['staging', 'prod'], default='prod')
    parser.add_argument('--api-only', action='store_true')
    parser.add_argument('--frontend-only', action='store_true')
    parser.add_argument('--updated-by', default=getpass.getuser())
    parser.add_argument('--prepare-wait-seconds', type=int, default=180)
    parser.add_argument('--skip-auto-phases', action='store_true')
    parser.add_argument('--emergency-bypass', action='store_true')
    args = parser.parse_args()

    if args.api_only and args.frontend_only:
        parser.error('--api-only and --frontend-only cannot be used together.')

    try:
        config = build_target_config(args.target)
        local_sha = get_local_sha()
        ensure_release_guardrails(config.target, local_sha, emergency_bypass=args.emergency_bypass)
    except (DeployConfigError, DeployGuardError) as exc:
        print(f'[ERROR] {exc}')
        sys.exit(1)

    print('=' * 60)
    print(f'QAS {config.target} 全量部署脚本')
    print('=' * 60)
    print(f'本地 commit: {local_sha}')

    auto_phase_sequence = [] if args.skip_auto_phases else build_auto_phase_sequence(config.target)

    try:
        if auto_phase_sequence:
            print('\n=== 步骤 1: 正式环境进入 preparing ===')
            run_phase_transition(config.target, 'preparing', args.updated_by)
            if args.prepare_wait_seconds > 0:
                print(f'等待 {args.prepare_wait_seconds} 秒，让线上同学先看到提示...')
                time.sleep(args.prepare_wait_seconds)
            print('\n=== 步骤 2: 正式环境进入 deploying ===')
            run_phase_transition(config.target, 'deploying', args.updated_by)

        if not args.frontend_only:
            print('\n=== 步骤 3: 编译后端 ===')
            run_cmd('npm run build', cwd=str(ROOT / 'h5-video-tool-api'))

            print('\n=== 步骤 4: 上传后端 + 重启 PM2 ===')
            run_cmd(f'python scripts/deploy_api.py --target {config.target}', cwd=str(ROOT))

        if not args.api_only:
            print('\n=== 步骤 5: 编译前端 ===')
            run_cmd('npm run build', cwd=str(ROOT / 'h5-video-tool'))

            print('\n=== 步骤 6: 上传前端 ===')
            run_cmd(build_frontend_deploy_command(config.target), cwd=str(ROOT))

        print('\n=== 步骤 7: 验证版本一致性 ===')
        payload = wait_for_remote_version(
            target=config.target,
            local_sha=local_sha,
            version_url=config.version_url,
        )
        remote_sha = str(payload.get('commitShort') or str(payload.get('commitSha', ''))[:8]).strip()
        print(f'本地 commit short : {local_sha}')
        print(f'目标环境运行版本   : {remote_sha}')
        print(f'目标环境标识       : {payload.get("environment", "")}')
        print('[PASS] 三端版本一致')

        if auto_phase_sequence:
            print('\n=== 步骤 8: 正式环境进入 verifying ===')
            run_phase_transition(config.target, 'verifying', args.updated_by)

        print('\n部署完成')
    except DeployGuardError as exc:
        print(f'[ERROR] {exc}')
        sys.exit(1)


if __name__ == '__main__':
    main()
