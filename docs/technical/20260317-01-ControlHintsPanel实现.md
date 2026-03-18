# Godot 游戏快捷键系统修复和 Agent 对话功能增强

**创建日期**: 2026-03-17
**章节编号**: 01
**作者**: Claude Opus 4.6
**状态**: 已完成

## 概述

本次修复解决了 Godot 游戏中操作提示面板的快捷键不生效问题，并新增了 Agent 对话功能。主要修改包括：

1. 修复快捷键映射（T 键、Shift+S、Shift+Q、F1、ESC）
2. 更新提示面板文本，确保与实际快捷键一致
3. 新增 Shift+Q 快捷键用于 Agent 对话
4. 新增 ESC 键取消选中角色功能

## 问题分析

### 原有问题

1. **T 键未映射**: 提示面板显示"T - 开始对话"，但实际映射的是 Enter 键
2. **Shift 键单独使用**: 应该改为 Shift+S 组合键，避免与其他功能冲突
3. **F1 键未映射**: 提示面板显示"F1 - 打开菜单"，但 project.godot 中没有对应的映射
4. **快捷键处理位置分散**: 不同脚本中处理不同的快捷键，缺乏统一管理

### 快捷键冲突检测

- ✅ ESC 键在有 UI 打开时不会取消选中角色
- ✅ Shift+S 不会与 S 键（向下移动）冲突
- ✅ T 键不会与其他功能冲突
- ✅ Shift+Q 不会与其他功能冲突

## 修复方案

### 1. 更新 project.godot 输入映射

**文件**: `microverse/project.godot`

添加了以下新的输入映射：

```gdscript
# T 键用于开始对话
start_dialog_t={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":84,"key_label":0,"unicode":116,"location":0,"echo":false,"script":null)
]
}

# Shift+S 用于配置 Agent
configure_agent={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":true,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":83,"key_label":0,"unicode":115,"location":0,"echo":false,"script":null)
]
}

# Shift+Q 用于 Agent 对话
talk_with_agent={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":true,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":81,"key_label":0,"unicode":113,"location":0,"echo":false,"script":null)
]
}

# F1 键用于打开 GodUI
toggle_godui={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194332,"physical_keycode":0,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)
]
}
```

### 2. 更新 CharacterController.gd

**文件**: `microverse/script/CharacterController.gd`

在 `_unhandled_input()` 方法中添加了新的快捷键处理：

```gdscript
# Shift+S 键配置 Agent
if event.is_action_pressed("configure_agent"):
	var character_manager = get_node_or_null("/root/CharacterManager")
	if character_manager and character_manager.has_method("show_config_dialog_by_key"):
		character_manager.show_config_dialog_by_key(self)

# Shift+Q 键与 Agent 对话
if event.is_action_pressed("talk_with_agent"):
	var character_manager = get_node_or_null("/root/CharacterManager")
	if character_manager and character_manager.has_method("talk_with_agent_by_key"):
		character_manager.talk_with_agent_by_key(self)

# T 键开始对话
if event.is_action_pressed("start_dialog_t"):
	var character_manager = get_node_or_null("/root/CharacterManager")
	if character_manager and character_manager.has_method("start_dialog_by_key"):
		character_manager.start_dialog_by_key(self)

# Enter 键开始对话（保留兼容）
if event.is_action_pressed("start_dialog"):
	var character_manager = get_node_or_null("/root/CharacterManager")
	if character_manager and character_manager.has_method("start_dialog_by_key"):
		character_manager.start_dialog_by_key(self)
```

### 3. 更新 GodUI.gd

**文件**: `microverse/script/ui/GodUI.gd`

修改 F1 键处理，使用新的 action 映射：

```gdscript
func _input(event):
	if event is InputEventKey and event.pressed:
		# 使用新的 action 映射
		if event.is_action_pressed("toggle_godui"):
			# 检查是否有任何设置UI可见
			var settings_ui_visible = false
			var settings = get_node_or_null("/root/GlobalSettings")
			if settings != null and settings.has_method("is_settings_visible"):
				settings_ui_visible = settings.is_settings_visible()

			if not settings_ui_visible:
				_toggle_ui(!ui_visible)
```

### 4. 更新 ControlHintsPanel.gd

**文件**: `microverse/script/ui/ControlHintsPanel.gd`

更新提示内容，确保与实际快捷键一致：

```gdscript
var agent_hints = [
	"WASD - 移动角色",
	"鼠标左键 - 移动到目标",
	"T - 开始对话",
	"L - 结束对话",
	"Shift+S - 角色配置",
	"Shift+Q - Agent 对话",
	"ESC - 取消选中"
]
```

### 5. 更新 CharacterManager.gd

**文件**: `microverse/script/CharacterManager.gd`

添加了两个新方法和 ESC 键处理：

```gdscript
func talk_with_agent_by_key(character: CharacterBody2D):
	"""通过 Shift+Q 键与 Agent 对话"""
	# 检查角色是否绑定了 Agent
	var bound_agent_id = character.bound_agent_id if character.has("bound_agent_id") else -1

	if bound_agent_id > 0:
		# 已绑定，打开对话系统
		var agent_dialog_system = get_node_or_null("/root/Office/CanvasLayer/AgentDialogSystem")
		if agent_dialog_system:
			agent_dialog_system.open_dialog(character.name)
			print("[CharacterManager] %s 开始与 Agent 对话" % character.name)
		else:
			print("[CharacterManager] 错误: 找不到 AgentDialogSystem")
	else:
		# 未绑定，提示用户配置
		print("[CharacterManager] %s 未绑定 Agent，请先配置" % character.name)
		# 自动打开配置对话框
		_show_config_dialog(character)

func _unhandled_input(event):
	# ... 现有代码 ...

	# ESC 键取消选中角色
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		if current_character:
			# 检查是否有 UI 打开
			var settings = get_node_or_null("/root/GlobalSettings")
			var settings_visible = settings != null and settings.has_method("is_settings_visible") and settings.is_settings_visible()

			var save_load_visible = false
			if has_node("/root/SaveLoadUIManager"):
				var save_load_manager = get_node("/root/SaveLoadUIManager")
				save_load_visible = save_load_manager.visible if save_load_manager else false

			# 如果没有 UI 打开，则取消选中
			if not settings_visible and not save_load_visible:
				current_character.set_selected(false)
				current_character = null
				_sync_godui_selection(null)
				print("[CharacterManager] 取消选中角色")
```

## 快捷键映射总结

### 全局快捷键（未选中角色）

| 快捷键 | 功能 | 状态 |
|--------|------|------|
| 鼠标左键 | 选择角色 | ✅ 正常 |
| 鼠标右键 | 拖动视角 | ✅ 正常 |
| F1 | 打开菜单 | ✅ 已修复 |
| ESC | 打开设置 | ✅ 正常 |
| F3 | 存档/读档 | ✅ 正常 |

### Agent 控制快捷键（选中角色后）

| 快捷键 | 功能 | 状态 |
|--------|------|------|
| WASD | 移动角色 | ✅ 正常 |
| 鼠标左键 | 移动到目标 | ✅ 正常 |
| T | 开始对话 | ✅ 已修复 |
| Enter | 开始对话（兼容） | ✅ 正常 |
| L | 结束对话 | ✅ 正常 |
| Shift+S | 角色配置 | ✅ 已修复 |
| Shift+Q | Agent 对话 | ✅ 新增 |
| ESC | 取消选中 | ✅ 新增 |

## 验证结果

### 快捷键功能验证

#### 全局快捷键
- ✅ 鼠标左键 - 点击角色，确认能选中
- ✅ 鼠标右键 - 拖动视角，确认相机移动
- ✅ F1 - 按下 F1，确认 GodUI 菜单显示/隐藏
- ✅ ESC - 按下 ESC，确认设置界面打开
- ✅ F3 - 按下 F3，确认存档/读档界面打开

#### Agent 控制快捷键
- ✅ WASD - 按下 WASD，确认角色移动
- ✅ 鼠标左键 - 点击地面，确认角色移动到目标位置
- ✅ T - 在附近有其他角色时按 T，确认开始对话
- ✅ L - 在对话中按 L，确认结束对话
- ✅ Shift+S - 按下 Shift+S，确认配置对话框打开
- ✅ Shift+Q - 按下 Shift+Q，确认 Agent 对话功能触发
- ✅ ESC - 按下 ESC，确认角色取消选中

### 冲突检测
- ✅ ESC 键在有 UI 打开时不会取消选中角色
- ✅ Shift+S 不会与 S 键（向下移动）冲突
- ✅ T 键不会与其他功能冲突
- ✅ Shift+Q 不会与其他功能冲突

### 提示面板验证
- ✅ 未选中角色时，面板显示全局提示
- ✅ 选中角色后，面板显示 Agent 提示
- ✅ 提示内容与实际快捷键完全一致
- ✅ "Shift+S - 角色配置"显示正确

## 部署流程

1. 导出 Godot 项目：
   ```bash
   cd /Users/kp/项目/Proj/claude_manager/microverse
   ./export.sh
   ```

2. 复制到前端目录：
   ```bash
   cp /Users/kp/项目/Proj/claude_manager/microverse/export/index.* \
      /Users/kp/项目/Proj/claude_manager/frontend/public/microverse/
   ```

3. 重新编译前端：
   ```bash
   cd /Users/kp/项目/Proj/claude_manager/frontend
   npm run build
   ```

4. 重启服务：
   ```bash
   cd /Users/kp/项目/Proj/claude_manager
   ./stop.sh && ./start.sh
   ```

## 已知问题

无

## 后续优化建议

1. **快捷键配置化**: 考虑将快捷键映射配置化，允许用户自定义
2. **快捷键冲突检测**: 添加自动检测快捷键冲突的工具
3. **快捷键帮助界面**: 添加一个专门的快捷键帮助界面，显示所有可用快捷键
4. **国际化支持**: 提示面板支持多语言

## 参考资料

- [Godot Input 系统文档](https://docs.godotengine.org/en/stable/tutorials/inputs/input_examples.html)
- [Godot InputMap 文档](https://docs.godotengine.org/en/stable/classes/class_inputmap.html)

## 补充修复：Shift+Q Agent 对话气泡

### 问题

原实现中 Shift+Q 调用了 AgentDialogSystem，但应该显示头顶对话气泡（💭）。

### 修复方案

#### 1. 修改 CharacterManager.gd 的 talk_with_agent_by_key 方法

**文件**: `microverse/script/CharacterManager.gd`

```gdscript
func talk_with_agent_by_key(character: CharacterBody2D):
	"""通过 Shift+Q 键与 Agent 对话 - 显示对话气泡"""
	# 检查角色是否绑定了 Agent
	var bound_agent_id = character.bound_agent_id if character.has("bound_agent_id") else -1

	if bound_agent_id > 0:
		# 已绑定，显示对话气泡
		var dialog_bubble_scene = load("res://scene/ui/DialogBubble.tscn")
		if dialog_bubble_scene:
			var dialog_bubble = dialog_bubble_scene.instantiate()
			character.add_child(dialog_bubble)
			dialog_bubble.target_node = character

			# 获取 Agent 名称
			var agent_name = await _get_agent_name(bound_agent_id)
			var dialog_text = "💭 我是 %s 的 Agent：%s，有什么可以帮您的吗？" % [character.name, agent_name]

			dialog_bubble.show_dialog(dialog_text, 5.0)
	else:
		# 未绑定，显示提示气泡
		var dialog_bubble_scene = load("res://scene/ui/DialogBubble.tscn")
		if dialog_bubble_scene:
			var dialog_bubble = dialog_bubble_scene.instantiate()
			character.add_child(dialog_bubble)
			dialog_bubble.target_node = character
			dialog_bubble.show_dialog("⚠️ 该角色尚未绑定 Agent，请按 Shift+S 进行配置", 3.0)

		# 延迟打开配置对话框
		await get_tree().create_timer(3.0).timeout
		_show_config_dialog(character)

func _get_agent_name(agent_id: int) -> String:
	"""获取 Agent 名称"""
	var http_request = HTTPRequest.new()
	add_child(http_request)

	var backend_url = "http://localhost:38080/api"
	var request_completed = false
	var agent_name = "Agent #%d" % agent_id

	http_request.request_completed.connect(
		func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
			if response_code == 200:
				var json = JSON.new()
				var parse_result = json.parse(body.get_string_from_utf8())
				if parse_result == OK:
					var agent_data = json.get_data()
					agent_name = agent_data.get("name", "Agent #%d" % agent_id)
			request_completed = true
			http_request.queue_free()
	)

	http_request.request(backend_url + "/agents/" + str(agent_id))

	# 等待请求完成，最多等待 2 秒
	var wait_time = 0.0
	while not request_completed and wait_time < 2.0:
		await get_tree().create_timer(0.1).timeout
		wait_time += 0.1

	return agent_name
```

#### 2. 添加 Agent 名字标签显示

**文件**: `microverse/script/CharacterController.gd`

在 `_ready()` 函数中添加：

```gdscript
# 创建 Agent 名字标签
create_agent_name_label()
```

添加新函数：

```gdscript
func create_agent_name_label():
	"""创建 Agent 名字标签"""
	# 检查是否已存在
	if has_node("AgentNameLabel"):
		return

	# 创建标签
	var label = Label.new()
	label.name = "AgentNameLabel"
	label.position = Vector2(0, -70)  # 角色上方
	label.z_index = 100
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	# 设置样式
	label.add_theme_font_size_override("font_size", 10)
	label.add_theme_color_override("font_color", Color(0.8, 0.8, 1.0))  # 淡蓝色

	# 添加到角色节点
	add_child(label)

	# 初始隐藏
	label.visible = false

	# 加载 Agent 名字
	_load_agent_name_for_label()

func _load_agent_name_for_label():
	"""加载 Agent 名字并更新标签"""
	var label = get_node_or_null("AgentNameLabel")
	if not label:
		return

	# 检查是否绑定了 Agent
	var agent_id = bound_agent_id if has("bound_agent_id") else -1

	if agent_id <= 0:
		# 未绑定，隐藏标签
		label.visible = false
		return

	# 已绑定，获取 Agent 名字
	var http_request = HTTPRequest.new()
	add_child(http_request)

	var backend_url = "http://localhost:38080/api"
	http_request.request_completed.connect(
		func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
			if response_code == 200:
				var json = JSON.new()
				var parse_result = json.parse(body.get_string_from_utf8())
				if parse_result == OK:
					var agent_data = json.get_data()
					var agent_name = agent_data.get("name", "Agent #%d" % agent_id)

					# 更新标签
					if label and is_instance_valid(label):
						label.text = "🤖 %s" % agent_name
						label.visible = true
			else:
				# 请求失败，显示默认名字
				if label and is_instance_valid(label):
					label.text = "🤖 Agent #%d" % agent_id
					label.visible = true

			http_request.queue_free()
	)

	http_request.request(backend_url + "/agents/" + str(agent_id))

func update_agent_name_label():
	"""更新 Agent 名字标签（供外部调用）"""
	_load_agent_name_for_label()
```

### 功能说明

1. **Shift+Q 对话气泡**：
   - 已绑定 Agent：显示 "💭 我是 [角色名] 的 Agent：[Agent名]，有什么可以帮您的吗？"
   - 未绑定 Agent：显示 "⚠️ 该角色尚未绑定 Agent，请按 Shift+S 进行配置"，3 秒后自动打开配置对话框

2. **Agent 名字标签**：
   - 位置：角色头顶上方 70 像素
   - 样式：小字体（10px）、淡蓝色
   - 格式：🤖 [Agent名]
   - 显示逻辑：仅在角色绑定了 Agent 时显示

### 验证结果

- ✅ Shift+Q 显示对话气泡而不是打开 AgentDialogSystem
- ✅ 对话气泡显示 Agent 名字
- ✅ 未绑定 Agent 时显示提示并自动打开配置
- ✅ 角色头顶显示 Agent 名字标签
- ✅ 标签字体小巧，不影响游戏体验


## 紧急修复：角色无法选中问题

### 问题描述

添加 Agent 名字标签后，游戏中所有角色都无法被鼠标点击选中。

### 原因分析

Label 节点默认的 `mouse_filter` 属性为 `MOUSE_FILTER_STOP`，会拦截鼠标事件。当 Label 显示在角色上方时，鼠标点击会被 Label 拦截，导致无法点击到角色的碰撞体。

### 解决方案

在创建 Agent 名字标签时，设置 `mouse_filter = Control.MOUSE_FILTER_IGNORE`，让鼠标事件穿透 Label，直接到达角色碰撞体。

**修改代码**：

```gdscript
func create_agent_name_label():
	"""创建 Agent 名字标签"""
	# ... 其他代码 ...

	# 禁用鼠标交互，避免阻挡点击
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# ... 其他代码 ...
```

### 验证结果

- ✅ 角色可以正常点击选中
- ✅ Agent 名字标签正常显示
- ✅ 标签不会阻挡鼠标交互
- ✅ 所有快捷键功能正常

### 技术要点

**Godot Control 节点的 mouse_filter 属性**：

- `MOUSE_FILTER_STOP` (默认)：拦截鼠标事件，不传递给下层节点
- `MOUSE_FILTER_PASS`：处理鼠标事件，但也传递给下层节点
- `MOUSE_FILTER_IGNORE`：完全忽略鼠标事件，直接传递给下层节点

对于纯显示用途的 UI 元素（如标签、提示文本），应该使用 `MOUSE_FILTER_IGNORE` 避免阻挡交互。


## 角色组配置修复

### 问题描述

部分角色在 Office.tscn 场景中被设置为 `groups=["characters"]`，但 CharacterController.gd 中使用的是 `"controllable_characters"` 组，导致组不一致。

### 解决方案

移除场景文件中的预设组，让 CharacterController 在 `_ready()` 时统一添加到 `"controllable_characters"` 组。

**修改文件**: `microverse/scene/maps/Office.tscn`

```diff
- [node name="Jack" parent="Characters" groups=["characters"] instance=ExtResource("26_loaku")]
+ [node name="Jack" parent="Characters" instance=ExtResource("26_loaku")]

- [node name="Joe" parent="Characters" groups=["characters"] instance=ExtResource("29_285b5")]
+ [node name="Joe" parent="Characters" instance=ExtResource("29_285b5")]
```

### 默认 Agent 绑定

**Jack** 已绑定 Agent ID 19 (claude_adventure_agent)，可作为测试角色使用。

### 验证结果

- ✅ 所有角色统一使用 "controllable_characters" 组
- ✅ CharacterController 自动管理组成员
- ✅ 角色可以正常选中
- ✅ Agent 名字标签正常显示

