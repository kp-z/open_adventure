# TODO List

## 配置和路径问题

### 🔴 高优先级

#### 1. 数据库路径使用相对路径
**位置**: `backend/app/config/settings.py:26`

**当前代码**:
```python
database_url: str = "sqlite+aiosqlite:///./open_adventure.db"
```

**问题**:
- 如果从不同目录启动后端，会在不同位置创建数据库文件
- 用户数据可能分散在多个数据库中

**建议修复**:
```python
# 使用项目根目录的绝对路径
import os
from pathlib import Path

# 获取项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent
database_url: str = f"sqlite+aiosqlite:///{PROJECT_ROOT}/backend/open_adventure.db"
```

**影响范围**: 数据库文件位置
**修复难度**: 简单
**预计时间**: 10 分钟

---

### 🟡 中优先级

#### 2. 插件安装脚本的路径依赖
**位置**: `scripts/install_plugins.sh:10`

**当前代码**:
```bash
MARKETPLACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.claude/plugins/marketplace-plugins/$PLUGIN_NAME"
```

**问题**:
- 依赖脚本的相对位置
- 如果从其他位置调用脚本，路径可能失效

**建议修复**:
```bash
# 获取项目根目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MARKETPLACE_DIR="$PROJECT_ROOT/.claude/plugins/marketplace-plugins/$PLUGIN_NAME"
```

**影响范围**: 插件安装功能
**修复难度**: 简单
**预计时间**: 5 分钟

---

## 检查日期

- **创建时间**: 2026-03-05
- **最后更新**: 2026-03-05
- **检查人**: Claude Opus 4.6

---

## 备注

- CLAUDE.md 中的路径是开发文档，不需要修复
- 端口配置已有交互式选择机制，不需要修复
- Claude 配置目录符合标准，不需要修复
- 前端 API 配置已支持环境变量，不需要修复
