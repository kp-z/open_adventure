# 🎮 Godot 游戏模式测试指南

**创建日期**: 2026-03-17
**状态**: ✅ 准备就绪

---

## ✅ 系统状态

### 后端服务
- **状态**: ✅ 运行中
- **地址**: http://localhost:38080
- **API 文档**: http://localhost:38080/docs
- **健康检查**: http://localhost:38080/api/system/health

### Godot 项目
- **位置**: `/Users/kp/项目/Proj/claude_manager/microverse`
- **测试场景**: `scene/AgentRuntimeTest.tscn`
- **状态**: ✅ 已创建

---

## 🚀 快速开始

### 步骤 1: 打开 Godot 项目

```bash
# 在 Godot 编辑器中打开项目
open -a Godot /Users/kp/项目/Proj/claude_manager/microverse/project.godot
```

或者手动打开 Godot 编辑器，然后导入项目：
- 项目路径：`/Users/kp/项目/Proj/claude_manager/microverse`

### 步骤 2: 配置 AutoLoad（首次运行）

如果是首次运行，需要配置 AutoLoad：

1. 在 Godot 编辑器中，点击 **项目 → 项目设置**
2. 选择 **AutoLoad** 标签
3. 添加新的 AutoLoad：
   - **节点名称**: `MicroverseAPIClient`
   - **路径**: `res://script/api/MicroverseAPIClient.gd`
   - **启用**: ✅
4. 点击 **添加**，然后 **关闭**

### 步骤 3: 运行测试场景

1. 在 Godot 编辑器中打开场景：
   ```
   scene/AgentRuntimeTest.tscn
   ```

2. 按 `F5` 或点击 **运行当前场景**

3. 使用快捷键测试功能：
   - `D` - 打开对话框
   - `M` - 打开监控面板
   - `S` - 启动测试任务
   - `ESC` - 关闭所有面板

---

## 🎯 测试功能

### 1. 对话系统测试

**操作**:
1. 按 `D` 键打开对话框
2. 在输入框中输入消息，例如："你好，请帮我分析一下代码"
3. 点击发送按钮或按 `Enter`
4. 观察 Agent 的回复

**预期结果**:
- ✅ 对话框正常显示
- ✅ 消息发送成功
- ✅ Agent 回复显示在对话框中
- ✅ 消息历史正常保存

### 2. 任务监控测试

**操作**:
1. 按 `M` 键打开监控面板
2. 按 `S` 键启动测试任务
3. 观察任务状态更新

**预期结果**:
- ✅ 监控面板正常显示
- ✅ 任务列表显示测试任务
- ✅ 状态实时更新（pending → running → succeeded/failed）
- ✅ 进度条显示
- ✅ 日志输出显示

### 3. 任务控制测试

**操作**:
1. 启动一个任务后
2. 点击控制面板的按钮：
   - **暂停** - 暂停任务
   - **恢复** - 恢复任务
   - **停止** - 停止任务

**预期结果**:
- ✅ 按钮状态正确切换
- ✅ 任务状态正确更新
- ✅ 后端 API 调用成功

### 4. 像素 Shader 效果测试

**操作**:
1. 观察游戏画面
2. 检查是否有像素风格效果

**预期结果**:
- ✅ CRT 扫描线效果
- ✅ 像素完美渲染
- ✅ 像素字体显示

---

## 🐛 故障排查

### 问题 1: "找不到 MicroverseAPIClient"

**解决方案**:
- 确认 AutoLoad 已正确配置
- 重启 Godot 编辑器

### 问题 2: "连接失败"

**解决方案**:
- 确认后端服务正在运行：
  ```bash
  curl http://localhost:38080/api/system/health
  ```
- 如果后端未运行，执行：
  ```bash
  cd /Users/kp/项目/Proj/claude_manager
  ./start.sh
  ```

### 问题 3: "WebSocket 连接失败"

**解决方案**:
- 检查后端日志：
  ```bash
  tail -f /Users/kp/项目/Proj/claude_manager/backend/logs/app.log
  ```
- 确认防火墙设置

### 问题 4: "字体显示异常"

**解决方案**:
- 确认字体文件存在：
  ```bash
  ls -la /Users/kp/项目/Proj/claude_manager/microverse/asset/fonts/
  ```
- 重新导入字体资源

---

## 📊 测试结果

根据端到端测试报告（`docs/technical/godot-e2e-test-report.md`）：

- **总体通过率**: 75% (12/16 测试通过)
- **核心功能**: ✅ 正常工作
- **性能表现**: ✅ 优秀
  - API 响应时间: 1-50ms
  - 内存占用: 25MB
  - CPU 占用: 0-0.1%

---

## 📝 测试清单

使用以下清单验证所有功能：

- [ ] 后端服务运行正常
- [ ] Godot 项目打开成功
- [ ] AutoLoad 配置完成
- [ ] 测试场景运行成功
- [ ] 对话框正常显示和交互
- [ ] 任务监控面板正常显示
- [ ] 任务控制按钮正常工作
- [ ] WebSocket 实时更新正常
- [ ] 像素 Shader 效果正常
- [ ] 像素字体显示正常

---

## 🎉 成功标志

如果你看到以下内容，说明一切正常：

1. ✅ 测试场景成功运行
2. ✅ 按 `D` 键后对话框弹出
3. ✅ 按 `M` 键后监控面板弹出
4. ✅ 按 `S` 键后任务开始执行
5. ✅ 监控面板显示实时状态更新
6. ✅ 像素风格 UI 正常显示

---

## 📚 相关文档

- [快速启动指南](docs/technical/godot-quickstart-guide.md)
- [集成指南](docs/technical/godot-frontend-integration-guide.md)
- [端到端测试报告](docs/technical/godot-e2e-test-report.md)
- [架构设计](docs/plans/godot-agent-runtime-architecture.md)

---

## 🆘 需要帮助？

如果遇到问题，请查看：
1. 后端日志：`backend/logs/app.log`
2. Godot 控制台输出
3. 测试报告：`docs/technical/godot-e2e-test-report.md`

---

**准备就绪！现在可以开始测试 Godot 游戏模式了！** 🎮

按照上述步骤操作，你应该能够看到完整的游戏化 AI Agent 管理界面。
