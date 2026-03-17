# Microverse 缓存调试指南

**创建日期**: 2026-03-16
**状态**: 调试中

## 问题描述

Microverse 游戏模式页面缓存优化后，仍然出现每次进入都重新加载的问题。

## 已实施的优化

### 1. Layout.tsx 修改

- 在 layout 中始终渲染 Microverse 组件
- 使用 CSS `hidden` 类控制显示/隐藏（而非 `display: none`）
- 添加 `key="microverse-cached"` 确保组件实例不变

```tsx
<div className={`${isMicroverse ? '' : 'hidden'} h-full`}>
  <Microverse key="microverse-cached" />
</div>
```

### 2. Microverse.tsx 修改

- 使用全局变量 `gameHasLoaded` 记录加载状态（跨组件实例保持）
- 初始状态根据 `gameHasLoaded` 设置：`useState(!gameHasLoaded)`
- 将 iframe 的 inline style 改为 className，避免每次渲染创建新对象
- 添加调试日志，监控组件挂载/卸载和状态变化

## 调试步骤

### 1. 打开浏览器控制台

1. 启动应用：`./start.sh`
2. 打开浏览器访问：`http://localhost:5173`
3. 打开开发者工具（F12）-> Console 标签

### 2. 观察日志输出

**首次进入游戏模式**：
```
[Microverse] 组件挂载，gameHasLoaded = false
[Microverse] isLoading 变化: true
[Microverse] iframe 加载完成，等待游戏初始化
[Microverse] 游戏加载完成，gameHasLoaded = true
[Microverse] isLoading 变化: false
```

**切换到其他页面**：
- 应该**没有**"组件卸载"日志（说明组件未被卸载）

**再次进入游戏模式**：
```
[Microverse] isLoading 变化: false
[Microverse] iframe 加载完成，游戏已缓存
```

- 应该**没有**"组件挂载"日志（说明组件未重新挂载）
- 应该**没有**加载动画

### 3. 检查 Network 请求

1. 打开开发者工具 -> Network 标签
2. 第一次进入游戏模式，观察请求：
   - 应该有 `/microverse/index.html` 请求
   - 应该有 `.wasm`、`.pck` 等游戏资源请求
3. 切换到其他页面，再次进入游戏模式
4. 观察请求：
   - **不应该有**任何游戏资源的请求
   - 可能有 `index.html` 的 304 缓存请求

### 4. 检查 DOM 结构

1. 打开开发者工具 -> Elements 标签
2. 进入游戏模式，找到 iframe 元素
3. 记录 iframe 的内存地址或添加一个自定义属性：
   ```js
   // 在控制台执行
   document.querySelector('iframe[title="Microverse Game"]').dataset.test = 'cached-iframe';
   ```
4. 切换到其他页面
5. 检查 iframe 是否仍在 DOM 中（应该在，但被 `hidden` 类隐藏）
6. 再次进入游戏模式
7. 检查 iframe 的 `data-test` 属性是否还在（应该在，说明是同一个 iframe）

## 可能的问题和解决方案

### 问题 1：组件仍然被卸载

**症状**：
- 控制台显示"组件卸载"日志
- 再次进入时显示"组件挂载，gameHasLoaded = false"

**原因**：
- Layout 组件可能被重新渲染
- React Router 可能强制卸载了组件

**解决方案**：
- 检查 Layout 组件是否有 key 变化
- 检查是否有其他地方触发了 Layout 的重新挂载

### 问题 2：iframe 被重新创建

**症状**：
- 控制台显示"iframe 加载完成，等待游戏初始化"
- Network 标签显示游戏资源重新下载

**原因**：
- iframe 的 props 变化导致 React 重新创建 iframe
- iframe 的 src 属性变化

**解决方案**：
- 确保 iframe 的所有 props 都是稳定的（使用 className 而非 style）
- 确保 src 属性不变

### 问题 3：gameHasLoaded 被重置

**症状**：
- 控制台显示"组件挂载，gameHasLoaded = false"（但应该是 true）

**原因**：
- 模块热更新（HMR）导致全局变量重置
- 页面刷新

**解决方案**：
- 使用 localStorage 代替全局变量
- 在生产环境测试（无 HMR）

### 问题 4：加载状态未正确更新

**症状**：
- 游戏已加载，但 `isLoading` 仍为 true
- 加载动画一直显示

**原因**：
- `gameHasLoaded` 未正确设置
- `setIsLoading(false)` 未被调用

**解决方案**：
- 检查 `handleIframeLoad` 是否被调用
- 检查 `gameHasLoaded` 的值

## 下一步优化

### 1. 使用 localStorage 持久化加载状态

```tsx
// 替换全局变量
const GAME_LOADED_KEY = 'microverse_game_loaded';

const getGameLoadedState = () => {
  return localStorage.getItem(GAME_LOADED_KEY) === 'true';
};

const setGameLoadedState = (loaded: boolean) => {
  localStorage.setItem(GAME_LOADED_KEY, loaded ? 'true' : 'false');
};
```

### 2. 添加"重启游戏"功能

```tsx
const resetGame = () => {
  gameHasLoaded = false;
  localStorage.removeItem(GAME_LOADED_KEY);
  window.location.reload();
};
```

### 3. 添加游戏暂停/恢复

```tsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (iframeRef.current?.contentWindow) {
      const message = document.hidden
        ? { type: 'PAUSE_GAME' }
        : { type: 'RESUME_GAME' };
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

## 测试清单

- [ ] 首次进入游戏模式，游戏正常加载
- [ ] 切换到其他页面，组件未卸载
- [ ] 再次进入游戏模式，无加载动画
- [ ] 再次进入游戏模式，无网络请求
- [ ] 游戏状态保持（角色位置等）
- [ ] iframe 是同一个实例（通过 data-test 验证）
- [ ] 刷新页面后，缓存失效，重新加载
- [ ] 开发模式下 HMR 不影响缓存

## 相关文件

- `frontend/src/app/components/layout.tsx` - Layout 组件
- `frontend/src/app/pages/Microverse.tsx` - Microverse 组件
- `frontend/src/app/App.tsx` - 路由配置
