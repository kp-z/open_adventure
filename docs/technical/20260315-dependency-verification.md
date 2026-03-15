# 依赖项验证和打包检查

**创建日期**: 2026-03-15
**作者**: Claude Opus 4.6
**状态**: 已完成

## 概述

本文档说明了 Open Adventure 项目的依赖项验证和打包检查流程，确保打包后的应用可以在其他环境中直接使用，防止因缺少依赖而报错。

## 依赖项清单

### Python 后端依赖

#### 核心框架
- `fastapi>=0.115.0` - Web 框架
- `uvicorn[standard]>=0.32.0` - ASGI 服务器
- `starlette` - FastAPI 底层框架（uvicorn 依赖）

#### 数据库
- `sqlalchemy>=2.0.36` - ORM 框架
- `alembic>=1.14.0` - 数据库迁移工具
- `aiosqlite>=0.20.0` - 异步 SQLite 驱动
- `greenlet>=3.0.0` - SQLAlchemy 异步支持

#### 数据验证
- `pydantic>=2.10.0` - 数据验证
- `pydantic-settings>=2.6.0` - 配置管理
- `pydantic_core` - Pydantic 核心（自动安装）

#### AI SDK
- `anthropic>=0.40.0` - Claude API SDK

#### 安全
- `python-jose[cryptography]>=3.3.0` - JWT 处理
- `passlib[bcrypt]>=1.7.4` - 密码哈希
- `cryptography>=41.0.0` - 加密库

#### 工具库
- `python-dotenv>=1.0.1` - 环境变量加载
- `python-multipart>=0.0.12` - 文件上传支持
- `aiohttp>=3.9.0` - 异步 HTTP 客户端
- `psutil>=5.9.0` - 系统信息
- `PyYAML>=6.0.1` - YAML 解析
- `typing-extensions>=4.5.0` - 类型注解扩展

#### HTTP 客户端依赖（aiohttp 需要）
- `charset-normalizer>=3.0.0`
- `multidict>=6.0.0`
- `yarl>=1.9.0`
- `aiosignal>=1.3.0`
- `frozenlist>=1.4.0`
- `attrs>=23.0.0`

#### 其他运行时依赖
- `anyio>=3.7.0` - 异步 IO 抽象
- `sniffio>=1.3.0` - 异步库检测
- `idna>=3.4` - 国际化域名
- `certifi>=2023.7.22` - CA 证书
- `h11>=0.14.0` - HTTP/1.1 协议
- `click>=8.1.0` - 命令行工具

### 前端依赖

前端使用 Vite 构建，所有依赖都会被打包到 `frontend/dist` 目录中，无需额外安装。

## PyInstaller 配置

### hiddenimports 配置

在 `backend/open_adventure.spec` 中配置了所有需要显式导入的模块：

```python
hiddenimports = [
    # App 模块
    'app',
    'app.main',
    'app.api',
    'app.core',
    'app.models',
    'app.repositories',
    'app.services',
    'app.adapters',
    'app.schemas',
    
    # Uvicorn 和 FastAPI
    'uvicorn',
    'uvicorn.loops.auto',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets.auto',
    'fastapi',
    'fastapi.staticfiles',
    'starlette.middleware.cors',
    
    # SQLAlchemy 和数据库
    'sqlalchemy.ext.asyncio',
    'aiosqlite',
    'greenlet',
    
    # Pydantic
    'pydantic',
    'pydantic_settings',
    'pydantic_core',
    
    # Anthropic SDK
    'anthropic',
    
    # 安全
    'jose',
    'passlib',
    'cryptography',
    
    # 其他
    'dotenv',
    'yaml',
    'aiohttp',
    'psutil',
]
```

### 自定义 Hooks

在 `backend/hooks/hook-app.py` 中定义了自定义 hook，确保所有 app 子模块都被正确包含：

```python
from PyInstaller.utils.hooks import collect_all, collect_submodules

hiddenimports = collect_submodules('app')
datas, binaries, hiddenimports2 = collect_all('app')
hiddenimports += hiddenimports2
```

## 验证流程

### 1. 开发环境验证

在打包前，运行 `backend/test_imports.py` 验证所有依赖是否已安装：

```bash
cd backend
python test_imports.py
```

### 2. 构建时验证

构建脚本 `scripts/build_binary.sh` 会自动运行依赖检查：

```bash
./scripts/build_binary.sh
```

构建流程包括：
1. 检查前端构建产物
2. 激活 Python 虚拟环境
3. 检查 PyInstaller
4. **运行依赖项检查** (`test_imports.py`)
5. 清理旧的构建产物
6. 使用 PyInstaller 构建
7. 验证构建产物

### 3. 打包后验证

打包完成后，可以运行 `backend/verify_package.py` 验证打包后的应用：

```bash
# 在打包后的目录中运行
cd dist/open-adventure
./open-adventure --help  # 测试基本功能

# 或者直接运行验证脚本（如果包含在打包中）
python verify_package.py
```

## 常见问题

### 1. 模块导入失败

**症状**: 运行打包后的应用时报错 `ModuleNotFoundError`

**解决方案**:
1. 检查 `requirements.txt` 是否包含该模块
2. 检查 `open_adventure.spec` 的 `hiddenimports` 是否包含该模块
3. 重新构建应用

### 2. 前端资源加载失败

**症状**: 访问前端页面时显示 404 或空白页

**解决方案**:
1. 确保前端已构建: `cd frontend && npm run build`
2. 检查 `frontend/dist` 目录是否存在
3. 检查 `open_adventure.spec` 中的 `datas` 配置
4. 重新构建应用

### 3. 数据库初始化失败

**症状**: 启动时报错 "数据库模板不存在"

**解决方案**:
1. 确保 `backend/open_adventure.db` 存在
2. 检查 `open_adventure.spec` 中的 `datas` 配置
3. 重新构建应用

### 4. GLIBC 版本不兼容（Linux）

**症状**: Linux 上运行时报错 "version `GLIBC_X.XX' not found"

**解决方案**:
1. 使用 Docker 在目标系统的基础镜像上构建
2. 提供多个版本的构建（兼容版和最新版）
3. 参考 CLAUDE.md 中的 Linux 构建说明

## 最佳实践

### 1. 依赖管理

- 使用 `requirements.txt` 管理所有 Python 依赖
- 指定最低版本号，避免使用 `==` 固定版本
- 定期更新依赖，但要测试兼容性

### 2. 打包前检查

- 始终在打包前运行 `test_imports.py`
- 确保前端已构建
- 确保数据库模板存在

### 3. 多平台支持

- 在目标平台上构建（macOS、Linux）
- 使用 Docker 构建 Linux 版本，确保 GLIBC 兼容性
- 提供多个 Linux 版本（兼容版和最新版）

### 4. 验证测试

- 在干净的环境中测试打包后的应用
- 测试所有核心功能
- 检查日志文件，确保没有警告或错误

## 更新记录

- 2026-03-15: 初始版本，添加完整的依赖项验证流程
