#!/usr/bin/env bash
# dual-agent-split: 为双 Agent 并行开发创建分支
# 用法: ./create-branches.sh <方案名> [远程名=origin]
#
# 示例: ./create-branches.sh nav-restructure

set -euo pipefail

PLAN_NAME="${1:?用法: $0 <方案名>}"
REMOTE="${2:-origin}"

CURSOR_BRANCH="feat/${PLAN_NAME}-cursor"
CLAUDE_BRANCH="feat/${PLAN_NAME}-claude"

echo "📋 方案: ${PLAN_NAME}"
echo "🔀 Cursor 分支: ${CURSOR_BRANCH}"
echo "🔀 Claude 分支: ${CLAUDE_BRANCH}"
echo ""

# 确保在 main 分支且是最新
git checkout main
git pull "${REMOTE}" main

BASE_COMMIT=$(git rev-parse --short HEAD)
echo "📌 基于 main @ ${BASE_COMMIT}"
echo ""

# 创建 Cursor 分支
if git show-ref --verify --quiet "refs/heads/${CURSOR_BRANCH}" 2>/dev/null; then
  echo "⚠️  ${CURSOR_BRANCH} 已存在，跳过创建"
else
  git checkout -b "${CURSOR_BRANCH}"
  git push "${REMOTE}" "${CURSOR_BRANCH}"
  echo "✅ 创建并推送 ${CURSOR_BRANCH}"
fi

git checkout main

# 创建 Claude 分支
if git show-ref --verify --quiet "refs/heads/${CLAUDE_BRANCH}" 2>/dev/null; then
  echo "⚠️  ${CLAUDE_BRANCH} 已存在，跳过创建"
else
  git checkout -b "${CLAUDE_BRANCH}"
  git push "${REMOTE}" "${CLAUDE_BRANCH}"
  echo "✅ 创建并推送 ${CLAUDE_BRANCH}"
fi

git checkout main

echo ""
echo "🎉 分支准备完毕！"
echo ""
echo "Cursor 操作:"
echo "  git checkout ${CURSOR_BRANCH}"
echo ""
echo "Claude Code 操作:"
echo "  git checkout ${CLAUDE_BRANCH}"
echo ""
echo "合并时:"
echo "  git checkout main"
echo "  git merge ${CURSOR_BRANCH}"
echo "  git merge ${CLAUDE_BRANCH}"
