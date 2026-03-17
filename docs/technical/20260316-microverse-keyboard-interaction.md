# Microverse 游戏模式键盘交互改进

**创建日期**: 2026-03-16
**状态**: 已实施

## 概述

本次改进将 Microverse 的交互方式从点击弹窗改为更加游戏化的键盘控制方式，提供更沉浸的游戏体验。

## 主要改进

### 1. 默认隐藏侧边栏

**修改文件**: `microverse/script/ui/GodUI.gd`

**改动**:
- 在 `_ready()` 方法中，将默认 UI 状态从显示改为隐藏
- 使用 `call_deferred("_toggle_ui", false)` 延迟隐藏，确保场景完全加载

**效果**:
- 进入游戏模式时，左右侧边栏默认隐藏
- 按 Tab 键可以切换侧边栏显示/隐藏
- 提供更沉浸的游戏画面

### 2. 添加键盘快捷键

**修改文件**: `microverse/project.godot`

**新增输入动作**:
- `configure_agent`: Shift 键 (physical_keycode 4194325) - 配置 Agent
- `start_dialog`: Enter 键 (physical_keycode 4194309) - 开始对话（原 T 键改为 Enter）

### 3. 移除点击弹窗

**修改文件**: `microverse/script/CharacterManager.gd`

**改动**:
- 修改 `select_character()` 方法，移除自动弹出配置对话框的逻辑
- 点击角色仅选中，不再弹窗
- 添加 `show_config_dialog_by_key()` 方法，通过 Shift 键触发配置对话框
- 添加 `start_dialog_by_key()` 方法，通过 Enter 键开始对话

### 4. 键盘交互实现

**修改文件**: `microverse/script/CharacterController.gd`

**改动**:
- 在 `_unhandled_input()` 方法中添加 Shift 和 Enter 键处理
- Shift 键：调用 CharacterManager 的 `show_config_dialog_by_key()` 方法
- Enter 键：调用 CharacterManager 的 `start_dialog_by_key()` 方法

## 新的交互流程

### 选择角色
1. 点击角色 → 角色被选中（高亮显示）
2. 相机跟随选中的角色
3. 不再自动弹出配置对话框

### 配置 Agent
1. 选中角色后，按 **Shift 键**
2. 弹出配置对话框
3. 可以配置 Agent 绑定、任务等

### 开始对话
1. 选中角色后，靠近其他角色
2. 按 **Enter 键**
3. 如果附近有其他角色，开始对话
4. 如果附近没有角色，显示提示信息

### 其他快捷键（保持不变）
- **WASD**: 控制角色移动
- **空格键**: 坐下/站起
- **E 键**: 开始工作
- **Tab 键**: 切换 UI 显示/隐藏

## 技术细节

### 输入动作配置

```gdscript
# project.godot
configure_agent={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":4194325,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)
]
}

start_dialog={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":4194309,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)
]
}
```

### CharacterController 键盘处理

```gdscript
# Shift 键配置 Agent
if event.is_action_pressed("configure_agent"):
    var character_manager = get_node_or_null("/root/CharacterManager")
    if character_manager and character_manager.has_method("show_config_dialog_by_key"):
        character_manager.show_config_dialog_by_key(self)

# Enter 键开始对话
if event.is_action_pressed("start_dialog"):
    var character_manager = get_node_or_null("/root/CharacterManager")
    if character_manager and character_manager.has_method("start_dialog_by_key"):
        character_manager.start_dialog_by_key(self)
```

### CharacterManager 新方法

```gdscript
func show_config_dialog_by_key(character: CharacterBody2D):
    """通过 Shift 键显示配置对话框"""
    _show_config_dialog(character)

func start_dialog_by_key(character: CharacterBody2D):
    """通过 Enter 键开始对话"""
    var nearby_character = get_nearby_character(character)
    if nearby_character:
        if dialog_manager and dialog_manager.has_method("start_dialog"):
            dialog_manager.start_dialog(character, nearby_character)
            print("[CharacterManager] %s 开始与 %s 对话" % [character.name, nearby_character.name])
    else:
        print("[CharacterManager] %s 附近没有可对话的角色" % character.name)
```

## 测试验证

### 基本功能测试
- [x] 进入游戏模式时侧边栏默认隐藏
- [x] 按 Tab 键可以切换侧边栏显示/隐藏
- [x] 点击角色可以选中，但不弹出对话框
- [x] 选中角色后按 Shift 键打开配置对话框
- [x] 选中角色后按 Enter 键开始对话（如果附近有其他角色）
- [x] WASD 控制角色移动正常
- [x] 空格键坐下/站起功能正常
- [x] E 键开始工作功能正常

### 用户体验
- [x] 游戏模式更加沉浸，像真正的游戏
- [x] 键盘控制流畅自然，响应及时
- [x] 交互方式更加游戏化

## 后续优化建议

### 1. 右下角控制提示 UI（未实施）
- 显示 WASD、Shift、Enter 等按键图标
- 按键时高亮显示
- 支持移动端点击操作

### 2. 靠近提示（未实施）
- 靠近其他 Agent 时显示提示气泡
- 提示内容："Shift 配置 / Enter 对话"
- 离开时自动隐藏

### 3. 按键图标资源（未实施）
- 从 Modern_UI_Style 资源中提取按键图标
- 创建统一的像素风格 UI

## 部署说明

### 导出和同步
```bash
# 1. 导出 Godot 项目
cd microverse
./export.sh

# 2. 同步到前端
rsync -av --delete microverse/export/ frontend/public/microverse/

# 3. 启动项目
./start.sh
```

### 访问地址
- 本地访问: http://localhost:38080
- Microverse (HTTPS): https://localhost:8443/microverse

## 总结

本次改进成功将 Microverse 的交互方式从点击弹窗改为键盘控制，提供了更加游戏化和沉浸式的体验。主要改进包括：

1. **默认隐藏侧边栏**：提供全屏游戏画面
2. **键盘快捷键**：Shift 配置、Enter 对话
3. **移除点击弹窗**：点击仅选中，不再弹窗
4. **保持原有功能**：WASD 移动、空格坐下、E 工作

这些改进使 Microverse 从"带游戏界面的管理工具"真正转变为"游戏化的 AI 管理体验"。
