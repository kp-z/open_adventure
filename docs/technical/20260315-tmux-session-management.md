# tmux 会话管理优化实现记录

**创建日期**: 2026-03-15
**状态**: 部分完成

## 已完成功能

### Phase 1: 基础设施 ✅

1. **添加类型定义**
   - `TmuxSessionState`: 'detached' | 'attached' | 'killed'
   - `TmuxSessionInfo`: 会话信息接口
   - `TmuxSettings`: 用户设置接口

2. **localStorage 工具函数**
   - `getTmuxSessionsFromStorage()`: 读取会话信息
   - `saveTmuxSessionState()`: 保存会话状态
   - `removeTmuxSessionState()`: 删除会话状态
   - `getTmuxSettings()`: 读取用户设置
   - `saveTmuxSettings()`: 保存用户设置

3. **移除 sessionStorage 恢复标记**
   - 移除了 `sessionStorage.setItem('terminal_restore_completed', 'true')`
   - 改用 `hasRestoredRef` 控制恢复逻辑

### Phase 2: 设置页面 ✅

1. **添加 tmux 设置状态**
   - `tmuxSettings` state
   - `handleTmuxSettingsChange()` 函数

2. **UI 界面**
   - 添加"终端设置"部分
   - 关闭终端时的默认行为（Detach/Kill）单选框
   - 刷新页面时自动恢复会话开关

### Phase 3: 关闭终端逻辑 ✅

1. **实现 detachTerminal 函数**
   - 保存 detached 状态到 localStorage
   - 关闭前端连接但不 kill tmux
   - 清理前端状态
   - 显示通知提示用户

2. **修改 handleCloseTab 逻辑**
   - 根据用户设置选择 Detach 或 Kill
   - Detach 模式：直接调用 detachTerminal
   - Kill 模式：显示确认对话框后终止会话

## 待实现功能

### Phase 4: 恢复对话框 ⏳

1. **创建 TmuxRestoreDialog 组件**
   - 显示 detached 会话列表
   - 支持多选恢复
   - 提供"恢复选中"和"忽略全部"按钮

2. **集成恢复对话框到启动流程**
   - 修改 `restoreSessions` 函数
   - 检测 detached 会话
   - 根据设置选择自动恢复或显示对话框
   - 实现 `restoreTmuxSession` 函数

### Phase 5: 后端支持（可选）⏳

1. **添加 tmux detach/attach API**
   - `/tmux/detach/{session_name}` - 标记会话为 detached
   - `/tmux/attach/{session_name}` - 检查会话是否可连接

## 测试计划

### 测试场景 1：默认 Detach 行为

1. 确保设置中"关闭终端时的默认行为"为 Detach
2. 创建一个 tmux 终端
3. 运行一些命令（如 `top`）
4. 点击关闭按钮
5. 验证：
   - ✅ 终端标签页关闭
   - ✅ tmux 会话仍在运行（`tmux ls` 可见）
   - ✅ localStorage 中保存了 detached 状态
   - ✅ 显示通知提示会话已暂离

### 测试场景 2：设置切换为 Kill

1. 在设置中将"关闭终端时的默认行为"改为 Kill
2. 创建一个 tmux 终端
3. 点击关闭按钮
4. 验证：
   - ✅ 显示确认对话框
   - ✅ 确认后终端标签页关闭
   - ✅ tmux 会话被终止（`tmux ls` 不显示）
   - ✅ localStorage 中移除了会话信息

### 测试场景 3：刷新页面后显示恢复对话框（待实现）

1. 确保设置中"刷新页面时自动恢复会话"为关闭
2. 创建一个 tmux 终端
3. 关闭终端（Detach）
4. 刷新页面
5. 验证：
   - ⏳ 显示恢复对话框
   - ⏳ 列出 detached 会话信息
   - ⏳ 可以选择恢复或忽略

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

### 关键文件

- `frontend/src/app/contexts/TerminalContext.tsx` - 核心逻辑
- `frontend/src/app/pages/Terminal.tsx` - 关闭终端逻辑
- `frontend/src/app/pages/Settings.tsx` - 设置界面

## 下一步

1. 实现 TmuxRestoreDialog 组件
2. 修改 restoreSessions 函数，集成恢复对话框
3. 测试完整的 Detach/Attach 流程
4. 处理边界情况（会话已被外部 kill 等）

## 注意事项

- 当前实现已支持基本的 Detach 功能
- 刷新页面后暂时无法恢复会话（需要实现恢复对话框）
- 用户可以在设置中切换 Detach/Kill 模式
- 所有设置保存在 localStorage，跨页面持久化
