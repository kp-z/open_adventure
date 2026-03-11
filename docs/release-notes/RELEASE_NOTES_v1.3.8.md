# Release Notes v1.3.8

**发布日期**: 2026-03-11
**版本**: v1.3.8

## 🚨 重要修复

本版本修复了Linux版本二进制文件局域网访问的关键问题，确保前端能够正确连接到后端服务。

## 🔧 核心修复

### 局域网访问配置修复
- **问题**: 二进制版本的前端配置硬编码为 `localhost`，导致局域网设备无法访问
- **修复**: 运行时配置根据 `--host` 参数动态生成正确的API地址
- **影响**: 解决了 `ERR_CONNECTION_REFUSED` 错误

### 动态配置生成
- **绑定所有接口** (`--host 0.0.0.0`): 前端使用相对路径，自动适配访问地址
- **绑定特定地址**: 前端使用指定的主机地址和端口

## 📝 技术细节

### 修复前的问题
```javascript
// 错误的硬编码配置
window.__RUNTIME_CONFIG__ = {
  API_BASE_URL: 'http://localhost:8000/api',  // ❌ 硬编码localhost
  WS_BASE_URL: 'ws://localhost:8000/api',     // ❌ 硬编码localhost
  PORT: 8000
};
```

### 修复后的配置
```javascript
// 正确的动态配置（--host 0.0.0.0）
window.__RUNTIME_CONFIG__ = {
  API_BASE_URL: '/api',  // ✅ 相对路径，自动适配
  WS_BASE_URL: (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/api',
  PORT: 8000
};
```

## 🌐 局域网访问场景

### 服务器部署
1. **启动服务**: `./open-adventure --host 0.0.0.0 --port 8000`
2. **本地访问**: `http://localhost:8000`
3. **局域网访问**: `http://[服务器IP]:8000`

### 前端自动适配
- 通过 `localhost` 访问时，API请求发送到 `localhost:8000`
- 通过局域网IP访问时，API请求发送到 `[局域网IP]:8000`
- WebSocket连接自动使用正确的协议和地址

## 🔍 验证方法

### 测试局域网访问
1. 在服务器上启动: `./open-adventure --host 0.0.0.0`
2. 从其他设备访问: `http://[服务器IP]:8000`
3. 检查浏览器控制台，应该没有连接错误
4. 验证API调用正常工作

### 错误排查
- **连接被拒绝**: 检查防火墙设置，确保端口开放
- **404错误**: 确认服务器IP地址正确
- **WebSocket错误**: 检查网络代理设置

## 兼容性说明

- ✅ 向后兼容，无破坏性变更
- ✅ 本地开发环境不受影响
- ✅ 支持HTTPS部署（自动使用WSS协议）
- ✅ 支持自定义端口和主机地址

## 部署建议

### 推荐启动参数
```bash
# 局域网部署（推荐）
./open-adventure --host 0.0.0.0 --port 8000

# 指定端口避免冲突
./open-adventure --host 0.0.0.0 --port 8080

# 后台运行
./open-adventure --host 0.0.0.0 --daemon
```

### 网络配置
- 确保防火墙允许指定端口的入站连接
- 路由器需要配置端口转发（如需外网访问）
- 企业网络可能需要IT部门配置

## 已知问题

无

## 下载链接

- macOS ARM64: `open_adventure-v1.3.8-macos-arm64.tar.gz`
- Linux 兼容版: `open_adventure-v1.3.8-linux-x86_64-compat.tar.gz` (推荐)
- Linux 最新版: `open_adventure-v1.3.8-linux-x86_64-latest.tar.gz`

## 感谢

感谢用户反馈局域网访问问题，这个修复确保了跨设备协作的完整体验。
