# ECC 核心概念快速参考

**创建日期**: 2026-03-18
**用途**: 快速查阅 Everything Claude Code 的核心概念和最佳实践

## 🎯 核心原则

### 1. 不可变性 (CRITICAL)
**永远创建新对象，永远不要修改现有对象**

```typescript
// ❌ WRONG: 修改原对象
function updateUser(user: User, name: string): User {
  user.name = name // MUTATION!
  return user
}

// ✅ CORRECT: 返回新对象
function updateUser(user: Readonly<User>, name: string): User {
  return {
    ...user,
    name
  }
}
```

**为什么重要**:
- 防止隐藏的副作用
- 使调试更容易
- 支持安全的并发

### 2. 文件组织
**多个小文件 > 少数大文件**

- 典型文件大小：200-400 行
- 最大文件大小：800 行
- 按功能/领域组织，而非按类型
- 高内聚，低耦合

### 3. 错误处理
**在每个层级显式处理错误**

```typescript
async function loadUser(userId: string): Promise<User> {
  try {
    const result = await riskyOperation(userId)
    return result
  } catch (error: unknown) {
    logger.error('Operation failed', error)
    throw new Error(getErrorMessage(error))
  }
}
```

**原则**:
- UI 层：用户友好的错误消息
- 服务端：详细的错误上下文
- 永远不要静默吞掉错误

### 4. 输入验证
**在系统边界验证所有输入**

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

type UserInput = z.infer<typeof userSchema>
const validated: UserInput = userSchema.parse(input)
```

**原则**:
- 使用 Schema 验证（Zod）
- 快速失败，清晰错误
- 永远不要信任外部数据

### 5. TypeScript 类型
**为公共 API 添加显式类型**

```typescript
// ✅ CORRECT: 显式类型
interface User {
  firstName: string
  lastName: string
}

export function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

**原则**:
- 避免 `any`，使用 `unknown`
- `interface` 用于可扩展对象
- `type` 用于联合类型、交叉类型
- 让 TypeScript 推断局部变量类型

## 📁 Rules 系统

### 目录结构
```
~/.claude/rules/
├── common/              # 通用规则（所有语言）
│   ├── agents.md
│   ├── coding-style.md
│   ├── development-workflow.md
│   ├── git-workflow.md
│   ├── hooks.md
│   ├── patterns.md
│   ├── performance.md
│   ├── security.md
│   └── testing.md
├── typescript/          # TypeScript 特定规则
├── python/              # Python 特定规则
├── golang/              # Go 特定规则
└── ...                  # 其他语言
```

### 规则优先级
**语言特定规则 > 通用规则**

当语言特定规则与通用规则冲突时，语言特定规则优先。

## 🪝 Hook 系统

### Hook 类型

| Hook | 触发时机 | 用途 |
|------|---------|------|
| **SessionStart** | 会话启动 | 加载上下文、检测项目类型 |
| **PreToolUse** | 工具使用前 | 验证、参数修改、提醒 |
| **PostToolUse** | 工具使用后 | 自动格式化、类型检查 |
| **PreCompact** | 上下文压缩前 | 保存状态 |
| **Stop** | 每次响应后 | 最终验证、保存会话 |
| **SessionEnd** | 会话结束 | 清理、总结 |

### Hook 运行时控制

```bash
# 设置 Hook Profile
export ECC_HOOK_PROFILE=minimal    # 最小化 hooks
export ECC_HOOK_PROFILE=standard   # 标准 hooks（默认）
export ECC_HOOK_PROFILE=strict     # 严格 hooks

# 禁用特定 Hooks
export ECC_DISABLED_HOOKS=pre:bash:tmux-reminder,post:edit:format
```

## 🧠 持续学习系统 (v2.1)

### Instinct 模型

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"
scope: project
project_id: "a1b2c3d4e5f6"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional on 2025-01-15
```

### 核心特性
- **Atomic**: 一个触发器，一个行动
- **Confidence-weighted**: 0.3-0.9 置信度
- **Domain-tagged**: 按领域分类
- **Evidence-backed**: 追踪观察来源
- **Scope-aware**: 项目级或全局

### 项目隔离
- **Project-scoped**: 默认，防止跨项目污染
- **Global**: 通用模式，跨项目共享
- **Promotion**: 在 2+ 项目中出现后自动提升为全局

## 🛠️ 安装机制

### 安装命令
```bash
# 安装单个语言
./install.sh typescript

# 安装多个语言
./install.sh typescript python golang

# 指定目标
./install.sh --target cursor typescript
./install.sh --target antigravity typescript

# Dry-run 模式
./install.sh --dry-run typescript

# JSON 输出
./install.sh --json typescript
```

### Profile 系统
```bash
# 使用预定义 Profile
./install.sh --profile minimal
./install.sh --profile standard
./install.sh --profile full

# 自定义模块
./install.sh --modules rules-core,hooks-runtime

# 包含/排除组件
./install.sh --with hooks --without agents
```

### 安装状态追踪
- **位置**: `~/.claude/ecc/install-state.json`
- **内容**: 安装时间、模块、操作记录
- **用途**: 幂等性保证、升级管理

## 📦 模块系统

### 核心模块
1. **rules-core**: 核心规则系统
2. **agents-core**: 核心 Agents
3. **commands-core**: 核心 Commands
4. **hooks-runtime**: Hook 运行时
5. **platform-configs**: 平台配置
6. **framework-language**: 框架和语言支持
7. **workflow-quality**: 工作流质量保证

## 🎨 Skills 系统

### 核心 Skills
- **test-master**: 测试策略和框架
- **debugging-wizard**: 错误调查和根因分析
- **api-designer**: REST/GraphQL API 设计
- **tdd-workflow**: 测试驱动开发
- **code-review**: 代码审查

### 持续学习 Skills
- **continuous-learning-v2**: Instinct-Based 学习
- **learn**: 提取可复用模式
- **learn-eval**: 自我评估学习质量

### 前端 Skills
- **frontend-design**: 前端界面设计
- **frontend-patterns**: React/Next.js 模式
- **frontend-slides**: HTML 演示文稿

## 🔍 代码质量检查清单

在标记工作完成前：
- [ ] 代码可读且命名良好
- [ ] 函数小于 50 行
- [ ] 文件小于 800 行
- [ ] 嵌套深度 < 4 层
- [ ] 正确的错误处理
- [ ] 无硬编码值（使用常量或配置）
- [ ] 无变异（使用不可变模式）

## 🚀 最佳实践

### TodoWrite 使用
- 追踪多步骤任务进度
- 验证对指令的理解
- 启用实时调整
- 显示细粒度实现步骤

### Auto-Accept 权限
- 仅用于可信的、定义良好的计划
- 探索性工作时禁用
- 永远不要使用 `dangerously-skip-permissions`
- 在 `~/.claude.json` 中配置 `allowedTools`

### Git 工作流
- 创建新提交，而非修改现有提交
- 避免破坏性操作（除非明确要求）
- 永远不要跳过 hooks（`--no-verify`）
- 永远不要绕过签名（`--no-gpg-sign`）

## 📚 参考资源

### 本地资源
- **ECC 仓库**: `~/项目/Proj/everything-claude-code`
- **Rules 目录**: `~/.claude/rules/`
- **安装状态**: `~/.claude/ecc/install-state.json`

### 在线资源
- **GitHub**: https://github.com/affaan-m/everything-claude-code
- **Shorthand Guide**: https://x.com/affaanmustafa/status/2012378465664745795
- **Longform Guide**: https://x.com/affaanmustafa/status/2014040193557471352

### 项目文档
- **学习计划**: `docs/plans/20260318-ecc-learning-plan.md`
- **安装总结**: `docs/technical/20260318-09-ECC安装成功总结.md`
- **CLAUDE.md**: 项目配置和规范

---

*最后更新: 2026-03-18*
