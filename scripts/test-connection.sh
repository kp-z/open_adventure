#!/bin/bash

# 前后端连接测试脚本

echo "=========================================="
echo "前后端连接测试"
echo "=========================================="
echo ""

# 1. 测试后端健康状态
echo "1. 测试后端健康状态..."
HEALTH=$(curl -s http://localhost:8000/api/system/health)
if [ $? -eq 0 ]; then
    echo "✅ 后端健康检查通过"
    echo "   响应: $HEALTH"
else
    echo "❌ 后端健康检查失败"
    exit 1
fi
echo ""

# 2. 测试 Agents API
echo "2. 测试 Agents API..."
AGENTS=$(curl -s http://localhost:8000/api/agents?limit=1)
if [ $? -eq 0 ]; then
    echo "✅ Agents API 正常"
    echo "   响应: $(echo $AGENTS | head -c 100)..."
else
    echo "❌ Agents API 失败"
    exit 1
fi
echo ""

# 3. 测试 Terminal Status
echo "3. 测试 Terminal Status..."
TERMINAL=$(curl -s http://localhost:8000/api/terminal/status)
if [ $? -eq 0 ]; then
    echo "✅ Terminal 服务正常"
    echo "   响应: $TERMINAL"
else
    echo "❌ Terminal 服务失败"
    exit 1
fi
echo ""

# 4. 测试 Test Stream API
echo "4. 测试 Test Stream API..."
echo "   发送测试请求到 Agent 18..."
STREAM=$(curl -s -X POST "http://localhost:8000/api/agents/18/test-stream?prompt=hello" -H "Content-Type: application/json" | head -5)
if [ $? -eq 0 ]; then
    echo "✅ Test Stream API 正常"
    echo "   响应前 5 行:"
    echo "$STREAM"
else
    echo "❌ Test Stream API 失败"
    exit 1
fi
echo ""

# 5. 检查前端服务
echo "5. 检查前端服务..."
FRONTEND=$(curl -s http://localhost:5173 | head -1)
if [ $? -eq 0 ]; then
    echo "✅ 前端服务正常 (端口 5173)"
    echo "   响应: $FRONTEND"
else
    echo "❌ 前端服务失败"
    exit 1
fi
echo ""

echo "=========================================="
echo "✅ 所有测试通过！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 打开浏览器访问: http://localhost:5173"
echo "2. 导航到 Agents 页面"
echo "3. 选择一个 Agent 进行测试"
echo "4. 测试 Chat 模式和 Terminal 模式"
echo ""
