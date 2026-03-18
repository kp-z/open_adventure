#!/bin/bash

# 严格模式：遇到错误立即退出
set -e

# 检测操作系统
OS_TYPE="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
fi

# 检查必需的命令
check_required_commands() {
    local missing_commands=()

    # 检查 lsof（端口检查必需）
    if ! command -v lsof &> /dev/null; then
        missing_commands+=("lsof")
    fi

    # 检查 curl（健康检查必需）
    if ! command -v curl &> /dev/null; then
        missing_commands+=("curl")
    fi

    if [ ${#missing_commands[@]} -gt 0 ]; then
        echo "❌ Missing required commands: ${missing_commands[*]}"
        echo ""
        if [ "$OS_TYPE" = "linux" ]; then
            echo "Please install them using:"
            echo "  Ubuntu/Debian: sudo apt-get install lsof curl"
            echo "  CentOS/RHEL: sudo yum install lsof curl"
            echo "  Arch: sudo pacman -S lsof curl"
        elif [ "$OS_TYPE" = "macos" ]; then
            echo "Please install them using:"
            echo "  brew install lsof curl"
        fi
        exit 1
    fi
}

# 执行检查
check_required_commands

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 创建 PID 文件目录
PID_DIR="$SCRIPT_DIR/.run"
mkdir -p "$PID_DIR"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
MICROVERSE_PID_FILE="$PID_DIR/microverse.pid"
CADDY_PID_FILE="$PID_DIR/caddy.pid"

# 固定默认端口（除非用户显式选择新端口）
BACKEND_PORT=38080
FRONTEND_PORT=5173
MICROVERSE_PORT=5174
CADDY_PORT=8443

# 检查运行模式参数
DAEMON_MODE=false
NON_INTERACTIVE=false
FORCE_RESET=false
PREVENT_SLEEP=false
CLEAR_CACHE=false
WITH_MICROVERSE=false
DEV_MODE=false

for arg in "$@"; do
    case "$arg" in
        -d|--daemon)
            DAEMON_MODE=true
            ;;
        --reset-all)
            FORCE_RESET=true
            ;;
        --no-sleep)
            PREVENT_SLEEP=true
            ;;
        --clear-cache)
            CLEAR_CACHE=true
            ;;
        --with-microverse)
            WITH_MICROVERSE=true
            ;;
        --dev)
            DEV_MODE=true
            ;;
    esac
done

# 检查是否为非交互模式（用于 systemd 等自动化部署）
if [ -n "$NON_INTERACTIVE_MODE" ] || [ ! -t 0 ]; then
    NON_INTERACTIVE=true
fi

echo "🚀 Starting Open Adventure..."
if [ "$DAEMON_MODE" = true ]; then
    echo "📌 Running in daemon mode (background)"
fi
if [ "$FORCE_RESET" = true ]; then
    echo "🔄 Running in force reset mode (--reset-all)"
fi
if [ "$PREVENT_SLEEP" = true ] && [ "$OS_TYPE" = "macos" ]; then
    echo "☕ Preventing system sleep (macOS)"
fi
if [ "$CLEAR_CACHE" = true ]; then
    echo "🧹 Running in clear cache mode (--clear-cache)"
fi
if [ "$WITH_MICROVERSE" = true ]; then
    echo "🎮 Microverse mode enabled"
fi
if [ "$DEV_MODE" = true ]; then
    echo "🔧 Development mode enabled (frontend hot reload)"
fi
echo ""

# ============ 插件安装 ============
echo "🔌 Checking Claude plugins..."
if [ -f "$SCRIPT_DIR/scripts/install_plugins.sh" ]; then
    bash "$SCRIPT_DIR/scripts/install_plugins.sh"
    echo ""
else
    echo "⚠️  Plugin installation script not found, skipping..."
    echo ""
fi

# ============ Microverse 文件同步 ============
if [ -d "$SCRIPT_DIR/microverse/export" ]; then
    echo "🎮 Checking Microverse game files..."
    if [ -f "$SCRIPT_DIR/scripts/sync_microverse.sh" ]; then
        bash "$SCRIPT_DIR/scripts/sync_microverse.sh"
    else
        echo "⚠️  Microverse sync script not found, skipping..."
    fi
    echo ""
fi

# ============ Caddy HTTPS 代理设置 ============
echo "🔐 Setting up Caddy HTTPS proxy..."

# 创建 Caddy 配置目录
CADDY_DIR="$SCRIPT_DIR/scripts/caddy"
mkdir -p "$CADDY_DIR"

# 检查 Caddy 是否已安装
CADDY_AVAILABLE=false
CADDY_USER_ENABLED=false

if command -v caddy &> /dev/null; then
    CADDY_AVAILABLE=true
    echo "✅ Caddy is installed"

    # 非交互模式：默认启用 Caddy
    if [ "$NON_INTERACTIVE" = true ]; then
        CADDY_USER_ENABLED=true
        echo "Running in non-interactive mode, Caddy HTTPS proxy will be enabled."
    else
        # 交互模式：询问是否启用 Caddy
        echo ""
        echo "Caddy can provide HTTPS access for /microverse (required for Godot Web Secure Context)"
        echo "This will start Caddy on port $CADDY_PORT with automatic TLS certificates."
        echo ""
        echo "Would you like to enable Caddy HTTPS proxy?"
        echo "  [y] Yes, enable HTTPS proxy (Recommended for /microverse)"
        echo "  [n] No, skip for now"
        echo ""

        while true; do
            read -r -p "Your choice [y/n]: " choice
            case "$choice" in
                y|Y)
                    CADDY_USER_ENABLED=true
                    echo "✅ Caddy HTTPS proxy will be enabled"
                    break
                    ;;
                n|N)
                    echo "⏭️  Skipping Caddy HTTPS proxy"
                    echo "   Note: /microverse may not work without HTTPS (Godot Web requires Secure Context)"
                    break
                    ;;
                *)
                    echo "Please enter y or n."
                    ;;
            esac
        done
    fi
    echo ""
else
    echo "⚠️  Caddy not found."
    echo "   Caddy is required for HTTPS access to /microverse (Godot Web requires Secure Context)"
    echo ""

    # 非交互模式：跳过安装
    if [ "$NON_INTERACTIVE" = true ]; then
        echo "Running in non-interactive mode, skipping Caddy installation."
        echo "HTTPS proxy will be disabled."
        echo ""
    else
        # 交互模式：询问是否安装
        if [ "$OS_TYPE" = "macos" ]; then
            # macOS: 检查是否有 Homebrew
            if command -v brew &> /dev/null; then
                echo "Would you like to install Caddy now? (Recommended for /microverse)"
                echo "  [y] Yes, install via Homebrew (brew install caddy)"
                echo "  [n] No, skip for now"
                echo ""

                while true; do
                    read -r -p "Your choice [y/n]: " choice
                    case "$choice" in
                        y|Y)
                            echo ""
                            echo "Installing Caddy via Homebrew..."
                            if brew install caddy; then
                                echo "✅ Caddy installed successfully"
                                CADDY_AVAILABLE=true
                                CADDY_USER_ENABLED=true
                            else
                                echo "❌ Failed to install Caddy"
                                echo "You can install it manually later: brew install caddy"
                            fi
                            break
                            ;;
                        n|N)
                            echo "Skipping Caddy installation. HTTPS proxy will be disabled."
                            echo "You can install it later: brew install caddy"
                            break
                            ;;
                        *)
                            echo "Please enter y or n."
                            ;;
                    esac
                done
            else
                echo "Homebrew not found. Please install Caddy manually:"
                echo "  1. Install Homebrew: https://brew.sh/"
                echo "  2. Install Caddy: brew install caddy"
            fi
        elif [ "$OS_TYPE" = "linux" ]; then
            echo "Please install Caddy manually:"
            echo "  Ubuntu/Debian: https://caddyserver.com/docs/install#debian-ubuntu-raspbian"
            echo "  Other Linux: https://caddyserver.com/docs/install"
            echo ""
            echo "After installation, restart this script to enable HTTPS proxy."
        fi
    fi
    echo ""
fi

# 如果 Caddy 可用且用户启用，生成配置并启动
if [ "$CADDY_AVAILABLE" = true ] && [ "$CADDY_USER_ENABLED" = true ]; then
    # 生成 Caddyfile（不写死 IP，使用 internal TLS）
    cat > "$CADDY_DIR/Caddyfile" <<'EOF'
{
  auto_https disable_redirects
}

https://:8443 {
  tls internal

  @microverse path /microverse*
  handle @microverse {
    header {
      Cross-Origin-Opener-Policy "same-origin"
      Cross-Origin-Embedder-Policy "require-corp"
    }
    reverse_proxy 127.0.0.1:5173
  }

  handle {
    redir http://{host}:5173{uri} 308
  }
}
EOF

    echo "✅ Caddyfile generated at $CADDY_DIR/Caddyfile"

    # 验证配置文件
    if ! caddy validate --config "$CADDY_DIR/Caddyfile" --adapter caddyfile > /dev/null 2>&1; then
        echo "❌ Caddyfile validation failed"
        echo "   HTTPS proxy will be disabled"
        echo "   You can check the config at: $CADDY_DIR/Caddyfile"
        echo ""
    else
        # 停止旧的 Caddy 进程（如果存在）
        caddy stop 2>/dev/null || true
        sleep 1

        # 启动 Caddy（后台运行，使用 caddyfile adapter）
        if caddy start --config "$CADDY_DIR/Caddyfile" --adapter caddyfile > /dev/null 2>&1; then
            # 获取 Caddy PID（通过进程名查找）
            sleep 1
            CADDY_PID=$(pgrep -f "caddy.*$CADDY_DIR/Caddyfile" | head -1)
            if [ -n "$CADDY_PID" ]; then
                echo "$CADDY_PID" > "$CADDY_PID_FILE"
                echo "✅ Caddy started (PID: $CADDY_PID, Port: $CADDY_PORT)"
                echo "   HTTPS access: https://<your-ip>:$CADDY_PORT/microverse"
            else
                echo "⚠️  Caddy started but PID not found"
            fi
        else
            echo "❌ Failed to start Caddy"
            echo "   You can check logs with: caddy run --config $CADDY_DIR/Caddyfile --adapter caddyfile"
        fi
        echo ""
    fi
fi

# 检查后端目录
if [ ! -d "backend" ]; then
    echo "❌ backend directory not found"
    exit 1
fi

# 检查前端目录
if [ ! -d "frontend" ]; then
    echo "❌ frontend directory not found"
    exit 1
fi

# 检查 install.sh
if [ ! -f "$SCRIPT_DIR/install.sh" ]; then
    echo "❌ install.sh not found"
    exit 1
fi

# ============ 后端设置 ============
echo "📦 Setting up backend..."
cd backend

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# 激活虚拟环境
source venv/bin/activate

# 检查依赖
check_python_deps() {
    # 检查多个关键依赖，确保完整性
    python -c "import fastapi" 2>/dev/null && \
    python -c "import uvicorn" 2>/dev/null && \
    python -c "import sqlalchemy" 2>/dev/null && \
    python -c "import psutil" 2>/dev/null && \
    python -c "from jose import jwt" 2>/dev/null && \
    python -c "from passlib.context import CryptContext" 2>/dev/null && \
    python -c "import anthropic" 2>/dev/null && \
    python -c "import pydantic_settings" 2>/dev/null && \
    python -c "import aiosqlite" 2>/dev/null && \
    python -c "import greenlet" 2>/dev/null && \
    python -c "import dotenv" 2>/dev/null && \
    python -c "import aiohttp" 2>/dev/null && \
    python -c "import yaml" 2>/dev/null && \
    python -c "import cryptography" 2>/dev/null
}

install_python_deps() {
    if [ -f "requirements.txt" ]; then
        pip install -q -r requirements.txt
    else
        echo "❌ backend/requirements.txt not found"
        exit 1
    fi
}

if ! check_python_deps; then
    echo "Installing Python dependencies..."
    install_python_deps

    # 再次验证安装
    if ! check_python_deps; then
        echo "❌ Failed to install Python dependencies"
        echo "Please check the error messages above and try manually:"
        echo "  cd backend && pip install -r requirements.txt"
        exit 1
    fi
fi

# 检查并创建 .env 文件
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo "✅ .env file created"
        echo "⚠️  Please edit backend/.env and configure your settings"
        echo ""
    else
        echo "❌ .env.example not found"
        exit 1
    fi
fi

# 设置开发环境变量（本地开发使用）
export ENV=development

# 确保日志目录存在
mkdir -p "$SCRIPT_DIR/docs/logs"

# 检查并清理旧的 PID 文件
if [ -f "$BACKEND_PID_FILE" ]; then
    OLD_PID=$(cat "$BACKEND_PID_FILE")
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "⚠️  Found running backend process from previous session (PID: $OLD_PID)"
        echo "Cleaning up old process..."
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$BACKEND_PID_FILE"
fi

if [ -f "$FRONTEND_PID_FILE" ]; then
    OLD_FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if [ -n "$OLD_FRONTEND_PID" ] && kill -0 "$OLD_FRONTEND_PID" 2>/dev/null; then
        echo "⚠️  Found running frontend process from previous session (PID: $OLD_FRONTEND_PID)"
        echo "Cleaning up old process..."
        kill "$OLD_FRONTEND_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$FRONTEND_PID_FILE"
fi

if [ -f "$MICROVERSE_PID_FILE" ]; then
    OLD_MICROVERSE_PID=$(cat "$MICROVERSE_PID_FILE")
    if [ -n "$OLD_MICROVERSE_PID" ] && kill -0 "$OLD_MICROVERSE_PID" 2>/dev/null; then
        echo "⚠️  Found running Microverse process from previous session (PID: $OLD_MICROVERSE_PID)"
        echo "Cleaning up old process..."
        kill "$OLD_MICROVERSE_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$MICROVERSE_PID_FILE"
fi

if [ -f "$CADDY_PID_FILE" ]; then
    OLD_CADDY_PID=$(cat "$CADDY_PID_FILE")
    if [ -n "$OLD_CADDY_PID" ] && kill -0 "$OLD_CADDY_PID" 2>/dev/null; then
        echo "⚠️  Found running Caddy process from previous session (PID: $OLD_CADDY_PID)"
        echo "Cleaning up old process..."
        kill "$OLD_CADDY_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$CADDY_PID_FILE"
fi

# 强制清理后端进程的函数
cleanup_backend() {
    echo "Cleaning up backend processes..."

    # 方法1: 通过端口查找并杀死进程
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "  - Killing processes on port $BACKEND_PORT..."
        lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    fi

    # 方法2: 通过进程名查找并杀死
    echo "  - Killing uvicorn processes..."
    pkill -9 -f "uvicorn.*app.main:app" 2>/dev/null || true
    pkill -9 -f "uvicorn.*app:app" 2>/dev/null || true

    # 方法3: 查找 Python 进程中包含 run.py 的
    echo "  - Killing Python backend processes..."
    pkill -9 -f "python.*run\.py" 2>/dev/null || true
    pkill -9 -f "python3.*run\.py" 2>/dev/null || true

    # 方法4: 查找所有监听后端端口的 Python 进程
    pgrep -f "python.*$BACKEND_PORT" | xargs kill -9 2>/dev/null || true

    # 等待进程完全退出
    sleep 2

    # 最终验证
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "  ⚠️  Warning: Port $BACKEND_PORT still occupied after cleanup"
        # 最后一次尝试：直接杀死所有占用端口的进程
        lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
        sleep 1

        if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            return 1
        fi
    fi

    rm -f "$BACKEND_PID_FILE"
    echo "  ✅ Backend cleanup completed"
    return 0
}

# 强制清理前端进程的函数
cleanup_frontend() {
    echo "Cleaning up frontend processes..."

    # 方法1: 通过端口查找并杀死进程
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "  - Killing processes on port $FRONTEND_PORT..."
        lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    fi

    # 方法2: 通过进程名查找并杀死
    echo "  - Killing Vite frontend processes..."
    pkill -9 -f "vite.*$FRONTEND_PORT" 2>/dev/null || true
    pkill -9 -f "npm.*run dev" 2>/dev/null || true

    # 等待进程完全退出
    sleep 1

    # 最终验证
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "  ⚠️  Warning: Port $FRONTEND_PORT still occupied after cleanup"
        lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
        sleep 1

        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            return 1
        fi
    fi

    rm -f "$FRONTEND_PID_FILE"
    echo "  ✅ Frontend cleanup completed"
    return 0
}

# 读取端口策略：重启占用进程 / 使用新端口 / 退出
resolve_port_conflict() {
    local service_name="$1"
    local port_var_name="$2"
    local cleanup_func_name="$3"

    local current_port
    current_port=$(eval "echo \$$port_var_name")

    if ! lsof -Pi :"$current_port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    fi

    echo "⚠️  Port $current_port is already in use for $service_name"

    # 非交互模式：自动清理端口
    if [ "$NON_INTERACTIVE" = true ]; then
        echo "Running in non-interactive mode, automatically cleaning up port..."
        if ! "$cleanup_func_name"; then
            echo "❌ Failed to release port $current_port"
            exit 1
        fi
        echo "✅ Port $current_port released"
        return 0
    fi

    # 交互模式：询问用户
    echo "Choose an action:"
    echo "  [r] Restart on this port (kill occupying process)"
    echo "  [n] Use a new port"
    echo "  [q] Quit"

    while true; do
        read -r -p "Your choice [r/n/q]: " choice
        case "$choice" in
            r|R)
                if ! "$cleanup_func_name"; then
                    echo "❌ Failed to release port $current_port"
                    echo "Please manually stop the process and retry."
                    exit 1
                fi
                echo "✅ Port $current_port released"
                break
                ;;
            n|N)
                while true; do
                    read -r -p "Enter new $service_name port: " new_port
                    if [[ ! "$new_port" =~ ^[0-9]+$ ]] || [ "$new_port" -lt 1 ] || [ "$new_port" -gt 65535 ]; then
                        echo "❌ Invalid port. Please enter a number between 1 and 65535."
                        continue
                    fi

                    if lsof -Pi :"$new_port" -sTCP:LISTEN -t >/dev/null 2>&1; then
                        echo "⚠️  Port $new_port is also in use. Choose another one."
                        continue
                    fi

                    eval "$port_var_name=$new_port"
                    echo "✅ $service_name will use port $new_port"
                    break
                done
                break
                ;;
            q|Q)
                echo "❌ Startup cancelled by user"
                exit 1
                ;;
            *)
                echo "Please enter r, n, or q."
                ;;
        esac
    done
}

# 清除缓存模式：清理前端缓存、localStorage 和后端数据库
if [ "$CLEAR_CACHE" = true ]; then
    echo ""
    echo "🧹 Clear cache mode enabled: cleaning frontend cache, localStorage, and backend database..."

    # 清理前端构建缓存
    rm -rf "$SCRIPT_DIR/frontend/.vite"
    rm -rf "$SCRIPT_DIR/frontend/dist"
    rm -rf "$SCRIPT_DIR/frontend/node_modules/.vite"

    # 清理后端数据库（SQLite）
    if [ -f "$SCRIPT_DIR/backend/open_adventure.db" ]; then
        echo "🗑️  Removing backend database..."
        rm -f "$SCRIPT_DIR/backend/open_adventure.db"
        echo "✅ Backend database removed"
    fi

    # 清理根目录的数据库文件（如果存在）
    if [ -f "$SCRIPT_DIR/open_adventure.db" ]; then
        echo "🗑️  Removing root database..."
        rm -f "$SCRIPT_DIR/open_adventure.db"
        echo "✅ Root database removed"
    fi

    # 创建一个标记文件，前端启动时会读取并清除 localStorage
    mkdir -p "$SCRIPT_DIR/frontend/public"
    echo "clear" > "$SCRIPT_DIR/frontend/public/.clear-cache"

    echo "✅ Cache cleanup completed"
    echo "📝 Frontend will clear localStorage on next load"
    echo "📝 Backend will initialize a fresh database"
    echo ""
fi

# 强制全量重置模式：清理进程、依赖和配置
if [ "$FORCE_RESET" = true ]; then
    echo ""
    echo "⚠️  Force reset mode enabled: cleaning runtime, dependencies, and config files..."

    # 先尽力停止已有服务进程
    cleanup_backend || true
    cleanup_frontend || true

    # 删除 PID 文件
    rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"

    # 删除后端虚拟环境与前端依赖
    rm -rf "$SCRIPT_DIR/backend/venv"
    rm -rf "$SCRIPT_DIR/frontend/node_modules"

    # 删除配置文件（下次启动自动从 example 重建）
    rm -f "$SCRIPT_DIR/backend/.env"
    rm -f "$SCRIPT_DIR/frontend/.env.local"

    # 清除缓存（包含在 --reset-all 中）
    rm -rf "$SCRIPT_DIR/frontend/.vite"
    rm -rf "$SCRIPT_DIR/frontend/dist"
    rm -rf "$SCRIPT_DIR/frontend/node_modules/.vite"
    mkdir -p "$SCRIPT_DIR/frontend/public"
    echo "clear" > "$SCRIPT_DIR/frontend/public/.clear-cache"

    echo "✅ Force reset cleanup completed"
fi

# ============ 前端设置（在后端启动之前）============
cd "$SCRIPT_DIR/frontend"
echo ""
echo "📦 Setting up frontend..."

# 检查 npm 依赖健康状态
if ! npm ls --depth=0 >/dev/null 2>&1; then
    echo "Installing frontend dependencies..."
    npm install
    echo "✅ Frontend dependencies installed"
fi

# 同步 Godot/Microverse 导出文件（如果存在）
echo "Checking Microverse export files..."
if [ -f "$SCRIPT_DIR/scripts/sync_microverse.sh" ]; then
    bash "$SCRIPT_DIR/scripts/sync_microverse.sh"
else
    echo "⚠️  Microverse sync script not found, skipping..."
fi
echo ""

# 前端构建或开发模式准备
if [ "$DEV_MODE" = true ]; then
    echo "Skipping frontend build (dev mode will use npm run dev)..."
else
    # 检查前端构建是否存在，如果不存在则构建
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
        echo "Building frontend..."
        npm run build
        echo "✅ Frontend built"
    fi
fi

# 清理旧的 .env.local（如果存在）
if [ -f ".env.local" ]; then
    echo "Removing old .env.local (frontend now auto-detects API address)..."
    rm -f .env.local
fi

# 返回后端目录
cd "$SCRIPT_DIR/backend"

# 检查端口占用
echo "Checking port availability..."
resolve_port_conflict "backend" "BACKEND_PORT" "cleanup_backend"
resolve_port_conflict "frontend" "FRONTEND_PORT" "cleanup_frontend"

# 启动后端服务器（后台运行）
echo "Starting backend server on port $BACKEND_PORT..."

# 使用虚拟环境的 Python（明确路径，避免环境变量问题）
VENV_PYTHON="$SCRIPT_DIR/backend/venv/bin/python"

# 根据操作系统选择启动方式
if [ "$OS_TYPE" = "linux" ] && command -v setsid &> /dev/null; then
    # Linux: 使用 setsid 创建独立会话，避免终端关闭时进程被杀死
    setsid "$VENV_PYTHON" -c "import uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=$BACKEND_PORT, reload=True, log_level='info')" > ../docs/logs/backend.log 2>&1 &
else
    # macOS 或不支持 setsid 的系统：直接后台运行
    if [ "$PREVENT_SLEEP" = true ] && [ "$OS_TYPE" = "macos" ]; then
        # macOS + 防休眠模式：使用 caffeinate 包裹后端进程
        caffeinate -i "$VENV_PYTHON" -c "import uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=$BACKEND_PORT, reload=True, log_level='info')" > ../docs/logs/backend.log 2>&1 &
    else
        "$VENV_PYTHON" -c "import uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=$BACKEND_PORT, reload=True, log_level='info')" > ../docs/logs/backend.log 2>&1 &
    fi
fi

BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
echo "✅ Backend started (PID: $BACKEND_PID)"

# 等待后端启动（最多 10 秒）
echo "Waiting for backend to start..."
for i in {1..20}; do
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "⚠️  Backend may not have started properly, check docs/logs/backend.log"
    fi
    sleep 0.5
done

# 后端健康检查（阻断前端启动）
check_backend_endpoint() {
    local endpoint="$1"
    local name="$2"

    for _ in {1..20}; do
        local status
        status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${BACKEND_PORT}${endpoint}" || true)
        if [ "$status" = "200" ]; then
            echo "✅ ${name} check passed (${endpoint})"
            return 0
        fi
        sleep 0.5
    done

    echo "❌ ${name} check failed (${endpoint})"
    return 1
}

if ! check_backend_endpoint "/api/system/health" "Backend health"; then
    echo "❌ Backend health check failed."
    echo "👉 Please check docs/logs/backend.log for startup errors."
    echo "👉 Possible causes: port ${BACKEND_PORT} conflict or backend process crashed."
    exit 1
fi

if ! check_backend_endpoint "/api/terminal/status" "Terminal status"; then
    echo "❌ Terminal status check failed."
    echo "👉 Please check docs/logs/backend.log for terminal initialization errors."
    echo "👉 Possible causes: backend service not fully initialized or port ${BACKEND_PORT} conflict."
    exit 1
fi

# 获取 IP 地址（仅用于显示，不生成配置文件）
get_display_ip() {
    local ip=""

    # 方法 1: 使用 ip 命令（现代 Linux）
    if command -v ip &> /dev/null; then
        local default_iface=$(ip route | grep default | awk '{print $5}' | head -1)
        if [ -n "$default_iface" ]; then
            ip=$(ip addr show "$default_iface" | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -1)
        fi
    fi

    # 方法 2: 回退到 ifconfig（旧版 Linux）
    if [ -z "$ip" ] && command -v ifconfig &> /dev/null; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | grep -v "198.18" | awk '{print $2}' | head -1)
    fi

    # 方法 3: 获取公网 IP（云端环境）
    if [ -z "$ip" ]; then
        ip=$(curl -s --connect-timeout 2 ifconfig.me 2>/dev/null || echo "")
    fi

    echo "$ip"
}

DISPLAY_IP=$(get_display_ip)

if [ -n "$DISPLAY_IP" ]; then
    echo "✅ Network access configured (IP: $DISPLAY_IP)"
else
    echo "✅ Network access configured"
fi

# 启动前端服务器（开发模式或生产模式）
if [ "$DEV_MODE" = true ]; then
    echo ""
    echo "Starting frontend development server on port $FRONTEND_PORT..."
    cd "$SCRIPT_DIR/frontend"

    # 启动 Vite 开发服务器（后台运行）
    npm run dev > "$SCRIPT_DIR/docs/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

    # 等待前端启动
    echo "Waiting for frontend dev server to start..."
    for i in {1..20}; do
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ Frontend dev server is ready (PID: $FRONTEND_PID)"
            break
        fi
        if [ $i -eq 20 ]; then
            echo "⚠️  Frontend dev server may not have started properly, check docs/logs/frontend.log"
        fi
        sleep 0.5
    done

    cd "$SCRIPT_DIR"
else
    # 前端静态文件由后端提供（38080 端口）
    echo ""
    echo "Frontend static files served by backend on port $BACKEND_PORT"
fi

if [ "$DAEMON_MODE" = true ]; then
    # 后台模式
    echo ""
    echo "============================================"
    echo "✅ Open Adventure is running in background!"
    echo "============================================"
    echo ""
    echo "🌐 Access URL:"
    if [ "$DEV_MODE" = true ]; then
        echo "   Frontend (Dev): http://localhost:${FRONTEND_PORT}"
        echo "   Backend API: http://localhost:${BACKEND_PORT}"
        echo "   API Docs: http://localhost:${BACKEND_PORT}/docs"
    else
        echo "   http://localhost:${BACKEND_PORT}"
        echo "   API Docs: http://localhost:${BACKEND_PORT}/docs"
    fi
    if [ "$CADDY_USER_ENABLED" = true ] && [ -n "$CADDY_PID" ]; then
        echo "   Microverse (HTTPS): https://localhost:${CADDY_PORT}/microverse"
    fi
    if [ -n "$DISPLAY_IP" ]; then
        echo ""
        echo "🌍 Network Access:"
        if [ "$DEV_MODE" = true ]; then
            echo "   Frontend (Dev): http://${DISPLAY_IP}:${FRONTEND_PORT}"
            echo "   Backend API: http://${DISPLAY_IP}:${BACKEND_PORT}"
        else
            echo "   http://${DISPLAY_IP}:${BACKEND_PORT}"
            echo "   Backend API: http://${DISPLAY_IP}:${BACKEND_PORT}"
        fi
        if [ "$CADDY_USER_ENABLED" = true ] && [ -n "$CADDY_PID" ]; then
            echo "   Microverse (HTTPS): https://${DISPLAY_IP}:${CADDY_PORT}/microverse"
        fi
    fi
    echo ""
    echo "📋 Process IDs:"
    echo "   Backend PID: $BACKEND_PID"
    if [ "$DEV_MODE" = true ] && [ -n "$FRONTEND_PID" ]; then
        echo "   Frontend PID: $FRONTEND_PID"
    fi
    if [ "$CADDY_USER_ENABLED" = true ] && [ -n "$CADDY_PID" ]; then
        echo "   Caddy PID: $CADDY_PID"
    fi
    echo ""
    echo "📝 Logs:"
    echo "   Backend: docs/logs/backend.log"
    if [ "$DEV_MODE" = true ]; then
        echo "   Frontend: docs/logs/frontend.log"
    fi
    echo ""
    echo "🛑 To stop all servers, run: ./stop.sh"
    echo "============================================"
    echo ""

    # 启动 Microverse（如果启用）
    if [ "$WITH_MICROVERSE" = true ]; then
        echo ""
        echo "🎮 Starting Microverse..."

        # 检查导出文件是否存在
        if [ ! -f "$SCRIPT_DIR/microverse/export/index.html" ]; then
            echo "⚠️  Microverse not exported yet"
            echo "👉 Please run: cd microverse && ./export.sh"
            echo "⏭️  Skipping Microverse startup"
        else
            cd "$SCRIPT_DIR/microverse/export"
            python3 -m http.server $MICROVERSE_PORT > "$SCRIPT_DIR/docs/logs/microverse.log" 2>&1 &
            MICROVERSE_PID=$!
            echo "$MICROVERSE_PID" > "$MICROVERSE_PID_FILE"

            # 等待 Microverse 启动
            echo "Waiting for Microverse to start..."
            for i in {1..10}; do
                if lsof -Pi :$MICROVERSE_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
                    echo "✅ Microverse is ready (PID: $MICROVERSE_PID)"
                    echo "🌐 Microverse: http://localhost:${MICROVERSE_PORT}"
                    if [ -n "$DISPLAY_IP" ]; then
                        echo "🌍 Network: http://${DISPLAY_IP}:${MICROVERSE_PORT}"
                    fi
                    break
                fi
                if [ $i -eq 10 ]; then
                    echo "⚠️  Microverse may not have started properly"
                fi
                sleep 0.5
            done

            cd "$SCRIPT_DIR"
        fi
        echo ""
    fi
else
    # 前台模式：显示访问信息
    echo ""
    echo "============================================"
    echo "✅ Open Adventure is running!"
    echo "============================================"
    echo ""
    echo "🌐 Access URL:"
    if [ "$DEV_MODE" = true ]; then
        echo "   Frontend (Dev): http://localhost:${FRONTEND_PORT}"
        echo "   Backend API: http://localhost:${BACKEND_PORT}"
        echo "   API Docs: http://localhost:${BACKEND_PORT}/docs"
    else
        echo "   http://localhost:${BACKEND_PORT}"
        echo "   API Docs: http://localhost:${BACKEND_PORT}/docs"
    fi
    if [ "$CADDY_USER_ENABLED" = true ] && [ -n "$CADDY_PID" ]; then
        echo "   Microverse (HTTPS): https://localhost:${CADDY_PORT}/microverse"
    fi
    if [ -n "$DISPLAY_IP" ]; then
        echo ""
        echo "🌍 Network Access:"
        if [ "$DEV_MODE" = true ]; then
            echo "   Frontend (Dev): http://${DISPLAY_IP}:${FRONTEND_PORT}"
            echo "   Backend API: http://${DISPLAY_IP}:${BACKEND_PORT}"
        else
            echo "   http://${DISPLAY_IP}:${BACKEND_PORT}"
            echo "   Backend API: http://${DISPLAY_IP}:${BACKEND_PORT}"
        fi
        if [ "$CADDY_USER_ENABLED" = true ] && [ -n "$CADDY_PID" ]; then
            echo "   Microverse (HTTPS): https://${DISPLAY_IP}:${CADDY_PORT}/microverse"
        fi
    fi
    echo ""
    if [ "$DEV_MODE" = true ]; then
        echo "💡 Development mode: Frontend has hot reload enabled"
        echo ""
    fi
    echo "Press Ctrl+C to stop all servers"
    echo "============================================"
    echo ""

    # 设置退出信号处理
    cleanup() {
        echo ""
        echo "🛑 Shutting down servers..."

        fast_stop_pid() {
            local pid="$1"
            local name="$2"

            if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
                return 0
            fi

            echo "Stopping $name (PID: $pid)..."
            kill "$pid" 2>/dev/null || true

            # 最多等待 1.2 秒，避免 Ctrl+C 卡住
            for _ in {1..6}; do
                if ! kill -0 "$pid" 2>/dev/null; then
                    return 0
                fi
                sleep 0.2
            done

            kill -9 "$pid" 2>/dev/null || true
        }

        # 1. 优先按 PID 文件快速停止后端
        if [ -f "$BACKEND_PID_FILE" ]; then
            SAVED_PID=$(cat "$BACKEND_PID_FILE")
            fast_stop_pid "$SAVED_PID" "backend"
            rm -f "$BACKEND_PID_FILE"
        fi

        # 2. 再尝试停止当前会话记录的后端 PID
        if [ -n "$BACKEND_PID" ]; then
            fast_stop_pid "$BACKEND_PID" "backend"
        fi

        # 3. 前端在前台退出时通常会自动停止，这里补充兜底清理
        if [ -f "$FRONTEND_PID_FILE" ]; then
            SAVED_FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
            fast_stop_pid "$SAVED_FRONTEND_PID" "frontend"
            rm -f "$FRONTEND_PID_FILE"
        fi

        # 4. 停止 Caddy
        if [ -f "$CADDY_PID_FILE" ]; then
            SAVED_CADDY_PID=$(cat "$CADDY_PID_FILE")
            fast_stop_pid "$SAVED_CADDY_PID" "Caddy"
            rm -f "$CADDY_PID_FILE"
        fi
        # 使用 caddy stop 命令确保完全停止
        caddy stop 2>/dev/null || true

        # 5. 额外保险：清理残留进程
        pkill -f "uvicorn app.main:app" 2>/dev/null || true
        pkill -f "python.*run\.py" 2>/dev/null || true
        pkill -f "vite.*$FRONTEND_PORT" 2>/dev/null || true

        # 6. 最后验证端口
        if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
        fi
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
        fi

        echo "✅ All servers stopped"
        exit 0
    }

    # 捕获 Ctrl+C (SIGINT) 和 SIGTERM
    trap cleanup SIGINT SIGTERM

    # 前台模式：保持脚本运行，等待 Ctrl+C
    echo "Waiting for Ctrl+C to stop..."
    while true; do
        sleep 1
    done
fi
