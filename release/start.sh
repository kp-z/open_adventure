#!/bin/bash

# Claude Manager 启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/claude-manager"

echo "🚀 启动 Claude Manager..."
echo "📍 应用目录: $APP_DIR"

# 检查应用是否存在
if [ ! -f "$APP_DIR/claude-manager" ]; then
    echo "❌ 错误: 找不到 claude-manager 可执行文件"
    exit 1
fi

# 启动应用
cd "$APP_DIR"
./claude-manager

