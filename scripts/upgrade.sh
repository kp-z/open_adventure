#!/bin/bash
#
# Open Adventure 升级脚本
# 自动下载并安装最新版本
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 获取当前版本
get_current_version() {
    if [ -f "VERSION" ]; then
        cat VERSION
    else
        echo "unknown"
    fi
}

# 获取最新版本
get_latest_version() {
    curl -s https://api.github.com/repos/kp-z/open_adventure/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/'
}

# 检测平台和架构
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    if [ "$os" = "darwin" ]; then
        echo "macos-arm64"
    elif [ "$os" = "linux" ]; then
        # 检测 GLIBC 版本
        local glibc_version=$(ldd --version 2>&1 | head -1 | grep -oP '\d+\.\d+' | head -1)
        local glibc_major=$(echo $glibc_version | cut -d. -f1)
        local glibc_minor=$(echo $glibc_version | cut -d. -f2)

        # GLIBC 2.31+ 使用兼容版，2.38+ 可以使用最新版
        if [ "$glibc_major" -gt 2 ] || ([ "$glibc_major" -eq 2 ] && [ "$glibc_minor" -ge 38 ]); then
            echo "linux-x86_64-latest"
        else
            echo "linux-x86_64-compat"
        fi
    else
        print_error "不支持的操作系统: $os"
        exit 1
    fi
}

# 主函数
main() {
    echo "================================================"
    echo "  Open Adventure 升级工具"
    echo "================================================"
    echo ""

    # 检查是否在项目目录
    if [ ! -f "start.sh" ]; then
        print_error "请在 Open Adventure 项目根目录运行此脚本"
        exit 1
    fi

    # 获取版本信息
    print_info "检查版本信息..."
    CURRENT_VERSION=$(get_current_version)
    LATEST_VERSION=$(get_latest_version)

    if [ -z "$LATEST_VERSION" ]; then
        print_error "无法获取最新版本信息，请检查网络连接"
        exit 1
    fi

    echo "  当前版本: v$CURRENT_VERSION"
    echo "  最新版本: v$LATEST_VERSION"
    echo ""

    # 检查是否需要升级
    if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
        print_success "已是最新版本，无需升级"
        exit 0
    fi

    # 确认升级
    echo "是否要升级到 v$LATEST_VERSION？"
    echo "  [y] 是，开始升级"
    echo "  [n] 否，取消升级"
    echo ""
    read -p "请选择 [y/n]: " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "升级已取消"
        exit 0
    fi

    # 检测平台
    print_info "检测系统平台..."
    PLATFORM=$(detect_platform)
    echo "  平台: $PLATFORM"
    echo ""

    # 停止服务
    print_info "停止当前服务..."
    if [ -f "stop.sh" ]; then
        ./stop.sh || true
    else
        pkill -f "open-adventure" || true
        pkill -f "uvicorn.*app.main:app" || true
    fi
    sleep 2
    print_success "服务已停止"
    echo ""

    # 备份用户数据
    print_info "备份用户数据..."
    BACKUP_DIR="$HOME/.open_adventure.backup.$(date +%Y%m%d_%H%M%S)"
    if [ -d "$HOME/.open_adventure" ]; then
        cp -r "$HOME/.open_adventure" "$BACKUP_DIR"
        print_success "数据已备份到: $BACKUP_DIR"
    else
        print_warning "未找到用户数据目录，跳过备份"
    fi
    echo ""

    # 下载新版本
    print_info "下载新版本..."
    DOWNLOAD_URL="https://github.com/kp-z/open_adventure/releases/download/v${LATEST_VERSION}/open-adventure-v${LATEST_VERSION}-${PLATFORM}.tar.gz"
    DOWNLOAD_FILE="/tmp/open-adventure-v${LATEST_VERSION}.tar.gz"

    echo "  下载地址: $DOWNLOAD_URL"

    if ! curl -L -f -o "$DOWNLOAD_FILE" "$DOWNLOAD_URL"; then
        print_error "下载失败，请检查网络连接或手动下载"
        echo "  下载地址: $DOWNLOAD_URL"
        exit 1
    fi
    print_success "下载完成"
    echo ""

    # 解压到临时目录
    print_info "解压新版本..."
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$DOWNLOAD_FILE" -C "$TEMP_DIR"
    print_success "解压完成"
    echo ""

    # 备份当前版本
    print_info "备份当前版本..."
    CURRENT_DIR=$(pwd)
    BACKUP_APP_DIR="${CURRENT_DIR}.v${CURRENT_VERSION}.backup"

    if [ -d "$BACKUP_APP_DIR" ]; then
        rm -rf "$BACKUP_APP_DIR"
    fi

    # 只备份应用文件，不包括用户数据
    mkdir -p "$BACKUP_APP_DIR"
    cp -r backend frontend scripts start.sh stop.sh install.sh VERSION "$BACKUP_APP_DIR/" 2>/dev/null || true
    print_success "当前版本已备份到: $BACKUP_APP_DIR"
    echo ""

    # 替换应用文件
    print_info "安装新版本..."

    # 删除旧的应用文件（保留用户数据目录）
    rm -rf backend frontend scripts marketplace microverse 2>/dev/null || true
    rm -f start.sh stop.sh install.sh VERSION 2>/dev/null || true

    # 复制新版本文件
    cp -r "$TEMP_DIR/open-adventure/"* "$CURRENT_DIR/"

    # 设置执行权限
    chmod +x start.sh stop.sh install.sh 2>/dev/null || true
    chmod +x scripts/*.sh 2>/dev/null || true

    print_success "新版本已安装"
    echo ""

    # 清理临时文件
    rm -rf "$TEMP_DIR"
    rm -f "$DOWNLOAD_FILE"

    # 启动新版本
    print_info "启动新版本..."
    echo ""

    if ./start.sh --daemon; then
        echo ""
        print_success "升级完成！"
        echo ""
        echo "================================================"
        echo "  升级信息"
        echo "================================================"
        echo "  旧版本: v$CURRENT_VERSION"
        echo "  新版本: v$LATEST_VERSION"
        echo "  数据备份: $BACKUP_DIR"
        echo "  应用备份: $BACKUP_APP_DIR"
        echo ""
        echo "  访问地址: http://localhost:38080"
        echo "================================================"
        echo ""
        print_info "如果遇到问题，可以使用以下命令回滚："
        echo "  1. 停止服务: ./stop.sh"
        echo "  2. 恢复应用: cp -r $BACKUP_APP_DIR/* ."
        echo "  3. 恢复数据: cp -r $BACKUP_DIR/* ~/.open_adventure/"
        echo "  4. 重启服务: ./start.sh"
        echo ""
    else
        print_error "启动失败，请检查日志"
        echo ""
        print_info "回滚到旧版本..."
        cp -r "$BACKUP_APP_DIR/"* "$CURRENT_DIR/"
        print_warning "已回滚到 v$CURRENT_VERSION"
        exit 1
    fi
}

# 运行主函数
main
