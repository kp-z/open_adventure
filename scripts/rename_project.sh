#!/bin/bash

# 批量替换项目中的 "Open Adventure" 为 "Open Adventure"
# 排除历史发布文件、node_modules、venv 等目录

set -e

echo "开始替换项目名称..."

# 查找所有需要替换的文件（排除特定目录）
FILES=$(find . -type f \( -name "*.md" -o -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.sh" -o -name "*.spec" -o -name "*.service" -o -name "*.toml" -o -name "*.example" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/venv/*" \
  -not -path "*/.vite/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/__pycache__/*" \
  -not -path "*/.git/*" \
  -not -path "*/docs/releases/open-adventure-*/*" \
  -not -path "*/release/*" \
  2>/dev/null)

# 统计文件数量
TOTAL=$(echo "$FILES" | wc -l | tr -d ' ')
echo "找到 $TOTAL 个文件需要检查"

# 执行替换
COUNT=0
for file in $FILES; do
  if grep -q "open adventure\|Open Adventure\|open_adventure\|OPEN_ADVENTURE\|open-adventure" "$file" 2>/dev/null; then
    echo "处理: $file"

    # 使用 sed 进行替换（macOS 兼容）
    sed -i '' 's/Open Adventure/Open Adventure/g' "$file"
    sed -i '' 's/open adventure/open adventure/g' "$file"
    sed -i '' 's/OPEN_ADVENTURE/OPEN_ADVENTURE/g' "$file"
    sed -i '' 's/open_adventure/open_adventure/g' "$file"
    sed -i '' 's/open-adventure/open-adventure/g' "$file"

    COUNT=$((COUNT + 1))
  fi
done

echo ""
echo "✅ 完成！共修改了 $COUNT 个文件"
echo ""
echo "注意：以下目录的文件未修改（历史记录）："
echo "  - docs/releases/open-adventure-*/"
echo "  - release/"
