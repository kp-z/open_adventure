# Microverse 游戏中使用后端 API 的方法

**创建日期**: 2026-03-15
**状态**: 已实现（需要手动配置）

## 当前状态

✅ 后端 API 已实现并测试通过
✅ Microverse 代码已集成后端 API 支持
⚠️  需要手动修改配置文件启用

## 如何启用后端 API

### 方法 1: 修改配置文件（推荐）

1. 找到 Microverse 的配置文件：
   - macOS/Linux: `~/.local/share/godot/app_userdata/Microverse/settings.cfg`
   - Windows: `%APPDATA%\Godot\app_userdata\Microverse\settings.cfg`

2. 编辑配置文件，添加或修改以下内容：
   ```json
   {
     "api_type": "Ollama",
     "model": "qwen2.5:1.5b",
     "api_key": "",
     "show_ai_model_label": true,
     "use_backend_api": true,
     "window_mode": "windowed",
     "screen_width": 1280,
     "screen_height": 720
   }
   ```

3. 保存文件并重启游戏

### 方法 2: 通过 Godot 编辑器（开发模式）

1. 在 Godot 编辑器中打开 Microverse 项目
2. 运行游戏
3. 打开设置界面（ESC 键）
4. 在控制台中执行：
   ```gdscript
   SettingsManager.current_settings["use_backend_api"] = true
   SettingsManager.save_settings()
   ```

### 方法 3: 添加 UI 开关（待实现）

需要在设置界面添加"使用后端 API"复选框：

1. 打开场景文件：`microverse/scene/GlobalSettingsUI.tscn`
2. 在"API设置"标签页添加 CheckBox 节点
3. 连接信号到 GlobalSettingsUI.gd
4. 在保存时更新 `use_backend_api` 设置

## 验证后端 API 是否启用

### 1. 查看游戏日志

启动游戏后，在控制台中查找：
```
[APIManager] 使用后端 API：true
[BackendAPIManager] 发送请求到后端: {角色名}
```

### 2. 查看后端日志

在后端日志中应该看到：
```
INFO: 127.0.0.1:xxxxx - "POST /api/microverse/chat HTTP/1.1" 200 OK
```

### 3. 查看数据库

检查数据库中是否创建了 microverse Agent：
```bash
sqlite3 open_adventure.db "SELECT name FROM agents WHERE category='microverse';"
```

## 后端 API 配置

### 默认配置

- 后端地址: `http://localhost:38080`
- API 端点: `/api/microverse/chat`

### 修改后端地址

如果后端运行在不同的端口或服务器上，需要修改：

**文件**: `microverse/script/ai/BackendAPIManager.gd`

```gdscript
# 修改这一行
var backend_url = "http://localhost:38080/api/microverse"

# 改为你的后端地址，例如：
var backend_url = "http://192.168.1.100:8000/api/microverse"
```

## 工作流程

```
用户在游戏中与角色对话
    ↓
APIManager.generate_dialog()
    ↓
检查 use_backend_api 标志
    ↓
如果启用 → BackendAPIManager.send_chat_request()
    ↓
HTTP POST → http://localhost:38080/api/microverse/chat
    ↓
后端创建 Agent 和 Execution 记录
    ↓
调用 AI API（当前为模拟响应）
    ↓
返回响应给游戏
    ↓
游戏显示 AI 回复
```

## 优势

使用后端 API 的优势：

1. **统一管理**: 所有 AI 对话记录在后端数据库中
2. **实时监控**: 可以在前端 Dashboard 查看执行历史
3. **集中配置**: API 密钥和模型配置在后端管理
4. **数据分析**: 可以统计和分析 AI 使用情况
5. **多端同步**: 未来可以支持多个游戏实例共享数据

## 注意事项

1. **性能影响**: 
   - 后端 API 调用会增加网络延迟（~50-100ms）
   - 适合局域网或本地部署

2. **后端依赖**:
   - 必须先启动后端服务
   - 如果后端不可用，游戏会卡住（待添加超时和回退机制）

3. **当前限制**:
   - AI API 调用仍是模拟的（返回固定文本）
   - 需要实现真实的 OpenAI/Claude API 调用

## 下一步

1. **添加 UI 开关** (P1)
   - 在设置界面添加"使用后端 API"复选框
   - 用户可以方便地切换模式

2. **实现真实 AI API 调用** (P0)
   - 在后端实现 OpenAI/Claude API 调用
   - 替换当前的模拟响应

3. **添加错误处理** (P1)
   - 后端不可用时自动回退到直接调用
   - 显示友好的错误提示

4. **性能优化** (P2)
   - 添加超时机制（30秒）
   - 异步处理避免卡顿

## 测试命令

### 测试后端 API

```bash
curl -X POST http://localhost:38080/api/microverse/chat \
  -H "Content-Type: application/json" \
  -d '{
    "character_name": "TestChar",
    "prompt": "Hello",
    "api_type": "OpenAI",
    "model": "gpt-4o-mini"
  }'
```

### 查看执行记录

```bash
sqlite3 open_adventure.db << 'SQL'
SELECT 
    a.name,
    COUNT(e.id) as executions,
    MAX(e.created_at) as last_execution
FROM agents a
LEFT JOIN executions e ON a.id = e.agent_id
WHERE a.category = 'microverse'
GROUP BY a.id;
SQL
```

## 参考资料

- [实现总结](./20260315-microverse-backend-integration.md)
- [测试报告](./20260315-microverse-api-test-report.md)
- [后端 API 文档](../../backend/app/api/routers/microverse.py)
