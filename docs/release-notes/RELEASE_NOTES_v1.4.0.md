# Open Adventure v1.4.0 Release Notes

**发布日期**: 2026-03-18

## 本次更新重点

本次更新主要聚焦于 Microverse 游戏集成、测试框架完善、以及多项关键 Bug 修复，显著提升了系统的稳定性和可用性。

---

## 🔴 严重问题修复

### Python 3.8 兼容性
- **修复 Linux 兼容版启动失败问题**：修复了 Python 3.8 环境下的类型注解兼容性问题
  - 将 PEP 604 新式类型注解（`type | None`）改为 `Optional[type]`
  - 将 `tuple[T1, T2]` 改为 `Tuple[T1, T2]`
  - 影响文件：`backend/app/core/tag_definitions.py`、`backend/app/database/migration.py`
  - 现在支持 Python 3.8+ 的所有版本

### Godot 游戏相关
- **修复 Godot 游戏角色无法选中问题**：解决了点击游戏角色无响应的严重 Bug
- **修复 Agent 对话系统**：修复了对话气泡资源缺失导致的对话功能失效
- **修复 Godot 缓存问题**：解决了游戏更新后仍加载旧版本的缓存问题
- **修复 Linux 运行错误**：解决了 Linux 系统下的多个运行时错误

### 前端核心功能
- **修复 HTTP 请求并发问题**：解决了前端 HTTP 请求并发导致的数据不一致问题
- **修复前端资源目录缺失**：添加了缺失的 avatars 静态资源

---

## 🟡 中等问题修复

### 初始化和加载
- **统一加载界面实现**：统一了前后端的加载界面，提升用户体验
- **修复初始化加载界面**：解决了初始化时加载界面显示异常的问题

### 端口和配置
- **添加端口占用检查**：启动前自动检查端口占用，避免启动失败
- **端口配置统一说明**：统一了前后端端口配置文档

---

## ✨ 新增功能

### Microverse 游戏集成
- **Godot 游戏文件打包**：支持自动打包和部署 Godot 游戏文件
- **游戏加载日志功能**：添加了游戏加载过程的详细日志记录
- **ControlHintsPanel 实现**：新增游戏控制提示面板

### 测试框架
- **测试模块实现**：添加了完整的测试框架和测试用例
- **测试 Agent 绑定功能**：支持将测试用例绑定到特定 Agent
- **测试树初始化脚本**：提供了测试数据初始化工具

### Console 日志监控
- **Console 日志监控功能**：新增实时 Console 日志监控和展示
- **日志验证脚本**：提供了日志功能验证工具

### 开发工具
- **DevCheck 页面**：新增开发检查页面，方便开发调试
- **Testing 页面**：新增测试管理页面
- **升级脚本**：提供了系统升级工具

---

## 📝 文档更新

### 技术文档（20+ 篇）
- ControlHintsPanel 实现文档
- 二进制应用升级方案
- 初始化加载界面修复文档
- 加载界面日志对比分析
- 游戏加载日志功能实现
- 统一加载界面实现
- Godot 游戏 Agent 选取修复
- Linux 运行错误修复系列文档
- 端口统一说明
- 测试模块实现文档
- Godot 缓存问题修复
- Godot 游戏无法选中问题调试
- Godot 游戏角色选中和 Agent 对话修复
- Agent 对话系统修复
- 对话气泡修复总结
- Console 日志监控功能实现
- 今日修复总结
- HTTP 修复报告

### 使用指南
- Console 日志监控指南
- Console 日志演示
- 前端测试指南
- Godot 快速开始指南
- 测试 Agent 绑定功能指南
- Microverse 集成指南更新
- LAN 访问配置更新
- 端口配置指南更新

### 故障排查
- 对话气泡修复验证
- Godot 缓存修复测试指南
- Linux 运行错误排查

### 其他
- 升级指南（UPGRADE_GUIDE.md）
- 文档索引更新（README_INDEX.md）

---

## 🔧 技术改进

### 数据库
- 添加测试相关数据表迁移
- 优化数据库迁移脚本

### API
- 新增日志 API 路由（`/api/logs`）
- 新增测试 API 路由（`/api/testing`）

### 前端组件
- 新增 InitializationScreen 组件
- 新增 LoadingScreen 组件
- 优化 Layout 组件
- 优化 Microverse 页面
- 优化 Settings 页面

### 构建和部署
- 优化 Vite 配置
- 更新启动脚本（start.sh）
- 添加多个验证脚本

---

## 📦 发布包说明

本次发布提供以下平台的二进制包：

### macOS ARM64
- 文件名：`open-adventure-v1.4.0-macos-arm64.tar.gz`
- 适用系统：macOS 11.0+ (Apple Silicon)

### Linux x86_64（兼容版）
- 文件名：`open-adventure-v1.4.0-linux-x86_64-compat.tar.gz`
- 适用系统：Ubuntu 20.04+、Debian 11+、CentOS Stream 8+、Fedora 32+
- GLIBC 版本：2.31+

### Linux x86_64（最新版）
- 文件名：`open-adventure-v1.4.0-linux-x86_64-latest.tar.gz`
- 适用系统：Ubuntu 24.04+、Debian 13+、Fedora 39+
- GLIBC 版本：2.38+

---

## 🚀 升级指南

### 从 v1.3.x 升级

1. **备份数据**（重要）
   ```bash
   cp backend/open_adventure.db backend/open_adventure.db.backup
   ```

2. **下载新版本**
   ```bash
   # macOS
   wget https://github.com/kp-z/open_adventure/releases/download/v1.4.0/open-adventure-v1.4.0-macos-arm64.tar.gz

   # Linux（兼容版，推荐）
   wget https://github.com/kp-z/open_adventure/releases/download/v1.4.0/open-adventure-v1.4.0-linux-x86_64-compat.tar.gz

   # Linux（最新版）
   wget https://github.com/kp-z/open_adventure/releases/download/v1.4.0/open-adventure-v1.4.0-linux-x86_64-latest.tar.gz
   ```

3. **解压并替换**
   ```bash
   tar -xzf open-adventure-v1.4.0-*.tar.gz
   cd open-adventure
   ```

4. **运行数据库迁移**
   ```bash
   # 如果使用二进制版本
   ./open-adventure migrate

   # 如果使用源码版本
   cd backend
   source venv/bin/activate
   alembic upgrade head
   ```

5. **启动服务**
   ```bash
   ./start.sh
   ```

### 破坏性变更

本次更新无破坏性变更，可以直接升级。

---

## ⚠️ 已知问题

1. **Microverse 游戏性能**：在低配置设备上可能存在性能问题
2. **测试框架**：部分测试用例仍在完善中

**注意**：v1.4.0 初始版本存在 Python 3.8 兼容性问题，已在后续提交中修复。如果您下载的是最新版本，此问题已解决。

---

## 📊 统计信息

- **新增文件**：60+ 个
- **修改文件**：20+ 个
- **新增文档**：30+ 篇
- **修复 Bug**：15+ 个
- **新增功能**：10+ 个

---

## 🙏 致谢

感谢所有贡献者和测试人员的支持！

---

## 📞 反馈和支持

如遇到问题，请访问：
- GitHub Issues: https://github.com/kp-z/open_adventure/issues
- 文档中心: `docs/README_INDEX.md`
