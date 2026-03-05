#!/bin/bash

# Open Adventure Release Build Script
# 用于创建干净的发布包

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# 读取版本号
VERSION=${1:-"0.1.3"}
PLATFORM=${2:-"macos"}
ARCH=${3:-"arm64"}

RELEASE_NAME="open-adventure-v${VERSION}-${PLATFORM}-${ARCH}"
RELEASE_FILE="${RELEASE_NAME}.tar.gz"
RELEASE_DIR="${PROJECT_ROOT}/docs/releases"

echo -e "${GREEN}🚀 Building Open Adventure Release${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo -e "Platform: ${YELLOW}${PLATFORM}${NC}"
echo -e "Architecture: ${YELLOW}${ARCH}${NC}"
echo ""

# 确保发布目录存在
mkdir -p "$RELEASE_DIR"

# 进入项目根目录
cd "$PROJECT_ROOT"

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    if [ "${SKIP_GIT_CHECK}" != "1" ]; then
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo "Skipping git check (SKIP_GIT_CHECK=1)"
    fi
fi

echo -e "${GREEN}📦 Creating release package...${NC}"

# 创建临时目录
TEMP_DIR=$(mktemp -d)
PACKAGE_DIR="${TEMP_DIR}/${RELEASE_NAME}"
mkdir -p "$PACKAGE_DIR"

# 复制文件到临时目录
echo "Copying files..."
rsync -av \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.venv' \
    --exclude='venv' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.pytest_cache' \
    --exclude='*.log' \
    --exclude='*.db' \
    --exclude='*.db.bak' \
    --exclude='.env' \
    --exclude='backend/.env' \
    --exclude='docs/releases' \
    --exclude='docs/logs' \
    --exclude='.DS_Store' \
    --exclude='*.swp' \
    --exclude='*.swo' \
    --exclude='.idea' \
    --exclude='.vscode' \
    --exclude='.playwright-mcp' \
    --exclude='.figma' \
    --exclude='release' \
    . "$PACKAGE_DIR/"

# 确保 .env.example 存在
if [ ! -f "$PACKAGE_DIR/backend/.env.example" ]; then
    echo -e "${RED}❌ Error: backend/.env.example not found${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 创建 tar.gz 包
echo "Creating archive..."
cd "$TEMP_DIR"
tar -czf "$RELEASE_FILE" "$RELEASE_NAME"

# 移动到发布目录
mv "$RELEASE_FILE" "$RELEASE_DIR/"

# 清理临时目录
rm -rf "$TEMP_DIR"

# 计算文件大小和哈希
FILE_SIZE=$(du -h "$RELEASE_DIR/$RELEASE_FILE" | cut -f1)
FILE_HASH=$(shasum -a 256 "$RELEASE_DIR/$RELEASE_FILE" | cut -d' ' -f1)

echo ""
echo -e "${GREEN}✅ Release package created successfully!${NC}"
echo ""
echo -e "File: ${YELLOW}$RELEASE_DIR/$RELEASE_FILE${NC}"
echo -e "Size: ${YELLOW}$FILE_SIZE${NC}"
echo -e "SHA256: ${YELLOW}$FILE_HASH${NC}"
echo ""
echo -e "${GREEN}📝 Next steps:${NC}"
echo "1. Test the release package:"
echo "   cd /tmp && tar -xzf $RELEASE_DIR/$RELEASE_FILE"
echo "   cd $RELEASE_NAME && ./start.sh"
echo ""
echo "2. Create release notes in docs/release-notes/"
echo ""
echo "3. Commit and tag the release:"
echo "   git add ."
echo "   git commit -m 'Release v${VERSION}'"
echo "   git tag v${VERSION}"
echo "   git push origin main --tags"
