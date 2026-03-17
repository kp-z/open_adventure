# Release Notes - v1.3.9

**发布日期**: 2026-03-17

## 本次更新重点

本次更新主要修复了二进制打包依赖问题，优化了 Microverse 角色动画渲染，并修复了 Dashboard 和 Notification 相关错误。同时新增了 Agent 框架和计划生成功能，实现了完整的 tmux 会话管理。

## 🔴 严重问题修复

- **二进制打包依赖问题**: 修复了 PyInstaller 打包时缺少关键依赖的问题，确保二进制版本可以独立运行
- **Dashboard 和 Notification 错误**: 修复了 Dashboard 页面和通知组件的多个关键错误

## 🟡 中等问题修复

- **Microverse 角色动画透明度**: 修复了角色动画渲染时的透明度问题，提升视觉效果
- **子模块引用更新**: 更新了 microverse 子模块的引用，确保版本一致性

## ✨ 新增功能

- **Agent 框架**: 实现了完整的 Agent 框架，支持智能体的创建、管理和执行
- **计划生成功能**: 新增了自动生成执行计划的功能，优化任务规划流程
- **tmux 会话管理**: 实现了完整的 tmux 会话管理功能，支持终端会话的创建、切换和管理
- **项目路径管理**: 新增了项目路径管理 API，方便管理多个项目

## 📝 文档更新

- 更新了 `.gitignore`，移除了运行时生成的文件
- 新增了 `AGENTS.md` 文档，详细说明了 Agent 框架的使用方法

## 技术改进

- 优化了前端架构，提升了代码可维护性
- 改进了 WebSocket 连接管理，提升了实时通信的稳定性
- 优化了数据库迁移脚本，新增了多个数据模型

## 已知问题

无

## 升级指南

本次更新为补丁版本，无破坏性变更。直接替换旧版本即可。

### 二进制版本升级

```bash
# 1. 停止旧版本（如果在后台运行）
kill $(cat ~/.open_adventure/open_adventure.pid)

# 2. 下载新版本
wget https://github.com/kp-z/open_adventure/releases/download/v1.3.9/open-adventure-v1.3.9-macos-arm64.tar.gz

# 3. 解压并运行
tar -xzf open-adventure-v1.3.9-macos-arm64.tar.gz
cd open-adventure
./open-adventure --daemon
```

### 源码版本升级

```bash
# 1. 拉取最新代码
git pull origin main
git checkout v1.3.9

# 2. 更新依赖
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# 3. 运行数据库迁移
cd ../backend && alembic upgrade head

# 4. 重启服务
cd .. && ./start.sh
```

## 平台支持

- macOS ARM64 (Apple Silicon)
- Linux x86_64 (兼容版 - Ubuntu 22.04+, Debian 11+, CentOS Stream 8+)
- Linux x86_64 (最新版 - Ubuntu 24.04+, Debian 13+)

## 下载链接

- [macOS ARM64](https://github.com/kp-z/open_adventure/releases/download/v1.3.9/open-adventure-v1.3.9-macos-arm64.tar.gz)
- [Linux x86_64 (兼容版)](https://github.com/kp-z/open_adventure/releases/download/v1.3.9/open-adventure-v1.3.9-linux-x86_64-compat.tar.gz)
- [Linux x86_64 (最新版)](https://github.com/kp-z/open_adventure/releases/download/v1.3.9/open-adventure-v1.3.9-linux-x86_64-latest.tar.gz)
