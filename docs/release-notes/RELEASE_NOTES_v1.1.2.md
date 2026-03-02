# Release Notes v1.1.2

**发布日期**: 2026-03-02
**版本号**: v1.1.2
**状态**: 已发布

## 本次更新重点

本次更新主要增强了 Claude Code Plugin 的集成体验，实现了插件的自动安装和配置功能，同时完善了项目文档。

## ✨ 新增功能

### Claude Code Plugin 自动安装
- **内置 Marketplace**: 项目包含 `marketplace/open_adventure/` 目录，存放内置的 skills
- **首次启动自动安装**: 运行 `./start.sh` 时自动检测并安装插件到 `~/.claude/plugins/open_adventure/`
- **幂等性保证**: 重复运行不会重复安装或报错
- **自动配置**: 自动更新 `~/.claude/settings.json`，将插件添加到 `enabledPlugins`
- **已包含 Skills**:
  - `prompt_optimizer`: 优化用户输入的 prompt，使其更清晰、具体、结构化

## 📝 文档更新

### CLAUDE.md 更新
- 新增"核心功能"章节，详细说明实时执行监控功能
- 新增"Claude Code Plugin 自动安装"章节，说明插件安装机制
- 更新目录结构，添加 `marketplace/` 和 `scripts/` 说明
- 优化开发阶段说明

### 新增技术文档
- `docs/technical/20260302-01-plugin-auto-install-implementation.md`: Plugin 自动安装实现文档
- `docs/guides/builtin-skills-guide.md`: 内置 Skills 使用指南

## 🔧 改进

- 优化了项目结构，将插件相关代码组织到 `marketplace/` 目录
- 增强了启动脚本的健壮性，支持插件自动安装
- 改进了文档组织结构，便于查找和维护

## 📦 发布包

本次发布包含以下平台版本：
- **macOS ARM64**: `claude-manager-v1.1.2-macos-arm64.tar.gz`
- **Linux x86_64**: `claude-manager-v1.1.2-linux-x86_64.tar.gz`

## 升级指南

从 v1.1.1 升级到 v1.1.2：

1. 下载对应平台的压缩包
2. 解压到目标目录
3. 运行 `./start.sh` 启动服务
4. 插件将自动安装到 `~/.claude/plugins/open_adventure/`

## 已知问题

无

## 下一步计划

- 继续完善 Workflow 执行引擎
- 增强实时监控功能
- 添加更多内置 Skills
