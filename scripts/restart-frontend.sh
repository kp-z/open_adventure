#!/bin/bash

# 清理并重启前端服务

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🔄 清理前端缓存..."
cd "$PROJECT_ROOT/frontend"

# 停止旧进程
pkill -f "npm run dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null

# 清理缓存
rm -rf .next
rm -rf node_modules/.cache

echo "✅ 缓存已清理"
echo ""
echo "🚀 启动前端服务..."
npm run dev

echo ""
echo "✅ 前端服务已启动在 http://localhost:3000"
echo "📝 请在浏览器中按 Ctrl+Shift+R 强制刷新页面"
