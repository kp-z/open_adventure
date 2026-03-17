# Microverse 自动同步 - 快速开始

## 🚀 快速开始

### 方式 1: 自动同步（推荐）

每次启动项目时自动同步：

```bash
./start.sh
```

### 方式 2: 开发模式（实时监听）

在开发 Godot 项目时，使用监听模式自动同步：

```bash
# 终端 1: 启动监听
./scripts/watch_microverse.sh

# 终端 2: 启动服务
./start.sh
```

### 方式 3: 手动同步

需要时手动同步：

```bash
./scripts/sync_microverse.sh
```

## 📋 工作流程

### 开发 Godot 项目

1. **启动监听**（可选，推荐）:
   ```bash
   ./scripts/watch_microverse.sh
   ```

2. **在 Godot 中修改项目**:
   - 编辑场景、脚本、资源等
   - 保存修改

3. **导出项目**:
   - 在 Godot 中选择 `Project > Export`
   - 导出到 `microverse/export/` 目录
   - 如果启用了监听，会自动同步
   - 如果没有启用监听，运行 `./scripts/sync_microverse.sh`

4. **刷新浏览器**:
   - 打开 `http://localhost:38080/microverse`
   - 如果版本更新，会显示提示框
   - 点击"立即刷新"更新页面

### 启动项目

```bash
./start.sh
```

启动脚本会自动：
1. 检查 Godot 导出文件
2. 如果有更新，自动同步到前端
3. 启动后端和前端服务

## 🔧 脚本说明

### sync_microverse.sh

同步 Godot 导出文件到前端目录。

**功能**:
- 检查源目录和目标目录的时间戳
- 只在源目录更新时同步
- 生成版本文件 `version.json`
- 支持强制同步

**使用**:
```bash
# 智能同步（只在有更新时）
./scripts/sync_microverse.sh

# 强制同步（忽略时间戳）
./scripts/sync_microverse.sh --force
```

### watch_microverse.sh

监听 Godot 导出目录，自动触发同步。

**功能**:
- 支持 `fswatch`（macOS）和 `inotifywait`（Linux）
- 回退到轮询模式（每 5 秒检查一次）
- 自动触发同步脚本

**使用**:
```bash
./scripts/watch_microverse.sh
```

**安装依赖**:
```bash
# macOS
brew install fswatch

# Ubuntu/Debian
sudo apt-get install inotify-tools
```

### test_microverse_sync.sh

测试同步机制是否正常工作。

**使用**:
```bash
./scripts/test_microverse_sync.sh
```

## 📊 版本检查

前端会自动检查 Godot 文件的版本：

1. **首次加载**: 记录当前版本
2. **后续加载**: 比对版本
3. **版本不匹配**: 显示更新提示
4. **用户操作**:
   - "立即刷新": 刷新页面加载新版本
   - "稍后提醒": 关闭提示，下次加载时再提醒

## 🐛 故障排查

### 同步脚本无法执行

```bash
chmod +x scripts/sync_microverse.sh
chmod +x scripts/watch_microverse.sh
```

### 监听脚本无法启动

安装依赖或使用轮询模式（脚本会自动回退）。

### 版本检查失败

```bash
# 重新生成版本文件
./scripts/sync_microverse.sh --force

# 清除浏览器缓存
# 在浏览器控制台执行:
localStorage.removeItem('microverse_version');
location.reload();
```

### 前端未显示更新提示

检查版本文件是否存在：
```bash
cat frontend/public/microverse/version.json
```

## 📚 更多文档

- `scripts/README_MICROVERSE_SYNC.md` - 详细使用指南
- `docs/technical/20260316-microverse-sync-mechanism.md` - 技术文档
- `docs/technical/20260316-godot-auto-sync-implementation.md` - 实现总结

## ✅ 验证

运行测试脚本验证所有功能：

```bash
./scripts/test_microverse_sync.sh
```

预期输出：
```
✅ All tests passed!
🎉 Microverse sync mechanism is ready!
```

## 🎯 最佳实践

1. **开发时使用监听模式**: 实时同步，提高效率
2. **启动前自动同步**: 确保加载最新版本
3. **定期测试**: 运行测试脚本验证功能
4. **清除缓存**: 遇到问题时清除浏览器缓存

---

**快速命令参考**:

```bash
# 启动项目（自动同步）
./start.sh

# 开发模式（实时监听）
./scripts/watch_microverse.sh

# 手动同步
./scripts/sync_microverse.sh

# 强制同步
./scripts/sync_microverse.sh --force

# 测试
./scripts/test_microverse_sync.sh
```
