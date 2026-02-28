# Token 使用量水位线功能

## 功能说明
在 Dashboard 的 Claude CLI Status 卡片中，为可用的模型气泡添加水位线动画，以水位的形式展示当前 token 的消耗情况。

## 实现内容

### 1. 后端 API

#### TokenUsageService
- 文件：`backend/app/services/token_usage_service.py`
- 功能：从 `~/.claude/history.jsonl` 读取最新的 token 使用情况
- 解析格式：`Token usage: 121802/200000; 78198 remaining`

#### API 端点
- 路由：`GET /api/token-usage`
- 响应：
```json
{
  "used": 121802,
  "total": 200000,
  "remaining": 78198,
  "percentage": 60.90,
  "last_updated": "2026-02-28T00:00:00"
}
```

### 2. 前端组件

#### WaterLevel 组件
- 文件：`frontend/src/app/components/WaterLevel.tsx`
- 功能：圆形水位线动画组件
- Props：
  - `percentage`: 0-100 的百分比
  - `size`: 容器大小（默认 60px）

#### 特性
- **动画效果**：
  - 水位从底部逐渐上升
  - 双层波浪动画（3秒和4秒周期）
  - 平滑过渡效果（1秒）

- **颜色方案**：
  - 0-50%：绿色（充足）
  - 50-75%：黄色（中等）
  - 75-90%：橙色（较高）
  - 90-100%：红色（危险）

- **视觉元素**：
  - 圆形容器
  - 半透明背景
  - SVG 波浪路径动画
  - 中心指示点

### 3. Dashboard 集成

#### 修改内容
- 导入 `WaterLevel` 组件
- 添加 `tokenUsage` 状态
- 在 `fetchClaudeHealth` 中获取 token 使用情况
- 替换可用模型的气泡为水位线组件

#### 显示逻辑
```typescript
{isAvailable && tokenUsage ? (
  <WaterLevel percentage={tokenUsage.percentage} size={config.size} />
) : (
  // 原来的灰色气泡
)}
```

## 使用效果

### 移动端
- 气泡大小：24-42px
- 8个模型气泡分布在容器中
- 可用模型显示水位线动画
- 不可用模型显示灰色气泡

### 桌面端
- 气泡大小：28-55px
- 更大的显示空间
- 悬停时放大效果
- 水位线动画更明显

## 视觉示例

```
低使用率 (20%)：
┌─────────┐
│         │
│         │
│  Model  │
│░░░░░░░░░│ ← 绿色水位线
└─────────┘

中等使用率 (60%)：
┌─────────┐
│         │
│  Model  │
│░░░░░░░░░│ ← 黄色水位线
│░░░░░░░░░│
└─────────┘

高使用率 (90%)：
┌─────────┐
│░░░░░░░░░│ ← 红色水位线
│░░░░░░░░░│
│░░Model░░│
│░░░░░░░░░│
└─────────┘
```

## API 调用流程

1. **页面加载**
   - Dashboard 组件挂载
   - 调用 `fetchClaudeHealth()`

2. **获取数据**
   - 获取 Claude 健康状态
   - 获取 token 使用情况
   - 更新状态

3. **渲染气泡**
   - 遍历模型配置
   - 检查模型是否可用
   - 可用模型渲染水位线
   - 不可用模型渲染灰色气泡

4. **动画效果**
   - 水位线从 0% 动画到实际百分比
   - 波浪持续动画
   - 气泡浮动动画

## 技术细节

### SVG 波浪动画
使用 SVG `<path>` 元素和 `<animate>` 实现波浪效果：
- `d` 属性定义波浪路径
- `animate` 元素在多个路径之间切换
- `dur` 控制动画周期
- `repeatCount="indefinite"` 无限循环

### 颜色计算
```typescript
const getColor = () => {
  if (percentage < 50) return '#22c55e'; // 绿色
  if (percentage < 75) return '#eab308'; // 黄色
  if (percentage < 90) return '#f97316'; // 橙色
  return '#ef4444'; // 红色
};
```

### 性能优化
- 使用 CSS `transition` 而不是 JavaScript 动画
- SVG 动画由浏览器原生处理
- 组件只在 `percentage` 变化时重新渲染

## 测试

### 后端测试
```bash
# 测试 API 端点
curl http://localhost:8000/api/token-usage

# 预期响应
{
  "used": 134559,
  "total": 200000,
  "remaining": 65441,
  "percentage": 67.28,
  "last_updated": "2026-02-28T00:30:00"
}
```

### 前端测试
1. 打开 Dashboard 页面
2. 查看 Claude CLI Status 卡片
3. 检查可用模型是否显示水位线
4. 观察水位线动画效果
5. 检查颜色是否根据使用率变化

### 浏览器控制台
```javascript
// 查看 token 使用情况
console.log('Token Usage:', tokenUsage);

// 查看可用模型
console.log('Available Models:', claudeHealth?.model_info?.available_models);
```

## 故障排查

### 问题 1：水位线不显示
**检查**：
- 后端 API 是否正常返回数据
- `tokenUsage` 状态是否更新
- 模型是否标记为可用

### 问题 2：颜色不正确
**检查**：
- `percentage` 值是否正确
- `getColor()` 函数逻辑
- CSS 颜色值是否正确

### 问题 3：动画不流畅
**检查**：
- 浏览器是否支持 SVG 动画
- CSS `transition` 是否生效
- 是否有性能问题

## 未来改进
- [ ] 添加 tooltip 显示详细的 token 使用信息
- [ ] 支持点击气泡查看历史使用趋势
- [ ] 添加使用率预警提示
- [ ] 支持自定义颜色主题
- [ ] 添加更多动画效果选项
