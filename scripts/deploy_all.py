"""
一键全量部署脚本
执行顺序：
  1. 后端构建产物上传 + pm2 restart
  2. 前端构建产物上传
  3. 验证 /api/system/version 与最新 git commit 一致

用法：
  python scripts/deploy_all.py [--api-only] [--frontend-only]
"""
import subprocess
import sys
import urllib.request
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent

def run_cmd(cmd, cwd=None):
    print(f'\n$ {cmd}')
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=False)
    if result.returncode != 0:
        print(f'[ERROR] 命令失败，退出码 {result.returncode}')
        sys.exit(result.returncode)

def get_local_sha():
    result = subprocess.run('git rev-parse HEAD', shell=True, capture_output=True, text=True, cwd=ROOT)
    return result.stdout.strip()[:8]

def get_remote_sha():
    try:
        req = urllib.request.Request(
            'http://43.134.186.196/api/system/version',
            headers={'User-Agent': 'deploy-script/1.0'}
        )
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode())
        return data.get('commitShort', 'unknown')
    except Exception as e:
        return f'error: {e}'

def main():
    args = sys.argv[1:]
    api_only = '--api-only' in args
    frontend_only = '--frontend-only' in args

    print('='*60)
    print('QAS 全量部署脚本')
    print('='*60)

    local_sha = get_local_sha()
    print(f'本地 commit: {local_sha}')

    if not frontend_only:
        print('\n── 步骤 1: 编译后端 ──')
        run_cmd('npm run build', cwd=str(ROOT / 'h5-video-tool-api'))

        print('\n── 步骤 2: 上传后端 + 重启 PM2 ──')
        run_cmd('python scripts/deploy_api.py', cwd=str(ROOT))

    if not api_only:
        print('\n── 步骤 3: 编译前端 ──')
        run_cmd('npm run build', cwd=str(ROOT / 'h5-video-tool'))

        print('\n── 步骤 4: 上传前端 ──')
        run_cmd('python scripts/deploy_frontend.py', cwd=str(ROOT))

    print('\n── 步骤 5: 验证版本一致性 ──')
    import time
    time.sleep(3)
    remote_sha = get_remote_sha()
    print(f'本地 commit short : {local_sha}')
    print(f'服务器运行版本    : {remote_sha}')

    # 允许 short sha 长度不同（7 vs 8 位），只要互为前缀即视为一致
    match = local_sha.startswith(remote_sha) or remote_sha.startswith(local_sha)
    if match:
        print('[PASS] 三端版本一致')
    else:
        print('[WARN] 版本不一致，请检查部署是否完整')

    print('\n部署完成！')

if __name__ == '__main__':
    main()
