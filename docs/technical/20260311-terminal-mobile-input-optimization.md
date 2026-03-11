# Terminal 移动端输入框优化

**创建日期**: 2026-03-11
**状态**: 已完成

## 概述
优化 Terminal 页面的移动端输入体验，添加自动换行和全屏输入功能。

## 主要改进

### 1. 输入框改为 textarea
- 将单行 `<input>` 改为多行 `<textarea>`
- 支持文字自动换行，不会左右隐藏
- 自动调整高度（最小 44px，最大 120px）
- 保持原有的 Enter 键发送功能

### 2. 添加放大按钮
- 在发送按钮旁边添加放大图标按钮（Maximize2）
- 点击后打开全屏输入模态框
- 仅在移动端显示

### 3. 全屏输入模态框
- 占据整个屏幕，提供更大的输入空间
- 支持上下滚动查看长文本
- 顶部工具栏：显示标题和关闭按钮（Minimize2）
- 中间区域：可滚动的 textarea（最小高度 300px）
- 底部操作栏：显示快捷键提示和发送按钮
- 支持 Cmd/Ctrl + Enter 快捷键发送

## 技术实现

### 状态管理
```typescript
const [isFullscreenInput, setIsFullscreenInput] = useState(false);
const inputRef = useRef<HTMLTextAreaElement>(null);
```

### 自动调整高度
```typescript
onInput={(e) => {
  const target = e.target as HTMLTextAreaElement;
  target.style.height = 'auto';
  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
}}
```

### 全屏模态框样式
- `z-index: 9999` 确保在最上层
- `bg-slate-900/95 backdrop-blur-sm` 半透明背景
- `flex flex-col` 垂直布局
- `overflow-y-auto` 中间区域可滚动

## 用户体验提升

1. **更好的可见性**: 文字不再左右隐藏，可以看到完整内容
2. **更大的输入空间**: 全屏模式提供更舒适的输入体验
3. **灵活的输入方式**: 
   - 短文本：直接在底部输入框输入
   - 长文本：点击放大按钮，使用全屏模式
4. **保持原有交互**: Enter 键发送，快捷键工具栏等功能不受影响

## 兼容性
- 仅在移动端显示放大按钮和全屏模态框
- 桌面端保持原有体验
- 所有现有功能完全兼容

