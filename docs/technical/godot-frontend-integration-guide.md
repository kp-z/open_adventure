# Godot 游戏前端集成指南

**创建日期**: 2026-03-17
**文档版本**: v1.0

## 概述

本文档说明如何在 Godot Microverse 游戏中集成新的 Agent Runtime 前端组件。

## 已实现的组件

### 1. AgentDialogSystem (对话框系统)

**文件位置**:
- 脚本: `microverse/script/ui/AgentDialogSystem.gd`
- 场景: `microverse/scene/ui/AgentDialogSystem.tscn`

**功能**:
- 像素风格对话界面
- 多轮对话支持
- 消息历史显示
- 实时响应

**使用方法**:
```gdscript
# 在主场景中添加
var dialog_system = preload("res://scene/ui/AgentDialogSystem.tscn").instantiate()
add_child(dialog_system)

# 打开对话框
dialog_system.open_dialog("Alice")

# 监听响应
dialog_system.response_received.connect(func(response):
    print("Agent 回复: ", response)
)
```

### 2. TaskMonitorPanel (任务监控面板)

**文件位置**:
- 脚本: `microverse/script/ui/TaskMonitorPanel.gd`
- 场景: `microverse/scene/ui/TaskMonitorPanel.tscn`

**功能**:
- 任务列表显示
- 实时状态更新 (WebSocket)
- 进度条和日志输出
- 任务详情面板

**使用方法**:
```gdscript
# 在主场景中添加
var monitor_panel = preload("res://scene/ui/TaskMonitorPanel.tscn").instantiate()
add_child(monitor_panel)

# 打开监控面板
monitor_panel.open_monitor()

# 添加任务到监控
monitor_panel.add_task(execution_id, "Alice", "实现登录功能")

# 监听任务完成
monitor_panel.task_completed.connect(func(execution_id, status):
    print("任务完成: ", execution_id, " 状态: ", status)
)
```

### 3. TaskControlPanel (任务控制面板)

**文件位置**:
- 脚本: `microverse/script/ui/TaskControlPanel.gd`
- 场景: `microverse/scene/ui/TaskControlPanel.tscn`

**功能**:
- 启动/停止/暂停/恢复按钮
- 状态显示
- 自动按钮状态管理

**使用方法**:
```gdscript
# 在主场景中添加
var control_panel = preload("res://scene/ui/TaskControlPanel.tscn").instantiate()
add_child(control_panel)

# 设置当前执行
control_panel.set_execution(execution_id, "running")

# 监听控制事件
control_panel.stop_requested.connect(func():
    print("用户请求停止任务")
)
```

### 4. MicroverseAPIClient (扩展)

**文件位置**: `microverse/script/api/MicroverseAPIClient.gd`

**新增 API**:

#### 对话 API
- `create_conversation(character_name, context)` - 创建对话会话
- `send_message(session_id, message, context)` - 发送消息
- `get_conversation_history(session_id, offset, limit)` - 获取历史

#### 任务控制 API
- `pause_execution(execution_id)` - 暂停执行
- `resume_execution(execution_id)` - 恢复执行
- `stop_execution(execution_id)` - 停止执行
- `retry_execution(execution_id)` - 重试执行

#### 询问响应 API
- `answer_question(execution_id, question_id, answer)` - 提交答案

#### 会话持久化 API
- `save_session(session_id, session_data)` - 保存会话
- `restore_session(session_id)` - 恢复会话

## 集成示例

### 完整工作流示例

```gdscript
extends Node2D

var dialog_system
var monitor_panel
var control_panel
var api_client

func _ready():
    # 获取 API 客户端
    api_client = get_node("/root/MicroverseAPIClient")

    # 实例化 UI 组件
    dialog_system = preload("res://scene/ui/AgentDialogSystem.tscn").instantiate()
    monitor_panel = preload("res://scene/ui/TaskMonitorPanel.tscn").instantiate()
    control_panel = preload("res://scene/ui/TaskControlPanel.tscn").instantiate()

    add_child(dialog_system)
    add_child(monitor_panel)
    add_child(control_panel)

    # 连接信号
    _connect_signals()

func _connect_signals():
    # 对话系统
    dialog_system.response_received.connect(_on_dialog_response)

    # 监控面板
    monitor_panel.task_selected.connect(_on_task_selected)
    monitor_panel.task_completed.connect(_on_task_completed)

    # 控制面板
    control_panel.start_requested.connect(_on_start_task)
    control_panel.stop_requested.connect(_on_stop_task)

func start_agent_conversation(character_name: String):
    """开始与 Agent 对话"""
    dialog_system.open_dialog(character_name)

func start_agent_work(character_name: String, task_description: String):
    """启动 Agent 工作"""
    var result = await api_client.start_character_work(
        character_name,
        task_description,
        "/path/to/project"
    )

    if result.success:
        var execution_id = result.data.get("execution_id")

        # 添加到监控面板
        monitor_panel.add_task(execution_id, character_name, task_description)

        # 设置控制面板
        control_panel.set_execution(execution_id, "running")

        print("任务已启动: ", execution_id)
    else:
        print("启动任务失败: ", result.error)

func _on_dialog_response(response: String):
    """处理对话响应"""
    print("Agent 回复: ", response)

func _on_task_selected(execution_id: int):
    """任务被选中"""
    control_panel.set_execution(execution_id, "running")

func _on_task_completed(execution_id: int, status: String):
    """任务完成"""
    print("任务完成: ", execution_id, " 状态: ", status)
    control_panel.update_status(status)

func _on_start_task():
    """启动任务"""
    # 实现启动逻辑
    pass

func _on_stop_task():
    """停止任务"""
    # 已在 TaskControlPanel 中实现
    pass
```

## UI 样式说明

所有组件使用统一的像素风格：
- **字体**: `fusion-pixel-12px-proportional-zh_hans.otf`
- **字体大小**: 11-14px
- **UI 资源**: `microverse/asset/ui/` 目录下的像素图标

### 状态颜色规范

| 状态 | 颜色 | 图标 |
|------|------|------|
| idle | 灰色 (0.8, 0.8, 0.8) | ⏹ |
| pending | 灰色 (0.8, 0.8, 0.8) | ⏳ |
| running | 蓝色 (0.3, 0.8, 1.0) | 🔧 |
| succeeded | 绿色 (0.3, 1.0, 0.3) | ✅ |
| failed | 红色 (1.0, 0.3, 0.3) | ❌ |
| cancelled | 橙色 (0.8, 0.5, 0.3) | 🚫 |

## WebSocket 连接说明

### 连接地址
```
ws://localhost:8000/api/microverse/characters/{character_name}/work-ws
```

### 消息格式

**状态更新**:
```json
{
    "type": "status_update",
    "data": {
        "status": "running",
        "pid": 12345,
        "started_at": "2026-03-17T10:00:00",
        "cpu_percent": 15.5,
        "memory_mb": 128.0
    }
}
```

**日志输出**:
```json
{
    "type": "log",
    "message": "正在执行任务..."
}
```

**错误消息**:
```json
{
    "type": "error",
    "message": "连接失败"
}
```

## 注意事项

1. **自动重连**: TaskMonitorPanel 的 WebSocket 客户端支持自动重连（3秒延迟）
2. **资源清理**: 关闭面板时会自动断开所有 WebSocket 连接
3. **错误处理**: 所有 API 调用都返回 `{success: bool, data/error: ...}` 格式
4. **节点路径**: 确保 MicroverseAPIClient 已添加为 AutoLoad 单例

## 后续开发

### Phase 2: 询问响应系统
- 实现询问对话框 UI
- 集成 `answer_question` API
- 支持多种输入类型（文本、选择、确认）

### Phase 3: 后台运行系统
- 实现后台任务管理器
- 通知系统
- 会话持久化集成

### Phase 4: 性能优化
- WebSocket 消息批处理
- UI 渲染优化
- 内存管理优化

---

**文档作者**: godot-frontend-developer
**审核状态**: 待审核
