# 局域网访问配置指南

## 概述

Open Adventure 使用统一端口 **38080** 提供服务，前端已集成到后端，无需单独配置前端服务器。

## 自动配置（推荐）

使用 `start.sh` 脚本会**自动配置**局域网访问：

```bash
./start.sh
```

脚本会：
1. 自动检测服务器的局域网 IP 地址
2. 启动后端服务（包含前端静态文件）
3. 显示本地和局域网访问地址

启动后会看到类似输出：
```
============================================
✅ Open Adventure is running!
============================================

🌐 Local Access:
   Application: http://localhost:38080
   API Docs: http://localhost:38080/docs
   Microverse: http://localhost:38080/microverse

🌍 LAN Access (from other devices):
   Application: http://10.12.69.156:38080
   API Docs: http://10.12.69.156:38080/docs
   Microverse: http://10.12.69.156:38080/microverse

Press Ctrl+C to stop the server
============================================
```

## 访问地址

### 本机访问
- 主界面：`http://localhost:38080`
- API 文档：`http://localhost:38080/docs`
- Microverse 游戏：`http://localhost:38080/microverse`

### 局域网访问
- 主界面：`http://<局域网IP>:38080`
- API 文档：`http://<局域网IP>:38080/docs`
- Microverse 游戏：`http://<局域网IP>:38080/microverse`

例如，如果服务器 IP 是 `10.12.69.156`：
- 主界面：`http://10.12.69.156:38080`

## 注意事项

1. **IP 地址可能变化**：如果服务器的局域网 IP 地址改变，需要重新启动服务
2. **防火墙设置**：确保防火墙允许 38080 端口的入站连接
3. **同一局域网**：访问设备必须在同一局域网内

## 验证配置

### 测试后端连接
```bash
curl http://10.12.69.156:38080/api/agents
```

应该返回 agents 列表的 JSON 数据。

### 测试前端访问
在局域网内其他设备的浏览器中打开：
```
http://10.12.69.156:38080
```

应该能够正常加载页面并显示数据。

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/api
```

## 生产环境配置

在生产环境中，建议使用域名或反向代理，而不是直接使用 IP 地址。
