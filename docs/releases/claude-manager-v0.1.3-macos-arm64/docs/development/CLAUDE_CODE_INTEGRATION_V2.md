# Claude Code 集成 API - 完整指南

## 概述

Claude Manager 提供了完整的 Claude Code 集成 API，支持管理两种类型的 skills：

1. **全局 Skills** - 存储在 `~/.claude/skills/` 目录
2. **Plugin Skills** - 存储在 `~/.claude/plugins/{plugin-name}/skills/` 目录，使用 namespace 格式（`plugin-name:skill-name`）

## Skills 类型对比

| 特性 | 全局 Skills | Plugin Skills |
|------|------------|---------------|
| 存储位置 | `~/.claude/skills/` | `~/.claude/plugins/{plugin-name}/skills/` |
| 引用格式 | `skill-name` | `plugin-name:skill-name` |
| 组织方式 | 扁平结构 | 按 plugin 分组 |
| 适用场景 | 通用技能 | 特定项目或团队的技能集合 |

## API 端点

### 1. 列出所有已安装的 Skills

**端点**: `GET /api/v1/claude-code/list-installed-skills`

**描述**: 列出 Claude Code 中所有已安装的 skills，包括全局和 plugin skills

**示例**:
```bash
curl http://127.0.0.1:8000/api/v1/claude-code/list-installed-skills
```

**响应**:
```json
{
  "total": 32,
  "global_skills": {
    "count": 7,
    "skills": [
      {
        "name": "prompt_optimizer",
        "description": "Prompt优化技能",
        "path": "/Users/kp/.claude/skills/prompt_optimizer/SKILL.md",
        "source": "global"
      }
    ]
  },
  "plugin_skills": {
    "count": 25,
    "skills": [
      {
        "namespace": "claude-manager:prompt_optimizer",
        "plugin_name": "claude-manager",
        "skill_name": "prompt_optimizer",
        "description": "Prompt优化技能",
        "path": "/Users/kp/.claude/plugins/claude-manager/skills/prompt_optimizer/SKILL.md",
        "source": "plugin"
      }
    ]
  },
  "claude_skills_directory": "/Users/kp/.claude/skills",
  "claude_plugins_directory": "/Users/kp/.claude/plugins"
}
```

---

### 2. 安装单个 Skill

**端点**: `POST /api/v1/claude-code/install-skill/{skill_id}`

**参数**:
- `skill_id` (路径参数): Skill 的 ID
- `as_plugin` (查询参数, 可选): 是否作为 plugin skill 安装，默认 `false`
- `plugin_name` (查询参数): Plugin 名称，当 `as_plugin=true` 时必填

**示例 1: 安装为全局 Skill**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skill/5
```

**响应**:
```json
{
  "success": true,
  "skill": {
    "id": 5,
    "name": "prompt_optimizer",
    "path": "/Users/kp/.claude/skills/prompt_optimizer/SKILL.md",
    "source": "global"
  },
  "message": "Successfully installed skill 'prompt_optimizer' to Claude Code"
}
```

**示例 2: 安装为 Plugin Skill**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skill/5?as_plugin=true&plugin_name=claude-manager"
```

**响应**:
```json
{
  "success": true,
  "skill": {
    "id": 5,
    "name": "prompt_optimizer",
    "namespace": "claude-manager:prompt_optimizer",
    "path": "/Users/kp/.claude/plugins/claude-manager/skills/prompt_optimizer/SKILL.md",
    "source": "plugin"
  },
  "message": "Successfully installed skill 'prompt_optimizer' as plugin skill with namespace 'claude-manager:prompt_optimizer'"
}
```

---

### 3. 批量安装 Skills

**端点**: `POST /api/v1/claude-code/install-skills`

**参数**:
- `skill_ids` (查询参数, 可选): Skill ID 列表，不提供则安装所有 skills
- `as_plugin` (查询参数, 可选): 是否作为 plugin skills 安装，默认 `false`
- `plugin_name` (查询参数): Plugin 名称，当 `as_plugin=true` 时必填

**示例 1: 安装所有 Skills 为全局 Skills**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skills
```

**示例 2: 安装所有 Skills 为 Plugin Skills**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skills?as_plugin=true&plugin_name=claude-manager"
```

**响应**:
```json
{
  "success": 5,
  "failed": 0,
  "installed_skills": [
    {
      "id": 1,
      "name": "code_review",
      "namespace": "claude-manager:code_review",
      "path": "/Users/kp/.claude/plugins/claude-manager/skills/code_review/SKILL.md",
      "source": "plugin"
    }
  ],
  "failed_skills": [],
  "plugin_directory": "/Users/kp/.claude/plugins/claude-manager"
}
```

**示例 3: 安装指定的 Skills**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skills?skill_ids=1&skill_ids=5&as_plugin=true&plugin_name=my-team"
```

---

### 4. 卸载 Skill

**端点**: `DELETE /api/v1/claude-code/uninstall-skill/{skill_name}`

**描述**: 从 Claude Code 中卸载全局 skill

**示例**:
```bash
curl -X DELETE http://127.0.0.1:8000/api/v1/claude-code/uninstall-skill/prompt_optimizer
```

**响应**:
```json
{
  "success": true,
  "message": "Successfully uninstalled skill 'prompt_optimizer' from Claude Code"
}
```

---

## 使用场景

### 场景 1: 个人使用 - 全局 Skills

适合个人开发者，将常用的 skills 安装为全局 skills：

```bash
# 1. 创建 skill
curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_skill",
    "description": "我的技能",
    "content": "技能内容"
  }'

# 2. 安装为全局 skill
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skill/6

# 3. 在 Claude Code 中使用
# 直接使用 skill 名称: my_skill
```

---

### 场景 2: 团队协作 - Plugin Skills

适合团队或项目，将相关的 skills 组织为一个 plugin：

```bash
# 1. 批量创建团队 skills（假设已在数据库中）

# 2. 将所有 skills 安装为 plugin skills
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skills?as_plugin=true&plugin_name=my-team"

# 3. 在 Claude Code 中使用
# 使用 namespace 格式: my-team:skill-name
```

**优势**:
- ✅ 按团队/项目组织 skills
- ✅ 避免命名冲突
- ✅ 易于管理和分发
- ✅ 清晰的所属关系

---

### 场景 3: 混合使用

同时使用全局和 plugin skills：

```bash
# 通用 skills 安装为全局
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skills?skill_ids=1&skill_ids=2"

# 项目特定 skills 安装为 plugin
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skills?skill_ids=3&skill_ids=4&as_plugin=true&plugin_name=project-x"
```

---

## 在 Claude Code 中使用 Skills

### 全局 Skills

直接使用 skill 名称：

```bash
# 在对话中
"请使用 prompt_optimizer 优化这个提示词"
"用 python_analyzer 分析这段代码"
```

### Plugin Skills

使用 namespace 格式：

```bash
# 在对话中
"请使用 claude-manager:prompt_optimizer 优化这个提示词"
"用 my-team:code_review 审查这段代码"
```

---

## 完整工作流程示例

### 创建并发布团队 Skills Plugin

```bash
#!/bin/bash

# 1. 创建多个 skills
for skill in "code_review" "bug_detector" "documentation_writer"; do
  curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"${skill}\",
      \"description\": \"${skill} skill\",
      \"content\": \"Skill content for ${skill}\"
    }"
done

# 2. 将所有 skills 安装为 plugin
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skills?as_plugin=true&plugin_name=my-company"

# 3. 验证安装
curl http://127.0.0.1:8000/api/v1/claude-code/list-installed-skills | \
  python3 -c "import sys, json; data=json.load(sys.stdin); \
  [print(s['namespace']) for s in data['plugin_skills']['skills'] if s['plugin_name'] == 'my-company']"

# 输出:
# my-company:code_review
# my-company:bug_detector
# my-company:documentation_writer
```

---

## 目录结构

### 全局 Skills
```
~/.claude/skills/
├── prompt_optimizer/
│   └── SKILL.md
├── python_analyzer/
│   └── SKILL.md
└── code_review/
    └── SKILL.md
```

### Plugin Skills
```
~/.claude/plugins/
├── claude-manager/
│   └── skills/
│       ├── prompt_optimizer/
│       │   └── SKILL.md
│       ├── python_analyzer/
│       │   └── SKILL.md
│       └── code_review/
│           └── SKILL.md
└── my-team/
    └── skills/
        ├── team_skill_1/
        │   └── SKILL.md
        └── team_skill_2/
            └── SKILL.md
```

---

## 最佳实践

### 1. 命名规范

**全局 Skills**:
- 使用通用、描述性的名称
- 避免特定项目或团队的术语
- 例如: `code_review`, `bug_detector`, `documentation_writer`

**Plugin Skills**:
- Plugin 名称使用项目/团队标识
- Skill 名称可以更具体
- 例如: `my-company:internal-api-review`, `project-x:deployment-checker`

### 2. 组织策略

**按功能分类**:
```bash
# 代码质量相关
curl -X POST "...?as_plugin=true&plugin_name=code-quality"

# 文档相关
curl -X POST "...?as_plugin=true&plugin_name=documentation"

# 部署相关
curl -X POST "...?as_plugin=true&plugin_name=deployment"
```

**按项目分类**:
```bash
# 项目 A 的 skills
curl -X POST "...?as_plugin=true&plugin_name=project-a"

# 项目 B 的 skills
curl -X POST "...?as_plugin=true&plugin_name=project-b"
```

### 3. 版本管理

在 skill 的 `meta_data` 中添加版本信息：

```json
{
  "name": "my_skill",
  "description": "My skill",
  "content": "...",
  "meta_data": {
    "version": "1.0.0",
    "plugin": "my-team",
    "last_updated": "2024-02-16"
  }
}
```

### 4. 更新 Skills

```bash
# 1. 更新数据库中的 skill
curl -X PUT "http://127.0.0.1:8000/api/v1/skills/5" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新后的描述",
    "content": "更新后的内容"
  }'

# 2. 重新安装（会覆盖旧版本）
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skill/5?as_plugin=true&plugin_name=my-team"
```

---

## 在 Swagger UI 中使用

访问 http://127.0.0.1:8000/docs，在 **claude-code** 标签下可以看到所有端点：

1. **GET /list-installed-skills** - 查看所有已安装的 skills
2. **POST /install-skills** - 批量安装 skills
3. **POST /install-skill/{skill_id}** - 安装单个 skill
4. **DELETE /uninstall-skill/{skill_name}** - 卸载 skill

每个端点都可以直接在浏览器中测试！

---

## 故障排除

### Plugin Skills 未显示

**问题**: 安装了 plugin skill 但在列表中看不到

**解决方法**:
1. 检查文件是否创建: `ls ~/.claude/plugins/{plugin-name}/skills/`
2. 重启服务器
3. 重新调用 list API

### 命名冲突

**问题**: 全局 skill 和 plugin skill 同名

**解决方法**:
- 使用 namespace 格式引用 plugin skill: `plugin-name:skill-name`
- 或者重命名其中一个 skill

### 权限问题

**问题**: 无法创建文件

**解决方法**:
```bash
# 检查目录权限
ls -la ~/.claude/plugins/

# 如果需要，修复权限
chmod 755 ~/.claude/plugins/
```

---

## 总结

通过 Claude Manager 的 Claude Code 集成 API，你可以：

✅ **统一管理** - 在数据库中集中管理所有 skills
✅ **灵活安装** - 选择安装为全局或 plugin skills
✅ **命名空间** - 使用 namespace 避免冲突
✅ **团队协作** - 按项目/团队组织 skills
✅ **自动化** - 通过 API 自动化 skills 的安装和更新
✅ **版本控制** - 轻松更新和回滚 skills

现在你可以完全通过 API 来管理 Claude Code 的 skills 生态系统！
