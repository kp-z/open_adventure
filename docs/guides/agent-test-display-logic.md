# AgentTestPanel 实时日志显示逻辑

## 显示逻辑

### 运行时（isRunning = true）
```
┌─────────────────────────────────────┐
│ 🔄 Agent 正在处理请求...            │
├─────────────────────────────────────┤
│ 📟 控制台日志                        │
├─────────────────────────────────────┤
│ [00:48:19] 开始执行 Agent: xxx      │
│ [00:48:19] 使用模型: sonnet         │
│ [00:48:19] 执行命令...              │
│ [00:48:20] 正在分析输入...          │
│ [00:48:21] 生成响应...              │
│ ↓ (自动滚动到最新)                  │
└─────────────────────────────────────┘
```

**特点**：
- 显示 "Agent 正在处理请求..." 状态
- 显示 "控制台日志" 标题
- 实时追加控制台日志
- 自动滚动到最新日志

### 完成时（isRunning = false）
```
┌─────────────────────────────────────┐
│ ✅ 执行成功                          │
│ 1.23s · sonnet                      │
├─────────────────────────────────────┤
│ 我是一个专门的 Agent，我的能力包括：│
│ 1. 代码分析                         │
│ 2. 文档生成                         │
│ 3. 问题解答                         │
│ ...                                 │
└─────────────────────────────────────┘
```

**特点**：
- 显示执行状态（成功/失败）
- 显示执行时间和模型
- 显示最终输出结果（而非控制台日志）
- 支持 Markdown 渲染

## 数据流

### 1. 收到 log 消息
```typescript
if (data.type === 'log') {
  // 收集到 consoleLogs 数组
  consoleLogs.push(data.message);
  // 实时显示控制台日志
  setCurrentOutput(consoleLogs.join('\n'));
}
```

### 2. 收到 complete 消息
```typescript
if (data.type === 'complete') {
  finalOutput = data.data.output;
  // 切换显示最终输出（替换控制台日志）
  setCurrentOutput(finalOutput);
  setCurrentSuccess(true);
  setIsRunning(false);
}
```

## 关键区别

| 阶段 | 显示内容 | 数据来源 |
|------|---------|---------|
| 运行中 | 控制台日志 | `consoleLogs.join('\n')` |
| 完成后 | 最终输出 | `data.data.output` |

## 自动滚动

```typescript
useEffect(() => {
  if (isRunning && logContainerRef.current) {
    // 运行时自动滚动到底部
    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }
}, [currentOutput, isRunning]);
```

## UI 改进

### 运行时
- ✅ 显示 loading 图标
- ✅ 显示 "控制台日志" 标题（带终端图标）
- ✅ 日志区域有蓝色边框
- ✅ 自动滚动

### 完成时
- ✅ 显示成功/失败状态
- ✅ 显示执行时间和模型
- ✅ 支持 Markdown 渲染
- ✅ 支持复制输出

## 测试场景

### 场景 1: 正常执行
1. 点击运行
2. 看到 "Agent 正在处理请求..."
3. 看到 "控制台日志" 标题
4. 日志逐行实时显示
5. 完成后切换到最终输出

### 场景 2: 执行失败
1. 点击运行
2. 看到控制台日志
3. 收到错误消息
4. 显示控制台日志 + 错误信息

### 场景 3: 连接失败
1. 点击运行
2. 连接失败
3. 显示错误提示和排查建议

## 代码结构

```typescript
// 状态变量
let consoleLogs: string[] = [];  // 控制台日志数组
let finalOutput = '';             // 最终输出

// 运行时：显示控制台日志
setCurrentOutput(consoleLogs.join('\n'));

// 完成时：显示最终输出
setCurrentOutput(finalOutput);
```

## 优势

1. **清晰的状态区分**
   - 运行时看到执行进度
   - 完成后看到最终结果

2. **更好的用户体验**
   - 不会被大量日志淹没
   - 最终结果清晰可读

3. **保持历史记录**
   - 历史记录保存最终输出
   - 不保存冗长的控制台日志
