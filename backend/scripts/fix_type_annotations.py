#!/usr/bin/env python3
"""批量添加 from __future__ import annotations 到文件开头"""
import sys
from pathlib import Path

files = [
    "app/schemas/process.py",
    "app/core/tag_definitions.py",
    "app/schemas/skill.py",
    "app/adapters/git/git_adapter.py",
    "app/repositories/plugin_repository.py",
    "app/schemas/plugin.py",
    "app/schemas/agent.py",
    "app/api/routers/claude.py",
    "app/services/stats_service.py",
    "app/models/task.py",
    "app/repositories/skill_repository.py",
    "app/schemas/project_path.py",
    "app/services/project_path_service.py",
    "app/repositories/project_path_repository.py",
    "app/repositories/agent_repository.py",
    "app/models/workflow.py",
    "app/services/workflow_template_service.py",
    "app/schemas/workflow.py",
    "app/repositories/workflow_template_repo.py",
    "app/repositories/task_repository.py",
    "app/schemas/agent_team.py",
    "app/schemas/task.py",
    "app/repositories/workflow_repository.py",
    "app/repositories/agent_team_repository.py",
]

backend_dir = Path(__file__).parent.parent

for file_path in files:
    full_path = backend_dir / file_path
    if not full_path.exists():
        print(f"⚠️  文件不存在: {file_path}")
        continue

    content = full_path.read_text(encoding="utf-8")

    # 检查是否已经有 from __future__ import annotations
    if "from __future__ import annotations" in content:
        print(f"✓ 已存在: {file_path}")
        continue

    # 找到第一个非注释、非空行的位置
    lines = content.split("\n")
    insert_pos = 0

    # 跳过文件开头的 docstring 和注释
    in_docstring = False
    for i, line in enumerate(lines):
        stripped = line.strip()

        # 处理 docstring
        if stripped.startswith('"""') or stripped.startswith("'''"):
            if in_docstring:
                in_docstring = False
                insert_pos = i + 1
                break
            else:
                in_docstring = True
                continue

        if in_docstring:
            continue

        # 跳过注释和空行
        if stripped.startswith("#") or not stripped:
            continue

        # 找到第一个实际代码行
        insert_pos = i
        break

    # 插入 from __future__ import annotations
    lines.insert(insert_pos, "from __future__ import annotations\n")

    # 写回文件
    full_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"✓ 已修复: {file_path}")

print(f"\n✅ 完成！共处理 {len(files)} 个文件")
