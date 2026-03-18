# 对话气泡修复验证指南

## 快速验证步骤

### 1. 刷新浏览器
- 打开 Microverse 游戏页面
- 按 `Ctrl+Shift+R`（macOS: `Cmd+Shift+R`）强制刷新，清除缓存
- 等待游戏加载完成

### 2. 触发对话气泡
有两种方式可以触发对话气泡：

#### 方式 1：未绑定 Agent 的角色
1. 在游戏中选中一个**未绑定 Agent** 的角色（点击角色）
2. 按 `Shift+Q` 键
3. 应该显示提示气泡：
   ```
   ⚠️ 该角色尚未绑定 Agent，请按 Shift+S 进行配置
   ```

#### 方式 2：已绑定 Agent 的角色
1. 在游戏中选中一个**已绑定 Agent** 的角色
2. 按 `Shift+Q` 键
3. 应该显示对话气泡（内容取决于 Agent 的回复）

### 3. 检查显示效果

对话气泡应该具有以下特征：

✅ **背景**：
- 深灰色半透明背景（rgba(40,40,50,0.9)）
- 圆角矩形（圆角半径 8 像素）
- 可见且不透明

✅ **边框**：
- 浅灰色边框（rgba(200,200,220,1)）
- 边框宽度 2 像素
- 清晰可见

✅ **文本**：
- 白色字体
- 清晰可读
- 居中对齐

✅ **位置**：
- 定位在角色正上方
- 水平居中对齐角色
- 不遮挡角色

✅ **动画**：
- 显示后 5 秒自动消失
- 消失时平滑淡出

## 预期效果对比

### 修复前
- 对话气泡背景完全透明或空白
- 只能看到文本，没有背景
- 文本可能难以阅读（取决于背景颜色）

### 修复后
- 对话气泡有明显的深灰色背景
- 浅灰色边框清晰可见
- 文本在深色背景上清晰可读
- 整体视觉效果良好

## 故障排查

### 问题 1：对话气泡仍然是空白的
**可能原因**：
- 浏览器缓存未清除
- Godot 项目未重新导出
- 前端未重新编译

**解决方案**：
1. 强制刷新浏览器（Ctrl+Shift+R）
2. 检查 `frontend/public/microverse/index.pck` 文件的修改时间
3. 如果文件时间不是最新的，重新执行同步和编译：
   ```bash
   cd microverse && ./export.sh
   rsync -av --delete microverse/export/ frontend/public/microverse/
   cd frontend && npm run build
   ```

### 问题 2：对话气泡位置不正确
**可能原因**：
- 角色位置计算错误
- 气泡大小计算错误

**解决方案**：
- 检查 `microverse/script/ui/DialogBubble.gd` 中的位置计算逻辑
- 查看浏览器控制台是否有错误信息

### 问题 3：对话气泡不显示
**可能原因**：
- 角色未正确选中
- 快捷键冲突
- DialogBubble 脚本错误

**解决方案**：
1. 确认角色已选中（角色周围应该有选中标记）
2. 检查浏览器控制台是否有 JavaScript 错误
3. 查看 Godot 导出日志是否有错误

## 技术细节

### 新背景图片信息
- **文件路径**: `microverse/asset/ui/dialog_bubble_bg.png`
- **尺寸**: 180x104 像素
- **格式**: PNG（RGBA）
- **文件大小**: 2.0KB（修复前：409 字节）
- **背景色**: rgba(40,40,50,0.9)
- **边框色**: rgba(200,200,220,1)
- **圆角半径**: 8 像素

### 相关文件
- `microverse/script/ui/DialogBubble.gd` - 对话气泡脚本
- `microverse/scene/ui/DialogBubble.tscn` - 对话气泡场景
- `microverse/asset/ui/dialog_bubble_bg.png` - 背景图片
- `frontend/public/microverse/index.pck` - Godot 导出的资源包

## 参考文档
- [对话气泡资源修复](../technical/20260318-02-对话气泡资源修复.md) - 完整的修复过程和技术细节
