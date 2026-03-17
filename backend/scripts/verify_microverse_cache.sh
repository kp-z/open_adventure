#!/bin/bash
# Microverse 缓存功能手动验证指南

echo "============================================================"
echo "Microverse 缓存功能验证指南"
echo "============================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}前置条件检查:${NC}"
echo "1. 检查前端服务是否运行..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 前端服务正在运行 (端口 5173)${NC}"
else
    echo -e "${YELLOW}⚠ 前端服务未运行，请先启动: cd frontend && npm run dev${NC}"
    exit 1
fi

echo "2. 检查后端服务是否运行..."
if lsof -i :38080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端服务正在运行 (端口 38080)${NC}"
else
    echo -e "${YELLOW}⚠ 后端服务未运行，请先启动: cd backend && source venv/bin/activate && uvicorn app.main:app --reload${NC}"
fi

echo ""
echo -e "${BLUE}验证步骤:${NC}"
echo ""
echo "步骤 1: 打开浏览器"
echo "  - 访问: http://localhost:5173"
echo "  - 打开开发者工具 (F12 或 Cmd+Option+I)"
echo "  - 切换到 Console 标签"
echo ""

echo "步骤 2: 首次进入游戏模式"
echo "  - 点击左上角的 'Open Adventure' logo"
echo "  - 观察控制台日志，应该看到:"
echo "    [Microverse] 组件挂载，gameHasLoaded = false"
echo "    [Microverse] isLoading 变化: true"
echo "    [Microverse] iframe 加载完成，等待游戏初始化"
echo "    [Microverse] 游戏加载完成，gameHasLoaded = true"
echo "    [Microverse] isLoading 变化: false"
echo ""

echo "步骤 3: 切换到 Network 标签"
echo "  - 在开发者工具中切换到 Network 标签"
echo "  - 观察网络请求，应该看到:"
echo "    - /microverse/index.html"
echo "    - .wasm 文件"
echo "    - .pck 文件"
echo "  - 记录这些请求的数量"
echo ""

echo "步骤 4: 切换到其他页面"
echo "  - 点击左侧导航栏的 'Dashboard' 或其他页面"
echo "  - 观察控制台日志，应该 **没有** 看到:"
echo "    [Microverse] 组件卸载"
echo "  - 如果看到卸载日志，说明缓存失败！"
echo ""

echo "步骤 5: 再次进入游戏模式"
echo "  - 再次点击左上角的 logo"
echo "  - 观察控制台日志，应该 **没有** 看到:"
echo "    [Microverse] 组件挂载"
echo "  - 应该看到:"
echo "    [Microverse] iframe 加载完成，游戏已缓存"
echo "  - 游戏应该立即显示，**没有** 加载动画"
echo ""

echo "步骤 6: 检查网络请求"
echo "  - 在 Network 标签中，应该 **没有** 看到新的游戏资源请求"
echo "  - 可能有 index.html 的 304 缓存请求，这是正常的"
echo "  - 如果看到 .wasm 或 .pck 的新请求，说明缓存失败！"
echo ""

echo -e "${BLUE}预期结果:${NC}"
echo -e "${GREEN}✓ 首次进入：游戏正常加载，有加载动画${NC}"
echo -e "${GREEN}✓ 切换页面：组件未卸载${NC}"
echo -e "${GREEN}✓ 再次进入：游戏立即显示，无加载动画${NC}"
echo -e "${GREEN}✓ 网络请求：无重复的游戏资源请求${NC}"
echo ""

echo -e "${BLUE}故障排查:${NC}"
echo "如果缓存未生效，请检查:"
echo "1. 浏览器控制台是否有错误信息"
echo "2. 是否看到 '组件卸载' 日志（说明组件被卸载了）"
echo "3. 是否看到重复的 '组件挂载' 日志（说明组件被重新创建了）"
echo "4. Network 标签是否有重复的游戏资源请求"
echo ""

echo "现在请按照上述步骤在浏览器中进行验证..."
echo ""

# 自动打开浏览器（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "正在打开浏览器..."
    open "http://localhost:5173"
fi
