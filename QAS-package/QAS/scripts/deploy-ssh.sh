#!/bin/bash
# QAS H5 一键部署脚本 - 在 SSH 服务器上执行
# 用法：在已上传/克隆的 QAS 项目根目录运行 ./scripts/deploy-ssh.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
QAS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$QAS_ROOT"

echo "=== QAS H5 部署 ==="
echo "项目目录: $QAS_ROOT"
echo ""

# 1. 安装依赖
echo "[1/4] 安装依赖..."
cd "$QAS_ROOT/h5-video-tool-api"
npm ci 2>/dev/null || npm install
cd "$QAS_ROOT/h5-video-tool"
npm ci 2>/dev/null || npm install

# 2. 构建
echo "[2/4] 构建前端..."
cd "$QAS_ROOT/h5-video-tool"
npm run build

echo "[3/4] 构建 API..."
cd "$QAS_ROOT/h5-video-tool-api"
npm run build

# 3. 创建 output 目录
echo "[4/4] 创建输出目录..."
mkdir -p "$QAS_ROOT/output"

echo ""
echo "=== 部署完成 ==="
echo ""
echo "启动方式："
echo "  1. 先启动 API（端口 3001）："
echo "     cd $QAS_ROOT/h5-video-tool-api && npm run start"
echo ""
echo "  2. 用 PM2 常驻运行（推荐）："
echo "     pm2 start $QAS_ROOT/h5-video-tool-api/dist/index.js --name qas-api"
echo ""
echo "  3. 前端静态文件目录: $QAS_ROOT/h5-video-tool/dist"
echo "     用 nginx 或 serve 提供：serve -s $QAS_ROOT/h5-video-tool/dist -l 3000"
echo ""
