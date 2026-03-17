# Godot Agent Runtime 快速启动指南

## 前置条件

1. **后端服务运行**:
   ```bash
   cd /Users/kp/项目/Proj/claude_manager
   ./start.sh
   ```
   确保后端运行在 `http://localhost:8000`

2. **Godot 项目配置**:
   - 打开 Godot 编辑器
   - 加载 `microverse` 项目
   - 确认 `MicroverseAPIClient` 已配置为 AutoLoad

## 配置 AutoLoad

如果尚未配置，请按以下步骤操作：

1. 在 Godot 编辑器中，点击 **项目 → 项目设置**
2. 选择 **AutoLoad** 标签
3. 添加新的 AutoLoad：
   - **节点名称**: `MicroverseAPIClient`
   - **路径**: `res://script/api/MicroverseAPIClient.gd`
   - **启用**: ✅
4. 点击 **添加**，然后 **关闭**

## 运行测试场景

### 方法 1: 直接运行测试场景

1. 在 Godot 编辑器中打开场景：
   ```
   microverse/scene/AgentRuntimeTest.tscn
   ```

2. 按 `F5` 或点击 **运行当前场景**

3. 使用测试 UI：
   - 点击 **"打开对话框 (D)"** 或按 `D` 键
   - 点击 **"打开监控面板 (M)"** 或按 `M` 键
   - 点击 **"启动测试任务 (S)"** 或按 `S` 键
   - 按 `ESC` 关闭所有面板

### 方法 2: 集成到现有场景

在你的场景脚本中添加：

```gdscript
extends Node2D

var dialog_system
var monitor_panel
var control_panel

func _ready():
    # 实例化组件
    dialog_system = preload("res://scene/ui/AgentDialogSystem.tscn").instantiate()
    monitor_panel = preload("res://scene/ui/TaskMonitorPanel.tscn").instantiate()
    control_panel = preload("res://scene/ui/TaskControlPanel.tscn").instantiate()

    # 添加到场景
    add_child(dialog_system)
    add_child(monitor_panel)
    add_child(control_panel)

    # 连接信号
    dialog_system.response_received.connect(_on_response)
    monitor_panel.task_completed.connect(_on_task_completed)

func _on_response(response: String):
    print("Agent 回复: ", response)

func _on_task_completed(execution_id: int, status: String):
    print("任务完成: ", execution_id, " 状态: ", status)
```

## 测试功能

### 1. 测试对话系统

```gdscript
# 打开对话框
dialog_system.open_dialog("Alice")

# 对话框会自动创建会话并显示
# 用户可以输入消息并接收 Agent 回复
```

### 2. 测试任务监控

```gdscript
# 启动任务
var api_client = get_node("/root/MicroverseAPIClient")
var result = await api_client.start_character_work(
    "Alice",
    "实现登录功能",
    "/path/to/project"
)

if result.success:
    var execution_id = result.data.get("execution_id")

    # 添加到监控面板
    monitor_panel.add_task(execution_id, "Alice", "实现登录功能")

    # 打开监控面板
    monitor_panel.open_monitor()
```

### 3. 测试任务控制

```gdscript
# 设置当前执行
control_panel.set_execution(execution_id, "running")

# 监听控制事件
control_panel.stop_requested.connect(func():
    print("用户请求停止任务")
)
```

## 快捷键

在测试场景中可用的快捷键：

| 快捷键 | 功能 |
|--------|------|
| `D` | 打开对话框 |
| `M` | 打开监控面板 |
| `S` | 启动测试任务 |
| `ESC` | 关闭所有面板 |

## 故障排查

### 问题 1: "找不到 MicroverseAPIClient"

**解决方案**:
- 确认 AutoLoad 已正确配置
- 重启 Godot 编辑器

### 问题 2: "连接失败"

**解决方案**:
- 确认后端服务正在运行
- 检查端口 8000 是否被占用
- 查看后端日志: `tail -f backend/logs/app.log`

### 问题 3: "WebSocket 连接失败"

**解决方案**:
- 确认后端支持 WebSocket
- 检查防火墙设置
- 查看浏览器控制台错误

### 问题 4: "字体显示异常"

**解决方案**:
- 确认字体文件存在: `microverse/asset/fonts/fusion-pixel-12px-proportional-zh_hans.otf`
- 重新导入字体资源

## 调试技巧

### 启用详细日志

在脚本开头添加：

```gdscript
func _ready():
    # 启用详细日志
    print("[DEBUG] 组件已加载")
```

### 查看 API 请求

MicroverseAPIClient 会自动打印所有 API 请求：

```
[MicroverseAPIClient] POST http://localhost:8000/api/microverse/conversations
[MicroverseAPIClient] Body: {"character_name":"Alice","context":{}}
```

### 查看 WebSocket 消息

TaskMonitorPanel 会打印所有 WebSocket 消息：

```
[TaskMonitorPanel] 连接 WebSocket: ws://localhost:8000/api/microverse/characters/Alice/work-ws
[TaskMonitorPanel] WebSocket 已连接: Alice
[TaskMonitorPanel] 状态更新: running PID: 12345
```

## 下一步

1. **集成到主游戏**: 将组件集成到 Office 场景
2. **实现询问响应**: 添加询问对话框 UI
3. **后台运行系统**: 实现后台任务管理器
4. **性能优化**: 优化 WebSocket 和 UI 渲染

## 参考文档

- [集成指南](godot-frontend-integration-guide.md)
- [实现报告](godot-frontend-implementation-report.md)
- [架构设计](../plans/godot-agent-runtime-architecture.md)

---

**最后更新**: 2026-03-17
**维护者**: godot-frontend-developer
