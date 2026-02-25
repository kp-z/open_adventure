# -*- mode: python ; coding: utf-8 -*-

import os
from pathlib import Path

block_cipher = None

# 项目路径
backend_dir = Path('/Users/kp/项目/Proj/claude_manager/backend')
frontend_dist = backend_dir.parent / 'frontend' / 'dist'
db_template = backend_dir / 'claude_manager.db'

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
datas = frontend_datas
if db_template.exists():
    datas.append((str(db_template), '.'))
    print(f"✓ 收集数据库模板: {db_template}")
else:
    print("⚠️  警告: 数据库模板不存在")

# 隐藏导入（PyInstaller 可能检测不到的模块）
hiddenimports = [
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
    'fastapi',
    'fastapi.staticfiles',
    'sqlalchemy',
    'sqlalchemy.ext.asyncio',
    'sqlalchemy.ext.asyncio.engine',
    'sqlalchemy.ext.asyncio.session',
    'aiosqlite',
    'anthropic',
    'greenlet',
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
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='claude-manager',
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
