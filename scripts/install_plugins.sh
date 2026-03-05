#!/bin/bash

# Open Adventure Plugin 安装脚本
# 用于按需安装内置 skills 到 ~/.claude/plugins/open_adventure/

set -e

PLUGIN_NAME="open_adventure"
USER_PLUGIN_DIR="$HOME/.claude/plugins/$PLUGIN_NAME"
MARKETPLACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.claude/plugins/marketplace-plugins/$PLUGIN_NAME"
SETTINGS_FILE="$HOME/.claude/settings.json"
AUTO_INSTALL="${OPEN_ADVENTURE_PLUGIN_AUTO_INSTALL:-}"

confirm() {
    local prompt="$1"
    local default="${2:-N}"

    if [ "$default" = "Y" ]; then
        read -r -p "$prompt [Y/n] " response
        [[ -z "$response" || "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
    else
        read -r -p "$prompt [y/N] " response
        [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
    fi
}

enable_plugin_in_settings() {
    if [ ! -f "$SETTINGS_FILE" ]; then
        mkdir -p "$(dirname "$SETTINGS_FILE")"
        cat > "$SETTINGS_FILE" <<EOF
{
  "enabledPlugins": {
    "open_adventure": true
  }
}
EOF
        echo "✅ 已创建 settings.json 并启用插件"
        return
    fi

    python3 -c "
import json
import sys

try:
    with open('$SETTINGS_FILE', 'r', encoding='utf-8') as f:
        settings = json.load(f)

    if 'enabledPlugins' not in settings:
        settings['enabledPlugins'] = {}
    elif not isinstance(settings['enabledPlugins'], dict):
        old_plugins = settings['enabledPlugins']
        settings['enabledPlugins'] = {plugin: True for plugin in old_plugins}

    if settings['enabledPlugins'].get('open_adventure') is True:
        print('✅ 插件已在 settings.json 中启用')
    else:
        settings['enabledPlugins']['open_adventure'] = True
        with open('$SETTINGS_FILE', 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=2, ensure_ascii=False)
        print('✅ 已将插件添加到 settings.json')
except Exception as e:
    print(f'❌ 更新 settings.json 失败: {e}', file=sys.stderr)
    sys.exit(1)
"
}

echo "🔧 检查 Open Adventure 插件安装状态..."

# 已安装则幂等退出
if [ -d "$USER_PLUGIN_DIR" ]; then
    echo "✅ 插件已安装: $USER_PLUGIN_DIR"
    exit 0
fi

# 检查 marketplace 目录
if [ ! -d "$MARKETPLACE_DIR" ]; then
    echo "⚠️  Marketplace 目录不存在，跳过插件安装"
    exit 0
fi

INSTALL_PLUGIN=false
WRITE_SETTINGS=false

if [ "$AUTO_INSTALL" = "true" ]; then
    INSTALL_PLUGIN=true
    WRITE_SETTINGS=true
    echo "ℹ️  检测到 OPEN_ADVENTURE_PLUGIN_AUTO_INSTALL=true，自动安装并写入 settings"
elif [ "$AUTO_INSTALL" = "false" ]; then
    echo "ℹ️  检测到 OPEN_ADVENTURE_PLUGIN_AUTO_INSTALL=false，跳过插件安装"
    exit 0
else
    if [ -t 0 ]; then
        if confirm "是否安装内置 Claude 插件 ($PLUGIN_NAME)?" "N"; then
            INSTALL_PLUGIN=true
            if confirm "是否将插件写入 ~/.claude/settings.json 的 enabledPlugins?" "N"; then
                WRITE_SETTINGS=true
            fi
        else
            echo "ℹ️  用户选择跳过插件安装"
            exit 0
        fi
    else
        echo "ℹ️  非交互环境且未设置 OPEN_ADVENTURE_PLUGIN_AUTO_INSTALL，默认跳过插件安装"
        exit 0
    fi
fi

if [ "$INSTALL_PLUGIN" != "true" ]; then
    echo "ℹ️  插件安装已跳过"
    exit 0
fi

echo "📦 正在安装 $PLUGIN_NAME 插件..."
mkdir -p "$USER_PLUGIN_DIR"
cp -r "$MARKETPLACE_DIR"/* "$USER_PLUGIN_DIR/"
echo "✅ 插件文件已复制到: $USER_PLUGIN_DIR"

if [ "$WRITE_SETTINGS" = "true" ]; then
    enable_plugin_in_settings
else
    echo "ℹ️  已跳过 settings.json 写入，可手动启用插件"
fi

echo ""
echo "🎉 Open Adventure 插件安装完成！"
echo ""
echo "已安装的 skills:"
echo "  - prompt_optimizer: 优化用户输入的 prompt"
echo ""
echo "使用方法:"
echo "  1. 在 Claude Code 中输入 /prompt_optimizer 来手动调用"
echo "  2. Claude 会在需要时自动使用该 skill"
echo ""
