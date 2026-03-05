# Open Adventure 打包修复总结

## 修复日期
2026-02-25

## 问题描述
打包后的 open-adventure 应用在新机器上运行时出现两个主要问题：
1. **模块导入错误**: `ModuleNotFoundError: No module named 'app'`
2. **入口地址错误**: 启动后显示 `http://localhost:8000` 而非 `/dashboard`

## 根本原因分析

### 问题 1: 模块导入错误
- PyInstaller 将所有文件打包到临时目录 `sys._MEIPASS`
- `app` 模块虽然被打包，但不在 Python 的模块搜索路径 `sys.path` 中
- uvicorn 尝试导入 `"app.main:app"` 时失败

### 问题 2: 入口地址错误
- 原代码显示的访问地址为根路径 `http://localhost:8000`
- 前端实际入口在 `/dashboard`
- 没有自动打开浏览器的功能

## 解决方案

### 1. 修改 `backend/main_packaged.py`

#### 添加模块路径
```python
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys._MEIPASS)
    # 将 app 模块路径添加到 sys.path
    APP_DIR = BASE_DIR / "app"
    if APP_DIR.exists():
        sys.path.insert(0, str(BASE_DIR))
```

#### 添加自动打开浏览器
```python
import webbrowser
import threading
import time

def open_browser(port: int, delay: float = 1.5):
    """延迟打开浏览器"""
    time.sleep(delay)
    url = f"http://localhost:{port}/dashboard"
    print(f"🌐 正在打开浏览器: {url}")
    webbrowser.open(url)

# 在主函数中
if not args.no_browser:
    browser_thread = threading.Thread(target=open_browser, args=(port,), daemon=True)
    browser_thread.start()
```

#### 添加命令行参数
```python
parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
```

### 2. 修改 `backend/open_adventure.spec`

#### 收集 app 模块文件
```python
app_dir = backend_dir / 'app'

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

#### 更新 hiddenimports
```python
hiddenimports = [
    # app 模块及其子模块
    'app',
    'app.main',
    'app.core',
    'app.core.config',
    'app.core.database',
    'app.models',
    'app.repositories',
    'app.services',
    'app.api',
    'app.api.routers',
    'app.adapters',
    'app.adapters.claude',
    # ... 其他依赖
]
```

#### 合并数据文件
```python
datas = app_datas + frontend_datas
```

### 3. 新增文件

#### `scripts/build_macos.sh`
macOS 平台的打包脚本，包含：
- 前端构建检查
- 数据库模板检查
- PyInstaller 安装
- 清理旧构建
- 执行打包
- 验证输出

#### `scripts/test_package.sh`
打包测试脚本，用于：
- 创建独立测试目录
- 复制可执行文件
- 提供测试步骤指引

#### `PACKAGING_FIX.md`
详细的修复文档，包含：
- 问题描述
- 修复内容
- 重新打包步骤
- 命令行参数说明
- 验证步骤
- 故障排查

## 使用方法

### 重新打包
```bash
# macOS
./scripts/build_macos.sh

# Linux
./scripts/build_linux.sh
```

### 测试打包结果
```bash
./scripts/test_package.sh
```

### 运行应用
```bash
# 默认启动（自动打开浏览器到 /dashboard）
./backend/dist/open-adventure

# 不自动打开浏览器
./backend/dist/open-adventure --no-browser

# 指定端口
./backend/dist/open-adventure --port 9000
```

## 验证清单

- [x] 修复模块导入问题
- [x] 添加自动打开浏览器功能
- [x] 更新入口地址显示
- [x] 更新打包配置
- [x] 创建打包脚本
- [x] 创建测试脚本
- [x] 编写文档

## 技术细节

### PyInstaller 工作原理
1. 分析 Python 脚本的依赖
2. 收集所有依赖的模块和文件
3. 打包到单个可执行文件
4. 运行时解压到临时目录 `sys._MEIPASS`
5. 从临时目录执行

### 关键点
- `sys._MEIPASS`: PyInstaller 的临时解压目录
- `sys.path`: Python 模块搜索路径
- `hiddenimports`: 显式声明动态导入的模块
- `datas`: 非 Python 文件（前端、数据库等）

## 后续建议

1. **CI/CD 集成**: 将打包脚本集成到 CI/CD 流程
2. **自动化测试**: 添加打包后的自动化测试
3. **版本管理**: 在可执行文件中添加版本信息
4. **错误处理**: 增强启动时的错误提示
5. **日志记录**: 添加详细的启动日志

## 参考资料
- PyInstaller 文档: https://pyinstaller.org/
- FastAPI 部署: https://fastapi.tiangolo.com/deployment/
- uvicorn 配置: https://www.uvicorn.org/
