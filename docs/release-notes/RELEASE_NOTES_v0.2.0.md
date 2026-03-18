# Release Notes v0.2.0

**发布日期**：2026-03-18（预计）

## 本次更新重点

本次更新主要修复 Linux 环境下的运行错误，并提供自动升级功能。

## 🔴 严重问题修复

### 数据库 Schema 不匹配错误
- **问题**：Linux 环境下数据库迁移失败，导致 API 500 错误
- **错误信息**：`sqlite3.OperationalError: no such column: executions.process_pid`
- **影响范围**：
  - `GET /api/executions/` - 执行历史列表
  - `GET /api/dashboard/stats` - Dashboard 统计
  - Agent Monitor Service - 后台监控服务
- **修复方案**：
  - 修复迁移文件中的 SQLite 兼容性问题
  - 使用 `batch_alter_table` 添加外键约束
  - 启用自动迁移功能
- **用户操作**：使用 `./scripts/upgrade.sh` 自动升级

## 🟡 中等问题修复

### Godot 游戏界面 404 错误
- **问题**：Microverse 游戏资源缺失
- **错误信息**：`GET /microverse/index.html HTTP/1.1 404 Not Found`
- **修复方案**：
  - 启动时自动检查关键目录
  - 自动重新复制缺失的前端资源
- **用户操作**：重启应用即可自动修复

## ✨ 新增功能

### 自动升级脚本
- **功能**：一键升级到最新版本
- **使用方法**：`./scripts/upgrade.sh`
- **特性**：
  - ✅ 自动检测最新版本
  - ✅ 自动检测平台（macOS/Linux 兼容版/Linux 最新版）
  - ✅ 自动备份数据和应用
  - ✅ 自动下载并安装新版本
  - ✅ 失败时自动回滚

### 自动数据库迁移
- **功能**：启动时自动执行数据库迁移
- **特性**：
  - ✅ 自动检查数据库版本
  - ✅ 自动执行必要的迁移
  - ✅ 失败时回退到 `create_all()`
- **用户操作**：无需手动操作，启动时自动执行

## 📝 文档更新

- ✅ 新增 `docs/UPGRADE_GUIDE.md` - 升级指南
- ✅ 新增 `docs/technical/20260317-07-Linux运行错误修复.md` - 技术文档
- ✅ 新增 `docs/troubleshooting/linux-runtime-errors.md` - 故障排查指南

## 升级指南

### 从 v0.1.0 升级到 v0.2.0

**推荐方法**（自动升级）：
```bash
./scripts/upgrade.sh
```

**手动升级**：
1. 停止服务：`./stop.sh`
2. 备份数据：`cp -r ~/.open_adventure ~/.open_adventure.backup`
3. 下载新版本：
   - macOS ARM64: `open-adventure-v0.2.0-macos-arm64.tar.gz`
   - Linux 兼容版: `open-adventure-v0.2.0-linux-x86_64-compat.tar.gz`
   - Linux 最新版: `open-adventure-v0.2.0-linux-x86_64-latest.tar.gz`
4. 解压并替换：`tar -xzf open-adventure-v0.2.0-*.tar.gz`
5. 启动服务：`./start.sh`（会自动迁移数据库）

### Linux 版本选择

- **兼容版**（`linux-x86_64-compat`）：推荐，支持 Ubuntu 20.04+、Debian 11+、CentOS Stream 8+
- **最新版**（`linux-x86_64-latest`）：仅适合 Ubuntu 24.04+、Debian 13+、Fedora 39+

## 已知问题

无

## 破坏性变更

无

## 版本兼容性

- ✅ 支持从 v0.1.0 直接升级到 v0.2.0
- ✅ 数据库自动迁移，无需手动操作
- ✅ 用户数据完全兼容

## 获取帮助

- 📖 [完整文档](https://github.com/kp-z/open_adventure/wiki)
- 🐛 [报告问题](https://github.com/kp-z/open_adventure/issues)
- 💬 [讨论区](https://github.com/kp-z/open_adventure/discussions)

---

**发布时间**：2026-03-18（预计）
**下载地址**：https://github.com/kp-z/open_adventure/releases/tag/v0.2.0
