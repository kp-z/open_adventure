# Terminal Tmux 连接优化实施总结

**创建日期**: 2026-03-19
**状态**: 已完成

## 概述

本次优化解决了 Terminal 页面在使用 tmux 时的用户体验问题，实现了 detach/attach 模式，使得用户可以在关闭页面后保持 tmux session 运行，并在重新打开页面时恢复连接。

## 核心问题

**原问题**: 关闭页面时会自动断开并 **kill** tmux session，而不是 detach（暂离）

**影响**:
- 用户关闭浏览器标签页后，tmux session 被完全销毁
- 无法在多设备间切换使用同一个 terminal session
- 页面刷新会导致 session 丢失
- 不符合 tmux 的设计理念（detach/attach 模式）

## 实施内容

### 1. 后端改造

#### 1.1 添加 detach 方法到 TerminalSession 类

**文件**: `backend/app/api/terminal.py`

```python
@staticmethod
def detach_tmux_session(session_name: str) -> bool:
    """Detach from tmux session without killing it"""
    try:
        import subprocess
        # 检查 tmux session 是否存在
        result = subprocess.run(
            ['tmux', 'has-session', '-t', session_name],
            capture_output=True
        )
        if result.returncode == 0:
            print(f"[Terminal] tmux session {session_name} exists and will remain running")
            return True
        else:
            print(f"[Terminal] tmux session {session_name} does not exist")
            return False
    except Exception as e:
        print(f"[Terminal] Error checking tmux session: {e}")
        return False

def detach(self):
    """Detach from terminal session without killing it"""
    print(f"[Terminal] Detaching from session {self.session_id}")
    self.websocket = None

    # 如果使用 tmux，保持 tmux session 运行
    if self.use_tmux and self.tmux_session_name:
        print(f"[Terminal] Detaching from tmux session: {self.tmux_session_name}")
        # tmux session 会自动保持运行，不需要额外操作
        # 只需要断开 WebSocket 连接即可
    else:
        # 非 tmux session，保持 PTY 进程运行
        print(f"[Terminal] Detaching from PTY session (PID: {self.pid})")
```

#### 1.2 添加 detach endpoint

**Endpoint**: `POST /terminal/sessions/{session_id}/detach`

功能:
- Detach from terminal session without killing it
- 更新 execution 记录，标记为 detached 状态
- 广播 detach 事件到 WebSocket 监控通道

#### 1.3 添加 detached sessions 列表 endpoint

**Endpoint**: `GET /terminal/sessions/detached`

功能:
- 列出所有 detached 的 terminal sessions
- 包含详细信息：session_id, tmux_session_name, project_path, created_at, last_activity 等
- 如果有 execution_id，获取更多信息（execution_id, task_id, detach_time）

#### 1.4 WebSocket 断开逻辑

**已有实现**: WebSocket 的 finally 块已经只断开 WebSocket 而不关闭 session

```python
finally:
    # Clean up - 只断开 WebSocket，不关闭 session
    print(f"[Terminal] WebSocket disconnected for session {session_id}...")
    if session_id in sessions:
        session = sessions[session_id]
        session.websocket = None  # 断开 WebSocket 连接
        print(f"[Terminal] Session {session_id} WebSocket disconnected, but session kept alive")
```

### 2. 前端改造

#### 2.1 改造 closeTerminal 函数

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`

**改动**:
- 添加 `action` 参数：`'detach' | 'kill'`，默认为 `'detach'`
- 根据 action 决定是 detach 还是 kill tmux session
- Detach 时调用后端的 `/sessions/{session_id}/detach` endpoint
- 保存 detached 状态到 localStorage
- 显示通知提示用户 session 仍在后台运行

```typescript
const closeTerminal = async (id: string, action: 'detach' | 'kill' = 'detach') => {
  const terminal = terminals.find((item) => item.id === id);
  if (!terminal) {
    return;
  }

  // 如果使用 tmux，根据 action 决定是 detach 还是 kill
  if (terminal.useTmux && terminal.tmuxSessionName) {
    if (action === 'detach') {
      // 调用 detach endpoint
      const response = await fetch(`${API_CONFIG.BASE_URL}/terminal/sessions/${terminal.sessionId}/detach`, {
        method: 'POST'
      });
      // 保存 detached 状态到 localStorage
      saveTmuxSessionState(terminal.tmuxSessionName, {
        sessionName: terminal.tmuxSessionName,
        state: 'detached',
        lastDetachTime: Date.now(),
        projectPath: terminal.projectName
      });
    } else {
      // Kill tmux session
      await killTmuxSession(terminal.tmuxSessionName);
      removeTmuxSessionState(terminal.tmuxSessionName);
    }
  }
  // ... 其他清理逻辑
}
```

#### 2.2 页面卸载时自动 detach

**实现**: 添加 `beforeunload` 事件监听

```typescript
useEffect(() => {
  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    console.log('[TerminalContext] Page unloading, detaching tmux sessions...');

    // 遍历所有使用 tmux 的 terminal
    for (const terminal of terminals) {
      if (terminal.useTmux && terminal.tmuxSessionName && terminal.sessionId) {
        // 使用 fetch with keepalive 选项（确保请求在页面卸载后仍能完成）
        fetch(`${API_CONFIG.BASE_URL}/terminal/sessions/${terminal.sessionId}/detach`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // 保存 detached 状态到 localStorage
        saveTmuxSessionState(terminal.tmuxSessionName, {
          sessionName: terminal.tmuxSessionName,
          state: 'detached',
          lastDetachTime: Date.now(),
          projectPath: terminal.projectName
        });
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [terminals]);
```

#### 2.3 页面加载时检测并恢复 detached sessions

**已有实现**: `restoreSessions` 函数已经实现了恢复逻辑

功能:
- 从 localStorage 读取 detached sessions
- 根据 `autoRestoreOnRefresh` 设置决定是自动恢复还是显示对话框
- 使用 `TmuxRestoreDialog` 组件让用户选择要恢复的 sessions

#### 2.4 localStorage 持久化

**已有实现**:
- `getTmuxSessionsFromStorage()`: 从 localStorage 读取 tmux sessions
- `saveTmuxSessionState()`: 保存 tmux session 状态到 localStorage
- `removeTmuxSessionState()`: 从 localStorage 移除 tmux session 状态

**存储格式**:
```typescript
interface TmuxSessionInfo {
  sessionName: string;
  state: TmuxSessionState;  // 'detached' | 'attached' | 'killed'
  lastDetachTime?: number;
  projectPath?: string;
}
```

### 3. UI 组件

#### 3.1 TmuxRestoreDialog

**文件**: `frontend/src/app/components/TmuxRestoreDialog.tsx`

**已有实现**: 恢复对话框组件

功能:
- 显示所有 detached sessions 的列表
- 支持多选恢复
- 显示 session 信息：session name, project path, detach time
- 提供"恢复全部"和"忽略全部"按钮

## 验证测试

### 测试场景 1: 页面刷新
1. 打开 Terminal 页面，创建一个 tmux session
2. 在 terminal 中运行一个长时间任务（如 `sleep 300`）
3. 刷新页面
4. **预期**: 页面重新加载后，显示恢复对话框，可以重新连接到之前的 session
5. **验证**: `sleep` 命令仍在运行

### 测试场景 2: 用户主动关闭
1. 打开 Terminal，创建 tmux session
2. 点击关闭按钮
3. **预期**: 默认执行 detach 操作（当前实现）
4. **验证**: terminal 标签页关闭，但 tmux session 仍在运行
5. 重新打开 Terminal
6. **验证**: 可以恢复之前的 session

### 测试场景 3: 页面关闭
1. 打开 Terminal，创建 tmux session
2. 直接关闭浏览器标签页
3. **预期**: tmux session 自动 detach
4. 重新打开页面
5. **验证**: 可以恢复之前的 session

## 后续优化建议

### P1（重要）
1. **添加关闭确认对话框**: 在用户点击关闭按钮时，显示对话框询问是 Detach 还是 Kill
2. **多设备支持**: 允许多个浏览器窗口连接到同一个 tmux session（需要后端支持多个 WebSocket 连接）
3. **显示连接状态**: 在 UI 上显示当前有多少个设备连接到这个 session

### P2（可选）
4. **自动清理过期 session**: 清理 7 天前的 detached sessions
5. **Session 管理页面**: 提供一个专门的页面管理所有 detached sessions
6. **Session 重命名**: 允许用户重命名 tmux session

## 技术要点

1. **使用 `fetch` with `keepalive` 选项**: 确保在页面卸载时，detach 请求仍能完成
2. **localStorage 持久化**: 保存 detached sessions 信息，跨页面刷新保持
3. **默认 detach 行为**: 关闭 terminal 时默认使用 detach，而不是 kill
4. **WebSocket 断开不等于 session 关闭**: 后端只断开 WebSocket 连接，保持 PTY 和 tmux session 运行

## 相关文件

### 后端
- `backend/app/api/terminal.py` - Terminal WebSocket endpoint 和 session 管理

### 前端
- `frontend/src/app/contexts/TerminalContext.tsx` - Terminal 上下文和状态管理
- `frontend/src/app/pages/Terminal.tsx` - Terminal 页面
- `frontend/src/app/components/TmuxRestoreDialog.tsx` - Tmux 恢复对话框

## 总结

本次优化成功实现了 Terminal Tmux 连接的 detach/attach 模式，解决了页面关闭时 tmux session 被销毁的问题。用户现在可以：

1. 关闭页面后保持 tmux session 运行
2. 刷新页面后自动恢复连接
3. 在多设备间切换使用同一个 terminal session（后续优化）

这大大提升了 Terminal 的用户体验，使其更符合 tmux 的设计理念。
