# UI 改进 - 删除返回按钮和添加页面缓存

**日期**: 2026-03-12

## 修改内容

### 1. 删除子页面返回按钮

删除了以下组件和页面中的返回按钮：

- `AgentEditor` 组件：删除 `onBack` prop 和返回按钮 UI
- `AgentTestPanel` 组件：删除 `onBack` prop 和返回按钮 UI
- `AgentCreatePage`：移除 `handleBack` 和 `onBack` prop
- `AgentEditPage`：移除 `handleBack` 和 `onBack` prop
- `AgentTestPage`：移除 `handleBack` 和 `onBack` prop

**原因**：用户可以通过侧边栏导航直接切换页面，不需要返回按钮。

### 2. 修复 ExecutionContext 错误处理

**问题**：前端启动时，如果后端未启动，会显示错误通知："恢复执行记录失败"

**修复**：
- 区分网络连接错误（后端未启动）和真正的错误
- 网络连接错误时静默失败，只在控制台输出日志
- 只在真正的错误时显示通知

**代码位置**：`frontend/src/app/contexts/ExecutionContext.tsx`

```typescript
// 检查是否是网络连接错误（后端未启动）
const isNetworkError = error instanceof TypeError &&
  (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'));

// 只在非网络错误时显示通知
if (!isNetworkError && lastWsErrorRef.current !== 'restore_error') {
  addNotification({
    type: 'error',
    title: '恢复执行记录失败',
    message: '无法恢复活跃的 Terminal 执行记录，请刷新后重试。',
  });
  lastWsErrorRef.current = 'restore_error';
} else if (isNetworkError) {
  console.log('[ExecutionContext] Backend not available, skipping execution restore');
}
```

### 3. 页面缓存机制（准备中）

创建了 `usePageCache` hook (`frontend/src/app/hooks/usePageCache.ts`)，用于缓存页面数据：

**特性**：
- 5 分钟缓存时间
- 自动缓存和过期管理
- 支持手动刷新
- 防止重复请求

**使用方式**：
```typescript
import { usePageCache } from '@/app/hooks/usePageCache';

const { data, loading, error, refresh } = usePageCache(
  'dashboard-stats',
  async () => {
    const response = await dashboardApi.getStats();
    return response;
  },
  [] // dependencies
);
```

**下一步**：
- 在 Dashboard、Skills、Agents 页面中集成 `usePageCache`
- 测试缓存效果和性能提升

## 影响范围

- 前端组件：AgentEditor, AgentTestPanel, ExecutionContext
- 前端页面：AgentCreatePage, AgentEditPage, AgentTestPage
- 新增工具：usePageCache hook

## 测试

- ✅ 前端编译成功
- ✅ ExecutionContext 错误处理修复
- ⏳ 待测试：页面导航和缓存功能
