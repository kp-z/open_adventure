#!/bin/bash

# Controller 功能验证脚本
# 用于快速验证 Controller 页面是否正常工作

echo "🎛️  Controller 功能验证脚本"
echo "================================"
echo ""

# 检查文件是否存在
echo "📁 检查文件..."
files=(
    "frontend/public/projects/controller/index.html"
    "frontend/public/projects/controller/config.js"
    "frontend/public/projects/controller/styles.css"
    "frontend/public/projects/controller/default-config.json"
    "frontend/public/projects/controller/README.md"
    "frontend/public/projects/controller/GUIDE.md"
    "frontend/public/projects/controller/TEST.md"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
        all_exist=false
    fi
done

echo ""

if [ "$all_exist" = false ]; then
    echo "❌ 部分文件缺失，请检查项目结构"
    exit 1
fi

echo "✅ 所有文件存在"
echo ""

# 检查前端服务是否运行
echo "🔍 检查前端服务..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "  ✅ 前端服务正在运行 (http://localhost:5173)"
else
    echo "  ⚠️  前端服务未运行"
    echo "  请运行: cd frontend && npm run dev"
    echo ""
    read -p "是否现在启动前端服务？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "启动前端服务..."
        cd frontend && npm run dev &
        sleep 3
    else
        echo "跳过启动前端服务"
    fi
fi

echo ""

# 检查 Controller 页面是否可访问
echo "🌐 检查 Controller 页面..."
if curl -s http://localhost:5173/projects/controller/ > /dev/null 2>&1; then
    echo "  ✅ Controller 页面可访问"
    echo "  URL: http://localhost:5173/projects/controller/"
else
    echo "  ❌ Controller 页面无法访问"
    echo "  请确保前端服务正在运行"
    exit 1
fi

echo ""

# 检查 JavaScript 文件是否可访问
echo "📜 检查 JavaScript 文件..."
if curl -s http://localhost:5173/projects/controller/config.js > /dev/null 2>&1; then
    echo "  ✅ config.js 可访问"
else
    echo "  ❌ config.js 无法访问"
fi

echo ""

# 检查 CSS 文件是否可访问
echo "🎨 检查 CSS 文件..."
if curl -s http://localhost:5173/projects/controller/styles.css > /dev/null 2>&1; then
    echo "  ✅ styles.css 可访问"
else
    echo "  ❌ styles.css 无法访问"
fi

echo ""

# 显示测试指南
echo "📋 测试指南"
echo "================================"
echo ""
echo "1. 打开浏览器访问："
echo "   http://localhost:5173/projects/controller/"
echo ""
echo "2. 右键点击任意按钮（如 'rec'）"
echo "   - 应该打开配置对话框"
echo ""
echo "3. 填写配置："
echo "   - 名称: 启动后端"
echo "   - 描述: 启动 FastAPI 后端服务"
echo "   - 命令: cd ~/项目/Proj/open_adventure/backend && ./start.sh"
echo "   - 启用: 勾选"
echo ""
echo "4. 点击'保存'按钮"
echo "   - 应该显示 Toast 提示'配置已保存'"
echo "   - 按钮应该显示绿色边框"
echo "   - 按钮下方应该显示'启动后端'标签"
echo ""
echo "5. 左键点击已配置的按钮"
echo "   - 应该显示 Toast 提示'已复制: 启动后端'"
echo "   - 打开终端粘贴（Cmd+V / Ctrl+V）"
echo "   - 确认命令正确"
echo ""
echo "6. 刷新页面（F5）"
echo "   - 配置应该保留"
echo "   - 绿色边框和标签应该仍然显示"
echo ""
echo "详细测试清单请查看: frontend/public/projects/controller/TEST.md"
echo ""

# 询问是否打开浏览器
read -p "是否在浏览器中打开 Controller 页面？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "打开浏览器..."
    if command -v open > /dev/null 2>&1; then
        # macOS
        open http://localhost:5173/projects/controller/
    elif command -v xdg-open > /dev/null 2>&1; then
        # Linux
        xdg-open http://localhost:5173/projects/controller/
    else
        echo "无法自动打开浏览器，请手动访问："
        echo "http://localhost:5173/projects/controller/"
    fi
fi

echo ""
echo "✅ 验证完成！"
echo ""
echo "如有问题，请查看："
echo "  - README: frontend/public/projects/controller/README.md"
echo "  - 使用指南: frontend/public/projects/controller/GUIDE.md"
echo "  - 测试清单: frontend/public/projects/controller/TEST.md"
echo "  - 实施总结: docs/technical/20260319-17-Controller页面功能实施总结.md"
