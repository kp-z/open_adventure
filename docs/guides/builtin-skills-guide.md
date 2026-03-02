# Claude Manager 内置 Skills 使用指南

## 概述

Claude Manager 内置了一些实用的 Claude Code skills，这些 skills 会在首次启动应用时自动安装到你的 Claude Code 环境中。

## 自动安装

当你运行 `./start.sh` 启动 Claude Manager 时，系统会自动：

1. 检查 `~/.claude/plugins/open_adventure/` 是否存在
2. 如果不存在，从 `marketplace/open_adventure/` 复制插件文件
3. 更新 `~/.claude/settings.json`，启用插件

**安装位置**：
- 插件目录：`~/.claude/plugins/open_adventure/`
- 配置文件：`~/.claude/settings.json`

## 已包含的 Skills

### 1. prompt_optimizer

**功能**：优化用户输入的 prompt，使其更清晰、具体、结构化。

**适用场景**：
- 需求描述模糊不清
- 缺乏必要的上下文信息
- 需要将复杂任务分解为步骤
- 需要明确输出格式和约束条件

**使用方法**：

#### 方法 1：手动调用
在 Claude Code 中输入：
```
/prompt_optimizer <你的需求>
```

**示例**：
```
/prompt_optimizer 帮我写个登录功能
```

**优化后的输出**：
```
任务目标：实现用户登录功能

具体要求：
- 支持用户名/邮箱 + 密码登录
- 实现密码加密存储（使用 bcrypt）
- 添加登录失败次数限制（5次后锁定账户30分钟）
- 登录成功后生成 JWT token
- 实现"记住我"功能（可选）

输出格式：
- 后端 API 接口代码
- 前端登录表单组件
- 数据库 schema 定义

约束条件：
- 使用项目现有的技术栈（Python + FastAPI + React）
- 遵循项目的代码规范
- 添加必要的错误处理和日志记录
- 包含基本的单元测试
```

#### 方法 2：自动调用
Claude 会在检测到以下情况时自动使用该 skill：
- 用户需求描述过于简单或模糊
- 缺少关键的技术细节
- 需要任务分解

你只需要正常提问，Claude 会自动判断是否需要使用 prompt_optimizer。

**示例对话**：

**用户**：
```
帮我实现一个用户管理系统
```

**Claude（自动使用 prompt_optimizer）**：
```
我先帮你优化一下需求：

任务目标：实现用户管理系统

具体要求：
- 用户 CRUD 操作（创建、读取、更新、删除）
- 用户认证和授权
- 角色和权限管理
- 用户信息验证（邮箱、手机号等）
- 密码安全（加密存储、强度验证）

输出格式：
- 后端 API 接口（RESTful）
- 数据库模型设计
- 前端管理界面
- API 文档

约束条件：
- 使用项目现有技术栈（Python + FastAPI + React）
- 遵循 RESTful API 设计规范
- 添加必要的安全措施（SQL 注入防护、XSS 防护）
- 包含单元测试和集成测试

这样理解是否正确？我可以开始实现了。
```

## 验证安装

### 检查插件是否已安装

```bash
# 检查插件目录
ls -la ~/.claude/plugins/open_adventure/

# 检查 settings.json
cat ~/.claude/settings.json | grep "open_adventure"
```

### 在 Claude Code 中测试

1. 打开 Claude Code CLI
2. 输入 `/` 查看可用命令
3. 应该能看到 `prompt_optimizer` 命令
4. 尝试运行：`/prompt_optimizer 测试需求`

## 故障排查

### 问题 1：插件未自动安装

**症状**：运行 `./start.sh` 后，`~/.claude/plugins/open_adventure/` 不存在

**解决方案**：
```bash
# 手动运行安装脚本
bash scripts/install_plugins.sh
```

### 问题 2：Claude Code 无法识别插件

**症状**：插件已安装，但 `/prompt_optimizer` 命令不可用

**解决方案**：
1. 重启 Claude Code CLI
2. 检查 SKILL.md 格式：
```bash
cat ~/.claude/plugins/open_adventure/skills/prompt_optimizer/SKILL.md | head -5
```
3. 运行 `claude --debug` 查看插件加载日志

### 问题 3：settings.json 未更新

**症状**：插件目录存在，但 settings.json 中没有 `open_adventure`

**解决方案**：
手动编辑 `~/.claude/settings.json`，添加：
```json
{
  "enabledPlugins": {
    "open_adventure": true
  }
}
```

## 添加新的 Skills

如果你想添加自己的 skills 到 marketplace：

1. 在 `marketplace/open_adventure/skills/` 下创建新目录
2. 创建 `SKILL.md` 文件：

```yaml
---
name: your-skill-name
description: 技能描述，Claude 用这个来决定何时使用该 skill
---

# 你的 Skill 内容

详细的指令和说明...
```

3. 重新运行安装脚本：
```bash
bash scripts/install_plugins.sh
```

## 参考资料

- [Claude Code Skills 官方文档](https://code.claude.com/docs/en/skills)
- [Claude Code Plugins 官方文档](https://code.claude.com/docs/en/plugins-reference)
- [项目 CLAUDE.md](../CLAUDE.md)
- [插件安装测试文档](../technical/plugin-auto-install-test.md)
