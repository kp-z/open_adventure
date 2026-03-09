#!/usr/bin/env python3
"""修复 Pydantic 模型和 SQLAlchemy 模型中的类型注解，使其兼容 Python 3.8"""
import re
from pathlib import Path

# 需要修复的文件列表
files = [
    "app/config/settings.py",
    "app/schemas/skill.py",
    "app/schemas/task.py",
    "app/schemas/project_path.py",
    "app/schemas/agent_team.py",
    "app/schemas/agent.py",
    "app/schemas/plugin.py",
    "app/schemas/process.py",
    "app/schemas/workflow.py",
    "app/api/routers/claude.py",
    # SQLAlchemy 模型
    "app/models/workflow.py",
    "app/models/task.py",
]

backend_dir = Path(__file__).parent.parent

# 类型映射
type_mapping = {
    r'\blist\[': 'List[',
    r'\bdict\[': 'Dict[',
    r'\btuple\[': 'Tuple[',
    r'\bset\[': 'Set[',
}

# 需要导入的类型
typing_imports = {'List', 'Dict', 'Tuple', 'Set'}

for file_path in files:
    full_path = backend_dir / file_path
    if not full_path.exists():
        print(f"⚠️  文件不存在: {file_path}")
        continue

    content = full_path.read_text(encoding="utf-8")
    original_content = content

    # 替换类型注解
    for old_pattern, new_type in type_mapping.items():
        content = re.sub(old_pattern, new_type, content)

    # 检查是否有修改
    if content == original_content:
        print(f"✓ 无需修改: {file_path}")
        continue

    # 检查需要导入哪些类型
    needed_imports = set()
    for type_name in typing_imports:
        if f'{type_name}[' in content:
            needed_imports.add(type_name)

    if not needed_imports:
        print(f"✓ 无需修改: {file_path}")
        continue

    # 检查现有的 typing 导入
    lines = content.split('\n')
    typing_import_line_idx = None
    existing_imports = set()

    for i, line in enumerate(lines):
        if line.strip().startswith('from typing import'):
            typing_import_line_idx = i
            # 提取已有的导入
            import_part = line.split('import', 1)[1].strip()
            existing_imports = {imp.strip() for imp in import_part.split(',')}
            break

    # 合并导入
    all_imports = existing_imports | needed_imports
    new_import_line = f"from typing import {', '.join(sorted(all_imports))}"

    if typing_import_line_idx is not None:
        # 替换现有的导入行
        lines[typing_import_line_idx] = new_import_line
    else:
        # 在 from __future__ import annotations 之后添加
        for i, line in enumerate(lines):
            if 'from __future__ import annotations' in line:
                lines.insert(i + 2, new_import_line)
                break

    content = '\n'.join(lines)

    # 写回文件
    full_path.write_text(content, encoding="utf-8")
    print(f"✓ 已修复: {file_path} (添加了 {', '.join(needed_imports)})")

print(f"\n✅ 完成！共处理 {len(files)} 个文件")
