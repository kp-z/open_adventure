# Release Notes v1.3.2

**发布日期**: 2026-03-06

## 本次更新重点

本次更新主要优化了多个核心页面在统一布局中的顶部留白表现，并发布了 Linux x86_64 源码压缩包、Linux x86_64 二进制包与 macOS ARM64 二进制包，便于在不同环境中进行部署与验证。

## 🔴 严重问题修复

无

## 🟡 中等问题修复

- **页面顶部间距统一**：为 Dashboard、History、Skills、Teams、Workflows 页面补充统一的 `pt-6` 顶部内边距，避免内容与容器顶部过于贴近，提升整体视觉一致性。
- **版本号更新**：前端版本从 `1.3.1` 更新为 `1.3.2`，并同步更新 lockfile。

## ✨ 新增功能

无

## 📝 文档更新

- 新增本次版本的 Release Notes：`docs/release-notes/RELEASE_NOTES_v1.3.2.md`
- 将 v1.3.2 发布信息加入文档索引

## 技术实现细节

### 前端页面布局调整
- [frontend/src/app/pages/Dashboard.tsx](frontend/src/app/pages/Dashboard.tsx)
- [frontend/src/app/pages/History.tsx](frontend/src/app/pages/History.tsx)
- [frontend/src/app/pages/Skills.tsx](frontend/src/app/pages/Skills.tsx)
- [frontend/src/app/pages/Teams.tsx](frontend/src/app/pages/Teams.tsx)
- [frontend/src/app/pages/Workflows.tsx](frontend/src/app/pages/Workflows.tsx)

以上页面的根容器均补充 `pt-6`，使页面标题区与上层布局保持更稳定的垂直节奏。

### 构建与版本管理
- 更新 [frontend/package.json](frontend/package.json) 中的版本号为 `1.3.2`
- 同步更新 [frontend/package-lock.json](frontend/package-lock.json)
- 重新执行前端构建，更新构建产物中的 service worker 资源版本

## 发布物说明

本次发布已包含以下产物：

- `open_adventure-v1.3.2-linux-x86_64-source.tar.gz`
- `open_adventure-v1.3.2-linux-x86_64.tar.gz`
- `open_adventure-v1.3.2-macos-arm64.tar.gz`

其中 Linux x86_64 二进制包已在本地 amd64 Linux 容器中完成启动验证，健康检查接口 `/api/system/health` 返回 `200 OK`。

## 已知问题

- 本次前端构建仍存在 Vite chunk size 警告，但不影响构建完成与发布包生成。

## 升级指南

本次更新无破坏性变更，可以直接升级：

1. 获取 `v1.3.2` 对应代码或源码压缩包
2. 解压 Linux 发布包
3. 按项目既有方式安装依赖并启动服务：`./start.sh`
