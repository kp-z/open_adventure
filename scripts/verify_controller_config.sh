#!/bin/bash

# Controller 配置管理功能验证脚本

echo "=========================================="
echo "Controller 配置管理功能验证"
echo "=========================================="
echo ""

# 检查文件是否存在
echo "1. 检查文件完整性..."
FILES=(
    "frontend/public/projects/controller/index.html"
    "frontend/public/projects/controller/styles.css"
    "frontend/public/projects/controller/config.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file 存在"
    else
        echo "   ✗ $file 不存在"
        exit 1
    fi
done
echo ""

# 检查 Setting 按钮
echo "2. 检查 Setting 按钮..."
if grep -q "setting-btn" frontend/public/projects/controller/index.html; then
    echo "   ✓ Setting 按钮已添加"
else
    echo "   ✗ Setting 按钮未找到"
    exit 1
fi
echo ""

# 检查 knob-5 是否已移除
echo "3. 检查 knob-5 是否已移除..."
if grep -q "knob-5" frontend/public/projects/controller/index.html frontend/public/projects/controller/config.js; then
    echo "   ✗ knob-5 仍然存在"
    exit 1
else
    echo "   ✓ knob-5 已移除"
fi
echo ""

# 检查 AVAILABLE_CONTROLLERS
echo "4. 检查 AVAILABLE_CONTROLLERS..."
CONTROLLER_COUNT=$(grep -A 30 "AVAILABLE_CONTROLLERS" frontend/public/projects/controller/config.js | grep -c "{ id:")
if [ "$CONTROLLER_COUNT" -eq 20 ]; then
    echo "   ✓ AVAILABLE_CONTROLLERS 包含 20 个控制器"
else
    echo "   ✗ AVAILABLE_CONTROLLERS 包含 $CONTROLLER_COUNT 个控制器（应为 20）"
    exit 1
fi
echo ""

# 检查配置管理弹窗
echo "5. 检查配置管理弹窗..."
if grep -q "config-manager-modal" frontend/public/projects/controller/index.html; then
    echo "   ✓ 配置管理弹窗已添加"
else
    echo "   ✗ 配置管理弹窗未找到"
    exit 1
fi
echo ""

# 检查 CSS 样式
echo "6. 检查 CSS 样式..."
REQUIRED_STYLES=(
    "config-manager-modal"
    "config-manager-content"
    "controller-preview"
    "config-list"
    "config-item"
)

for style in "${REQUIRED_STYLES[@]}"; do
    if grep -q "\.$style" frontend/public/projects/controller/styles.css; then
        echo "   ✓ .$style 样式已定义"
    else
        echo "   ✗ .$style 样式未找到"
        exit 1
    fi
done
echo ""

# 检查 JavaScript 函数
echo "7. 检查 JavaScript 函数..."
REQUIRED_FUNCTIONS=(
    "openConfigManager"
    "closeConfigManager"
    "renderControllerPreview"
    "renderConfigList"
)

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    if grep -q "function $func" frontend/public/projects/controller/config.js; then
        echo "   ✓ $func() 函数已定义"
    else
        echo "   ✗ $func() 函数未找到"
        exit 1
    fi
done
echo ""

echo "=========================================="
echo "✓ 所有验证通过！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 在浏览器中打开 http://localhost:5173/projects/controller/"
echo "2. 点击右上角的 Setting 按钮"
echo "3. 验证配置管理弹窗是否正常显示"
echo "4. 测试添加、编辑、删除配置功能"
echo ""
