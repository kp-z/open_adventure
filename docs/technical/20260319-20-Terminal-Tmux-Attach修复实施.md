# Terminal Tmux Session 恢复时 Claude 进程丢失修复实施总结

**创建日期**: 2026-03-19
**状态**: 已完成

## 问题描述

恢复 tmux session 时，原有的 Claude 进程丢失，用户看到的是新的空 shell。

### 根本原因

1. **前端没有传递 tmux session 名称**
   - `restoreTmuxSession()` 调用 `createTerminal()` 时，只传递了 `projectPath` 和 `autoStartClaude=false`
   - `createTerminal()` 函数签名不支持 `tmuxSessionName` 参数
   - WebSocket URL 缺少 `tmux_session_name` 参数

2. **后端没有接收 tmux session 名称**
   - `terminal_websocket` 没有 `tmux_session_name` 参数
   - `TerminalSession.__init__()` 没有 `tmux_session_name` 参数

3. **后端始终创建新 session**
   - `TerminalSession.start()` 始终调用 `create_tmux_session()` 创建新会话
   - 没有逻辑判断是否应该 attach 到现有 session
   - 即使 tmux session 存在，也会创建新的（名称递增）

## 实施方案

### 1. 前端改造

#### 1.1 修改 `createTerminal()` 函数签名

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`
**位置**: 约 1488 行

**改动**:
```typescript
const createTerminal = (
  projectPath?: string,
  autoStartClaude?: boolean,
  tmuxSessionName?: string  // 🔧 新增：tmux session 名称参数
): TerminalInstance | null => {
  // ...
  const terminal = initTerminal({
    id,
    title,
    projectPath,
    autoStartClaude,
    tmuxSessionName,  // 🔧 新增：传递 tmux session 名称
    mode: 'create'
  });
  // ...
};
```

#### 1.2 修改 `initTerminal()` 函数

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`
**位置**: 约 430 行

**改动**:
```typescript
const initTerminal = useCallback((options: {
  id: string;
  title: string;
  projectPath?: string;
  autoStartClaude?: boolean;
  restoreSessionId?: string;
  claudeResumeSession?: string;
  useTmux?: boolean;
  tmuxSessionName?: string;  // 🔧 新增：tmux session 名称
  mode: 'create' | 'restore';
  onSettled?: (state: 'open' | 'error' | 'close') => void;
}): TerminalInstance => {
  const {
    id,
    title,
    projectPath,
    autoStartClaude,
    restoreSessionId,
    claudeResumeSession,
    useTmux = true,
    tmuxSessionName,  // 🔧 新增
    mode,
    onSettled
  } = options;

  // ... 构建 WebSocket URL ...
  if (tmuxSessionName) {
    params.append('tmux_session_name', tmuxSessionName);
    console.log('[TerminalContext] Adding tmux_session_name to WebSocket URL:', tmuxSessionName);
  }
  // ...
});
```

#### 1.3 修改 `restoreTmuxSession()` 函数

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`
**位置**: 约 1643 行

**改动**:
```typescript
const restoreTmuxSession = useCallback(async (sessionName: string): Promise<void> => {
  // ...
  // 🔧 关键修复：传递 tmux session 名称给 createTerminal
  const terminal = createTerminal(
    sessionInfo?.projectPath,
    false,  // autoStartClaude = false，因为 Claude 已经在 tmux session 中运行
    sessionName  // 🔧 新增：传递 tmux session 名称
  );
  // ...
}, [createTerminal, getTmuxSessionsFromStorage, saveTmuxSessionState]);
```

### 2. 后端改造

#### 2.1 修改 `terminal_websocket` 函数签名

**文件**: `backend/app/api/terminal.py`
**位置**: 约 576 行

**改动**:
```python
@router.websocket("/ws")
async def terminal_websocket(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    project_path: str = None,
    session_id: str = None,
    auto_start_claude: bool = False,
    claude_resume_session: str = None,
    use_tmux: bool = True,
    tmux_session_name: str = None  # 🔧 新增：tmux session 名称参数
):
    # ...
    print(f"[Terminal] Tmux session name param: {tmux_session_name}")  # 🔧 新增日志
    # ...
```

#### 2.2 修改 `TerminalSession.__init__()` 方法

**文件**: `backend/app/api/terminal.py`
**位置**: 约 38 行

**改动**:
```python
def __init__(
    self,
    session_id: str,
    initial_dir: Optional[str] = None,
    auto_start_claude: bool = False,
    claude_resume_session: Optional[str] = None,
    use_tmux: bool = True,
    tmux_session_name: Optional[str] = None  # 🔧 新增：tmux session 名称参数
):
    # ...
    self.tmux_session_name = tmux_session_name  # 🔧 修改：接收传入的 tmux session 名称
    # ...
```

#### 2.3 修改创建新 session 的代码

**文件**: `backend/app/api/terminal.py`
**位置**: 约 671 行

**改动**:
```python
session = TerminalSession(
    session_id=session_id,
    initial_dir=initial_dir,
    auto_start_claude=auto_start_claude,
    claude_resume_session=claude_resume_session,
    use_tmux=use_tmux,
    tmux_session_name=tmux_session_name  # 🔧 新增：传递 tmux session 名称
)
```

#### 2.4 修改 `TerminalSession.start()` 方法

**文件**: `backend/app/api/terminal.py`
**位置**: 约 272 行

**改动**:
```python
def start(self):
    """Start a new PTY session"""
    print(f"[Terminal] Starting new PTY session (use_tmux={self.use_tmux}, tmux_session_name={self.tmux_session_name})...")

    if self.use_tmux:
        if not self.check_tmux_installed():
            print("[Terminal] tmux not installed, falling back to pty")
            self.use_tmux = False
        else:
            # 🔧 关键修复：判断是创建新 session 还是 attach 到现有 session
            if self.tmux_session_name:
                # 如果指定了 tmux session 名称，检查是否存在
                if self.tmux_session_exists(self.tmux_session_name):
                    print(f"[Terminal] ✅ Attaching to existing tmux session: {self.tmux_session_name}")
                    # 不需要创建新 session，直接使用现有的
                else:
                    print(f"[Terminal] ⚠️ Specified tmux session '{self.tmux_session_name}' does not exist")
                    print(f"[Terminal] Creating new tmux session instead")
                    # 指定的 session 不存在，创建新的
                    self.tmux_session_name = self.create_tmux_session()
                    if not self.tmux_session_name:
                        print("[Terminal] Failed to create tmux session, falling back to pty")
                        self.use_tmux = False
            else:
                # 没有指定 session 名称，创建新的
                self.tmux_session_name = self.create_tmux_session()
                if not self.tmux_session_name:
                    print("[Terminal] Failed to create tmux session, falling back to pty")
                    self.use_tmux = False

    # ... 后续 PTY fork 逻辑 ...
    if self.use_tmux and self.tmux_session_name:
        # 连接到 tmux 会话（无论是新创建的还是现有的）
        print(f"[Terminal] Child process - Attaching to tmux session: {self.tmux_session_name}")
        os.execvp('tmux', ['tmux', 'attach', '-t', self.tmux_session_name])
    # ...
```

## 关键技术要点

### 1. 参数传递链路

**前端**:
```
restoreTmuxSession(sessionName)
  ↓
createTerminal(projectPath, false, sessionName)
  ↓
initTerminal({ tmuxSessionName })
  ↓
WebSocket URL: ?tmux_session_name=xxx
```

**后端**:
```
terminal_websocket(tmux_session_name)
  ↓
TerminalSession(tmux_session_name)
  ↓
start() 判断是否 attach
```

### 2. Attach vs Create 判断逻辑

```python
if self.tmux_session_name:
    if self.tmux_session_exists(self.tmux_session_name):
        # Attach 到现有 session
    else:
        # 指定的 session 不存在，创建新的
else:
    # 没有指定 session，创建新的
```

### 3. 向后兼容性

- 如果 `tmux_session_name` 为 `None`，行为与之前完全一致
- 现有的创建新 terminal 的流程不受影响
- 只有在恢复 tmux session 时才传递 session 名称

### 4. 错误处理

- 如果指定的 tmux session 不存在，后端会创建新的 session
- 前端在调用 `restoreTmuxSession()` 前先检查 session 是否存在
- 后端记录详细的日志，便于调试

## 验证方案

### 测试场景 1：基本 Attach 测试
1. 打开 Terminal 页面，创建一个 tmux session
2. 在 terminal 中启动 Claude Code CLI：`claude`
3. 在 Claude 中执行一些命令，如 `ls -la`
4. 点击 Detach 按钮，断开连接
5. 刷新页面
6. 在恢复对话框中选择恢复 tmux session
7. **预期**：
   - 终端恢复到原有的 tmux session
   - Claude Code CLI 仍在运行
   - 之前的命令历史和输出都可见
   - 可以继续在 Claude 中执行命令

### 测试场景 2：多个 Tmux Session 测试
1. 创建第一个 terminal，启动 Claude，执行一些命令
2. Detach 第一个 terminal
3. 创建第二个 terminal，启动 Claude，执行不同的命令
4. Detach 第二个 terminal
5. 刷新页面
6. 恢复第一个 tmux session
7. **预期**：恢复到第一个 session，看到第一个 session 的内容
8. Detach 第一个 session
9. 恢复第二个 tmux session
10. **预期**：恢复到第二个 session，看到第二个 session 的内容

### 测试场景 3：Session 不存在的容错测试
1. 手动删除一个 tmux session：`tmux kill-session -t oa_abc123`
2. 尝试恢复该 session
3. **预期**：
   - 后端检测到 session 不存在
   - 创建新的 tmux session
   - 用户看到新的空 shell（而不是报错）

### 测试场景 4：向后兼容测试
1. 创建一个新的 terminal（不指定 tmux session 名称）
2. **预期**：
   - 后端创建新的 tmux session
   - 正常启动 shell 或 Claude
   - 不影响现有功能

### 测试场景 5：长时间运行任务恢复
1. 在 terminal 中启动 Claude
2. 在 Claude 中运行一个长时间任务：`for i in {1..1000}; do echo "Line $i"; sleep 0.5; done`
3. 在任务运行中途 Detach
4. 等待一段时间（如 30 秒）
5. 恢复 tmux session
6. **预期**：
   - 任务仍在运行
   - 可以看到任务的最新输出
   - 任务继续执行直到完成

## 修改文件清单

### 前端
- `frontend/src/app/contexts/TerminalContext.tsx`
  - `createTerminal()` 函数（约 1488 行）
  - `initTerminal()` 函数（约 430 行）
  - `restoreTmuxSession()` 函数（约 1643 行）

### 后端
- `backend/app/api/terminal.py`
  - `terminal_websocket` 函数（约 576 行）
  - `TerminalSession.__init__()` 方法（约 38 行）
  - `TerminalSession.start()` 方法（约 272 行）
  - 创建新 session 的代码（约 671 行）

## 实施状态

✅ 所有核心修改已完成
- ✅ 前端 `createTerminal()` 添加 `tmuxSessionName` 参数
- ✅ 前端 `initTerminal()` 添加 `tmuxSessionName` 参数并构建 URL
- ✅ 前端 `restoreTmuxSession()` 传递 session 名称
- ✅ 后端 `terminal_websocket` 添加 `tmux_session_name` 参数
- ✅ 后端 `TerminalSession.__init__()` 添加 `tmux_session_name` 参数
- ✅ 后端 `TerminalSession.start()` 添加 attach 逻辑

## 下一步

1. 重启前后端服务，测试修复效果
2. 执行上述 5 个测试场景
3. 验证日志输出是否符合预期
4. 如有问题，根据日志进行调试

## 注意事项

1. **向后兼容**：不影响现有的创建新 terminal 的流程
2. **错误处理**：如果指定的 session 不存在，应该创建新的而不是报错
3. **日志记录**：添加详细的日志，便于调试
4. **安全性**：验证 tmux session 名称的合法性，避免注入攻击
5. **性能**：避免频繁的 tmux 命令调用
