"""
一键全量部署脚本。
执行顺序：
  1. 编译后端并上传到目标环境，重启对应 PM2
  2. 编译前端并上传到目标环境
  3. 校验目标环境 /api/system/version 与本地 commit 是否一致

用法：
  python scripts/deploy_all.py --target staging
  python scripts/deploy_all.py --target prod
  python scripts/deploy_all.py --target staging --api-only
  python scripts/deploy_all.py --target prod --frontend-only
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

try:
    from scripts.deploy_config import DeployConfigError, build_target_config
except ModuleNotFoundError:
    from deploy_config import DeployConfigError, build_target_config

ROOT = Path(__file__).parent.parent


def run_cmd(cmd: str, cwd: str | None = None) -> None:
    print(f'\n$ {cmd}')
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=False)
    if result.returncode != 0:
        print(f'[ERROR] 命令失败，退出码 {result.returncode}')
        sys.exit(result.returncode)


def get_local_sha() -> str:
    result = subprocess.run('git rev-parse HEAD', shell=True, capture_output=True, text=True, cwd=ROOT)
    return result.stdout.strip()[:8]


def get_remote_sha(version_url: str) -> str:
    try:
        req = urllib.request.Request(
            version_url,
            headers={'User-Agent': 'deploy-script/1.0'},
        )
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode())
        return data.get('commitShort') or str(data.get('commitSha', 'unknown'))[:8]
    except Exception as exc:
        return f'error: {exc}'


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', choices=['staging', 'prod'], default='prod')
    parser.add_argument('--api-only', action='store_true')
    parser.add_argument('--frontend-only', action='store_true')
    args = parser.parse_args()

    try:
        config = build_target_config(args.target)
    except DeployConfigError as exc:
        print(f'[ERROR] {exc}')
        sys.exit(1)

    print('=' * 60)
    print(f'QAS {config.target} 全量部署脚本')
    print('=' * 60)

    local_sha = get_local_sha()
    print(f'本地 commit: {local_sha}')

    if not args.frontend_only:
        print('\n=== 步骤 1: 编译后端 ===')
        run_cmd('npm run build', cwd=str(ROOT / 'h5-video-tool-api'))

        print('\n=== 步骤 2: 上传后端 + 重启 PM2 ===')
        run_cmd(f'python scripts/deploy_api.py --target {config.target}', cwd=str(ROOT))

    if not args.api_only:
        print('\n=== 步骤 3: 编译前端 ===')
        run_cmd('npm run build', cwd=str(ROOT / 'h5-video-tool'))

        print('\n=== 步骤 4: 上传前端 ===')
        run_cmd(f'python scripts/deploy_frontend.py --target {config.target}', cwd=str(ROOT))

    print('\n=== 步骤 5: 验证版本一致性 ===')
    remote_sha = get_remote_sha(config.version_url)
    print(f'本地 commit short : {local_sha}')
    print(f'目标环境运行版本   : {remote_sha}')

    match = local_sha.startswith(remote_sha) or remote_sha.startswith(local_sha)
    if match:
        print('[PASS] 三端版本一致')
    else:
        print('[WARN] 版本不一致，请检查部署是否完整')

    print('\n部署完成')


if __name__ == '__main__':
    main()
