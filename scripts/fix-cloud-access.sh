#!/bin/bash

echo "🔧 修复云端访问问题..."
echo ""

# 1. 检查后端监听地址
echo "1️⃣  检查后端监听地址..."
if netstat -tlnp 2>/dev/null | grep 8000 | grep -q "0.0.0.0:8000"; then
    echo "   ✅ 后端正确监听 0.0.0.0:8000"
elif netstat -tlnp 2>/dev/null | grep 8000 | grep -q "127.0.0.1:8000"; then
    echo "   ❌ 后端只监听 127.0.0.1:8000（仅本机可访问）"
    echo "   💡 请检查 backend/run.py，确保 host='0.0.0.0'"
else
    echo "   ⚠️  后端未在 8000 端口监听"
    echo "   💡 请运行 ./start.sh 启动服务"
fi
echo ""

# 2. 开放防火墙端口
echo "2️⃣  配置防火墙..."
if command -v ufw &> /dev/null; then
    echo "   检测到 UFW 防火墙"
    if sudo ufw status | grep -q "Status: active"; then
        echo "   开放端口 8000 和 5173..."
        sudo ufw allow 8000/tcp
        sudo ufw allow 5173/tcp
        sudo ufw reload
        echo "   ✅ UFW 防火墙配置完成"
    else
        echo "   ℹ️  UFW 未启用"
    fi
elif command -v firewall-cmd &> /dev/null; then
    echo "   检测到 firewalld 防火墙"
    if sudo firewall-cmd --state 2>/dev/null | grep -q "running"; then
        echo "   开放端口 8000 和 5173..."
        sudo firewall-cmd --permanent --add-port=8000/tcp
        sudo firewall-cmd --permanent --add-port=5173/tcp
        sudo firewall-cmd --reload
        echo "   ✅ firewalld 配置完成"
    else
        echo "   ℹ️  firewalld 未运行"
    fi
else
    echo "   ℹ️  未检测到防火墙（或已禁用）"
fi
echo ""

# 3. 测试本地访问
echo "3️⃣  测试本地访问..."
if curl -s -f http://localhost:8000/api/system/health > /dev/null 2>&1; then
    echo "   ✅ 本地访问成功"
    curl -s http://localhost:8000/api/system/health | python3 -m json.tool 2>/dev/null || echo "   (无法格式化 JSON)"
else
    echo "   ❌ 本地访问失败"
    echo "   💡 请检查后端是否正常启动"
fi
echo ""

# 4. 显示外部访问地址
echo "4️⃣  外部访问地址:"
IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "无法获取")
if [ "$IP" != "无法获取" ]; then
    echo "   🌐 前端: http://$IP:5173"
    echo "   🔌 后端: http://$IP:8000"
    echo "   ❤️  健康检查: http://$IP:8000/api/system/health"
else
    echo "   ⚠️  无法获取公网 IP"
    echo "   💡 请手动查询服务器公网 IP"
fi
echo ""

# 5. 安全组提醒
echo "5️⃣  ⚠️  重要提醒:"
echo "   请确保云服务商安全组已配置："
echo "   - 入站规则: TCP 8000 (后端)"
echo "   - 入站规则: TCP 5173 (前端)"
echo "   - 来源: 0.0.0.0/0 或特定 IP"
echo ""

# 6. 测试外部访问（如果可能）
echo "6️⃣  测试外部访问..."
if [ "$IP" != "无法获取" ]; then
    if curl -s -f --connect-timeout 5 http://$IP:8000/api/system/health > /dev/null 2>&1; then
        echo "   ✅ 外部访问成功！"
    else
        echo "   ❌ 外部访问失败"
        echo "   💡 可能原因："
        echo "      1. 防火墙未开放端口"
        echo "      2. 云服务商安全组未配置"
        echo "      3. 后端监听地址错误"
    fi
else
    echo "   ⏭️  跳过（无法获取公网 IP）"
fi
echo ""

echo "✅ 检查完成！"
echo ""
echo "📖 详细文档: docs/troubleshooting/cloud-access-issues.md"
