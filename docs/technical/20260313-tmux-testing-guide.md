# Terminal tmux 功能测试指南

**日期**: 2026-03-13
**状态**: 测试中

## 自动化测试结果 ✅

### API 测试
- ✅ tmux 安装检查 API
- ✅ 列出 tmux 会话 API
- ✅ 关闭 tmux 会话 API
- ✅ tmux 会话生命周期管理

所有后端 API 测试通过！

## 手动测试步骤

### 1. 基本功能测试

#### 1.1 创建 Terminal 并验证 tmux 会话

1. 打开浏览器访问 http://localhost:5173
2. 导航到 Terminal 页面
3. 点击 "New Terminal" 按钮
4. 观察：
   - ✅ Terminal 应该成功创建
   - ✅ Tab 标题旁应该显示 🔒 图标（表示 tmux 会话运行中）
   - ✅ Terminal 可以正常输入和输出

5. 在服务器上验证 tmux 会话：
   ```bash
   tmux list-sessions
   ```
   应该看到类似 `oa_xxxxxxxx` 的会话

#### 1.2 测试持久化功能

1. 在 Terminal 中运行一个长时间任务：
   ```bash
   echo "开始测试" && sleep 300 && echo "测试完成"
   ```

2. 关闭浏览器标签页（不要点击关闭按钮）

3. 在服务器上验证 tmux 会话仍在运行：
   ```bash
   tmux list-sessions
   ```

4. 连接到 tmux 会话查看任务状态：
   ```bash
   tmux attach -t oa_xxxxxxxx
   ```
   应该看到任务仍在运行

5. 按 `Ctrl+B` 然后按 `D` 退出 tmux（不终止会话）

6. 重新打开浏览器，访问 Terminal 页面
   - ⚠️ 注意：当前版本可能需要手动重连到会话

#### 1.3 测试关闭确认对话框

1. 创建一个 Terminal（确保 tmux 会话运行中）
2. 点击 Tab 上的关闭按钮（X）
3. 观察：
   - ✅ 应该弹出确认对话框："tmux 会话仍在运行，关闭将终止会话。确定要关闭吗？"
   - ✅ 点击"取消"应该保留 Terminal
   - ✅ 点击"确定"应该关闭 Terminal 并终止 tmux 会话

4. 验证 tmux 会话已终止：
   ```bash
   tmux list-sessions
   ```

### 2. 错误处理测试

#### 2.1 测试 tmux 未安装的降级处理

1. 卸载 tmux：
   ```bash
   brew uninstall tmux
   ```

2. 重启后端服务：
   ```bash
   ./stop.sh && ./start.sh
   ```

3. 创建新 Terminal
4. 观察：
   - ✅ Terminal 应该正常创建（使用普通 pty）
   - ✅ Tab 标题旁不应该显示 🔒 图标
   - ✅ 后端日志应该显示降级提示

5. 重新安装 tmux：
   ```bash
   brew install tmux
   ```

#### 2.2 测试 tmux 会话冲突

1. 手动创建一个会话：
   ```bash
   tmux new-session -d -s oa_test
   ```

2. 创建多个 Terminal
3. 观察：
   - ✅ 每个 Terminal 应该有唯一的 tmux 会话名称
   - ✅ 不应该出现会话名称冲突

### 3. 性能测试

#### 3.1 测试多个 tmux 会话

1. 创建 5 个 Terminal
2. 在每个 Terminal 中运行不同的命令
3. 观察：
   - ✅ 所有 Terminal 应该正常工作
   - ✅ 没有明显的性能下降
   - ✅ 每个 Terminal 有独立的 tmux 会话

4. 验证所有会话：
   ```bash
   tmux list-sessions
   ```

#### 3.2 测试长时间运行

1. 创建一个 Terminal
2. 运行一个长时间任务（如编译、测试等）
3. 保持浏览器打开 30 分钟
4. 观察：
   - ✅ Terminal 连接保持稳定
   - ✅ 没有断线或重连
   - ✅ 输出正常显示

### 4. 用户体验测试

#### 4.1 测试状态指示器

1. 创建 Terminal
2. 观察 🔒 图标：
   - ✅ 图标应该清晰可见
   - ✅ 鼠标悬停应该显示 "tmux 会话运行中"
   - ✅ 图标颜色应该醒目（黄色）

#### 4.2 测试关闭流程

1. 创建 Terminal
2. 尝试关闭：
   - ✅ 确认对话框文字清晰易懂
   - ✅ 按钮操作符合预期
   - ✅ 取消后 Terminal 保持正常

## 已知问题

1. **会话恢复功能未完全实现**：
   - 关闭浏览器后重新打开，无法自动恢复到之前的 tmux 会话
   - 需要手动实现会话恢复逻辑

2. **LocalStorage 持久化**：
   - tmux 会话信息已保存到 localStorage
   - 但恢复逻辑尚未实现

## 测试结果

### 后端测试
- ✅ tmux 检测和安装检查
- ✅ tmux 会话创建
- ✅ tmux 会话列表
- ✅ tmux 会话关闭
- ✅ WebSocket 参数传递

### 前端测试
- ⏳ Terminal 创建（待手动验证）
- ⏳ tmux 图标显示（待手动验证）
- ⏳ 关闭确认对话框（待手动验证）
- ⏳ 会话持久化（待手动验证）

## 下一步优化

1. **实现会话恢复**：
   - 从 localStorage 读取 tmux 会话信息
   - 检查会话是否存活
   - 自动重连到存活的会话

2. **改进用户体验**：
   - 添加 tmux 会话列表查看功能
   - 支持手动选择要恢复的会话
   - 添加会话超时清理机制

3. **增强错误处理**：
   - 更友好的错误提示
   - 自动重试机制
   - 会话异常恢复

## 测试命令速查

```bash
# 查看所有 tmux 会话
tmux list-sessions

# 连接到指定会话
tmux attach -t oa_xxxxxxxx

# 关闭指定会话
tmux kill-session -t oa_xxxxxxxx

# 查看后端日志
tail -f backend/docs/logs/backend.log | grep -i tmux

# 测试 API
curl http://localhost:38080/api/terminal/tmux/check | jq
curl http://localhost:38080/api/terminal/tmux/sessions | jq
curl -X POST http://localhost:38080/api/terminal/tmux/kill/session_name | jq
```
