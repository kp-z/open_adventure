# Godot 测试脚本使用说明

本目录包含 Godot Microverse 游戏模式的端到端集成测试脚本。

## 测试脚本

### 1. godot_e2e_test.py - 功能测试

**用途**: 测试 Godot 与后端 API 的集成功能

**测试内容**:
- 基础连接测试
- 对话功能测试
- 任务监控测试
- 任务控制测试
- 错误处理测试
- 性能测试
- WebSocket 实时更新测试

**运行方法**:
```bash
cd /Users/kp/项目/Proj/claude_manager
python scripts/godot_e2e_test.py
```

**前置条件**:
- 后端服务运行在 `http://localhost:38080`
- 已安装依赖: `aiohttp`

**预期结果**:
- 通过率 > 70%
- 所有 WebSocket 测试通过
- 错误处理测试通过

---

### 2. godot_performance_test.py - 性能测试

**用途**: 测试 WebSocket 延迟、资源占用和并发性能

**测试内容**:
- WebSocket 延迟测试（30秒）
- 资源占用测试（内存和 CPU，30秒）
- 并发连接测试（10个连接）
- API 吞吐量测试（100个请求）

**运行方法**:
```bash
cd /Users/kp/项目/Proj/claude_manager
python scripts/godot_performance_test.py
```

**前置条件**:
- 后端服务运行在 `http://localhost:38080`
- 已安装依赖: `aiohttp`, `psutil`

**预期结果**:
- API 响应时间 < 500ms
- 内存占用 < 100MB
- CPU 占用 < 10%
- 并发连接全部成功

---

## 测试报告

测试完成后，查看以下报告：

1. **详细报告**: `docs/technical/godot-e2e-test-report.md`
   - 包含所有测试结果
   - 性能指标分析
   - 改进建议

2. **执行总结**: `docs/technical/godot-e2e-test-summary.md`
   - 测试执行概览
   - 主要发现
   - 后续步骤

---

## 故障排查

### 问题 1: 连接失败

**错误**: `Cannot connect to host localhost:38080`

**解决方案**:
1. 确认后端服务正在运行
2. 检查端口是否正确（38080）
3. 运行 `./start.sh` 启动后端

### 问题 2: 测试角色未绑定

**错误**: `Character TestAgent is not bound to any agent`

**解决方案**:
- 测试脚本会自动创建和绑定角色
- 如果仍然失败，检查数据库中是否有 Agent ID 1

### 问题 3: 性能测试超时

**错误**: WebSocket 接收消息超时

**解决方案**:
- 这是正常现象，后端推送间隔为 1-5 秒
- 确保测试角色有活动任务可以提高消息频率

---

## 依赖安装

```bash
pip install aiohttp psutil
```

---

**最后更新**: 2026-03-17
**维护者**: godot-tester
