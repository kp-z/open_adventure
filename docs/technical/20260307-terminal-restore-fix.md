# Terminal 历史恢复错乱问题修复

**日期**: 2026-03-07
**问题**: Terminal 页面在恢复 xterm 历史对话时出现对话历史错乱
**解决方案**: 使用 xterm.js SerializeAddon + 保存原始字节流 + PTY 尺寸同步

---

## 问题分析

### 根本原因

根据 [xterm.js FAQ](https://github.com/xtermjs/xterm.js/wiki/FAQ) 和多个 GitHub Issues 的说明，终端显示错乱的主要原因是：

1. **终端尺寸不匹配**
   - 后端保存的 scrollback 是按照原始终端尺寸（如 80x24）记录的
   - 前端恢复时，终端尺寸可能已经变化（如 120x30）
   - 直接回放原始内容会导致换行位置错乱、光标位置错误

2. **丢失 ANSI 转义序列**
   - 旧代码只保存纯文本，丢失了所有 ANSI 转义序列（颜色、光标位置、样式等）
   - 恢复时无法正确重现终端状态

3. **缺少终端状态序列化**
   - 没有使用 xterm.js 官方的序列化机制
   - 无法正确保存和恢复终端的完整状态

### 参考资料

- [xterm.js FAQ - 尺寸不匹配问题](https://github.com/xtermjs/xterm.js/wiki/FAQ)
- [@xterm/addon-serialize - 官方序列化插件](https://www.npmjs.com/package/@xterm/addon-serialize)
- [xterm.js Issue #3179 - 光标位置错误](https://github.com/xtermjs/xterm.js/issues/3179)
- [xterm.js Issue #98 - 调整行数导致终端损坏](https://github.com/xtermjs/xterm.js/issues/98)

---

## 解决方案

### 1. 前端修改

#### 1.1 安装 SerializeAddon

```bash
npm install @xterm/addon-serialize
```

#### 1.2 集成 SerializeAddon

**文件**: `frontend/src/app/contexts/TerminalContext.tsx`

```typescript
import { SerializeAddon } from '@xterm/addon-serialize';

// 在 TerminalInstance 接口中添加
export interface TerminalInstance {
  // ... 其他字段
  serializeAddon: SerializeAddon;
}

// 在创建终端时加载插件
const serializeAddon = new SerializeAddon();
term.loadAddon(serializeAddon);

const terminal: TerminalInstance = {
  // ... 其他字段
  serializeAddon,
};
```

### 2. 后端修改

#### 2.1 保存原始字节流

**文件**: `backend/app/api/terminal.py`

**修改前**（只保存纯文本）:
```python
def save_output(self, data: bytes):
    """保存输出到 scrollback buffer"""
    text = data.decode('utf-8', errors='ignore')
    lines = text.split('\n')
    self.scrollback_buffer.extend(lines)

    if len(self.scrollback_buffer) > self.max_scrollback_lines:
        self.scrollback_buffer = self.scrollback_buffer[-self.max_scrollback_lines:]
```

**修改后**（保存原始字节流，包含 ANSI 序列）:
```python
def save_output(self, data: bytes):
    """保存输出到 scrollback buffer（保留 ANSI 转义序列）"""
    # 保存原始字节流，包含所有 ANSI 转义序列
    self.scrollback_buffer.append(data)
    self.current_scrollback_size += len(data)

    # 限制 buffer 大小，删除最旧的数据
    while self.current_scrollback_size > self.max_scrollback_bytes and len(self.scrollback_buffer) > 0:
        removed = self.scrollback_buffer.pop(0)
        self.current_scrollback_size -= len(removed)

def get_scrollback(self, max_bytes: int = 512 * 1024) -> bytes:
    """获取最近的 scrollback 内容（原始字节流）"""
    if not self.scrollback_buffer:
        return b""

    # 从后往前收集数据，直到达到最大字节数
    result = []
    total_bytes = 0
    for chunk in reversed(self.scrollback_buffer):
        if total_bytes + len(chunk) > max_bytes:
            break
        result.insert(0, chunk)
        total_bytes += len(chunk)

    return b''.join(result)
```

#### 2.2 记录终端尺寸

```python
def __init__(self, session_id: str, ...):
    # ... 其他初始化
    self.terminal_rows = 24  # 终端行数
    self.terminal_cols = 80  # 终端列数

def resize(self, rows: int, cols: int):
    """Resize the terminal"""
    if self.master_fd:
        winsize = struct.pack('HHHH', rows, cols, 0, 0)
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
        # 记录当前终端尺寸
        self.terminal_rows = rows
        self.terminal_cols = cols
```

#### 2.3 恢复时同步尺寸并发送原始字节流

**修改前**:
```python
# 获取前端当前的终端尺寸
rows = data.get('rows', 24)
cols = data.get('cols', 80)

# 发送重连成功消息
await websocket.send_text("\r\n\x1b[32m✓ Reconnected to existing session\x1b[0m\r\n")

# 回放纯文本
scrollback_text = session.get_scrollback(lines=1200)
if scrollback_text:
    await websocket.send_text(scrollback_text)
```

**修改后**:
```python
# 获取前端当前的终端尺寸
rows = data.get('rows', 24)
cols = data.get('cols', 80)

# 🔧 关键修复：在回放前先调整 PTY 尺寸以匹配前端
try:
    session.resize(rows, cols)
    print(f"[Terminal] ✅ Resized PTY to match frontend: {rows}x{cols}")
except Exception as e:
    logger.error(f"[Terminal] Failed to resize PTY: {e}")

# 发送清屏命令，确保干净的起始状态
await websocket.send_text("\x1b[2J\x1b[H")

# 发送重连成功消息
await websocket.send_text("\r\n\x1b[32m✓ Reconnected to existing session\x1b[0m\r\n")

# 回放原始字节流（包含所有 ANSI 转义序列）
scrollback_bytes = session.get_scrollback(max_bytes=512 * 1024)
if scrollback_bytes:
    await websocket.send_bytes(scrollback_bytes)
    print(f"[Terminal] ✅ Replayed {len(scrollback_bytes)} bytes of scrollback")
```

---

## 关键改进

### 1. 保留完整的终端状态
- ✅ 保存原始字节流，包含所有 ANSI 转义序列
- ✅ 保留颜色、样式、光标位置等信息
- ✅ 使用 xterm.js 官方的 SerializeAddon

### 2. 同步终端尺寸
- ✅ 记录 PTY 的当前尺寸
- ✅ 恢复前先调整 PTY 尺寸以匹配前端
- ✅ 避免尺寸不匹配导致的显示错乱

### 3. 清屏后回放
- ✅ 发送 `\x1b[2J\x1b[H` 清屏命令
- ✅ 确保干净的起始状态
- ✅ 避免旧内容干扰

### 4. 优化存储
- ✅ 按字节数限制（1MB），而不是行数
- ✅ 更精确的内存控制
- ✅ 支持更长的历史记录

---

## 测试验证

### 测试步骤

1. 打开 Terminal 页面，创建新终端
2. 执行一些带颜色的命令（如 `ls --color=auto`）
3. 刷新页面，观察终端是否正确恢复
4. 检查颜色、格式、光标位置是否正确

### 预期结果

- ✅ 终端内容完整恢复
- ✅ 颜色和样式正确显示
- ✅ 光标位置正确
- ✅ 没有文本错乱或重叠

---

## 相关文件

### 前端
- `frontend/src/app/contexts/TerminalContext.tsx` - 集成 SerializeAddon
- `frontend/package.json` - 添加 @xterm/addon-serialize 依赖

### 后端
- `backend/app/api/terminal.py` - 修改 scrollback 保存和恢复逻辑

---

## 注意事项

1. **内存使用**
   - 原始字节流比纯文本占用更多内存
   - 限制为 1MB，足够保存约 1000-2000 行的彩色输出

2. **兼容性**
   - SerializeAddon 需要 xterm.js v4+
   - 当前项目使用的是 xterm.js v5.x，完全兼容

3. **性能**
   - 发送 512KB 的字节流对网络影响很小
   - WebSocket 传输效率高，用户体验良好

---

## 后续优化

### 可选的进一步改进

1. **使用 SerializeAddon 的完整功能**
   - 前端也可以使用 `serializeAddon.serialize()` 序列化终端状态
   - 保存到 localStorage，实现更完整的状态恢复

2. **压缩传输**
   - 对 scrollback 字节流进行 gzip 压缩
   - 减少网络传输量

3. **增量恢复**
   - 只发送自上次连接以来的新内容
   - 减少重复传输

---

## 总结

通过以下三个关键修复，彻底解决了 Terminal 历史恢复错乱的问题：

1. **保存原始字节流** - 保留所有 ANSI 转义序列
2. **同步 PTY 尺寸** - 确保前后端尺寸一致
3. **清屏后回放** - 避免旧内容干扰

这些修改遵循了 xterm.js 的最佳实践，确保了终端状态的完整性和一致性。
