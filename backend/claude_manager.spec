# -*- mode: python ; coding: utf-8 -*-

import os
from pathlib import Path

block_cipher = None

# 项目路径
backend_dir = Path('/Users/kp/项目/Proj/claude_manager/backend')
project_root = backend_dir.parent
frontend_dist = project_root / 'frontend' / 'dist'
db_template = backend_dir / 'claude_manager.db'
app_dir = backend_dir / 'app'

# 设置输出目录到项目根目录
import sys
sys.path.insert(0, str(backend_dir))
DISTPATH = str(project_root / 'dist')
WORKPATH = str(backend_dir / 'build')

# 收集 app 模块（整个目录）
app_datas = []
if app_dir.exists():
    for root, dirs, files in os.walk(app_dir):
        # 跳过 __pycache__ 和 .pyc 文件
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for file in files:
            if file.endswith('.py'):
                src = Path(root) / file
                dst = Path('app') / src.relative_to(app_dir).parent
                app_datas.append((str(src), str(dst)))
    print(f"✓ 收集 app 模块: {len(app_datas)} 个文件")
else:
    print("⚠️  警告: app 目录不存在")

# 收集前端静态文件
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

# 收集数据库模板
datas = app_datas + frontend_datas
if db_template.exists():
    datas.append((str(db_template), '.'))
    print(f"✓ 收集数据库模板: {db_template}")
else:
    print("⚠️  警告: 数据库模板不存在")

# 隐藏导入（PyInstaller 可能检测不到的模块）
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
    # uvicorn 相关
    'uvicorn',
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
    # FastAPI 相关
    'fastapi',
    'fastapi.staticfiles',
    # SQLAlchemy 相关
    'sqlalchemy',
    'sqlalchemy.ext.asyncio',
    'sqlalchemy.ext.asyncio.engine',
    'sqlalchemy.ext.asyncio.session',
    'aiosqlite',
    'greenlet',
    # 其他依赖
    'anthropic',
    'pydantic',
    'pydantic_settings',
    'dotenv',
]

a = Analysis(
    ['main_packaged.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='claude-manager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='claude-manager',
)
