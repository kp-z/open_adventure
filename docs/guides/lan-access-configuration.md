# 局域网访问配置指南

## 问题描述
当从局域网内其他设备访问 Claude Manager 时，前端可以加载，但无法连接到后端 API。

## 原因
前端默认使用 `localhost:8000` 作为 API 地址，这在局域网访问时会指向访问设备自己的 localhost，而不是服务器的地址。

## 解决方案

### 1. 修改前端环境变量

编辑 `frontend/.env.local` 文件，将 API 地址改为服务器的局域网 IP：

```bash
# Frontend Environment Variables

# API Base URL - 使用局域网 IP 以支持局域网访问
VITE_API_BASE_URL=http://10.12.69.156:8000/api

# WebSocket Base URL (for Terminal)
VITE_WS_BASE_URL=ws://10.12.69.156:8000/api
```

### 2. 重启前端服务

```bash
cd frontend
# 停止现有服务
pkill -f vite

# 重新启动
npm run dev
```

### 3. 访问地址

**本机访问**：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:8000`

**局域网访问**：
- 前端：`http://10.12.69.156:5173`
- 后端：`http://10.12.69.156:8000`

## 注意事项

1. **IP 地址可能变化**：如果服务器的局域网 IP 地址改变，需要更新 `.env.local` 文件
2. **防火墙设置**：确保 Mac 防火墙允许 5173 和 8000 端口的入站连接
3. **同一局域网**：访问设备必须在同一局域网内

## 验证配置

### 测试后端连接
```bash
curl http://10.12.69.156:8000/api/agents
```

应该返回 agents 列表的 JSON 数据。

### 测试前端访问
在局域网内其他设备的浏览器中打开：
```
http://10.12.69.156:5173
```

应该能够正常加载页面并显示数据。

## 恢复本地访问

如果只需要本地访问，可以将 `.env.local` 改回：

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/api
```

## 生产环境配置

在生产环境中，建议使用域名或反向代理，而不是直接使用 IP 地址。
