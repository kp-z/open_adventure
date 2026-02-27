#!/bin/bash

# Claude Manager 打包脚本
# 用于将前后端打包成可分发的应用程序

set -e

echo "🚀 开始打包 Claude Manager..."

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DIST_DIR="$PROJECT_ROOT/dist"
RELEASE_DIR="$PROJECT_ROOT/release"

echo -e "${BLUE}📁 项目路径: $PROJECT_ROOT${NC}"

# 1. 清理旧的构建文件
echo -e "\n${BLUE}🧹 清理旧的构建文件...${NC}"
rm -rf "$BACKEND_DIR/build"
rm -rf "$BACKEND_DIR/dist"
rm -rf "$FRONTEND_DIR/dist"
rm -rf "$RELEASE_DIR"

# 2. 构建前端
echo -e "\n${BLUE}🎨 构建前端静态文件...${NC}"
cd "$FRONTEND_DIR"
npm run build
echo -e "${GREEN}✅ 前端构建完成${NC}"

# 3. 打包后端
echo -e "\n${BLUE}🐍 打包后端应用...${NC}"
cd "$BACKEND_DIR"
pyinstaller claude_manager.spec --clean
echo -e "${GREEN}✅ 后端打包完成${NC}"

# 4. 创建发布目录
echo -e "\n${BLUE}📦 创建发布包...${NC}"
mkdir -p "$RELEASE_DIR"

# 5. 复制打包好的应用
cp -r "$DIST_DIR/claude-manager" "$RELEASE_DIR/"

# 6. 创建启动脚本
cat > "$RELEASE_DIR/start.sh" << 'EOF'
#!/bin/bash

# Claude Manager 启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/claude-manager"

echo "🚀 启动 Claude Manager..."
echo "📍 应用目录: $APP_DIR"

# 检查应用是否存在
if [ ! -f "$APP_DIR/claude-manager" ]; then
    echo "❌ 错误: 找不到 claude-manager 可执行文件"
    exit 1
fi

# 启动应用
cd "$APP_DIR"
./claude-manager

EOF

chmod +x "$RELEASE_DIR/start.sh"

# 7. 创建 README
cat > "$RELEASE_DIR/README.md" << 'EOF'
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

EOF

# 8. 创建版本信息文件
cat > "$RELEASE_DIR/VERSION" << EOF
Claude Manager v0.1.1
Build Date: $(date +"%Y-%m-%d %H:%M:%S")
Platform: macOS (Apple Silicon)
EOF

# 9. 计算发布包大小
RELEASE_SIZE=$(du -sh "$RELEASE_DIR" | cut -f1)

echo -e "\n${GREEN}✅ 打包完成！${NC}"
echo -e "${BLUE}📦 发布包位置: $RELEASE_DIR${NC}"
echo -e "${BLUE}📊 发布包大小: $RELEASE_SIZE${NC}"
echo -e "\n${BLUE}📝 发布包内容:${NC}"
ls -lh "$RELEASE_DIR"

echo -e "\n${GREEN}🎉 可以将 release 目录打包分发了！${NC}"
echo -e "${BLUE}💡 提示: 可以使用以下命令创建压缩包:${NC}"
echo -e "   cd $PROJECT_ROOT"
echo -e "   tar -czf claude-manager-v0.1.1-macos-arm64.tar.gz release/"
