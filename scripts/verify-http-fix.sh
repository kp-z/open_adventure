#!/bin/bash

# HTTP 请求并发问题修复验证脚本

set -e

echo "🔍 HTTP 请求并发问题修复验证"
echo "================================"
echo ""

# 检查关键文件
echo "📋 检查修复的文件..."
echo ""

# 1. 检查 MicroverseAPIClient.gd
if [ -f "microverse/script/api/MicroverseAPIClient.gd" ]; then
    echo "✅ MicroverseAPIClient.gd 存在"

    # 检查是否包含请求池代码
    if grep -q "http_request_pool" microverse/script/api/MicroverseAPIClient.gd; then
        echo "   ✅ 包含 HTTP 请求池代码"
    else
        echo "   ❌ 缺少 HTTP 请求池代码"
        exit 1
    fi

    if grep -q "max_concurrent_requests" microverse/script/api/MicroverseAPIClient.gd; then
        echo "   ✅ 包含并发请求限制配置"
    else
        echo "   ❌ 缺少并发请求限制配置"
        exit 1
    fi

    if grep -q "_get_available_http_request" microverse/script/api/MicroverseAPIClient.gd; then
        echo "   ✅ 包含获取可用请求节点的方法"
    else
        echo "   ❌ 缺少获取可用请求节点的方法"
        exit 1
    fi
else
    echo "❌ MicroverseAPIClient.gd 不存在"
    exit 1
fi

echo ""

# 2. 检查 AgentBindingPanel.gd
if [ -f "microverse/script/ui/AgentBindingPanel.gd" ]; then
    echo "✅ AgentBindingPanel.gd 存在"

    # 检查是否使用了 has_meta
    if grep -q "has_meta" microverse/script/ui/AgentBindingPanel.gd; then
        echo "   ✅ 使用了 has_meta 检查"
    else
        echo "   ❌ 缺少 has_meta 检查"
        exit 1
    fi

    # 检查是否还有不安全的 get_meta 调用
    if grep -q 'get_meta.*,.*null' microverse/script/ui/AgentBindingPanel.gd; then
        echo "   ⚠️  仍然存在不安全的 get_meta 调用"
    else
        echo "   ✅ 没有不安全的 get_meta 调用"
    fi
else
    echo "❌ AgentBindingPanel.gd 不存在"
    exit 1
fi

echo ""

# 3. 检查前端资源包
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
    echo "❌ 前端资源包不存在"
    exit 1
fi

echo ""

# 4. 检查前端服务
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

# 5. 检查后端服务
echo "🔧 检查后端服务..."
if lsof -ti:38080 > /dev/null 2>&1; then
    echo "✅ 后端服务正在运行 (端口 38080)"
else
    echo "⚠️  后端服务未运行"
    echo "   请运行以下命令启动后端："
    echo "   ./start.sh"
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
echo "6. 按 Shift+S 打开 Agent 绑定面板"
echo "7. 检查控制台是否还有 HTTP 请求错误"
echo ""
echo "✅ 预期效果："
echo "   - 不再出现 'HTTPRequest is processing a request' 错误"
echo "   - 不再出现 'The object does not have any meta values' 错误"
echo "   - Agent 列表能正常加载"
echo "   - 任务列表能正常加载"
echo "   - Agent 绑定功能正常工作"
echo ""
echo "📖 详细技术文档: docs/technical/20260318-04-HTTP请求并发问题修复.md"
echo ""
