#!/usr/bin/env python3
"""测试所有模块是否能在 Python 3.8+ 环境下正常导入"""
import sys
import importlib
from pathlib import Path

# 添加 backend 目录到 Python 路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

modules_to_test = [
    "app.config.settings",
    "app.schemas.skill",
    "app.schemas.agent",
    "app.schemas.workflow",
    "app.schemas.task",
    "app.models.workflow",
    "app.models.task",
    "app.api.routers.claude",
]

print(f"Python 版本: {sys.version}")
print(f"测试 {len(modules_to_test)} 个模块...\n")

failed = []
for module_name in modules_to_test:
    try:
        importlib.import_module(module_name)
        print(f"✓ {module_name}")
    except Exception as e:
        print(f"✗ {module_name}: {e}")
        failed.append((module_name, e))

print(f"\n{'='*60}")
if failed:
    print(f"❌ 失败: {len(failed)}/{len(modules_to_test)}")
    for module_name, error in failed:
        print(f"  - {module_name}: {error}")
    sys.exit(1)
else:
    print(f"✅ 成功: 所有 {len(modules_to_test)} 个模块导入正常")
    sys.exit(0)
