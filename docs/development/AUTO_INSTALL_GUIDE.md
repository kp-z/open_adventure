# 自动安装到 Claude Code - 使用指南

## 概述

Claude Manager 现在支持在创建 Skills 和 Agents 时**自动安装到 Claude Code**，无需手动调用安装 API！

## 功能特性

✅ **创建即安装** - 创建 skill 的同时自动安装到 Claude Code
✅ **双模式支持** - 支持全局安装和 plugin 安装
✅ **安装记录** - 在 `meta_data` 中记录安装信息
✅ **AI 生成支持** - AI 生成的 skills 也支持自动安装
✅ **错误容错** - 安装失败不影响创建过程

---

## 使用方法

### 1. 创建 Skill 并安装为全局 Skill

**API 请求**:
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_skill",
    "description": "我的技能",
    "content": "技能内容...",
    "install_to_claude_code": true,
    "as_plugin": false
  }'
```

**参数说明**:
- `install_to_claude_code`: `true` - 启用自动安装
- `as_plugin`: `false` - 安装为全局 skill

**响应**:
```json
{
  "id": 7,
  "name": "my_skill",
  "description": "我的技能",
  "content": "技能内容...",
  "meta_data": {
    "claude_code_installation": {
      "installed": true,
      "name": "my_skill",
      "path": "/Users/kp/.claude/skills/my_skill/SKILL.md",
      "source": "global"
    }
  },
  "created_at": "2024-02-16T13:01:55.547071",
  "updated_at": "2024-02-16T13:01:55.554379"
}
```

**结果**:
- ✅ Skill 保存到数据库
- ✅ 自动安装到 `~/.claude/skills/my_skill/`
- ✅ 可以在 Claude Code 中直接使用: `my_skill`

---

### 2. 创建 Skill 并安装为 Plugin Skill

**API 请求**:
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "team_skill",
    "description": "团队技能",
    "content": "团队专用技能内容...",
    "install_to_claude_code": true,
    "as_plugin": true,
    "plugin_name": "my-team"
  }'
```

**参数说明**:
- `install_to_claude_code`: `true` - 启用自动安装
- `as_plugin`: `true` - 安装为 plugin skill
- `plugin_name`: `"my-team"` - Plugin 名称（必填）

**响应**:
```json
{
  "id": 6,
  "name": "team_skill",
  "description": "团队技能",
  "content": "团队专用技能内容...",
  "meta_data": {
    "claude_code_installation": {
      "installed": true,
      "namespace": "my-team:team_skill",
      "path": "/Users/kp/.claude/plugins/my-team/skills/team_skill/SKILL.md",
      "source": "plugin"
    }
  },
  "created_at": "2024-02-16T11:58:42.251427",
  "updated_at": "2024-02-16T11:58:42.257676"
}
```

**结果**:
- ✅ Skill 保存到数据库
- ✅ 自动安装到 `~/.claude/plugins/my-team/skills/team_skill/`
- ✅ 可以在 Claude Code 中使用: `my-team:team_skill`

---

### 3. 创建 Skill 但不安装

**API 请求**:
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "draft_skill",
    "description": "草稿技能",
    "content": "还在开发中...",
    "install_to_claude_code": false
  }'
```

**参数说明**:
- `install_to_claude_code`: `false` 或省略 - 不自动安装

**结果**:
- ✅ Skill 仅保存到数据库
- ❌ 不安装到 Claude Code
- 💡 稍后可以通过安装 API 手动安装

---

### 4. AI 生成 Skill 并自动安装

**API 请求**:
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/skills/ai-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "natural_language_input": "创建一个代码重构技能，帮助识别和改进代码质量问题",
    "install_to_claude_code": true,
    "as_plugin": true,
    "plugin_name": "code-quality"
  }'
```

**参数说明**:
- `natural_language_input`: 自然语言描述
- `install_to_claude_code`: `true` - 启用自动安装
- `as_plugin`: `true` - 安装为 plugin skill
- `plugin_name`: `"code-quality"` - Plugin 名称

**结果**:
- ✅ AI 生成完整的 skill 配置
- ✅ 保存到数据库
- ✅ 自动安装到 Claude Code
- ✅ 立即可用: `code-quality:refactoring_assistant`

---

## 在 Swagger UI 中使用

访问 http://127.0.0.1:8000/docs，找到 **skills** 标签：

### POST /api/v1/skills/

1. 点击 "Try it out"
2. 填写 Request body:
```json
{
  "name": "my_skill",
  "description": "我的技能",
  "content": "技能内容",
  "install_to_claude_code": true,
  "as_plugin": true,
  "plugin_name": "my-plugin"
}
```
3. 点击 "Execute"
4. 查看响应中的 `meta_data.claude_code_installation`

### POST /api/v1/skills/ai-generate

1. 点击 "Try it out"
2. 填写参数:
   - `natural_language_input`: "创建一个..."
   - `install_to_claude_code`: `true`
   - `as_plugin`: `true`
   - `plugin_name`: "my-plugin"
3. 点击 "Execute"

---

## 完整工作流程示例

### 场景 1: 个人开发者 - 快速创建和使用

```bash
# 1. 创建并安装全局 skill
curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "quick_debug",
    "description": "快速调试助手",
    "content": "帮助快速定位和修复常见bug",
    "install_to_claude_code": true
  }'

# 2. 立即在 Claude Code 中使用
# 在对话中: "使用 quick_debug 帮我分析这段代码"
```

---

### 场景 2: 团队协作 - 构建团队 Skills 库

```bash
#!/bin/bash

PLUGIN_NAME="acme-corp"

# 创建多个团队 skills
skills=(
  "code_review:代码审查标准"
  "api_design:API设计规范"
  "security_check:安全检查清单"
  "deployment:部署流程"
)

for skill_info in "${skills[@]}"; do
  IFS=':' read -r name desc <<< "$skill_info"

  curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"${name}\",
      \"description\": \"${desc}\",
      \"content\": \"团队标准: ${desc}\",
      \"install_to_claude_code\": true,
      \"as_plugin\": true,
      \"plugin_name\": \"${PLUGIN_NAME}\"
    }"

  echo "✅ Created and installed: ${PLUGIN_NAME}:${name}"
done

# 验证安装
curl -s "http://127.0.0.1:8000/api/v1/claude-code/list-installed-skills" | \
  python3 -c "import sys, json; \
  data=json.load(sys.stdin); \
  skills = [s for s in data['plugin_skills']['skills'] if s['plugin_name'] == '${PLUGIN_NAME}']; \
  print(f'Team skills installed: {len(skills)}'); \
  [print(f'  - {s[\"namespace\"]}') for s in skills]"
```

**输出**:
```
✅ Created and installed: acme-corp:code_review
✅ Created and installed: acme-corp:api_design
✅ Created and installed: acme-corp:security_check
✅ Created and installed: acme-corp:deployment
Team skills installed: 4
  - acme-corp:code_review
  - acme-corp:api_design
  - acme-corp:security_check
  - acme-corp:deployment
```

---

### 场景 3: AI 辅助 - 快速生成专业 Skills

```bash
# 使用 AI 生成并自动安装
curl -X POST "http://127.0.0.1:8000/api/v1/skills/ai-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "natural_language_input": "创建一个性能优化技能，专注于识别和解决 Python 代码的性能瓶颈，包括内存泄漏、慢查询、循环优化等",
    "install_to_claude_code": true,
    "as_plugin": true,
    "plugin_name": "performance-tools"
  }'

# AI 会自动生成:
# - 完整的 skill 名称
# - 详细的描述
# - 专业的内容
# - 并立即安装到 Claude Code
```

---

## 参数参考

### SkillCreate Schema

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | ✅ | - | Skill 名称 |
| `description` | string | ✅ | - | Skill 描述 |
| `content` | string | ✅ | - | Skill 内容 |
| `meta_data` | object | ❌ | `null` | 元数据 |
| `install_to_claude_code` | boolean | ❌ | `false` | 是否自动安装到 Claude Code |
| `as_plugin` | boolean | ❌ | `false` | 是否作为 plugin skill 安装 |
| `plugin_name` | string | ❌ | `null` | Plugin 名称（`as_plugin=true` 时必填） |

### AI Generate Parameters

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `natural_language_input` | string | ✅ | - | 自然语言描述 |
| `install_to_claude_code` | boolean | ❌ | `false` | 是否自动安装 |
| `as_plugin` | boolean | ❌ | `false` | 是否作为 plugin 安装 |
| `plugin_name` | string | ❌ | `null` | Plugin 名称 |

---

## 安装信息记录

创建时自动安装的 skill 会在 `meta_data` 中记录安装信息：

### 全局 Skill 安装信息
```json
{
  "meta_data": {
    "claude_code_installation": {
      "installed": true,
      "name": "my_skill",
      "path": "/Users/kp/.claude/skills/my_skill/SKILL.md",
      "source": "global"
    }
  }
}
```

### Plugin Skill 安装信息
```json
{
  "meta_data": {
    "claude_code_installation": {
      "installed": true,
      "namespace": "my-team:team_skill",
      "path": "/Users/kp/.claude/plugins/my-team/skills/team_skill/SKILL.md",
      "source": "plugin"
    }
  }
}
```

---

## 验证安装

### 方法 1: 检查文件系统

```bash
# 全局 skill
ls -la ~/.claude/skills/my_skill/

# Plugin skill
ls -la ~/.claude/plugins/my-team/skills/team_skill/
```

### 方法 2: 使用 List API

```bash
curl -s "http://127.0.0.1:8000/api/v1/claude-code/list-installed-skills" | \
  python3 -m json.tool
```

### 方法 3: 在 Claude Code 中测试

直接在 Claude Code 对话中使用新创建的 skill：

```
# 全局 skill
"使用 my_skill 帮我..."

# Plugin skill
"使用 my-team:team_skill 帮我..."
```

---

## 错误处理

### 安装失败不影响创建

如果自动安装失败（例如目录权限问题），skill 仍会成功创建到数据库：

```json
{
  "id": 8,
  "name": "my_skill",
  "description": "...",
  "content": "...",
  "meta_data": null,  // 没有安装信息
  "created_at": "...",
  "updated_at": "..."
}
```

**解决方法**:
1. 检查错误日志
2. 修复问题（如权限）
3. 使用手动安装 API:
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skill/8?as_plugin=true&plugin_name=my-team"
```

### Plugin 名称缺失

如果 `as_plugin=true` 但没有提供 `plugin_name`：

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test",
    "description": "test",
    "content": "test",
    "install_to_claude_code": true,
    "as_plugin": true
  }'
```

**错误**: Skill 会创建成功，但安装会失败（不影响创建）

**解决方法**: 提供 `plugin_name` 参数

---

## 最佳实践

### 1. 命名规范

**全局 Skills**:
- 使用简短、描述性的名称
- 小写字母 + 下划线
- 例如: `code_review`, `bug_detector`, `quick_debug`

**Plugin Skills**:
- Plugin 名称: 使用项目/团队标识，小写 + 连字符
- Skill 名称: 可以更具体
- 例如: `acme-corp:api_review`, `project-x:deploy_check`

### 2. 开发流程

**草稿阶段** - 不自动安装:
```json
{
  "name": "draft_skill",
  "description": "开发中...",
  "content": "...",
  "install_to_claude_code": false
}
```

**测试阶段** - 安装为 plugin:
```json
{
  "name": "test_skill",
  "description": "测试版本",
  "content": "...",
  "install_to_claude_code": true,
  "as_plugin": true,
  "plugin_name": "testing"
}
```

**生产阶段** - 安装为全局或团队 plugin:
```json
{
  "name": "prod_skill",
  "description": "生产版本",
  "content": "...",
  "install_to_claude_code": true,
  "as_plugin": true,
  "plugin_name": "production"
}
```

### 3. 团队协作

**统一 Plugin 名称**:
```bash
# 所有团队成员使用相同的 plugin_name
TEAM_PLUGIN="acme-engineering"

# 创建团队 skills
curl -X POST "..." -d "{..., \"plugin_name\": \"${TEAM_PLUGIN}\"}"
```

**版本管理**:
```json
{
  "name": "api_review",
  "description": "API 审查 v2.0",
  "content": "...",
  "meta_data": {
    "version": "2.0.0",
    "changelog": "Added security checks"
  },
  "install_to_claude_code": true,
  "as_plugin": true,
  "plugin_name": "acme-engineering"
}
```

---

## 对比：自动安装 vs 手动安装

### 自动安装（推荐）

**优势**:
- ✅ 一步完成创建和安装
- ✅ 减少 API 调用次数
- ✅ 立即可用
- ✅ 安装信息自动记录

**适用场景**:
- 快速原型开发
- 生产环境部署
- 团队协作

**示例**:
```bash
# 一个请求完成所有操作
curl -X POST ".../skills/" -d '{
  "name": "my_skill",
  "description": "...",
  "content": "...",
  "install_to_claude_code": true,
  "as_plugin": true,
  "plugin_name": "my-team"
}'
```

### 手动安装

**优势**:
- ✅ 更灵活的控制
- ✅ 可以批量安装
- ✅ 可以重新安装

**适用场景**:
- 草稿和测试阶段
- 需要批量操作
- 需要重新安装

**示例**:
```bash
# 1. 创建（不安装）
curl -X POST ".../skills/" -d '{
  "name": "my_skill",
  "description": "...",
  "content": "..."
}'

# 2. 稍后手动安装
curl -X POST ".../claude-code/install-skill/1?as_plugin=true&plugin_name=my-team"
```

---

## 总结

通过自动安装功能，你可以：

✅ **一步到位** - 创建即安装，无需额外操作
✅ **灵活选择** - 支持全局和 plugin 两种模式
✅ **AI 增强** - AI 生成的 skills 也能自动安装
✅ **团队协作** - 轻松构建团队 skills 库
✅ **即时可用** - 创建后立即在 Claude Code 中使用

现在就开始使用自动安装功能，让你的 Claude Code 技能管理更加高效！🚀
