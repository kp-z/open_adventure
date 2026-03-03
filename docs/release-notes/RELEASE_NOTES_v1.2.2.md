# Release Notes v1.2.2

**发布日期**: 2026-03-03

## 本次更新重点

本次更新主要修复了多个 Bug 并优化了 Terminal 页面的交互体验。

## 🔴 严重问题修复

- **Token Usage 显示真实数据**: 修复了 Dashboard 中 Claude CLI Status 卡片显示硬编码测试数据的问题，现在会从 `~/.claude/history.jsonl` 读取真实的 token 使用情况

## 🟡 中等问题修复

- **Terminal 项目切换逻辑**: 修复了 Terminal 页面项目下拉菜单切换时无法自动切换 terminal tab 的问题
- **移动端底部菜单栏按钮高亮**: 统一了移动端底部导航栏所有按钮的高亮样式，确保视觉效果一致
- **移动端 Terminal tab 样式**: 修复了移动端 Terminal 页面 tab card 的对齐和样式问题，移除了不必要的 padding、margin 和 background

## ✨ 新增功能

- **Terminal 交互优化**: 改进了 Terminal 页面的交互方式，将项目下拉框改为点击加号按钮选择项目创建 tab，交互更加直观

## 📝 文档更新

- 无

## 升级指南

本次更新无破坏性变更，直接替换文件即可。

## 已知问题

- 无

---

🤖 Generated with Claude Opus 4.6 (1M context)
