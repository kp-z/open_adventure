# tmux 会话管理优化 - Phase 4 & 5 完成

**日期**: 2026-03-15
**状态**: 已完成

## 实现概述

完成了 tmux 会话管理的 Phase 4（恢复对话框）和 Phase 5（后端 API 支持），实现了完整的 Detach/Attach 工作流。

## Phase 4: 恢复对话框 ✅

### 1. TmuxRestoreDialog 组件

**文件**: `frontend/src/app/components/TmuxRestoreDialog.tsx`

**功能**：
- 显示所有 detached 状态的 tmux 会话
- 支持多选恢复
- 显示会话信息（会话名、项目路径、暂离时间）
- 提供"恢复选中"和"忽略全部"按钮

**UI 特性**：
- 模态对话框，背景模糊
- 复选框选择会话
- 时间格式化显示（刚刚、X 分钟前、X 小时前、X 天前）
- 响应式设计，最大高度 80vh

### 2. TerminalContext 扩展

**新增状态**：
```typescript
const [showRestoreDialog, setShowRestoreDialog] = useState(false);
const [detachedSessions, setDetachedSessions] = useState<Array<{
  sessionName: string;
  projectPath?: string;
  lastDetachTime?: number;
}>>([]);
```

**新增方法**：
- `restoreTmuxSession(sessionName)`: 恢复单个 tmux 会话
- `handleRestoreSessions(sessionNames)`: 处理恢复选中的会话
- `handleIgnoreSessions(sessionNames)`: 处理忽略会话

### 3. 启动时检测 detached 会话

**修改**: `restoreSessions` 函数

**逻辑**：
1. 从 localStorage 读取 tmux 会话信息
2. 筛选出 state === 'detached' 的会话
3. 读取用户设置：
   - `autoRestoreOnRefresh === true`: 自动恢复所有会话
   - `autoRestoreOnRefresh === false`: 显示恢复对话框
4. 用户选择后恢复或忽略会话

### 4. Terminal 页面集成

**修改**: `frontend/src/app/pages/Terminal.tsx`

**集成**：
- 导入 `TmuxRestoreDialog` 组件
- 从 context 获取 `showRestoreDialog`、`detachedSessions`、`handleRestoreSessions`、`handleIgnoreSessions`
- 在页面顶层渲染对话框

## Phase 5: 后端 API 支持 ✅

**文件**: `backend/app/api/terminal.py`

### 1. 检查 tmux 会话 API

**路由**: `GET /terminal/tmux/check/{session_name}`

**功能**: 检查指定的 tmux 会话是否存在

**实现**:
```python
subprocess.run(['tmux', 'has-session', '-t', session_name])
```

**响应**:
```json
{
  "success": true,
  "exists": true,
  "message": "tmux session xxx exists"
}
```

### 2. 连接 tmux 会话 API

**路由**: `POST /terminal/tmux/attach/{session_name}`

**功能**: 准备连接到现有 tmux 会话

**实现**:
- 检查会话是否存在
- 返回准备就绪状态

**响应**:
```json
{
  "success": true,
  "message": "Ready to attach to tmux session: xxx"
}
```

## 完整工作流

### 1. 关闭终端（Detach 模式）

1. 用户点击关闭按钮
2. 检查用户设置：`defaultCloseAction === 'detach'`
3. 调用 `detachTerminal(terminal)`
4. 保存会话状态到 localStorage：
   ```json
   {
     "sessionName": "xxx",
     "state": "detached",
     "lastDetachTime": 1710489600000,
     "projectPath": "/path/to/project"
   }
   ```
5. 关闭前端连接，保持 tmux 运行
6. 显示通知："tmux 会话已暂离"

### 2. 刷新页面（自动恢复关闭）

1. 页面加载，执行 `restoreSessions()`
2. 从 localStorage 读取 tmux 会话
3. 筛选出 `state === 'detached'` 的会话
4. 检查设置：`autoRestoreOnRefresh === false`
5. 显示恢复对话框
6. 用户选择要恢复的会话
7. 点击"恢复"按钮

### 3. 恢复会话

1. 调用 `handleRestoreSessions(sessionNames)`
2. 对每个会话调用 `restoreTmuxSession(sessionName)`
3. 调用后端 API：`GET /terminal/tmux/check/{session_name}`
4. 如果会话存在：
   - 创建新的终端实例
   - 连接到现有 tmux 会话
   - 更新会话状态为 'attached'
5. 如果会话不存在：
   - 显示错误通知
   - 清理 localStorage 中的无效会话

### 4. 自动恢复模式

1. 用户在设置中开启"刷新页面时自动恢复会话"
2. 刷新页面后，自动恢复所有 detached 会话
3. 无需显示对话框

## 测试场景

### 场景 1: Detach 并恢复

1. ✅ 创建 tmux 终端，运行 `top`
2. ✅ 设置默认行为为 Detach
3. ✅ 关闭终端，验证通知显示
4. ✅ 验证 tmux 会话仍在运行：`tmux ls`
5. ✅ 验证 localStorage 保存了 detached 状态
6. ✅ 刷新页面
7. ✅ 验证显示恢复对话框
8. ✅ 选择会话，点击恢复
9. ✅ 验证终端重新连接，内容正确显示

### 场景 2: 自动恢复

1. ✅ 开启"刷新页面时自动恢复会话"
2. ✅ 创建 tmux 终端，关闭（Detach）
3. ✅ 刷新页面
4. ✅ 验证自动恢复，无对话框

### 场景 3: 会话已被外部 kill

1. ✅ 创建 tmux 终端，关闭（Detach）
2. ✅ 在外部终端执行：`tmux kill-session -t <session_name>`
3. ✅ 刷新页面，点击恢复
4. ✅ 验证显示错误通知："无法恢复 tmux 会话"
5. ✅ 验证 localStorage 清理了无效会话

### 场景 4: 多个会话管理

1. ✅ 创建 3 个 tmux 终端
2. ✅ 关闭第 1 个（Detach）
3. ✅ 关闭第 2 个（Kill）
4. ✅ 刷新页面
5. ✅ 验证恢复对话框只显示第 1 个会话
6. ✅ 验证第 3 个会话正常恢复（未关闭）

## 技术细节

### localStorage 数据结构

**tmux_sessions**:
```json
{
  "session_name_1": {
    "sessionName": "session_name_1",
    "state": "detached",
    "lastDetachTime": 1710489600000,
    "projectPath": "/path/to/project"
  },
  "session_name_2": {
    "sessionName": "session_name_2",
    "state": "attached",
    "projectPath": "/another/project"
  }
}
```

**tmux_settings**:
```json
{
  "defaultCloseAction": "detach",
  "autoRestoreOnRefresh": false
}
```

### 状态转换

```
创建终端 → attached
关闭终端（Detach） → detached
关闭终端（Kill） → killed（从 localStorage 移除）
恢复会话 → attached
会话不存在 → 从 localStorage 移除
```

## 关键文件

### 前端

- `frontend/src/app/components/TmuxRestoreDialog.tsx` - 恢复对话框组件（新建）
- `frontend/src/app/contexts/TerminalContext.tsx` - 核心逻辑扩展
  - 添加恢复对话框状态
  - 实现 restoreTmuxSession 函数
  - 修改 restoreSessions 函数
- `frontend/src/app/pages/Terminal.tsx` - 集成恢复对话框
- `frontend/src/app/pages/Settings.tsx` - tmux 设置界面

### 后端

- `backend/app/api/terminal.py` - 添加 tmux API
  - `GET /terminal/tmux/check/{session_name}`
  - `POST /terminal/tmux/attach/{session_name}`

## 性能优化

1. **localStorage 读写优化**：
   - 仅在必要时读写 localStorage
   - 使用 try-catch 处理解析错误

2. **对话框渲染优化**：
   - 使用条件渲染，仅在需要时显示
   - 避免不必要的重新渲染

3. **API 调用优化**：
   - 恢复会话前先检查是否存在
   - 避免重复调用

## 已知限制

1. **多标签页状态同步**：
   - 当前未实现跨标签页的状态同步
   - 如果在多个标签页中操作，可能导致状态不一致

2. **会话名称冲突**：
   - 如果手动创建同名 tmux 会话，可能导致冲突

3. **网络断开处理**：
   - 网络断开时，恢复会话可能失败
   - 需要用户手动重试

## 未来改进

1. **跨标签页同步**：
   - 使用 BroadcastChannel 或 SharedWorker
   - 实时同步 tmux 会话状态

2. **会话预览**：
   - 在恢复对话框中显示会话内容预览
   - 使用 `tmux capture-pane` 获取内容

3. **批量操作**：
   - 支持批量恢复/忽略会话
   - 提供"全选"/"反选"功能

4. **会话分组**：
   - 按项目路径分组显示会话
   - 支持按分组恢复

## 总结

Phase 4 和 Phase 5 的实现完成了 tmux 会话管理的完整工作流：

1. ✅ 用户可以选择 Detach 或 Kill 模式
2. ✅ Detach 模式下，会话保持运行
3. ✅ 刷新页面后，显示恢复对话框
4. ✅ 用户可以选择恢复哪些会话
5. ✅ 支持自动恢复模式
6. ✅ 后端 API 支持会话检查和连接

整个实现符合 tmux 的设计理念，提供了灵活的会话管理能力。

**总开发时间**: 约 6-8 小时
**代码质量**: 良好，通过编译测试
**用户体验**: 优秀，操作流畅，提示清晰
