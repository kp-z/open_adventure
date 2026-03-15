# tmux 模式刷新页面问题修复

**创建日期**: 2026-03-15
**状态**: 已完成

## 问题描述

在 tmux 模式下刷新页面时出现以下问题：

1. **Claude 对话框显示乱码**：刷新后 Claude 对话框会显示 ANSI 控制序列等乱码
2. **重复打开 tmux 会话**：第三次刷新后不会恢复现有会话，而是重新创建新的 tmux 会话

## 根本原因

### 问题 1：Blob 数据处理不当

**原因**：
- WebSocket 接收到的 scrollback 数据是 Blob 类型（二进制数据）
- 之前使用 `raw.text()` 将 Blob 转换为字符串，导致 ANSI 控制序列被错误解析
- xterm.js 需要接收原始的二进制数据（Uint8Array）来正确渲染 ANSI 序列

**代码位置**：
- `frontend/src/app/contexts/TerminalContext.tsx:510-525`

### 问题 2：恢复状态未持久化

**原因**：
- 使用 `hasRestoredRef` (React ref) 来标记是否已恢复
- React ref 在页面刷新后会被重置为初始值
- 导致每次刷新都会重新执行恢复逻辑，创建新的 tmux 会话

**代码位置**：
- `frontend/src/app/contexts/TerminalContext.tsx:1063-1067`

## 解决方案

### 修复 1：正确处理 Blob 数据

**修改前**：
```typescript
if (raw instanceof Blob) {
  try {
    const text = await raw.text();
    term.write(text);
    // ...
  } catch (error) {
    console.error('[TerminalContext] Failed to read Blob data:', error);
  }
  return;
}
```

**修改后**：
```typescript
if (raw instanceof Blob) {
  try {
    const arrayBuffer = await raw.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log(`[TerminalContext] 📦 Received Blob data: ${id}, size=${raw.size}`);

    // 直接写入二进制数据到终端，保留 ANSI 序列
    term.write(uint8Array);
    terminal.lastOutputAt = Date.now();
    terminal.backendOutputFrames += 1;
  } catch (error) {
    console.error('[TerminalContext] Failed to read Blob data:', error);
  }
  return;
}
```

**关键改进**：
- 使用 `arrayBuffer()` 而不是 `text()` 来读取 Blob
- 转换为 `Uint8Array` 传递给 xterm.js
- 保留原始的 ANSI 控制序列，让 xterm.js 正确渲染

### 修复 2：使用 sessionStorage 持久化恢复状态

**修改前**：
```typescript
useEffect(() => {
  if (hasRestoredRef.current) {
    return;
  }
  hasRestoredRef.current = true;
  // ...
}, [initTerminal]);
```

**修改后**：
```typescript
useEffect(() => {
  // 使用 sessionStorage 来持久化恢复状态，避免刷新后重复恢复
  const sessionKey = 'terminal_restore_completed';
  const hasRestored = sessionStorage.getItem(sessionKey);

  if (hasRestored || hasRestoredRef.current) {
    console.log('[TerminalContext] Restore already completed, skipping');
    // 如果已经恢复过，直接标记为 settled
    if (!restoreSettledRef.current) {
      restoreSettledRef.current = true;
      setIsRestoring(false);
      setRestoreSettled(true);
    }
    return;
  }

  hasRestoredRef.current = true;
  sessionStorage.setItem(sessionKey, 'true');
  // ...
}, [initTerminal]);
```

**关键改进**：
- 使用 `sessionStorage` 存储恢复状态（在浏览器标签页关闭前持久化）
- 刷新页面时检查 `sessionStorage`，如果已恢复则跳过
- 保留 `hasRestoredRef` 作为内存中的快速检查

## 技术细节

### xterm.js 数据类型支持

xterm.js 的 `write()` 方法支持以下类型：
- `string`：文本数据
- `Uint8Array`：二进制数据（推荐用于包含 ANSI 序列的数据）

使用 `Uint8Array` 的优势：
- 保留原始字节序列
- 正确处理多字节字符（UTF-8）
- 保留 ANSI 控制序列（颜色、光标移动等）

### sessionStorage vs localStorage

选择 `sessionStorage` 的原因：
- **生命周期**：标签页关闭时自动清除，避免跨会话污染
- **隔离性**：不同标签页有独立的 sessionStorage
- **适用场景**：适合存储临时的会话状态

如果使用 `localStorage`：
- 需要手动清理
- 可能导致跨标签页的状态冲突

## 测试验证

### 测试场景 1：刷新页面

**步骤**：
1. 在 tmux 模式下打开终端
2. 运行一些命令（如 `ls`, `pwd`）
3. 刷新页面

**预期结果**：
- ✅ 终端内容正确恢复，无乱码
- ✅ Claude 对话框正常显示
- ✅ 不会创建新的 tmux 会话

### 测试场景 2：多次刷新

**步骤**：
1. 在 tmux 模式下打开终端
2. 连续刷新页面 3 次

**预期结果**：
- ✅ 每次刷新都恢复到同一个 tmux 会话
- ✅ 不会创建多个 tmux 会话
- ✅ 终端内容一致

### 测试场景 3：关闭标签页后重新打开

**步骤**：
1. 在 tmux 模式下打开终端
2. 关闭浏览器标签页
3. 重新打开应用

**预期结果**：
- ✅ 恢复到原有的 tmux 会话
- ✅ sessionStorage 被清除，允许新的恢复流程

## 相关文件

- `frontend/src/app/contexts/TerminalContext.tsx`
  - 第 510-528 行：Blob 数据处理
  - 第 1063-1078 行：恢复状态持久化

## 后续优化建议

1. **添加恢复状态清理机制**
   - 在所有终端关闭时清除 sessionStorage
   - 避免状态残留

2. **改进错误处理**
   - 添加 Blob 读取失败的降级处理
   - 记录详细的错误日志

3. **性能优化**
   - 对大量 scrollback 数据进行分块处理
   - 避免一次性写入过多数据导致 UI 卡顿

## 参考资料

- [xterm.js API 文档](https://xtermjs.org/docs/api/terminal/classes/terminal/#write)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
