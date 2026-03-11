# Release Notes v1.3.7

**发布日期**: 2026-03-11
**版本**: v1.3.7

## 本次更新重点

本版本主要验证和确认了Linux版本二进制文件的局域网访问功能，确保跨平台部署的完整性。

## ✅ 功能验证

- **Linux版本二进制验证**: 全面测试Linux版本在Docker环境下的运行稳定性
- **局域网访问功能确认**: 验证Linux版本支持局域网IP访问前后端服务
- **跨平台兼容性测试**: 确认macOS和Linux版本功能一致性

## 🔧 技术改进

- **网络绑定优化**: 确认Linux版本正确绑定到 `0.0.0.0`，支持所有网络接口
- **Docker部署验证**: 在Ubuntu 20.04环境下完整测试部署流程
- **API接口测试**: 验证所有关键API在Linux环境下正常工作

## 📝 验证结果

### Linux版本功能验证
- ✅ 二进制文件正常启动和运行
- ✅ 前端页面通过局域网IP正常访问
- ✅ 后端API通过局域网IP正常响应
- ✅ 健康检查接口返回正确状态
- ✅ WebSocket和Terminal功能正常初始化

### 网络访问测试
- ✅ 本地访问: `http://localhost:8000`
- ✅ 局域网访问: `http://[服务器IP]:8000`
- ✅ API接口: `http://[服务器IP]:8000/api`
- ✅ 访问日志正确记录

## 部署建议

### Linux服务器部署
1. 下载对应的Linux版本（兼容版或最新版）
2. 解压到目标目录
3. 设置执行权限: `chmod +x open-adventure`
4. 启动服务: `./open-adventure --host 0.0.0.0`
5. 通过局域网IP访问: `http://[服务器IP]:8000`

### 推荐配置
- **兼容版**: 适合Ubuntu 20.04+、CentOS 8+等主流发行版
- **最新版**: 适合Ubuntu 24.04+等最新系统
- **端口**: 默认8000，可通过 `--port` 参数修改
- **后台运行**: 使用 `--daemon` 参数

## 兼容性说明

- 本版本向后兼容，无破坏性变更
- Linux版本经过Docker环境完整验证
- 支持局域网多设备访问

## 已知问题

无

## 下载链接

- macOS ARM64: `open_adventure-v1.3.7-macos-arm64.tar.gz`
- Linux 兼容版: `open_adventure-v1.3.7-linux-x86_64-compat.tar.gz` (推荐)
- Linux 最新版: `open_adventure-v1.3.7-linux-x86_64-latest.tar.gz`

## 感谢

感谢对Linux版本局域网访问功能的关注，确保了跨平台部署的完整性和可靠性。
