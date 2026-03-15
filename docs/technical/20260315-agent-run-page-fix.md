# Agent Run 页面错误修复

**日期**: 2026-03-15
**问题**: Agent Run 页面报错，包括 500 错误和前端 JavaScript 错误

## 问题分析

### 1. 后端 500 错误
**错误信息**:
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such column: tasks.result_data
```

**原因**: 
- 数据库表 `tasks` 缺少 `result_data` 列
- 虽然迁移版本显示为最新（7ddd7ab1e1e5），但该列在迁移 `a2be1393b6ef` 中应该被添加
- 可能是数据库从旧版本复制过来，或迁移在某个时候失败了

**影响的 API**:
- `/api/executions/?skip=0&limit=50` - 返回 500 错误
- `/api/executions/?execution_type=agent_test&limit=100` - 返回 500 错误

### 2. WebSocket 连接失败
**错误信息**:
```
WebSocket connection to 'ws://localhost:8000/api/agents/17/api-session-ws?mode=chat' failed
```

**原因**:
- 前端 `ApiChatView.tsx` 中硬编码的端口号错误
- 使用了 `38080` 端口，但后端实际运行在 `8000` 端口

### 3. 前端 JavaScript 错误
**错误信息**:
```
TypeError: Cannot read properties of undefined (reading 'trim')
```

**原因**:
- 可能是编译缓存问题
- 重新构建前端后解决

## 修复方案

### 1. 修复数据库缺失列

检查受影响的数据库文件：
```bash
find /Users/kp/项目/Proj/claude_manager -name "*.db" -type f
```

为每个数据库添加缺失的列：
```bash
# backend/open_adventure.db (主数据库)
sqlite3 backend/open_adventure.db "ALTER TABLE tasks ADD COLUMN result_data JSON;"

# 项目根目录的数据库
sqlite3 open_adventure.db "ALTER TABLE tasks ADD COLUMN result_data JSON;"
```

验证列已添加：
```bash
sqlite3 backend/open_adventure.db "PRAGMA table_info(tasks);" | grep result
# 输出: 28|result_data|JSON|0||0
```

### 2. 修复 WebSocket 端口

**文件**: `frontend/src/app/components/agent-test/ApiChatView.tsx`

**修改**:
```typescript
// 修改前
const wsUrl = `${protocol}//${window.location.hostname}:38080/api/agents/${agentId}/api-session-ws?mode=${mode}`;

// 修改后
const wsUrl = `${protocol}//${window.location.hostname}:8000/api/agents/${agentId}/api-session-ws?mode=${mode}`;
```

### 3. 重新构建前端

```bash
cd frontend
npm run build
```

## 验证修复

### 1. 测试后端 API
```bash
curl -s 'http://localhost:8000/api/executions/?skip=0&limit=1' | python3 -m json.tool
```

预期结果：返回正常的 JSON 响应，包含 `result_data` 字段

### 2. 测试 WebSocket 连接
- 访问 Agent 测试页面
- 打开浏览器控制台
- 查看 WebSocket 连接日志，应该显示连接成功

### 3. 测试前端页面
- 刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）
- 确认没有 JavaScript 错误
- 确认 Agent Run 页面正常加载

## 预防措施

### 1. 数据库迁移检查
在每次部署前，检查数据库表结构是否与模型定义一致：
```bash
# 检查迁移状态
alembic current

# 查看待执行的迁移
alembic heads

# 执行迁移
alembic upgrade head
```

### 2. 端口配置统一
- 后端端口：8000（在 `backend/app/config/settings.py` 中配置）
- 前端开发服务器：5173（Vite 默认）
- 所有 WebSocket 连接应使用后端端口 8000

### 3. 多数据库文件管理
项目中存在多个数据库文件：
- `backend/open_adventure.db` - 主数据库（后端使用）
- `open_adventure.db` - 项目根目录（可能是旧版本）
- `frontend/open_adventure.db` - 前端目录（不应该存在）

建议：
- 只保留 `backend/open_adventure.db`
- 删除其他数据库文件
- 在 `.gitignore` 中添加 `*.db` 避免提交数据库文件

## 相关文件

- `backend/app/models/task.py` - Task 模型定义
- `backend/app/repositories/executions_repo.py` - Execution 仓储
- `backend/alembic/versions/a2be1393b6ef_add_agent_framework_and_plan_models.py` - 添加 result_data 的迁移
- `frontend/src/app/components/agent-test/ApiChatView.tsx` - API 聊天视图组件

## 总结

本次修复解决了三个主要问题：
1. ✅ 数据库缺失 `result_data` 列导致的 500 错误
2. ✅ WebSocket 端口配置错误导致的连接失败
3. ✅ 前端编译缓存导致的 JavaScript 错误

所有问题已修复，Agent Run 页面现在可以正常使用。
