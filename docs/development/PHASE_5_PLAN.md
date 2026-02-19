# Phase 5 实施计划

## 目标
Workflow 可视化编辑器 + 完整「我的家」+ 游戏化 UI

---

## 一、技术选型

### 1. Workflow 可视化编辑器
**推荐方案：React Flow**
- 官网：https://reactflow.dev/
- 优势：
  - 专为 React 设计，与 Next.js 完美集成
  - 支持节点拖拽、连线、自定义节点
  - 内置布局算法
  - TypeScript 支持完善
  - 活跃维护，文档完善
- 安装：`npm install reactflow`

**备选方案：**
- Xyflow (React Flow 的新名称)
- D3.js + 自定义（复杂度高）

### 2. 游戏化 UI 组件
**推荐方案：Framer Motion**
- 用于动画和过渡效果
- 安装：`npm install framer-motion`

**图标库：Lucide React**
- 已在项目中使用
- 提供丰富的图标

---

## 二、后端 API 增强

### 1. Workflow 模板 API

#### 新增端点
```
POST   /api/workflows/templates          # 创建模板
GET    /api/workflows/templates          # 获取模板列表
GET    /api/workflows/templates/{id}     # 获取模板详情
POST   /api/workflows/from-template/{id} # 从模板创建工作流
DELETE /api/workflows/templates/{id}     # 删除模板
```

#### 数据模型扩展
```python
# models/workflows.py
class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(100))  # 分类
    workflow_data: Mapped[dict] = mapped_column(JSON)  # 完整的 workflow 结构
    is_public: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
```

### 2. 统计 API

#### 新增端点
```
GET /api/stats/overview              # 总览统计
GET /api/stats/executions/recent     # 最近执行
GET /api/stats/executions/success-rate  # 成功率
GET /api/stats/popular/skills        # 热门技能
GET /api/stats/popular/agents        # 热门智能体
```

#### StatsService 实现
```python
# services/stats_service.py
class StatsService:
    async def get_overview(self) -> dict:
        """获取总览统计"""
        return {
            "skills_count": await self.skill_repo.count(),
            "agents_count": await self.agent_repo.count(),
            "teams_count": await self.team_repo.count(),
            "workflows_count": await self.workflow_repo.count(),
            "tasks_count": await self.task_repo.count(),
            "executions_count": await self.execution_repo.count(),
        }

    async def get_recent_executions(self, limit: int = 10):
        """获取最近执行"""
        pass

    async def get_success_rate(self, days: int = 7):
        """获取成功率"""
        pass
```

### 3. Workflow 实时验证增强

#### 增强端点
```
POST /api/workflows/validate-dag     # 验证 DAG（支持未保存的数据）
```

---

## 三、前端实现

### 1. Workflow 可视化编辑器

#### 页面结构
```
app/workflows/[id]/edit/page.tsx     # 编辑页面
components/workflow/
├── WorkflowEditor.tsx               # 主编辑器组件
├── NodePalette.tsx                  # 节点面板
├── NodeConfigPanel.tsx              # 节点配置面板
├── CustomNodes/
│   ├── TaskNode.tsx                 # 任务节点
│   ├── DecisionNode.tsx             # 决策节点
│   └── ParallelNode.tsx             # 并行节点
└── Toolbar.tsx                      # 工具栏
```

#### 核心功能
1. **节点拖拽**
   - 从左侧面板拖拽节点到画布
   - 支持节点移动和删除

2. **连线编辑**
   - 点击节点端口创建连线
   - 支持连线删除
   - 实时验证连线合法性（避免环）

3. **节点配置**
   - 点击节点显示配置面板
   - 配置节点名称、类型、参数
   - 选择关联的 Agent/Team/Skill

4. **实时验证**
   - 每次修改后验证 DAG
   - 显示错误提示（环检测、孤立节点等）

5. **保存和加载**
   - 自动保存草稿
   - 保存为模板
   - 从模板加载

#### 示例代码
```typescript
// components/workflow/WorkflowEditor.tsx
'use client';

import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

export default function WorkflowEditor({ workflowId }: { workflowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
    // 实时验证 DAG
    validateDAG(nodes, [...edges, params]);
  }, [nodes, edges]);

  return (
    <div className="h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
```

### 2. Home Dashboard 完善

#### 组件结构
```
app/page.tsx                         # 首页
components/home/
├── StatsCards.tsx                   # 统计卡片
├── RecentExecutions.tsx             # 最近执行
├── QuickActions.tsx                 # 快速操作
└── SuccessRateChart.tsx             # 成功率图表
```

#### 功能清单
1. **统计卡片**
   - Skills/Agents/Teams/Workflows/Tasks 数量
   - 点击跳转到对应列表页

2. **最近执行**
   - 显示最近 10 条执行记录
   - 状态标识（成功/失败/运行中）
   - 点击查看详情

3. **快速操作**
   - 同步 Claude
   - 创建 Workflow
   - 创建 Task
   - 查看文档

4. **成功率图表**
   - 最近 7 天的执行成功率
   - 使用简单的柱状图或折线图

### 3. 游戏化 UI 模式

#### 设计方案

**模式切换**
- 在顶部导航栏添加切换开关
- 使用 localStorage 保存用户偏好
- 切换时不刷新页面，仅改变样式

**游戏化映射**
```
专业模式          →  游戏化模式
Skills           →  我的技能库
Agents           →  我的英雄
Agent Teams      →  我的队伍
Workflows        →  副本/流程
Tasks            →  任务
Executions       →  战斗记录
```

**视觉风格**
- 卡片式布局
- 图标更生动（使用 Lucide 图标）
- 添加动画效果（Framer Motion）
- 颜色更鲜艳（保持可读性）
- 添加等级、经验值等游戏化元素（基于使用次数）

#### 组件结构
```
components/gamified/
├── HeroCard.tsx                     # 英雄卡片（Agent）
├── SkillCard.tsx                    # 技能卡片
├── TeamCard.tsx                     # 队伍卡片
├── DungeonCard.tsx                  # 副本卡片（Workflow）
└── BattleRecord.tsx                 # 战斗记录（Execution）
```

#### 示例代码
```typescript
// components/gamified/HeroCard.tsx
import { motion } from 'framer-motion';
import { User, Star } from 'lucide-react';

export default function HeroCard({ agent }: { agent: Agent }) {
  const level = Math.floor(agent.usage_count / 10) + 1;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-6 text-white"
    >
      <div className="flex items-center gap-4">
        <User size={48} />
        <div>
          <h3 className="text-xl font-bold">{agent.name}</h3>
          <div className="flex items-center gap-1">
            <Star size={16} />
            <span>Lv.{level}</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm">{agent.description}</p>
    </motion.div>
  );
}
```

---

## 四、实施步骤

### Step 1: 后端 API 增强（1-2天）
1. 创建 WorkflowTemplate 模型和迁移
2. 实现 WorkflowTemplateRepository
3. 实现 WorkflowTemplateService
4. 添加模板相关 API 端点
5. 实现 StatsService 和统计 API
6. 测试所有新 API

### Step 2: 安装前端依赖（0.5天）
1. 安装 React Flow: `npm install reactflow`
2. 安装 Framer Motion: `npm install framer-motion`
3. 配置 TypeScript 类型

### Step 3: Workflow 可视化编辑器（3-4天）
1. 创建基础编辑器页面
2. 实现节点拖拽功能
3. 实现连线编辑功能
4. 实现节点配置面板
5. 实现实时 DAG 验证
6. 实现保存和加载功能
7. 实现模板功能

### Step 4: Home Dashboard 完善（1-2天）
1. 实现统计卡片
2. 实现最近执行列表
3. 实现快速操作按钮
4. 实现成功率图表
5. 优化布局和样式

### Step 5: 游戏化 UI 模式（2-3天）
1. 设计游戏化视觉风格
2. 实现模式切换开关
3. 实现游戏化卡片组件
4. 为各个页面添加游戏化视图
5. 添加动画效果
6. 测试两种模式切换

### Step 6: 测试和优化（1天）
1. 端到端测试
2. 性能优化
3. UI/UX 优化
4. 文档更新

**总计：8-12 天**

---

## 五、技术难点和解决方案

### 1. React Flow 学习曲线
**解决方案：**
- 先阅读官方文档和示例
- 从简单的节点开始，逐步增加复杂度
- 参考官方示例代码

### 2. DAG 实时验证性能
**解决方案：**
- 使用防抖（debounce）减少验证频率
- 在前端做基础验证，后端做完整验证
- 缓存验证结果

### 3. 游戏化 UI 与专业模式的切换
**解决方案：**
- 使用 Context API 管理模式状态
- 组件内部根据模式渲染不同样式
- 保持数据层和 API 调用不变

### 4. 动画性能
**解决方案：**
- 使用 Framer Motion 的性能优化特性
- 避免过度动画
- 使用 CSS transform 而非 position

---

## 六、验收标准

### 后端
- [ ] Workflow 模板 CRUD API 正常工作
- [ ] 统计 API 返回正确数据
- [ ] DAG 验证 API 准确检测环和错误

### 前端 - Workflow 编辑器
- [ ] 可以拖拽节点到画布
- [ ] 可以创建和删除连线
- [ ] 可以配置节点属性
- [ ] 实时显示 DAG 验证错误
- [ ] 可以保存和加载 Workflow
- [ ] 可以使用模板创建 Workflow

### 前端 - Home Dashboard
- [ ] 显示正确的统计数据
- [ ] 显示最近执行记录
- [ ] 快速操作按钮正常工作
- [ ] 成功率图表正确显示

### 前端 - 游戏化 UI
- [ ] 模式切换开关正常工作
- [ ] 游戏化视图正确显示
- [ ] 动画流畅不卡顿
- [ ] 两种模式数据一致

---

## 七、风险评估

### 高风险
- React Flow 集成复杂度可能超预期
- 游戏化 UI 设计可能需要多次迭代

### 中风险
- 性能问题（大型 Workflow 渲染）
- 浏览器兼容性

### 低风险
- 后端 API 实现（基于现有架构）
- Dashboard 实现（相对简单）

---

最后更新: 2024-01
