# Release Notes - v1.2.1

**发布日期**: 2026-03-02

## 本次更新重点

本次更新主要修复了版本控制和云端部署的关键问题，提升了系统的稳定性和可维护性。

## 🔴 严重问题修复

### 删除 frontend 嵌套 Git 仓库
- **问题**: frontend 目录包含独立的 `.git` 目录，导致主项目无法正确跟踪 frontend 的修改
- **影响**: 版本控制混乱，提交和推送时容易出错
- **修复**: 删除 `frontend/.git` 目录，将 frontend 完全整合到主项目
- **结果**: 版本控制统一，主项目可以正确跟踪所有修改

### LAN IP 检测失败修复
- **问题**: `start.sh` 中的 LAN IP 检测逻辑在某些网络环境下失败
- **影响**: 云端部署时无法正确获取局域网 IP，导致服务无法访问
- **修复**:
  - 优化 IP 检测逻辑，支持多种网络接口（en0, eth0, wlan0）
  - 添加 IP 格式验证，确保获取的是有效的 IPv4 地址
  - 改进错误处理和日志输出
- **结果**: 云端部署更加稳定，支持更多网络环境

## 🟡 中等问题修复

### 启动脚本优化
- 改进 `start.sh` 的网络检测逻辑
- 添加更详细的日志输出，便于问题排查
- 优化进程管理，确保服务正常启动和停止

## 📝 文档更新

### 新增文档
- `docs/technical/20260302-01-LAN-IP检测失败修复.md` - LAN IP 检测问题的详细分析和修复方案
- `docs/technical/20260302-cloud-access-fix.md` - 云端访问问题修复总结
- `docs/technical/LAN-IP-FIX-SUMMARY.md` - LAN IP 修复的快速参考
- `docs/troubleshooting/cloud-access-issues.md` - 云端访问问题排查指南

### 更新文档
- `docs/README_INDEX.md` - 更新文档索引
- `docs/deployment/linux-cloud.md` - 更新云端部署指南

### 新增脚本
- `scripts/fix-cloud-access.sh` - 云端访问问题自动修复脚本
- `scripts/verify-lan-ip-fix.sh` - LAN IP 修复验证脚本

## 升级指南

### 从 v1.2.0 升级

1. 拉取最新代码：
   ```bash
   git pull origin main
   ```

2. 重新安装依赖（如有更新）：
   ```bash
   cd frontend && npm install
   ```

3. 重启服务：
   ```bash
   ./start.sh
   ```

### 注意事项

- 如果你的 frontend 目录有独立的 `.git`，升级后会被删除
- 云端部署的用户会自动受益于新的 IP 检测逻辑
- 建议在升级前备份数据库文件

## 已知问题

无

## 技术细节

### 版本控制改进
- frontend 目录不再是独立的 git 仓库
- 所有修改统一由主项目跟踪
- 简化了提交和推送流程

### 网络检测改进
- 支持多种网络接口：en0（macOS）、eth0/wlan0（Linux）
- 添加 IP 格式验证（192.168.x.x, 10.x.x.x, 172.16-31.x.x）
- 改进错误处理，提供更清晰的错误信息

## 贡献者

- Claude Opus 4.6 (1M context)

---

**完整变更日志**: https://github.com/kp-z/open_adventure/compare/v1.2.0...v1.2.1
