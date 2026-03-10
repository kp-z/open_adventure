# Terminal Tab 命名统一

**创建日期**: 2026-03-10
**状态**: 已完成

## 问题描述

Terminal 页面的 tab 命名不一致：
- 新建终端：使用 project 名称（如 `claude_manager`）
- Resume 会话：使用 `Claude Resume {session_id}`
- 重连终端：保持原有名称（可能不一致）
- 恢复 session：使用 `Terminal 1`, `Terminal 2` 等

## 解决方案

统一所有场景的命名规则，始终使用 project 名称作为 tab 标题。

### 实现细节

#### 1. 后端 API 增强

**文件**: `backend/app/api/terminal.py`

在 `/terminal/session/{session_id}/claude-status` API 中添加 `initial_dir` 字段：

```python
return JSONResponse({
    "running": claude_running,
    "session_exists": True,
    "process_alive": session.is_process_alive(),
    "claude_resume_session": session.claude_resume_session,
    "initial_dir": session.initial_dir,  # 新增
})
```

#### 2. 前端统一命名逻辑

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`

添加统一的 title 生成函数：

```typescript
const getTerminalTitle = (projectPath?: string): string => {
  if (projectPath) {
    const pathParts = projectPath.split('/').filter((p) => p);
    return pathParts[pathParts.length - 1] || `Terminal ${terminalCounterRef.current++}`;
  }
  return `Terminal ${terminalCounterRef.current++}`;
};
```

#### 3. 各场景使用统一逻辑

**新建终端** (`createTerminal`):
```typescript
const title = getTerminalTitle(projectPath);
```

**恢复 session** (`fetchActiveSessions`):
```typescript
const title = getTerminalTitle(session.initial_dir);
```

**Resume Claude 会话** (`restoreClaudeConversation`):
```typescript
const claudeStatus = await checkClaudeStatus(sessionId);
const title = getTerminalTitle(claudeStatus.initial_dir || undefined);
```

**重连终端** (`reconnectTerminal`):
- 保持原有的 `terminal.title`，不修改

## 效果

现在所有 Terminal tab 的命名都保持一致：
- 如果有 project path，显示 project 名称（如 `claude_manager`）
- 如果没有 project path，显示 `Terminal 1`, `Terminal 2` 等

无论是新建、恢复、resume 还是重连，命名规则都完全一致。

## 相关文件

- `backend/app/api/terminal.py` - 后端 API
- `frontend/src/app/contexts/TerminalContext.tsx` - 前端终端上下文
