# AgentTest 双模式交互设计文档

**创建日期**：2026-02-28
**章节编号**：01
**作者**：Claude
**状态**：已发布

## 目录
- [概述](#概述)
- [整体架构](#整体架构)
- [ChatView 对话框模式](#chatview-对话框模式)
- [TerminalView 终端模式](#terminalview-终端模式)
- [模式切换与状态管理](#模式切换与状态管理)
- [错误处理与边界情况](#错误处理与边界情况)
- [技术实现细节](#技术实现细节)
- [实施计划](#实施计划)

## 概述

### 项目背景
当前 AgentTest 页面的测试控制台仅支持单一的输出展示方式，用户体验有限。本次重构将引入两种交互模式：

1. **对话框模式**：微信风格的气泡对话，支持一键优化输入
2. **终端模式**：真实的 xterm.js 终端，通过 WebSocket PTY 与 Agent 交互

### 设计目标
- 提供两种不同的交互体验，满足不同场景需求
- 保持现有功能完整性，不破坏已有的测试历史和 SSE 流式输出
- 架构清晰，便于后期维护和扩展
- 用户可以无缝切换两种模式

### 核心价值
- **对话框模式**：适合快速测试、查看格式化输出、优化 prompt
- **终端模式**：适合调试、查看原始日志、模拟真实命令行环境

## 整体架构

### 组件层次结构
```
AgentTestPanel
├── 测试控制台卡片
│   ├── 卡片头部（标题 + 模式切换按钮）
│   ├── ChatView（对话框模式）
│   │   ├── 消息列表（气泡展示）
│   │   └── 输入区（带一键优化按钮）
│   └── TerminalView（终端模式）
│       └── xterm.js 实例
├── 建议的测试
└── 测试历史
```

### 状态管理
- `viewMode`: 'chat' | 'terminal' - 当前显示模式
- `chatMessages`: 对话历史（仅 Chat 模式）
- `terminalSession`: WebSocket 连接实例（仅 Terminal 模式）
- 两种模式的执行结果都会保存到 `testHistory`

### 切换按钮位置
- 位于测试控制台卡片右上角
- 使用图标切换：MessageSquare（对话）/ Terminal（终端）
- 简洁的 Toggle 样式，带 tooltip 提示

## ChatView 对话框模式

### UI 布局
```
┌─────────────────────────────────────┐
│ 消息列表区域（可滚动）              │
│                                     │
│  ┌─────────────────┐                │
│  │ Agent 消息      │ 左对齐白色     │
│  └─────────────────┘                │
│                                     │
│                ┌─────────────────┐  │
│                │ 用户消息        │  │ 右对齐绿色
│                └─────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ 输入框 + [一键优化] + [发送]        │
└─────────────────────────────────────┘
```

### 消息气泡样式（微信风格）
- **用户消息**：
  - 右对齐
  - 绿色背景（`bg-green-500/20`）
  - 圆角左下角较小（`rounded-2xl rounded-br-sm`）
  - 文字颜色：`text-white`

- **Agent 消息**：
  - 左对齐
  - 白色/灰色背景（`bg-white/10`）
  - 圆角右下角较小（`rounded-2xl rounded-bl-sm`）
  - 文字颜色：`text-gray-100`

- **时间戳**：消息下方小字显示（`text-xs text-gray-500`）
- **状态指示**：发送中（loading）、成功、失败

### 交互功能
- 输入框支持多行（textarea）
- 一键优化按钮调用现有的 `PromptOptimizeButton`
- 发送按钮（Enter 快捷键，Shift+Enter 换行）
- 自动滚动到最新消息
- 支持复制消息内容（点击消息显示复制按钮）

### 数据流
- 继续使用现有的 SSE API（`agentsApi.testStream`）
- 将日志和输出转换为消息格式
- 保持实时流式更新
- Agent 响应时显示 typing 动画

## TerminalView 终端模式

### UI 布局
```
┌─────────────────────────────────────┐
│ xterm.js 终端实例（全屏显示）       │
│                                     │
│ $ Agent session started...          │
│ > 用户输入的消息                    │
│ Agent: 响应内容...                  │
│ > _                                 │
│                                     │
└─────────────────────────────────────┘
```

### 终端配置
- **主题**：暗色主题（黑色背景 `#1a1a1a`）
- **字体**：等宽字体 `'Menlo', 'Monaco', 'Courier New', monospace`
- **字体大小**：14px
- **光标**：闪烁块状光标
- **尺寸**：自适应容器大小（使用 xterm-addon-fit）
- **滚动**：保留最近 1000 行

### WebSocket 通信协议

#### 前端 → 后端
```typescript
// 用户输入
{
  type: 'input',
  data: '用户输入的内容\n'
}

// 终端尺寸变化
{
  type: 'resize',
  cols: 80,
  rows: 24
}

// 关闭会话
{
  type: 'close'
}
```

#### 后端 → 前端
```typescript
// 终端输出
{
  type: 'output',
  data: 'Agent 输出内容'
}

// 会话启动成功
{
  type: 'ready',
  message: 'Agent session started'
}

// 会话结束
{
  type: 'exit',
  code: 0,
  output: '完整输出内容'
}

// 错误
{
  type: 'error',
  message: '错误信息'
}
```

### 后端实现要点
- 新增 WebSocket 端点：`/agents/{id}/terminal`
- 使用 `ptyprocess` 创建伪终端进程（跨平台支持）
- 自动启动 Claude CLI 并加载指定 agent
- 双向数据流：用户输入 → PTY → Agent → PTY → 前端显示
- 会话管理：支持多个并发会话，每个 WebSocket 对应一个 PTY

### 生命周期管理
- 切换到 Terminal 模式时建立 WebSocket 连接
- 切换回 Chat 模式时保持连接（用户可选择断开）
- 组件卸载时关闭连接和 PTY 进程
- 页面刷新时清理所有资源

## 模式切换与状态管理

### 切换按钮设计
```typescript
// 位置：测试控制台卡片右上角
<div className="flex items-center gap-2">
  <button
    onClick={() => setViewMode('chat')}
    className={`p-2 rounded-lg transition-all ${
      viewMode === 'chat'
        ? 'bg-blue-500/20 text-blue-400'
        : 'bg-white/5 text-gray-400 hover:bg-white/10'
    }`}
    title="对话框模式"
  >
    <MessageSquare size={16} />
  </button>
  <button
    onClick={() => setViewMode('terminal')}
    className={`p-2 rounded-lg transition-all ${
      viewMode === 'terminal'
        ? 'bg-green-500/20 text-green-400'
        : 'bg-white/5 text-gray-400 hover:bg-white/10'
    }`}
    title="终端模式"
  >
    <Terminal size={16} />
  </button>
</div>
```

### 状态保持策略
- **Chat 模式**：
  - 消息历史保存在组件状态中
  - 切换回来时恢复完整对话历史
  - 使用 localStorage 持久化（可选）

- **Terminal 模式**：
  - WebSocket 连接保持活跃
  - 切换回来时继续会话
  - 终端缓冲区由 xterm.js 管理

- **测试历史**：
  - 两种模式的执行结果都统一保存到 `testHistory`
  - Chat 模式：每次对话完成后保存
  - Terminal 模式：会话结束时保存完整输出

### 切换动画
- 使用 Framer Motion 的 `AnimatePresence`
- 淡入淡出效果（fade + slide）
- 切换时间约 200-300ms
- 平滑过渡，避免闪烁

### 数据同步
- Chat 模式完成测试后，结果保存到 `testHistory`
- Terminal 模式需要在后端检测到会话结束时，通过 WebSocket 发送完成事件
- 前端接收到完成事件后，提取输出并保存到 `testHistory`
- 两种模式的历史记录格式统一，便于展示

## 错误处理与边界情况

### 错误处理

#### Chat 模式
- **SSE 连接失败**：显示错误消息气泡，提示重试
- **Agent 执行超时**：显示超时提示，允许取消
- **网络中断**：自动重连机制（最多 3 次，间隔 2 秒）
- **输入为空**：禁用发送按钮，显示提示

#### Terminal 模式
- **WebSocket 连接失败**：在终端显示红色错误信息
- **PTY 进程崩溃**：显示会话已断开，提供重新连接按钮
- **Agent 未找到**：终端显示错误并自动退出
- **命令执行失败**：显示错误码和错误信息

### 边界情况

#### 1. 快速切换模式
- 防抖处理（300ms），避免频繁切换导致资源泄漏
- 切换时如果有正在执行的任务，提示用户确认
- 确认对话框：「当前有正在执行的任务，切换模式将中断执行，是否继续？」

#### 2. 并发执行
- **Chat 模式**：同一时间只允许一个请求，发送按钮在执行期间禁用
- **Terminal 模式**：由 PTY 会话自然控制，用户可以连续输入

#### 3. 资源清理
- 组件卸载时关闭所有连接（SSE、WebSocket）
- 页面离开时（beforeunload）清理 WebSocket 和 PTY
- 后端定时清理超时的 PTY 进程（30 分钟无活动）

#### 4. 空状态处理
- **Chat 模式**：显示欢迎消息和使用提示
  ```
  👋 欢迎使用对话模式
  输入消息与 Agent 对话，支持一键优化 prompt
  ```
- **Terminal 模式**：显示会话启动信息
  ```
  $ Connecting to agent session...
  $ Agent [name] ready. Type your message and press Enter.
  ```

### 用户提示
- 首次使用 Terminal 模式时，显示简短的使用说明（toast）
- 使用 toast 通知关键状态变化（连接成功、断开、错误等）
- 提示信息简洁明了，3 秒后自动消失

## 技术实现细节

### 前端依赖
```json
{
  "xterm": "^5.3.0",
  "xterm-addon-fit": "^0.8.0",
  "xterm-addon-web-links": "^0.9.0"
}
```

### 后端依赖（Python）
```python
# requirements.txt
fastapi-websocket  # WebSocket 支持（FastAPI 内置）
ptyprocess         # PTY 进程管理（跨平台）
```

### 文件结构
```
frontend/src/app/components/
├── AgentTestPanel.tsx          # 主面板（已存在，需修改）
├── agent-test/
│   ├── ChatView.tsx            # 对话框模式组件
│   ├── TerminalView.tsx        # 终端模式组件
│   ├── MessageBubble.tsx       # 消息气泡组件
│   └── types.ts                # 类型定义

backend/app/api/routers/
├── agents.py                   # 已存在，新增 terminal 端点
└── websocket/
    └── terminal.py             # WebSocket PTY 处理器
```

### 性能优化
- **Chat 模式**：
  - 消息列表虚拟滚动（如果消息超过 100 条）
  - 使用 `React.memo` 优化消息气泡渲染
  - 防抖输入优化按钮（500ms）

- **Terminal 模式**：
  - xterm.js 内置性能优化
  - 限制终端缓冲区大小（1000 行）
  - WebSocket 消息批量处理（减少渲染次数）

- **通用优化**：
  - WebSocket 心跳检测（每 30 秒）
  - 懒加载 xterm.js（仅在切换到 Terminal 模式时加载）
  - 图片和大文件输出截断处理

### 测试策略
- **单元测试**：
  - 组件渲染测试（ChatView、TerminalView）
  - 状态切换逻辑测试
  - 消息格式转换测试

- **集成测试**：
  - WebSocket 连接测试
  - SSE 流式传输测试
  - PTY 进程管理测试

- **E2E 测试**：
  - 完整的用户交互流程
  - 模式切换测试
  - 错误恢复测试

## 实施计划

### Phase 1: 基础架构（2-3 天）
1. 创建组件文件结构
2. 实现模式切换逻辑
3. 重构 AgentTestPanel，提取公共状态

### Phase 2: ChatView 实现（2-3 天）
1. 实现消息气泡组件
2. 集成现有 SSE API
3. 添加一键优化功能
4. 实现自动滚动和动画

### Phase 3: TerminalView 实现（3-4 天）
1. 集成 xterm.js
2. 实现 WebSocket 客户端
3. 后端实现 PTY 处理器
4. 测试双向通信

### Phase 4: 测试与优化（2 天）
1. 单元测试和集成测试
2. 性能优化
3. 错误处理完善
4. 用户体验优化

### Phase 5: 文档与发布（1 天）
1. 更新用户文档
2. 代码审查
3. 发布到生产环境

**总计**：10-13 天

## 参考资料
- [xterm.js 官方文档](https://xtermjs.org/)
- [FastAPI WebSocket 文档](https://fastapi.tiangolo.com/advanced/websockets/)
- [ptyprocess 文档](https://ptyprocess.readthedocs.io/)
- [Framer Motion 动画库](https://www.framer.com/motion/)
