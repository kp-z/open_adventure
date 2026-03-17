# Microverse 版本检查功能实现

**创建日期**: 2026-03-16
**作者**: Claude Opus 4.6
**状态**: 已完成

## 概述

在 Microverse 页面实现了版本检查机制，当游戏文件更新时自动提示用户刷新页面。

## 实现细节

### 1. 版本信息来源

版本信息从 `/microverse/version.json` 读取，该文件由 Godot 导出时自动生成，包含：

```json
{
  "exportTime": "2026-03-16T11:19:54Z",
  "gitCommit": "164f701",
  "files": [
    {"path": "index.wasm", "size": 37685705},
    {"path": "index.pck", "size": 8432672},
    ...
  ]
}
```

### 2. 版本检查逻辑

- **首次访问**: 读取 version.json，将 `exportTime` 存储到 localStorage
- **后续访问**: 每次加载页面时比对 localStorage 中的版本和当前版本
- **版本不匹配**: 显示更新提示对话框，清除游戏缓存标记

### 3. UI 组件

使用 Material-UI 的 Dialog 组件实现更新提示：

- **标题**: 🎮 游戏版本更新
- **内容**: 显示更新说明和版本号
- **操作按钮**:
  - "稍后提醒": 更新版本号，关闭对话框
  - "立即刷新": 清除缓存并刷新页面

### 4. 缓存策略

- **版本缓存**: `localStorage.microverse_version` 存储当前版本的 exportTime
- **游戏缓存**: `localStorage.microverse_game_loaded` 标记游戏是否已加载
- **版本不匹配时**: 自动清除游戏缓存，强制重新加载游戏资源

## 测试方法

### 方法 1: 修改 localStorage

1. 打开浏览器开发者工具 (F12)
2. 进入 Console 标签
3. 执行以下命令修改版本号：
   ```javascript
   localStorage.setItem('microverse_version', '2026-01-01T00:00:00Z')
   ```
4. 刷新页面，应该看到版本更新提示对话框

### 方法 2: 修改 version.json

1. 编辑 `frontend/public/microverse/version.json`
2. 修改 `exportTime` 字段为新的时间戳
3. 刷新页面，应该看到版本更新提示对话框

### 方法 3: 清除缓存测试

1. 打开浏览器开发者工具 (F12)
2. 进入 Application 标签 → Local Storage
3. 删除 `microverse_version` 键
4. 刷新页面，应该正常加载游戏并存储新版本号

## 代码位置

- **前端组件**: `frontend/src/app/pages/Microverse.tsx`
- **版本文件**: `frontend/public/microverse/version.json`

## 注意事项

1. **开发环境**: 每次都会检查版本，确保开发时能及时发现更新
2. **生产环境**: 版本检查使用 `cache: 'no-cache'` 确保获取最新版本信息
3. **错误处理**: 如果 version.json 不存在，会静默跳过版本检查
4. **用户体验**: 提供"稍后提醒"选项，不强制用户立即刷新

## 未来改进

1. 可以在对话框中显示更详细的更新内容（需要在 version.json 中添加 message 字段）
2. 可以添加自动刷新倒计时功能
3. 可以记录用户选择"稍后提醒"的次数，多次忽略后强制刷新
