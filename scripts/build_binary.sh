#!/bin/bash

# Open Adventure 二进制构建脚本
# 用途：使用 PyInstaller 构建保护源码的二进制版本

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Open Adventure 二进制构建脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检测平台和架构
PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$PLATFORM" = "darwin" ]; then
    PLATFORM_NAME="macos"
elif [ "$PLATFORM" = "linux" ]; then
    PLATFORM_NAME="linux"
else
    echo -e "${RED}❌ 不支持的平台: $PLATFORM${NC}"
    exit 1
fi

if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    ARCH_NAME="arm64"
elif [ "$ARCH" = "x86_64" ]; then
    ARCH_NAME="x86_64"
else
    echo -e "${YELLOW}⚠️  未知架构: $ARCH，使用 $ARCH 作为架构名${NC}"
    ARCH_NAME="$ARCH"
fi

echo -e "${GREEN}✓ 检测到平台: $PLATFORM_NAME-$ARCH_NAME${NC}"
echo ""

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DIST_DIR="$PROJECT_ROOT/dist"

echo -e "${GREEN}✓ 项目根目录: $PROJECT_ROOT${NC}"
echo ""

# 检查前端构建产物
echo -e "${YELLOW}[1/6] 检查前端构建产物...${NC}"
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo -e "${RED}❌ 前端构建产物不存在: $FRONTEND_DIR/dist${NC}"
    echo -e "${YELLOW}请先运行: cd frontend && npm run build${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 前端构建产物存在${NC}"
echo ""

# 激活 Python 虚拟环境
echo -e "${YELLOW}[2/6] 激活 Python 虚拟环境...${NC}"
if [ -d "$BACKEND_DIR/venv" ]; then
    source "$BACKEND_DIR/venv/bin/activate"
    echo -e "${GREEN}✓ 虚拟环境已激活${NC}"
elif [ -d "$PROJECT_ROOT/venv" ]; then
    source "$PROJECT_ROOT/venv/bin/activate"
    echo -e "${GREEN}✓ 虚拟环境已激活${NC}"
else
    echo -e "${RED}❌ 未找到虚拟环境${NC}"
    echo -e "${YELLOW}请先创建虚拟环境: python -m venv backend/venv${NC}"
    exit 1
fi
echo ""

# 检查 PyInstaller
echo -e "${YELLOW}[3/6] 检查 PyInstaller...${NC}"
if ! command -v pyinstaller &> /dev/null; then
    echo -e "${RED}❌ PyInstaller 未安装${NC}"
    echo -e "${YELLOW}正在安装 PyInstaller...${NC}"
    pip install pyinstaller
fi
echo -e "${GREEN}✓ PyInstaller 已安装: $(pyinstaller --version)${NC}"
echo ""

# 清理旧的构建产物
echo -e "${YELLOW}[4/6] 清理旧的构建产物...${NC}"
if [ -d "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR"
    echo -e "${GREEN}✓ 已删除旧的 dist 目录${NC}"
fi
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
echo -e "${YELLOW}[5/6] 使用 PyInstaller 构建二进制...${NC}"
cd "$BACKEND_DIR"
pyinstaller open_adventure.spec --clean

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PyInstaller 构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PyInstaller 构建成功${NC}"
echo ""

# 验证构建产物
echo -e "${YELLOW}[6/6] 验证构建产物...${NC}"
# PyInstaller onefile 模式输出到 backend/dist 目录，直接是可执行文件
ACTUAL_DIST_DIR="$BACKEND_DIR/dist"
BINARY_PATH="$ACTUAL_DIST_DIR/open-adventure"

# 检查是否是 onefile 模式（单个可执行文件）
if [ -f "$BINARY_PATH" ]; then
    echo -e "${GREEN}✓ 找到 onefile 模式的可执行文件${NC}"
    ONEFILE_MODE=true

    # 创建目录结构用于打包
    PACKAGE_DIR="$ACTUAL_DIST_DIR/open-adventure-package"
    rm -rf "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR"
    cp "$BINARY_PATH" "$PACKAGE_DIR/open-adventure"

    # 更新路径指向打包目录
    ACTUAL_DIST_DIR="$ACTUAL_DIST_DIR"
    BINARY_PATH="$PACKAGE_DIR/open-adventure"
else
    # 检查是否是 onedir 模式（目录）
    BINARY_PATH="$ACTUAL_DIST_DIR/open-adventure/open-adventure"
    if [ ! -f "$BINARY_PATH" ]; then
        echo -e "${RED}❌ 可执行文件不存在: $BINARY_PATH${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ 找到 onedir 模式的可执行文件${NC}"
    ONEFILE_MODE=false
fi

# onefile 模式不需要检查源码文件
if [ "$ONEFILE_MODE" = false ]; then
    # 检查是否包含源码文件（不应该有）
    PY_FILES=$(find "$ACTUAL_DIST_DIR/open-adventure" -name "*.py" 2>/dev/null | wc -l)
    if [ "$PY_FILES" -gt 0 ]; then
        echo -e "${RED}❌ 警告: 构建产物中仍包含 $PY_FILES 个 .py 源码文件${NC}"
        echo -e "${YELLOW}前 10 个文件:${NC}"
        find "$ACTUAL_DIST_DIR/open-adventure" -name "*.py" | head -10
        echo ""
        echo -e "${YELLOW}这可能表示配置有问题，但构建已完成${NC}"
    else
        echo -e "${GREEN}✓ 构建产物中不包含 .py 源码文件（源码已保护）${NC}"
    fi
fi

# 获取构建产物大小
if [ "$ONEFILE_MODE" = true ]; then
    DIST_SIZE=$(du -sh "$PACKAGE_DIR/open-adventure" | cut -f1)
else
    DIST_SIZE=$(du -sh "$ACTUAL_DIST_DIR/open-adventure" | cut -f1)
fi
echo -e "${GREEN}✓ 构建产物大小: $DIST_SIZE${NC}"
echo ""

# 创建启动脚本
echo -e "${YELLOW}创建启动脚本...${NC}"
if [ "$ONEFILE_MODE" = true ]; then
    TARGET_DIR="$PACKAGE_DIR"
else
    TARGET_DIR="$ACTUAL_DIST_DIR/open-adventure"
fi

cat > "$TARGET_DIR/start.sh" << 'EOF'
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

chmod +x "$TARGET_DIR/start.sh"
echo -e "${GREEN}✓ 启动脚本已创建: start.sh${NC}"
echo ""

# 打包为 tar.gz
echo -e "${YELLOW}打包为 tar.gz...${NC}"
cd "$PROJECT_ROOT"
VERSION=$(grep '"version"' "$FRONTEND_DIR/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
if [ -z "$VERSION" ]; then
    VERSION="dev"
fi

TARBALL_NAME="open_adventure-v${VERSION}-${PLATFORM_NAME}-${ARCH_NAME}.tar.gz"
TARBALL_PATH="$PROJECT_ROOT/docs/releases/$TARBALL_NAME"

# 确保 releases 目录存在
mkdir -p "$PROJECT_ROOT/docs/releases"

# 打包（根据模式选择不同的打包方式）
if [ "$ONEFILE_MODE" = true ]; then
    # onefile 模式：重命名目录后打包
    cd "$ACTUAL_DIST_DIR"
    mv open-adventure-package open-adventure
    tar -czf "$TARBALL_PATH" open-adventure/
    mv open-adventure open-adventure-package
else
    # onedir 模式：打包 open-adventure 目录
    cd "$ACTUAL_DIST_DIR"
    tar -czf "$TARBALL_PATH" open-adventure/
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
echo -e "  平台: $PLATFORM_NAME-$ARCH_NAME"
echo -e "  版本: v$VERSION"
echo -e "  二进制路径: $BINARY_PATH"
echo -e "  压缩包路径: $TARBALL_PATH"
echo -e "  压缩包大小: $TARBALL_SIZE"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "  1. 测试二进制: cd $DIST_DIR/open-adventure && ./open-adventure"
echo -e "  2. 验证源码保护: find $DIST_DIR/open-adventure -name '*.py'"
echo -e "  3. 发布到 GitHub: gh release create v$VERSION $TARBALL_PATH"
echo ""
