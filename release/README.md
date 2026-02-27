# Claude Manager v0.1.1

## 快速开始

### macOS / Linux

```bash
./start.sh
```

或直接运行：

```bash
cd claude-manager
./claude-manager
```

### 访问应用

应用启动后，在浏览器中访问：

```
http://localhost:8000
```

## 目录结构

```
claude-manager/
├── claude-manager          # 主程序可执行文件
└── _internal/              # 内部依赖和资源
    ├── app/                # 后端应用代码
    ├── frontend_dist/      # 前端静态文件
    └── claude_manager.db   # 数据库模板
```

## 配置

首次运行时，应用会在当前目录创建 `.env` 文件，你可以修改以下配置：

```env
# API 配置
API_HOST=0.0.0.0
API_PORT=8000

# 数据库配置
DATABASE_URL=sqlite+aiosqlite:///./claude_manager.db

# Claude API 配置（可选）
ANTHROPIC_API_KEY=your_api_key_here
```

## 系统要求

- macOS 11.0+ (Apple Silicon 或 Intel)
- 至少 100MB 可用磁盘空间
- 8000 端口未被占用

## 故障排除

### 端口被占用

如果 8000 端口已被占用，修改 `.env` 文件中的 `API_PORT`：

```env
API_PORT=8001
```

### 权限问题

如果遇到权限问题，运行：

```bash
chmod +x claude-manager/claude-manager
chmod +x start.sh
```

### 数据库问题

如果数据库损坏，删除 `claude_manager.db` 文件，应用会自动创建新的数据库。

## 更多信息

- GitHub: https://github.com/kp-z/open_adventure
- 文档: /docs/
- 问题反馈: https://github.com/kp-z/open_adventure/issues

