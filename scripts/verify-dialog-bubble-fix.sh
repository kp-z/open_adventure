#!/bin/bash

# 对话气泡修复验证脚本
# 用于快速验证对话气泡背景是否正确显示

set -e

echo "🔍 对话气泡修复验证脚本"
echo "================================"
echo ""

# 检查关键文件
echo "📋 检查关键文件..."
echo ""

# 1. 检查 Godot 源文件
if [ -f "microverse/asset/ui/dialog_bubble_bg.png" ]; then
    SIZE=$(ls -lh microverse/asset/ui/dialog_bubble_bg.png | awk '{print $5}')
    echo "✅ Godot 源文件存在: microverse/asset/ui/dialog_bubble_bg.png ($SIZE)"

    # 检查文件大小
    BYTES=$(stat -f%z microverse/asset/ui/dialog_bubble_bg.png 2>/dev/null || stat -c%s microverse/asset/ui/dialog_bubble_bg.png 2>/dev/null)
    if [ "$BYTES" -gt 1000 ]; then
        echo "   ✅ 文件大小正常 ($BYTES 字节)"
    else
        echo "   ⚠️  文件大小异常 ($BYTES 字节)，可能是空白文件"
    fi
else
    echo "❌ Godot 源文件不存在: microverse/asset/ui/dialog_bubble_bg.png"
    exit 1
fi

echo ""

# 2. 检查前端资源包
if [ -f "frontend/public/microverse/index.pck" ]; then
    SIZE=$(ls -lh frontend/public/microverse/index.pck | awk '{print $5}')
    MTIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" frontend/public/microverse/index.pck 2>/dev/null || stat -c "%y" frontend/public/microverse/index.pck 2>/dev/null | cut -d'.' -f1)
    echo "✅ 前端资源包存在: frontend/public/microverse/index.pck ($SIZE)"
    echo "   📅 最后修改时间: $MTIME"

    # 检查是否是最近修改的（5分钟内）
    if [ "$(uname)" = "Darwin" ]; then
        MTIME_EPOCH=$(stat -f "%m" frontend/public/microverse/index.pck)
    else
        MTIME_EPOCH=$(stat -c "%Y" frontend/public/microverse/index.pck)
    fi
    NOW_EPOCH=$(date +%s)
    DIFF=$((NOW_EPOCH - MTIME_EPOCH))

    if [ "$DIFF" -lt 300 ]; then
        echo "   ✅ 资源包是最近更新的（$DIFF 秒前）"
    else
        MINUTES=$((DIFF / 60))
        echo "   ⚠️  资源包更新时间较早（$MINUTES 分钟前），可能需要重新同步"
    fi
else
    echo "❌ 前端资源包不存在: frontend/public/microverse/index.pck"
    echo "   请运行以下命令同步资源："
    echo "   cd microverse && ./export.sh"
    echo "   rsync -av --delete microverse/export/ frontend/public/microverse/"
    exit 1
fi

echo ""

# 3. 检查前端服务
echo "🌐 检查前端服务..."
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "✅ 前端服务正在运行 (端口 5173)"
    echo "   🔗 访问地址: http://localhost:5173"
else
    echo "⚠️  前端服务未运行"
    echo "   请运行以下命令启动前端："
    echo "   cd frontend && npm run dev"
fi

echo ""
echo "================================"
echo "📝 验证步骤："
echo ""
echo "1. 打开浏览器访问: http://localhost:5173"
echo "2. 进入 Microverse 游戏页面"
echo "3. 按 Ctrl+Shift+R (macOS: Cmd+Shift+R) 强制刷新"
echo "4. 等待游戏加载完成"
echo "5. 选中一个角色（点击角色）"
echo "6. 按 Shift+Q 键触发对话气泡"
echo ""
echo "✅ 预期效果："
echo "   - 对话气泡应该有深灰色半透明背景"
echo "   - 浅灰色边框清晰可见"
echo "   - 白色文字清晰可读"
echo "   - 气泡定位在角色正上方"
echo ""
echo "📖 详细验证指南: docs/troubleshooting/dialog-bubble-fix-verification.md"
echo "📖 技术文档: docs/technical/20260318-02-对话气泡资源修复.md"
echo ""
