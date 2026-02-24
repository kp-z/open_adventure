# Agent Teams 设计文档

**创建日期**: 2026-02-24
**目标**: 为 Claude Manager 项目创建 Agent Team 体系，支持 Phase 6（AgentTeam 协作机制）的开发

## 设计目标

创建一组 Agent Team，用于 Claude Manager 自身的功能增强，特别是 AgentTeam 协作机制（Phase 6）的开发。要求单次调用即可自动完成从需求分析到质量保证的完整开发流程。

## 整体架构

### 团队层级结构

```
AgentTeam Collaboration Master (主控团队)
    ↓ 调度协调
├── Requirements Analysis Team (需求分析团队)
├── Architecture Design Team (架构设计团队)
├── Implementation Team (实现团队)
└── Quality Assurance Team (质量保证团队)
```

### 工作流程

1. **用户调用**: 用户只需调用 "AgentTeam Collaboration Master"，提供功能需求描述
2. **自动流转**: Master Team 按顺序调用 4 个子团队，每个团队完成后自动触发下一个
3. **数据传递**: 上一阶段的输出自动作为下一阶段的输入
4. **结果汇总**: Master Team 收集所有阶段的输出，生成完整的开发报告

## 团队详细设计

### 1. AgentTeam Collaboration Master (主控团队)

**职责**:
- 任务分解：将用户需求分解为 4 个开发阶段
- 团队调度：按顺序调用子团队（需求分析 → 架构设计 → 实现 → 质量保证）
- 结果传递：将上一阶段的输出作为下一阶段的输入
- 质量把关：检查每个阶段的输出质量，决定是否继续
- 异常处理：处理子团队执行失败的情况
- 最终汇总：生成包含所有阶段成果的完整报告

**成员配置**:
- `general-purpose` (Team Lead, Priority 1): 总体协调和决策
- `plan` (Process Manager, Priority 2): 流程规划和阶段管理

**输入**: 用户的功能需求描述
**输出**: 完整的开发报告（包含需求文档、设计文档、实现代码、测试报告）

---

### 2. Requirements Analysis Team (需求分析团队)

**职责**:
- 代码库分析：理解现有代码结构和相关模块
- 需求澄清：分析用户需求，识别关键功能点
- 依赖识别：找出需要修改或新增的文件和模块
- 文档输出：生成结构化的需求文档

**成员配置**:
- `explore` (Code Analyst, Priority 1): 代码库探索和分析
- `general-purpose` (Requirements Engineer, Priority 2): 需求整理和文档编写

**输入**: 用户需求描述 + 项目上下文
**输出**: 需求分析文档（包含功能点、影响范围、依赖关系）

---

### 3. Architecture Design Team (架构设计团队)

**职责**:
- 技术方案设计：基于需求设计技术实现方案
- 架构评估：评估方案的可行性和风险
- 接口设计：定义模块间的接口和数据流
- 文档输出：生成详细的设计文档

**成员配置**:
- `plan` (Solution Architect, Priority 1): 架构设计和方案规划
- `general-purpose` (Design Reviewer, Priority 2): 设计验证和文档编写

**输入**: 需求分析文档
**输出**: 架构设计文档（包含技术方案、模块设计、接口定义、实施步骤）

---

### 4. Implementation Team (实现团队)

**职责**:
- 代码实现：根据设计文档编写代码
- 环境配置：配置开发和测试环境
- 单元测试：编写和运行单元测试
- 代码优化：优化代码质量和性能

**成员配置**:
- `general-purpose` (Lead Developer, Priority 1): 主要代码实现
- `bash` (DevOps Engineer, Priority 2): 环境配置和脚本编写
- `code-simplifier` (Code Optimizer, Priority 3): 代码简化和优化

**输入**: 架构设计文档
**输出**: 实现代码 + 测试结果 + 实施说明

---

### 5. Quality Assurance Team (质量保证团队)

**职责**:
- 代码审查：检查代码质量、规范性、安全性
- 测试验证：验证功能完整性和正确性
- 文档审查：检查文档的完整性和准确性
- 改进建议：提出代码和架构的改进建议

**成员配置**:
- `code-reviewer` (Code Reviewer, Priority 1): 代码审查和质量把关
- `general-purpose` (QA Engineer, Priority 2): 测试验证和报告编写

**输入**: 实现代码 + 设计文档
**输出**: 质量报告（包含审查结果、测试结果、改进建议）

## 数据流设计

```
用户需求
    ↓
[Master Team] 接收并分解任务
    ↓
[Requirements Team] 需求分析
    ↓ 需求文档
[Architecture Team] 架构设计
    ↓ 设计文档
[Implementation Team] 代码实现
    ↓ 代码 + 测试
[QA Team] 质量保证
    ↓ 质量报告
[Master Team] 汇总结果
    ↓
完整开发报告
```

## 技术实现方案

### 方案 A: 基于 Workflow 的实现（推荐）

**实现方式**:
1. 创建 5 个 AgentTeam（1 个 Master + 4 个子团队）
2. 创建 1 个 Workflow，定义团队调用顺序和数据传递
3. Master Team 通过 Workflow 引擎调度子团队

**优势**:
- 利用现有的 Workflow 机制
- 可视化流程，易于调试
- 支持条件分支和错误处理

**劣势**:
- 依赖 Phase 4 的 Workflow 执行引擎
- 需要先实现 Workflow 功能

### 方案 B: 基于脚本的实现

**实现方式**:
1. 创建 5 个 AgentTeam
2. Master Team 内部使用脚本逻辑调用子团队
3. 通过 API 调用实现团队间通信

**优势**:
- 不依赖 Workflow 引擎
- 实现简单，可立即使用

**劣势**:
- 流程不可视化
- 错误处理需要手动编写

**推荐**: 方案 B（先实现基础功能，后续迁移到方案 A）

## 实施计划

### Phase 1: 创建基础团队
1. 创建 5 个 AgentTeam 的配置文件
2. 定义每个团队的成员和职责
3. 保存到数据库

### Phase 2: 实现 Master Team 逻辑
1. 编写 Master Team 的调度脚本
2. 实现团队间的数据传递机制
3. 添加错误处理和重试逻辑

### Phase 3: 测试和优化
1. 使用真实需求测试完整流程
2. 优化团队配置和调度逻辑
3. 完善文档和使用说明

### Phase 4: 集成到 UI
1. 在 Dashboard 添加 "启动开发流程" 按钮
2. 显示实时进度和阶段输出
3. 支持中断和恢复

## 使用示例

```python
# 用户调用
result = await master_team.execute({
    "requirement": "实现 AgentTeam 之间的消息传递机制，支持异步通信和消息队列"
})

# 自动执行流程
# 1. Requirements Team 分析需求 → 输出需求文档
# 2. Architecture Team 设计方案 → 输出设计文档
# 3. Implementation Team 编写代码 → 输出实现代码
# 4. QA Team 质量保证 → 输出质量报告
# 5. Master Team 汇总结果 → 输出完整报告

# 最终输出
{
    "status": "completed",
    "stages": {
        "requirements": {...},
        "architecture": {...},
        "implementation": {...},
        "qa": {...}
    },
    "summary": "功能开发完成，所有测试通过"
}
```

## 成功标准

1. **功能完整性**: 5 个团队全部创建并可正常调用
2. **自动流转**: 单次调用即可完成完整流程
3. **数据传递**: 阶段间数据正确传递，无丢失
4. **错误处理**: 能够处理子团队执行失败的情况
5. **输出质量**: 每个阶段的输出符合预期格式和质量要求

## 未来扩展

1. **并行执行**: 支持某些阶段的并行执行（如前后端同时开发）
2. **人工介入**: 在关键节点支持人工审核和决策
3. **学习优化**: 根据历史执行数据优化团队配置
4. **模板化**: 为常见任务类型创建预定义的流程模板
