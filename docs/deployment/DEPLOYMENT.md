# Claude Manager - 部署指南

## 本地开发部署

### 1. 环境准备

确保已安装：
- Python 3.10 或更高版本
- pip 或 uv 包管理器

### 2. 安装步骤

```bash
# 克隆或进入项目目录
cd claude_manager

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
nano .env  # 或使用其他编辑器
```

必须配置的环境变量：
- `ANTHROPIC_API_KEY`: 你的 Anthropic API 密钥（从 https://console.anthropic.com/ 获取）
- `SECRET_KEY`: 用于 JWT 签名的密钥（生产环境必须更改）

### 4. 启动应用

#### 方式一：使用启动脚本（推荐）

```bash
./start.sh
```

#### 方式二：直接运行

```bash
source venv/bin/activate
python run.py
```

#### 方式三：使用 uvicorn

```bash
source venv/bin/activate
uvicorn claude_manager.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. 访问应用

- **API 根路径**: http://localhost:8000
- **Swagger 文档**: http://localhost:8000/docs
- **ReDoc 文档**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/health

## 生产环境部署

### 1. 安全配置

生成强密钥：

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

更新 `.env` 文件：

```env
DEBUG=False
SECRET_KEY=<生成的强密钥>
ANTHROPIC_API_KEY=<你的生产环境 API 密钥>
```

### 2. 使用 Gunicorn + Uvicorn Workers

安装 Gunicorn：

```bash
pip install gunicorn
```

启动命令：

```bash
gunicorn claude_manager.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### 3. 使用 Systemd 服务（Linux）

创建服务文件 `/etc/systemd/system/claude-manager.service`：

```ini
[Unit]
Description=Claude Manager API
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/path/to/claude_manager
Environment="PATH=/path/to/claude_manager/venv/bin"
ExecStart=/path/to/claude_manager/venv/bin/gunicorn \
  claude_manager.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable claude-manager
sudo systemctl start claude-manager
sudo systemctl status claude-manager
```

### 4. 使用 Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "claude_manager.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  claude-manager:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./claude_manager.db:/app/claude_manager.db
    restart: unless-stopped
```

构建并运行：

```bash
docker-compose up -d
```

### 5. 使用 Nginx 反向代理

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. HTTPS 配置（使用 Let's Encrypt）

```bash
# 安装 certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 数据库管理

### 初始化数据库

数据库会在首次启动时自动创建。

### 数据库迁移（使用 Alembic）

```bash
# 初始化 Alembic
alembic init alembic

# 创建迁移
alembic revision --autogenerate -m "Initial migration"

# 应用迁移
alembic upgrade head
```

### 备份数据库

```bash
# SQLite 备份
cp claude_manager.db claude_manager.db.backup

# 定时备份（添加到 crontab）
0 2 * * * cp /path/to/claude_manager.db /path/to/backups/claude_manager_$(date +\%Y\%m\%d).db
```

## 监控和日志

### 应用日志

日志会输出到标准输出。在生产环境中，建议使用日志聚合工具：

```bash
# 使用 journalctl 查看 systemd 服务日志
sudo journalctl -u claude-manager -f

# 使用 Docker 查看日志
docker-compose logs -f claude-manager
```

### 健康检查

```bash
# 检查应用健康状态
curl http://localhost:8000/health
```

### 性能监控

推荐使用：
- Prometheus + Grafana
- New Relic
- DataDog

## 故障排查

### 常见问题

1. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :8000
   # 或
   netstat -tulpn | grep 8000
   ```

2. **数据库锁定**
   ```bash
   # 检查是否有其他进程在使用数据库
   fuser claude_manager.db
   ```

3. **依赖问题**
   ```bash
   # 重新安装依赖
   pip install --force-reinstall -r requirements.txt
   ```

## 性能优化

### 1. 数据库优化

考虑使用 PostgreSQL 替代 SQLite：

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/claude_manager
```

### 2. 缓存

添加 Redis 缓存层以提高性能。

### 3. 负载均衡

使用多个 worker 进程和负载均衡器（如 Nginx）。

## 安全建议

1. **使用强密钥**：确保 `SECRET_KEY` 足够复杂
2. **HTTPS**：生产环境必须使用 HTTPS
3. **防火墙**：限制对数据库和内部服务的访问
4. **定期更新**：保持依赖包更新
5. **API 限流**：实施 API 速率限制
6. **输入验证**：所有用户输入都经过验证

## 扩展性

### 水平扩展

1. 使用外部数据库（PostgreSQL）
2. 使用 Redis 进行会话管理
3. 部署多个应用实例
4. 使用负载均衡器分发请求

### 垂直扩展

增加服务器资源（CPU、内存）并调整 worker 数量。

## 支持

如有问题，请查看：
- 项目 README.md
- API 文档：http://localhost:8000/docs
- GitHub Issues
