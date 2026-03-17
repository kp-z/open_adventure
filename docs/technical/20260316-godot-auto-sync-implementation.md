# Godot 自动同步机制实现总结

**创建日期**: 2026-03-16
**作者**: Claude Opus 4.6 (Agent Team)
**状态**: 已完成

## 概述

实现了 Godot 导出文件的自动同步机制，确保前端始终加载最新版本的游戏文件，解决了版本不一致导致的 Agent 功能异常问题。

## 实现内容

### 1. 自动同步脚本 (`scripts/sync_microverse.sh`)

**功能特性**:
- ✅ 智能检测源目录和目标目录的时间戳
- ✅ 自动同步到 `frontend/public/microverse/` 和 `frontend/dist/microverse/`
- ✅ 生成版本文件 `version.json`（包含导出时间、Git commit、文件清单）
- ✅ 支持 macOS 和 Linux
- ✅ 幂等性保证（重复运行不会出错）
- ✅ 详细的日志输出

**使用方式**:
```bash
# 手动同步
./scripts/sync_microverse.sh

# 强制同步（忽略时间戳检查）
./scripts/sync_microverse.sh --force
```

**版本文件格式** (`version.json`):
```json
{
  "exportTime": "2026-03-16T11:19:54Z",
  "gitCommit": "164f701",
  "files": [
    {"path": "index.html", "size": 5441},
    {"path": "index.js", "size": 315759},
    {"path": "index.pck", "size": 8432672},
    {"path": "index.wasm", "size": 37685705}
  ]
}
```

### 2. 监听脚本 (`scripts/watch_microverse.sh`)

**功能特性**:
- ✅ 支持 `fswatch`（macOS）和 `inotifywait`（Linux）
- ✅ 回退到轮询方式（每 5 秒检查一次）
- ✅ 自动触发同步脚本
- ✅ 友好的错误提示和安装指南

**使用方式**:
```bash
# 启动监听（推荐在开发时使用）
./scripts/watch_microverse.sh
```

**安装依赖**:
```bash
# macOS
brew install fswatch

# Ubuntu/Debian
sudo apt-get install inotify-tools

# 如果没有安装，脚本会自动回退到轮询模式
```

### 3. 测试脚本 (`scripts/test_microverse_sync.sh`)

**功能特性**:
- ✅ 验证脚本存在性和可执行权限
- ✅ 测试同步功能
- ✅ 验证版本文件格式
- ✅ 检查 start.sh 集成

**使用方式**:
```bash
./scripts/test_microverse_sync.sh
```

### 4. 前端版本检查 (`frontend/src/app/pages/Microverse.tsx`)

**功能特性**:
- ✅ 自动加载 `/microverse/version.json`
- ✅ 比对本地缓存版本和服务器版本
- ✅ 版本不匹配时显示更新提示
- ✅ 提供"立即刷新"和"稍后提醒"选项
- ✅ 开发模式下每次都检查版本

**实现逻辑**:
```typescript
const checkVersion = async () => {
  try {
    const response = await fetch('/microverse/version.json', {
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    });
    const newVersion = await response.json();
    const cachedVersion = localStorage.getItem('microverse_version');

    if (cachedVersion && cachedVersion !== newVersion.exportTime) {
      setShowUpdatePrompt(true);
      setNewVersion(newVersion);
    } else {
      localStorage.setItem('microverse_version', newVersion.exportTime);
    }
  } catch (error) {
    console.warn('[Microverse] 版本检查失败:', error);
  }
};
```

**UI 组件**:
- 使用 Material-UI 的 Dialog 组件
- 显示版本信息和更新时间
- 提供"立即刷新"和"稍后提醒"按钮
- 样式符合项目整体风格

### 5. 启动脚本集成 (`start.sh`)

**集成内容**:
```bash
# 同步 Microverse 游戏文件
if [ -f "$SCRIPT_DIR/scripts/sync_microverse.sh" ]; then
    bash "$SCRIPT_DIR/scripts/sync_microverse.sh"
fi
```

**效果**:
- ✅ 每次启动时自动检查并同步 Godot 文件
- ✅ 确保前端始终加载最新版本
- ✅ 无需手动操作

## 工作流程

### 开发流程（推荐）

```bash
# 终端 1: 启动监听（自动同步）
./scripts/watch_microverse.sh

# 终端 2: 启动服务
./start.sh

# 在 Godot 中修改并导出
# → 监听脚本自动检测变化
# → 自动同步到前端目录
# → 前端检测到版本变化
# → 提示用户刷新页面
```

### 简单流程

```bash
# 启动服务（自动同步一次）
./start.sh

# 在 Godot 中修改并导出后，手动同步
./scripts/sync_microverse.sh

# 刷新浏览器页面
```

## 技术细节

### 同步策略

1. **时间戳比对**:
   - 比较 `microverse/export/` 和 `frontend/public/microverse/` 的最新修改时间
   - 只有源目录更新时才执行同步

2. **文件完整性**:
   - 使用 `rsync` 确保所有文件正确复制
   - 保留文件权限和时间戳
   - 生成文件清单用于验证

3. **版本管理**:
   - 使用 ISO 8601 格式的时间戳作为版本号
   - 记录 Git commit hash（如果在 git 仓库中）
   - 记录所有文件的路径和大小

### 前端版本检查

1. **检查时机**:
   - 页面加载时检查一次
   - 开发模式下每次都检查
   - 生产模式下可以缓存版本信息

2. **版本比对**:
   - 使用 `exportTime` 作为版本标识
   - 存储在 localStorage 中
   - 版本不匹配时提示更新

3. **用户体验**:
   - 非侵入式提示（Dialog）
   - 提供"立即刷新"和"稍后提醒"选项
   - 显示版本信息和更新时间

## 测试验证

### 测试场景

1. **首次同步**:
   ```bash
   ./scripts/sync_microverse.sh
   # 预期：成功同步所有文件，生成 version.json
   ```

2. **重复同步**:
   ```bash
   ./scripts/sync_microverse.sh
   ./scripts/sync_microverse.sh
   # 预期：第二次跳过同步（时间戳未变化）
   ```

3. **强制同步**:
   ```bash
   ./scripts/sync_microverse.sh --force
   # 预期：忽略时间戳检查，强制同步
   ```

4. **监听模式**:
   ```bash
   ./scripts/watch_microverse.sh
   # 在 Godot 中导出文件
   # 预期：自动检测变化并同步
   ```

5. **版本检查**:
   - 打开 `http://localhost:38080/microverse`
   - 修改 Godot 并导出
   - 同步文件
   - 刷新页面
   - 预期：显示版本更新提示

### 测试结果

所有测试通过：
- ✅ 同步脚本正常工作
- ✅ 监听脚本正常工作（支持轮询回退）
- ✅ 版本文件生成正确
- ✅ start.sh 集成成功
- ✅ 前端版本检查正常工作
- ✅ UI 提示正常显示

## 性能优化

1. **智能同步**:
   - 只在源目录更新时同步
   - 避免不必要的文件复制

2. **缓存策略**:
   - 前端使用 localStorage 缓存版本信息
   - 减少不必要的网络请求

3. **轮询优化**:
   - 监听脚本优先使用 fswatch/inotifywait
   - 回退到轮询时使用 5 秒间隔（平衡响应速度和 CPU 占用）

## 故障排查

### 问题 1: 同步脚本无法执行

**症状**: `Permission denied`

**解决方案**:
```bash
chmod +x scripts/sync_microverse.sh
chmod +x scripts/watch_microverse.sh
```

### 问题 2: 监听脚本无法启动

**症状**: `fswatch: command not found`

**解决方案**:
```bash
# macOS
brew install fswatch

# Ubuntu/Debian
sudo apt-get install inotify-tools

# 或者使用轮询模式（脚本会自动回退）
```

### 问题 3: 版本检查失败

**症状**: 控制台显示 `版本检查失败`

**可能原因**:
- `version.json` 文件不存在
- 网络请求失败
- JSON 格式错误

**解决方案**:
```bash
# 重新生成版本文件
./scripts/sync_microverse.sh --force

# 检查文件是否存在
ls -la frontend/public/microverse/version.json

# 检查 JSON 格式
cat frontend/public/microverse/version.json | jq .
```

### 问题 4: 前端未显示更新提示

**可能原因**:
- localStorage 缓存未清除
- 版本号相同

**解决方案**:
```javascript
// 在浏览器控制台执行
localStorage.removeItem('microverse_version');
location.reload();
```

## 文档和指南

创建的文档：
1. `scripts/README_MICROVERSE_SYNC.md` - 使用指南
2. `docs/technical/20260316-microverse-sync-mechanism.md` - 技术文档
3. `docs/technical/20260316-godot-auto-sync-implementation.md` - 实现总结（本文档）

## 未来改进

1. **增量同步**:
   - 只同步变化的文件
   - 使用文件哈希值比对

2. **版本回滚**:
   - 支持回滚到之前的版本
   - 保留历史版本的备份

3. **自动化测试**:
   - 添加 CI/CD 集成
   - 自动运行测试脚本

4. **性能监控**:
   - 记录同步耗时
   - 监控文件大小变化

5. **通知机制**:
   - 桌面通知（macOS/Linux）
   - Slack/Discord 集成

## 总结

通过实现自动同步机制，我们解决了以下问题：

1. ✅ **版本不一致**: 前端始终加载最新版本的 Godot 文件
2. ✅ **手动操作**: 自动化同步流程，减少人工干预
3. ✅ **开发效率**: 监听模式下实时同步，提高开发效率
4. ✅ **用户体验**: 版本检查机制确保用户及时更新

这套机制确保了 Microverse 页面的 Agent 功能始终正常工作，为后续的开发和维护提供了坚实的基础。

---

**协作团队**:
- build-engineer: 创建同步脚本和监听脚本
- frontend-dev: 实现前端版本检查机制
- microverse-dev: 修复 Godot 场景文件

**使用的技术**:
- Bash 脚本
- fswatch / inotifywait
- TypeScript / React
- Material-UI
- localStorage
- JSON 版本管理
