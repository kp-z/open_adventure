# Microverse 游戏模式最小文件集合

## 📋 概述
为了在 open_adventure 项目中支持游戏模式，需要包含以下最小文件集合。这些文件确保游戏能够正常运行，同时保持项目体积最小。

## 🎯 核心必需文件

### 1. 项目配置文件
```
microverse/
├── project.godot              # Godot 项目配置文件
├── export_presets.cfg         # 导出预设配置
└── export.sh                  # 导出脚本
```

### 2. 主场景和核心场景
```
microverse/scene/
├── maps/
│   └── Office.tscn           # 主场景（办公室地图）
├── characters/               # 角色场景文件
│   ├── Alice.tscn
│   ├── Grace.tscn
│   ├── Jack.tscn
│   ├── Joe.tscn
│   ├── Lea.tscn
│   ├── Monica.tscn
│   ├── Stephen.tscn
│   └── Tom.tscn
├── prefab/                   # 预制件
│   ├── Chair.tscn
│   ├── BackChair.tscn
│   ├── FrontChair.tscn
│   └── Desk.tscn
└── ui/                       # UI 组件
    ├── DialogBubble.tscn
    ├── CommandUI.tscn
    ├── GlobalSettingsUI.tscn
    ├── GodUI.tscn
    ├── AIModelLabel.tscn
    ├── SaveLoadUI.tscn
    └── SaveLoadUIManager.tscn
```

### 3. 核心脚本文件
```
microverse/script/
├── CameraController.gd        # 摄像机控制
├── CharacterController.gd     # 角色控制
├── CharacterManager.gd        # 角色管理
├── CharacterPersonality.gd    # 角色个性
├── Chair.gd                   # 椅子交互
├── Desk.gd                    # 桌子交互
├── GameSaveManager.gd         # 游戏存档
├── RoomArea.gd               # 房间区域
├── RoomData.gd               # 房间数据
├── RoomManager.gd            # 房间管理
├── ChatHistory.gd            # 聊天历史
├── ai/                       # AI 相关脚本
│   ├── APIManager.gd
│   ├── DialogManager.gd
│   ├── DialogService.gd
│   ├── ConversationManager.gd
│   ├── AIAgent.gd
│   ├── APIConfig.gd
│   └── memory/
│       └── MemoryManager.gd
└── ui/                       # UI 脚本
    ├── SettingsManager.gd
    ├── DialogBubble.gd
    ├── GlobalSettingsUI.gd
    ├── GodUI.gd
    ├── AIModelLabel.gd
    ├── SaveLoadUI.gd
    └── SaveLoadUIManager.gd
```

### 4. 必需资源文件
```
microverse/asset/
├── characters/
│   ├── body/                 # 角色身体贴图
│   │   ├── Alicex32.png
│   │   ├── Gracex32.png
│   │   ├── Jackx32.png
│   │   ├── Joex32.png
│   │   ├── Leax32.png
│   │   ├── Monicax32.png
│   │   ├── Stephenx32.png
│   │   └── Tomx32.png
│   └── portraits/            # 角色头像
│       ├── AliceP32.png
│       ├── GraceP32.png
│       ├── JackP32.png
│       ├── JoeP32.png
│       ├── LeaP32.png
│       ├── MonicaP32.png
│       ├── StephenP32.png
│       └── TomP32.png
├── maps/
│   └── interiors/
│       └── 23_Television_and_Film_Studio_32x32.png  # 办公室地图贴图
└── ui/
    └── [UI 相关贴图文件]
```

### 5. 主题和样式文件
```
microverse/
├── icon.svg                  # 项目图标
├── MainTheme.tres           # 主题样式
├── GamingTheme.tres         # 游戏主题
├── panel_container_theme.tres # 面板容器主题
└── [其他 .tres 主题文件]
```

## 🚫 可以排除的文件

### 开发和缓存文件
```
.godot/                       # 完整的 .godot 缓存目录
*.tmp                         # 临时文件
*.backup                      # 备份文件
```

### 非必需资源
```
asset/maps/exteriors/         # 外部地图（如果只用办公室）
asset/maps/interiors/         # 其他未使用的室内地图
[未使用的音频文件]
[未使用的贴图文件]
```

## 📦 打包建议

### Git 包含策略
```gitignore
# 包含这些文件
microverse/project.godot
microverse/export_presets.cfg
microverse/export.sh
microverse/scene/
microverse/script/
microverse/asset/characters/
microverse/asset/maps/interiors/23_Television_and_Film_Studio_32x32.png
microverse/asset/ui/
microverse/*.tres
microverse/icon.svg

# 排除这些文件
microverse/.godot/
microverse/export/
microverse/*.tmp
microverse/*.backup
```

### 发布包策略
对于最终用户，只需要包含：
```
frontend/public/microverse/
├── index.html               # 游戏入口（已优化）
├── index.js                 # 游戏引擎
├── index.wasm              # WebAssembly 文件
├── index.pck               # 游戏资源包
├── index.png               # 启动图片
├── index.icon.png          # 图标
└── index.apple-touch-icon.png # 苹果设备图标
```

## 📊 文件大小估算

### 源代码文件 (~2-3MB)
- 脚本文件: ~500KB
- 场景文件: ~1MB
- 项目配置: ~50KB
- 主题文件: ~200KB

### 资源文件 (~5-8MB)
- 角色贴图: ~2MB
- 地图贴图: ~3MB
- UI 贴图: ~1MB

### 导出文件 (~45MB)
- index.wasm: ~37MB
- index.pck: ~8MB
- 其他文件: ~1MB

## 🎯 优化建议

1. **资源优化**: 压缩 PNG 文件，移除未使用的贴图
2. **代码精简**: 移除调试代码和未使用的功能
3. **按需加载**: 考虑将部分角色或地图设为可选下载
4. **缓存策略**: 利用浏览器缓存减少重复下载

## 📝 维护说明

- 当添加新角色时，需要同时添加对应的 .tscn、.gd、身体贴图和头像文件
- 当修改游戏逻辑时，需要重新导出并更新 frontend/public/microverse/ 目录
- 定期清理未使用的资源文件以保持项目精简