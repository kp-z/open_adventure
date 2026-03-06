#!/bin/bash

# Docker 构建 Linux 二进制脚本
# 用于在 macOS 上通过 Docker 构建 Linux x86_64 版本

set -e

echo "========================================"
echo "Docker 构建 Linux 二进制"
echo "========================================"

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_JSON="$PROJECT_ROOT/frontend/package.json"
VERSION=$(python3 - "$PACKAGE_JSON" <<'PY'
import json
import sys
from pathlib import Path
print(json.loads(Path(sys.argv[1]).read_text())['version'])
PY
)
ARTIFACT_NAME="open_adventure-v${VERSION}-linux-x86_64.tar.gz"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker Desktop"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker 未运行，请启动 Docker Desktop"
    exit 1
fi

echo "✓ Docker 已就绪"

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "✓ 项目根目录: $PROJECT_ROOT"
echo "✓ 目标版本: v$VERSION"

# 检查前端构建产物
if [ ! -d "frontend/dist" ]; then
    echo "❌ 前端构建产物不存在，请先运行: cd frontend && npm run build"
    exit 1
fi

echo "✓ 前端构建产物存在"

# 创建输出目录
mkdir -p docs/releases

# 构建 Docker 镜像
echo ""
echo "[1/3] 构建 Docker 镜像..."
docker build --platform linux/amd64 -f Dockerfile.build -t claude-manager-builder:latest .

echo ""
echo "[2/3] 在 Docker 容器中构建二进制..."
docker run --rm --platform linux/amd64 \
    -v "$PROJECT_ROOT/docs/releases:/output" \
    claude-manager-builder:latest

echo ""
echo "[3/3] 验证构建产物..."
if [ -f "docs/releases/$ARTIFACT_NAME" ]; then
    SIZE=$(du -h "docs/releases/$ARTIFACT_NAME" | cut -f1)
    echo "✓ 构建成功: $ARTIFACT_NAME ($SIZE)"
else
    echo "❌ 构建失败: 未找到构建产物 $ARTIFACT_NAME"
    exit 1
fi

echo ""
echo "========================================"
echo "✓ Docker 构建完成！"
echo "========================================"
echo ""
echo "构建产物: docs/releases/$ARTIFACT_NAME"
echo ""
echo "下一步:"
echo "  1. 测试二进制: 在 Linux 环境中解压并运行"
echo "  2. 上传到 GitHub: gh release upload v$VERSION docs/releases/$ARTIFACT_NAME"
