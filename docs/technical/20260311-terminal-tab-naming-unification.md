# Terminal Tab 命名统一实现

**创建日期**: 2026-03-11
**作者**: Claude Opus 4.6
**状态**: 已完成

## 概述

统一 Terminal 页面中不同方式打开的终端命名规则，使用 `project_name(claude_code_id)` 格式，并支持 hover 显示完整信息。

## 需求

1. **统一命名格式**: 所有终端 tab 使用 `project_name(claude_code_id)` 格式
2. **持久化命名**: 重新加载时命名保持不变
3. **信息展示**: hover 或移动端点击显示完整信息（项目名、Claude Code ID、Session ID）

## 实现方案

### 1. 后端修改

#### 1.1 添加 `claude_code_id` 字段到 `/terminal/status` 接口

**文件**: `backend/app/api/terminal.py`

```python
active_sessions.append({
    "session_id": session_id,
    "pid": session.pid,
    "running": session.running,
    "process_alive": session.is_process_alive(),
    "initial_dir": session.initial_dir,
    "claude_code_id": session.claude_resume_session,  # 新增字段
    "created_at": session.created_at.isoformat(),
    "last_activity": session.last_activity.isoformat(),
})
```

### 2. 前端修改

#### 2.1 更新 `TerminalInstance` 接口

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`

已有字段：
```typescript
export interface TerminalInstance {
  id: string;
  term: XTerm;
  ws: WebSocket;
  fitAddon: FitAddon;
  serializeAddon: SerializeAddon;
  title: string;
  sessionId?: string;
  claudeCodeId?: string;  // Claude Code 的 session ID
  projectName?: string;    // 项目名称
  // ... 其他字段
}
```

#### 2.2 更新 `getTerminalTitle` 函数

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`

```typescript
const getTerminalTitle = (projectPath?: string, claudeCodeId?: string): string => {
  let projectName = '';
  if (projectPath) {
    const pathParts = projectPath.split('/').filter((p) => p);
    projectName = pathParts[pathParts.length - 1] || '';
  }

  if (!projectName) {
    projectName = `Terminal ${terminalCounterRef.current++}`;
  }

  // 如果有 Claude Code ID，使用 "project_name(claude_code_id)" 格式
  if (claudeCodeId) {
    const shortId = claudeCodeId.slice(0, 8);
    return `${projectName}(${shortId})`;
  }

  return projectName;
};
```

#### 2.3 更新 `fetchActiveSessions` 函数

传入 `claude_code_id` 参数到 `getTerminalTitle`：

```typescript
return activeSessions.map((session: any) => {
  const title = getTerminalTitle(session.initial_dir, session.claude_code_id);
  return {
    id: `terminal-restored-${session.session_id}`,
    sessionId: session.session_id,
    claudeCodeId: session.claude_code_id,
    title,
  };
});
```

#### 2.4 更新 `restoreClaudeConversation` 函数

恢复 Claude 会话时传入 `sessionId` 作为 `claudeCodeId`：

```typescript
const claudeStatus = await checkClaudeStatus(sessionId);
const title = getTerminalTitle(claudeStatus.initial_dir || undefined, sessionId);
```

#### 2.5 更新 `initTerminal` 函数

保存 `claudeCodeId` 和 `projectName` 到 terminal 实例：

```typescript
const terminal: TerminalInstance = {
  id,
  term,
  ws,
  fitAddon,
  serializeAddon,
  title,
  sessionId: restoreSessionId,
  claudeCodeId: claudeResumeSession,  // 保存 Claude Code 的 session ID
  projectName: projectPath ? projectPath.split('/').filter(p => p).pop() : undefined,
  // ... 其他字段
};
```

#### 2.6 添加 Tooltip 显示完整信息

**文件**: `frontend/src/app/pages/Terminal.tsx`

```typescript
{terminals.map(terminal => {
  // 构建 tooltip 内容
  const tooltipLines = [];
  if (terminal.projectName) {
    tooltipLines.push(`项目: ${terminal.projectName}`);
  }
  if (terminal.claudeCodeId) {
    tooltipLines.push(`Claude Code ID: ${terminal.claudeCodeId}`);
  }
  if (terminal.sessionId) {
    tooltipLines.push(`Session ID: ${terminal.sessionId}`);
  }
  const tooltipText = tooltipLines.length > 0 ? tooltipLines.join('\n') : terminal.title;

  return (
    <button
      type="button"
      key={terminal.id}
      onClick={() => handleActivateTerminal(terminal.id)}
      title={tooltipText}  // 添加 tooltip
      className={/* ... */}
    >
      <span className="truncate text-xs sm:text-sm">{terminal.title}</span>
      {/* ... */}
    </button>
  );
})}
```

## 命名规则

### 格式说明

- **普通终端**: `project_name` (如果没有项目路径，则为 `Terminal N`)
- **Claude Code 会话**: `project_name(claude_code_id_short)` (claude_code_id 取前 8 位)

### 示例

1. 普通终端：`claude_manager`
2. Claude Code 会话：`claude_manager(a1b2c3d4)`
3. 无项目路径：`Terminal 1`

## Tooltip 信息

Hover 或移动端点击 tab 时显示：

```
项目: claude_manager
Claude Code ID: a1b2c3d4-5678-90ab-cdef-1234567890ab
Session ID: terminal-session-123
```

## 测试验证

### 测试场景

1. **创建新终端**
   - 打开 Terminal 页面
   - 点击 "New Terminal" 按钮
   - 验证 tab 名称为项目名称

2. **恢复 Claude Code 会话**
   - 打开 Terminal 页面
   - 点击 "Resume Claude Session" 按钮
   - 选择一个会话
   - 验证 tab 名称为 `project_name(claude_code_id)`

3. **重新加载页面**
   - 刷新页面
   - 验证所有 tab 名称保持不变

4. **Hover 显示信息**
   - 鼠标悬停在 tab 上
   - 验证显示完整的项目名、Claude Code ID、Session ID

## 注意事项

1. **Claude Code ID 截断**: 为了保持 tab 名称简洁，Claude Code ID 只显示前 8 位
2. **Tooltip 兼容性**: 使用原生 `title` 属性，兼容所有浏览器
3. **移动端支持**: 移动端点击 tab 也会显示 tooltip（部分浏览器支持）

## 相关文件

- `backend/app/api/terminal.py` - 后端 Terminal API
- `frontend/src/app/contexts/TerminalContext.tsx` - Terminal Context
- `frontend/src/app/pages/Terminal.tsx` - Terminal 页面

## 后续优化

1. 考虑使用自定义 Tooltip 组件，提供更好的移动端体验
2. 支持用户自定义 tab 名称
3. 添加 tab 名称编辑功能
