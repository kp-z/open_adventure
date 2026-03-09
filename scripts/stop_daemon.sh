#!/bin/bash
# Open Adventure - 停止后台服务脚本

set -e

PID_FILE="$HOME/.open_adventure/open_adventure.pid"
LOG_FILE="$HOME/.open_adventure/open_adventure.log"

echo "🛑 停止 Open Adventure 后台服务..."

# 检查 PID 文件是否存在
if [ ! -f "$PID_FILE" ]; then
    echo "❌ 未找到 PID 文件: $PID_FILE"
    echo "服务可能未在后台运行"
    exit 1
fi

# 读取 PID
PID=$(cat "$PID_FILE")

# 检查进程是否存在
if ! kill -0 "$PID" 2>/dev/null; then
    echo "⚠️  进程 $PID 不存在，可能已停止"
    rm -f "$PID_FILE"
    exit 0
fi

# 停止进程
echo "正在停止进程 (PID: $PID)..."
kill "$PID"

# 等待进程退出（最多 10 秒）
for i in {1..20}; do
    if ! kill -0 "$PID" 2>/dev/null; then
        echo "✅ 服务已停止"
        rm -f "$PID_FILE"
        exit 0
    fi
    sleep 0.5
done

# 如果进程仍未退出，强制停止
echo "⚠️  进程未正常退出，强制停止..."
kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "✅ 服务已强制停止"
