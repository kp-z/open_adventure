#!/usr/bin/env python3
"""
Export skills from claude_manager database to Claude Code skills directory.
"""
import os
import sqlite3
from pathlib import Path


def export_skills_to_claude():
    """Export all skills from database to Claude Code skills directory."""

    # Database path
    db_path = Path(__file__).parent / "claude_manager.db"

    # Claude Code skills directory
    claude_skills_dir = Path.home() / ".claude" / "skills"

    if not claude_skills_dir.exists():
        print(f"Error: Claude skills directory not found at {claude_skills_dir}")
        return

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Fetch all skills
    cursor.execute("SELECT id, name, description, content, meta_data FROM skills")
    skills = cursor.fetchall()

    print(f"Found {len(skills)} skills in database")
    print("-" * 60)

    exported_count = 0

    for skill_id, name, description, content, meta_data in skills:
        # Create skill directory
        skill_dir = claude_skills_dir / name
        skill_dir.mkdir(exist_ok=True)

        # Create SKILL.md file
        skill_file = skill_dir / "SKILL.md"

        # Format the skill content
        skill_content = f"""---
name: {name}
description: {description}
---

{content}
"""

        # Write the skill file
        with open(skill_file, "w", encoding="utf-8") as f:
            f.write(skill_content)

        print(f"✓ Exported: {name}")
        print(f"  Location: {skill_file}")
        exported_count += 1

    conn.close()

    print("-" * 60)
    print(f"Successfully exported {exported_count} skills to Claude Code!")
    print(f"\nSkills directory: {claude_skills_dir}")
    print("\nYou can now use these skills in Claude Code by mentioning them in your prompts.")


if __name__ == "__main__":
    export_skills_to_claude()
