# Claude Code Agent Team 使用指南

## 概述

基于 Claude Code 原生的 Agent Team 功能，为 Claude Manager Phase 6 开发创建协作团队。

## Agent Team 架构说明

根据 Claude Code 文档，Agent Team 的正确使用方式是：

1. **一个 Team Lead**：主会话创建团队并协调工作
2. **动态派发 Teammates**：通过 Task 工具按需创建子代理
3. **共享 Task List**：所有成员通过任务列表协作
4. **直接通信**：Teammates 之间可以互相发送消息

**重要**：不需要预先创建多个独立的团队，而是在一个团队中动态派发不同角色的 teammates。

## 启用 Agent Teams

在 `~/.claude/settings.json` 中添加：

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

或设置环境变量：
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

## 使用方法

### 方式 1: 自然语言创建（推荐）

直接告诉 Claude 你的需求，它会自动创建团队：

```
创建一个 Agent Team 来开发 AgentTeam 协作机制。需要 4 个 teammates：
1. 需求分析师（使用 explore agent）- 分析代码库和需求
2. 架构师（使用 plan agent）- 设计技术方案
3. 开发工程师（使用 general-purpose agent）- 实现代码
4. QA 工程师（使用 code-reviewer agent）- 代码审查和测试

让他们按顺序工作，每个阶段完成后传递给下一个。
```

### 方式 2: 手动创建和管理

#### 步骤 1: 创建团队

```bash
# 在 Claude Code 会话中
/team create phase6-development-team
```

或使用 TeamCreate 工具（在代码中）。

#### 步骤 2: 创建任务

```
创建以下任务：
1. 需求分析 - 分析现有代码库，识别需要修改的模块
2. 架构设计 - 设计消息传递机制的技术方案
3. 代码实现 - 实现消息队列和异步通信
4. 质量保证 - 代码审查和测试验证
```

#### 步骤 3: 派发 Teammates

```
派发 4 个 teammates：
- 派发 explore agent 作为需求分析师，分配任务 1
- 派发 plan agent 作为架构师，分配任务 2（依赖任务 1）
- 派发 general-purpose agent 作为开发工程师，分配任务 3（依赖任务 2）
- 派发 code-reviewer agent 作为 QA 工程师，分配任务 4（依赖任务 3）
```

## 团队角色定义

### 1. 需求分析师 (Requirements Analyst)
- **Agent Type**: `explore`
- **职责**:
  - 代码库探索和分析
  - 需求澄清和文档化
  - 依赖关系识别
- **输出**: 需求分析文档

### 2. 架构师 (Solution Architect)
- **Agent Type**: `plan`
- **职责**:
  - 技术方案设计
  - 架构评估和验证
  - 接口定义
- **输出**: 架构设计文档

### 3. 开发工程师 (Lead Developer)
- **Agent Type**: `general-purpose`
- **职责**:
  - 代码实现
  - 单元测试编写
  - 文档更新
- **输出**: 实现代码和测试

### 4. QA 工程师 (QA Engineer)
- **Agent Type**: `code-reviewer`
- **职责**:
  - 代码审查
  - 测试验证
  - 质量报告
- **输出**: 质量报告和改进建议

## 工作流程示例

### 完整开发流程

```
我需要实现 AgentTeam 之间的消息传递机制。创建一个 agent team，
包含需求分析、架构设计、实现和 QA 四个角色，按顺序执行。

要求：
- 需求分析师先探索现有代码，识别需要修改的模块
- 架构师基于需求分析结果设计技术方案
- 开发工程师根据设计文档实现代码
- QA 工程师审查代码并验证功能

每个阶段完成后，下一个角色自动开始工作。
```

### 并行研究任务

```
创建一个 agent team 来研究 3 种不同的消息队列实现方案：
- Teammate 1: 研究基于 Redis 的方案
- Teammate 2: 研究基于 RabbitMQ 的方案
- Teammate 3: 研究基于内存队列的方案

让他们并行工作，然后讨论各自的发现，最后达成共识。
```

## 查看团队状态

### 查看团队配置

```bash
cat ~/.claude/teams/<team-name>/config.json
```

### 查看任务列表

```bash
ls ~/.claude/tasks/<team-name>/
```

### 在会话中查看

```
显示当前团队的所有 teammates 和他们的状态
```

或

```
显示任务列表
```

## 与 Teammates 交互

### 发送消息给特定 Teammate

```
告诉需求分析师：请重点关注 backend/app/services/ 目录下的代码
```

### 广播消息给所有 Teammates

```
广播给所有 teammates：我们需要在今天完成这个功能
```

### 查看 Teammate 的输出

- **In-process 模式**: 按 `Shift+Down` 切换到不同的 teammate
- **Split-pane 模式**: 点击对应的窗格

## 清理团队

完成工作后，清理团队资源：

```
关闭所有 teammates 并清理团队
```

或手动：

```bash
# 在 Claude Code 会话中
/team delete
```

## 最佳实践

### 1. 合理的团队规模
- 推荐 3-5 个 teammates
- 每个 teammate 5-6 个任务

### 2. 明确的任务边界
- 每个任务应该是独立的工作单元
- 避免多个 teammates 编辑同一个文件

### 3. 适当的任务粒度
- 不要太小（协调成本高）
- 不要太大（缺乏检查点）
- 刚好：一个函数、一个测试文件、一个审查

### 4. 监控和引导
- 定期检查 teammates 的进度
- 及时重定向偏离的方向
- 综合各方的发现

### 5. 避免文件冲突
- 让每个 teammate 负责不同的文件集
- 使用任务依赖避免并发修改

## 故障排除

### Teammates 没有出现
- 检查是否启用了实验性功能
- 确认任务足够复杂，需要团队协作
- 使用 `Shift+Down` 切换查看（in-process 模式）

### 权限提示过多
- 在派发 teammates 前预先批准常见操作
- 使用 `--dangerously-skip-permissions` 标志（谨慎使用）

### Teammates 遇到错误后停止
- 按 `Shift+Down` 查看 teammate 的输出
- 直接给 teammate 发送额外指令
- 或派发新的 teammate 继续工作

### Lead 提前关闭
- 明确告诉 lead 等待 teammates 完成
- 检查任务列表确认所有任务已完成

## 示例场景

### 场景 1: 新功能开发

```
创建 agent team 开发 "实时通知系统"：
- 需求分析师：分析现有通知机制，识别集成点
- 架构师：设计 WebSocket 架构和消息格式
- 前端工程师：实现前端通知组件
- 后端工程师：实现后端 WebSocket 服务
- QA 工程师：端到端测试和性能验证

前后端工程师可以并行工作，其他角色按顺序执行。
```

### 场景 2: Bug 调查

```
用户报告应用在发送一条消息后退出。创建 agent team 调查：
- Teammate 1: 假设是内存泄漏，检查资源管理
- Teammate 2: 假设是异常处理问题，检查错误日志
- Teammate 3: 假设是配置问题，检查环境变量
- Teammate 4: 假设是依赖冲突，检查包版本
- Teammate 5: 扮演魔鬼代言人，挑战其他人的理论

让他们互相讨论，找出真正的根本原因。
```

### 场景 3: 代码审查

```
创建 agent team 审查 PR #142：
- 安全审查员：检查安全漏洞和输入验证
- 性能审查员：检查性能影响和资源使用
- 测试审查员：验证测试覆盖率和质量

每个审查员独立工作，最后综合所有发现。
```

## 与数据库 Agent Teams 的关系

**重要区分**：

1. **Claude Code Agent Teams**（本文档）
   - 运行时的协作机制
   - 存储在 `~/.claude/teams/`
   - 用于实际执行任务

2. **数据库 Agent Teams**（Claude Manager 的数据模型）
   - 配置和元数据存储
   - 存储在 SQLite 数据库
   - 用于管理和展示

两者可以结合使用：
- 在数据库中保存团队配置模板
- 运行时从模板创建 Claude Code Agent Team
- 执行结果保存回数据库

## 参考资料

- [Claude Code Agent Teams 官方文档](https://code.claude.com/docs/en/agent-teams)
- [Task List 文档](https://code.claude.com/docs/en/interactive-mode#task-list)
- [Subagents vs Agent Teams](https://code.claude.com/docs/en/features-overview#compare-similar-features)
