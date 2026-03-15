# tmux 会话管理 - 测试指南

**日期**: 2026-03-15
**状态**: 准备测试

## 修复内容

修复了 `Cannot access 'createTerminal' before initialization` 错误：
- 将 `restoreTmuxSession`、`handleRestoreSessions`、`handleIgnoreSessions` 函数移到 `createTerminal` 之后
- 确保函数依赖顺序正确

## 快速测试步骤

### 1. 基础功能测试

#### 测试 Detach 模式

1. 打开浏览器：http://localhost:5173
2. 进入设置页面
3. 找到"终端设置"部分
4. 确认"关闭终端时的默认行为"为 **Detach**
5. 进入 Terminal 页面
6. 创建一个新终端
7. 运行命令：`top`
8. 点击终端标签页的关闭按钮（X）
9. **预期结果**：
   - ✅ 终端标签页关闭
   - ✅ 显示通知："tmux 会话已暂离"
   - ✅ 在外部终端运行 `tmux ls`，应该看到会话仍在运行

#### 测试恢复对话框

1. 刷新浏览器页面（Cmd+R 或 Ctrl+R）
2. **预期结果**：
   - ✅ 显示恢复对话框
   - ✅ 列出刚才暂离的会话
   - ✅ 显示会话信息（会话名、项目路径、暂离时间）
3. 选择会话，点击"恢复"按钮
4. **预期结果**：
   - ✅ 对话框关闭
   - ✅ 终端重新连接
   - ✅ 显示之前运行的 `top` 命令

#### 测试 Kill 模式

1. 进入设置页面
2. 将"关闭终端时的默认行为"改为 **Kill**
3. 进入 Terminal 页面
4. 创建一个新终端
5. 点击关闭按钮
6. **预期结果**：
   - ✅ 显示确认对话框："tmux 会话仍在运行，关闭将终止会话。确定要关闭吗？"
7. 点击"确定"
8. **预期结果**：
   - ✅ 终端标签页关闭
   - ✅ 在外部终端运行 `tmux ls`，会话已被终止

### 2. 自动恢复测试

1. 进入设置页面
2. 开启"刷新页面时自动恢复会话"
3. 确认"关闭终端时的默认行为"为 **Detach**
4. 进入 Terminal 页面
5. 创建一个新终端，运行 `top`
6. 关闭终端（Detach）
7. 刷新页面
8. **预期结果**：
   - ✅ 不显示恢复对话框
   - ✅ 自动恢复会话
   - ✅ 终端显示之前的 `top` 命令

### 3. 边界情况测试

#### 测试会话已被外部 kill

1. 创建终端，关闭（Detach）
2. 在外部终端执行：`tmux ls` 查看会话名
3. 执行：`tmux kill-session -t <session_name>`
4. 刷新浏览器页面
5. 在恢复对话框中选择该会话，点击恢复
6. **预期结果**：
   - ✅ 显示错误通知："无法恢复 tmux 会话，会话可能已被终止"
   - ✅ localStorage 清理了无效会话

#### 测试多个会话

1. 创建 3 个终端
2. 关闭第 1 个（Detach）
3. 关闭第 2 个（Kill）
4. 保持第 3 个运行
5. 刷新页面
6. **预期结果**：
   - ✅ 恢复对话框只显示第 1 个会话
   - ✅ 第 3 个会话正常恢复（未关闭）

## 检查点

### localStorage 检查

打开浏览器开发者工具 → Application → Local Storage：

1. **tmux_sessions**：
   ```json
   {
     "session_name": {
       "sessionName": "session_name",
       "state": "detached",
       "lastDetachTime": 1710489600000,
       "projectPath": "/path/to/project"
     }
   }
   ```

2. **tmux_settings**：
   ```json
   {
     "defaultCloseAction": "detach",
     "autoRestoreOnRefresh": false
   }
   ```

### 后端 API 检查

1. 检查 tmux 会话：
   ```bash
   curl http://localhost:8000/terminal/tmux/check/<session_name>
   ```

2. 连接 tmux 会话：
   ```bash
   curl -X POST http://localhost:8000/terminal/tmux/attach/<session_name>
   ```

## 常见问题

### 问题 1: 恢复对话框不显示

**原因**：可能是 localStorage 中没有 detached 会话

**解决**：
1. 检查 localStorage 中的 `tmux_sessions`
2. 确认有 `state: 'detached'` 的会话
3. 确认"刷新页面时自动恢复会话"为关闭状态

### 问题 2: 恢复失败

**原因**：tmux 会话可能已被终止

**解决**：
1. 在外部终端运行 `tmux ls` 检查会话是否存在
2. 如果不存在，点击"忽略全部"清理无效会话

### 问题 3: 设置不生效

**原因**：localStorage 可能被缓存

**解决**：
1. 清除浏览器缓存（Ctrl+Shift+R 或 Cmd+Shift+R）
2. 重新设置选项

## 性能检查

1. **对话框渲染速度**：应在 < 100ms 内显示
2. **恢复会话速度**：应在 < 2s 内完成
3. **localStorage 读写**：应无明显延迟

## 成功标准

- ✅ 所有基础功能测试通过
- ✅ 自动恢复功能正常
- ✅ 边界情况处理正确
- ✅ localStorage 数据结构正确
- ✅ 后端 API 响应正常
- ✅ 无控制台错误
- ✅ 用户体验流畅

## 下一步

如果测试通过：
1. 更新文档索引
2. 创建 Release Notes
3. 提交代码

如果测试失败：
1. 记录错误信息
2. 分析根本原因
3. 修复并重新测试
