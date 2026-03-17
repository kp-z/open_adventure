# Godot 游戏模式 Agent 任务配置与键盘控制实现

**创建日期**: 2026-03-16
**状态**: 已完成

## 概述

实现了 Godot 游戏模式中的 Agent 任务配置和角色控制功能，包括：
- 全局 API 客户端单例
- Agent 绑定和任务配置的实际 API 集成
- 电脑检测机制
- E 键触发工作
- 自动工作流程
- 工作完成后自动站起

## 实现内容

### 1. 创建 MicroverseAPIClient 单例

**文件**: `microverse/script/api/MicroverseAPIClient.gd`

**功能**:
- 封装所有 Microverse 相关的 API 调用
- 提供统一的错误处理
- 支持异步请求和回调

**关键方法**:
- `get_agents()` - 获取所有可用的 Agent 列表
- `bind_character_to_agent()` - 绑定角色到 Agent
- `unbind_character()` - 解绑角色的 Agent
- `get_character_tasks()` - 获取角色的任务列表
- `add_character_task()` - 添加角色任务
- `delete_character_task()` - 删除角色任务
- `start_character_work()` - 开始角色工作
- `stop_character_work()` - 停止角色工作
- `get_work_status()` - 获取角色工作状态

**注册为 Autoload**:
在 `project.godot` 中添加：
```ini
MicroverseAPIClient="*res://script/api/MicroverseAPIClient.gd"
```

### 2. 集成 API 到 UI 组件

#### AgentBindingPanel

**文件**: `microverse/script/ui/AgentBindingPanel.gd`

**修改**:
- `_load_agents()` - 调用 `MicroverseAPIClient.get_agents()` 获取实际 Agent 列表
- `_on_bind_pressed()` - 调用 `MicroverseAPIClient.bind_character_to_agent()` 绑定
- `_on_unbind_pressed()` - 调用 `MicroverseAPIClient.unbind_character()` 解绑

#### TaskConfigPanel

**文件**: `microverse/script/ui/TaskConfigPanel.gd`

**修改**:
- `_load_tasks()` - 调用 `MicroverseAPIClient.get_character_tasks()` 加载任务
- `_on_add_task_pressed()` - 调用 `MicroverseAPIClient.add_character_task()` 添加任务
- `_on_delete_task_pressed()` - 调用 `MicroverseAPIClient.delete_character_task()` 删除任务

### 3. 更新 CharacterController

**文件**: `microverse/script/CharacterController.gd`

**修改**:
- `start_work()` - 调用 `MicroverseAPIClient.start_character_work()` 启动工作
- `stop_work()` - 调用 `MicroverseAPIClient.stop_character_work()` 停止工作
- 添加 `has_assigned_task()` - 检查是否有分配的任务
- 添加 `show_work_prompt()` - 显示工作提示气泡
- 添加 `hide_work_prompt()` - 隐藏工作提示气泡
- `_unhandled_input()` - 添加 E 键触发工作
- `_physics_process()` - 添加工作提示检测逻辑
- `sit_on_chair()` - 坐下后自动开始工作
- `create_work_status_client()` - 连接 work_completed 信号
- 添加 `_on_work_completed()` - 工作完成回调

### 4. 实现电脑检测机制

**文件**: `microverse/script/Desk.gd`

**修改**:
- 添加 `detection_area` 变量
- 添加 `_create_detection_area()` - 动态创建 Area2D 检测区域
- 添加 `_on_character_entered()` - 角色进入检测区域
- 添加 `_on_character_exited()` - 角色离开检测区域

**检测机制**:
- 为电脑桌动态创建 Area2D 节点
- 检测半径 60 像素
- 角色进入时设置 `near_computer` 属性
- 角色离开时清除 `near_computer` 属性

### 5. 添加 E 键输入映射

**文件**: `microverse/project.godot`

**添加**:
```ini
start_work={
"deadzone": 0.5,
"events": [Object(InputEventKey,"keycode":0,"physical_keycode":69)]
}
```

### 6. 完善 WorkStatusClient

**文件**: `microverse/script/api/WorkStatusClient.gd`

**修改**:
- 添加 `work_completed` 信号
- `_handle_status_update()` - 在任务完成或失败时发射信号

### 7. 完善 WorkProgressBubble

**文件**: `microverse/script/ui/WorkProgressBubble.gd`

**修改**:
- 添加 `show_completion()` - 显示完成状态

## 工作流程

### 完整流程

1. **配置阶段**:
   - 用户在 GodUI 中选择角色
   - 打开 "Agent 绑定" 标签页，绑定 Agent
   - 打开 "任务配置" 标签页，添加任务

2. **移动阶段**:
   - 使用 WASD 或方向键移动角色到电脑前
   - 角色进入检测区域，显示 "按 E 开始工作" 提示

3. **工作阶段**:
   - 按 E 键触发工作
   - 角色自动移动到椅子并坐下
   - 坐下后自动调用后端 API 开始工作
   - WebSocket 连接建立，实时接收进度更新
   - 工作进度气泡显示实时状态

4. **完成阶段**:
   - 任务完成或失败时，显示完成气泡
   - 3 秒后角色自动站起来

### 自动工作模式

如果启用自动工作（`set_auto_work_enabled(true)`）：
- 角色靠近电脑时自动移动到椅子
- 自动坐下
- 自动开始工作

## 键盘控制

### 已支持的按键

- **WASD / 方向键**: 移动角色
- **Enter**: 坐下/站起（靠近椅子时）
- **E**: 开始工作（靠近电脑且有任务时）

## API 端点

### Agent 相关

- `GET /api/agents` - 获取 Agent 列表
- `POST /api/microverse/characters/{name}/bind` - 绑定 Agent
- `POST /api/microverse/characters/{name}/unbind` - 解绑 Agent
- `GET /api/microverse/characters/{name}/binding` - 获取绑定信息

### 任务相关

- `GET /api/microverse/characters/{name}/tasks` - 获取任务列表
- `POST /api/microverse/characters/{name}/tasks` - 添加任务
- `DELETE /api/microverse/characters/{name}/tasks/{id}` - 删除任务

### 工作相关

- `POST /api/microverse/characters/{name}/work` - 开始工作
- `POST /api/microverse/characters/{name}/work/stop` - 停止工作
- `GET /api/microverse/characters/{name}/work/status` - 获取工作状态
- `WS /api/microverse/characters/{name}/work-ws` - WebSocket 实时更新

## 测试步骤

### 1. API 客户端测试

```bash
# 启动后端服务
cd /Users/kp/项目/Proj/claude_manager
./start.sh

# 在 Godot 编辑器中运行游戏
# 打开 GodUI，选择角色
# 打开 "Agent 绑定" 标签页
# 点击"刷新"按钮，验证 Agent 列表加载
# 选择一个 Agent，点击"绑定"，验证绑定成功
```

### 2. 任务配置测试

```bash
# 在 Godot 游戏中：
# 1. 选择已绑定 Agent 的角色
# 2. 打开 "任务配置" 标签页
# 3. 输入任务描述："搜索项目中的 TODO"
# 4. 输入项目路径："/Users/kp/项目/Proj/claude_manager"
# 5. 设置优先级：8
# 6. 勾选"自动执行"
# 7. 点击"添加任务"
# 8. 验证任务出现在列表中
```

### 3. 键盘控制测试

```bash
# 在 Godot 游戏中：
# 1. 选择一个角色
# 2. 使用 WASD 或方向键移动角色
# 3. 验证角色可以前后左右移动
# 4. 验证移动流畅，没有卡顿
```

### 4. 电脑检测测试

```bash
# 在 Godot 游戏中：
# 1. 选择一个已配置任务的角色
# 2. 移动角色靠近电脑桌
# 3. 验证出现提示气泡："按 E 开始工作"
# 4. 移动角色远离电脑
# 5. 验证提示气泡消失
```

### 5. 工作流程测试

```bash
# 完整流程测试：
# 1. 启动后端服务
# 2. 运行 Godot 游戏
# 3. 创建角色 "TestWorker"
# 4. 绑定 Agent "Explore"
# 5. 配置任务 "搜索项目中的 TODO"
# 6. 移动角色到电脑前
# 7. 按 E 键开始工作
# 8. 验证角色坐下
# 9. 验证工作进度气泡显示
# 10. 验证实时进度更新
# 11. 等待任务完成
# 12. 验证完成气泡显示
# 13. 验证角色自动站起来
# 14. 检查后端日志确认执行记录
```

## 已知问题

1. **WebSocket 端口**: 当前硬编码为 38080，需要与后端配置一致
2. **错误处理**: API 调用失败时的用户提示需要优化
3. **任务队列**: 当前只支持执行第一个任务，多任务队列待实现

## 后续优化

1. **错误提示**: 添加 Notification 组件显示 API 错误
2. **任务队列**: 支持多任务顺序执行
3. **工作历史**: 记录和显示工作历史
4. **性能优化**: 优化 WebSocket 连接管理
5. **UI 优化**: 改进工作提示气泡的样式和动画

## 相关文档

- [Godot Agent 绑定测试](./20260316-godot-agent-binding-test.md)
- [Godot Agent 绑定实现](./20260316-godot-agent-binding-implementation.md)
- [Microverse 全屏模式](./20260316-microverse-fullscreen-mode.md)
