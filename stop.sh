#!/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# PID 文件目录
PID_DIR="$SCRIPT_DIR/.run"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

echo "🛑 Stopping Open Adventure..."
echo ""

STOPPED_ANY=false

# 停止后端
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true

        # 等待进程退出（最多 5 秒）
        for i in {1..10}; do
            if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
                echo "✅ Backend stopped"
                STOPPED_ANY=true
                break
            fi
            sleep 0.5
        done

        # 如果还没停止，强制 kill
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            echo "⚠️  Backend didn't stop gracefully, forcing..."
            kill -9 "$BACKEND_PID" 2>/dev/null || true
            echo "✅ Backend force stopped"
            STOPPED_ANY=true
        fi
    else
        echo "⚠️  Backend PID file exists but process is not running"
    fi
    rm -f "$BACKEND_PID_FILE"
else
    echo "ℹ️  No backend PID file found"
fi

# 停止前端
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true

        # 等待进程退出（最多 5 秒）
        for i in {1..10}; do
            if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
                echo "✅ Frontend stopped"
                STOPPED_ANY=true
                break
            fi
            sleep 0.5
        done

        # 如果还没停止，强制 kill
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            echo "⚠️  Frontend didn't stop gracefully, forcing..."
            kill -9 "$FRONTEND_PID" 2>/dev/null || true
            echo "✅ Frontend force stopped"
            STOPPED_ANY=true
        fi
    else
        echo "⚠️  Frontend PID file exists but process is not running"
    fi
    rm -f "$FRONTEND_PID_FILE"
else
    echo "ℹ️  No frontend PID file found"
fi

# 额外保险：清理可能残留的进程
echo ""
echo "Checking for any remaining processes..."

# 检查并清理后端进程
if pgrep -f "uvicorn app.main:app" > /dev/null 2>&1; then
    echo "Found remaining backend processes, cleaning up..."
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    STOPPED_ANY=true
fi

if pgrep -f "python.*run\.py" > /dev/null 2>&1; then
    echo "Found remaining Python processes, cleaning up..."
    pkill -f "python.*run\.py" 2>/dev/null || true
    STOPPED_ANY=true
fi

# 检查并清理前端进程
if pgrep -f "vite.*--port 5173" > /dev/null 2>&1; then
    echo "Found remaining frontend processes, cleaning up..."
    pkill -f "vite.*--port 5173" 2>/dev/null || true
    STOPPED_ANY=true
fi

# 验证端口是否释放
echo ""
echo "Verifying ports are released..."

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 8000 still occupied, forcing cleanup..."
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    STOPPED_ANY=true
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 5173 still occupied, forcing cleanup..."
    lsof -ti :5173 | xargs kill -9 2>/dev/null || true
    STOPPED_ANY=true
fi

echo ""
if [ "$STOPPED_ANY" = true ]; then
    echo "============================================"
    echo "✅ All Open Adventure processes stopped"
    echo "============================================"
else
    echo "============================================"
    echo "ℹ️  No running Open Adventure processes found"
    echo "============================================"
fi
echo ""
