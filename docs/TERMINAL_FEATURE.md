# 网页终端功能

## 功能概述
在浏览器中直接运行 shell 命令的交互式终端。

## 访问方式
1. 打开首页：http://localhost:3000
2. 点击 "Terminal" 卡片
3. 或直接访问：http://localhost:3000/terminal

## 功能特性
- ✅ 实时交互式终端
- ✅ 支持所有 shell 命令
- ✅ WebSocket 实时通信
- ✅ 终端窗口自适应调整
- ✅ 支持 Ctrl+C 中断命令
- ✅ 支持命令历史记录（上下箭头）
- ✅ 支持 Tab 自动补全
- ✅ 支持链接点击（URL 自动识别）

## 技术实现
### 前端
- **xterm.js**: 终端模拟器
- **WebSocket**: 实时双向通信
- **Next.js Dynamic Import**: 避免 SSR 问题

### 后端
- **PTY (Pseudo Terminal)**: 真实的伪终端
- **FastAPI WebSocket**: 实时通信
- **Bash Shell**: 完整的 shell 环境

## 使用示例

### 基本命令
```bash
# 查看当前目录
pwd

# 列出文件
ls -la

# 查看系统信息
uname -a

# 运行 Python 脚本
python test_api.py
```

### 工作目录
默认工作目录：`/Users/kp/项目/Proj/claude_manager/backend`

### 快捷键
- `Ctrl+C`: 中断当前命令
- `Ctrl+D`: 退出 shell（会断开连接）
- `↑/↓`: 浏览命令历史
- `Tab`: 自动补全

## 安全注意事项
⚠️ **重要提示**：
- 终端命令在后端服务器环境中执行
- 具有完整的文件系统访问权限
- 生产环境中应添加身份验证和权限控制
- 建议限制可执行的命令范围

## API 端点

### WebSocket 连接
```
ws://127.0.0.1:8000/api/terminal/ws
```

### 状态检查
```bash
curl http://127.0.0.1:8000/api/terminal/status
```

响应示例：
```json
{
  "available": true,
  "active_sessions": 0,
  "platform": "posix"
}
```

## 故障排除

### 连接失败
1. 确认后端服务器正在运行
2. 检查 WebSocket 端口 8000 是否开放
3. 查看浏览器控制台错误信息

### 命令无响应
1. 尝试按 Ctrl+C 中断
2. 点击 "Reconnect" 按钮重新连接
3. 刷新页面重新初始化

### 显示问题
1. 点击 "Clear" 清空终端
2. 调整浏览器窗口大小触发重新适配
3. 检查浏览器是否支持 WebSocket

## 未来改进
- [ ] 添加用户身份验证
- [ ] 实现命令白名单/黑名单
- [ ] 添加会话管理（多终端）
- [ ] 支持文件上传/下载
- [ ] 添加终端录制功能
- [ ] 实现终端分享功能
- [ ] 添加语法高亮
- [ ] 支持主题切换

## 相关文件
- 前端页面：`frontend/app/terminal/page.tsx`
- 终端组件：`frontend/components/Terminal.tsx`
- 后端 API：`backend/app/api/terminal.py`
- 主应用配置：`backend/app/main.py`
