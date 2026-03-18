# 测试 Agent 绑定功能指南

**创建日期**：2026-03-17
**适用版本**：v4.2.0+

## 前提条件

1. 后端服务运行在 `http://localhost:38080`
2. 数据库中至少有一个 Agent

## 测试步骤

### 1. 启动游戏

访问 `http://localhost:38080/microverse`，等待游戏加载完成（约 5-10 秒）。

### 2. 选择角色

在游戏中，**点击一个角色**（游戏中的人物）来选择它。选中的角色会有高亮显示。

### 3. 打开 Agent 配置对话框

选中角色后，按 **`Shift+S`** 键打开 Agent 配置对话框。

**快捷键说明**：
- `Shift+S`：打开 Agent 配置对话框（configure_agent）
- `Shift+Q`：与 Agent 对话（talk_with_agent）
- `T`：开始对话（start_dialog_t）
- `E`：开始工作（start_work）
- `ESC`：取消选中角色

### 4. 查看 Agent 列表

配置对话框打开后，应该显示：
- 当前角色的绑定状态（如果已绑定）
- 可用的 Agent 列表（从后端 API 加载）

### 5. 绑定 Agent

1. 在 Agent 列表中选择一个 Agent
2. 点击"绑定"按钮
3. 观察是否显示成功消息

**预期结果**：
- 绑定成功后，应该显示成功提示
- 当前绑定状态应该更新为选中的 Agent

### 6. 解绑 Agent

1. 如果角色已绑定 Agent，点击"解绑"按钮
2. 观察是否显示成功消息

**预期结果**：
- 解绑成功后，应该显示成功提示
- 当前绑定状态应该清空

## 验证 API 调用

### 使用浏览器开发者工具

1. 打开浏览器开发者工具（F12 或 Cmd+Option+I）
2. 切换到 **Network** 标签
3. 执行绑定/解绑操作
4. 查看 API 请求

**预期的 API 请求**：

#### 获取 Agent 列表
```
GET http://localhost:38080/api/agents
Status: 200 OK
Response: [{"id": 1, "name": "Agent 1", ...}, ...]
```

#### 绑定 Agent
```
PUT http://localhost:38080/api/microverse/characters/{character_name}/bind
Request Body: {"agent_id": 1}
Status: 200 OK
Response: {"success": true, ...}
```

#### 解绑 Agent
```
DELETE http://localhost:38080/api/microverse/characters/{character_name}/bind
Status: 200 OK
Response: {"success": true, ...}
```

### 查看 Godot 游戏日志

在浏览器控制台（Console 标签）中，查找以 `[MicroverseAPIClient]` 开头的日志：

```
[MicroverseAPIClient] GET http://localhost:38080/api/agents
[MicroverseAPIClient] PUT http://localhost:38080/api/microverse/characters/Alice/bind
[MicroverseAPIClient] Body: {"agent_id": 1}
[MicroverseAPIClient] DELETE http://localhost:38080/api/microverse/characters/Alice/bind
```

## 常见问题

### 问题 1：点击角色无响应

**可能原因**：
- 游戏未完全加载
- 点击位置不准确

**解决方法**：
- 等待游戏完全加载（看到角色在场景中移动）
- 直接点击角色的身体部分

### 问题 2：按 Shift+S 无响应

**可能原因**：
- 未选中角色
- 键盘焦点不在游戏窗口

**解决方法**：
- 先点击选中一个角色（角色会高亮）
- 点击游戏画面确保焦点在游戏窗口

### 问题 3：Agent 列表为空

**可能原因**：
- 后端 API 未启动
- 数据库中没有 Agent
- API 请求失败

**解决方法**：
1. 检查后端服务是否运行：`lsof -i :38080`
2. 检查浏览器控制台的 Network 标签，查看 API 请求状态
3. 如果返回 404/500，检查后端日志

### 问题 4：绑定/解绑失败

**可能原因**：
- API 端点或方法不匹配
- 后端返回错误

**解决方法**：
1. 查看浏览器控制台的 Network 标签
2. 检查 API 请求的 HTTP 方法和状态码：
   - 绑定应该是 `PUT /api/microverse/characters/{name}/bind`
   - 解绑应该是 `DELETE /api/microverse/characters/{name}/bind`
3. 如果返回 404/405，说明端点或方法不匹配，需要检查代码

### 问题 5：浏览器缓存问题

**症状**：修改代码后游戏行为未改变

**解决方法**：
1. 清除浏览器缓存（Ctrl+Shift+Delete 或 Cmd+Shift+Delete）
2. 或使用隐私模式（Ctrl+Shift+N 或 Cmd+Shift+N）
3. 或在 URL 后添加时间戳：`/microverse?t=123456`

## 测试检查清单

- [ ] 游戏成功加载，角色可见
- [ ] 可以点击选中角色
- [ ] 按 Shift+S 可以打开配置对话框
- [ ] Agent 列表正确显示（从后端加载）
- [ ] 可以选择 Agent 并成功绑定
- [ ] 绑定后显示成功消息
- [ ] 当前绑定状态正确更新
- [ ] 可以成功解绑 Agent
- [ ] 解绑后显示成功消息
- [ ] 浏览器 Network 标签显示正确的 API 请求
- [ ] 浏览器 Console 标签无错误日志

## 相关文档

- [Godot 游戏 Agent 选取修复](../technical/20260317-06-Godot游戏Agent选取修复.md)
- [后端 API 文档](../../backend/app/api/routers/microverse.py)
- [Godot API 客户端](../../microverse/script/api/MicroverseAPIClient.gd)

## 反馈

如果测试过程中遇到问题，请记录：
1. 具体的操作步骤
2. 浏览器控制台的错误信息
3. Network 标签中的 API 请求详情
4. 游戏日志（Console 标签中的 `[MicroverseAPIClient]` 日志）
