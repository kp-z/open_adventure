#!/usr/bin/env python3
"""Fix Chinese punctuation in docstrings."""

import re
from pathlib import Path

# Chinese to English punctuation mapping
PUNCTUATION_MAP = {
    '，': ', ',
    '。': '. ',
    '：': ': ',
    '；': '; ',
    '！': '! ',
    '？': '? ',
    '（': ' (',
    '）': ') ',
    '【': ' [',
    '】': '] ',
    '《': ' <',
    '》': '> ',
    '"': '"',
    '"': '"',
    ''': "'",
    ''': "'",
}

def fix_punctuation(text):
    """Replace Chinese punctuation with English punctuation."""
    for chinese, english in PUNCTUATION_MAP.items():
        text = text.replace(chinese, english)
    return text

def process_file(file_path):
    """Process a single Python file."""
    print(f"Processing {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix punctuation
    fixed_content = fix_punctuation(content)

    if content != fixed_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"  ✓ Fixed punctuation in {file_path}")
        return True
    else:
        print(f"  - No changes needed in {file_path}")
        return False

def main():
    """Process all API files."""
    api_dir = Path(__file__).parent / "claude_manager" / "api"

    files_to_process = [
        "skills.py",
        "claude_code.py",
        "prompts.py",
    ]

    fixed_count = 0
    for filename in files_to_process:
        file_path = api_dir / filename
        if file_path.exists():
            if process_file(file_path):
                fixed_count += 1
        else:
            print(f"  ✗ File not found: {file_path}")

    print(f"\n✓ Fixed {fixed_count} files")

if __name__ == "__main__":
    main()
