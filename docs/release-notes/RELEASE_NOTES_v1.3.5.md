# Release Notes - v1.3.5

**发布日期**: 2026-03-10

## 本次更新重点

本次更新主要修复了打包版本（二进制版本）的启动信息显示问题，使其与 `start.sh` 启动方式保持一致，提升用户体验。

## 🟡 中等问题修复

- **打包版本启动信息优化**: 修复了二进制打包版本启动时的信息显示不完整问题
  - 添加了局域网 IP 地址自动检测和显示
  - 统一了前台和后台模式的访问地址显示格式
  - 添加了 Backend API 和 API Docs 的访问地址
  - 添加了端口冲突检测，避免启动失败

- **启动信息格式统一**: 打包版本现在显示与 `start.sh` 完全一致的启动信息
  ```
  ============================================
  ✅ Open Adventure is running!
  ============================================

  🌐 本地访问:
     Frontend: http://localhost:8000/
     Backend API: http://localhost:8000/api
     API Docs: http://localhost:8000/docs

  🌍 局域网访问:
     Frontend: http://192.168.x.x:8000/
     Backend API: http://192.168.x.x:8000/api

  按 Ctrl+C 停止服务
  ============================================
  ```

## 📝 文档更新

- 更新了 `main_packaged.py` 的启动逻辑
- 改进了局域网访问的用户体验

## 升级指南

本次更新无破坏性变更，可直接替换旧版本。

### 从 v1.3.4 升级

1. 下载新版本压缩包
2. 解压并替换旧版本
3. 重新启动服务

## 已知问题

无

## 平台支持

- macOS ARM64 (Apple Silicon)
- Linux x86_64 兼容版 (Ubuntu 20.04+, Debian 11+, CentOS Stream 8+)
- Linux x86_64 最新版 (Ubuntu 24.04+, Debian 13+)

## 下载地址

https://github.com/kp-z/open_adventure/releases/tag/v1.3.5
