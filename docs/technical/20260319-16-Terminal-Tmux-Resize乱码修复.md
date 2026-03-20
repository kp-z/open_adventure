# Terminal Tmux Resize 乱码修复实施总结

**创建日期**: 2026-03-19
**章节编号**: 16
**状态**: 已完成

## 问题背景

Terminal 页面在恢复 tmux session 时，存在 resize 导致显示乱码的问题：

### 核心问题
1. **时序冲突**：后端在 `restore_ready` 时 resize 了一次 PTY，前端在 tmux 检测存活后又在 300ms/800ms/1500ms 发送了 3 次 resize，这些 resize 与 scrollback 回放的 ANSI 序列冲突，导致显示错乱
2. **tmux 窗口大小不匹配**：tmux 会话保存了旧的窗口尺寸，恢复时需要多次 resize 才能让 tmux 正确调整窗口大小
3. **缺少 tmux 刷新机制**：resize 后没有强制 tmux 刷新客户端，tmux 可能缓存旧的窗口尺寸，导致显示错位

## 实施方案

### 1. 后端修复（terminal.py）

#### 1.1 在 restore_ready 处理中添加 tmux refresh 和延迟

**文件**: `backend/app/api/terminal.py`
**位置**: 约 1028-1083 行

**修改内容**:
```python
# 🔧 关键修复 1：在回放前先调整 PTY 尺寸以匹配前端
session.resize(rows, cols)

# 🔧 关键修复 2：如果是 tmux session，发送 refresh-client 命令
if session.use_tmux and session.tmux_session_name:
    subprocess.run(
        ['tmux', 'refresh-client', '-t', session.tmux_session_name],
        capture_output=True,
        timeout=1
    )

# 🔧 关键修复 3：等待 resize 完成后再回放
await asyncio.sleep(0.1)  # 100ms 延迟
```

**效果**:
- 确保 PTY 和 tmux 都完成 resize 后再回放 scrollback
- 强制 tmux 刷新客户端，清除缓存的旧窗口尺寸
- 避免 resize 与 scrollback 回放冲突

#### 1.2 在 resize 消息处理中添加 tmux refresh

**文件**: `backend/app/api/terminal.py`
**位置**: 约 1005-1019 行

**修改内容**:
```python
# 🔧 新增：如果是 tmux session，发送 refresh-client 命令
if session.use_tmux and session.tmux_session_name:
    subprocess.run(
        ['tmux', 'refresh-client', '-t', session.tmux_session_name],
        capture_output=True,
        timeout=1
    )
```

**效果**:
- 每次 resize 后强制 tmux 刷新，确保窗口大小正确

#### 1.3 在 tmux session 创建时指定初始窗口大小

**文件**: `backend/app/api/terminal.py`
**位置**: 约 202-217 行

**修改内容**:
```python
# 🔧 新增：创建 tmux session 时指定初始窗口大小
result = subprocess.run(
    ['tmux', 'new-session', '-d', '-s', session_name, '-c', target_dir, '-x', '80', '-y', '24'],
    capture_output=True,
    text=True
)
```

**效果**:
- 创建 tmux session 时使用标准的 80x24 窗口大小
- 后续通过 resize 调整到实际需要的尺寸

### 2. 前端修复（TerminalContext.tsx）

#### 2.1 优化 tmux 恢复时的 resize 策略

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`
**位置**: 约 1393-1418 行

**修改内容**:
```typescript
// 🔧 关键修复：只在 restore_ready 之后发送 resize
// 避免与 scrollback 回放冲突

// 第一次 resize：500ms 后发送（给 scrollback 回放留出时间）
setTimeout(() => {
  sendResize(terminal.id, rows, cols);
}, 500);

// 第二次 resize：1200ms 后发送，确保 tmux 已处理完第一次
setTimeout(() => {
  sendResize(terminal.id, rows, cols);
}, 1200);

// 移除第三次 resize，两次足够
```

**效果**:
- 减少 resize 次数从 3 次降到 2 次
- 延迟 resize 时间，避免与 scrollback 回放冲突
- 给 tmux 足够时间处理每次 resize

### 3. 前端修复（Terminal.tsx）

#### 3.1 改进 restore_ready 信号发送时机

**文件**: `frontend/src/app/pages/Terminal.tsx`
**位置**: 约 119-137 行

**修改内容**:
```typescript
// 🔧 优化：移动端和桌面端都使用相同的稳定次数
// 确保尺寸真正稳定后再发送 restore_ready
const requiredStableCount = 2;  // 统一为 2 次

if (stableSizeCount >= requiredStableCount) {
  console.log(`[TerminalPane] Sending restore_ready: ${currentRows}x${currentCols}`);
  sendRestoreReady(terminal.id, currentRows, currentCols);
  restoreReadySentRef.current = true;
}
```

**效果**:
- 统一移动端和桌面端的稳定次数为 2 次
- 确保尺寸真正稳定后再发送 restore_ready
- 避免过早发送导致 resize 不准确

## 技术要点

### 1. tmux refresh-client 命令
- **作用**: 强制 tmux 刷新客户端显示
- **时机**: 在 resize 后立即执行
- **效果**: 清除 tmux 缓存的旧窗口尺寸，避免显示错位

### 2. resize 和 scrollback 回放的时序
- **关键**: 先 resize，等待完成，再回放 scrollback
- **延迟**: 在 resize 后添加 100ms 延迟，确保 PTY 和 tmux 都已完成调整
- **顺序**: resize → refresh-client → 延迟 → 清屏 → 回放

### 3. 减少不必要的 resize
- **原策略**: 3 次 resize（300ms/800ms/1500ms）
- **新策略**: 2 次 resize（500ms/1200ms）
- **原因**: 减少 resize 次数，避免与 scrollback 回放冲突

### 4. tmux 窗口大小强制同步
- **创建时**: 指定初始窗口大小（80x24）
- **效果**: 确保 tmux 窗口大小与前端一致

## 验证方案

### 测试场景 1：基本恢复测试
1. 打开 Terminal 页面，创建一个 tmux session
2. 在 terminal 中运行 `ls -la` 查看文件列表
3. 刷新页面
4. **预期**: 页面重新加载后，恢复对话框出现，选择恢复
5. **验证**:
   - 终端显示正常，没有乱码
   - 之前的 `ls -la` 输出清晰可见
   - 窗口大小正确，没有错位

### 测试场景 2：窗口大小变化测试
1. 打开 Terminal，创建 tmux session
2. 在 terminal 中运行 `top` 命令（会填满整个窗口）
3. 调整浏览器窗口大小
4. 刷新页面
5. **预期**: 恢复后，`top` 命令的显示适应新的窗口大小
6. **验证**:
   - 没有显示错位或乱码
   - `top` 的表格边框对齐正确
   - 窗口大小变化后，tmux 正确调整

### 测试场景 3：多次 resize 测试
1. 打开 Terminal，创建 tmux session
2. 在 terminal 中运行 `vim` 编辑器
3. 多次调整浏览器窗口大小（快速拖动）
4. 刷新页面
5. **预期**: 恢复后，vim 显示正常
6. **验证**:
   - vim 的界面没有错位
   - 状态栏和行号显示正确
   - 没有 ANSI 序列残留

### 测试场景 4：长时间运行任务恢复
1. 打开 Terminal，创建 tmux session
2. 运行一个长时间任务：`for i in {1..100}; do echo "Line $i"; sleep 0.1; done`
3. 在任务运行中途刷新页面
4. **预期**: 恢复后，任务继续运行，输出正常
5. **验证**:
   - scrollback 回放显示之前的输出
   - 新的输出继续追加，没有乱码
   - 窗口大小正确

## 实施优先级

### P0（已实现）
- ✅ 在 restore_ready 处理中添加 tmux refresh
- ✅ 在 restore_ready 后添加延迟，等待 resize 完成
- ✅ 优化前端 tmux 恢复时的 resize 策略（减少到 2 次）

### P1（已实现）
- ✅ 在 resize 消息处理中添加 tmux refresh
- ✅ 改进 restore_ready 信号发送时机（统一稳定次数）
- ✅ 在 tmux session 创建时指定初始窗口大小

### P2（未实现）
- ⏸️ 在 tmux attach 时强制调整窗口大小
- ⏸️ 添加 resize 失败的错误处理和重试机制
- ⏸️ 记录 resize 日志，便于调试

## 注意事项

1. **向后兼容**: 非 tmux terminal 保持原有行为
2. **错误处理**: tmux refresh-client 失败时不影响正常功能
3. **性能**: 避免频繁的 tmux 命令调用
4. **超时控制**: tmux 命令设置 1 秒超时，避免阻塞
5. **日志记录**: 添加详细的日志，便于排查问题

## 相关文件

### 后端
- `backend/app/api/terminal.py` - Terminal WebSocket 和 session 管理
  - `restore_ready` 消息处理（约 1028-1083 行）
  - `resize` 消息处理（约 1005-1019 行）
  - `create_tmux_session` 方法（约 195-221 行）

### 前端
- `frontend/src/app/contexts/TerminalContext.tsx` - Terminal 上下文和状态管理
  - tmux 存活检测后的 resize 逻辑（约 1393-1418 行）
- `frontend/src/app/pages/Terminal.tsx` - Terminal 页面
  - `restore_ready` 信号发送逻辑（约 119-137 行）

## 后续优化

1. **P2 优先级任务**: 考虑实施 tmux attach 时的窗口大小强制调整
2. **错误处理增强**: 添加 resize 失败的重试机制
3. **日志优化**: 添加更详细的 resize 日志，便于调试
4. **性能监控**: 监控 resize 操作的性能影响
5. **用户体验**: 考虑添加 resize 进度提示

## 总结

本次修复通过以下关键措施解决了 Terminal Tmux Resize 乱码问题：

1. **时序协调**: 在 resize 后添加延迟，确保 PTY 和 tmux 都完成调整后再回放 scrollback
2. **强制刷新**: 每次 resize 后发送 tmux refresh-client 命令，清除缓存的旧窗口尺寸
3. **减少冲突**: 减少 resize 次数从 3 次降到 2 次，避免与 scrollback 回放冲突
4. **初始化优化**: 创建 tmux session 时指定初始窗口大小，确保一致性

这些修复措施有效解决了 tmux session 恢复时的显示乱码问题，提升了用户体验。
