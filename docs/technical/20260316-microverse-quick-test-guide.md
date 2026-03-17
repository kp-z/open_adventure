# Microverse 交互优化 - 快速测试指南

## 已完成的自动集成 ✅

我已经自动完成了以下集成：

1. **添加 CharacterWorkController 节点** ✅
   - 已在 Office.tscn 场景中添加
   - 脚本路径: `res://script/CharacterWorkController.gd`

2. **所有代码文件已创建** ✅
   - QuickTaskInputDialog.gd/.tscn
   - CharacterConfigDialog.gd/.tscn
   - CharacterWorkController.gd
   - CharacterManager.gd (已增强)
   - CharacterController.gd (已增强)

## 需要在 Godot 编辑器中完成的步骤

由于 Office 场景中的桌子是用 TileMap 绘制的（不是独立的 Desk 节点），你需要：

### 方案 1: 添加 Desk 节点（推荐）

1. **打开 Godot 编辑器**
2. **打开 Office.tscn 场景**
3. **添加 Desk 实例**:
   - 在场景树中右键点击根节点 "Office"
   - 选择 "Instantiate Child Scene"
   - 选择 `scene/prefab/Desk.tscn`
   - 重命名为 "Desk1"（或其他名称）
   - 在 Inspector 中设置:
     - `is_computer = true`
     - `chair_path` = 指向附近的椅子节点路径
   - 在 Node 标签中，添加到 "desks" 组
   - 重复此步骤，为每个工位添加 Desk 节点

### 方案 2: 直接测试（简化版）

如果你想快速测试，可以暂时跳过 Desk 节点配置：

1. **修改 CharacterConfigDialog.gd**:
   - 注释掉 `move_to_computer()` 方法中查找 Desk 的代码
   - 直接让角色移动到固定位置

2. **测试点击角色功能**:
   - 访问 `http://localhost:38080/microverse`
   - 点击任意角色
   - 应该会弹出配置对话框

## 当前可以测试的功能

即使没有配置 Desk 节点，以下功能也可以测试：

### 1. 点击角色弹出配置对话框 ✅
- 访问: `http://localhost:38080/microverse`
- 点击任意角色
- 应该弹出配置对话框，显示在角色上方

### 2. Agent 绑定功能 ✅
- 在配置对话框中选择 Agent
- 点击"绑定"按钮
- 刷新页面，验证绑定信息是否保留

### 3. 绑定信息持久化 ✅
- 绑定 Agent 后刷新页面
- 再次点击角色
- 配置对话框应该显示已绑定的 Agent

### 4. 快速任务配置 ✅
- 点击"配置任务"按钮
- 应该弹出任务输入对话框
- 输入任务描述后点击确认

## 完整功能测试（需要 Desk 节点）

以下功能需要先配置 Desk 节点才能测试：

- ⏳ 移动到电脑工作
- ⏳ 自动工作触发
- ⏳ 无任务时弹出输入对话框

## 快速验证命令

```bash
# 1. 确认后端服务运行
curl http://localhost:38080/api/health

# 2. 确认 Microverse 页面可访问
curl http://localhost:38080/microverse | head -20

# 3. 确认新文件已创建
ls -la microverse/script/ui/CharacterConfigDialog.gd
ls -la microverse/script/ui/QuickTaskInputDialog.gd
ls -la microverse/script/CharacterWorkController.gd

# 4. 确认场景文件已修改
grep "CharacterWorkController" microverse/scene/maps/Office.tscn
```

## 测试步骤

1. **打开浏览器**:
   ```
   http://localhost:38080/microverse
   ```

2. **等待游戏加载完成**

3. **点击任意角色**:
   - 应该弹出配置对话框
   - 对话框显示在角色上方
   - 显示角色名称和绑定状态

4. **测试 Agent 绑定**:
   - 点击"刷新"按钮加载 Agent 列表
   - 选择一个 Agent
   - 点击"绑定"按钮
   - 查看状态提示

5. **刷新页面验证持久化**:
   - 刷新浏览器页面
   - 再次点击同一个角色
   - 验证绑定信息是否保留

## 如果遇到问题

### 对话框没有弹出
- 打开浏览器控制台（F12）
- 查看是否有 JavaScript 错误
- 检查 Godot 控制台是否有错误信息

### Agent 列表为空
- 确认后端服务正常运行
- 访问 `http://localhost:38080/api/agents` 查看 API 是否返回数据
- 检查浏览器控制台的网络请求

### 绑定失败
- 检查后端日志
- 确认数据库连接正常
- 查看浏览器控制台的错误信息

## 下一步

完成基本功能测试后，可以：

1. 在 Godot 编辑器中添加 Desk 节点
2. 配置 Desk 的 `is_computer` 和 `chair_path` 属性
3. 测试完整的移动到电脑和自动工作功能

## 文件位置

- 配置对话框: `microverse/script/ui/CharacterConfigDialog.gd`
- 任务输入对话框: `microverse/script/ui/QuickTaskInputDialog.gd`
- 工作控制器: `microverse/script/CharacterWorkController.gd`
- 场景文件: `microverse/scene/maps/Office.tscn`
- 备份文件: `microverse/scene/maps/Office.tscn.backup`
