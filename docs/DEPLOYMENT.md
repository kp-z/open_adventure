# Open Adventure - 部署指南

## Linux/macOS 单文件可执行版本

### 系统要求
- Linux x86_64 或 macOS (Apple Silicon/Intel)
- 无需安装 Python、Node.js 等依赖

### 快速开始

1. **下载可执行文件**
   ```bash
   # 从 GitHub Releases 下载
   wget https://github.com/xxx/open-adventure/releases/download/v0.2.0/open-adventure-linux
   chmod +x open-adventure-linux
   ```

2. **运行**
   ```bash
   ./open-adventure-linux
   ```

3. **访问**
   - 打开浏览器访问: http://localhost:8000
   - API 文档: http://localhost:8000/docs

### 配置选项

#### 自定义端口

**方式 1: 命令行参数**
```bash
./open-adventure --port 9000
```

**方式 2: 环境变量**
```bash
PORT=9000 ./open-adventure
```

**方式 3: 配置文件**
```bash
mkdir -p ~/.open_adventure
echo "PORT=9000" > ~/.open_adventure/.env
./open-adventure
```

#### 配置 Anthropic API Key

**方式 1: 环境变量**
```bash
export ANTHROPIC_API_KEY="your-api-key"
./open-adventure
```

**方式 2: 配置文件**
```bash
mkdir -p ~/.open_adventure
cat > ~/.open_adventure/.env << EOF
ANTHROPIC_API_KEY=your-api-key
PORT=8000
EOF

./open-adventure
```

### 数据存储

- **数据库位置**: `~/.open_adventure/open_adventure.db`
- **配置文件**: `~/.open_adventure/.env` (可选)
- **日志文件**: 输出到控制台

### 常见问题

**Q: 如何备份数据？**
```bash
cp ~/.open_adventure/open_adventure.db ~/backup/
```

**Q: 如何重置数据？**
```bash
rm ~/.open_adventure/open_adventure.db
# 下次启动时会自动创建新数据库
```

**Q: 如何更新到新版本？**
```bash
# 1. 备份数据
cp ~/.open_adventure/open_adventure.db ~/backup/

# 2. 下载新版本
wget https://github.com/xxx/open-adventure/releases/download/v0.3.0/open-adventure

# 3. 替换旧版本
chmod +x open-adventure
./open-adventure
```

**Q: 为什么文件这么小（6.8MB）？**

当前版本只打包了核心 Python 运行时。如果遇到模块缺失错误，请使用开发者模式运行。

### 卸载

```bash
# 删除数据和配置
rm -rf ~/.open_adventure

# 删除可执行文件
rm open-adventure
```

### 故障排查

**问题: 端口被占用**
```bash
# 使用其他端口
./open-adventure --port 9000
```

**问题: 数据库损坏**
```bash
# 删除数据库，重新初始化
rm ~/.open_adventure/open_adventure.db
./open-adventure
```

**问题: 权限错误**
```bash
# 确保可执行权限
chmod +x open-adventure
```

**问题: 模块未找到（ModuleNotFoundError）**

如果遇到模块缺失错误，请使用开发者模式运行（见下文）。

---

## 开发者模式

如果你想从源码运行（用于开发或解决打包问题）：

```bash
# 1. 克隆仓库
git clone https://github.com/xxx/open-adventure.git
cd open-adventure

# 2. 安装后端依赖
cd backend
pip install -r requirements.txt

# 3. 安装前端依赖
cd ../frontend
npm install

# 4. 启动后端
cd ../backend
python run.py

# 5. 启动前端（新终端）
cd frontend
npm run dev
```

访问: http://localhost:5173

---

## 构建说明

如果你想自己构建可执行文件：

```bash
# 1. 构建前端
cd frontend
npm run build:prod

# 2. 执行打包脚本
cd ..
bash scripts/build_linux.sh

# 3. 可执行文件位于
# backend/dist/open-adventure
```

---

## 技术细节

### 打包方式
- 使用 PyInstaller 6.19.0
- 单文件模式
- 嵌入数据库模板
- 数据存储在用户目录

### 已知限制
1. 当前版本未包含所有依赖（uvicorn, fastapi, sqlalchemy 等）
2. 需要在目标平台上重新打包以包含完整依赖
3. 首次启动需要 2-5 秒解压资源

### 改进建议
1. 在虚拟环境中打包以包含所有依赖
2. 添加前端静态文件嵌入
3. 优化打包配置以减少警告

---

## 支持

如有问题，请访问：
- GitHub Issues: https://github.com/xxx/open-adventure/issues
- 文档: https://github.com/xxx/open-adventure/wiki
