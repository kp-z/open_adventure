# Skill Classifier

## 描述
自动分析 Skill 的功能特征，为其打上合适的分类标签。支持 10 种固定分类，帮助用户快速找到所需的 Skill。

## 功能
- 分析 Skill 的 name、description 和 tags
- 基于关键词匹配和语义理解进行分类
- 支持多分类（一个 Skill 可属于 1-3 个分类）
- 返回 `category:xxx` 格式的标签

## 分类体系

### 1. code-generation（代码生成）
**描述**：生成代码、脚手架、模板等

**关键词**：
- 英文：generate, create, scaffold, template, boilerplate, code generation, builder, maker
- 中文：生成, 创建, 模板, 脚手架

**示例**：
- 生成 API 接口代码
- 创建 React 组件模板
- 生成数据库 Schema

### 2. code-analysis（代码分析）
**描述**：代码审查、静态分析、质量检查等

**关键词**：
- 英文：analyze, review, check, lint, inspect, audit, quality, static analysis
- 中文：分析, 审查, 检查, 质量, 审计

**示例**：
- 代码审查工具
- 静态分析检查
- 代码质量评估

### 3. documentation（文档处理）
**描述**：生成文档、API 文档、README 等

**关键词**：
- 英文：document, docs, readme, api doc, comment, docstring, documentation
- 中文：文档, 注释, 说明

**示例**：
- 生成 API 文档
- 编写 README
- 添加代码注释

### 4. testing（测试工具）
**描述**：单元测试、集成测试、测试生成等

**关键词**：
- 英文：test, unit test, integration test, e2e, testing, spec, coverage
- 中文：测试, 单元测试, 集成测试

**示例**：
- 生成单元测试
- 运行测试套件
- 测试覆盖率分析

### 5. refactoring（重构优化）
**描述**：代码重构、性能优化、简化等

**关键词**：
- 英文：refactor, optimize, simplify, improve, clean up, performance
- 中文：重构, 优化, 简化, 改进

**示例**：
- 代码重构工具
- 性能优化建议
- 代码简化

### 6. debugging（调试诊断）
**描述**：Bug 修复、日志分析、错误诊断等

**关键词**：
- 英文：debug, fix, diagnose, troubleshoot, error, bug, issue
- 中文：调试, 修复, 诊断, 排查

**示例**：
- Bug 检测工具
- 错误诊断
- 日志分析

### 7. data-processing（数据处理）
**描述**：数据转换、格式化、解析等

**关键词**：
- 英文：parse, transform, convert, format, data, json, csv, xml
- 中文：数据, 转换, 格式化, 解析

**示例**：
- JSON 数据转换
- CSV 文件解析
- 数据格式化

### 8. automation（自动化工具）
**描述**：脚本生成、工作流自动化等

**关键词**：
- 英文：automate, script, workflow, ci/cd, deploy, pipeline
- 中文：自动化, 脚本, 工作流, 部署

**示例**：
- CI/CD 脚本生成
- 自动化部署
- 工作流编排

### 9. ai-enhancement（AI 增强）
**描述**：Prompt 优化、AI 辅助工具等

**关键词**：
- 英文：ai, prompt, optimize, enhance, llm, gpt, assistant
- 中文：AI, 优化, 增强, 助手

**示例**：
- Prompt 优化工具
- AI 辅助编程
- 智能代码补全

### 10. utility（通用工具）
**描述**：其他实用工具

**关键词**：
- 英文：tool, utility, helper, misc, general
- 中文：工具, 实用, 辅助, 通用

**示例**：
- 文件操作工具
- 字符串处理
- 通用辅助函数

## 分类规则

### 输入格式
```json
{
  "name": "skill_name",
  "description": "skill description",
  "tags": ["existing", "tags"]
}
```

### 分类逻辑
1. **关键词匹配**：在 description 中查找分类关键词
2. **语义理解**：理解 Skill 的核心功能
3. **多分类支持**：
   - 如果 Skill 明确属于某个分类，返回 1 个标签
   - 如果 Skill 跨越多个领域，返回 2-3 个最相关的标签
   - 优先级：主要功能 > 次要功能 > 辅助功能

### 输出格式
返回分类标签数组，格式为 `category:xxx`：
```json
["category:code-generation", "category:ai-enhancement"]
```

### 分类示例

**示例 1：Prompt Optimizer**
```
输入：
{
  "name": "prompt_optimizer",
  "description": "优化用户输入的 prompt，使其更清晰、具体、结构化"
}

分析：
- 关键词匹配：prompt, optimize → ai-enhancement
- 语义理解：这是一个 AI 辅助工具

输出：
["category:ai-enhancement"]
```

**示例 2：Bug Detector**
```
输入：
{
  "name": "bug_detector",
  "description": "自动检测代码中的潜在 Bug 和错误"
}

分析：
- 关键词匹配：bug, detect → debugging
- 关键词匹配：检测 → code-analysis
- 语义理解：主要功能是 Bug 检测（debugging），次要功能是代码分析

输出：
["category:debugging", "category:code-analysis"]
```

**示例 3：API Generator**
```
输入：
{
  "name": "api_generator",
  "description": "根据数据模型自动生成 RESTful API 接口代码和文档"
}

分析：
- 关键词匹配：generate, api → code-generation
- 关键词匹配：文档 → documentation
- 语义理解：主要功能是代码生成，次要功能是文档生成

输出：
["category:code-generation", "category:documentation"]
```

## 使用方式

### 通过 Claude Code CLI 调用
```bash
claude -p "使用 skill_classifier 对以下 Skill 进行分类：
Name: prompt_optimizer
Description: 优化用户输入的 prompt，使其更清晰、具体、结构化
返回分类标签列表（category:xxx 格式）"
```

### 批量分类
```bash
claude -p "使用 skill_classifier 对以下 Skills 进行批量分类：
[
  {\"name\": \"skill1\", \"description\": \"...\"},
  {\"name\": \"skill2\", \"description\": \"...\"}
]
返回每个 Skill 的分类标签列表"
```

## 注意事项

1. **分类数量**：每个 Skill 返回 1-3 个分类标签，避免过度分类
2. **优先级**：优先选择最能代表 Skill 核心功能的分类
3. **兜底分类**：如果无法明确分类，使用 `category:utility`
4. **标签格式**：必须使用 `category:` 前缀，以便与其他标签区分
5. **语言支持**：支持中英文关键词匹配

## 参考资料
- 分类定义：`references/categories.json`
- 关键词映射：见上述分类体系
