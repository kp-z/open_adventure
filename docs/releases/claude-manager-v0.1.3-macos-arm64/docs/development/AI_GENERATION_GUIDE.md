# AI 自动生成功能指南

## 概述

Claude Manager 为每个实体提供了两种创建方式：

1. **手动创建** - 用户提供完整的结构化 JSON 数据
2. **AI 自动生成** - 用户提供自然语言描述，AI 自动生成完整且生产就绪的配置

## AI 生成端点

每个实体都有一个 `/ai-generate` 端点，接受自然语言输入并返回完整的实体配置。

### 可用的 AI 生成端点

| 实体 | 端点 | 描述 |
|------|------|------|
| Skills | `POST /api/v1/skills/ai-generate` | 生成技能配置 |
| Prompts | `POST /api/v1/prompts/ai-generate` | 生成提示词配置 |
| Agents | `POST /api/v1/agents/ai-generate` | 生成代理配置 |
| Sub Agents | `POST /api/v1/sub-agents/ai-generate` | 生成子代理配置 |
| Agent Teams | `POST /api/v1/agent-teams/ai-generate` | 生成代理团队配置 |
| Claude Models | `POST /api/v1/models/ai-generate` | 生成模型配置 |
| Tokens | `POST /api/v1/tokens/ai-generate` | 生成 Token 配置 |
| Configurations | `POST /api/v1/configurations/ai-generate` | 生成系统配置 |
| Plugins | `POST /api/v1/plugins/ai-generate` | 生成插件配置 |

## AI 生成特性

### 完整性保证

AI 生成器确保：

- ✅ **所有必填字段都被填充** - 不会遗漏任何必需的字段
- ✅ **生产就绪的值** - 不使用占位符如 "TBD"、"TODO" 或 "example"
- ✅ **合理的默认值** - 为可选字段提供适当的默认值
- ✅ **实际可用的内容** - 生成真实、具体、可直接使用的内容
- ✅ **字段验证** - 确保生成的配置符合数据模型要求

### 智能生成

AI 优化器会：

- 分析用户的自然语言描述
- 理解实体类型的特定要求
- 生成符合最佳实践的配置
- 提供详细的字段内容（不是简化版）
- 包含相关的元数据和配置选项

## 使用示例

### 1. 生成 Skill

**请求：**
```bash
curl -X POST "http://localhost:8000/api/v1/skills/ai-generate?natural_language_input=我需要一个能够分析Python代码质量的技能，包括检查代码风格、潜在bug和安全问题" \
  -H "Content-Type: application/json"
```

**AI 生成的配置示例：**
```json
{
  "name": "python_code_quality_analyzer",
  "description": "全面分析Python代码质量的技能，检查代码风格、潜在bug、安全漏洞和最佳实践遵循情况",
  "content": "分析Python代码的质量指标：\n1. 代码风格检查（PEP 8合规性）\n2. 潜在bug检测（类型错误、未使用变量、逻辑错误）\n3. 安全漏洞扫描（SQL注入、XSS、不安全的依赖）\n4. 性能问题识别\n5. 代码复杂度分析\n6. 文档完整性检查",
  "meta_data": {
    "language": "python",
    "version": "1.0.0",
    "tags": ["code-quality", "static-analysis", "security"],
    "author": "AI Generated"
  }
}
```

### 2. 生成 Agent

**请求：**
```bash
curl -X POST "http://localhost:8000/api/v1/agents/ai-generate?natural_language_input=创建一个专门用于代码审查的AI助手，能够识别代码中的问题并提供改进建议" \
  -H "Content-Type: application/json"
```

**AI 生成的配置示例：**
```json
{
  "name": "code_review_assistant",
  "description": "专业的代码审查AI助手，提供深入的代码分析和改进建议",
  "system_prompt": "你是一个专业的代码审查助手。你的任务是：\n1. 仔细审查提交的代码\n2. 识别潜在的bug、安全问题和性能问题\n3. 检查代码风格和最佳实践\n4. 提供具体、可操作的改进建议\n5. 解释每个问题的原因和影响\n6. 保持友好和建设性的语气\n\n在审查时，请关注：\n- 代码逻辑正确性\n- 错误处理\n- 安全漏洞\n- 性能优化机会\n- 代码可读性和可维护性",
  "model_id": 1,
  "config": {
    "temperature": 0.3,
    "max_tokens": 2048,
    "focus_areas": ["security", "performance", "maintainability"]
  },
  "is_active": true
}
```

### 3. 生成 Plugin

**请求：**
```bash
curl -X POST "http://localhost:8000/api/v1/plugins/ai-generate?natural_language_input=创建一个全局插件，用于记录所有API调用的日志和性能指标" \
  -H "Content-Type: application/json"
```

**AI 生成的配置示例：**
```json
{
  "name": "api_logging_plugin",
  "description": "全局API调用日志和性能监控插件，记录所有请求的详细信息和响应时间",
  "scope": "global",
  "scope_id": null,
  "config": {
    "log_level": "info",
    "include_request_body": true,
    "include_response_body": false,
    "track_performance": true,
    "alert_threshold_ms": 1000,
    "storage": {
      "type": "database",
      "retention_days": 30
    }
  },
  "is_active": true
}
```

### 4. 生成 Claude Model

**请求：**
```bash
curl -X POST "http://localhost:8000/api/v1/models/ai-generate?natural_language_input=配置Claude 3.5 Sonnet模型用于一般对话，温度设置为0.7" \
  -H "Content-Type: application/json"
```

**AI 生成的配置示例：**
```json
{
  "name": "claude-3.5-sonnet-general",
  "model_id": "claude-3-5-sonnet-20241022",
  "description": "Claude 3.5 Sonnet模型配置，用于一般对话和任务处理，平衡创造性和准确性",
  "max_tokens": 4096,
  "temperature": 0.7,
  "config": {
    "top_p": 0.9,
    "top_k": 40,
    "use_case": "general_conversation"
  },
  "is_active": true
}
```

## 与手动创建的对比

### 手动创建（传统方式）

```bash
curl -X POST "http://localhost:8000/api/v1/skills/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "code_review",
    "description": "Code review skill",
    "content": "Review code for quality"
  }'
```

**特点：**
- ❌ 需要用户提供所有字段
- ❌ 可能遗漏可选字段
- ❌ 内容可能过于简单
- ✅ 完全控制每个字段的值

### AI 自动生成（新方式）

```bash
curl -X POST "http://localhost:8000/api/v1/skills/ai-generate?natural_language_input=我需要一个代码审查技能" \
  -H "Content-Type: application/json"
```

**特点：**
- ✅ 只需提供自然语言描述
- ✅ 自动填充所有必填和可选字段
- ✅ 生成详细、完整的内容
- ✅ 包含合理的元数据和配置
- ✅ 生产就绪的配置

## 最佳实践

### 1. 提供详细的描述

**不好的描述：**
```
"创建一个技能"
```

**好的描述：**
```
"创建一个Python代码质量分析技能，能够检查代码风格、识别潜在bug、扫描安全漏洞，并提供改进建议"
```

### 2. 指定关键要求

在描述中包含：
- 实体的主要用途
- 关键功能或特性
- 特定的配置要求
- 目标场景或用例

### 3. 审查生成的配置

虽然 AI 生成的配置是完整的，但建议：
- 检查生成的字段值是否符合预期
- 根据具体需求调整配置
- 验证敏感字段（如 API keys）

### 4. 迭代优化

如果首次生成的配置不完全符合需求：
- 提供更详细的描述
- 明确指出需要的特定字段值
- 使用手动编辑端点进行微调

## 错误处理

### 生成失败

如果 AI 生成失败，API 会返回错误信息：

```json
{
  "detail": "AI generation failed: Missing required fields: name, description"
}
```

**常见原因：**
- 描述过于模糊
- 缺少关键信息
- API key 未配置或无效

**解决方法：**
- 提供更详细的描述
- 检查 `.env` 文件中的 `ANTHROPIC_API_KEY`
- 查看服务器日志了解详细错误

## 配置要求

要使用 AI 生成功能，需要：

1. **有效的 Anthropic API Key**
   ```env
   ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   ```

2. **服务器正常运行**
   ```bash
   ./start.sh
   ```

3. **网络连接**
   - 需要访问 Anthropic API

## API 文档

完整的 API 文档可在以下地址查看：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

在 Swagger UI 中，你可以：
- 查看所有 AI 生成端点
- 测试 AI 生成功能
- 查看请求/响应示例
- 了解字段要求

## 总结

AI 自动生成功能提供了一种更快速、更智能的方式来创建实体配置：

- ✅ **节省时间** - 无需手动填写所有字段
- ✅ **减少错误** - AI 确保配置完整性
- ✅ **提高质量** - 生成生产就绪的配置
- ✅ **易于使用** - 只需自然语言描述
- ✅ **灵活性** - 仍可手动创建或编辑

无论选择哪种方式，Claude Manager 都能满足你的需求！
