# Claude Manager Marketplace

这个目录包含 Claude Manager 内置的 Claude Code plugins 和 skills。

## 目录结构

```
marketplace/
└── open_adventure/           # Claude Manager 的官方 plugin
    └── skills/               # Skills 目录
        └── prompt_optimizer/ # Prompt 优化 skill
            └── SKILL.md      # Skill 定义文件
```

## 自动安装

当你首次运行 `./start.sh` 时，系统会自动：

1. 检查 `~/.claude/plugins/open_adventure/` 是否存在
2. 如果不存在，将 marketplace 中的内容复制到用户插件目录
3. 更新 `~/.claude/settings.json`，将插件添加到 `enabledPlugins` 列表

## 已包含的 Skills

### prompt_optimizer

**功能**：优化用户输入的 prompt，使其更清晰、具体、结构化。

**使用方法**：
- 手动调用：在 Claude Code 中输入 `/prompt_optimizer <你的需求>`
- 自动调用：Claude 会在检测到模糊需求时自动使用

**示例**：
```
/prompt_optimizer 帮我写个登录功能
```

Claude 会将模糊的需求转换为结构化的、包含详细要求的 prompt。

## 添加新的 Skills

要添加新的 skill 到 marketplace：

1. 在 `marketplace/open_adventure/skills/` 下创建新目录
2. 创建 `SKILL.md` 文件，包含 YAML frontmatter 和 skill 内容
3. 重新运行 `./start.sh` 或手动运行 `scripts/install_plugins.sh`

**SKILL.md 格式**：
```yaml
---
name: skill-name
description: 技能描述，Claude 用这个来决定何时使用该 skill
---

# Skill 内容

详细的指令和说明...
```

## 技术细节

- **Plugin 名称**：`open_adventure`
- **安装位置**：`~/.claude/plugins/open_adventure/`
- **配置文件**：`~/.claude/settings.json`
- **安装脚本**：`scripts/install_plugins.sh`

## 参考资料

- [Claude Code Skills 文档](https://code.claude.com/docs/en/skills)
- [Claude Code Plugins 文档](https://code.claude.com/docs/en/plugins-reference)
