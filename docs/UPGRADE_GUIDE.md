# Open Adventure 升级指南

## 快速升级（推荐）

### 自动升级脚本
```bash
./scripts/upgrade.sh
```

脚本会自动完成：
- ✅ 检查最新版本
- ✅ 停止当前服务
- ✅ 备份用户数据和应用
- ✅ 下载并安装新版本
- ✅ 自动迁移数据库
- ✅ 启动新版本

## 手动升级

### 步骤 1：停止服务
```bash
./stop.sh
```

### 步骤 2：备份数据（推荐）
```bash
# 备份用户数据
cp -r ~/.open_adventure ~/.open_adventure.backup

# 备份应用（可选）
cp -r . ../open-adventure.backup
```

### 步骤 3：下载新版本
访问 [GitHub Releases](https://github.com/kp-z/open_adventure/releases) 下载对应平台的版本：

**macOS ARM64**:
```bash
wget https://github.com/kp-z/open_adventure/releases/download/v0.2.0/open-adventure-v0.2.0-macos-arm64.tar.gz
```

**Linux 兼容版**（推荐，支持 Ubuntu 20.04+）:
```bash
wget https://github.com/kp-z/open_adventure/releases/download/v0.2.0/open-adventure-v0.2.0-linux-x86_64-compat.tar.gz
```

**Linux 最新版**（仅适合 Ubuntu 24.04+）:
```bash
wget https://github.com/kp-z/open_adventure/releases/download/v0.2.0/open-adventure-v0.2.0-linux-x86_64-latest.tar.gz
```

### 步骤 4：解压并替换
```bash
# 解压到新目录
tar -xzf open-adventure-v0.2.0-*.tar.gz

# 进入新目录
cd open-adventure
```

### 步骤 5：启动新版本
```bash
./start.sh
```

应用会在启动时**自动迁移数据库**。

## 数据迁移

### 自动迁移
应用启动时会自动检查数据库版本并执行必要的迁移。

### 迁移失败处理
如果迁移失败：

1. **查看日志**：
```bash
tail -f ~/.open_adventure/logs/backend.log
```

2. **恢复备份**：
```bash
cp ~/.open_adventure.backup/open_adventure.db ~/.open_adventure/
```

3. **提交 Issue**：
访问 [GitHub Issues](https://github.com/kp-z/open_adventure/issues) 报告问题

## 回滚到旧版本

如果新版本有问题，可以回滚：

### 使用自动升级脚本升级的
```bash
# 1. 停止服务
./stop.sh

# 2. 恢复应用（查看升级脚本输出的备份路径）
cp -r ../open-adventure.v0.1.0.backup/* .

# 3. 恢复数据（如果需要）
cp -r ~/.open_adventure.backup.20260317_120000/* ~/.open_adventure/

# 4. 重启服务
./start.sh
```

### 手动升级的
```bash
# 1. 停止服务
./stop.sh

# 2. 删除新版本
cd ..
rm -rf open-adventure

# 3. 恢复旧版本
cp -r open-adventure.backup open-adventure
cd open-adventure

# 4. 恢复数据
cp -r ~/.open_adventure.backup/* ~/.open_adventure/

# 5. 重启服务
./start.sh
```

## 跨版本升级

### 支持的升级路径
- ✅ **Minor 版本跨越**：v0.1.0 → v0.3.0（自动迁移）
- ⚠️ **Major 版本跨越**：v0.x → v1.x（需要分步升级）

### Major 版本升级
如果要从 v0.x 升级到 v1.x：
1. 先升级到最新的 v0.x 版本
2. 验证功能正常
3. 再升级到 v1.0

## 常见问题

### Q: 升级会丢失数据吗？
A: 不会。用户数据存储在 `~/.open_adventure/` 目录，升级只替换应用文件。但建议升级前备份。

### Q: 升级需要多长时间？
A: 通常 1-2 分钟，取决于网络速度。

### Q: 可以跳过某些版本直接升级吗？
A: 可以，数据库会自动执行所有中间版本的迁移。

### Q: 升级失败怎么办？
A: 查看日志文件，恢复备份，或提交 Issue 寻求帮助。

### Q: 如何查看当前版本？
A: 查看项目根目录的 `VERSION` 文件，或访问 Dashboard 查看。

## 版本兼容性

| 升级路径 | 是否支持 | 说明 |
|---------|---------|------|
| v0.1.0 → v0.1.1 | ✅ | Patch 升级，无数据库变更 |
| v0.1.0 → v0.2.0 | ✅ | Minor 升级，自动迁移数据库 |
| v0.1.0 → v0.3.0 | ✅ | 跨 Minor 版本，自动迁移 |
| v0.x → v1.0 | ⚠️ | 需要分步升级 |

## 获取帮助

- 📖 [完整文档](https://github.com/kp-z/open_adventure/wiki)
- 🐛 [报告问题](https://github.com/kp-z/open_adventure/issues)
- 💬 [讨论区](https://github.com/kp-z/open_adventure/discussions)
