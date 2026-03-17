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
    'app.api.routers.health',
    'app.api.routers.skills',
    'app.api.routers.agents',
    'app.api.routers.agent_teams',
    'app.api.routers.workflows',
    'app.api.routers.tasks',
    'app.api.routers.claude',
    'app.api.routers.executions',
    'app.api.routers.workflow_templates',
    'app.api.routers.stats',
    'app.api.routers.team_messages',
    'app.api.routers.team_tasks',
    'app.api.routers.team_state',
    'app.api.routers.skills_stream',
    'app.api.routers.websocket',
    'app.api.routers.project_paths',
    'app.api.routers.token_usage',
    'app.api.routers.plugins',
    'app.api.routers.processes',
    'app.api.routers.config',
    'app.api.routers.settings',
    'app.api.routers.microverse',
    'app.api.routers.tasks_ws',
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
    'app.models.skill',
    'app.models.agent',
    'app.models.agent_team',
    'app.models.workflow',
    'app.models.task',
    'app.models.plan',
    'app.models.user',
    'app.models.team_message',
    'app.models.team_task',
    'app.models.team_state',
    'app.models.project_path',
    'app.models.plugin',
    'app.models.microverse',
    'app.repositories',
    'app.repositories.base',
    'app.repositories.skill_repository',
    'app.repositories.agent_repository',
    'app.repositories.agent_team_repository',
    'app.repositories.workflow_repository',
    'app.repositories.workflow_template_repo',
    'app.repositories.task_repository',
    'app.repositories.executions_repo',
    'app.repositories.plugin_repository',
    'app.repositories.project_path_repository',
    'app.services',
    'app.services.skill_service',
    'app.services.agent_service',
    'app.services.agent_team_service',
    'app.services.agent_runtime_service',
    'app.services.agent_process_manager',
    'app.services.agent_session_service',
    'app.services.agent_session_service_async',
    'app.services.agent_monitor_service',
    'app.services.agent_test_service',
    'app.services.workflow_service',
    'app.services.workflow_template_service',
    'app.services.task_service',
    'app.services.task_scheduler',
    'app.services.execution_engine',
    'app.services.plan_generator',
    'app.services.message_service',
    'app.services.team_state_manager',
    'app.services.stats_service',
    'app.services.sync_service',
    'app.services.settings_service',
    'app.services.skill_quality_service',
    'app.services.token_usage_service',
    'app.services.plugin_service',
    'app.services.project_path_service',
    'app.services.process_detector_service',
    'app.services.microverse_agent_service',
    'app.services.marketplace_config_service',
    'app.services.git_repo_scanner',
    'app.services.prompt_optimizer_service',
    'app.services.tag_classifier',
    'app.services.websocket_manager',
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

    # WebSocket 支持（uvicorn[standard] 依赖）
    'websockets',
    'websockets.legacy',
    'websockets.legacy.server',
    'httptools',
    'uvloop',

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
