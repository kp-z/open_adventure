# Microverse 同步脚本使用指南

## 快速开始

### 1. 导出 Godot 项目

```bash
cd microverse
./export.sh
cd ..
```

### 2. 同步到前端（三种方式）

**方式 1: 启动时自动同步**（推荐）
```bash
./start.sh
```

**方式 2: 手动同步**
```bash
./scripts/sync_microverse.sh
```

**方式 3: 持续监听**（开发时推荐）
```bash
./scripts/watch_microverse.sh
```

## 脚本说明

### sync_microverse.sh

**功能**: 同步 Godot 导出文件到前端目录

**特点**:
- 智能检测：只在源文件更新时才同步
- 生成版本文件：包含导出时间、Git commit、文件清单
- 幂等性：重复运行不会出错

**输出示例**:
```
ℹ️  🎮 Checking Microverse export files...
ℹ️  Source is newer, syncing...
✅ Files synced to frontend/public/microverse
✅ Version file generated
✅ Microverse files synced successfully!
```

### watch_microverse.sh

**功能**: 监听 Godot 导出目录变化，自动触发同步

**监听方式**:
- macOS: `fswatch`（需安装: `brew install fswatch`）
- Linux: `inotifywait`（需安装: `apt-get install inotify-tools`）
- 回退: 轮询（每 5 秒检查一次）

**输出示例**:
```
ℹ️  🎮 Microverse File Watcher
ℹ️  Watch tool: fswatch
ℹ️  Press Ctrl+C to stop

ℹ️  Detected change: /path/to/index.html
✅ Microverse files synced successfully!
```

## 开发工作流

### 推荐流程（频繁修改 Godot）

```bash
# 终端 1: 启动监听
./scripts/watch_microverse.sh

# 终端 2: 启动服务
./start.sh

# 在 Godot 中修改并导出，监听脚本会自动同步
```

### 简单流程（偶尔修改 Godot）

```bash
# 1. 导出 Godot
cd microverse && ./export.sh && cd ..

# 2. 启动服务（自动同步）
./start.sh
```

## 版本文件

同步后会在 `frontend/public/microverse/version.json` 生成版本文件：

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

## 故障排查

### 源目录不存在

**错误**: `⚠️  Microverse export directory not found`

**解决**: 先导出 Godot 项目
```bash
cd microverse && ./export.sh
```

### 监听工具未安装

**错误**: `⚠️  fswatch not found on macOS`

**解决**: 安装监听工具（可选）
```bash
# macOS
brew install fswatch

# Linux
sudo apt-get install inotify-tools
```

**或**: 使用轮询方式（自动回退，无需安装）

## 详细文档

查看完整技术文档: [docs/technical/20260316-microverse-sync-mechanism.md](../docs/technical/20260316-microverse-sync-mechanism.md)
