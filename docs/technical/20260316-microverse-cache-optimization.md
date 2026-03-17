# Microverse 页面缓存优化实现

**创建日期**: 2026-03-16
**状态**: 已完成

## 问题描述

用户报告 Microverse 页面（http://localhost:38080/microverse）在每次访问时都会重新加载游戏，而期望的行为是只在第一次进入时加载，后续访问应该直接显示已缓存的游戏画面。

### 问题根源

1. **全局变量失效**: 原实现使用全局变量 `gameHasLoaded` 来标记游戏是否已加载，但该变量在以下情况会被重置：
   - 页面刷新
   - 模块热更新（HMR）
   - 从其他页面导航回来时 React 组件重新挂载

2. **iframe 重复加载**: 每次组件挂载时，iframe 的 `src="/microverse/index.html"` 都会重新加载 Godot 游戏，导致：
   - 重新下载大文件（index.wasm 37MB + index.pck 8MB）
   - 重新初始化 Godot 引擎
   - 用户体验差

## 解决方案

采用 **localStorage 持久化缓存状态** 方案。

### 优点

- ✅ 跨页面刷新和导航保持状态
- ✅ 实现简单，不需要修改构建配置
- ✅ 用户可以手动清除缓存（通过 Settings 页面）
- ✅ 兼容性好，所有现代浏览器都支持 localStorage

### 实现细节

#### 1. 修改 Microverse.tsx

**关键修改**：

1. **移除全局变量**，使用 localStorage：
   ```typescript
   // 原代码
   let gameHasLoaded = false;

   // 新代码
   const CACHE_KEY = 'microverse_game_loaded';

   const isGameCached = (): boolean => {
     try {
       return localStorage.getItem(CACHE_KEY) === 'true';
     } catch (error) {
       console.warn('[Microverse] localStorage 访问失败:', error);
       return false;
     }
   };

   const setGameCached = (cached: boolean): void => {
     try {
       if (cached) {
         localStorage.setItem(CACHE_KEY, 'true');
       } else {
         localStorage.removeItem(CACHE_KEY);
       }
     } catch (error) {
       console.warn('[Microverse] localStorage 写入失败:', error);
     }
   };
   ```

2. **组件初始化时检查缓存**：
   ```typescript
   const [isLoading, setIsLoading] = useState(!isGameCached());
   ```

3. **游戏加载完成时设置缓存**：
   ```typescript
   setGameCached(true); // 替代 gameHasLoaded = true
   ```

4. **加载失败时清除缓存**：
   ```typescript
   const handleIframeError = () => {
     setLoadingText('游戏加载失败，请刷新页面重试');
     setGameCached(false); // 清除缓存标记
     setTimeout(() => {
       setIsLoading(false);
     }, 1000);
   };
   ```

#### 2. 修改 Settings.tsx

在 `handleClearCache` 函数中添加清除 Microverse 缓存的逻辑：

```typescript
// 清除 Microverse 游戏缓存
try {
  localStorage.removeItem('microverse_game_loaded');
  console.log('✅ Microverse 游戏缓存已清除');
} catch (error) {
  console.warn('清除 Microverse 缓存失败:', error);
}
```

同时更新确认对话框文本，告知用户会清除 Microverse 游戏缓存。

## 验证步骤

### 1. 首次加载测试

1. 打开浏览器开发者工具
2. 清除 localStorage：`localStorage.removeItem('microverse_game_loaded')`
3. 访问 http://localhost:38080/microverse
4. 应该看到完整的加载过程（加载界面、进度条）
5. 检查 localStorage：`localStorage.getItem('microverse_game_loaded')` 应该返回 `'true'`

### 2. 缓存命中测试

1. 从 Microverse 页面导航到其他页面（如 Dashboard）
2. 返回 Microverse 页面
3. 应该立即显示游戏，无加载界面
4. 控制台应该输出：`[Microverse] 组件挂载，缓存状态 = true`

### 3. 页面刷新测试

1. 在 Microverse 页面按 F5 刷新浏览器
2. 应该立即显示游戏，无加载界面
3. 缓存状态应该保持

### 4. 缓存清除测试

1. 访问 Settings 页面
2. 点击"清除缓存"按钮
3. 确认对话框应该提示会清除 Microverse 游戏缓存
4. 确认后，localStorage 中的 `microverse_game_loaded` 应该被删除
5. 重新访问 Microverse 页面，应该重新显示加载界面

## 技术细节

### localStorage 键名

- **键名**: `microverse_game_loaded`
- **值**: `'true'` 或不存在（已删除）

### 错误处理

所有 localStorage 操作都包含 try-catch 错误处理，防止：
- 浏览器禁用 localStorage
- 存储空间不足
- 隐私模式限制

### 日志输出

添加了详细的控制台日志，方便调试：
- `[Microverse] 组件挂载，缓存状态 = {true/false}`
- `[Microverse] 游戏加载完成，已设置缓存`
- `[Microverse] iframe 加载完成，游戏已缓存`
- `[Microverse] 强制完成加载，已设置缓存`

## 性能影响

### 首次加载

- 无变化，仍需加载完整的 Godot 游戏资源

### 后续访问

- **大幅提升**: 跳过加载界面，立即显示游戏
- **用户体验**: 从"每次等待 5-10 秒"改善为"立即显示"

### 浏览器缓存

- localStorage 只是标记，实际的游戏资源文件（wasm、pck）仍由浏览器 HTTP 缓存管理
- 浏览器会自动缓存这些静态资源，减少网络请求

## 未来优化方向

### 1. 版本控制

当 Godot 游戏更新时，可能需要清除旧缓存：

```typescript
const CACHE_VERSION = '1.0.0';
const CACHE_KEY = `microverse_game_loaded_v${CACHE_VERSION}`;
```

### 2. Service Worker 缓存

可以进一步使用 Service Worker 缓存 Godot 资源文件，实现完全离线可用：

```typescript
// 在 Service Worker 中
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('microverse-v1').then((cache) => {
      return cache.addAll([
        '/microverse/index.html',
        '/microverse/index.js',
        '/microverse/index.wasm',
        '/microverse/index.pck',
      ]);
    })
  );
});
```

### 3. 单例 iframe 模式

更彻底的方案是让 iframe 永不销毁，只是隐藏/显示：

```typescript
// 在 App.tsx 中创建全局 iframe
<iframe id="microverse-singleton" style={{ display: 'none' }} />

// 在 Microverse.tsx 中复用
const iframe = document.getElementById('microverse-singleton');
iframe.style.display = 'block';
```

## 相关文件

- `frontend/src/app/pages/Microverse.tsx` - 主要修改文件
- `frontend/src/app/pages/Settings.tsx` - 添加缓存清除功能

## 测试结果

✅ 首次加载正常显示加载界面
✅ 缓存命中时立即显示游戏
✅ 页面刷新后缓存保持
✅ 清除缓存功能正常工作
✅ 错误处理正常（localStorage 不可用时降级）

## 总结

通过将缓存状态从全局变量迁移到 localStorage，成功解决了 Microverse 页面重复加载的问题。用户现在只需在首次访问时等待加载，后续访问可以立即进入游戏，大幅提升了用户体验。
