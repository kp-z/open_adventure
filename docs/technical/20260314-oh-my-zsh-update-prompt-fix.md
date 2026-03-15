# Oh-My-Zsh 更新提示干扰 Claude 自动启动修复

**创建日期**: 2026-03-14
**问题类型**: Bug 修复
**严重程度**: 中等

## 问题描述

在 Terminal 页面使用 tmux 启动 Claude 时，oh-my-zsh 的自动更新提示会干扰 Claude 命令的执行：

```
[oh-my-zsh] Would you like to update? [Y/n] claude
```

这导致 `claude` 命令被误认为是对更新提示的回答，而不是实际要执行的命令。

## 根本原因

1. oh-my-zsh 在 shell 启动时会检查更新
2. 如果有可用更新，会显示交互式提示
3. 自动启动 Claude 的命令在 shell 初始化后立即发送
4. 如果此时 oh-my-zsh 正在显示更新提示，`claude` 命令会被误解为对提示的回答

## 解决方案

在启动终端进程时，设置环境变量禁用 oh-my-zsh 的自动更新提示：

```python
# 禁用 oh-my-zsh 自动更新提示，避免干扰自动启动 Claude
os.environ['DISABLE_AUTO_UPDATE'] = 'true'
os.environ['DISABLE_UPDATE_PROMPT'] = 'true'
```

### 修改文件

- `backend/app/api/terminal.py` (第 266-268 行)

### 环境变量说明

- `DISABLE_AUTO_UPDATE`: 禁用 oh-my-zsh 的自动更新检查
- `DISABLE_UPDATE_PROMPT`: 禁用更新提示（即使检查到更新也不显示）

## 测试验证

1. 在 Terminal 页面创建新终端并自动启动 Claude
2. 验证 Claude 能够正常启动，不会被 oh-my-zsh 更新提示干扰
3. 验证 Claude 会话恢复功能正常工作

## 影响范围

- 所有使用 oh-my-zsh 的用户
- Terminal 页面的自动启动 Claude 功能
- Claude 会话恢复功能

## 注意事项

1. 这个修改只影响 Open Adventure 创建的终端会话
2. 用户的正常终端（非 Open Adventure 创建）不受影响
3. 用户仍然可以手动运行 `omz update` 来更新 oh-my-zsh

## 相关文档

- [tmux 实现文档](./20260313-tmux-implementation.md)
- [tmux Claude 自动启动验证](./20260313-tmux-claude-autostart-verification.md)
