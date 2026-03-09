# Release Notes - v1.3.4

**发布日期**: 2026-03-09

## 本次更新重点

彻底修复了 Pydantic 模型在 Python 3.8 环境下的类型注解兼容性问题，确保 Linux 兼容版（Ubuntu 20.04）能够正常启动和运行。

---

## 🔴 严重问题修复

### Pydantic 模型类型注解兼容性问题
- **问题描述**: v1.3.3 虽然添加了 `from __future__ import annotations`，但 Pydantic 模型在 Python 3.8 环境下仍然报错 `TypeError: Unable to evaluate type annotation 'list[str]'`
- **根本原因**:
  - `from __future__ import annotations` 只能延迟类型注解的解析
  - 但 Pydantic 需要在运行时真正解析类型注解来构建验证逻辑
  - 在 Python 3.8 环境下，`list[str]` 语法根本不存在，Pydantic 的 `get_model_type_hints()` 会失败
- **修复方案**: 将所有 Pydantic 模型中的新式类型注解改为旧式类型
  - `list[str]` → `typing.List[str]`
  - `dict[str, Any]` → `typing.Dict[str, Any]`
  - `tuple[...]` → `typing.Tuple[...]`
  - `set[...]` → `typing.Set[...]`
- **影响范围**: 修复了 10 个 Pydantic 模型文件：
  - `app/config/settings.py` (BaseSettings)
  - `app/schemas/skill.py`
  - `app/schemas/task.py`
  - `app/schemas/project_path.py`
  - `app/schemas/agent_team.py`
  - `app/schemas/agent.py`
  - `app/schemas/plugin.py`
  - `app/schemas/process.py`
  - `app/schemas/workflow.py`
  - `app/api/routers/claude.py`

---

## 🛠️ 工具改进

### 新增开发工具脚本
- **fix_pydantic_types.py**: 自动检测和修复 Pydantic 模型中的类型注解兼容性问题
- **test_imports.py**: 验证所有关键模块能否正常导入

---

## 📝 技术说明

### 为什么 v1.3.3 的修复不够？

v1.3.3 添加了 `from __future__ import annotations`，这对普通函数和类是有效的，但对 Pydantic 模型不够：

```python
# ❌ v1.3.3 的方案 - 对 Pydantic 无效
from __future__ import annotations
from pydantic import BaseModel

class MyModel(BaseModel):
    items: list[str]  # Python 3.8 仍然会报错！

# ✅ v1.3.4 的方案 - 正确
from __future__ import annotations
from typing import List
from pydantic import BaseModel

class MyModel(BaseModel):
    items: List[str]  # 兼容 Python 3.8+
```

### Python 版本兼容性
- **支持版本**: Python 3.8+
- **推荐版本**: Python 3.10+
- **技术细节**:
  - Pydantic 在运行时需要真正解析类型注解
  - `from __future__ import annotations` 只是延迟解析，不能让 Python 3.8 理解 3.9+ 的语法
  - 必须使用 `typing` 模块的类型才能真正兼容

### 平台支持
- **macOS ARM64**: ✅ 完全支持（Python 3.11）
- **Linux 兼容版**: ✅ 修复完成（Ubuntu 20.04, Python 3.8）
- **Linux 最新版**: ✅ 完全支持（Ubuntu 24.04, Python 3.10+）

---

## 📦 下载说明

本次发布包含 3 个平台的二进制包：

1. **macOS ARM64 版本**
   - 文件名: `open_adventure-v1.3.4-macos-arm64.tar.gz`
   - 适用系统: macOS 11.0+ (Apple Silicon)

2. **Linux 兼容版**（推荐）
   - 文件名: `open_adventure-v1.3.4-linux-x86_64-compat.tar.gz`
   - 适用系统: Ubuntu 20.04+, Debian 11+, CentOS Stream 8+, Fedora 32+
   - GLIBC 版本: 2.31+

3. **Linux 最新版**
   - 文件名: `open_adventure-v1.3.4-linux-x86_64-latest.tar.gz`
   - 适用系统: Ubuntu 24.04+, Debian 13+, Fedora 39+
   - GLIBC 版本: 2.38+

---

## 🚀 安装和使用

### 下载并解压
```bash
# 下载对应平台的压缩包
wget https://github.com/kp-z/open_adventure/releases/download/v1.3.4/open_adventure-v1.3.4-{平台}.tar.gz

# 解压
tar -xzf open_adventure-v1.3.4-{平台}.tar.gz

# 进入目录
cd open-adventure
```

### 启动应用
```bash
# 前台运行
./open-adventure

# 后台运行（推荐用于服务器）
./open-adventure --daemon

# 查看后台服务状态
cat ~/.open_adventure/open_adventure.pid
tail -f ~/.open_adventure/open_adventure.log

# 停止后台服务
kill $(cat ~/.open_adventure/open_adventure.pid)
```

应用将在以下地址启动：
- 前端: http://localhost:5173
- 后端 API: http://localhost:8000

---

## ⚠️ 已知问题

无

---

## 🔄 升级指南

从 v1.3.3 或更早版本升级：

1. 下载新版本压缩包
2. 解压到新目录
3. 运行 `./open-adventure` 启动
4. 数据库会自动迁移（如有变更）

**注意**: 本次更新无破坏性变更，可以直接升级。

---

## 📚 相关文档

- [Python 3.8 兼容性问题详解](../technical/python38-compatibility-fix.md)
- [后台模式使用指南](../guides/daemon-mode-guide.md)

---

## 📊 版本统计

- **修复文件数**: 10 个 Pydantic 模型
- **新增脚本**: 1 个
- **新增文档**: 2 个
- **支持 Python 版本**: 3.8+
- **支持平台**: macOS ARM64, Linux x86_64

---

## 🙏 致谢

感谢所有用户的反馈和支持！特别感谢报告 Python 3.8 兼容性问题的用户。

如有问题或建议，请访问: https://github.com/kp-z/open_adventure/issues
