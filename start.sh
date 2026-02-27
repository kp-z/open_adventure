#!/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Starting Claude Manager..."
echo ""

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

# 启动后端服务器（后台运行）
echo "Starting backend server..."
python run.py > ../docs/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

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

# 启动前端服务器
echo ""
echo "Starting frontend server..."
echo ""
echo "============================================"
echo "✅ Claude Manager is running!"
echo "============================================"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "============================================"
echo ""

# 启动前端（前台运行）
npm run dev

# 当前端停止时，也停止后端
echo ""
echo "Stopping backend server..."
kill $BACKEND_PID 2>/dev/null
echo "✅ All servers stopped"
