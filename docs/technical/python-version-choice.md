# Python 版本选择说明

## 为什么统一使用 Python 3.11？

### 之前的配置（已废弃）

- **macOS ARM64**: Python 3.11
- **Linux Latest (Ubuntu 24.04)**: Python 3.12
- **Linux Compat (Ubuntu 20.04)**: Python 3.8 ❌

### 问题

1. **不一致性**：三个平台使用不同的 Python 版本
2. **性能差异**：Python 3.8 比 3.11 慢 10-60%
3. **维护成本**：需要确保代码在多个 Python 版本下都能正常工作

### 新配置（推荐）

- **所有平台**: Python 3.11 ✅

### 为什么可以这样做？

#### 1. GLIBC 兼容性 ≠ Python 版本兼容性

- **GLIBC 兼容性**：由构建环境决定
  - 在 Ubuntu 20.04 容器中构建 → 兼容 GLIBC 2.31+
  - 在 Ubuntu 24.04 容器中构建 → 兼容 GLIBC 2.38+

- **Python 版本**：由打包时使用的 Python 决定
  - PyInstaller 会将 Python 解释器嵌入到二进制文件中
  - 用户运行时使用的是嵌入的 Python，不是系统的 Python

#### 2. PyInstaller 的工作原理

```
打包时：
  Python 3.11 + 你的代码 + 依赖库 → 二进制文件（包含 Python 3.11 解释器）

运行时：
  用户系统（任何 Python 版本或无 Python）→ 运行二进制文件 → 使用嵌入的 Python 3.11
```

#### 3. 实际效果

| 构建环境 | Python 版本 | GLIBC 版本 | 兼容系统 |
|---------|------------|-----------|---------|
| Ubuntu 20.04 容器 | Python 3.11 | GLIBC 2.31 | Ubuntu 20.04+, Debian 11+, CentOS Stream 8+ |
| Ubuntu 24.04 容器 | Python 3.11 | GLIBC 2.38 | Ubuntu 24.04+, Debian 13+, Fedora 39+ |
| macOS latest | Python 3.11 | N/A | macOS 11.0+ |

### 优点

1. **一致性**：所有平台使用相同的 Python 版本
2. **性能**：Python 3.11 比 3.8 快 10-60%
3. **简化维护**：只需确保代码在 Python 3.11 下工作
4. **更好的类型支持**：Python 3.11 的类型系统更完善

### 为什么之前用 Python 3.8？

**误解**：以为在 Ubuntu 20.04 容器中必须用 Python 3.8 才能兼容 Ubuntu 20.04 系统

**真相**：
- GLIBC 兼容性由构建环境决定（Ubuntu 20.04 → GLIBC 2.31）
- Python 版本可以自由选择（通过 deadsnakes PPA 安装任何版本）
- PyInstaller 会将 Python 解释器嵌入，用户不需要安装 Python

### 实现方式

在 Ubuntu 20.04 容器中安装 Python 3.11：

```bash
# 添加 deadsnakes PPA
add-apt-repository ppa:deadsnakes/ppa -y
apt-get update

# 安装 Python 3.11
apt-get install -y python3.11 python3.11-venv python3.11-dev

# 使用 Python 3.11 构建
python3.11 -m venv venv
. venv/bin/activate
pyinstaller open_adventure.spec --clean
```

### 结论

**统一使用 Python 3.11 是最佳选择**：
- ✅ 保持 GLIBC 兼容性（Ubuntu 20.04 容器 → GLIBC 2.31）
- ✅ 获得更好的性能（Python 3.11）
- ✅ 简化维护（单一 Python 版本）
- ✅ 用户体验一致（所有平台相同的 Python 版本）

## 参考资料

- [PyInstaller 文档](https://pyinstaller.org/en/stable/)
- [Python 3.11 性能改进](https://docs.python.org/3/whatsnew/3.11.html#summary-release-highlights)
- [Deadsnakes PPA](https://launchpad.net/~deadsnakes/+archive/ubuntu/ppa)
