# Clear Cache 模式使用说明

**创建日期**: 2026-03-15
**状态**: 已发布

## 概述

`--clear-cache` 模式用于清除所有缓存和数据，让应用以全新状态重启。这会触发初始化加载界面，就像第一次启动应用一样。

## 使用方法

```bash
./start.sh --clear-cache
```

## 清理内容

### 1. 前端缓存
- `.vite/` - Vite 构建缓存
- `dist/` - 构建输出目录
- `node_modules/.vite/` - Vite 依赖缓存

### 2. 浏览器存储
- `localStorage` - 前端本地存储（通过 `.clear-cache` 标记文件触发）
- 用户设置、会话状态等都会被清除

### 3. 后端数据库
- `backend/open_adventure.db` - 后端 SQLite 数据库
- `open_adventure.db` - 根目录数据库文件（如果存在）
- 所有 Skills、Agents、Workflows、Tasks、Executions 数据都会被清除

## 效果

执行 `--clear-cache` 后：

1. ✅ 前端会显示初始化加载界面
2. ✅ 后端会创建全新的数据库
3. ✅ 所有用户数据和设置都会重置
4. ✅ 应用会像第一次启动一样运行

## 注意事项

⚠️ **数据丢失警告**：
- 此操作会**永久删除**所有数据
- 包括所有 Skills、Agents、Workflows、Tasks、Executions
- 无法恢复，请谨慎使用

💡 **使用场景**：
- 测试初始化流程
- 清理开发环境
- 解决数据损坏问题
- 重置应用到初始状态

## 与其他模式的区别

### `--clear-cache` vs `--reset-all`

| 模式 | 清理内容 | 重装依赖 | 删除配置 |
|------|---------|---------|---------|
| `--clear-cache` | 缓存 + 数据库 | ❌ | ❌ |
| `--reset-all` | 缓存 + 数据库 + 依赖 | ✅ | ✅ |

- `--clear-cache`: 只清理缓存和数据，保留依赖和配置
- `--reset-all`: 完全重置，包括删除虚拟环境、node_modules、配置文件

## 实现细节

### 前端清理逻辑

1. `start.sh` 创建 `frontend/public/.clear-cache` 标记文件
2. `InitializationContext.tsx` 检测到标记文件
3. 执行 `localStorage.clear()` 清除浏览器存储
4. 尝试删除标记文件（通过 DELETE 请求）

### 后端清理逻辑

1. `start.sh` 删除 SQLite 数据库文件
2. 后端启动时检测到数据库不存在
3. 自动运行 Alembic 迁移创建新数据库
4. 初始化默认数据（如果有）

## 示例输出

```bash
$ ./start.sh --clear-cache

🚀 Starting Open Adventure...
🧹 Running in clear cache mode (--clear-cache)

🧹 Clear cache mode enabled: cleaning frontend cache, localStorage, and backend database...
🗑️  Removing backend database...
✅ Backend database removed
✅ Cache cleanup completed
📝 Frontend will clear localStorage on next load
📝 Backend will initialize a fresh database

🔌 Checking Claude plugins...
...
```

## 相关文件

- `start.sh` - 启动脚本（第 580-610 行）
- `frontend/src/app/contexts/InitializationContext.tsx` - 前端清理逻辑
- `backend/app/main.py` - 后端数据库初始化

## 更新历史

- 2026-03-15: 增强 `--clear-cache` 模式，添加后端数据库清理功能
