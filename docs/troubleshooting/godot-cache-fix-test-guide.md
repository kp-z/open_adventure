# Godot 游戏缓存修复 - 快速测试指南

## 问题
浏览器缓存了旧版本的 Godot 游戏文件（.pck 和 .wasm），导致代码修复没有生效。

## 解决方案
已添加版本号机制和缓存控制策略。

## 快速测试步骤

### 方法 1：硬刷新（推荐）

1. 访问 `http://localhost:38080/microverse`
2. 按 `Cmd+Shift+R`（Mac）或 `Ctrl+Shift+R`（Windows）
3. 等待游戏加载完成
4. 测试 Agent 绑定功能

### 方法 2：清除站点数据

1. 访问 `http://localhost:38080/microverse`
2. 打开开发者工具（F12）
3. Application 标签 → Storage → Clear site data
4. 刷新页面
5. 测试 Agent 绑定功能

### 方法 3：隐私模式

1. 打开隐私模式窗口：`Cmd+Shift+N`（Mac）或 `Ctrl+Shift+N`（Windows）
2. 访问 `http://localhost:38080/microverse`
3. 测试 Agent 绑定功能

## 验证修复效果

### 1. 检查版本号

打开开发者工具 → Network 标签，查看请求 URL：

```
✅ 正确：/microverse/index.html?v=2026-03-17T20:40:00+08:00
❌ 错误：/microverse/index.html（没有版本号）
```

### 2. 检查 API 调用

打开开发者工具 → Console 标签，查找日志：

```
✅ 正确：[MicroverseAPIClient] PUT http://localhost:38080/api/microverse/characters/xxx/bind
❌ 错误：[MicroverseAPIClient] POST http://localhost:8000/api/microverse/characters/xxx/bind
```

### 3. 测试 Agent 绑定

1. 点击选中一个角色
2. 按 `Shift+S` 打开 Agent 配置对话框
3. 选择一个 Agent
4. 点击"绑定"按钮

**预期结果**：
- 绑定成功，角色头顶显示 Agent 名称
- Console 显示 `PUT` 请求返回 200
- 没有错误提示

## 如果仍然有问题

### 检查缓存头

```bash
curl -I http://localhost:38080/microverse/index.pck
```

应该看到：
```
Cache-Control: public, max-age=300
```

### 检查服务状态

```bash
curl http://localhost:38080/api/system/health
```

应该返回：
```json
{"status":"healthy","app_name":"Open Adventure","version":"0.1.3"}
```

### 重启服务

```bash
./stop.sh
./start.sh
```

## 技术说明

- **版本号来源**：`frontend/public/microverse/version.json` 的 `exportTime` 字段
- **缓存策略**：`.pck` 和 `.wasm` 文件缓存 5 分钟（300 秒）
- **自动更新**：修改 `version.json` 后，浏览器会自动加载新版本

## 相关文档

详细技术文档：`docs/technical/20260317-09-Godot缓存问题修复.md`
