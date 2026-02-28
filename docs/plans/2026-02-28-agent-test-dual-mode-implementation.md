# AgentTest 双模式交互实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 AgentTest 页面添加对话框模式和终端模式两种交互方式，支持无缝切换

**Architecture:** 采用独立组件架构，ChatView 使用现有 SSE API，TerminalView 使用新的 WebSocket PTY。两种模式共享测试历史，通过状态管理实现切换。

**Tech Stack:** React, TypeScript, xterm.js, Framer Motion, FastAPI WebSocket, ptyprocess

---

## Phase 1: 基础架构搭建

### Task 1: 创建组件文件结构和类型定义

**Files:**
- Create: `frontend/src/app/components/agent-test/types.ts`
- Create: `frontend/src/app/components/agent-test/ChatView.tsx`
- Create: `frontend/src/app/components/agent-test/TerminalView.tsx`
- Create: `frontend/src/app/components/agent-test/MessageBubble.tsx`

**Step 1: 创建类型定义文件**

```typescript
// frontend/src/app/components/agent-test/types.ts
export type ViewMode = 'chat' | 'terminal';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  status?: 'sending' | 'success' | 'error';
}

export interface TerminalSession {
  ws: WebSocket | null;
  isConnected: boolean;
  isReady: boolean;
}
```

**Step 2: 创建空组件骨架**

```typescript
// frontend/src/app/components/agent-test/ChatView.tsx
'use client';

import React from 'react';

interface ChatViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: any) => void;
}

export function ChatView({ agentId, agentName, onTestComplete }: ChatViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4">
        {/* 消息列表区域 */}
      </div>
      <div className="p-4 border-t border-white/10">
        {/* 输入区域 */}
      </div>
    </div>
  );
}
```

```typescript
// frontend/src/app/components/agent-test/TerminalView.tsx
'use client';

import React from 'react';

interface TerminalViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: any) => void;
}

export function TerminalView({ agentId, agentName, onTestComplete }: TerminalViewProps) {
  return (
    <div className="h-full bg-black/60 rounded-xl">
      {/* xterm.js 容器 */}
    </div>
  );
}
```

```typescript
// frontend/src/app/components/agent-test/MessageBubble.tsx
'use client';

import React from 'react';
import type { ChatMessage } from './types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] p-3 rounded-2xl ${
        isUser
          ? 'bg-green-500/20 text-white rounded-br-sm'
          : 'bg-white/10 text-gray-100 rounded-bl-sm'
      }`}>
        <p className="text-sm">{message.content}</p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
```

**Step 3: 提交基础文件结构**

```bash
git add frontend/src/app/components/agent-test/
git commit -m "feat: create agent-test component structure and types"
```

---

### Task 2: 修改 AgentTestPanel 添加模式切换

**Files:**
- Modify: `frontend/src/app/components/AgentTestPanel.tsx`

**Step 1: 添加导入和状态**

在文件顶部添加：
```typescript
import { ChatView } from './agent-test/ChatView';
import { TerminalView } from './agent-test/TerminalView';
import type { ViewMode } from './agent-test/types';
```

在组件内添加状态（约第 200 行附近）：
```typescript
const [viewMode, setViewMode] = useState<ViewMode>('chat');
```

**Step 2: 修改测试控制台卡片头部**

找到测试控制台卡片的标题部分（约第 700 行），修改为：
```typescript
<div className="flex items-center justify-between mb-4">
  <h3 className="font-bold flex items-center gap-2">
    <Terminal size={16} />
    测试控制台
  </h3>
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
</div>
```

**Step 3: 替换测试控制台内容区域**

找到原来的输入和输出区域（约第 720-830 行），替换为：
```typescript
<AnimatePresence mode="wait">
  {viewMode === 'chat' ? (
    <motion.div
      key="chat"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <ChatView
        agentId={agent.id}
        agentName={agent.name}
        onTestComplete={handleTestComplete}
      />
    </motion.div>
  ) : (
    <motion.div
      key="terminal"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <TerminalView
        agentId={agent.id}
        agentName={agent.name}
        onTestComplete={handleTestComplete}
      />
    </motion.div>
  )}
</AnimatePresence>
```

**Step 4: 添加 handleTestComplete 回调**

在组件内添加（约第 360 行附近）：
```typescript
const handleTestComplete = (result: TestResult) => {
  const newHistory = [result, ...testHistory];
  setTestHistory(newHistory);
  saveTestHistory(newHistory);
};
```

**Step 5: 提交模式切换功能**

```bash
git add frontend/src/app/components/AgentTestPanel.tsx
git commit -m "feat: add view mode toggle between chat and terminal"
```

---

## Phase 2: ChatView 实现

### Task 3: 实现 ChatView 消息列表和输入
**Files:**
- Modify: `frontend/src/app/components/agent-test/ChatView.tsx`

**Step 1: 实现消息列表状态和渲染**

```typescript
// frontend/src/app/components/agent-test/ChatView.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { PromptOptimizeButton } from '../PromptOptimizeButton';
import { agentsApi } from '@/lib/api';
import type { ChatMessage } from './types';
import type { TestResult } from '../AgentTestPanel';

interface ChatViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: TestResult) => void;
}

export function ChatView({ agentId, agentName, onTestComplete }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[500px]">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <div className="text-center">
              <p>👋 欢迎使用对话模式</p>
              <p className="mt-2">输入消息与 Agent 对话，支持一键优化 prompt</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // handleSend();
              }
            }}
            placeholder="输入消息..."
            disabled={isRunning}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
            rows={3}
          />
          <div className="flex flex-col gap-2">
            <PromptOptimizeButton
              value={input}
              onChange={setInput}
              disabled={isRunning}
              iconOnly
            />
            <button
              onClick={() => {/* handleSend */}}
              disabled={!input.trim() || isRunning}
              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
              title="发送消息"
            >
              {isRunning ? (
                <Loader className="w-5 h-5 animate-spin text-blue-400" />
              ) : (
                <Send className="w-5 h-5 text-blue-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 提交消息列表和输入 UI**

```bash
git add frontend/src/app/components/agent-test/ChatView.tsx
git commit -m "feat: implement ChatView message list and input UI"
```

---

### Task 4: 实现 ChatView 消息发送和 SSE 集成

**Files:**
- Modify: `frontend/src/app/components/agent-test/ChatView.tsx`

**Step 1: 实现消息发送逻辑**

在 ChatView 组件中添加 handleSend 函数：

```typescript
const handleSend = async () => {
  if (!input.trim() || isRunning) return;

  const userMessage: ChatMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: input.trim(),
    timestamp: new Date().toISOString(),
    status: 'success',
  };

  setMessages(prev => [...prev, userMessage]);
  setInput('');
  setIsRunning(true);

  const agentMessageId = `agent-${Date.now()}`;
  const agentMessage: ChatMessage = {
    id: agentMessageId,
    role: 'agent',
    content: '',
    timestamp: new Date().toISOString(),
    status: 'sending',
  };

  setMessages(prev => [...prev, agentMessage]);

  const startTime = Date.now();
  let fullOutput = '';

  try {
    agentsApi.testStream(
      agentId,
      userMessage.content,
      // onLog
      (log: string) => {
        fullOutput += log + '\n';
        setMessages(prev =>
          prev.map(msg =>
            msg.id === agentMessageId
              ? { ...msg, content: fullOutput }
              : msg
          )
        );
      },
      // onComplete
      (data) => {
        const duration = (Date.now() - startTime) / 1000;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === agentMessageId
              ? { ...msg, content: data.output, status: 'success' }
              : msg
          )
        );
        setIsRunning(false);

        // 保存到测试历史
        onTestComplete({
          id: `test-${Date.now()}`,
          input: userMessage.content,
          output: data.output,
          success: data.success,
          duration: data.duration,
          timestamp: new Date().toISOString(),
          model: data.model,
          agentId,
        });
      },
      // onError
      (error: string) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === agentMessageId
              ? { ...msg, content: error, status: 'error' }
              : msg
          )
        );
        setIsRunning(false);

        onTestComplete({
          id: `test-${Date.now()}`,
          input: userMessage.content,
          output: error,
          success: false,
          duration: (Date.now() - startTime) / 1000,
          timestamp: new Date().toISOString(),
          model: 'unknown',
          agentId,
        });
      }
    );
  } catch (error) {
    console.error('Send message failed:', error);
    setMessages(prev =>
      prev.map(msg =>
        msg.id === agentMessageId
          ? { ...msg, content: '发送失败，请重试', status: 'error' }
          : msg
      )
    );
    setIsRunning(false);
  }
};
```

**Step 2: 更新按钮点击事件**

将 `onClick={() => {/* handleSend */}}` 替换为 `onClick={handleSend}`

**Step 3: 测试消息发送功能**

启动前端服务并测试：
1. 输入消息
2. 点击发送
3. 观察消息气泡显示
4. 确认 Agent 响应实时更新

**Step 4: 提交消息发送功能**

```bash
git add frontend/src/app/components/agent-test/ChatView.tsx
git commit -m "feat: implement ChatView message sending with SSE integration"
```

---

## Phase 3: TerminalView 实现

### Task 5: 安装 xterm.js 依赖

**Files:**
- Modify: `frontend/package.json`

**Step 1: 安装依赖**

```bash
cd frontend
npm install xterm xterm-addon-fit xterm-addon-web-links
```

**Step 2: 验证安装**

```bash
npm list xterm
```

Expected: 显示 xterm@5.x.x

**Step 3: 提交依赖更新**

```bash
git add package.json package-lock.json
git commit -m "deps: add xterm.js and addons for terminal view"
```

---

### Task 6: 实现 TerminalView 基础组件

**Files:**
- Modify: `frontend/src/app/components/agent-test/TerminalView.tsx`

**Step 1: 实现 xterm.js 集成**

```typescript
// frontend/src/app/components/agent-test/TerminalView.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import type { TerminalSession } from './types';
import type { TestResult } from '../AgentTestPanel';

interface TerminalViewProps {
  agentId: number;
  agentName: string;
  onTestComplete: (result: TestResult) => void;
}

export function TerminalView({ agentId, agentName, onTestComplete }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [session, setSession] = useState<TerminalSession>({
    ws: null,
    isConnected: false,
    isReady: false,
  });

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
      },
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.writeln('$ Initializing terminal...');

    // 窗口大小变化时自适应
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      xtermRef.current = null;
    };
  }, []);

  return (
    <div className="h-[500px] bg-black/60 rounded-xl p-4">
      <div ref={terminalRef} className="h-full" />
    </div>
  );
}
```

**Step 2: 测试终端渲染**

启动前端服务，切换到 Terminal 模式，确认：
- 终端正确渲染
- 显示初始化消息
- 窗口大小调整时终端自适应

**Step 3: 提交终端基础组件**

```bash
git add frontend/src/app/components/agent-test/TerminalView.tsx
git commit -m "feat: implement TerminalView with xterm.js integration"
```

---

### Task 7: 实现 WebSocket 连接和 PTY 通信

**Files:**
- Modify: `frontend/src/app/components/agent-test/TerminalView.tsx`

**Step 1: 添加 WebSocket 连接逻辑**

在 TerminalView 组件中添加：

```typescript
// 建立 WebSocket 连接
useEffect(() => {
  if (!xtermRef.current || session.isConnected) return;

  const terminal = xtermRef.current;
  const wsUrl = `ws://localhost:8000/agents/${agentId}/terminal`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    terminal.writeln('$ Connected to agent session');
    setSession(prev => ({ ...prev, ws, isConnected: true }));

    // 发送终端尺寸
    if (fitAddonRef.current) {
      ws.send(JSON.stringify({
        type: 'resize',
        cols: terminal.cols,
        rows: terminal.rows,
      }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'output':
          terminal.write(message.data);
          break;

        case 'ready':
          terminal.writeln(`\r\n$ ${message.message}`);
          terminal.writeln(`$ Agent "${agentName}" ready. Type your message and press Enter.\r\n`);
          setSession(prev => ({ ...prev, isReady: true }));
          break;

        case 'exit':
          terminal.writeln(`\r\n$ Session ended (exit code: ${message.code})`);
          setSession(prev => ({ ...prev, isReady: false }));

          // 保存到测试历史
          onTestComplete({
            id: `test-${Date.now()}`,
            input: 'Terminal session',
            output: message.output || '',
            success: message.code === 0,
            duration: 0,
            timestamp: new Date().toISOString(),
            model: 'terminal',
            agentId,
          });
          break;

        case 'error':
          terminal.writeln(`\r\n\x1b[31mError: ${message.message}\x1b[0m\r\n`);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    terminal.writeln('\r\n\x1b[31m$ Connection error\x1b[0m\r\n');
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    terminal.writeln('\r\n$ Connection closed\r\n');
    setSession({ ws: null, isConnected: false, isReady: false });
  };

  // 处理用户输入
  terminal.onData((data) => {
    if (session.isReady && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'input',
        data,
      }));
    }
  });

  return () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}, [agentId, agentName, session.isConnected]);
```

**Step 2: 提交 WebSocket 集成**

```bash
git add frontend/src/app/components/agent-test/TerminalView.tsx
git commit -m "feat: implement WebSocket connection and PTY communication"
```

---

### Task 8: 实现后端 WebSocket PTY 端点

**Files:**
- Create: `backend/app/api/websocket/terminal.py`
- Modify: `backend/app/api/routers/agents.py`
- Modify: `backend/requirements.txt`

**Step 1: 添加 ptyprocess 依赖**

```bash
cd backend
echo "ptyprocess>=0.7.0" >> requirements.txt
pip install ptyprocess
```

**Step 2: 创建 WebSocket PTY 处理器**

```python
# backend/app/api/websocket/terminal.py
import asyncio
import json
import ptyprocess
from fastapi import WebSocket, WebSocketDisconnect
from typing import Optional

class TerminalSession:
    def __init__(self, agent_id: int, agent_name: str):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.pty: Optional[ptyprocess.PtyProcess] = None
        self.output_buffer = ""

    async def start(self, websocket: WebSocket):
        """启动 PTY 进程"""
        try:
            # 启动 Claude CLI 并加载 agent
            self.pty = ptyprocess.PtyProcess.spawn(
                ['claude', '--agent', self.agent_name],
                dimensions=(24, 80)
            )

            # 发送就绪消息
            await websocket.send_json({
                'type': 'ready',
                'message': f'Agent session started'
            })

            # 启动输出读取任务
            asyncio.create_task(self._read_output(websocket))

        except Exception as e:
            await websocket.send_json({
                'type': 'error',
                'message': str(e)
            })

    async def _read_output(self, websocket: WebSocket):
        """读取 PTY 输出并发送到 WebSocket"""
        try:
            while self.pty and self.pty.isalive():
                try:
                    data = self.pty.read(1024)
                    if data:
                        self.output_buffer += data.decode('utf-8', errors='ignore')
                        await websocket.send_json({
                            'type': 'output',
                            'data': data.decode('utf-8', errors='ignore')
                        })
                except EOFError:
                    break
                await asyncio.sleep(0.01)

            # 进程结束
            exit_code = self.pty.wait() if self.pty else 1
            await websocket.send_json({
                'type': 'exit',
                'code': exit_code,
                'output': self.output_buffer
            })

        except Exception as e:
            print(f"Error reading PTY output: {e}")

    async def write_input(self, data: str):
        """写入用户输入到 PTY"""
        if self.pty and self.pty.isalive():
            self.pty.write(data.encode('utf-8'))

    async def resize(self, cols: int, rows: int):
        """调整终端尺寸"""
        if self.pty and self.pty.isalive():
            self.pty.setwinsize(rows, cols)

    def close(self):
        """关闭 PTY 进程"""
        if self.pty and self.pty.isalive():
            self.pty.terminate()
```

**Step 3: 添加 WebSocket 路由**

在 `backend/app/api/routers/agents.py` 中添加：

```python
from fastapi import WebSocket, WebSocketDisconnect
from app.api.websocket.terminal import TerminalSession

@router.websocket("/{agent_id}/terminal")
async def agent_terminal(agent_id: int, websocket: WebSocket):
    """Agent 终端 WebSocket 端点"""
    await websocket.accept()

    # 获取 agent 信息
    agent = await agent_service.get_agent(agent_id)
    if not agent:
        await websocket.send_json({
            'type': 'error',
            'message': f'Agent {agent_id} not found'
        })
        await websocket.close()
        return

    session = TerminalSession(agent_id, agent.name)

    try:
        await session.start(websocket)

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message['type'] == 'input':
                await session.write_input(message['data'])
            elif message['type'] == 'resize':
                await session.resize(message['cols'], message['rows'])
            elif message['type'] == 'close':
                break

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for agent {agent_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.send_json({
            'type': 'error',
            'message': str(e)
        })
    finally:
        session.close()
        await websocket.close()
```

**Step 4: 测试 WebSocket 端点**

启动后端服务：
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

使用前端测试终端连接和交互

**Step 5: 提交后端 WebSocket PTY 实现**

```bash
git add backend/app/api/websocket/terminal.py backend/app/api/routers/agents.py backend/requirements.txt
git commit -m "feat: implement WebSocket PTY endpoint for terminal mode"
```

---

## Phase 4: 测试与优化

### Task 9: 添加错误处理和边界情况

**Files:**
- Modify: `frontend/src/app/components/agent-test/ChatView.tsx`
- Modify: `frontend/src/app/components/agent-test/TerminalView.tsx`

**Step 1: ChatView 添加重试机制**

在 ChatView 的 handleSend 中添加：

```typescript
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 3;

// 在 onError 回调中添加重试逻辑
if (retryCount < MAX_RETRIES) {
  setTimeout(() => {
    setRetryCount(prev => prev + 1);
    handleSend();
  }, 2000);
} else {
  setRetryCount(0);
  // 显示最终错误
}
```

**Step 2: TerminalView 添加重连机制**

在 TerminalView 中添加：

```typescript
const [reconnectAttempts, setReconnectAttempts] = useState(0);
const MAX_RECONNECT_ATTEMPTS = 3;

// 在 ws.onclose 中添加
if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
  setTimeout(() => {
    setReconnectAttempts(prev => prev + 1);
    setSession({ ws: null, isConnected: false, isReady: false });
  }, 2000);
}
```

**Step 3: 添加模式切换确认对话框**

在 AgentTestPanel 中添加：

```typescript
const handleModeSwitch = (newMode: ViewMode) => {
  if (isRunning) {
    if (confirm('当前有正在执行的任务，切换模式将中断执行，是否继续？')) {
      setViewMode(newMode);
    }
  } else {
    setViewMode(newMode);
  }
};
```

**Step 4: 提交错误处理**

```bash
git add frontend/src/app/components/agent-test/
git commit -m "feat: add error handling and retry mechanisms"
```

---

### Task 10: 性能优化

**Files:**
- Modify: `frontend/src/app/components/agent-test/MessageBubble.tsx`
- Modify: `frontend/src/app/components/agent-test/ChatView.tsx`

**Step 1: 优化 MessageBubble 渲染**

```typescript
// frontend/src/app/components/agent-test/MessageBubble.tsx
import React, { memo } from 'react';

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  // ... 组件代码
});
```

**Step 2: 添加消息列表虚拟滚动（可选）**

如果消息超过 100 条，考虑使用 react-window：

```bash
npm install react-window
```

**Step 3: 优化 WebSocket 消息批处理**

在 TerminalView 中添加消息批处理：

```typescript
const messageQueue: string[] = [];
let flushTimer: NodeJS.Timeout | null = null;

ws.onmessage = (event) => {
  messageQueue.push(event.data);

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      messageQueue.forEach(data => {
        // 处理消息
      });
      messageQueue.length = 0;
      flushTimer = null;
    }, 50); // 50ms 批处理
  }
};
```

**Step 4: 提交性能优化**

```bash
git add frontend/src/app/components/agent-test/
git commit -m "perf: optimize message rendering and WebSocket batching"
```

---

## Phase 5: 文档与发布

### Task 11: 更新用户文档

**Files:**
- Create: `docs/guides/agent-test-dual-mode.md`

**Step 1: 编写用户指南**

```markdown
# AgentTest 双模式交互指南

## 概述
AgentTest 页面现在支持两种交互模式：对话框模式和终端模式。

## 对话框模式
- 微信风格的气泡对话
- 支持一键优化 prompt
- 实时流式输出
- 适合快速测试和查看格式化输出

## 终端模式
- 真实的终端环境
- 通过 WebSocket PTY 与 Agent 交互
- 支持完整的终端特性
- 适合调试和查看原始日志

## 使用方法
1. 进入 Agent 详情页
2. 点击右上角的模式切换按钮
3. 选择对话框或终端模式
4. 开始与 Agent 交互

## 常见问题
...
```

**Step 2: 提交文档**

```bash
git add docs/guides/agent-test-dual-mode.md
git commit -m "docs: add user guide for dual-mode interaction"
```

---

### Task 12: 最终测试和发布

**Step 1: 运行完整测试**

```bash
# 前端测试
cd frontend
npm run test

# 后端测试
cd backend
pytest
```

**Step 2: E2E 测试**

手动测试以下场景：
- [ ] Chat 模式发送消息
- [ ] Chat 模式一键优化
- [ ] Terminal 模式连接
- [ ] Terminal 模式输入输出
- [ ] 模式切换
- [ ] 错误处理
- [ ] 测试历史保存

**Step 3: 创建发布标签**

```bash
git tag -a v0.2.0 -m "feat: add dual-mode interaction for AgentTest"
git push origin v0.2.0
```

---

## 总结

实施计划完成后，AgentTest 页面将具备：
- ✅ 对话框模式（微信风格气泡）
- ✅ 终端模式（xterm.js + WebSocket PTY）
- ✅ 无缝模式切换
- ✅ 一键优化 prompt
- ✅ 错误处理和重试机制
- ✅ 性能优化
- ✅ 完整的用户文档

预计实施时间：10-13 天
