# Release Notes - v1.3.3

**发布日期**: 2026-03-08

## 本次更新重点

修复了 Linux 兼容版（Ubuntu 20.04）打包运行时的严重兼容性问题，确保所有平台都能正常启动和运行。

---

## 🔴 严重问题修复

### Python 3.8 类型注解兼容性问题
- **问题描述**: Linux 兼容版（Ubuntu 20.04，Python 3.8）打包后启动时报错 `TypeError: 'type' object is not subscriptable`
- **根本原因**: 代码中使用了 Python 3.9+ 的新式类型注解语法（`list[str]`, `dict[str, Any]` 等），在 Python 3.8 环境下不支持
- **修复方案**: 在所有使用新式类型注解的文件中添加 `from __future__ import annotations`，实现延迟解析
- **影响范围**: 修复了 25 个核心文件，包括：
  - 配置模块（settings.py）
  - 数据模型（models/）
  - 数据模式（schemas/）
  - 仓储层（repositories/）
  - 服务层（services/）
  - API 路由（api/routers/）
- **测试验证**: 添加了自动化测试脚本 `scripts/test_imports.py`，确保所有模块能正常导入

---

## 🛠️ 工具改进

### 新增开发工具脚本
- **fix_type_annotations.py**: 批量修复类型注解兼容性的工具脚本
- **test_imports.py**: 测试所有关键模块是否能正常导入的验证脚本

---

## 📝 技术说明

### Python 版本兼容性
- **支持版本**: Python 3.8+
- **推荐版本**: Python 3.10+
- **技术细节**:
  - `list[str]` 等语法是 Python 3.9+ 的 PEP 585 特性
  - PyInstaller 打包时会在导入阶段解析类型注解
  - 使用 `from __future__ import annotations` 可以延迟解析，实现向后兼容

### 平台支持
- **macOS ARM64**: ✅ 完全支持（Python 3.11）
- **Linux 兼容版**: ✅ 修复完成（Ubuntu 20.04, Python 3.8）
- **Linux 最新版**: ✅ 完全支持（Ubuntu 24.04, Python 3.10+）

---

## 📦 下载说明

本次发布包含 3 个平台的二进制包：

1. **macOS ARM64 版本**
   - 文件名: `open_adventure-v1.3.3-macos-arm64.tar.gz`
   - 适用系统: macOS 11.0+ (Apple Silicon)

2. **Linux 兼容版**（推荐）
   - 文件名: `open_adventure-v1.3.3-linux-x86_64-compat.tar.gz`
   - 适用系统: Ubuntu 20.04+, Debian 11+, CentOS Stream 8+, Fedora 32+
   - GLIBC 版本: 2.31+

3. **Linux 最新版**
   - 文件名: `open_adventure-v1.3.3-linux-x86_64-latest.tar.gz`
   - 适用系统: Ubuntu 24.04+, Debian 13+, Fedora 39+
   - GLIBC 版本: 2.38+

---

## 🚀 安装和使用

### 下载并解压
```bash
# 下载对应平台的压缩包
wget https://github.com/kp-z/open_adventure/releases/download/v1.3.3/open_adventure-v1.3.3-{平台}.tar.gz

# 解压
tar -xzf open_adventure-v1.3.3-{平台}.tar.gz

# 进入目录
cd open-adventure
```

### 启动应用
```bash
./start.sh
```

应用将在以下地址启动：
- 前端: http://localhost:5173
- 后端 API: http://localhost:8000

---

## ⚠️ 已知问题

无

---

## 🔄 升级指南

从 v1.3.2 或更早版本升级：

1. 下载新版本压缩包
2. 解压到新目录
3. 运行 `./start.sh` 启动
4. 数据库会自动迁移（如有变更）

**注意**: 本次更新无破坏性变更，可以直接升级。

---

## 📊 版本统计

- **修复文件数**: 25 个
- **新增脚本**: 2 个
- **支持 Python 版本**: 3.8+
- **支持平台**: macOS ARM64, Linux x86_64

---

## 🙏 致谢

感谢所有用户的反馈和支持！

如有问题或建议，请访问: https://github.com/kp-z/open_adventure/issues
