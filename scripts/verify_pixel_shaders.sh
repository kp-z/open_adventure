#!/bin/bash

# 像素 Shader 项目验证脚本
# 用于验证所有文件是否正确创建

echo "======================================"
echo "  像素 Shader 开发任务验证"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 验证函数
verify_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (缺失)"
        return 1
    fi
}

# 计数器
total=0
passed=0

echo "1. 验证 Shader 文件"
echo "-----------------------------------"
files=(
    "microverse/shaders/pixel_postprocess.gdshader"
    "microverse/shaders/CRTShader_optimized.gdshader"
    "microverse/shaders/pixel_perfect.gdshader"
)
for file in "${files[@]}"; do
    total=$((total + 1))
    if verify_file "$file"; then
        passed=$((passed + 1))
    fi
done
echo ""

echo "2. 验证材质预设文件"
echo "-----------------------------------"
files=(
    "microverse/shaders/pixel_postprocess.tres"
    "microverse/shaders/crt_shader.tres"
    "microverse/shaders/pixel_perfect.tres"
)
for file in "${files[@]}"; do
    total=$((total + 1))
    if verify_file "$file"; then
        passed=$((passed + 1))
    fi
done
echo ""

echo "3. 验证测试场景和脚本"
echo "-----------------------------------"
files=(
    "microverse/scene/pixel_shader_test.tscn"
    "microverse/scene/pixel_shader_test.gd"
    "microverse/scene/shader_performance_test.gd"
    "microverse/scene/pixel_shader_example.gd"
)
for file in "${files[@]}"; do
    total=$((total + 1))
    if verify_file "$file"; then
        passed=$((passed + 1))
    fi
done
echo ""

echo "4. 验证文档文件"
echo "-----------------------------------"
files=(
    "docs/pixel-shader-guide.md"
    "docs/pixel-shader-quickref.md"
    "docs/pixel-shader-performance.md"
    "docs/pixel-shader-completion-report.md"
    "docs/pixel-shader-index.md"
    "microverse/shaders/README.md"
)
for file in "${files[@]}"; do
    total=$((total + 1))
    if verify_file "$file"; then
        passed=$((passed + 1))
    fi
done
echo ""

echo "======================================"
echo "  验证结果"
echo "======================================"
echo "总文件数: $total"
echo "通过验证: $passed"
echo "失败: $((total - passed))"
echo ""

if [ $passed -eq $total ]; then
    echo -e "${GREEN}✅ 所有文件验证通过！${NC}"
    echo ""
    echo "快速开始:"
    echo "  1. 查看快速参考: docs/pixel-shader-quickref.md"
    echo "  2. 运行测试场景: microverse/scene/pixel_shader_test.tscn"
    echo "  3. 阅读完整指南: docs/pixel-shader-guide.md"
    exit 0
else
    echo -e "${RED}❌ 部分文件缺失，请检查！${NC}"
    exit 1
fi
