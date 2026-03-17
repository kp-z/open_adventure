# Microverse 游戏模式交互优化 - 集成指南

## 已完成的组件

### 1. 快速任务输入对话框
- **文件**: `microverse/script/ui/QuickTaskInputDialog.gd` 和 `.tscn`
- **功能**: 简洁的任务输入界面，支持任务描述和项目路径输入

### 2. 角色配置对话框
- **文件**: `microverse/script/ui/CharacterConfigDialog.gd` 和 `.tscn`
- **功能**:
  - 显示角色信息和当前绑定的 Agent
  - Agent 选择和绑定/解绑
  - 移动到电脑工作按钮
  - 快速任务配置按钮

### 3. CharacterManager 增强
- **文件**: `microverse/script/CharacterManager.gd`
- **新增功能**:
  - 点击角色弹出配置对话框
  - 绑定信息持久化（场景加载时自动获取）
  - 移动到电脑和任务配置的信号处理

### 4. CharacterController 增强
- **文件**: `microverse/script/CharacterController.gd`
- **新增功能**:
  - `move_to_computer()`: 移动到最近的电脑
  - `set_task()`: 设置任务
  - `start_work_at_computer()`: 在电脑前开始工作
  - `bound_agent_id`: 缓存绑定的 Agent ID

### 5. 角色工作控制器
- **文件**: `microverse/script/CharacterWorkController.gd`
- **功能**:
  - 监听角色进入电脑区域
  - 自动检查任务并开始工作
  - 无任务时弹出输入对话框

## 集成步骤

### 步骤 1: 确保 Desk 节点配置正确

在 `Office.tscn` 场景中，确保所有 Desk 节点：

1. **添加到 "desks" 组**:
   - 选中 Desk 节点
   - 在 Inspector 面板中找到 "Node" 标签
   - 点击 "Groups" 按钮
   - 添加 "desks" 组

2. **设置 is_computer 属性**:
   - 对于电脑桌，勾选 `is_computer` 属性
   - 设置 `chair_path` 指向关联的椅子节点

3. **检测区域已自动创建**:
   - Desk.gd 的 `_ready()` 方法会自动创建检测区域
   - 无需手动添加

### 步骤 2: 添加 CharacterWorkController 到场景

在 `Office.tscn` 场景中：

1. 添加一个新的 Node 节点
2. 命名为 "CharacterWorkController"
3. 附加脚本: `res://script/CharacterWorkController.gd`

或者在场景文件中添加：

```gdscript
[node name="CharacterWorkController" type="Node" parent="."]
script = ExtResource("path_to_CharacterWorkController.gd")
```

### 步骤 3: 验证 CharacterManager 配置

确保 `CharacterManager` 节点已经存在于场景中，并且：

1. 脚本路径正确: `res://script/CharacterManager.gd`
2. 节点名称为 "CharacterManager"

### 步骤 4: 测试功能

1. **启动后端服务**:
   ```bash
   cd /Users/kp/项目/Proj/claude_manager
   ./start.sh
   ```

2. **访问游戏页面**:
   - 打开浏览器访问: `http://localhost:38080/microverse`

3. **测试点击角色**:
   - 点击任意角色，应该弹出配置对话框
   - 对话框显示在角色上方

4. **测试 Agent 绑定**:
   - 在配置对话框中选择 Agent
   - 点击"绑定"按钮
   - 刷新页面，验证绑定信息是否保留

5. **测试移动到电脑**:
   - 点击"移动到电脑工作"按钮
   - 角色应该自动寻路到最近的电脑

6. **测试自动工作**:
   - 配置任务后，手动移动角色到电脑附近
   - 角色应该自动坐下并开始工作

7. **测试任务输入**:
   - 移动角色到电脑附近（无任务）
   - 应该弹出任务输入对话框

## 已知问题和注意事项

### 1. 场景文件路径
- 对话框场景文件使用相对路径: `res://script/ui/CharacterConfigDialog.tscn`
- 如果场景文件位置不同，需要修改 CharacterManager.gd 中的路径

### 2. Desk 组配置
- 必须手动将 Desk 节点添加到 "desks" 组
- 否则 `move_to_computer()` 无法找到电脑

### 3. WebSocket 连接
- 工作状态实时更新依赖 WebSocket 连接
- 确保后端 WebSocket 服务正常运行

### 4. 对话框位置
- 对话框会尝试显示在角色上方
- 如果角色在屏幕边缘，对话框会自动调整位置

## 后续优化建议

1. **多角色并发工作**:
   - 当前实现已支持多角色独立工作
   - 每个角色有独立的 WebSocket 连接和工作状态

2. **电脑占用状态**:
   - 可以在 Desk.gd 中添加占用状态显示
   - 显示哪个角色正在使用电脑

3. **任务队列**:
   - 支持为角色配置多个任务
   - 完成一个任务后自动开始下一个

4. **工作进度可视化**:
   - 增强 WorkProgressBubble 的显示效果
   - 添加进度条、状态图标等

5. **快捷键支持**:
   - 添加键盘快捷键（如 E 键开始工作）
   - ESC 键关闭对话框

## 文件清单

### 新增文件
- `microverse/script/ui/QuickTaskInputDialog.gd`
- `microverse/script/ui/QuickTaskInputDialog.tscn`
- `microverse/script/ui/CharacterConfigDialog.gd`
- `microverse/script/ui/CharacterConfigDialog.tscn`
- `microverse/script/CharacterWorkController.gd`

### 修改文件
- `microverse/script/CharacterManager.gd`
- `microverse/script/CharacterController.gd`

### 需要手动修改的文件
- `microverse/scene/maps/Office.tscn` (添加 CharacterWorkController 节点，配置 Desk 组)
