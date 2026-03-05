# Marketplace Plugins 配置功能

## 功能概述

在 Settings 页面添加了 Marketplace Plugins 配置功能，允许用户配置 Git Repository 地址，自动拉取和安装 plugins。

## 实现细节

### 后端实现

#### 1. MarketplaceConfigService (`backend/app/services/marketplace_config_service.py`)

负责管理 Marketplace Plugins 配置的核心服务：

- **配置存储**: 使用 JSON 文件存储配置 (`~/.claude/marketplace_repos.json`)
- **Git 集成**: 使用 GitAdapter 进行 clone 和 pull 操作
- **目录管理**: 自动管理 `~/.claude/plugins/marketplace-plugins/` 目录

**核心方法**:
- `get_all_repos()`: 获取所有 repository 配置
- `add_repo()`: 添加新的 repository 配置
- `delete_repo()`: 删除 repository 配置
- `sync_repo()`: 同步 repository（拉取并安装）

#### 2. Settings API Router (`backend/app/api/routers/settings.py`)

新增 API 端点：

- `GET /api/settings/marketplace-repos`: 获取所有 marketplace repos
- `POST /api/settings/marketplace-repos`: 添加新的 marketplace repo
- `DELETE /api/settings/marketplace-repos/{repo_id}`: 删除 marketplace repo
- `POST /api/settings/marketplace-repos/{repo_id}/sync`: 同步 marketplace repo

### 前端实现

#### 1. MarketplacePluginsManager 组件 (`frontend/src/app/components/MarketplacePluginsManager.tsx`)

完整的 Marketplace Plugins 管理界面：

**功能特性**:
- 显示所有已配置的 repository
- 添加新的 repository（支持自定义 branch 和 auto_update）
- 删除 repository
- 手动同步 repository
- 显示最后同步时间
- 实时状态更新（同步中、成功、失败）

**UI 特点**:
- 响应式设计，支持移动端
- 支持 Adventure 和 Professional 两种模式
- 集成 Notification 系统，实时反馈操作结果

#### 2. Settings 页面更新 (`frontend/src/app/pages/Settings.tsx`)

- 新增 "Marketplace" 标签页
- 集成 MarketplacePluginsManager 组件
- 支持 URL 参数 `?tab=marketplace` 直接跳转

## 使用方法

### 1. 添加 Marketplace Repository

1. 打开 Settings 页面
2. 点击左侧 "Marketplace" 标签
3. 点击 "添加 Repository" 按钮
4. 填写 Git Repository URL（例如：`https://github.com/username/plugins.git`）
5. 选择 Branch（默认 `main`）
6. 选择是否启用自动更新
7. 点击 "添加" 按钮

### 2. 同步 Repository

1. 在 Marketplace 列表中找到要同步的 repository
2. 点击右侧的刷新图标按钮
3. 等待同步完成（按钮会显示旋转动画）
4. 同步成功后会显示通知，并更新最后同步时间

### 3. 删除 Repository

1. 在 Marketplace 列表中找到要删除的 repository
2. 点击右侧的删除图标按钮
3. 确认删除操作

## 配置文件格式

配置文件位置: `~/.claude/marketplace_repos.json`

```json
[
  {
    "id": "c376e934-ff32-43d7-93a2-a701b5e77f73",
    "git_repo_url": "https://github.com/username/plugins.git",
    "branch": "main",
    "auto_update": false,
    "last_sync_time": "2026-03-05T10:30:00.000000"
  }
]
```

## 同步机制

### 首次同步（Clone）

当 repository 目录不存在时：
1. 在 `~/.claude/plugins/marketplace-plugins/` 下创建目录
2. 执行 `git clone` 操作
3. 更新 `last_sync_time`

### 后续同步（Pull）

当 repository 目录已存在时：
1. 进入 repository 目录
2. 执行 `git pull` 操作
3. 更新 `last_sync_time`

## 自动更新（未来功能）

当 `auto_update` 设置为 `true` 时，系统将：
- 定期检查 repository 更新
- 自动执行 pull 操作
- 发送通知告知用户更新结果

**注意**: 自动更新功能尚未实现，需要后续开发。

## 错误处理

### 常见错误

1. **Git URL 无效**: 检查 URL 格式是否正确
2. **网络连接失败**: 检查网络连接和 Git 服务器可访问性
3. **权限不足**: 检查 `~/.claude/plugins/` 目录权限
4. **Repository 已存在**: 删除旧配置后重新添加

### 错误通知

所有错误都会通过 Notification 系统显示：
- 红色通知表示错误
- 绿色通知表示成功
- 通知会自动在 5 秒后消失

## 技术栈

- **后端**: Python + FastAPI + GitAdapter
- **前端**: React + TypeScript + Tailwind CSS
- **状态管理**: React Hooks (useState, useEffect)
- **通知系统**: NotificationContext
- **Git 操作**: GitAdapter (基于 subprocess)

## 未来改进

1. **自动更新**: 实现定期自动检查和更新功能
2. **批量操作**: 支持批量同步多个 repositories
3. **更新日志**: 显示每次同步的详细日志
4. **冲突处理**: 处理 Git 冲突和合并问题
5. **私有仓库**: 支持 SSH 密钥和 Token 认证
6. **版本管理**: 支持切换不同的 branch 或 tag
7. **依赖检查**: 检查 plugin 依赖关系
8. **插件市场**: 集成官方插件市场，一键安装热门插件

## 相关文件

### 后端
- `backend/app/services/marketplace_config_service.py`
- `backend/app/api/routers/settings.py`
- `backend/app/adapters/git.py`

### 前端
- `frontend/src/app/components/MarketplacePluginsManager.tsx`
- `frontend/src/app/pages/Settings.tsx`
- `frontend/src/app/contexts/NotificationContext.tsx`

## 测试

### API 测试

```bash
# 获取所有 repos
curl http://localhost:8000/api/settings/marketplace-repos

# 添加 repo
curl -X POST http://localhost:8000/api/settings/marketplace-repos \
  -H "Content-Type: application/json" \
  -d '{
    "git_repo_url": "https://github.com/test/plugins.git",
    "branch": "main",
    "auto_update": false
  }'

# 同步 repo
curl -X POST http://localhost:8000/api/settings/marketplace-repos/{repo_id}/sync

# 删除 repo
curl -X DELETE http://localhost:8000/api/settings/marketplace-repos/{repo_id}
```

### 前端测试

1. 访问 `http://localhost:5173/settings?tab=marketplace`
2. 测试添加、同步、删除操作
3. 检查通知系统是否正常工作
4. 验证响应式布局在不同设备上的表现

## 更新日期

2026-03-05
