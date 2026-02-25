#!/bin/bash
set -e

echo "======================================"
echo "Claude Manager - Linux 打包脚本"
echo "======================================"

# 1. 检查前端构建产物
if [ ! -d "frontend/dist" ]; then
    echo "❌ 错误: frontend/dist 不存在"
    echo "请先运行: cd frontend && npm run build:prod"
    exit 1
fi

echo "✓ 前端构建产物存在"

# 2. 检查后端数据库
if [ ! -f "backend/claude_manager.db" ]; then
    echo "❌ 错误: backend/claude_manager.db 不存在"
    exit 1
fi

echo "✓ 数据库模板存在"

# 3. 进入后端目录
cd backend

# 4. 安装打包依赖
echo ""
echo "📦 安装 PyInstaller..."
pip install pyinstaller

# 5. 清理旧的构建产物
echo ""
echo "🧹 清理旧的构建产物..."
rm -rf build/ dist/

# 6. 执行打包
echo ""
echo "🔨 开始打包..."
pyinstaller claude_manager.spec

# 7. 验证输出
echo ""
if [ -f "dist/claude-manager" ]; then
    echo "✅ 打包成功!"
    echo ""
    echo "📦 可执行文件信息:"
    ls -lh dist/claude-manager
    echo ""
    echo "======================================"
    echo "使用方法:"
    echo "  ./backend/dist/claude-manager"
    echo "  ./backend/dist/claude-manager --port 9000"
    echo "======================================"
else
    echo "❌ 打包失败"
    exit 1
fi
