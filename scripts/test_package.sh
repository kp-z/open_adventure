#!/bin/bash
set -e

echo "======================================"
echo "Open Adventure - 打包测试脚本"
echo "======================================"

# 1. 检查可执行文件
if [ ! -f "backend/dist/open-adventure" ]; then
    echo "❌ 错误: backend/dist/open-adventure 不存在"
    echo "请先运行打包脚本: ./scripts/build_macos.sh"
    exit 1
fi

echo "✓ 可执行文件存在"

# 2. 创建测试目录
TEST_DIR="/tmp/open-adventure-test-$$"
mkdir -p "$TEST_DIR"
echo "✓ 创建测试目录: $TEST_DIR"

# 3. 复制可执行文件
cp backend/dist/open-adventure "$TEST_DIR/"
echo "✓ 复制可执行文件到测试目录"

# 4. 显示文件信息
echo ""
echo "📦 可执行文件信息:"
ls -lh "$TEST_DIR/open-adventure"
echo ""

# 5. 提示测试步骤
echo "======================================"
echo "测试步骤:"
echo "======================================"
echo ""
echo "1. 进入测试目录:"
echo "   cd $TEST_DIR"
echo ""
echo "2. 运行应用（会自动打开浏览器）:"
echo "   ./open-adventure"
echo ""
echo "3. 或者不自动打开浏览器:"
echo "   ./open-adventure --no-browser"
echo ""
echo "4. 验证以下内容:"
echo "   - 应用启动无错误"
echo "   - 浏览器自动打开 http://localhost:8000/dashboard"
echo "   - Dashboard 页面正常显示"
echo "   - 数据库创建在 ~/.open_adventure/"
echo ""
echo "5. 测试完成后清理:"
echo "   rm -rf $TEST_DIR"
echo "   rm -rf ~/.open_adventure  # 如果需要清理测试数据"
echo ""
echo "======================================"
