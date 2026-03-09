# Open Adventure 后台运行模式指南

## 概述

Open Adventure 支持两种运行模式：
- **前台模式**：适合本地开发，终端关闭后服务停止
- **后台模式（Daemon）**：适合服务器部署，服务在后台持续运行

## 使用场景

### 前台模式
- 本地开发和调试
- 需要实时查看日志输出
- 短期测试使用

### 后台模式
- Linux 服务器部署
- 云服务器长期运行
- SSH 连接断开后继续运行
- 生产环境部署

## 二进制版本使用

### 启动后台服务

```bash
# 基本用法
./open-adventure --daemon

# 指定端口
./open-adventure --daemon --port 9000

# 指定监听地址
./open-adventure --daemon --host 0.0.0.0
```

启动后会显示：
```
🚀 启动后台服务...
📝 日志文件: /home/user/.open_adventure/open_adventure.log
⏳ 等待服务启动...
✅ 服务已启动 (PID: 12345)
🌐 访问地址: http://localhost:8000/

停止服务: kill 12345
查看日志: tail -f /home/user/.open_adventure/open_adventure.log
```

### 查看服务状态

```bash
# 查看 PID
cat ~/.open_adventure/open_adventure.pid

# 查看日志（实时）
tail -f ~/.open_adventure/open_adventure.log

# 查看日志（最近 100 行）
tail -100 ~/.open_adventure/open_adventure.log

# 检查服务是否运行
curl http://localhost:8000/api/system/health

# 查看进程信息
ps aux | grep open-adventure
```

### 停止后台服务

**方法 1：使用 PID 文件（推荐）**
```bash
kill $(cat ~/.open_adventure/open_adventure.pid)
```

**方法 2：使用停止脚本**
```bash
# 创建停止脚本
cat > stop-open-adventure.sh << 'EOF'
#!/bin/bash
PID_FILE="$HOME/.open_adventure/open_adventure.pid"
if [ ! -f "$PID_FILE" ]; then
    echo "❌ 服务未运行"
    exit 1
fi
PID=$(cat "$PID_FILE")
if ! kill -0 "$PID" 2>/dev/null; then
    echo "⚠️  进程不存在"
    rm -f "$PID_FILE"
    exit 0
fi
echo "🛑 停止服务 (PID: $PID)..."
kill "$PID"
for i in {1..20}; do
    if ! kill -0 "$PID" 2>/dev/null; then
        echo "✅ 服务已停止"
        rm -f "$PID_FILE"
        exit 0
    fi
    sleep 0.5
done
echo "⚠️  强制停止..."
kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "✅ 服务已停止"
EOF

chmod +x stop-open-adventure.sh
./stop-open-adventure.sh
```

**方法 3：强制停止**
```bash
kill -9 $(cat ~/.open_adventure/open_adventure.pid)
```

### 重启服务

```bash
# 停止旧服务
kill $(cat ~/.open_adventure/open_adventure.pid)

# 等待进程完全退出
sleep 2

# 启动新服务
./open-adventure --daemon
```

## 源码版本使用

源码版本使用 `start.sh` 脚本：

```bash
# 后台模式
./start.sh --daemon

# 后台模式 + 防休眠（仅 macOS）
./start.sh --daemon --no-sleep

# 停止服务
./stop.sh
```

## 常见问题

### 1. 服务启动失败

**检查端口占用**：
```bash
lsof -i :8000
```

**查看错误日志**：
```bash
tail -50 ~/.open_adventure/open_adventure.log
```

**解决方案**：
- 使用不同端口：`./open-adventure --daemon --port 9000`
- 停止占用端口的进程：`kill <PID>`

### 2. 无法停止服务

**检查进程是否存在**：
```bash
ps aux | grep open-adventure
```

**强制停止**：
```bash
kill -9 $(cat ~/.open_adventure/open_adventure.pid)
```

### 3. SSH 断开后服务停止

确保使用 `--daemon` 模式：
```bash
./open-adventure --daemon
```

或使用 `nohup`：
```bash
nohup ./open-adventure --no-browser > ~/open-adventure.log 2>&1 &
```

或使用 `tmux`/`screen`：
```bash
tmux new -s open-adventure
./open-adventure
# 按 Ctrl+B 然后 D 分离会话
```

### 4. 日志文件过大

**清理日志**：
```bash
# 停止服务
kill $(cat ~/.open_adventure/open_adventure.pid)

# 清理日志
rm ~/.open_adventure/open_adventure.log

# 重启服务
./open-adventure --daemon
```

**日志轮转（推荐）**：
```bash
# 创建日志轮转配置
sudo tee /etc/logrotate.d/open-adventure << EOF
/home/*/.open_adventure/open_adventure.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
EOF
```

## 生产环境部署建议

### 使用 systemd 管理（推荐）

创建 systemd 服务文件：

```bash
sudo tee /etc/systemd/system/open-adventure.service << EOF
[Unit]
Description=Open Adventure Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/path/to/open-adventure
ExecStart=/path/to/open-adventure/open-adventure --no-browser
Restart=always
RestartSec=10
StandardOutput=append:/home/$USER/.open_adventure/open_adventure.log
StandardError=append:/home/$USER/.open_adventure/open_adventure.log

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start open-adventure

# 开机自启
sudo systemctl enable open-adventure

# 查看状态
sudo systemctl status open-adventure

# 查看日志
sudo journalctl -u open-adventure -f
```

### 使用 Docker（可选）

如果需要更好的隔离性，可以考虑使用 Docker 部署（需要单独配置）。

### 监控和告警

**健康检查脚本**：
```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:8000/api/system/health"

if ! curl -sf "$HEALTH_URL" > /dev/null; then
    echo "❌ Open Adventure 服务异常"
    # 发送告警（邮件、钉钉、Slack 等）
    exit 1
fi

echo "✅ Open Adventure 服务正常"
```

**定时检查（crontab）**：
```bash
# 每 5 分钟检查一次
*/5 * * * * /path/to/health-check.sh
```

## 总结

- **本地开发**：使用前台模式 `./open-adventure`
- **服务器部署**：使用后台模式 `./open-adventure --daemon`
- **生产环境**：使用 systemd 管理服务
- **日志管理**：定期清理或配置日志轮转
- **监控告警**：配置健康检查和自动重启

更多信息请参考：
- [快速使用指南](QUICK_START.md)
- [部署文档](../deployment/DEPLOYMENT.md)
- [故障排查](../troubleshooting/COMMON_ISSUES.md)
