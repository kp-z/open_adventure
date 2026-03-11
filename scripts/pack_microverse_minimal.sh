#!/bin/bash
set -e

# Microverse 最小文件打包脚本
# 用于创建只包含游戏模式必需文件的压缩包

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MICROVERSE_DIR="$PROJECT_ROOT/microverse"
TEMP_DIR="/tmp/microverse_minimal_$(date +%s)"
OUTPUT_DIR="$PROJECT_ROOT/docs/releases"

echo "🎮 开始打包 Microverse 最小文件集合..."

# 检查源目录是否存在
if [ ! -d "$MICROVERSE_DIR" ]; then
    echo "❌ Microverse 目录不存在: $MICROVERSE_DIR"
    exit 1
fi

# 创建临时目录
mkdir -p "$TEMP_DIR/microverse"
mkdir -p "$OUTPUT_DIR"

echo "📁 复制核心文件到临时目录..."

# 1. 项目配置文件
cp "$MICROVERSE_DIR/project.godot" "$TEMP_DIR/microverse/"
cp "$MICROVERSE_DIR/export_presets.cfg" "$TEMP_DIR/microverse/"
cp "$MICROVERSE_DIR/export.sh" "$TEMP_DIR/microverse/"
cp "$MICROVERSE_DIR/icon.svg" "$TEMP_DIR/microverse/"

# 2. 主题文件
find "$MICROVERSE_DIR" -name "*.tres" -exec cp {} "$TEMP_DIR/microverse/" \;

# 3. 场景文件
mkdir -p "$TEMP_DIR/microverse/scene/maps"
mkdir -p "$TEMP_DIR/microverse/scene/characters"
mkdir -p "$TEMP_DIR/microverse/scene/prefab"
mkdir -p "$TEMP_DIR/microverse/scene/ui"

cp "$MICROVERSE_DIR/scene/maps/Office.tscn" "$TEMP_DIR/microverse/scene/maps/"
cp "$MICROVERSE_DIR/scene/characters/"*.tscn "$TEMP_DIR/microverse/scene/characters/"
cp "$MICROVERSE_DIR/scene/prefab/"*.tscn "$TEMP_DIR/microverse/scene/prefab/"
cp "$MICROVERSE_DIR/scene/ui/"*.tscn "$TEMP_DIR/microverse/scene/ui/"

# 4. 脚本文件
mkdir -p "$TEMP_DIR/microverse/script/ai/memory"
mkdir -p "$TEMP_DIR/microverse/script/ui"

# 核心脚本
core_scripts=(
    "CameraController.gd"
    "CharacterController.gd"
    "CharacterManager.gd"
    "CharacterPersonality.gd"
    "Chair.gd"
    "Desk.gd"
    "GameSaveManager.gd"
    "RoomArea.gd"
    "RoomData.gd"
    "RoomManager.gd"
    "ChatHistory.gd"
)

for script in "${core_scripts[@]}"; do
    if [ -f "$MICROVERSE_DIR/script/$script" ]; then
        cp "$MICROVERSE_DIR/script/$script" "$TEMP_DIR/microverse/script/"
    fi
done

# AI 脚本
ai_scripts=(
    "APIManager.gd"
    "DialogManager.gd"
    "DialogService.gd"
    "ConversationManager.gd"
    "AIAgent.gd"
    "APIConfig.gd"
)

for script in "${ai_scripts[@]}"; do
    if [ -f "$MICROVERSE_DIR/script/ai/$script" ]; then
        cp "$MICROVERSE_DIR/script/ai/$script" "$TEMP_DIR/microverse/script/ai/"
    fi
done

# 内存管理脚本
if [ -f "$MICROVERSE_DIR/script/ai/memory/MemoryManager.gd" ]; then
    cp "$MICROVERSE_DIR/script/ai/memory/MemoryManager.gd" "$TEMP_DIR/microverse/script/ai/memory/"
fi

# UI 脚本
ui_scripts=(
    "SettingsManager.gd"
    "DialogBubble.gd"
    "GlobalSettingsUI.gd"
    "GodUI.gd"
    "AIModelLabel.gd"
    "SaveLoadUI.gd"
    "SaveLoadUIManager.gd"
)

for script in "${ui_scripts[@]}"; do
    if [ -f "$MICROVERSE_DIR/script/ui/$script" ]; then
        cp "$MICROVERSE_DIR/script/ui/$script" "$TEMP_DIR/microverse/script/ui/"
    fi
done

# 5. 必需资源文件
mkdir -p "$TEMP_DIR/microverse/asset/characters/body"
mkdir -p "$TEMP_DIR/microverse/asset/characters/portraits"
mkdir -p "$TEMP_DIR/microverse/asset/maps/interiors"

# 角色贴图
character_names=("Alice" "Grace" "Jack" "Joe" "Lea" "Monica" "Stephen" "Tom")

for char in "${character_names[@]}"; do
    # 身体贴图
    if [ -f "$MICROVERSE_DIR/asset/characters/body/${char}x32.png" ]; then
        cp "$MICROVERSE_DIR/asset/characters/body/${char}x32.png" "$TEMP_DIR/microverse/asset/characters/body/"
    fi
    # 头像
    if [ -f "$MICROVERSE_DIR/asset/characters/portraits/${char}P32.png" ]; then
        cp "$MICROVERSE_DIR/asset/characters/portraits/${char}P32.png" "$TEMP_DIR/microverse/asset/characters/portraits/"
    fi
done

# 地图贴图（办公室）
if [ -f "$MICROVERSE_DIR/asset/maps/interiors/23_Television_and_Film_Studio_32x32.png" ]; then
    cp "$MICROVERSE_DIR/asset/maps/interiors/23_Television_and_Film_Studio_32x32.png" "$TEMP_DIR/microverse/asset/maps/interiors/"
fi

# 6. UI 资源（如果存在）
if [ -d "$MICROVERSE_DIR/asset/ui" ]; then
    mkdir -p "$TEMP_DIR/microverse/asset/ui"
    cp -r "$MICROVERSE_DIR/asset/ui/"* "$TEMP_DIR/microverse/asset/ui/" 2>/dev/null || true
fi

# 7. 复制 .import 文件（Godot 需要）
echo "📦 复制资源导入文件..."
find "$MICROVERSE_DIR" -name "*.import" | while read import_file; do
    # 获取相对路径
    rel_path="${import_file#$MICROVERSE_DIR/}"
    # 创建目标目录
    target_dir="$TEMP_DIR/microverse/$(dirname "$rel_path")"
    mkdir -p "$target_dir"
    # 复制文件
    cp "$import_file" "$target_dir/"
done

# 计算文件大小
echo "📊 统计文件信息..."
total_files=$(find "$TEMP_DIR/microverse" -type f | wc -l)
total_size=$(du -sh "$TEMP_DIR/microverse" | cut -f1)

echo "✅ 文件复制完成！"
echo "   📁 总文件数: $total_files"
echo "   📦 总大小: $total_size"

# 创建压缩包
timestamp=$(date +"%Y%m%d_%H%M%S")
archive_name="microverse_minimal_$timestamp.tar.gz"
archive_path="$OUTPUT_DIR/$archive_name"

echo "🗜️  创建压缩包: $archive_name"
cd "$TEMP_DIR"
tar -czf "$archive_path" microverse/

# 清理临时目录
rm -rf "$TEMP_DIR"

# 显示结果
archive_size=$(du -sh "$archive_path" | cut -f1)
echo "🎉 打包完成！"
echo "   📦 压缩包: $archive_path"
echo "   📊 压缩后大小: $archive_size"
echo ""
echo "💡 使用方法:"
echo "   1. 解压到目标项目: tar -xzf $archive_name"
echo "   2. 运行导出脚本: cd microverse && ./export.sh"
echo "   3. 复制导出文件到前端: cp export/* ../frontend/public/microverse/"