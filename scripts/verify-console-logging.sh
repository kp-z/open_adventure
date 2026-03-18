#!/bin/bash

# Console 日志监控功能验证脚本

echo "=========================================="
echo "Console 日志监控功能验证"
echo "=========================================="
echo ""

# 1. 检查后端文件
echo "1. 检查后端文件..."
if [ -f "backend/app/api/routers/logs.py" ]; then
    echo "✓ backend/app/api/routers/logs.py 存在"
else
    echo "✗ backend/app/api/routers/logs.py 不存在"
    exit 1
fi

# 2. 检查前端文件
echo ""
echo "2. 检查前端文件..."
if [ -f "frontend/src/lib/console-logger.ts" ]; then
    echo "✓ frontend/src/lib/console-logger.ts 存在"
else
    echo "✗ frontend/src/lib/console-logger.ts 不存在"
    exit 1
fi

# 3. 检查日志目录
echo ""
echo "3. 检查日志目录..."
if [ -d "docs/logs/console" ]; then
    echo "✓ docs/logs/console/ 目录存在"
else
    echo "✗ docs/logs/console/ 目录不存在"
    exit 1
fi

# 4. 检查文档
echo ""
echo "4. 检查文档..."
if [ -f "docs/guides/console-logging-guide.md" ]; then
    echo "✓ docs/guides/console-logging-guide.md 存在"
else
    echo "✗ docs/guides/console-logging-guide.md 不存在"
    exit 1
fi

# 5. 检查后端路由注册
echo ""
echo "5. 检查后端路由注册..."
if grep -q "from app.api.routers import.*logs" backend/app/main.py; then
    echo "✓ logs 路由已导入"
else
    echo "✗ logs 路由未导入"
    exit 1
fi

if grep -q "app.include_router(logs.router)" backend/app/main.py; then
    echo "✓ logs 路由已注册"
else
    echo "✗ logs 路由未注册"
    exit 1
fi

# 6. 检查前端初始化
echo ""
echo "6. 检查前端初始化..."
if grep -q "consoleLogger" frontend/src/main.tsx; then
    echo "✓ consoleLogger 已初始化"
else
    echo "✗ consoleLogger 未初始化"
    exit 1
fi

# 7. 检查 Microverse 日志转发
echo ""
echo "7. 检查 Microverse 日志转发..."
if grep -q "godot-log" frontend/src/app/pages/Microverse.tsx; then
    echo "✓ Microverse 日志转发已添加"
else
    echo "✗ Microverse 日志转发未添加"
    exit 1
fi

# 8. 检查测试页面更新
echo ""
echo "8. 检查测试页面更新..."
if grep -q "log-stream" frontend/public/testing.html; then
    echo "✓ 测试页面日志面板已添加"
else
    echo "✗ 测试页面日志面板未添加"
    exit 1
fi

if grep -q "startLogging" frontend/public/testing.html; then
    echo "✓ 测试页面日志功能已添加"
else
    echo "✗ 测试页面日志功能未添加"
    exit 1
fi

# 9. 验证 Python 导入
echo ""
echo "9. 验证 Python 导入..."
cd backend
if python -c "from app.api.routers import logs; print('✓ logs 路由导入成功')" 2>/dev/null; then
    :
else
    echo "✗ logs 路由导入失败"
    cd ..
    exit 1
fi
cd ..

# 10. 验证前端构建
echo ""
echo "10. 验证前端构建..."
if [ -f "frontend/dist/index.html" ]; then
    echo "✓ 前端已构建"
else
    echo "⚠ 前端未构建，跳过验证"
fi

echo ""
echo "=========================================="
echo "✓ 所有验证通过！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 启动服务: ./start.sh"
echo "2. 打开测试页面（点击左下角紫色烧杯图标）"
echo "3. 点击'开始监控'按钮"
echo "4. 在主应用中触发一些操作"
echo "5. 查看实时日志流"
echo ""
