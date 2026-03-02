#!/bin/bash

# LAN IP 检测修复验证脚本
# 用于验证 v1.2.2 修复是否生效

echo "🔍 验证 LAN IP 检测修复..."
echo ""

# 1. 检查 start.sh 是否包含新的 IP 检测逻辑
echo "1. 检查 start.sh 是否包含新的 IP 检测逻辑..."
if grep -q "get_display_ip()" start.sh; then
    echo "   ✅ 找到 get_display_ip() 函数"
else
    echo "   ❌ 未找到 get_display_ip() 函数"
    exit 1
fi

# 2. 检查是否移除了 .env.local 生成逻辑
echo "2. 检查是否移除了 .env.local 生成逻辑..."
if grep -q "cat > .env.local" start.sh; then
    echo "   ❌ 仍然包含 .env.local 生成逻辑"
    exit 1
else
    echo "   ✅ 已移除 .env.local 生成逻辑"
fi

# 3. 检查是否包含 .env.local 清理逻辑
echo "3. 检查是否包含 .env.local 清理逻辑..."
if grep -q "Removing old .env.local" start.sh; then
    echo "   ✅ 包含 .env.local 清理逻辑"
else
    echo "   ❌ 未包含 .env.local 清理逻辑"
    exit 1
fi

# 4. 测试 IP 检测函数
echo "4. 测试 IP 检测函数..."
get_display_ip() {
    local ip=""

    # 方法 1: 使用 ip 命令（现代 Linux）
    if command -v ip &> /dev/null; then
        local default_iface=$(ip route | grep default | awk '{print $5}' | head -1)
        if [ -n "$default_iface" ]; then
            ip=$(ip addr show "$default_iface" | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -1)
        fi
    fi

    # 方法 2: 回退到 ifconfig（旧版 Linux）
    if [ -z "$ip" ] && command -v ifconfig &> /dev/null; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | grep -v "198.18" | awk '{print $2}' | head -1)
    fi

    # 方法 3: 获取公网 IP（云端环境）
    if [ -z "$ip" ]; then
        ip=$(curl -s --connect-timeout 2 ifconfig.me 2>/dev/null || echo "")
    fi

    echo "$ip"
}

DISPLAY_IP=$(get_display_ip)
if [ -n "$DISPLAY_IP" ]; then
    echo "   ✅ IP 检测成功: $DISPLAY_IP"
else
    echo "   ⚠️  IP 检测失败（这在某些环境下是正常的）"
fi

# 5. 检查前端自动检测逻辑
echo "5. 检查前端自动检测逻辑..."
if [ -f "frontend/src/config/api.ts" ]; then
    if grep -q "getDefaultApiBaseUrl" frontend/src/config/api.ts; then
        echo "   ✅ 前端包含自动检测逻辑"
    else
        echo "   ❌ 前端缺少自动检测逻辑"
        exit 1
    fi
else
    echo "   ❌ 前端配置文件不存在"
    exit 1
fi

# 6. 检查文档是否更新
echo "6. 检查文档是否更新..."
if [ -f "docs/technical/20260302-01-LAN-IP检测失败修复.md" ]; then
    echo "   ✅ 技术文档已创建"
else
    echo "   ❌ 技术文档未创建"
    exit 1
fi

if grep -q "前端 API 地址自动检测" docs/deployment/linux-cloud.md; then
    echo "   ✅ 部署文档已更新"
else
    echo "   ❌ 部署文档未更新"
    exit 1
fi

if grep -q "LAN IP 检测失败" docs/troubleshooting/cloud-access-issues.md; then
    echo "   ✅ 故障排查文档已更新"
else
    echo "   ❌ 故障排查文档未更新"
    exit 1
fi

echo ""
echo "============================================"
echo "✅ 所有验证通过！"
echo "============================================"
echo ""
echo "修复内容："
echo "  - 移除 .env.local 生成逻辑"
echo "  - 改进 IP 检测函数（支持 ip 命令）"
echo "  - 自动清理旧的 .env.local 文件"
echo "  - 更新部署和故障排查文档"
echo ""
echo "版本: v1.2.2"
echo "日期: 2026-03-02"
echo ""
