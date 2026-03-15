#!/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# PID 文件目录
PID_DIR="$SCRIPT_DIR/.run"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
MICROVERSE_PID_FILE="$PID_DIR/microverse.pid"
CADDY_PID_FILE="$PID_DIR/caddy.pid"

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

# 停止 Microverse
if [ -f "$MICROVERSE_PID_FILE" ]; then
    MICROVERSE_PID=$(cat "$MICROVERSE_PID_FILE")
    if [ -n "$MICROVERSE_PID" ] && kill -0 "$MICROVERSE_PID" 2>/dev/null; then
        echo "Stopping Microverse (PID: $MICROVERSE_PID)..."
        kill "$MICROVERSE_PID" 2>/dev/null || true

        # 等待进程退出（最多 5 秒）
        for i in {1..10}; do
            if ! kill -0 "$MICROVERSE_PID" 2>/dev/null; then
                echo "✅ Microverse stopped"
                STOPPED_ANY=true
                break
            fi
            sleep 0.5
        done

        # 如果还没停止，强制 kill
        if kill -0 "$MICROVERSE_PID" 2>/dev/null; then
            echo "⚠️  Microverse didn't stop gracefully, forcing..."
            kill -9 "$MICROVERSE_PID" 2>/dev/null || true
            echo "✅ Microverse force stopped"
            STOPPED_ANY=true
        fi
    else
        echo "⚠️  Microverse PID file exists but process is not running"
    fi
    rm -f "$MICROVERSE_PID_FILE"
else
    echo "ℹ️  No Microverse PID file found"
fi

# 停止 Caddy
if [ -f "$CADDY_PID_FILE" ]; then
    CADDY_PID=$(cat "$CADDY_PID_FILE")
    if [ -n "$CADDY_PID" ] && kill -0 "$CADDY_PID" 2>/dev/null; then
        echo "Stopping Caddy (PID: $CADDY_PID)..."
        kill "$CADDY_PID" 2>/dev/null || true

        # 等待进程退出（最多 5 秒）
        for i in {1..10}; do
            if ! kill -0 "$CADDY_PID" 2>/dev/null; then
                echo "✅ Caddy stopped"
                STOPPED_ANY=true
                break
            fi
            sleep 0.5
        done

        # 如果还没停止，强制 kill
        if kill -0 "$CADDY_PID" 2>/dev/null; then
            echo "⚠️  Caddy didn't stop gracefully, forcing..."
            kill -9 "$CADDY_PID" 2>/dev/null || true
            echo "✅ Caddy force stopped"
            STOPPED_ANY=true
        fi
    else
        echo "⚠️  Caddy PID file exists but process is not running"
    fi
    rm -f "$CADDY_PID_FILE"
else
    echo "ℹ️  No Caddy PID file found"
fi

# 使用 caddy stop 命令确保完全停止
if command -v caddy &> /dev/null; then
    caddy stop 2>/dev/null && echo "✅ Caddy stopped via command" || true
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

# 检查并清理 Microverse 进程
if pgrep -f "python3 -m http.server 5174" > /dev/null 2>&1; then
    echo "Found remaining Microverse processes, cleaning up..."
    pkill -f "python3 -m http.server 5174" 2>/dev/null || true
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

if lsof -Pi :5174 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 5174 still occupied, forcing cleanup..."
    lsof -ti :5174 | xargs kill -9 2>/dev/null || true
    STOPPED_ANY=true
fi

if lsof -Pi :8443 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 8443 (Caddy) still occupied, forcing cleanup..."
    lsof -ti :8443 | xargs kill -9 2>/dev/null || true
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
