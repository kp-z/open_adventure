# Claude Code 集成 API 使用指南

## 概述

Claude Manager 现在提供了完整的 Claude Code 集成 API，可以直接通过 HTTP 请求管理 Claude Code 中的 skills。

## 可用的 API 端点

### 1. 列出已安装的 Skills

**端点**: `GET /api/v1/claude-code/list-installed-skills`

**描述**: 列出当前 Claude Code 中已安装的所有 skills

**示例**:
```bash
curl http://127.0.0.1:8000/api/v1/claude-code/list-installed-skills
```

**响应**:
```json
{
  "total": 7,
  "skills": [
    {
      "name": "prompt_optimizer",
      "description": "Prompt优化技能",
      "path": "/Users/kp/.claude/skills/prompt_optimizer/SKILL.md"
    }
  ],
  "claude_skills_directory": "/Users/kp/.claude/skills"
}
```

---

### 2. 安装所有 Skills

**端点**: `POST /api/v1/claude-code/install-skills`

**描述**: 将数据库中的所有 skills 安装到 Claude Code

**示例**:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skills
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
      "path": "/Users/kp/.claude/skills/code_review/SKILL.md"
    },
    {
      "id": 2,
      "name": "python_analyzer",
      "path": "/Users/kp/.claude/skills/python_analyzer/SKILL.md"
    }
  ],
  "failed_skills": [],
  "claude_skills_directory": "/Users/kp/.claude/skills"
}
```

---

### 3. 安装指定的 Skills

**端点**: `POST /api/v1/claude-code/install-skills?skill_ids=1&skill_ids=2`

**描述**: 只安装指定 ID 的 skills

**示例**:
```bash
# 安装 ID 为 1 和 5 的 skills
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skills?skill_ids=1&skill_ids=5"
```

**响应**:
```json
{
  "success": 2,
  "failed": 0,
  "installed_skills": [
    {
      "id": 1,
      "name": "code_review",
      "path": "/Users/kp/.claude/skills/code_review/SKILL.md"
    },
    {
      "id": 5,
      "name": "prompt_optimizer",
      "path": "/Users/kp/.claude/skills/prompt_optimizer/SKILL.md"
    }
  ],
  "failed_skills": [],
  "claude_skills_directory": "/Users/kp/.claude/skills"
}
```

---

### 4. 安装单个 Skill

**端点**: `POST /api/v1/claude-code/install-skill/{skill_id}`

**描述**: 安装指定 ID 的单个 skill

**示例**:
```bash
# 安装 ID 为 5 的 skill
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skill/5
```

**响应**:
```json
{
  "success": true,
  "skill": {
    "id": 5,
    "name": "prompt_optimizer",
    "path": "/Users/kp/.claude/skills/prompt_optimizer/SKILL.md"
  },
  "message": "Successfully installed skill 'prompt_optimizer' to Claude Code"
}
```

---

### 5. 卸载 Skill

**端点**: `DELETE /api/v1/claude-code/uninstall-skill/{skill_name}`

**描述**: 从 Claude Code 中卸载指定名称的 skill

**示例**:
```bash
# 卸载名为 prompt_optimizer 的 skill
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

## 完整工作流程示例

### 场景 1: 创建并安装新 Skill

```bash
# 1. 在数据库中创建新 skill
curl -X POST "http://127.0.0.1:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_skill",
    "description": "测试技能",
    "content": "这是一个测试技能的内容"
  }'

# 响应会包含新创建的 skill ID，假设是 6

# 2. 将新 skill 安装到 Claude Code
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skill/6

# 3. 验证安装
curl http://127.0.0.1:8000/api/v1/claude-code/list-installed-skills
```

---

### 场景 2: 使用 AI 生成并安装 Skill

```bash
# 1. 使用 AI 生成 skill（需要配置 ANTHROPIC_API_KEY）
curl -X POST "http://127.0.0.1:8000/api/v1/skills/ai-generate?natural_language_input=创建一个用于代码重构的技能" \
  -H "Content-Type: application/json"

# 响应会包含新创建的 skill ID，假设是 7

# 2. 安装到 Claude Code
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skill/7
```

---

### 场景 3: 批量同步所有 Skills

```bash
# 将数据库中的所有 skills 同步到 Claude Code
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skills
```

---

### 场景 4: 更新已安装的 Skill

```bash
# 1. 更新数据库中的 skill
curl -X PUT "http://127.0.0.1:8000/api/v1/skills/5" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新后的描述",
    "content": "更新后的内容"
  }'

# 2. 重新安装到 Claude Code（会覆盖旧版本）
curl -X POST http://127.0.0.1:8000/api/v1/claude-code/install-skill/5
```

---

### 场景 5: 清理不需要的 Skill

```bash
# 1. 从 Claude Code 中卸载
curl -X DELETE http://127.0.0.1:8000/api/v1/claude-code/uninstall-skill/old_skill

# 2. 从数据库中删除（可选）
curl -X DELETE http://127.0.0.1:8000/api/v1/skills/3
```

---

## 在 Swagger UI 中使用

访问 http://127.0.0.1:8000/docs，你会看到新的 **claude-code** 标签，包含所有集成 API：

1. **列出已安装的 skills** - 查看当前 Claude Code 中的所有 skills
2. **安装所有 skills** - 一键同步数据库中的所有 skills
3. **安装指定 skills** - 选择性安装特定的 skills
4. **安装单个 skill** - 安装单个 skill
5. **卸载 skill** - 从 Claude Code 中移除 skill

---

## 错误处理

### Claude Code 目录不存在

**错误**:
```json
{
  "detail": "Claude Code skills directory not found at /Users/kp/.claude/skills"
}
```

**解决方法**: 确保 Claude Code 已正确安装并初始化

---

### Skill 不存在

**错误**:
```json
{
  "detail": "Skill not found"
}
```

**解决方法**: 检查 skill ID 是否正确，使用 `GET /api/v1/skills/` 查看所有可用的 skills

---

### 安装失败

**响应**:
```json
{
  "success": 3,
  "failed": 1,
  "installed_skills": [...],
  "failed_skills": [
    {
      "id": 4,
      "name": "problematic_skill",
      "error": "Permission denied"
    }
  ]
}
```

**解决方法**: 检查文件系统权限，确保有写入 `~/.claude/skills/` 目录的权限

---

## 自动化脚本示例

### Python 脚本：自动同步 Skills

```python
import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

def sync_all_skills():
    """同步所有 skills 到 Claude Code"""
    response = requests.post(f"{BASE_URL}/claude-code/install-skills")
    result = response.json()

    print(f"✓ 成功安装: {result['success']} 个 skills")
    print(f"✗ 安装失败: {result['failed']} 个 skills")

    for skill in result['installed_skills']:
        print(f"  - {skill['name']}")

    return result

if __name__ == "__main__":
    sync_all_skills()
```

---

### Bash 脚本：创建并安装 Skill

```bash
#!/bin/bash

# 创建新 skill
SKILL_JSON='{
  "name": "my_new_skill",
  "description": "我的新技能",
  "content": "技能内容"
}'

# 创建 skill 并获取 ID
RESPONSE=$(curl -s -X POST "http://127.0.0.1:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d "$SKILL_JSON")

SKILL_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo "创建的 Skill ID: $SKILL_ID"

# 安装到 Claude Code
curl -X POST "http://127.0.0.1:8000/api/v1/claude-code/install-skill/$SKILL_ID"

echo "✓ Skill 已安装到 Claude Code"
```

---

## 最佳实践

1. **定期同步**: 在数据库中更新 skills 后，记得重新安装到 Claude Code
2. **版本管理**: 在 skill 的 `meta_data` 中添加版本号，便于追踪
3. **备份**: 定期备份 `~/.claude/skills/` 目录
4. **测试**: 在安装新 skill 后，在 Claude Code 中测试其功能
5. **清理**: 定期清理不再使用的 skills，保持目录整洁

---

## 总结

通过这些 API，你可以：

- ✅ **自动化管理** - 通过 API 自动安装和卸载 skills
- ✅ **集中管理** - 在数据库中统一管理所有 skills
- ✅ **快速同步** - 一键同步所有 skills 到 Claude Code
- ✅ **灵活控制** - 选择性安装特定的 skills
- ✅ **实时更新** - 更新 skill 后立即同步到 Claude Code

现在你可以完全通过 API 来管理 Claude Code 的 skills，无需手动操作文件系统！
