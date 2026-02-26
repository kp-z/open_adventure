# Claude Manager 打包问题修复说明

## 问题描述

打包后的应用在新机器上运行时出现以下问题：
1. `ModuleNotFoundError: No module named 'app'` - 无法找到 app 模块
2. 入口地址指向根路径而非前端 dashboard

## 修复内容

### 1. 修复模块导入问题 (main_packaged.py)

**问题原因**: PyInstaller 打包后，`app` 模块不在 Python 的模块搜索路径中

**解决方案**:
- 在打包环境中，将 `sys._MEIPASS` 添加到 `sys.path`
- 在开发环境中，将 `backend` 目录添加到 `sys.path`

```python
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys._MEIPASS)
    # 将 app 模块路径添加到 sys.path
    APP_DIR = BASE_DIR / "app"
    if APP_DIR.exists():
        sys.path.insert(0, str(BASE_DIR))
else:
    BASE_DIR = Path(__file__).parent
    sys.path.insert(0, str(BASE_DIR))
```

### 2. 添加自动打开浏览器功能

**新增功能**:
- 启动后自动打开浏览器访问 `/dashboard`
- 支持 `--no-browser` 参数禁用自动打开
- 使用独立线程延迟 1.5 秒打开，确保服务器已启动

```python
def open_browser(port: int, delay: float = 1.5):
    """延迟打开浏览器"""
    time.sleep(delay)
    url = f"http://localhost:{port}/dashboard"
    print(f"🌐 正在打开浏览器: {url}")
    webbrowser.open(url)
```

### 3. 更新打包配置 (claude_manager.spec)

**问题原因**: `.spec` 文件没有收集 `app` 模块的 Python 文件

**解决方案**:
- 添加代码收集整个 `app` 目录的 `.py` 文件
- 在 `hiddenimports` 中显式声明所有 `app` 子模块
- 将 `app_datas` 合并到 `datas` 列表

```python
# 收集 app 模块（整个目录）
app_datas = []
if app_dir.exists():
    for root, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for file in files:
            if file.endswith('.py'):
                src = Path(root) / file
                dst = Path('app') / src.relative_to(app_dir).parent
                app_datas.append((str(src), str(dst)))
```

## 重新打包步骤

### macOS/Linux

```bash
# 1. 确保前端已构建
cd frontend
npm run build:prod
cd ..

# 2. 运行打包脚本
chmod +x scripts/build_macos.sh  # macOS
# 或
chmod +x scripts/build_linux.sh  # Linux

./scripts/build_macos.sh  # macOS
# 或
./scripts/build_linux.sh  # Linux

# 3. 测试打包结果
./backend/dist/claude-manager
```

### 手动打包

```bash
# 1. 进入后端目录
cd backend

# 2. 安装 PyInstaller
pip install pyinstaller

# 3. 清理旧构建
rm -rf build/ dist/

# 4. 执行打包
pyinstaller claude_manager.spec

# 5. 测试
./dist/claude-manager
```

## 命令行参数

```bash
# 默认启动（自动打开浏览器）
./claude-manager

# 指定端口
./claude-manager --port 9000

# 不自动打开浏览器
./claude-manager --no-browser

# 指定监听地址
./claude-manager --host 127.0.0.1
```

## 验证步骤

1. **复制到新位置测试**:
   ```bash
   cp backend/dist/claude-manager ~/Desktop/
   cd ~/Desktop
   ./claude-manager
   ```

2. **检查启动信息**:
   - 应显示前端资源路径
   - 应显示数据库路径
   - 应显示访问地址为 `http://localhost:8000/dashboard`

3. **验证浏览器自动打开**:
   - 浏览器应自动打开并访问 dashboard
   - 如果不想自动打开，使用 `--no-browser` 参数

4. **验证功能**:
   - 访问 `/dashboard` 应显示前端界面
   - API 端点应正常工作
   - 数据库应正确初始化在 `~/.claude_manager/`

## 文件变更清单

- ✅ `backend/main_packaged.py` - 修复模块导入，添加自动打开浏览器
- ✅ `backend/claude_manager.spec` - 添加 app 模块收集，更新 hiddenimports
- ✅ `scripts/build_macos.sh` - 新增 macOS 打包脚本

## 注意事项

1. **数据库位置**: 打包后的应用会在 `~/.claude_manager/` 创建用户数据库
2. **配置文件**: 可在 `~/.claude_manager/.env` 放置用户配置
3. **跨平台**: 需要在目标平台上重新打包（macOS 打包的无法在 Linux 运行）
4. **依赖版本**: 确保 PyInstaller 版本 >= 5.0

## 故障排查

### 问题: 仍然报 ModuleNotFoundError

**解决方案**:
1. 检查 `backend/app/` 目录是否存在
2. 确认打包时有 "✓ 收集 app 模块: X 个文件" 的输出
3. 检查 `dist/` 目录中是否包含 `app/` 文件夹

### 问题: 浏览器没有自动打开

**解决方案**:
1. 检查是否使用了 `--no-browser` 参数
2. 手动访问 `http://localhost:8000/dashboard`
3. 检查防火墙设置

### 问题: 前端资源 404

**解决方案**:
1. 确认 `frontend/dist` 存在且已构建
2. 检查打包时有 "✓ 收集前端文件: X 个" 的输出
3. 检查环境变量 `FRONTEND_DIST_DIR` 是否正确设置
