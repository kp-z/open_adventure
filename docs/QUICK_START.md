# Open Adventure - 快速使用指南

## 🚀 快速开始

### 运行应用
```bash
cd dist/open-adventure
./open-adventure
```

应用会自动：
- 初始化数据库到 `~/.open_adventure/`
- 启动服务器在 `http://localhost:8000`
- 打开浏览器访问前端 Dashboard

### 命令行选项
```bash
# 不自动打开浏览器
./open-adventure --no-browser

# 使用不同端口
./open-adventure --port 9000

# 指定监听地址
./open-adventure --host 127.0.0.1

# 后台运行模式（推荐用于服务器部署）
./open-adventure --daemon

# 后台运行并指定端口
./open-adventure --daemon --port 9000

# 组合使用
./open-adventure --no-browser --port 9000
```

### 后台运行模式

**启动后台服务**：
```bash
./open-adventure --daemon
```

服务会：
- 在后台运行，不占用终端
- 自动创建 PID 文件到 `~/.open_adventure/open_adventure.pid`
- 日志输出到 `~/.open_adventure/open_adventure.log`
- 即使关闭 SSH 连接也会继续运行

**查看服务状态**：
```bash
# 查看 PID
cat ~/.open_adventure/open_adventure.pid

# 查看日志
tail -f ~/.open_adventure/open_adventure.log

# 检查服务是否运行
curl http://localhost:8000/api/system/health
```

**停止后台服务**：
```bash
# 方法 1: 使用 PID 文件
kill $(cat ~/.open_adventure/open_adventure.pid)

# 方法 2: 直接指定 PID（从启动输出获取）
kill <PID>

# 方法 3: 强制停止
kill -9 $(cat ~/.open_adventure/open_adventure.pid)

# 方法 4: 使用停止脚本（推荐）
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

**重启服务**：
```bash
# 停止旧服务
kill $(cat ~/.open_adventure/open_adventure.pid)

# 等待进程退出
sleep 2

# 启动新服务
./open-adventure --daemon
```

## 📦 分发应用

### 复制到其他位置
```bash
# 必须复制整个目录
cp -r dist/open-adventure /path/to/destination/
```

### 打包为压缩文件
```bash
tar -czf open-adventure-macos-arm64.tar.gz dist/open-adventure/
```

### 解压并运行
```bash
tar -xzf open-adventure-macos-arm64.tar.gz
cd open-adventure
./open-adventure
```

## 🔧 配置

### 用户配置文件
位置: `~/.open_adventure/.env`

```bash
# 创建配置文件
mkdir -p ~/.open_adventure
cat > ~/.open_adventure/.env << EOF
# 自定义端口
PORT=9000

# API Key
ANTHROPIC_API_KEY=your-api-key-here

# 日志级别
LOG_LEVEL=INFO
EOF
```

### 数据库位置
- 用户数据库: `~/.open_adventure/open_adventure.db`
- 自动从模板初始化
- 可以手动删除重置

## 🌐 访问应用

### Web 界面
- 前端 Dashboard: `http://localhost:8000/`
- API 文档: `http://localhost:8000/docs`
- 健康检查: `http://localhost:8000/api/system/health`

### API 示例
```bash
# 健康检查
curl http://localhost:8000/api/system/health

# 获取技能列表
curl http://localhost:8000/api/skills

# 获取智能体列表
curl http://localhost:8000/api/agents
```

## ⚠️ 注意事项

### 必须保持目录结构
```
open-adventure/
├── open-adventure          # 可执行文件
└── _internal/              # 依赖目录（必需）
```

**不要**只复制 `open-adventure` 文件，必须包含 `_internal` 目录！

### 端口占用
如果默认端口 8000 被占用：
```bash
./open-adventure --port 9000
```

### 权限问题
如果提示权限不足：
```bash
chmod +x open-adventure
```

## 🐛 故障排查

### 应用无法启动
1. 检查端口是否被占用
   ```bash
   lsof -i :8000
   ```

2. 查看错误日志
   ```bash
   ./open-adventure 2>&1 | tee error.log
   ```

### 数据库问题
重置数据库：
```bash
rm -rf ~/.open_adventure
# 重新启动应用会自动初始化
```

### 前端无法访问
确认服务器已启动：
```bash
curl http://localhost:8000/api/system/health
```

## 📚 更多信息

- 完整文档: `PACKAGING_SUCCESS_REPORT.md`
- 技术细节: `PACKAGING_FIX_SUMMARY.md`
- 项目说明: `README.md`
