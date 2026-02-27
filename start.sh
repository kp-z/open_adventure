#!/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Starting Claude Manager..."
echo ""

# 检查 backend 目录
if [ ! -d "backend" ]; then
    echo "❌ backend directory not found"
    exit 1
fi

# 进入 backend 目录
cd backend

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# 激活虚拟环境
source venv/bin/activate

# 检查依赖
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    # 优先使用根目录的 requirements.txt
    if [ -f "../requirements.txt" ]; then
        pip install -r ../requirements.txt
    else
        echo "❌ requirements.txt not found"
        exit 1
    fi
    echo "✅ Dependencies installed"
fi

# 检查并创建 .env 文件
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
        echo "✅ .env file created"
        echo "⚠️  Please edit backend/.env and configure your settings"
        echo ""
    else
        echo "❌ .env.example not found"
        exit 1
    fi
fi

# 设置生产环境变量
export ENV=production

# 启动服务器
echo ""
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "📖 ReDoc: http://localhost:8000/redoc"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python run.py
