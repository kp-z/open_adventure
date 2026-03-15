# -*- mode: python ; coding: utf-8 -*-

import os
from pathlib import Path

block_cipher = None

# 项目路径 - 使用 SPECPATH（PyInstaller 提供的 .spec 文件所在目录）
backend_dir = Path(SPECPATH).resolve()
project_root = backend_dir.parent
frontend_dist = project_root / 'frontend' / 'dist'
db_template = backend_dir / 'open_adventure.db'
app_dir = backend_dir / 'app'

# 设置输出目录到项目根目录
import sys
sys.path.insert(0, str(backend_dir))
DISTPATH = str(project_root / 'dist')
WORKPATH = str(backend_dir / 'build')

# 收集前端静态文件（不收集 .py 源码文件，让 PyInstaller 自动编译）
frontend_datas = []
if frontend_dist.exists():
    for root, dirs, files in os.walk(frontend_dist):
        for file in files:
            src = Path(root) / file
            dst = Path('frontend_dist') / src.relative_to(frontend_dist).parent
            frontend_datas.append((str(src), str(dst)))
    print(f"✓ 收集前端文件: {len(frontend_datas)} 个")
else:
    print("⚠️  警告: frontend/dist 不存在")

# 收集数据库模板（只收集非代码的数据文件）
datas = frontend_datas
if db_template.exists():
    datas.append((str(db_template), '.'))
    print(f"✓ 收集数据库模板: {db_template}")
else:
    print("⚠️  警告: 数据库模板不存在")

# 收集配置文件（default_models.json 等）
config_dir = app_dir / 'config'
if config_dir.exists():
    for config_file in config_dir.glob('*.json'):
        if config_file.name != '__pycache__':
            datas.append((str(config_file), 'app/config'))
            print(f"✓ 收集配置文件: {config_file.name}")
else:
    print("⚠️  警告: app/config 目录不存在")

# 隐藏导入（确保所有运行时需要的模块都被包含）
hiddenimports = [
    # App 模块
    'app',
    'app.main',
    'app.api',
    'app.api.routers',
    'app.api.dashboard',
    'app.api.auth',
    'app.api.terminal',
    'app.api.websocket',
    'app.api.websocket.terminal',
    'app.core',
    'app.core.database',
    'app.core.logging',
    'app.core.security',
    'app.core.auth_optional',
    'app.core.exceptions',
    'app.core.utils',
    'app.core.tag_definitions',
    'app.config',
    'app.config.settings',
    'app.models',
    'app.repositories',
    'app.services',
    'app.adapters',
    'app.adapters.claude',
    'app.schemas',

    # Uvicorn 和 FastAPI
    'uvicorn',
    'uvicorn.config',
    'uvicorn.server',
    'uvicorn.main',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'fastapi.staticfiles',
    'fastapi.responses',
    'fastapi.middleware',
    'fastapi.middleware.cors',
    'starlette',
    'starlette.middleware',
    'starlette.middleware.base',
    'starlette.middleware.cors',
    'starlette.responses',
    'starlette.staticfiles',
    'starlette.websockets',

    # SQLAlchemy 和数据库
    'sqlalchemy',
    'sqlalchemy.ext',
    'sqlalchemy.ext.asyncio',
    'sqlalchemy.ext.asyncio.engine',
    'sqlalchemy.ext.asyncio.session',
    'sqlalchemy.ext.declarative',
    'sqlalchemy.orm',
    'sqlalchemy.pool',
    'sqlalchemy.dialects',
    'sqlalchemy.dialects.sqlite',
    'aiosqlite',
    'greenlet',
    'sqlite3',

    # Pydantic
    'pydantic',
    'pydantic.fields',
    'pydantic.main',
    'pydantic.types',
    'pydantic_settings',
    'pydantic_core',

    # Anthropic SDK
    'anthropic',
    'anthropic.types',
    'anthropic.resources',

    # 其他依赖
    'dotenv',
    'yaml',
    'aiohttp',
    'aiohttp.client',
    'aiohttp.web',
    'psutil',
    'typing_extensions',
    'multipart',
    'python_multipart',

    # 安全相关
    'jose',
    'jose.jwt',
    'passlib',
    'passlib.context',
    'bcrypt',
    'cryptography',
    'cryptography.fernet',
    'cryptography.hazmat',
    'cryptography.hazmat.primitives',
    'cryptography.hazmat.backends',
]

a = Analysis(
    ['main_packaged.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=['hooks'],  # 添加自定义 hooks 目录
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # 排除不需要的测试和开发工具
        'pytest',
        'pytest_asyncio',
        'unittest',
        'test',
        'tests',
        # 排除不需要的 GUI 库
        'tkinter',
        'matplotlib',
        'PIL',
        # 排除不需要的文档工具
        'sphinx',
        'docutils',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='open-adventure',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# 注释掉 COLLECT，因为使用 onefile 模式
# coll = COLLECT(
#     exe,
#     a.binaries,
#     a.zipfiles,
#     a.datas,
#     strip=False,
#     upx=True,
#     upx_exclude=[],
#     name='open-adventure',
# )
