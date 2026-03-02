#!/bin/bash

# 严格模式：遇到错误立即退出
set -e

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 创建 PID 文件目录
PID_DIR="$SCRIPT_DIR/.run"
mkdir -p "$PID_DIR"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# 检查是否为后台运行模式
DAEMON_MODE=false
if [[ "$1" == "-d" ]] || [[ "$1" == "--daemon" ]]; then
    DAEMON_MODE=true
fi

echo "🚀 Starting Claude Manager..."
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
    if [ -f "../requirements.txt" ]; then
        pip install -q -r ../requirements.txt
    else
        echo "❌ requirements.txt not found"
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

# 检查端口占用
echo "Checking port availability..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8000 is already in use"
    echo "This might be an old version of Claude Manager still running."
    echo ""
    echo "Do you want to stop the existing process? [y/N]"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "Stopping existing backend processes..."
        # 强制清理所有占用端口 8000 的进程
        lsof -ti :8000 | xargs kill -9 2>/dev/null || true
        sleep 2

        # 验证端口是否已释放
        if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo "❌ Failed to release port 8000"
            echo "Please manually stop the processes and try again"
            exit 1
        fi
        echo "✅ Port 8000 released"
    else
        echo "❌ Cannot start: Port 8000 is occupied"
        echo "Please stop the existing service manually or choose 'y' to stop it automatically"
        exit 1
    fi
fi

# 启动后端服务器（后台运行）
echo "Starting backend server..."
# macOS 不支持 setsid，直接使用后台运行
python run.py > ../docs/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
echo "✅ Backend started (PID: $BACKEND_PID)"

# 等待后端启动（最多 10 秒）
echo "Waiting for backend to start..."
for i in {1..20}; do
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "⚠️  Backend may not have started properly, check logs/backend.log"
    fi
    sleep 0.5
done

# ============ 前端设置 ============
cd "$SCRIPT_DIR/frontend"
echo ""
echo "📦 Setting up frontend..."

# 检查 node_modules
if [ ! -d "node_modules" ]; then
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
    echo "   Frontend will auto-detect API address"
else
    echo "✅ Network access configured"
    echo "   Frontend will auto-detect API address"
fi

# 启动前端服务器
echo ""
echo "Starting frontend server..."

if [ "$DAEMON_MODE" = true ]; then
    # 后台模式：前端也在后台运行
    npm run dev > ../docs/logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

    # 等待前端启动（最多 10 秒）
    echo "Waiting for frontend to start..."
    for i in {1..20}; do
        if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
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
    echo "✅ Claude Manager is running in background!"
    echo "============================================"
    echo ""
    echo "🌐 Local Access:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    if [ -n "$DISPLAY_IP" ]; then
        echo ""
        echo "🌍 Network Access:"
        echo "   Frontend: http://${DISPLAY_IP}:5173"
        echo "   Backend API: http://${DISPLAY_IP}:8000"
        echo "   (Frontend auto-detects API address)"
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
    echo "✅ Claude Manager is running!"
    echo "============================================"
    echo ""
    echo "🌐 Local Access:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    if [ -n "$DISPLAY_IP" ]; then
        echo ""
        echo "🌍 Network Access:"
        echo "   Frontend: http://${DISPLAY_IP}:5173"
        echo "   Backend API: http://${DISPLAY_IP}:8000"
        echo "   (Frontend auto-detects API address)"
    fi
    echo ""
    echo "Press Ctrl+C to stop all servers"
    echo "============================================"
    echo ""

    # 设置退出信号处理
    cleanup() {
        echo ""
        echo "🛑 Shutting down servers..."

        # 1. 优先使用 PID 文件中的 PID
        if [ -f "$BACKEND_PID_FILE" ]; then
            SAVED_PID=$(cat "$BACKEND_PID_FILE")
            if [ -n "$SAVED_PID" ] && kill -0 "$SAVED_PID" 2>/dev/null; then
                echo "Stopping backend (PID: $SAVED_PID)..."
                # 使用进程组 kill，确保子进程也被停止
                kill -- -"$SAVED_PID" 2>/dev/null || kill "$SAVED_PID" 2>/dev/null
                # 等待进程退出（最多 5 秒）
                for i in {1..10}; do
                    if ! kill -0 "$SAVED_PID" 2>/dev/null; then
                        break
                    fi
                    sleep 0.5
                done
            fi
            rm -f "$BACKEND_PID_FILE"
        fi

        # 2. 如果 BACKEND_PID 变量存在，也尝试清理
        if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
            kill -- -"$BACKEND_PID" 2>/dev/null || kill "$BACKEND_PID" 2>/dev/null
            wait "$BACKEND_PID" 2>/dev/null
        fi

        # 3. 额外保险：强制清理可能残留的进程
        pkill -f "uvicorn app.main:app" 2>/dev/null || true
        pkill -f "python.*run\.py" 2>/dev/null || true

        # 4. 最后验证端口是否释放
        if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "⚠️  Warning: Port 8000 still occupied, forcing cleanup..."
            lsof -ti :8000 | xargs kill -9 2>/dev/null || true
        fi

        echo "✅ All servers stopped"
        exit 0
    }

    # 捕获 Ctrl+C (SIGINT) 和 SIGTERM
    trap cleanup SIGINT SIGTERM

    # 启动前端（前台运行）
    npm run dev

    # 当前端正常退出时，也停止后端
    cleanup
fi
