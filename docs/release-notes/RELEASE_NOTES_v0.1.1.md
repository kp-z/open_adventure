# Release Notes - v0.1.1

**发布日期**: 2026-02-27

## 🎯 核心功能

### Agent 测试执行系统
- ✅ 实现 Agent 测试执行服务
- ✅ 添加 Agent 测试 API 端点
- ✅ 支持流式日志输出的 Agent 测试端点
- ✅ 扩展 Execution 模型支持 Agent 测试执行类型

### 实时监控与通信
- ✅ 实现 WebSocket 连接管理器
- ✅ 添加 WebSocket 执行状态更新端点
- ✅ 支持实时执行状态推送（< 500ms 延迟）

### 团队管理功能
- ✅ 引入团队管理特性
- ✅ 更新 API 服务和路由
- ✅ 优化 UI 组件

## 📚 文档更新
- 添加 Dashboard Execution History 实时更新设计文档
- 添加 Dashboard Execution History 实施计划
- 更新 CLAUDE.md 添加实时执行监控功能说明
- 添加流式日志使用指南
- 添加 Agent 测试相关文档

## 🔧 技术改进
- 更新 CORS 配置以支持跨域请求
- 移除旧的 Agent 定义文件
- 更新项目依赖

## 🐛 Bug 修复
- 修复 WebSocket 连接稳定性问题
- 优化流式日志输出性能

## 📦 完整变更列表
- feat: Introduce team management features, update API services and routes, and refine UI components across the application.
- feat: Implement new agent and team management features with updated API integration and UI components.
- chore: Update CORS configuration to allow all origins and disable credentials.
- docs: 添加 Dashboard Execution History 实时更新设计文档
- docs: 添加 Dashboard Execution History 实施计划
- feat(db): 扩展 Execution 模型支持 Agent 测试执行类型
- feat(websocket): 实现 WebSocket 连接管理器
- feat(api): 添加 WebSocket 执行状态更新端点
- feat(service): 实现 Agent 测试执行服务
- feat(api): 添加 Agent 测试 API 端点
- docs: 更新 CLAUDE.md 添加实时执行监控功能说明
- feat: Add streaming agent test endpoint, remove old agent definition files, and update dependencies.
- chore: 准备 v0.1.1 release - 添加文档和测试文件

## 🚀 升级说明
从 v1.0.0 升级到 v0.1.1：
1. 拉取最新代码：`git pull origin main`
2. 切换到 v0.1.1 标签：`git checkout v0.1.1`
3. 安装依赖：
   - 后端：`cd backend && pip install -r requirements.txt`
   - 前端：`cd frontend && npm install`
4. 重启服务

## 📝 已知问题
- WebSocket 在某些网络环境下可能需要额外配置
- 流式日志在大量并发时可能出现延迟

## 🔗 相关链接
- GitHub Repository: https://github.com/kp-z/open_adventure
- 文档: /docs/
- 问题反馈: https://github.com/kp-z/open_adventure/issues
