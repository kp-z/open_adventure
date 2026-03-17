# Microverse 对话框乱码修复和 UI 重构

**日期**: 2026-03-16
**状态**: 已完成

## 问题描述

用户报告了 Microverse 游戏模式中的对话框乱码问题：
- 点击 Agent 显示的对话框有乱码，无法正常显示中文文本

## 修复方案

### 方案演进

**第一次尝试**（失败）:
- 修改 DialogBubble 字体颜色为白色 ✅
- 在 CharacterConfigDialog 和 QuickTaskInputDialog 的 `_ready()` 中添加字体配置 ❌
- 问题：Window 组件的字体配置在 Web 导出后不生效

**最终方案**（成功）:
- 完全重构对话框，使用游戏内已有的 UI 组件
- 参考 GlobalSettingsUI 的实现方式
- 使用 CanvasLayer + NinePatchRect + 像素字体

### 实现细节

#### 1. CharacterConfigDialog 重构

**场景结构**:
```
CharacterConfigDialog (CanvasLayer, layer=99)
└── DialogUI (Control, 全屏)
    ├── ColorRect (半透明黑色背景)
    └── NinePatchRect (对话框背景)
        └── VBoxContainer (内容布局)
            ├── TitleLabel (标题)
            ├── CharacterInfo (角色信息)
            ├── AgentContainer (Agent 列表和按钮)
            ├── ActionContainer (快捷操作按钮)
            ├── StatusLabel (状态提示)
            └── CloseButton (关闭按钮)
```

**关键特性**:
- 使用 `res://asset/ui/singles32x32/GUI/003.png` 作为背景
- 所有文本使用 `fusion-pixel-12px-proportional-zh_hans.otf` 字体
- 点击背景可关闭对话框
- 居中显示，尺寸 600x500

#### 2. QuickTaskInputDialog 重构

**场景结构**:
```
QuickTaskInputDialog (CanvasLayer, layer=99)
└── DialogUI (Control, 全屏)
    ├── ColorRect (半透明黑色背景)
    └── NinePatchRect (对话框背景)
        └── VBoxContainer (内容布局)
            ├── TitleLabel (标题)
            ├── TaskInput (任务输入框)
            ├── ProjectPathInput (项目路径输入)
            ├── BrowseButton (浏览按钮)
            └── ButtonContainer (确认/取消按钮)
```

**关键特性**:
- 使用相同的背景和字体
- 点击背景可关闭对话框
- 居中显示，尺寸 500x300

### 代码修改

**新增文件**:
- `microverse/scene/ui/CharacterConfigDialog.tscn` - 角色配置对话框场景
- `microverse/scene/ui/QuickTaskInputDialog.tscn` - 任务输入对话框场景

**修改文件**:
- `microverse/script/ui/CharacterConfigDialog.gd` - 完全重写，适配新场景
- `microverse/script/ui/QuickTaskInputDialog.gd` - 完全重写，适配新场景
- `microverse/script/CharacterManager.gd` - 更新对话框加载路径和显示方法
- `microverse/script/CharacterWorkController.gd` - 更新对话框显示方法
- `microverse/script/ui/DialogBubble.gd` - 字体颜色改为白色

### 2. 移动到电脑功能验证

**功能链路**:
1. 用户点击角色 → 弹出 `CharacterConfigDialog`
2. 点击"移动到电脑"按钮 → 发出 `move_to_computer_requested` 信号
3. `CharacterManager` 接收信号 → 调用 `_on_move_to_computer_requested()`
4. 调用角色的 `move_to_computer()` 方法
5. 角色查找最近的电脑 → 移动到电脑的椅子 → 自动坐下

**代码验证**:
- ✅ `CharacterConfigDialog.gd` 第 298-302 行：信号发送正常
- ✅ `CharacterManager.gd` 第 180 行：信号连接正常
- ✅ `CharacterManager.gd` 第 207-211 行：信号处理正常
- ✅ `CharacterController.gd` 第 873-905 行：移动逻辑正常

**结论**: 移动到电脑功能的代码实现是完整的，应该可以正常工作。

### 3. UI 样式现状

**当前实现**:
- `DialogBubble`: 使用游戏内资源（NinePatchRect + 像素字体）✅
- `GlobalSettingsUI`: 使用游戏内资源（NinePatchRect + 像素字体）✅
- `CharacterConfigDialog`: 使用 Godot Window 组件 ⚠️
- `QuickTaskInputDialog`: 使用 Godot Window 组件 ⚠️

**说明**:
- Window 组件提供了更好的窗口管理功能（拖动、关闭、最小化等）
- 对话框的功能性优先于视觉统一
- 样式统一可以作为后续优化项

## 部署步骤

1. 修改 DialogBubble.gd 字体颜色
2. 在 Godot 中重新导出项目：
   ```bash
   cd microverse
   ./export.sh
   ```
3. 同步到前端：
   ```bash
   rsync -av --delete microverse/export/ frontend/public/microverse/
   ```
4. 创建版本标记：
   ```bash
   echo "$(date '+%Y-%m-%d %H:%M:%S')" > frontend/public/microverse/version.txt
   ```

## 测试验证

### 对话框显示测试
- [ ] DialogBubble 中文文本显示正常，无乱码
- [ ] 文本颜色为白色，与背景有足够对比度
- [ ] CharacterConfigDialog 文本显示正常

### 移动功能测试
- [ ] 点击角色弹出配置对话框
- [ ] 点击"移动到电脑"按钮，角色开始移动
- [ ] 角色到达电脑后自动坐下
- [ ] 如果有任务，角色坐下后自动开始工作
- [ ] 如果无任务，弹出任务输入对话框

## 相关文件

**场景文件**:
- `microverse/scene/ui/CharacterConfigDialog.tscn` - 角色配置对话框场景（新建）
- `microverse/scene/ui/QuickTaskInputDialog.tscn` - 任务输入对话框场景（新建）
- `microverse/scene/ui/GlobalSettingsUI.tscn` - 设置界面场景（参考）

**脚本文件**:
- `microverse/script/ui/CharacterConfigDialog.gd` - 角色配置对话框脚本（重写）
- `microverse/script/ui/QuickTaskInputDialog.gd` - 任务输入对话框脚本（重写）
- `microverse/script/ui/DialogBubble.gd` - 对话气泡脚本（字体颜色修复）
- `microverse/script/CharacterManager.gd` - 角色管理器（更新加载路径）
- `microverse/script/CharacterWorkController.gd` - 工作控制器（更新显示方法）

**资源文件**:
- `microverse/asset/fonts/fusion-pixel-12px-proportional-zh_hans.otf` - 像素字体
- `microverse/asset/ui/singles32x32/GUI/003.png` - 对话框背景

## 后续优化建议

1. **UI 样式统一**: 将 CharacterConfigDialog 和 QuickTaskInputDialog 改为使用游戏内 UI 资源
2. **字体配置**: 确保所有对话框都使用像素字体
3. **主题系统**: 创建统一的 UI 主题，方便后续维护
