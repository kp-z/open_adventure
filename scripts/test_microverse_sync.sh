#!/bin/bash

# Microverse 同步机制测试脚本

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🧪 Testing Microverse Sync Mechanism"
echo "===================================="
echo ""

# 测试 1: 检查脚本是否存在
echo "Test 1: Checking scripts..."
if [ -f "$SCRIPT_DIR/sync_microverse.sh" ]; then
    echo "✅ sync_microverse.sh exists"
else
    echo "❌ sync_microverse.sh not found"
    exit 1
fi

if [ -f "$SCRIPT_DIR/watch_microverse.sh" ]; then
    echo "✅ watch_microverse.sh exists"
else
    echo "❌ watch_microverse.sh not found"
    exit 1
fi

# 测试 2: 检查脚本是否可执行
echo ""
echo "Test 2: Checking execute permissions..."
if [ -x "$SCRIPT_DIR/sync_microverse.sh" ]; then
    echo "✅ sync_microverse.sh is executable"
else
    echo "❌ sync_microverse.sh is not executable"
    exit 1
fi

if [ -x "$SCRIPT_DIR/watch_microverse.sh" ]; then
    echo "✅ watch_microverse.sh is executable"
else
    echo "❌ watch_microverse.sh is not executable"
    exit 1
fi

# 测试 3: 检查源目录
echo ""
echo "Test 3: Checking source directory..."
if [ -d "$PROJECT_ROOT/microverse/export" ]; then
    echo "✅ microverse/export exists"

    if [ -f "$PROJECT_ROOT/microverse/export/index.html" ]; then
        echo "✅ index.html exists"
    else
        echo "⚠️  index.html not found (Godot not exported yet)"
    fi
else
    echo "⚠️  microverse/export not found (Godot not exported yet)"
fi

# 测试 4: 运行同步脚本
echo ""
echo "Test 4: Running sync script..."
if "$SCRIPT_DIR/sync_microverse.sh"; then
    echo "✅ Sync script executed successfully"
else
    echo "❌ Sync script failed"
    exit 1
fi

# 测试 5: 检查目标目录
echo ""
echo "Test 5: Checking target directories..."
if [ -d "$PROJECT_ROOT/frontend/public/microverse" ]; then
    echo "✅ frontend/public/microverse exists"

    if [ -f "$PROJECT_ROOT/frontend/public/microverse/version.json" ]; then
        echo "✅ version.json exists"

        # 验证 JSON 格式
        if python3 -m json.tool "$PROJECT_ROOT/frontend/public/microverse/version.json" > /dev/null 2>&1; then
            echo "✅ version.json is valid JSON"
        else
            echo "❌ version.json is invalid JSON"
            exit 1
        fi
    else
        echo "⚠️  version.json not found"
    fi
else
    echo "⚠️  frontend/public/microverse not found"
fi

if [ -d "$PROJECT_ROOT/frontend/dist/microverse" ]; then
    echo "✅ frontend/dist/microverse exists"
else
    echo "ℹ️  frontend/dist/microverse not found (frontend not built yet)"
fi

# 测试 6: 检查 start.sh 集成
echo ""
echo "Test 6: Checking start.sh integration..."
if grep -q "Microverse 文件同步" "$PROJECT_ROOT/start.sh"; then
    echo "✅ start.sh includes Microverse sync"
else
    echo "❌ start.sh does not include Microverse sync"
    exit 1
fi

# 测试 7: 检查监听工具
echo ""
echo "Test 7: Checking watch tools..."
if command -v fswatch &> /dev/null; then
    echo "✅ fswatch is installed"
elif command -v inotifywait &> /dev/null; then
    echo "✅ inotifywait is installed"
else
    echo "ℹ️  No watch tool installed (will use polling)"
fi

# 测试总结
echo ""
echo "===================================="
echo "✅ All tests passed!"
echo ""
echo "📝 Summary:"
echo "  - Sync script: ✅"
echo "  - Watch script: ✅"
echo "  - Source directory: $([ -d "$PROJECT_ROOT/microverse/export" ] && echo "✅" || echo "⚠️")"
echo "  - Target directory: $([ -d "$PROJECT_ROOT/frontend/public/microverse" ] && echo "✅" || echo "⚠️")"
echo "  - Version file: $([ -f "$PROJECT_ROOT/frontend/public/microverse/version.json" ] && echo "✅" || echo "⚠️")"
echo "  - start.sh integration: ✅"
echo ""
echo "🎉 Microverse sync mechanism is ready!"
