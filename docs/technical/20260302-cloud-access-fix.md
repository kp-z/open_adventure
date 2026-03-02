# 云端访问问题修复记录

**修复日期**: 2026-03-02
**版本**: v1.2.1
**问题**: 云端部署时前端无法访问后端 API

## 问题描述

用户在云端服务器部署 Claude Manager 后，前端页面可以访问，但无法连接到后端 API，导致所有功能无法使用。

## 根本原因

前端配置文件 `frontend/src/config/api.ts` 中硬编码了 `localhost:8000` 作为默认 API 地址：

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/api';
```

在云端部署时：
- 前端运行在 `http://云端IP:5173`
- 浏览器尝试访问 `http://localhost:8000/api`
- `localhost` 指向用户本地电脑，而不是云端服务器
- 导致连接失败

## 修复方案

### 1. 自动检测主机地址

修改 `frontend/src/config/api.ts`，添加自动检测逻辑：

```typescript
const getDefaultApiBaseUrl = () => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // 本地开发：使用 localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  // 云端部署：使用当前主机地址
  return `${protocol}//${hostname}:8000/api`;
};

const getDefaultWsBaseUrl = () => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:8000/api';
  }

  return `${protocol}//${hostname}:8000/api`;
};
```

### 2. 工作原理

**本地开发**:
- 前端访问: `http://localhost:5173`
- API 地址: `http://localhost:8000/api`
- WebSocket: `ws://localhost:8000/api`

**云端部署**:
- 前端访问: `http://123.45.67.89:5173`
- API 地址: `http://123.45.67.89:8000/api`（自动检测）
- WebSocket: `ws://123.45.67.89:8000/api`（自动检测）

**使用域名**:
- 前端访问: `http://example.com:5173`
- API 地址: `http://example.com:8000/api`（自动检测）
- WebSocket: `ws://example.com:8000/api`（自动检测）

**HTTPS 环境**:
- 前端访问: `https://example.com`
- API 地址: `https://example.com:8000/api`（自动检测）
- WebSocket: `wss://example.com:8000/api`（自动升级到 wss）

### 3. 环境变量覆盖（可选）

如果需要自定义 API 地址，可以通过环境变量覆盖：

创建 `.env.production`:
```bash
VITE_API_BASE_URL=http://your-custom-domain.com/api
VITE_WS_BASE_URL=ws://your-custom-domain.com/api
```

## 其他常见问题

### 1. 防火墙未开放端口

**症状**: 本地可以访问，外部无法访问

**解决**:
```bash
# Ubuntu/Debian
sudo ufw allow 8000/tcp
sudo ufw allow 5173/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

### 2. 云服务商安全组未配置

**症状**: 防火墙已开放，但仍无法访问

**解决**: 在云服务商控制台配置安全组规则
- 入站规则: TCP 8000
- 入站规则: TCP 5173
- 来源: 0.0.0.0/0

### 3. 后端监听地址错误

**症状**: 只能本机访问，外部无法访问

**检查**:
```bash
netstat -tlnp | grep 8000
# 应该显示 0.0.0.0:8000，而不是 127.0.0.1:8000
```

**解决**: 确保 `backend/run.py` 中 `host="0.0.0.0"`

## 新增工具

### 1. 故障排查文档

`docs/troubleshooting/cloud-access-issues.md` - 完整的故障排查指南

### 2. 自动修复脚本

`scripts/fix-cloud-access.sh` - 自动检查和修复常见问题

使用方法:
```bash
./scripts/fix-cloud-access.sh
```

输出示例:
```
🔧 修复云端访问问题...

1️⃣  检查后端监听地址...
   ✅ 后端正确监听 0.0.0.0:8000

2️⃣  配置防火墙...
   检测到 UFW 防火墙
   开放端口 8000 和 5173...
   ✅ UFW 防火墙配置完成

3️⃣  测试本地访问...
   ✅ 本地访问成功

4️⃣  外部访问地址:
   🌐 前端: http://123.45.67.89:5173
   🔌 后端: http://123.45.67.89:8000
   ❤️  健康检查: http://123.45.67.89:8000/api/system/health

5️⃣  ⚠️  重要提醒:
   请确保云服务商安全组已配置

6️⃣  测试外部访问...
   ✅ 外部访问成功！

✅ 检查完成！
```

## 修改文件

1. `frontend/src/config/api.ts` - 添加自动检测逻辑
2. `docs/troubleshooting/cloud-access-issues.md` - 故障排查文档
3. `scripts/fix-cloud-access.sh` - 自动修复脚本

## 测试验证

### 本地开发环境
```bash
# 启动服务
./start.sh

# 访问前端
open http://localhost:5173

# 检查 API 地址（浏览器控制台）
console.log(API_CONFIG.BASE_URL)
// 输出: http://localhost:8000/api
```

### 云端部署环境
```bash
# 启动服务
./start.sh

# 访问前端
open http://your-server-ip:5173

# 检查 API 地址（浏览器控制台）
console.log(API_CONFIG.BASE_URL)
// 输出: http://your-server-ip:8000/api
```

### 使用修复脚本
```bash
./scripts/fix-cloud-access.sh
```

## 向后兼容性

- ✅ 本地开发环境完全兼容
- ✅ 环境变量配置仍然有效
- ✅ 无需修改现有配置文件
- ✅ 自动适配不同部署环境

## 影响范围

- **前端**: 自动检测 API 地址，无需手动配置
- **后端**: 无变化
- **配置**: 无需修改
- **部署**: 更简单，开箱即用

## 总结

通过添加自动检测逻辑，Claude Manager 现在可以：
1. 本地开发时自动使用 `localhost`
2. 云端部署时自动使用当前主机地址
3. 支持 HTTP 和 HTTPS
4. 支持 IP 地址和域名
5. 支持环境变量覆盖

用户无需任何配置，即可在云端正常使用。

---

**修复时间**: 2026-03-02 18:05
**状态**: ✅ 已解决
**下一版本**: v1.2.1
