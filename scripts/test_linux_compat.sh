#!/bin/bash

# Linux 兼容性测试脚本
# 用于验证 start.sh 在 Linux 环境下的兼容性

echo "=========================================="
echo "Linux 兼容性测试"
echo "=========================================="
echo ""

# 检测操作系统
echo "1. 检测操作系统..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   ✅ 当前系统: macOS"
    echo "   ⚠️  注意: 这是 macOS 环境，某些测试可能不准确"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "   ✅ 当前系统: Linux"
else
    echo "   ⚠️  未知系统: $OSTYPE"
fi
echo ""

# 检查必需命令
echo "2. 检查必需命令..."
MISSING_COMMANDS=()

check_command() {
    local cmd="$1"
    local desc="$2"
    if command -v "$cmd" &> /dev/null; then
        echo "   ✅ $cmd - $desc"
    else
        echo "   ❌ $cmd - $desc (未安装)"
        MISSING_COMMANDS+=("$cmd")
    fi
}

check_command "bash" "Shell 解释器"
check_command "python3" "Python 3"
check_command "pip" "Python 包管理器"
check_command "npm" "Node.js 包管理器"
check_command "lsof" "端口检查工具"
check_command "curl" "HTTP 客户端"
check_command "pkill" "进程管理工具"
check_command "setsid" "会话管理工具 (Linux)"

echo ""

# 检查可选命令
echo "3. 检查可选命令..."
check_command "ip" "网络配置工具 (现代 Linux)"
check_command "ifconfig" "网络配置工具 (旧版)"
echo ""

# 检查 Bash 特性
echo "4. 检查 Bash 特性..."

# 测试数组语法
if bash -c 'for i in {1..5}; do echo -n "$i "; done' &> /dev/null; then
    echo "   ✅ 数组语法 {1..N} 支持"
else
    echo "   ❌ 数组语法 {1..N} 不支持"
fi

# 测试 read -p
if bash -c 'echo "test" | read -r -p "prompt: " var' &> /dev/null; then
    echo "   ✅ read -r -p 支持"
else
    echo "   ❌ read -r -p 不支持"
fi

# 测试 [[ ]] 语法
if bash -c '[[ "test" == "test" ]]' &> /dev/null; then
    echo "   ✅ [[ ]] 条件语法支持"
else
    echo "   ❌ [[ ]] 条件语法不支持"
fi

echo ""

# 检查端口
echo "5. 检查端口可用性..."
check_port() {
    local port="$1"
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "   ⚠️  端口 $port 已被占用"
    else
        echo "   ✅ 端口 $port 可用"
    fi
}

check_port 8000
check_port 5173
echo ""

# 检查 Python 环境
echo "6. 检查 Python 环境..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    echo "   ✅ Python 版本: $PYTHON_VERSION"

    # 检查虚拟环境
    if [ -d "backend/venv" ]; then
        echo "   ✅ 虚拟环境存在: backend/venv"
    else
        echo "   ⚠️  虚拟环境不存在: backend/venv"
    fi
else
    echo "   ❌ Python 3 未安装"
fi
echo ""

# 检查 Node.js 环境
echo "7. 检查 Node.js 环境..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js 版本: $NODE_VERSION"

    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo "   ✅ npm 版本: $NPM_VERSION"
    fi

    # 检查前端依赖
    if [ -d "frontend/node_modules" ]; then
        echo "   ✅ 前端依赖已安装: frontend/node_modules"
    else
        echo "   ⚠️  前端依赖未安装: frontend/node_modules"
    fi
else
    echo "   ❌ Node.js 未安装"
fi
echo ""

# 检查项目文件
echo "8. 检查项目文件..."
check_file() {
    local file="$1"
    local desc="$2"
    if [ -f "$file" ]; then
        echo "   ✅ $file - $desc"
    else
        echo "   ❌ $file - $desc (不存在)"
    fi
}

check_file "start.sh" "启动脚本"
check_file "stop.sh" "停止脚本"
check_file "backend/pyproject.toml" "Python 项目配置"
check_file "backend/.env.example" "后端环境变量示例"
check_file "frontend/package.json" "前端项目配置"
echo ""

# 总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo ""

if [ ${#MISSING_COMMANDS[@]} -eq 0 ]; then
    echo "✅ 所有必需命令都已安装"
    echo "✅ 系统环境符合要求"
    echo ""
    echo "可以运行: ./start.sh"
else
    echo "❌ 缺少以下命令: ${MISSING_COMMANDS[*]}"
    echo ""
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "请安装缺少的命令:"
        echo "  Ubuntu/Debian: sudo apt-get install ${MISSING_COMMANDS[*]}"
        echo "  CentOS/RHEL: sudo yum install ${MISSING_COMMANDS[*]}"
        echo "  Arch: sudo pacman -S ${MISSING_COMMANDS[*]}"
    fi
fi
echo ""
