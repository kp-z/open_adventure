# Claude Manager - 快速使用指南

## 🚀 快速开始

### 运行应用
```bash
cd dist/claude-manager
./claude-manager
```

应用会自动：
- 初始化数据库到 `~/.claude_manager/`
- 启动服务器在 `http://localhost:8000`
- 打开浏览器访问前端 Dashboard

### 命令行选项
```bash
# 不自动打开浏览器
./claude-manager --no-browser

# 使用不同端口
./claude-manager --port 9000

# 指定监听地址
./claude-manager --host 127.0.0.1

# 组合使用
./claude-manager --no-browser --port 9000
```

## 📦 分发应用

### 复制到其他位置
```bash
# 必须复制整个目录
cp -r dist/claude-manager /path/to/destination/
```

### 打包为压缩文件
```bash
tar -czf claude-manager-macos-arm64.tar.gz dist/claude-manager/
```

### 解压并运行
```bash
tar -xzf claude-manager-macos-arm64.tar.gz
cd claude-manager
./claude-manager
```

## 🔧 配置

### 用户配置文件
位置: `~/.claude_manager/.env`

```bash
# 创建配置文件
mkdir -p ~/.claude_manager
cat > ~/.claude_manager/.env << EOF
# 自定义端口
PORT=9000

# API Key
ANTHROPIC_API_KEY=your-api-key-here

# 日志级别
LOG_LEVEL=INFO
EOF
```

### 数据库位置
- 用户数据库: `~/.claude_manager/claude_manager.db`
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
claude-manager/
├── claude-manager          # 可执行文件
└── _internal/              # 依赖目录（必需）
```

**不要**只复制 `claude-manager` 文件，必须包含 `_internal` 目录！

### 端口占用
如果默认端口 8000 被占用：
```bash
./claude-manager --port 9000
```

### 权限问题
如果提示权限不足：
```bash
chmod +x claude-manager
```

## 🐛 故障排查

### 应用无法启动
1. 检查端口是否被占用
   ```bash
   lsof -i :8000
   ```

2. 查看错误日志
   ```bash
   ./claude-manager 2>&1 | tee error.log
   ```

### 数据库问题
重置数据库：
```bash
rm -rf ~/.claude_manager
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
