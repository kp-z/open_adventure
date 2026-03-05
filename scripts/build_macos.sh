#!/bin/bash
set -e

echo "======================================"
echo "Open Adventure - macOS 打包脚本"
echo "======================================"

# 1. 检查前端构建产物
if [ ! -d "frontend/dist" ]; then
    echo "❌ 错误: frontend/dist 不存在"
    echo "请先运行: cd frontend && npm run build:prod"
    exit 1
fi

echo "✓ 前端构建产物存在"

# 2. 检查后端数据库
if [ ! -f "backend/open_adventure.db" ]; then
    echo "❌ 错误: backend/open_adventure.db 不存在"
    exit 1
fi

echo "✓ 数据库模板存在"

# 3. 进入后端目录
cd backend

# 4. 激活虚拟环境并安装打包依赖
echo ""
if [ ! -d "venv" ]; then
    echo "❌ 错误: 虚拟环境不存在"
    echo "请先创建虚拟环境: python -m venv venv"
    exit 1
fi

echo "📦 激活虚拟环境并安装 PyInstaller..."
source venv/bin/activate
pip install pyinstaller

# 5. 清理旧的构建产物
echo ""
echo "🧹 清理旧的构建产物..."
rm -rf build/ dist/

# 6. 执行打包
echo ""
echo "🔨 开始打包..."
pyinstaller --distpath ../dist --workpath build open_adventure.spec

# 7. 验证输出
echo ""
if [ -d "../dist/open-adventure" ] && [ -f "../dist/open-adventure/open-adventure" ]; then
    echo "✅ 打包成功!"
    echo ""
    echo "📦 打包目录信息:"
    du -sh ../dist/open-adventure
    echo ""
    echo "======================================"
    echo "使用方法:"
    echo "  ./dist/open-adventure/open-adventure"
    echo "  ./dist/open-adventure/open-adventure --port 9000"
    echo "  ./dist/open-adventure/open-adventure --no-browser"
    echo ""
    echo "测试方法:"
    echo "  1. 复制整个目录: cp -r dist/open-adventure ~/Desktop/"
    echo "  2. 运行测试: ~/Desktop/open-adventure/open-adventure"
    echo "======================================"
else
    echo "❌ 打包失败"
    exit 1
fi
