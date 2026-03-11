# Microverse 游戏模式必需文件清单
# 这个文件定义了 open_adventure 项目中游戏模式运行所需的最小文件集合

# ===========================================
# Git 包含策略建议
# ===========================================

# 在项目根目录的 .gitignore 中添加以下规则：

# 1. 首先排除整个 microverse 目录
# microverse/

# 2. 然后有选择地包含必需文件：

# 项目配置文件（必需）
!microverse/project.godot
!microverse/export_presets.cfg
!microverse/export.sh
!microverse/serve.sh
!microverse/icon.svg

# 主题文件（必需）
!microverse/*.tres

# 场景文件（必需）
!microverse/scene/
!microverse/scene/maps/
!microverse/scene/maps/Office.tscn
!microverse/scene/characters/
!microverse/scene/characters/*.tscn
!microverse/scene/prefab/
!microverse/scene/prefab/*.tscn
!microverse/scene/ui/
!microverse/scene/ui/*.tscn

# 脚本文件（必需）
!microverse/script/
!microverse/script/*.gd
!microverse/script/ai/
!microverse/script/ai/*.gd
!microverse/script/ai/memory/
!microverse/script/ai/memory/*.gd
!microverse/script/ai/background_story/
!microverse/script/ai/background_story/*.gd
!microverse/script/ui/
!microverse/script/ui/*.gd

# 核心资源文件（必需）
!microverse/asset/
!microverse/asset/characters/
!microverse/asset/characters/body/
!microverse/asset/characters/body/Alicex32.png
!microverse/asset/characters/body/Gracex32.png
!microverse/asset/characters/body/Jackx32.png
!microverse/asset/characters/body/Joex32.png
!microverse/asset/characters/body/Leax32.png
!microverse/asset/characters/body/Monicax32.png
!microverse/asset/characters/body/Stephenx32.png
!microverse/asset/characters/body/Tomx32.png

!microverse/asset/characters/portraits/
!microverse/asset/characters/portraits/AliceP32.png
!microverse/asset/characters/portraits/GraceP32.png
!microverse/asset/characters/portraits/JackP32.png
!microverse/asset/characters/portraits/JoeP32.png
!microverse/asset/characters/portraits/LeaP32.png
!microverse/asset/characters/portraits/MonicaP32.png
!microverse/asset/characters/portraits/StephenP32.png
!microverse/asset/characters/portraits/TomP32.png

# 地图资源（仅办公室）
!microverse/asset/maps/
!microverse/asset/maps/interiors/
!microverse/asset/maps/interiors/23_Television_and_Film_Studio_32x32.png

# UI 资源
!microverse/asset/ui/

# 资源导入文件（Godot 必需）
!microverse/asset/**/*.import

# ===========================================
# 前端编译后的游戏文件（必需）
# ===========================================

# 这些是导出后的游戏文件，用户直接运行
!frontend/public/microverse/
!frontend/public/microverse/index.html
!frontend/public/microverse/index.js
!frontend/public/microverse/index.wasm
!frontend/public/microverse/index.pck
!frontend/public/microverse/index.png
!frontend/public/microverse/index.icon.png
!frontend/public/microverse/index.apple-touch-icon.png
!frontend/public/microverse/index.audio.worklet.js
!frontend/public/microverse/index.audio.position.worklet.js

# ===========================================
# 明确排除的文件（不需要）
# ===========================================

# Godot 开发缓存（会自动重新生成）
microverse/.godot/

# 导出目录（会动态生成）
microverse/export/

# 未使用的地图资源
microverse/asset/maps/exteriors/
microverse/asset/maps/interiors/*
!microverse/asset/maps/interiors/23_Television_and_Film_Studio_32x32.png

# 开发工具文件
microverse/.vscode/
microverse/.idea/
microverse/*.log
microverse/*.tmp
microverse/*.backup

# ===========================================
# 文件大小估算
# ===========================================

# 源代码文件: ~2-3MB
# - 脚本文件 (.gd): ~500KB
# - 场景文件 (.tscn): ~1MB
# - 项目配置: ~50KB
# - 主题文件 (.tres): ~200KB

# 资源文件: ~5-8MB
# - 角色贴图: ~2MB
# - 地图贴图: ~3MB
# - UI 贴图: ~1MB
# - 导入文件 (.import): ~1MB

# 编译后游戏: ~45MB
# - index.wasm: ~37MB
# - index.pck: ~8MB
# - 其他文件: ~1MB

# 总计 Git 仓库增加: ~50-55MB

# ===========================================
# 维护建议
# ===========================================

# 1. 定期清理未使用的资源文件
# 2. 压缩 PNG 图片以减少体积
# 3. 考虑使用 Git LFS 管理大型资源文件
# 4. 在 CI/CD 中自动化游戏导出和部署流程