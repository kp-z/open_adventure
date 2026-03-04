#!/bin/bash

# Claude Manager Plugin 安装脚本
# 用于首次启动时自动安装内置的 skills 到 ~/.claude/plugins/open_adventure/

set -e

PLUGIN_NAME="open_adventure"
USER_PLUGIN_DIR="$HOME/.claude/plugins/$PLUGIN_NAME"
MARKETPLACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.claude/plugins/marketplace-plugins/$PLUGIN_NAME"
SETTINGS_FILE="$HOME/.claude/settings.json"

echo "🔧 检查 Claude Manager 插件安装状态..."

# 检查用户插件目录是否已存在
if [ -d "$USER_PLUGIN_DIR" ]; then
    echo "✅ 插件已安装: $USER_PLUGIN_DIR"
    exit 0
fi

# 检查 marketplace 目录是否存在
if [ ! -d "$MARKETPLACE_DIR" ]; then
    echo "⚠️  Marketplace 目录不存在，跳过插件安装"
    exit 0
fi

echo "📦 首次启动，正在安装 $PLUGIN_NAME 插件..."

# 创建用户插件目录
mkdir -p "$USER_PLUGIN_DIR"

# 复制 marketplace 内容到用户插件目录
cp -r "$MARKETPLACE_DIR"/* "$USER_PLUGIN_DIR/"

echo "✅ 插件文件已复制到: $USER_PLUGIN_DIR"

# 更新 settings.json，添加插件到 enabledPlugins
if [ ! -f "$SETTINGS_FILE" ]; then
    # 如果 settings.json 不存在，创建一个新的
    mkdir -p "$(dirname "$SETTINGS_FILE")"
    echo '{
  "enabledPlugins": {
    "open_adventure": true
  }
}' > "$SETTINGS_FILE"
    echo "✅ 已创建 settings.json 并启用插件"
else
    # 如果 settings.json 存在，使用 Python 来安全地修改 JSON
    python3 -c "
import json
import sys

try:
    with open('$SETTINGS_FILE', 'r') as f:
        settings = json.load(f)

    # 确保 enabledPlugins 存在且为字典
    if 'enabledPlugins' not in settings:
        settings['enabledPlugins'] = {}
    elif not isinstance(settings['enabledPlugins'], dict):
        # 如果是旧格式（数组），转换为新格式（字典）
        old_plugins = settings['enabledPlugins']
        settings['enabledPlugins'] = {plugin: True for plugin in old_plugins}

    # 添加 open_adventure 插件
    if 'open_adventure' in settings['enabledPlugins']:
        print('✅ 插件已在 settings.json 中启用')
    else:
        settings['enabledPlugins']['open_adventure'] = True
        with open('$SETTINGS_FILE', 'w') as f:
            json.dump(settings, f, indent=2)
        print('✅ 已将插件添加到 settings.json')

except Exception as e:
    print(f'❌ 更新 settings.json 失败: {e}', file=sys.stderr)
    sys.exit(1)
"
fi

echo ""
echo "🎉 Claude Manager 插件安装完成！"
echo ""
echo "已安装的 skills:"
echo "  - prompt_optimizer: 优化用户输入的 prompt"
echo ""
echo "使用方法:"
echo "  1. 在 Claude Code 中输入 /prompt_optimizer 来手动调用"
echo "  2. Claude 会在需要时自动使用该 skill"
echo ""
