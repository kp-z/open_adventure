# Claude Manager Linux 云端部署指南

## 环境要求

### 系统要求
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **架构**: x86_64 或 ARM64
- **内存**: 最低 2GB，推荐 4GB+
- **磁盘**: 最低 5GB 可用空间
- **网络**: 需要访问外网（安装依赖、访问 Claude API）

### 软件依赖
- **Python**: 3.10 或更高版本
- **Node.js**: 18.0 或更高版本
- **npm**: 9.0 或更高版本
- **SQLite**: 3.35 或更高版本（通常系统自带）

## 快速部署

### 1. 下载并解压

```bash
# 下载最新版本（根据你的架构选择）
# Linux x86_64
wget https://github.com/kp-z/open_adventure/releases/download/v{版本号}/claude-manager-v{版本号}-linux-x86_64.tar.gz

# 解压
tar -xzf claude-manager-v{版本号}-linux-x86_64.tar.gz
cd claude_manager
```

### 2. 安装依赖

```bash
# 安装 Python 依赖
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 安装 Node.js 依赖
cd frontend
npm install
npm run build
cd ..
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

关键配置项：
```bash
# 环境
ENV=production

# 数据库
DATABASE_URL=sqlite+aiosqlite:///./backend/claude_manager.db

# 日志级别
LOG_LEVEL=INFO

# Claude CLI 路径（如果需要）
CLAUDE_CLI_PATH=/usr/local/bin/claude

# API 端口
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

### 4. 启动服务

```bash
# 使用启动脚本
./start.sh

# 或手动启动
# 后端
cd backend && source venv/bin/activate && python run.py &

# 前端
cd frontend && npm run dev &
```

### 5. 验证部署

```bash
# 检查后端健康状态
curl http://localhost:8000/api/system/health

# 检查详细状态
curl http://localhost:8000/api/system/health/detailed

# 访问前端
# 浏览器打开 http://your-server-ip:3000
```

## 远程访问配置

### 防火墙配置

#### Ubuntu/Debian (UFW)
```bash
# 允许后端端口
sudo ufw allow 8000/tcp

# 允许前端端口
sudo ufw allow 3000/tcp

# 重新加载防火墙
sudo ufw reload
```

#### CentOS/RHEL (firewalld)
```bash
# 允许后端端口
sudo firewall-cmd --permanent --add-port=8000/tcp

# 允许前端端口
sudo firewall-cmd --permanent --add-port=3000/tcp

# 重新加载防火墙
sudo firewall-cmd --reload
```

### 云服务商安全组配置

#### 阿里云/腾讯云/AWS
在云服务商控制台添加安全组规则：
- **入站规则**:
  - 端口 8000 (TCP) - 后端 API
  - 端口 3000 (TCP) - 前端界面
  - 来源: 0.0.0.0/0 (或限制为特定 IP)

### Nginx 反向代理（推荐）

```nginx
# /etc/nginx/sites-available/claude-manager
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
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

## systemd 服务配置

### 1. 安装服务文件

```bash
# 编辑服务文件
sudo vim /etc/systemd/system/claude-manager.service
```

内容（修改路径和用户）：
```ini
[Unit]
Description=Claude Manager Backend Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/claude_manager
Environment="ENV=production"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/path/to/claude_manager/backend/venv/bin/python /path/to/claude_manager/backend/run.py
Restart=always
RestartSec=10
StandardOutput=append:/path/to/claude_manager/docs/logs/backend.log
StandardError=append:/path/to/claude_manager/docs/logs/error.log

# 资源限制
LimitNOFILE=65536
LimitNPROC=4096

# 安全设置
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 2. 启用并启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启用开机自启
sudo systemctl enable claude-manager

# 启动服务
sudo systemctl start claude-manager

# 查看状态
sudo systemctl status claude-manager

# 查看日志
sudo journalctl -u claude-manager -f
```

### 3. 服务管理命令

```bash
# 停止服务
sudo systemctl stop claude-manager

# 重启服务
sudo systemctl restart claude-manager

# 禁用开机自启
sudo systemctl disable claude-manager
```

## 日志管理

### 日志位置
- **后端日志**: `docs/logs/backend.log`
- **错误日志**: `docs/logs/error.log`
- **前端日志**: `docs/logs/frontend.log`

### 查看日志

```bash
# 实时查看后端日志
tail -f docs/logs/backend.log

# 查看错误日志
tail -f docs/logs/error.log

# 查看最近 100 行
tail -n 100 docs/logs/backend.log

# 搜索特定错误
grep -i "error" docs/logs/backend.log
```

### 日志轮转

日志文件会自动轮转：
- 单个文件最大 10MB
- 保留最近 5 个备份
- 自动压缩旧日志

手动清理旧日志：
```bash
# 删除 30 天前的日志
find docs/logs -name "*.log.*" -mtime +30 -delete
```

## 故障排查

### 1. 端口被占用

```bash
# 检查端口占用
lsof -i :8000
lsof -i :3000

# 杀死占用进程
kill -9 <PID>

# 或使用 stop.sh
./stop.sh
```

### 2. 数据库连接池耗尽

检查 `/api/system/health/detailed` 端点：
```bash
curl http://localhost:8000/api/system/health/detailed | jq '.database.pool'
```

如果 `checked_out` 接近 `size + max_overflow`，说明连接池不够。

解决方案：
- 检查是否有慢查询
- 检查是否有未关闭的连接
- 重启服务释放连接

### 3. Terminal 子进程僵尸进程

症状：后端无法重启，提示端口被占用

```bash
# 查找僵尸进程
ps aux | grep python | grep claude_manager

# 查找占用 8000 端口的进程
lsof -i :8000

# 强制杀死所有相关进程
pkill -9 -f "claude_manager"

# 或使用 stop.sh
./stop.sh
```

### 4. WebSocket 连接失败

检查：
1. 防火墙是否允许 WebSocket 端口
2. Nginx 配置是否正确（需要 `Upgrade` 和 `Connection` 头）
3. 后端是否正常运行

```bash
# 测试 WebSocket 连接
wscat -c ws://localhost:8000/ws/terminal/test-session-id
```

### 5. 前端无法连接后端

检查：
1. 后端是否正常运行
2. CORS 配置是否正确
3. 防火墙是否允许跨域请求

```bash
# 测试后端 API
curl http://localhost:8000/api/system/health

# 检查 CORS 头
curl -I -X OPTIONS http://localhost:8000/api/system/health
```

## 性能优化

### 1. 数据库优化

```bash
# 定期清理旧数据
sqlite3 backend/claude_manager.db "DELETE FROM executions WHERE created_at < datetime('now', '-30 days');"

# 优化数据库
sqlite3 backend/claude_manager.db "VACUUM;"

# 重建索引
sqlite3 backend/claude_manager.db "REINDEX;"
```

### 2. 连接池配置

编辑 `backend/app/core/database.py`：
```python
engine = create_async_engine(
    settings.database_url,
    pool_size=20,        # 根据并发量调整
    max_overflow=40,     # 根据并发量调整
    pool_recycle=3600,
    pool_pre_ping=True,
)
```

### 3. 日志级别

生产环境建议使用 `INFO` 或 `WARNING` 级别：
```bash
# .env
LOG_LEVEL=INFO
```

### 4. 前端构建优化

```bash
cd frontend
npm run build

# 使用 serve 提供静态文件（更快）
npm install -g serve
serve -s dist -l 3000
```

## 安全建议

### 1. 使用 HTTPS

使用 Let's Encrypt 免费证书：
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. 限制访问 IP

在 Nginx 配置中：
```nginx
location /api {
    allow 192.168.1.0/24;  # 允许内网
    allow 1.2.3.4;         # 允许特定 IP
    deny all;              # 拒绝其他
    proxy_pass http://localhost:8000;
}
```

### 3. 定期更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade

# 更新 Python 依赖
cd backend
source venv/bin/activate
pip install --upgrade -r requirements.txt

# 更新 Node.js 依赖
cd frontend
npm update
```

### 4. 备份数据库

```bash
# 定期备份
cp backend/claude_manager.db backend/claude_manager.db.backup.$(date +%Y%m%d)

# 或使用 cron 自动备份
crontab -e
# 添加：每天凌晨 2 点备份
0 2 * * * cp /path/to/claude_manager/backend/claude_manager.db /path/to/backups/claude_manager.db.$(date +\%Y\%m\%d)
```

## 监控和告警

### 1. 健康检查脚本

```bash
#!/bin/bash
# health_check.sh

BACKEND_URL="http://localhost:8000/api/system/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "Backend is down! HTTP code: $RESPONSE"
    # 发送告警（邮件、钉钉、Slack 等）
    # 自动重启服务
    sudo systemctl restart claude-manager
fi
```

添加到 cron：
```bash
crontab -e
# 每 5 分钟检查一次
*/5 * * * * /path/to/health_check.sh
```

### 2. 日志监控

使用 `logwatch` 或 `fail2ban` 监控异常日志。

### 3. 资源监控

```bash
# 安装 htop
sudo apt install htop

# 监控进程
htop -p $(pgrep -f claude_manager)

# 监控磁盘
df -h

# 监控内存
free -h
```

## 常见问题

### Q: 如何更新到新版本？

A:
1. 停止服务：`./stop.sh` 或 `sudo systemctl stop claude-manager`
2. 备份数据库：`cp backend/claude_manager.db backend/claude_manager.db.backup`
3. 下载新版本并解压覆盖
4. 重新安装依赖（如果有变化）
5. 启动服务：`./start.sh` 或 `sudo systemctl start claude-manager`

### Q: 如何迁移到其他服务器？

A:
1. 打包整个目录：`tar -czf claude_manager.tar.gz claude_manager/`
2. 传输到新服务器：`scp claude_manager.tar.gz user@new-server:/path/`
3. 在新服务器解压并重新安装依赖
4. 启动服务

### Q: 如何重置数据库？

A:
```bash
# 停止服务
./stop.sh

# 删除数据库
rm backend/claude_manager.db

# 重新启动（会自动创建新数据库）
./start.sh
```

### Q: 如何查看实时连接数？

A:
```bash
curl http://localhost:8000/api/system/health/detailed | jq '.websocket'
```

## 联系支持

- **GitHub Issues**: https://github.com/kp-z/open_adventure/issues
- **文档**: https://github.com/kp-z/open_adventure/tree/main/docs

---

**最后更新**: 2026-03-02
**版本**: v1.1.3+
