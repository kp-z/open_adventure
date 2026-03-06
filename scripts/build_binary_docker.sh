#!/bin/bash

# Open Adventure Docker 二进制构建脚本
# 用途：在 Docker 容器内构建 Linux 二进制包

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Open Adventure Docker 二进制构建${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检测平台和架构
PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "aarch64" ]; then
    ARCH_NAME="x86_64"  # Docker 容器内统一使用 x86_64
elif [ "$ARCH" = "x86_64" ]; then
    ARCH_NAME="x86_64"
else
    ARCH_NAME="$ARCH"
fi

echo -e "${GREEN}✓ 检测到平台: linux-$ARCH_NAME${NC}"
echo ""

# 获取项目根目录
PROJECT_ROOT="/workspace"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${GREEN}✓ 项目根目录: $PROJECT_ROOT${NC}"
echo ""

# 检查前端构建产物
echo -e "${YELLOW}[1/7] 检查前端构建产物...${NC}"
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo -e "${RED}❌ 前端构建产物不存在: $FRONTEND_DIR/dist${NC}"
    echo -e "${YELLOW}请先在宿主机运行: cd frontend && npm run build${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 前端构建产物存在${NC}"
echo ""

# 创建虚拟环境
echo -e "${YELLOW}[2/7] 创建 Python 虚拟环境...${NC}"
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
echo -e "${GREEN}✓ 虚拟环境已创建并激活${NC}"
echo ""

# 安装依赖
echo -e "${YELLOW}[3/7] 安装 Python 依赖...${NC}"
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Python 依赖已安装${NC}"
echo ""

# 安装 PyInstaller
echo -e "${YELLOW}[4/7] 安装 PyInstaller...${NC}"
pip install pyinstaller
echo -e "${GREEN}✓ PyInstaller 已安装: $(pyinstaller --version)${NC}"
echo ""

# 清理旧的构建产物
echo -e "${YELLOW}[5/7] 清理旧的构建产物...${NC}"
if [ -d "$BACKEND_DIR/dist" ]; then
    rm -rf "$BACKEND_DIR/dist"
    echo -e "${GREEN}✓ 已删除旧的 backend/dist 目录${NC}"
fi
if [ -d "$BACKEND_DIR/build" ]; then
    rm -rf "$BACKEND_DIR/build"
    echo -e "${GREEN}✓ 已删除旧的 build 目录${NC}"
fi
echo ""

# 使用 PyInstaller 构建
echo -e "${YELLOW}[6/7] 使用 PyInstaller 构建二进制...${NC}"
pyinstaller open_adventure.spec --clean

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PyInstaller 构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PyInstaller 构建成功${NC}"
echo ""

# 打包为 tar.gz
echo -e "${YELLOW}[7/7] 打包为 tar.gz...${NC}"
cd "$PROJECT_ROOT"
VERSION=$(grep '"version"' "$FRONTEND_DIR/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
if [ -z "$VERSION" ]; then
    VERSION="dev"
fi

# 检测 Ubuntu 版本以确定文件名后缀
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$VERSION_ID" == "20.04" ]]; then
        SUFFIX="compat"
    elif [[ "$VERSION_ID" == "24.04" ]]; then
        SUFFIX="latest"
    else
        SUFFIX="unknown"
    fi
else
    SUFFIX="unknown"
fi

TARBALL_NAME="open_adventure-v${VERSION}-linux-${ARCH_NAME}-${SUFFIX}.tar.gz"
TARBALL_PATH="$PROJECT_ROOT/docs/releases/$TARBALL_NAME"

# 确保 releases 目录存在
mkdir -p "$PROJECT_ROOT/docs/releases"

# 验证构建产物
ACTUAL_DIST_DIR="$BACKEND_DIR/dist"
BINARY_PATH="$ACTUAL_DIST_DIR/open-adventure"

# 检查是否是 onefile 模式（单个可执行文件）
if [ -f "$BINARY_PATH" ]; then
    echo -e "${GREEN}✓ 找到 onefile 模式的可执行文件${NC}"

    # 创建目录结构用于打包
    PACKAGE_DIR="$ACTUAL_DIST_DIR/open-adventure-package"
    rm -rf "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR"
    cp "$BINARY_PATH" "$PACKAGE_DIR/open-adventure"

    # 创建启动脚本
    cat > "$PACKAGE_DIR/start.sh" << 'EOF'
#!/bin/bash

# Open Adventure 启动脚本
# 用于启动二进制版本的 Claude Manager

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查可执行文件
if [ ! -f "./open-adventure" ]; then
    echo "❌ 错误: 找不到可执行文件 open-adventure"
    exit 1
fi

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 检查后端端口
if check_port 8000; then
    echo "⚠️  警告: 端口 8000 已被占用"
    echo "如果是旧的 Claude Manager 进程，请先停止它"
    read -p "是否继续启动？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "=========================================="
echo "Open Adventure - Claude Manager"
echo "=========================================="
echo ""
echo "正在启动服务..."
echo ""

# 启动应用
./open-adventure
EOF

    chmod +x "$PACKAGE_DIR/start.sh"

    # 打包
    PACKAGE_STAGING_DIR="$ACTUAL_DIST_DIR/package-staging"
    rm -rf "$PACKAGE_STAGING_DIR"
    mkdir -p "$PACKAGE_STAGING_DIR/open-adventure"
    cp "$PACKAGE_DIR/open-adventure" "$PACKAGE_STAGING_DIR/open-adventure/open-adventure"
    cp "$PACKAGE_DIR/start.sh" "$PACKAGE_STAGING_DIR/open-adventure/start.sh"
    cd "$PACKAGE_STAGING_DIR"
    tar -czf "$TARBALL_PATH" open-adventure/
    rm -rf "$PACKAGE_STAGING_DIR"
else
    echo -e "${RED}❌ 可执行文件不存在: $BINARY_PATH${NC}"
    exit 1
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 打包失败${NC}"
    exit 1
fi

TARBALL_SIZE=$(du -sh "$TARBALL_PATH" | cut -f1)
echo -e "${GREEN}✓ 打包完成: $TARBALL_NAME ($TARBALL_SIZE)${NC}"
echo ""

# 构建完成
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 构建完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}构建信息:${NC}"
echo -e "  平台: linux-$ARCH_NAME-$SUFFIX"
echo -e "  版本: v$VERSION"
echo -e "  压缩包路径: $TARBALL_PATH"
echo -e "  压缩包大小: $TARBALL_SIZE"
echo ""
