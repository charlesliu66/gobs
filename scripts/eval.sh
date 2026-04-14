#!/usr/bin/env bash
# eval.sh — 半自动化验证脚本
# 用法: bash scripts/eval.sh <run-id>
# 退出码: 0=PASS, 1=P0_FAIL, 2=P1_WARN

set -euo pipefail

RUN_ID="${1:-unknown}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$REPO_ROOT/docs/workflow/runs/$RUN_ID"
OUT_FILE="$RUN_DIR/eval-result.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$RUN_DIR"

# ── 初始化结果对象 ──────────────────────────────────────────
backend_build_status="skip"
backend_build_error=""
frontend_build_status="skip"
frontend_build_error=""
typescript_status="skip"
typescript_errors="[]"
api_health_status="skip"
api_health_code=0
verdict="PASS"

echo "=== eval.sh: $RUN_ID ==="
echo "Output: $OUT_FILE"
echo ""

# ── 1. 后端 build ────────────────────────────────────────────
echo "[1/4] Backend build..."
API_DIR="$REPO_ROOT/h5-video-tool-api"
if [ -d "$API_DIR" ]; then
  cd "$API_DIR"
  if npm run build 2>&1; then
    backend_build_status="pass"
    echo "  ✓ Backend build passed"
  else
    backend_build_status="fail"
    backend_build_error="npm run build failed"
    verdict="P0_FAIL"
    echo "  ✗ Backend build FAILED"
  fi
  cd "$REPO_ROOT"
else
  backend_build_status="skip"
  echo "  - h5-video-tool-api/ not found, skipped"
fi

# ── 2. 前端 build ────────────────────────────────────────────
echo "[2/4] Frontend build..."
H5_DIR="$REPO_ROOT/h5-video-tool"
if [ -d "$H5_DIR" ]; then
  cd "$H5_DIR"
  if npm run build 2>&1; then
    frontend_build_status="pass"
    echo "  ✓ Frontend build passed"
  else
    frontend_build_status="fail"
    frontend_build_error="npm run build failed"
    [ "$verdict" != "P0_FAIL" ] && verdict="P1_WARN"
    echo "  ✗ Frontend build FAILED"
  fi
  cd "$REPO_ROOT"
else
  frontend_build_status="skip"
  echo "  - h5-video-tool/ not found, skipped"
fi

# ── 3. TypeScript 严格检查（后端）────────────────────────────
echo "[3/4] TypeScript check..."
if [ -d "$API_DIR" ] && [ -f "$API_DIR/tsconfig.json" ]; then
  cd "$API_DIR"
  TS_OUT=$(npx tsc --noEmit 2>&1 || true)
  if [ -z "$TS_OUT" ]; then
    typescript_status="pass"
    echo "  ✓ TypeScript: zero errors"
  else
    typescript_status="fail"
    # 转义为 JSON 字符串（基础处理）
    TS_FIRST=$(echo "$TS_OUT" | head -5 | sed 's/"/\\"/g' | tr '\n' '|')
    typescript_errors="[\"${TS_FIRST}\"]"
    [ "$verdict" = "PASS" ] && verdict="P1_WARN"
    echo "  ✗ TypeScript errors found"
    echo "$TS_OUT" | head -10
  fi
  cd "$REPO_ROOT"
else
  typescript_status="skip"
  echo "  - tsconfig.json not found, skipped"
fi

# ── 4. API 健康检查（仅在后端 build 通过时执行）────────────────
echo "[4/4] API health check..."
API_PORT="${PORT:-3001}"
HEALTH_URL="http://localhost:$API_PORT/api/health"

if [ "$backend_build_status" = "pass" ]; then
  # 尝试连接（服务可能未运行，不阻断整体流程）
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$HEALTH_URL" 2>/dev/null || echo "000")
  api_health_code=$HTTP_CODE
  if [ "$HTTP_CODE" = "200" ]; then
    api_health_status="pass"
    echo "  ✓ API health: 200 OK"
  elif [ "$HTTP_CODE" = "000" ]; then
    api_health_status="skip"
    echo "  - API not running (service not started), skipped"
  else
    api_health_status="fail"
    [ "$verdict" = "PASS" ] && verdict="P1_WARN"
    echo "  ✗ API health returned $HTTP_CODE"
  fi
else
  api_health_status="skip"
  echo "  - Backend build failed, skipping health check"
fi

# ── 写入 JSON 报告 ───────────────────────────────────────────
cat > "$OUT_FILE" <<EOF
{
  "run_id": "$RUN_ID",
  "timestamp": "$TIMESTAMP",
  "checks": {
    "backend_build": { "status": "$backend_build_status", "error": "$backend_build_error" },
    "frontend_build": { "status": "$frontend_build_status", "error": "$frontend_build_error" },
    "typescript": { "status": "$typescript_status", "errors": $typescript_errors },
    "api_health": { "status": "$api_health_status", "code": $api_health_code },
    "smoke_tests": []
  },
  "verdict": "$verdict"
}
EOF

echo ""
echo "=== VERDICT: $verdict ==="
echo "Report written to: $OUT_FILE"

# 退出码
if [ "$verdict" = "P0_FAIL" ]; then
  exit 1
elif [ "$verdict" = "P1_WARN" ]; then
  exit 2
else
  exit 0
fi
