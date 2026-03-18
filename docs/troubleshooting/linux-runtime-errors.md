# Linux 运行错误 - 用户临时解决方案

## 问题描述

在 Linux 服务器上运行 Open Adventure v0.1.0 时遇到以下错误：

1. **数据库错误**：`sqlite3.OperationalError: no such column: executions.process_pid`
2. **Godot 界面 404**：`GET /microverse/index.html HTTP/1.1 404 Not Found`

## 临时解决方案

### 方案 1：删除旧数据库（推荐，但会丢失数据）

```bash
# 1. 停止服务
./stop.sh

# 2. 备份数据（可选）
cp -r ~/.open_adventure ~/.open_adventure.backup

# 3. 删除旧数据库
rm ~/.open_adventure/open_adventure.db

# 4. 重启服务（会自动创建新数据库）
./start.sh
```

### 方案 2：等待下个版本（推荐，保留数据）

下个版本（v0.2.0）将包含：
- ✅ 修复的数据库迁移文件
- ✅ 自动升级脚本
- ✅ 完整的升级指南

**发布时间**：预计 2026-03-18

**升级方法**：
```bash
./scripts/upgrade.sh
```

## 验证修复

修复后，验证以下功能：

```bash
# 1. 检查 API
curl http://localhost:38080/api/executions/
curl http://localhost:38080/api/dashboard/stats

# 2. 检查 Microverse
curl http://localhost:38080/microverse/index.html
```

## 详细文档

- [完整修复方案](technical/20260317-07-Linux运行错误修复.md)
- [升级指南](UPGRADE_GUIDE.md)

## 联系支持

如果遇到问题，请访问：
- [GitHub Issues](https://github.com/kp-z/open_adventure/issues)
- [讨论区](https://github.com/kp-z/open_adventure/discussions)
