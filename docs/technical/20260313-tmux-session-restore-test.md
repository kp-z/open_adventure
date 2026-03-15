# tmux 会话恢复测试

## 测试场景

### 场景 1: 关闭浏览器（不点击 X）

**步骤**：
1. 创建一个 Terminal（选择 project）
2. 观察 🔒 图标显示
3. 在 terminal 中运行：`echo "test" && sleep 300`
4. 关闭浏览器标签页（不点击 X）
5. 重新打开浏览器，访问 http://localhost:5173
6. 导航到 Terminal 页面

**当前行为**：
- ✅ Terminal 窗口自动恢复
- ✅ 可以看到之前的输出
- ✅ 可以继续输入命令
- ❌ 🔒 图标不显示
- ❌ 不知道关联的 tmux 会话
- ❌ 关闭时不会提示

**预期行为**：
- ✅ Terminal 窗口自动恢复
- ✅ 可以看到之前的输出
- ✅ 可以继续输入命令
- ✅ 🔒 图标应该显示
- ✅ 知道关联的 tmux 会话
- ✅ 关闭时应该提示

### 场景 2: 点击 X 关闭

**步骤**：
1. 创建一个 Terminal
2. 点击 X 按钮
3. 确认对话框出现
4. 点击"确定"

**当前行为**：
- ✅ 显示确认对话框
- ✅ 关闭后 tmux 会话被终止
- ✅ 后端会话被关闭

### 场景 3: 刷新页面

**步骤**：
1. 创建一个 Terminal
2. 按 F5 刷新页面

**当前行为**：
- ✅ Terminal 窗口自动恢复
- ❌ 🔒 图标不显示

## 问题总结

### 核心问题

**tmux 信息未恢复**：
- localStorage 中保存了 tmux 信息
- 但恢复时没有读取
- 导致 UI 状态不一致

### 影响

1. **用户体验差**：
   - 用户不知道 terminal 关联了 tmux 会话
   - 关闭时没有警告
   - 可能意外终止长时间运行的任务

2. **功能不完整**：
   - tmux 持久化的核心价值（会话恢复）没有完全实现
   - 只实现了后端会话恢复，没有实现 tmux 状态恢复

## 解决方案

### 方案 1: 完整恢复 tmux 状态（推荐）

**修改位置**：`frontend/src/app/contexts/TerminalContext.tsx`

1. 在 `restoreSessions()` 中读取 tmux 信息
2. 传递给 `initTerminal()`
3. 恢复后调用 `checkTmuxAlive()` 验证
4. 更新 UI 状态

**优点**：
- 完整的用户体验
- tmux 功能完全可用
- 状态一致

**缺点**：
- 需要修改恢复逻辑
- 增加一次 API 调用（检查 tmux 存活）

### 方案 2: 从后端获取 tmux 信息

**修改位置**：`backend/app/api/terminal.py`

在 `/terminal/status` API 中返回 tmux 信息：

```python
{
  "active_sessions": [
    {
      "session_id": "xxx",
      "initial_dir": "/path",
      "use_tmux": true,
      "tmux_session_name": "oa_xxx"
    }
  ]
}
```

**优点**：
- 数据来源权威（后端）
- 不依赖 localStorage
- 更可靠

**缺点**：
- 需要修改后端 API
- 需要修改前端解析逻辑

### 方案 3: 混合方案（最佳）

1. 后端 API 返回 tmux 信息
2. 前端优先使用后端数据
3. 如果后端没有，fallback 到 localStorage
4. 恢复后验证 tmux 会话是否存活

## 建议

**立即实现方案 3**：
1. 修改后端 `/terminal/status` API
2. 修改前端 `restoreSessions()` 逻辑
3. 添加 tmux 存活检查
4. 更新 UI 状态

**预计工作量**：
- 后端修改：10 分钟
- 前端修改：20 分钟
- 测试：10 分钟
- 总计：40 分钟

## 测试计划

1. 创建 Terminal（选择 project）
2. 验证 🔒 图标显示
3. 关闭浏览器
4. 重新打开
5. 验证：
   - ✅ Terminal 窗口恢复
   - ✅ 🔒 图标显示
   - ✅ 可以继续使用
   - ✅ 关闭时有提示
6. 在服务器上验证 tmux 会话仍在运行
