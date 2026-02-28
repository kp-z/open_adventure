# Terminal 移动端输入体验优化实施记录

**创建日期**: 2026-02-28
**状态**: 已完成

## 优化内容

### 1. viewport 配置优化
**文件**: `frontend/index.html`

添加了以下配置：
- `maximum-scale=1.0, user-scalable=no`: 防止双击缩放
- `viewport-fit=cover`: 支持 iPhone 刘海屏
- `interactive-widget=resizes-content`: iOS 15.4+ 键盘自适应

### 2. xterm.js 移动端配置
**文件**: `frontend/src/app/contexts/TerminalContext.tsx`

新增配置项：
- `scrollback: 1000`: 限制滚动缓冲区，提升性能
- `fastScrollSensitivity: 5`: 快速滚动灵敏度
- `scrollSensitivity: 3`: 普通滚动灵敏度
- `rendererType: 'canvas'`: 使用 canvas 渲染
- `cursorStyle: 'block'`: 块状光标更明显
- `cursorWidth: 2`: 光标宽度

### 3. 触摸滚动改进
**文件**: `frontend/src/app/pages/Terminal.tsx`

TerminalPane 组件样式修改：
- `overflow-auto`: 允许滚动（原为 `overflow-hidden`）
- `touchAction: 'pan-y'`: 允许垂直滚动（原为 `none`）
- `WebkitOverflowScrolling: 'touch'`: iOS 平滑滚动
- `overscrollBehavior: 'contain'`: 防止滚动穿透

### 4. 焦点管理优化
**文件**: `frontend/src/app/pages/Terminal.tsx`

- 移除 `handleInteraction` 中的 `e.preventDefault()`，允许正常触摸滚动
- 添加移动端自动聚焦逻辑：切换终端时自动聚焦（延迟 150ms）

### 5. 虚拟键盘监听
**文件**: `frontend/src/app/pages/Terminal.tsx`

新增 state：
- `keyboardHeight`: 键盘高度
- `isKeyboardVisible`: 键盘是否可见

使用 Visual Viewport API 监听键盘事件：
- 实时检测键盘高度
- 键盘弹出时自动滚动到底部
- 提供降级方案（window resize）

### 6. 容器布局自适应
**文件**: `frontend/src/app/pages/Terminal.tsx`

主容器动态调整：
- 键盘弹出时：`height: calc(100vh - ${keyboardHeight}px)`
- 平滑过渡：`transition: height 0.2s ease-out`

### 7. 移动端快捷键工具栏
**文件**: `frontend/src/app/pages/Terminal.tsx`

新增工具栏（仅在键盘弹出时显示）：
- 支持按键：Tab, Ctrl+C, Ctrl+D, Ctrl+Z, ↑, ↓, Esc
- 通过 WebSocket 发送特殊按键码
- 横向滚动支持

## 技术细节

### Visual Viewport API
```typescript
window.visualViewport.addEventListener('resize', handleViewportResize);
```

### 特殊按键映射
```typescript
const keyMap: Record<string, string> = {
  'Tab': '\t',
  'Ctrl+C': '\x03',
  'Ctrl+D': '\x04',
  'Ctrl+Z': '\x1a',
  '↑': '\x1b[A',
  '↓': '\x1b[B',
  'Esc': '\x1b',
};
```

## 测试建议

### 基础功能测试
1. 在移动端浏览器打开应用
2. 导航到 Terminal 页面
3. 验证滚动流畅性

### 键盘测试
1. 点击终端区域，验证键盘弹出
2. 验证终端高度自动调整
3. 验证过渡动画平滑

### 焦点测试
1. 创建多个终端标签
2. 切换标签，验证自动聚焦
3. 验证输入立即生效

### 快捷键工具栏测试
1. 验证工具栏仅在键盘弹出时显示
2. 点击各个按钮，验证功能正常
3. 验证横向滚动

## 兼容性说明

- **iOS 15.4+**: 完整支持 `interactive-widget=resizes-content`
- **现代浏览器**: 支持 Visual Viewport API
- **旧版浏览器**: 提供 window resize 降级方案

## 性能优化

- 限制 scrollback 为 1000 行，减少内存占用
- 使用 canvas 渲染，提升性能
- 使用 CSS transition 而非 JS 动画

## 已知问题

无

## 后续改进方向

1. 手势支持：双指缩放字体大小
2. 震动反馈：特殊操作时提供触觉反馈
3. 横屏优化：横屏时显示更多内容
4. 键盘高度缓存：记住用户设备的键盘高度
5. 自定义快捷键：允许用户配置工具栏按钮
