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

# 固定默认端口（除非用户显式选择新端口）
BACKEND_PORT=8000
FRONTEND_PORT=5173

# 检查是否为后台运行模式
DAEMON_MODE=false
NON_INTERACTIVE=false

if [[ "$1" == "-d" ]] || [[ "$1" == "--daemon" ]]; then
    DAEMON_MODE=true
fi

# 检查是否为非交互模式（用于 systemd 等自动化部署）
if [ -n "$NON_INTERACTIVE_MODE" ] || [ ! -t 0 ]; then
    NON_INTERACTIVE=true
fi

echo "🚀 Starting Open Adventure..."
if [ "$DAEMON_MODE" = true ]; then
    echo "📌 Running in daemon mode (background)"
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

# 检查 backend 和 frontend 目录
if [ ! -d "backend" ]; then
    echo "❌ backend directory not found"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "❌ frontend directory not found"
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
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing Python dependencies..."
    # 优先使用 pyproject.toml
    if [ -f "pyproject.toml" ]; then
        pip install -q -e .
    elif [ -f "../requirements.txt" ]; then
        pip install -q -r ../requirements.txt
    else
        echo "❌ Neither pyproject.toml nor requirements.txt found"
        exit 1
    fi
    echo "✅ Python dependencies installed"
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

# 检查端口占用
echo "Checking port availability..."
resolve_port_conflict "backend" "BACKEND_PORT" "cleanup_backend"
resolve_port_conflict "frontend" "FRONTEND_PORT" "cleanup_frontend"

# 启动后端服务器（后台运行）
echo "Starting backend server on port $BACKEND_PORT..."

# 根据操作系统选择启动方式
if [ "$OS_TYPE" = "linux" ] && command -v setsid &> /dev/null; then
    # Linux: 使用 setsid 创建独立会话，避免终端关闭时进程被杀死
    setsid python -c "import uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=$BACKEND_PORT, reload=True, log_level='info')" > ../docs/logs/backend.log 2>&1 &
else
    # macOS 或不支持 setsid 的系统：直接后台运行
    python -c "import uvicorn; uvicorn.run('app.main:app', host='0.0.0.0', port=$BACKEND_PORT, reload=True, log_level='info')" > ../docs/logs/backend.log 2>&1 &
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

# ============ 前端设置 ============
cd "$SCRIPT_DIR/frontend"
echo ""
echo "📦 Setting up frontend..."

# 检查 npm 依赖健康状态
if ! npm ls --depth=0 >/dev/null 2>&1; then
    echo "Installing frontend dependencies..."
    npm install
    echo "✅ Frontend dependencies installed"
fi

# 清理旧的 .env.local（如果存在）
if [ -f ".env.local" ]; then
    echo "Removing old .env.local (frontend now auto-detects API address)..."
    rm -f .env.local
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

# 启动前端服务器
echo ""
echo "Starting frontend server..."

if [ "$DAEMON_MODE" = true ]; then
    # 后台模式：前端也在后台运行
    VITE_API_BASE_URL="http://localhost:${BACKEND_PORT}/api" npm run dev -- --port "$FRONTEND_PORT" > ../docs/logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

    # 等待前端启动（最多 10 秒）
    echo "Waiting for frontend to start..."
    for i in {1..20}; do
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ Frontend is ready (PID: $FRONTEND_PID)"
            break
        fi
        if [ $i -eq 20 ]; then
            echo "⚠️  Frontend may not have started properly, check docs/logs/frontend.log"
        fi
        sleep 0.5
    done

    echo ""
    echo "============================================"
    echo "✅ Open Adventure is running in background!"
    echo "============================================"
    echo ""
    echo "🌐 Local Access:"
    echo "   Frontend: http://localhost:${FRONTEND_PORT}"
    echo "   Backend API: http://localhost:${BACKEND_PORT}"
    echo "   API Docs: http://localhost:${BACKEND_PORT}/docs"
    if [ -n "$DISPLAY_IP" ]; then
        echo ""
        echo "🌍 Network Access:"
        echo "   Frontend: http://${DISPLAY_IP}:${FRONTEND_PORT}"
        echo "   Backend API: http://${DISPLAY_IP}:${BACKEND_PORT}"
    fi
    echo ""
    echo "📋 Process IDs:"
    echo "   Backend PID: $BACKEND_PID"
    echo "   Frontend PID: $FRONTEND_PID"
    echo ""
    echo "📝 Logs:"
    echo "   Backend: docs/logs/backend.log"
    echo "   Frontend: docs/logs/frontend.log"
    echo ""
    echo "🛑 To stop all servers, run: ./stop.sh"
    echo "============================================"
    echo ""
else
    # 前台模式：前端在前台运行
    echo ""
    echo "============================================"
    echo "✅ Open Adventure is running!"
    echo "============================================"
    echo ""
    echo "🌐 Local Access:"
    echo "   Frontend: http://localhost:${FRONTEND_PORT}"
    echo "   Backend API: http://localhost:${BACKEND_PORT}"
    echo "   API Docs: http://localhost:${BACKEND_PORT}/docs"
    if [ -n "$DISPLAY_IP" ]; then
        echo ""
        echo "🌍 Network Access:"
        echo "   Frontend: http://${DISPLAY_IP}:${FRONTEND_PORT}"
        echo "   Backend API: http://${DISPLAY_IP}:${BACKEND_PORT}"
    fi
    echo ""
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

        # 4. 额外保险：清理残留进程
        pkill -f "uvicorn app.main:app" 2>/dev/null || true
        pkill -f "python.*run\.py" 2>/dev/null || true
        pkill -f "vite.*$FRONTEND_PORT" 2>/dev/null || true

        # 5. 最后验证端口
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

    # 启动前端（前台运行）
    VITE_API_BASE_URL="http://localhost:${BACKEND_PORT}/api" npm run dev -- --port "$FRONTEND_PORT"

    # 当前端正常退出时，也停止后端
    cleanup
fi
