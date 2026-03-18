# Console 日志监控功能使用指南

**创建日期**: 2026-03-18
**状态**: 已完成

## 功能概述

测试页面新增了实时 Console 日志监控功能，可以自动捕获并保存来自主应用、Microverse 游戏和后端的日志，帮助开发者进行调试和问题排查。

## 功能特性

### 1. 日志来源
- **主应用** (main-app): 前端主应用的 console 输出
- **Microverse** (microverse): Godot 游戏的 console 输出
- **后端** (backend): 后端服务的日志

### 2. 日志级别
- `log`: 普通日志（灰色）
- `info`: 信息日志（蓝色）
- `warn`: 警告日志（橙色）
- `error`: 错误日志（红色）

### 3. 存储方式
- 日志文件存储在 `docs/logs/console/` 目录
- 按来源和日期分文件存储：`{source}-{YYYYMMDD}.log`
- 每条日志为一行 JSON 格式

### 4. 自动清理
- 默认保留 7 天内的日志
- 可手动触发清理旧日志

## 使用方法

### 启动日志监控

1. 打开测试页面（点击左下角紫色烧杯图标）
2. 在"实时日志流"面板中点击"开始监控"按钮
3. 系统会自动：
   - 连接 WebSocket 日志流
   - 通知主应用开始捕获日志
   - 加载后端最近 50 条日志

### 查看实时日志

- 日志会实时显示在"实时日志流"面板中
- 最多显示最近 100 条日志
- 自动滚动到最新日志
- 按级别颜色区分

### 停止监控

点击"停止监控"按钮，系统会：
- 关闭 WebSocket 连接
- 通知主应用停止捕获日志
- 清空内存缓冲区

### 清空日志

点击"清空"按钮可以清空当前显示的日志（不影响已保存的文件）

### 导出日志

点击"导出"按钮可以：
- 导出所有已保存的日志为 JSON 文件
- 文件名格式：`console-logs-{YYYY-MM-DD}.json`
- 可用于离线分析或分享给 AI

### 清理旧日志

点击"清理旧日志"按钮可以：
- 删除 7 天前的日志文件
- 释放磁盘空间
- 系统会提示清理的文件数量

## 日志格式

```json
{
  "timestamp": "2026-03-18T01:30:00.000Z",
  "level": "error",
  "source": "main-app",
  "page": "/agents",
  "message": "Failed to load agents: Network error",
  "stack": "Error: Network error\n    at AgentService.load...",
  "context": {
    "userAgent": "Mozilla/5.0...",
    "sessionId": "abc123"
  }
}
```

## API 端点

### WebSocket
- `ws://localhost:38080/api/logs/stream` - 实时日志流

### HTTP
- `POST /api/logs/capture` - 接收日志（HTTP 方式）
- `GET /api/logs/export` - 导出日志
- `POST /api/logs/cleanup` - 清理旧日志
- `GET /api/logs/backend` - 获取后端日志

## 技术实现

### 前端日志拦截
- 位置: `frontend/src/lib/console-logger.ts`
- 拦截 `console.log/error/warn/info` 方法
- 通过 WebSocket 发送到后端
- 支持启用/禁用控制

### 后端日志 API
- 位置: `backend/app/api/routers/logs.py`
- WebSocket 实时推送
- 文件持久化存储
- 日志导出和清理

### Microverse 日志转发
- 位置: `frontend/src/app/pages/Microverse.tsx`
- 监听 `godot-log` 消息
- 通过 HTTP POST 转发到后端

## 注意事项

1. **性能影响**
   - 日志捕获会略微增加性能开销
   - 建议仅在需要调试时启用
   - 停止监控后不会影响性能

2. **存储空间**
   - 日志文件会占用磁盘空间
   - 定期清理旧日志
   - 单个日志文件大小取决于日志量

3. **隐私安全**
   - 日志可能包含敏感信息
   - 不要将日志文件提交到 Git
   - 导出日志前检查内容

4. **WebSocket 连接**
   - 需要后端服务运行
   - 连接断开会自动重连（5 秒后）
   - 断开期间日志会缓冲（最多 100 条）

## 故障排查

### 日志不显示
1. 检查后端服务是否运行
2. 检查 WebSocket 连接状态（浏览器控制台）
3. 确认已点击"开始监控"按钮

### WebSocket 连接失败
1. 确认后端端口 38080 可访问
2. 检查防火墙设置
3. 查看浏览器控制台错误信息

### 日志文件未生成
1. 检查 `docs/logs/console/` 目录权限
2. 查看后端日志是否有错误
3. 确认日志捕获功能已启用

## 未来改进

- [ ] 支持日志过滤和搜索
- [ ] 支持历史日志查看
- [ ] 支持日志级别过滤
- [ ] 支持按模块分类
- [ ] 支持日志统计和分析
- [ ] 支持日志告警
