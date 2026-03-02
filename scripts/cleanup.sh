#!/bin/bash

# Claude Manager 进程清理脚本
# 用于清理所有残留的后端和前端进程

echo "🧹 Cleaning up Claude Manager processes..."

# 清理后端进程
echo "Stopping backend processes..."
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "  ✅ Stopped uvicorn processes" || echo "  ℹ️  No uvicorn processes found"
pkill -f "python.*run\.py" 2>/dev/null && echo "  ✅ Stopped python run.py processes" || echo "  ℹ️  No python run.py processes found"

# 清理前端进程
echo "Stopping frontend processes..."
pkill -f "vite.*claude_manager" 2>/dev/null && echo "  ✅ Stopped vite processes" || echo "  ℹ️  No vite processes found"

# 清理占用端口 8000 的所有进程
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Cleaning up port 8000..."
    lsof -ti :8000 | xargs kill -9 2>/dev/null
    sleep 1
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  ⚠️  Warning: Port 8000 still occupied"
    else
        echo "  ✅ Port 8000 released"
    fi
else
    echo "  ℹ️  Port 8000 is free"
fi

# 清理占用端口 5173 的所有进程
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Cleaning up port 5173..."
    lsof -ti :5173 | xargs kill -9 2>/dev/null
    sleep 1
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  ⚠️  Warning: Port 5173 still occupied"
    else
        echo "  ✅ Port 5173 released"
    fi
else
    echo "  ℹ️  Port 5173 is free"
fi

# 清理 PID 文件
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$SCRIPT_DIR/../.run"
if [ -d "$PID_DIR" ]; then
    echo "Cleaning up PID files..."
    rm -f "$PID_DIR"/*.pid
    echo "  ✅ PID files cleaned"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "You can now run ./start.sh to start Claude Manager"
