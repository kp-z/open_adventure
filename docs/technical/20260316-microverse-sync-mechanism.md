# Godot 导出文件自动同步机制

**创建日期**: 2026-03-16
**作者**: Claude Opus 4.6
**状态**: 已完成

## 概述

实现了 Godot 导出文件的自动同步机制，确保 `microverse/export/` 目录的文件能够自动同步到前端目录，并生成版本信息文件。

## 功能特性

### 1. 同步脚本 (`scripts/sync_microverse.sh`)

**功能**:
- 检查 `microverse/export/` 目录是否存在
- 比较源目录和目标目录的文件时间戳
- 自动同步到前端目录：
  - `frontend/public/microverse/`
  - `frontend/dist/microverse/`（如果存在）
- 生成版本文件 `version.json`

**版本文件内容**:
```json
{
  "exportTime": "2026-03-16T11:19:54Z",
  "gitCommit": "164f701",
  "files": [
    {"path": "index.html", "size": 5441},
    {"path": "index.wasm", "size": 37685705},
    ...
  ]
}
```

**使用方法**:
```bash
# 手动同步
./scripts/sync_microverse.sh
```

**特点**:
- 幂等性：重复运行不会出错
- 智能检测：只在源文件更新时才同步
- 详细日志：输出同步过程的详细信息
- 跨平台：支持 macOS 和 Linux

### 2. 监听脚本 (`scripts/watch_microverse.sh`)

**功能**:
- 监听 `microverse/export/` 目录变化
- 自动触发同步脚本
- 支持多种监听方式

**监听方式**:
1. **macOS**: 使用 `fswatch`（需要安装）
2. **Linux**: 使用 `inotifywait`（需要安装）
3. **回退方案**: 轮询监听（每 5 秒检查一次）

**使用方法**:
```bash
# 启动监听
./scripts/watch_microverse.sh

# 按 Ctrl+C 停止
```

**安装监听工具**:
```bash
# macOS
brew install fswatch

# Ubuntu/Debian
sudo apt-get install inotify-tools

# CentOS/RHEL
sudo yum install inotify-tools

# Arch
sudo pacman -S inotify-tools
```

### 3. 启动脚本集成

修改了 `start.sh`，在启动前自动检查并同步 Godot 文件：

```bash
# 同步 Microverse 游戏文件
if [ -d "microverse/export" ]; then
    echo "🎮 Checking Microverse game files..."
    if [ -f "$SCRIPT_DIR/scripts/sync_microverse.sh" ]; then
        bash "$SCRIPT_DIR/scripts/sync_microverse.sh"
    else
        echo "⚠️  Microverse sync script not found, skipping..."
    fi
    echo ""
fi
```

## 工作流程

### 开发流程

1. **导出 Godot 项目**:
   ```bash
   cd microverse
   ./export.sh
   ```

2. **自动同步**（三种方式）:
   - **方式 1**: 运行 `./start.sh`（启动时自动同步）
   - **方式 2**: 手动运行 `./scripts/sync_microverse.sh`
   - **方式 3**: 运行 `./scripts/watch_microverse.sh`（持续监听）

3. **验证同步**:
   ```bash
   # 查看版本文件
   cat frontend/public/microverse/version.json

   # 查看文件列表
   ls -la frontend/public/microverse/
   ```

### 推荐工作流

**开发阶段**（频繁修改 Godot 项目）:
```bash
# 终端 1: 启动监听
./scripts/watch_microverse.sh

# 终端 2: 启动服务
./start.sh

# 在 Godot 中修改并导出，监听脚本会自动同步
```

**生产部署**:
```bash
# 导出 Godot 项目
cd microverse && ./export.sh && cd ..

# 启动服务（自动同步）
./start.sh
```

## 目录结构

```
project-root/
├── microverse/
│   └── export/              # Godot 导出目录（源）
│       ├── index.html
│       ├── index.wasm
│       ├── index.pck
│       └── ...
├── frontend/
│   ├── public/
│   │   └── microverse/      # 同步目标 1（开发环境）
│   │       ├── index.html
│   │       ├── version.json # 版本信息
│   │       └── ...
│   └── dist/
│       └── microverse/      # 同步目标 2（生产构建）
│           ├── index.html
│           ├── version.json
│           └── ...
└── scripts/
    ├── sync_microverse.sh   # 同步脚本
    └── watch_microverse.sh  # 监听脚本
```

## 错误处理

### 源目录不存在

**错误信息**:
```
⚠️  Microverse export directory not found: /path/to/microverse/export
ℹ️  Please export Godot project first:
ℹ️    cd microverse && ./export.sh
```

**解决方法**:
```bash
cd microverse
./export.sh
```

### 导出不完整

**错误信息**:
```
⚠️  Microverse export incomplete: index.html not found
ℹ️  Please re-export Godot project:
ℹ️    cd microverse && ./export.sh
```

**解决方法**:
重新导出 Godot 项目。

### 监听工具未安装

**错误信息**:
```
⚠️  fswatch not found on macOS
ℹ️  Install with: brew install fswatch
```

**解决方法**:
- 安装监听工具（推荐）
- 或使用轮询方式（自动回退）

## 性能优化

### 同步优化

1. **时间戳比较**: 只在源文件更新时才同步
2. **rsync 优化**: 优先使用 `rsync` 进行增量同步
3. **回退方案**: 如果 `rsync` 不可用，使用 `cp` 命令

### 监听优化

1. **延迟触发**: `fswatch` 延迟 2 秒触发，避免频繁同步
2. **轮询间隔**: 轮询方式每 5 秒检查一次
3. **事件过滤**: 只监听 `modify`, `create`, `delete`, `move` 事件

## 测试验证

### 测试同步脚本

```bash
# 1. 触碰源文件
touch microverse/export/index.html

# 2. 运行同步脚本
./scripts/sync_microverse.sh

# 3. 验证版本文件
cat frontend/public/microverse/version.json
```

### 测试监听脚本

```bash
# 1. 启动监听（后台）
./scripts/watch_microverse.sh &

# 2. 修改源文件
echo "test" >> microverse/export/index.html

# 3. 等待同步（2-5 秒）
sleep 5

# 4. 验证版本文件
cat frontend/public/microverse/version.json

# 5. 停止监听
pkill -f watch_microverse.sh
```

## 已知限制

1. **轮询延迟**: 轮询方式有 5 秒延迟
2. **大文件同步**: 大文件（如 `.wasm`）同步需要时间
3. **并发安全**: 不支持多个监听脚本同时运行

## 未来改进

1. **增量同步**: 支持文件级别的增量同步
2. **压缩传输**: 支持压缩传输大文件
3. **并发控制**: 支持多个监听脚本的并发控制
4. **通知机制**: 同步完成后发送通知

## 相关文档

- [Microverse 集成文档](./20260316-microverse-integration.md)
- [Godot 导出配置](../../microverse/export_presets.cfg)
- [启动脚本文档](../../start.sh)
