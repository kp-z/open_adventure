# Open Adventure 游戏模式集成指南

## 📋 概述

本文档说明如何在 open_adventure 项目中正确包含和维护 microverse 游戏模式，确保游戏功能正常运行的同时保持项目体积合理。

## 🎯 核心文件清单

### 必需包含的文件 (~10-15MB 源码)

#### 1. 项目配置 (~100KB)
```
microverse/
├── project.godot              # Godot 项目配置
├── export_presets.cfg         # 导出预设
├── export.sh                  # 导出脚本
├── serve.sh                   # 本地服务脚本
└── icon.svg                   # 项目图标
```

#### 2. 游戏场景 (~1-2MB)
```
microverse/scene/
├── maps/Office.tscn           # 主场景（办公室）
├── characters/                # 8个角色场景
│   ├── Alice.tscn
│   ├── Grace.tscn
│   ├── Jack.tscn
│   ├── Joe.tscn
│   ├── Lea.tscn
│   ├── Monica.tscn
│   ├── Stephen.tscn
│   └── Tom.tscn
├── prefab/                    # 家具预制件
│   ├── Chair.tscn
│   ├── BackChair.tscn
│   ├── FrontChair.tscn
│   └── Desk.tscn
└── ui/                        # UI 组件
    ├── DialogBubble.tscn
    ├── CommandUI.tscn
    ├── GlobalSettingsUI.tscn
    ├── GodUI.tscn
    ├── AIModelLabel.tscn
    ├── SaveLoadUI.tscn
    └── SaveLoadUIManager.tscn
```

#### 3. 游戏脚本 (~500KB)
```
microverse/script/
├── CameraController.gd        # 摄像机控制（已优化缩放）
├── CharacterController.gd     # 角色控制
├── CharacterManager.gd        # 角色管理
├── CharacterPersonality.gd    # 角色个性系统
├── Chair.gd                   # 椅子交互
├── Desk.gd                    # 桌子交互
├── GameSaveManager.gd         # 存档管理
├── RoomArea.gd               # 房间区域
├── RoomData.gd               # 房间数据
├── RoomManager.gd            # 房间管理
├── ChatHistory.gd            # 聊天历史
├── ai/                       # AI 系统
│   ├── APIManager.gd
│   ├── DialogManager.gd
│   ├── DialogService.gd
│   ├── ConversationManager.gd
│   ├── AIAgent.gd
│   ├── APIConfig.gd
│   └── memory/MemoryManager.gd
└── ui/                       # UI 脚本
    ├── SettingsManager.gd
    ├── DialogBubble.gd
    ├── GlobalSettingsUI.gd
    ├── GodUI.gd
    ├── AIModelLabel.gd
    ├── SaveLoadUI.gd
    └── SaveLoadUIManager.gd
```

#### 4. 游戏资源 (~5-8MB)
```
microverse/asset/
├── characters/
│   ├── body/                 # 角色身体贴图 (8个文件)
│   │   ├── Alicex32.png
│   │   ├── Gracex32.png
│   │   ├── Jackx32.png
│   │   ├── Joex32.png
│   │   ├── Leax32.png
│   │   ├── Monicax32.png
│   │   ├── Stephenx32.png
│   │   └── Tomx32.png
│   └── portraits/            # 角色头像 (8个文件)
│       ├── AliceP32.png
│       ├── GraceP32.png
│       ├── JackP32.png
│       ├── JoeP32.png
│       ├── LeaP32.png
│       ├── MonicaP32.png
│       ├── StephenP32.png
│       └── TomP32.png
├── maps/interiors/
│   └── 23_Television_and_Film_Studio_32x32.png  # 办公室地图
├── ui/                       # UI 相关贴图
└── **/*.import              # Godot 资源导入文件
```

#### 5. 主题样式 (~200KB)
```
microverse/
├── MainTheme.tres
├── GamingTheme.tres
├── panel_container_theme.tres
└── [其他 .tres 文件]
```

### 编译后的游戏文件 (~45MB)
```
frontend/public/microverse/
├── index.html               # 游戏入口（已优化）
├── index.js                 # 游戏引擎 (~300KB)
├── index.wasm              # WebAssembly (~37MB)
├── index.pck               # 游戏资源包 (~8MB)
├── index.png               # 启动图片
├── index.icon.png          # 图标
├── index.apple-touch-icon.png
├── index.audio.worklet.js
└── index.audio.position.worklet.js
```

## 🚫 不需要包含的文件

### 开发缓存 (可忽略)
```
microverse/.godot/           # Godot 开发缓存（自动生成）
microverse/export/           # 导出目录（临时文件）
microverse/*.tmp            # 临时文件
microverse/*.backup         # 备份文件
microverse/.vscode/         # IDE 配置
microverse/.idea/           # IDE 配置
```

### 未使用的资源 (可排除)
```
microverse/asset/maps/exteriors/     # 外部地图
microverse/asset/maps/interiors/     # 其他室内地图
[未使用的音频文件]
[未使用的贴图文件]
```

## 🛠️ 使用工具

### 1. 最小文件打包脚本
```bash
# 创建只包含必需文件的压缩包
./scripts/pack_microverse_minimal.sh
```

### 2. 游戏导出和更新
```bash
# 导出游戏
cd microverse && ./export.sh

# 更新前端游戏文件
cp export/* ../frontend/public/microverse/
```

### 3. Git 管理策略
参考 `docs/technical/microverse-git-strategy.md` 中的详细规则。

## 📊 文件大小分析

| 类型 | 大小 | 说明 |
|------|------|------|
| 源代码文件 | ~2-3MB | .gd, .tscn, .godot, .cfg |
| 游戏资源 | ~5-8MB | .png, .tres, .import |
| 编译后游戏 | ~45MB | .wasm, .pck, .js |
| **总计** | **~50-55MB** | **完整游戏模式** |

## 🔄 维护流程

### 开发阶段
1. 在 `microverse/` 目录中修改游戏代码
2. 使用 Godot 编辑器测试功能
3. 提交源代码到 Git

### 发布阶段
1. 运行 `./export.sh` 导出游戏
2. 复制导出文件到 `frontend/public/microverse/`
3. 测试游戏在浏览器中的运行
4. 提交更新后的编译文件

### 优化建议
1. **资源压缩**: 定期压缩 PNG 文件
2. **代码清理**: 移除未使用的脚本和场景
3. **缓存策略**: 利用浏览器缓存减少加载时间
4. **按需加载**: 考虑将部分功能设为可选

## 🎮 游戏功能特性

### 已实现功能
- ✅ 8个 AI 角色，每个都有独特个性
- ✅ 办公室场景，支持角色移动和交互
- ✅ 摄像机系统，支持跟随、缩放、拖拽
- ✅ 对话系统，支持与 AI 角色聊天
- ✅ 存档系统，支持游戏状态保存
- ✅ UI 系统，包含设置、命令面板等
- ✅ 响应式设计，支持不同屏幕尺寸
- ✅ 加载界面，与前端系统集成

### 技术特点
- 🎯 **优化的默认视图**: 摄像机默认放大 1.2x，提供更清晰的游戏体验
- 🖱️ **灵活的视角控制**: 支持鼠标拖拽、滚轮缩放、空格键重置
- 💬 **智能对话系统**: 集成 AI API，支持上下文记忆
- 💾 **完整存档功能**: 保存角色状态、对话历史、场景设置
- 🎨 **现代 UI 设计**: 游戏化界面，支持主题切换

## 📝 注意事项

1. **版本兼容性**: 确保使用 Godot 4.6+ 版本
2. **资源路径**: 所有资源路径使用相对路径，确保跨平台兼容
3. **文件大小**: 监控编译后文件大小，避免过大影响加载速度
4. **浏览器兼容**: 测试主流浏览器的 WebAssembly 支持
5. **移动端适配**: 确保触屏设备的交互体验

通过遵循这个指南，可以确保 open_adventure 项目中的游戏模式功能完整、体积合理、维护简便。