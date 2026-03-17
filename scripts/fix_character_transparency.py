#!/usr/bin/env python3
"""
修复 Microverse 角色动画透明度问题
将所有使用 CompressedTexture2D 的 AtlasTexture 改为使用 ExtResource
"""

import re
import os
import sys

def fix_character_scene(file_path):
    """修复单个角色场景文件"""
    print(f"\n处理文件: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. 找到 ExtResource 的 ID（纹理资源）
    ext_resource_match = re.search(r'\[ext_resource type="Texture2D".*?id="(\d+_\w+)"', content)
    if not ext_resource_match:
        print(f"  ❌ 未找到 ExtResource 纹理资源")
        return False

    ext_resource_id = ext_resource_match.group(1)
    print(f"  📌 找到 ExtResource ID: {ext_resource_id}")

    # 2. 统计需要替换的 atlas 引用数量
    compressed_refs = re.findall(r'atlas = SubResource\("CompressedTexture2D_\w+"\)', content)
    print(f"  🔍 找到 {len(compressed_refs)} 个 CompressedTexture2D 引用")

    # 3. 替换所有使用 CompressedTexture2D 的 atlas 引用
    content_new = re.sub(
        r'atlas = SubResource\("CompressedTexture2D_\w+"\)',
        f'atlas = ExtResource("{ext_resource_id}")',
        content
    )

    # 4. 删除 CompressedTexture2D 定义
    compressed_defs = re.findall(r'\[sub_resource type="CompressedTexture2D"[^\[]*', content)
    print(f"  🗑️  删除 {len(compressed_defs)} 个 CompressedTexture2D 定义")

    content_new = re.sub(
        r'\[sub_resource type="CompressedTexture2D"[^\[]*',
        '',
        content_new
    )

    # 5. 清理多余的空行
    content_new = re.sub(r'\n{3,}', '\n\n', content_new)

    # 写回文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content_new)

    print(f"  ✅ 修复完成")
    return True

def main():
    # 处理所有角色文件
    characters = ['Alice', 'Grace', 'Jack', 'Joe', 'Lea', 'Monica', 'Stephen', 'Tom']
    base_path = '/Users/kp/项目/Proj/claude_manager/microverse/scene/characters'

    print("=" * 60)
    print("Microverse 角色动画透明度修复工具")
    print("=" * 60)

    success_count = 0
    fail_count = 0

    for char in characters:
        file_path = os.path.join(base_path, f'{char}.tscn')
        if os.path.exists(file_path):
            if fix_character_scene(file_path):
                success_count += 1
            else:
                fail_count += 1
        else:
            print(f"\n⚠️  文件不存在: {file_path}")
            fail_count += 1

    print("\n" + "=" * 60)
    print(f"修复完成: ✅ {success_count} 个成功, ❌ {fail_count} 个失败")
    print("=" * 60)

    return 0 if fail_count == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
