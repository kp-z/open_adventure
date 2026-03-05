# Release Notes - v1.2.0

**发布日期**: 2026-03-02

## 🎯 本次更新重点

v1.2.0 是一个重要的稳定性和可维护性更新，系统性地解决了 Linux 云端部署时的多个严重问题，显著提升了系统在生产环境的稳定性和可观测性。

## 🔴 严重问题修复

### 1. 数据库连接池耗尽问题
- **问题**: 默认连接池配置过小（5/10），高并发时导致 30 秒超时和 500 错误
- **修复**:
  - 增加 `pool_size` 到 20
  - 增加 `max_overflow` 到 40
  - 添加 `pool_recycle=3600`（1小时回收连接）
  - 添加 `pool_pre_ping=True`（连接前检查可用性）
- **影响**: 支持更高并发（从 15 到 60 连接），防止连接泄漏

### 2. Terminal 子进程僵尸进程问题
- **问题**: `pty.fork()` 创建的子进程继承父进程的 socket 文件描述符，导致后端无法重启
- **修复**: 在 fork 前设置所有非标准文件描述符为 `FD_CLOEXEC`，子进程 exec 时自动关闭
- **影响**: 彻底解决 Terminal 会话导致的端口占用和僵尸进程问题

### 3. 同步/异步 API 混用问题
- **问题**: `main.py` 中在 async 上下文调用同步的 `AgentSessionService`，导致阻塞
- **修复**: 创建异步版本 `AgentSessionServiceAsync`，所有数据库操作使用 `await`
- **影响**: 避免阻塞，提升响应速度和系统稳定性

## 🟡 高优先级问题修复

### 4. ORM 模型传递问题
- **问题**: `terminal.py` 中直接传 ORM 模型给 Repository，导致 `model_dump()` 错误
- **修复**: 使用 Pydantic Schema (`TaskCreate`, `ExecutionCreate`) 创建对象
- **影响**: 确保类型安全和数据验证

### 5. ExecutionCreate Schema 扩展
- **问题**: Schema 缺少 Terminal/Agent 相关字段，只能放在 meta 中
- **修复**: 添加完整的字段支持
  - Terminal 字段: `session_id`, `terminal_pid`, `terminal_cwd`, `terminal_command`, `terminal_output`
  - Agent 字段: `agent_session_id`
  - 时间字段: `started_at`, `finished_at`, `last_activity_at`
  - 其他: `is_background`, `meta`
- **影响**: 更好的数据结构和查询能力

## 🟠 中等优先级改进

### 6. 详细健康检查端点
- **新增**: `/api/system/health/detailed` 端点
- **功能**:
  - 数据库连接池状态（size, checked_in, checked_out, overflow）
  - WebSocket 连接数（总数、execution、terminal）
  - Terminal 会话数（总数、活跃数）
  - 数据库连接测试
- **影响**: 更好的系统可观测性和故障排查能力

### 7. 结构化日志和日志轮转
- **新增**:
  - 结构化日志（JSON 格式，生产环境）
  - 日志轮转（10MB，保留 5 个备份）
  - Request ID 支持（跨请求追踪）
  - 错误日志单独文件
  - RequestIDMiddleware 中间件
- **影响**: 更好的日志管理和问题追踪能力

## 🟢 低优先级改进

### 8. Linux 云端部署文档
- **新增**: `docs/deployment/linux-cloud.md`（11KB）
- **内容**:
  - 环境要求和快速部署
  - 远程访问配置（防火墙、安全组、Nginx）
  - systemd 服务配置
  - 日志管理和故障排查
  - 性能优化和安全建议
  - 监控和告警
  - 常见问题

### 9. systemd 服务配置
- **新增**: `open-adventure.service` 模板
- **功能**: 自动重启、资源限制、安全设置、日志输出

### 10. 配置修复
- **修复**: 添加缺失的 `env` 配置字段到 `Settings` 类
- **修复**: 修正 `health.py` 中的导入错误（`active_sessions` → `sessions`）

## 📝 文档更新

- 新增 `docs/deployment/linux-cloud.md` - Linux 云端部署完整指南
- 新增 `docs/technical/20260302-linux-cloud-deployment-fixes.md` - 修复详细记录
- 新增 `docs/technical/20260302-backend-startup-fix.md` - 启动问题修复记录
- 新增 `open-adventure.service` - systemd 服务配置模板

## 🔧 技术细节

### 修改的文件
1. `backend/app/core/database.py` - 数据库连接池配置
2. `backend/app/api/terminal.py` - Terminal 子进程和 Schema 使用
3. `backend/app/main.py` - 异步 service 和 RequestIDMiddleware
4. `backend/app/schemas/executions.py` - ExecutionCreate Schema 扩展
5. `backend/app/api/routers/health.py` - 详细健康检查
6. `backend/app/core/logging.py` - 结构化日志和轮转
7. `backend/app/config/settings.py` - 添加 env 字段

### 新增的文件
1. `backend/app/services/agent_session_service_async.py` - 异步版本 service
2. `docs/deployment/linux-cloud.md` - 云端部署文档
3. `docs/technical/20260302-linux-cloud-deployment-fixes.md` - 修复记录
4. `docs/technical/20260302-backend-startup-fix.md` - 启动修复记录
5. `open-adventure.service` - systemd 配置

### 代码统计
- 修改文件: 7 个
- 新增文件: 5 个
- 代码行数: +500 行
- 文档: 3 个新文档

## ⚠️ 升级指南

### 从 v1.1.x 升级

1. **停止服务**
   ```bash
   ./stop.sh
   ```

2. **备份数据库**（可选但推荐）
   ```bash
   cp backend/open_adventure.db backend/open_adventure.db.backup
   ```

3. **替换代码文件**
   - 下载新版本压缩包
   - 解压并覆盖现有文件

4. **重新安装依赖**（如果有变化）
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt

   cd ../frontend
   npm install
   npm run build
   ```

5. **启动服务**
   ```bash
   ./start.sh
   ```

6. **验证升级**
   ```bash
   curl http://localhost:8000/api/system/health/detailed
   ```

### 配置变更

**无需修改配置文件**，所有配置都向后兼容。

可选：在 `.env` 中添加环境变量（默认值已足够）：
```bash
ENV=production  # 或 development, test
```

### 数据库迁移

**无需数据库迁移**，所有 Schema 变更都向后兼容。

## 🐛 已知问题

无已知严重问题。

## 📊 性能影响

### 正面影响
- 连接池扩大: 支持更高并发（60 连接）
- 连接回收: 防止连接泄漏和过期
- 异步优化: 避免阻塞，提升响应速度
- 日志轮转: 防止日志文件过大影响性能

### 资源消耗
- 内存: +50-100MB（连接池扩大）
- 磁盘: +50MB（日志轮转备份）
- CPU: +1-2%（结构化日志）

## 🔮 后续计划

### 短期（1-2 周）
- 在生产环境部署并监控
- 收集性能指标和日志
- 根据实际负载调整连接池大小

### 中期（1-2 月）
- 添加 Prometheus 监控
- 添加 Grafana 仪表板
- 实现自动告警

### 长期（3-6 月）
- 考虑使用 PostgreSQL 替代 SQLite
- 实现分布式部署
- 添加负载均衡

## 📦 下载

### macOS ARM64
```bash
wget https://github.com/kp-z/open_adventure/releases/download/v1.2.0/open-adventure-v1.2.0-macos-arm64.tar.gz
```

### Linux x86_64
```bash
wget https://github.com/kp-z/open_adventure/releases/download/v1.2.0/open-adventure-v1.2.0-linux-x86_64.tar.gz
```

## 🙏 致谢

感谢所有在云端部署测试中发现问题并提供反馈的用户。

## 📞 支持

- **GitHub Issues**: https://github.com/kp-z/open_adventure/issues
- **文档**: https://github.com/kp-z/open_adventure/tree/main/docs

---

**完整变更日志**: https://github.com/kp-z/open_adventure/compare/v1.1.2...v1.2.0
