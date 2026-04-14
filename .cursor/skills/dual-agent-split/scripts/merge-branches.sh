#!/usr/bin/env bash
# dual-agent-merge: 合并两个 Agent 的分支到 main
# 用法: ./merge-branches.sh <方案名> [先合哪个=cursor]
#
# 示例: ./merge-branches.sh nav-restructure claude

set -euo pipefail

PLAN_NAME="${1:?用法: $0 <方案名> [先合哪个=cursor]}"
FIRST="${2:-cursor}"

if [ "$FIRST" = "cursor" ]; then
  SECOND="claude"
else
  SECOND="cursor"
fi

BRANCH_1="feat/${PLAN_NAME}-${FIRST}"
BRANCH_2="feat/${PLAN_NAME}-${SECOND}"

echo "📋 方案: ${PLAN_NAME}"
echo "🔀 先合: ${BRANCH_1}"
echo "🔀 后合: ${BRANCH_2}"
echo ""

git checkout main
git pull origin main

echo "━━━ Merge #1: ${BRANCH_1} ━━━"
git merge "${BRANCH_1}" --no-edit
if [ $? -ne 0 ]; then
  echo "❌ 合并 ${BRANCH_1} 有冲突，请手动解决后 git merge --continue"
  exit 1
fi
echo "✅ ${BRANCH_1} 合并成功"
echo ""

echo "━━━ Merge #2: ${BRANCH_2} ━━━"
git merge "${BRANCH_2}" --no-edit
if [ $? -ne 0 ]; then
  echo "⚠️  合并 ${BRANCH_2} 有冲突，请手动解决"
  echo "常见冲突文件: App.tsx（两边都加了路由）"
  echo "解决后运行: git merge --continue && git push origin main"
  exit 1
fi
echo "✅ ${BRANCH_2} 合并成功"
echo ""

echo "━━━ Build 验证 ━━━"
if [ -f "package.json" ]; then
  npm run build 2>&1 | tail -5
  if [ $? -eq 0 ]; then
    echo "✅ Build 通过"
  else
    echo "❌ Build 失败，请修复后再推送"
    exit 1
  fi
fi

echo ""
echo "🎉 合并完成！运行 git push origin main 推送"
