# tmux 会话管理优化 - 实现总结

**日期**: 2026-03-15
**状态**: Phase 1-3 已完成

## 实现概述

本次实现了 tmux 会话管理的基础功能，允许用户在关闭终端时选择"暂离（Detach）"或"退出（Kill）"模式，解决了刷新页面后无法恢复 tmux 会话的问题。

## 已完成功能

### 1. 基础设施（Phase 1）

**新增类型定义**：
- `TmuxSessionState`: 会话状态类型
- `TmuxSessionInfo`: 会话信息接口
- `TmuxSettings`: 用户设置接口

**localStorage 工具函数**：
- 会话状态管理（保存、读取、删除）
- 用户设置管理（保存、读取）

**移除 sessionStorage 依赖**：
- 移除了导致刷新后无法恢复的 sessionStorage 标记
- 改用 ref 控制恢复逻辑

### 2. 设置页面（Phase 2）

**新增设置选项**：
- 关闭终端时的默认行为（Detach/Kill）
- 刷新页面时自动恢复会话（开关）

**UI 实现**：
- 在设置页面添加"终端设置"部分
- 单选框选择默认关闭行为
- 复选框控制自动恢复

### 3. 关闭终端逻辑（Phase 3）

**detachTerminal 函数**：
- 保存会话状态到 localStorage
- 关闭前端连接但保持 tmux 运行
- 清理前端状态
- 显示通知提示用户

**修改关闭逻辑**：
- 根据用户设置选择 Detach 或 Kill
- Detach 模式：无需确认，直接暂离
- Kill 模式：显示确认对话框

## 使用方法

### 配置默认行为

1. 打开设置页面
2. 找到"终端设置"部分
3. 选择"关闭终端时的默认行为"：
   - **暂离（Detach）**：保持会话运行，可稍后恢复（推荐）
   - **退出（Kill）**：完全终止会话

### 关闭 tmux 终端

- **Detach 模式**：点击关闭按钮，会话暂离，显示通知
- **Kill 模式**：点击关闭按钮，显示确认对话框，确认后终止会话

### 恢复 tmux 会话（待实现）

- 刷新页面后，将显示恢复对话框（Phase 4）
- 可以选择恢复哪些暂离的会话

## 技术实现

### 数据存储

**localStorage 键**：
- `tmux_sessions`: 存储所有 tmux 会话状态
- `tmux_settings`: 存储用户设置

**数据结构**：
```typescript
// tmux_sessions
{
  "session_name": {
    sessionName: string;
    state: 'detached' | 'attached' | 'killed';
    lastDetachTime?: number;
    projectPath?: string;
  }
}

// tmux_settings
{
  defaultCloseAction: 'detach' | 'kill';
  autoRestoreOnRefresh: boolean;
}
```

### 关键函数

**TerminalContext.tsx**：
- `detachTerminal()`: 暂离终端
- `getTmuxSettings()`: 获取用户设置
- `saveTmuxSessionState()`: 保存会话状态

**Terminal.tsx**：
- `handleCloseTab()`: 修改后的关闭逻辑

## 待实现功能

### Phase 4: 恢复对话框

1. 创建 `TmuxRestoreDialog` 组件
2. 修改 `restoreSessions` 函数
3. 实现 `restoreTmuxSession` 函数
4. 处理自动恢复逻辑

### Phase 5: 后端支持（可选）

1. `/tmux/detach/{session_name}` API
2. `/tmux/attach/{session_name}` API

## 测试建议

### 基本功能测试

1. **Detach 模式测试**：
   - 设置默认行为为 Detach
   - 创建 tmux 终端，运行命令
   - 关闭终端，验证会话仍在运行
   - 检查 localStorage 中的会话状态

2. **Kill 模式测试**：
   - 设置默认行为为 Kill
   - 创建 tmux 终端
   - 关闭终端，验证确认对话框
   - 确认后验证会话被终止

3. **设置持久化测试**：
   - 修改设置
   - 刷新页面
   - 验证设置保持不变

### 边界情况测试

1. 非 tmux 终端关闭
2. tmux 会话已被外部 kill
3. localStorage 数据损坏
4. 多个 tmux 会话同时管理

## 已知问题

1. **刷新页面后无法恢复会话**：需要实现 Phase 4 的恢复对话框
2. **多标签页状态同步**：当前未实现跨标签页的状态同步

## 文件清单

### 修改的文件

- `frontend/src/app/contexts/TerminalContext.tsx`
  - 添加类型定义和工具函数
  - 实现 detachTerminal 函数
  - 移除 sessionStorage 依赖

- `frontend/src/app/pages/Terminal.tsx`
  - 修改 handleCloseTab 函数
  - 添加 getTmuxSettings 和 detachTerminal 调用

- `frontend/src/app/pages/Settings.tsx`
  - 添加 tmux 设置状态
  - 添加"终端设置"UI 部分
  - 实现设置保存和读取

### 新增的文件

- `docs/technical/20260315-tmux-session-management.md` - 实现记录
- `docs/technical/20260315-tmux-implementation-summary.md` - 本文档

## 下一步计划

1. 实现 TmuxRestoreDialog 组件（2-3 小时）
2. 集成恢复对话框到启动流程（1-2 小时）
3. 完整测试 Detach/Attach 流程（1 小时）
4. 处理边界情况和错误恢复（1-2 小时）

**预计完成时间**：5-8 小时

## 参考资料

- 原始计划文档：`/Users/kp/.claude/projects/-Users-kp----Proj-claude-manager/249c8039-9a54-4319-8ec1-c82bae746faf.jsonl`
- tmux 官方文档：https://github.com/tmux/tmux/wiki
