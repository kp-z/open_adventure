# 终端自动启动 Claude - 使用说明

## 当前状态
✅ 后端代码已更新
✅ 自动启动功能已实现
✅ 调试日志已添加

## 如何使用

### 1. 确认配置
已有 2 个启用的项目路径：
- `/Users/kp/项目/Proj/claude_manager` (第一个，将被使用)
- `/Users/kp/项目/Proj/steady`

### 2. 打开终端
在前端界面点击 "Terminal" 或 "SHELL" 菜单

### 3. 预期行为
1. Shell 启动（显示提示符）
2. 0.5 秒后自动执行 `cd "/Users/kp/项目/Proj/claude_manager"`
3. 0.2 秒后自动执行 `claude`
4. Claude Code CLI 启动

### 4. 查看日志
如果需要调试，可以查看后端日志：
```bash
tail -f /tmp/backend.log | grep Terminal
```

应该能看到：
```
[Terminal] WebSocket connection accepted
[Terminal] Found 2 enabled project paths
[Terminal] Will start in project directory: /Users/kp/项目/Proj/claude_manager
[Terminal] Auto-start Claude: True
[Terminal] Setting up auto-start commands for: /Users/kp/项目/Proj/claude_manager
[Terminal] Sending cd command to: /Users/kp/项目/Proj/claude_manager
[Terminal] Sending claude command
[Terminal] Startup commands sent successfully
```

## 故障排查

### 问题：终端没有自动切换目录
**检查：**
1. 后端服务是否运行：`curl http://localhost:8000/api/terminal/status`
2. 是否有启用的项目路径：`curl 'http://localhost:8000/api/project-paths?enabled=true'`
3. 查看后端日志：`tail -f /tmp/backend.log | grep Terminal`

### 问题：Claude 没有自动启动
**检查：**
1. Claude CLI 是否安装：`which claude`
2. 查看后端日志是否有错误
3. 手动在终端执行 `claude` 命令测试

### 问题：前端连接失败
**检查：**
1. 浏览器控制台是否有错误
2. WebSocket 连接是否成功：检查 Network 标签
3. 后端服务是否正常运行

## 配置修改

### 更改默认项目目录
方法 1：禁用当前第一个路径
```bash
curl -X POST http://localhost:8000/api/project-paths/1/toggle
```

方法 2：删除当前第一个路径
```bash
curl -X DELETE http://localhost:8000/api/project-paths/1
```

### 添加新项目路径
```bash
curl -X POST http://localhost:8000/api/project-paths \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/path/to/your/project",
    "alias": "My Project",
    "enabled": true
  }'
```

## 技术细节
- 使用 PTY (Pseudo Terminal) 实现真实的终端环境
- 通过 WebSocket 实时通信
- 启动命令通过写入 PTY 的方式发送，就像用户手动输入
- 延迟 0.5 秒等待 shell 准备好，确保命令能正确执行
