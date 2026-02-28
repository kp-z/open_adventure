# Claude Manager 故障排查指南

**创建日期**: 2026-02-28
**状态**: 已发布

## 常见问题

### 1. Shell 启动警告：autojump not found

**问题描述**：
启动时出现警告：`[oh-my-zsh] autojump not found. Please install it first.`

**原因**：
- 系统的 zsh 配置（`~/.zshrc`）中启用了 `autojump` 插件
- 但系统未安装 `autojump` 工具

**影响**：
- 不影响 Claude Manager 的正常运行
- 仅在启动时显示警告信息

**解决方案**：

#### 方案 1：安装 autojump（推荐）
```bash
# macOS
brew install autojump

# Ubuntu/Debian
sudo apt-get install autojump

# 安装后重启终端
```

#### 方案 2：禁用 autojump 插件
编辑 `~/.zshrc`，找到 `plugins=()` 行，移除 `autojump`：
```bash
# 修改前
plugins=(git autojump other-plugins)

# 修改后
plugins=(git other-plugins)
```

然后重新加载配置：
```bash
source ~/.zshrc
```

#### 方案 3：忽略警告
如果不需要 autojump 功能，可以直接忽略此警告，不影响使用。

---

### 2. 版本升级后新功能不可用

**问题描述**：
- 解压新版本后，旧版本的后端服务仍在运行
- 新版本的 API 端点返回 404 错误
- 例如：`/api/token-usage` 不可用

**原因**：
- 旧版本的后端进程未停止
- 端口 8000 被旧版本占用

**解决方案**：

#### 自动解决（v0.1.6+）
新版本的 `start.sh` 会自动检测端口占用并提示：
```bash
⚠️  Port 8000 is already in use
This might be an old version of Claude Manager still running.

Do you want to stop the existing process? [y/N]
```

输入 `y` 即可自动停止旧进程。

#### 手动解决
```bash
# 查找占用端口 8000 的进程
lsof -i :8000

# 停止所有 Claude Manager 后端进程
pkill -f "uvicorn app.main:app"
pkill -f "python run.py"

# 等待 2 秒后重新启动
sleep 2
./start.sh
```

---

### 3. Dashboard 页面崩溃

**问题描述**：
- 首次访问 Dashboard 页面时崩溃
- 控制台报错：`TypeError: Cannot read properties of undefined (reading 'toFixed')`

**原因**：
- Token 使用数据未加载时，`tokenUsage.percentage` 为 `undefined`
- 代码直接调用 `.toFixed()` 方法导致崩溃

**解决方案**：
已在 v0.1.6 版本修复，升级到最新版本即可。

如果仍有问题，请清除浏览器缓存：
```bash
# Chrome/Edge
Ctrl+Shift+Delete (Windows/Linux)
Cmd+Shift+Delete (macOS)

# 选择"缓存的图片和文件"并清除
```

---

### 4. 前端无法连接后端

**问题描述**：
- 前端页面加载正常，但无法获取数据
- 控制台报错：`Failed to fetch` 或 `Network Error`

**排查步骤**：

1. **检查后端是否运行**
   ```bash
   lsof -i :8000
   # 应该看到 python 进程
   ```

2. **检查后端日志**
   ```bash
   tail -f docs/logs/backend.log
   ```

3. **测试后端 API**
   ```bash
   curl http://localhost:8000/api/health
   # 应该返回 {"status": "ok"}
   ```

4. **检查前端配置**
   ```bash
   cat frontend/.env.local
   # 确认 VITE_API_BASE_URL 正确
   ```

**解决方案**：
- 如果后端未运行，重新执行 `./start.sh`
- 如果端口被占用，参考"版本升级后新功能不可用"
- 如果配置错误，删除 `frontend/.env.local` 并重新启动

---

### 5. 移动端终端无法输入

**问题描述**：
- 移动设备上打开 Terminal 页面
- 点击终端区域，虚拟键盘不弹出

**解决方案**：
已在 v0.1.6 版本优化，升级到最新版本即可。

临时解决方案：
- 点击右上角的"Focus Terminal"按钮（键盘图标）
- 或者刷新页面后重试

---

### 6. 局域网访问失败

**问题描述**：
- 手机或其他设备无法通过局域网 IP 访问

**排查步骤**：

1. **确认局域网 IP**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # 记下显示的 IP 地址
   ```

2. **检查防火墙**
   ```bash
   # macOS
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

   # 如果防火墙开启，添加规则允许端口 5173 和 8000
   ```

3. **确认设备在同一网络**
   - 手机和电脑必须连接到同一个 Wi-Fi

**解决方案**：
- 关闭防火墙或添加端口规则
- 使用 `start.sh` 启动时会自动配置局域网访问
- 手动访问：`http://<局域网IP>:5173`

---

## 获取帮助

如果以上方案无法解决问题，请：

1. 查看日志文件：
   - 后端日志：`docs/logs/backend.log`
   - 前端日志：浏览器控制台（F12）

2. 提供以下信息：
   - 操作系统版本
   - Claude Manager 版本
   - 错误信息截图
   - 相关日志内容

3. 联系支持或提交 Issue
