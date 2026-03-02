# 云端部署无法访问后端问题排查指南

**问题**: 在云端部署 Claude Manager 后，前端无法访问后端 API

## 问题原因

### 1. 前端自动检测 API 地址（v1.2.1+）

**当前方案**:
- 前端会自动检测 API 地址，无需手动配置
- 本地开发时使用 `localhost:8000`
- 云端部署时使用 `当前主机:8000`
- `start.sh` 脚本会自动清理旧的 `.env.local` 文件

**自动检测逻辑**:
```typescript
const getDefaultApiBaseUrl = () => {
  // 如果有环境变量，优先使用
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 自动检测当前主机地址
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  return `${protocol}//${hostname}:8000/api`;
};
```

**注意事项**:
- 从 v1.2.2 开始，`start.sh` 不再生成 `.env.local` 文件
- 如果存在旧的 `.env.local` 文件，会被自动清理
- 如需自定义 API 地址，可手动创建 `.env.local` 并设置 `VITE_API_BASE_URL`

### 2. LAN IP 检测失败（v1.2.2 已修复）

**问题描述**:
- 旧版本的 `start.sh` 使用 `ifconfig` 命令检测 LAN IP
- 许多现代 Linux 发行版不再默认安装 `net-tools` 包
- 导致 IP 检测失败，生成错误的 `.env.local` 配置

**修复方案**（v1.2.2）:
- 移除 `.env.local` 生成逻辑，完全依赖前端自动检测
- 改进 IP 检测函数，仅用于显示访问地址
- 支持多种检测方法：`ip` 命令 → `ifconfig` → 公网 IP

**新的 IP 检测逻辑**:
```bash
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
```

### 3. 防火墙未开放端口

**问题描述**:
- 云服务器防火墙默认关闭所有端口
- 8000 端口（后端）和 5173/3000 端口（前端）未开放

**排查方法**:
```bash
# 检查端口是否监听
netstat -tlnp | grep 8000
lsof -i :8000

# 检查防火墙规则
sudo ufw status
sudo firewall-cmd --list-all
```

**修复方案**:

#### Ubuntu/Debian (UFW)
```bash
sudo ufw allow 8000/tcp
sudo ufw allow 5173/tcp
sudo ufw reload
```

#### CentOS/RHEL (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

### 3. 云服务商安全组未配置

**问题描述**:
- 阿里云、腾讯云、AWS 等云服务商有额外的安全组规则
- 即使服务器防火墙开放，安全组未配置也无法访问

**修复方案**:

在云服务商控制台添加安全组规则：

**入站规则**:
| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 8000 | 0.0.0.0/0 | 后端 API |
| TCP | 5173 | 0.0.0.0/0 | 前端界面（Vite） |
| TCP | 3000 | 0.0.0.0/0 | 前端界面（备用） |

**安全建议**:
- 生产环境建议限制来源 IP 为特定网段
- 或使用 Nginx 反向代理，只开放 80/443 端口

### 4. 后端监听地址错误

**问题描述**:
- 后端监听 `127.0.0.1`，只能本机访问
- 需要监听 `0.0.0.0` 才能接受外部连接

**排查方法**:
```bash
# 检查监听地址
netstat -tlnp | grep 8000
# 应该显示 0.0.0.0:8000，而不是 127.0.0.1:8000
```

**修复方案**:

检查 `backend/run.py`:
```python
uvicorn.run(
    "app.main:app",
    host="0.0.0.0",  # 必须是 0.0.0.0，不能是 127.0.0.1
    port=8000,
    reload=is_dev,
)
```

### 5. CORS 配置问题

**问题描述**:
- 前端和后端在不同域名/端口
- 浏览器阻止跨域请求

**排查方法**:
```bash
# 检查浏览器控制台是否有 CORS 错误
# Access to XMLHttpRequest at 'http://...' from origin 'http://...' has been blocked by CORS policy
```

**修复方案**:

检查 `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

生产环境建议限制来源：
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://your-domain.com",
        "https://your-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6. SELinux 阻止连接

**问题描述**:
- CentOS/RHEL 默认启用 SELinux
- SELinux 可能阻止非标准端口的网络连接

**排查方法**:
```bash
# 检查 SELinux 状态
getenforce

# 检查 SELinux 日志
sudo ausearch -m avc -ts recent
```

**修复方案**:

临时禁用（测试用）:
```bash
sudo setenforce 0
```

永久配置（推荐）:
```bash
# 允许 httpd 连接网络
sudo setsebool -P httpd_can_network_connect 1

# 或添加端口到 SELinux
sudo semanage port -a -t http_port_t -p tcp 8000
```

### 7. 使用 Nginx 反向代理（推荐）

**优势**:
- 只需开放 80/443 端口
- 支持 HTTPS
- 负载均衡
- 静态文件缓存

**配置示例**:

`/etc/nginx/sites-available/claude-manager`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/claude-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

使用 Nginx 后，前端配置：
```bash
# .env
VITE_API_BASE_URL=http://your-domain.com/api
VITE_WS_BASE_URL=ws://your-domain.com/api
```

## 完整排查流程

### 1. 检查后端是否启动
```bash
ps aux | grep python | grep claude_manager
curl http://localhost:8000/api/system/health
```

### 2. 检查后端监听地址
```bash
netstat -tlnp | grep 8000
# 应该显示 0.0.0.0:8000
```

### 3. 检查防火墙
```bash
# Ubuntu/Debian
sudo ufw status

# CentOS/RHEL
sudo firewall-cmd --list-all
```

### 4. 检查云服务商安全组
登录云服务商控制台，检查安全组规则

### 5. 测试本地访问
```bash
# 在服务器上测试
curl http://localhost:8000/api/system/health
curl http://127.0.0.1:8000/api/system/health
```

### 6. 测试外部访问
```bash
# 在本地电脑测试
curl http://your-server-ip:8000/api/system/health
```

### 7. 检查浏览器控制台
打开浏览器开发者工具（F12），查看：
- Network 标签：查看请求是否发送
- Console 标签：查看是否有 CORS 错误

## 快速修复脚本

创建 `scripts/fix-cloud-access.sh`:
```bash
#!/bin/bash

echo "🔧 修复云端访问问题..."

# 1. 检查后端监听地址
echo "1. 检查后端监听地址..."
netstat -tlnp | grep 8000

# 2. 开放防火墙端口
echo "2. 开放防火墙端口..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 8000/tcp
    sudo ufw allow 5173/tcp
    sudo ufw reload
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=8000/tcp
    sudo firewall-cmd --permanent --add-port=5173/tcp
    sudo firewall-cmd --reload
fi

# 3. 测试本地访问
echo "3. 测试本地访问..."
curl -s http://localhost:8000/api/system/health | jq .

# 4. 显示外部访问地址
echo "4. 外部访问地址:"
IP=$(curl -s ifconfig.me)
echo "   前端: http://$IP:5173"
echo "   后端: http://$IP:8000"
echo "   健康检查: http://$IP:8000/api/system/health"

echo "✅ 修复完成！"
echo "⚠️  请确保云服务商安全组已配置"
```

## 环境变量配置

创建 `.env.production`:
```bash
# 环境
ENV=production

# API 地址（可选，前端会自动检测）
# VITE_API_BASE_URL=http://your-domain.com/api
# VITE_WS_BASE_URL=ws://your-domain.com/api

# 数据库
DATABASE_URL=sqlite+aiosqlite:///./backend/claude_manager.db

# 日志
LOG_LEVEL=INFO
```

## 验证修复

### 1. 本地验证
```bash
curl http://localhost:8000/api/system/health
```

### 2. 外部验证
```bash
curl http://your-server-ip:8000/api/system/health
```

### 3. 浏览器验证
访问 `http://your-server-ip:5173`，打开浏览器控制台：
- Network 标签应该显示成功的 API 请求
- Console 标签不应该有错误

### 4. 详细健康检查
```bash
curl http://your-server-ip:8000/api/system/health/detailed | jq .
```

## 常见错误信息

### 1. Connection refused
```
curl: (7) Failed to connect to localhost port 8000: Connection refused
```
**原因**: 后端未启动或端口错误
**解决**: 启动后端 `./start.sh`

### 2. No route to host
```
curl: (113) No route to host
```
**原因**: 防火墙或安全组阻止
**解决**: 开放防火墙和安全组

### 3. CORS error
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**原因**: CORS 配置错误
**解决**: 检查 `backend/app/main.py` 中的 CORS 配置

### 4. 502 Bad Gateway (Nginx)
```
502 Bad Gateway
```
**原因**: Nginx 无法连接到后端
**解决**: 检查后端是否启动，检查 Nginx 配置

## 总结

云端部署无法访问后端的主要原因：

1. ✅ **前端自动检测 API 地址**（v1.2.1 已实现）
2. ✅ **LAN IP 检测失败**（v1.2.2 已修复，移除 .env.local 生成）
3. ⚠️ **防火墙未开放端口**（需手动配置）
4. ⚠️ **云服务商安全组未配置**（需手动配置）
5. ✅ **后端监听地址正确**（已配置为 0.0.0.0）
6. ✅ **CORS 配置正确**（已允许所有来源）

**推荐方案**: 使用 Nginx 反向代理，只开放 80/443 端口，更安全更专业。

**版本说明**:
- **v1.2.1**: 前端自动检测 API 地址
- **v1.2.2**: 移除 `.env.local` 生成，改进 IP 检测逻辑

---

**更新日期**: 2026-03-02
**版本**: v1.2.2
