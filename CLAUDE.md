# Claude Manager 项目上下文

## 项目概述
Claude Manager 是一个管理 Claude AI 生态的系统，包含技能(Skills)、智能体(Agents)、队伍(AgentTeams)、工作流(Workflows)和任务(Tasks)的统一管理平台。

## 核心架构
三层架构设计：
- **Adapter 层**: 对接 AI 运行环境（Claude Code CLI、文件系统扫描）
- **Service 层**: 核心业务逻辑（Skills/Agents/AgentTeams/Workflows/Tasks/Execution 管理）
- **UI 层**: 双模式界面（专业管理视图 + 游戏化视图）

## 技术栈
- **后端**: Python + FastAPI + SQLite/ORM
- **前端**: TypeScript + React/Next.js
- **AI 集成**: Claude Code CLI + 文件系统扫描

## 核心实体
| 实体 | 职责 |
|------|------|
| Skill | 可复用的 AI 能力单元 |
| Agent | 具备特定能力的智能体 |
| AgentTeam | 多智能体协作队伍 |
| Workflow | 节点+边组成的 DAG 流程 |
| Task | 工作流的实例化执行 |
| Execution | 执行过程记录与回放（支持 Workflow 和 Agent 测试） |

## 核心功能

### 实时执行监控
- **统一执行历史**：Agent 测试和 Workflow 执行统一展示
- **WebSocket 实时更新**：执行状态变化实时推送（< 500ms 延迟）
- **后台执行支持**：用户可以离开页面，执行继续进行
- **可视化监控**：Dashboard 高亮显示运行中的任务，右下角实时监控

## 目录结构
```
backend/app/
├── adapters/claude/    # Claude 环境适配
├── models/             # ORM 数据模型
├── repositories/       # 数据访问层
├── services/           # 业务逻辑层
└── api/routers/        # REST API 路由

frontend/src/
├── app/                # 页面路由
├── components/         # UI 组件
└── lib/                # API 客户端
```

## 开发阶段
- **Phase 0**: 项目骨架
- **Phase 1**: 数据模型 + CRUD
- **Phase 2**: Claude 适配器 + 同步
- **Phase 3**: Dashboard + 管理界面
- **Phase 4**: Workflow 执行引擎
- **Phase 5**: 可视化编辑器 + 游戏化 UI
- **Phase 6**: AgentTeam 协作
- **Phase 7**: 配置导出 + 插件化

## 设计原则
1. **严格分层**: Adapter/Service/UI 职责清晰，禁止跨层调用
2. **业务语义统一**: 后端用专业术语，前端可换皮但不改语义
3. **数据驱动**: 统计、推荐、评分基于真实 Execution 数据
4. **可扩展**: Adapter 抽象接口，支持未来接入其他 AI 框架

## 文件组织规范

### 强制目录规则
**禁止在项目根目录创建以下类型的文件，必须存放到指定目录：**

#### 📸 图片和截图
- **存放位置**: `docs/images/screenshots/`
- **文件类型**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`
- **命名规范**: 使用描述性名称，如 `agents-page.png`, `workflow-editor.png`

#### 📋 日志文件
- **存放位置**: `docs/logs/`
- **子目录**:
  - `docs/logs/` - 主要日志（backend.log, frontend.log, server.log）
  - `docs/logs/playwright/` - Playwright 测试日志
- **文件类型**: `.log`
- **清理策略**: 定期清理旧日志，保留最近 30 天

#### 📄 文档文件
- **技术文档**: `docs/technical/` - 修复记录、实现总结、技术方案
- **发布说明**: `docs/release-notes/` - 版本发布说明
- **使用指南**: `docs/guides/` - 用户指南、开发指南
- **计划文档**: `docs/plans/` - 功能规划、设计方案
- **故障排查**: `docs/troubleshooting/` - 问题排查文档

#### 🎨 设计资源
- **存放位置**: `docs/design/figma-assets/`
- **文件类型**: Figma 导出的图片、SVG、设计稿

#### 📦 发布包
- **存放位置**: `docs/releases/`
- **文件类型**: `.tar.gz`, `.zip`, `.dmg`, `.exe`
- **命名规范**: `{项目名}-v{版本号}-{平台}-{架构}.{扩展名}`
  - 示例: `claude-manager-v0.1.1-macos-arm64.tar.gz`

#### 🔧 脚本文件
- **启动脚本**: 项目根目录（如 `start.sh`, `restart-frontend.sh`）
- **工具脚本**: `scripts/` 目录
- **测试脚本**: `backend/scripts/` 或 `frontend/scripts/`

### 根目录允许的文件
**仅以下类型的文件允许存放在项目根目录：**
- 配置文件: `CLAUDE.md`, `README.md`, `.env`, `.gitignore`
- 依赖管理: `package.json`, `requirements.txt`, `pyproject.toml`
- 启动脚本: `start.sh`, `run.py`
- 数据库文件: 应存放在 `backend/` 目录

### 文档索引
所有文档的索引和导航请查看: `docs/README_INDEX.md`

---

## AI 助手行为规则

### 模型选择
- **强制使用 Claude Opus 模型**：所有 AI 交互必须使用 Claude Opus 4.6 模型
- 禁止使用其他模型（Sonnet、Haiku 等）
- 确保最高质量的代码生成和问题解决能力

### 语言要求
- 所有回复必须使用中文

### 回复格式
- 每次回复开头必须添加"小张人呢？"

### 工作流程
1. 接收用户指令
2. 使用 prompt_optimizer 技能优化理解
3. 向用户确认优化后的理解
4. 获得确认后执行任务

### 代码规范
- 遵循三层架构，禁止跨层调用
- 命名使用英文专业术语（Skill/Agent/AgentTeam/Workflow/Task/Execution）
- 前端 UI 可游戏化，但 API 和数据模型保持专业
- 所有统计和评分基于真实数据，不虚构

### 文件创建规范
- **禁止在项目根目录创建日志、图片、文档文件**
- 创建文件前必须检查上述"文件组织规范"，将文件放到正确的目录
- 生成截图、日志、文档时，自动使用规范的目录路径
- 如发现根目录有不符合规范的文件，应立即移动到正确位置

---

## Release 发布规范

### 版本号规则
- 遵循语义化版本：`v{major}.{minor}.{patch}`
- **Major**: 重大架构变更或不兼容更新
- **Minor**: 新增功能或重要改进
- **Patch**: Bug 修复和小优化

### 发布前检查清单

#### 1. 代码质量检查
- [ ] 前端编译通过：`cd frontend && npm run build`
- [ ] 后端无语法错误
- [ ] 所有已知严重 Bug 已修复
- [ ] 核心功能测试通过

#### 2. 版本号更新
- [ ] 更新 `frontend/package.json` 中的 `version` 字段
- [ ] 确认版本号符合语义化版本规范

#### 3. 文档准备
- [ ] 创建 Release Notes：`docs/release-notes/RELEASE_NOTES_v{版本号}.md`
- [ ] Release Notes 必须包含：
  - 发布日期
  - 本次更新重点（简要概述）
  - 严重问题修复（🔴 标记）
  - 中等问题修复（🟡 标记）
  - 新增功能（✨ 标记）
  - 文档更新（📝 标记）
  - 升级指南（如有破坏性变更）
  - 已知问题（如有）

#### 4. 打包发布文件

**必须同时发布 macOS 和 Linux 版本**

##### macOS ARM64 版本
```bash
cd /Users/kp/项目/Proj
tar \
  --exclude='claude_manager/backend/venv' \
  --exclude='claude_manager/backend/dist' \
  --exclude='claude_manager/backend/build' \
  --exclude='claude_manager/venv' \
  --exclude='claude_manager/backend/__pycache__' \
  --exclude='claude_manager/backend/app/__pycache__' \
  --exclude='claude_manager/backend/app/*/__pycache__' \
  --exclude='claude_manager/frontend/node_modules' \
  --exclude='claude_manager/node_modules' \
  --exclude='claude_manager/frontend/.vite' \
  --exclude='claude_manager/.git' \
  --exclude='claude_manager/dist' \
  --exclude='claude_manager/release' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  --exclude='claude_manager/docs/logs/*.log' \
  --exclude='claude_manager/docs/releases' \
  --exclude='claude_manager/.claude' \
  --exclude='claude_manager/.figma' \
  --exclude='claude_manager/.playwright-mcp' \
  -czf /tmp/claude-manager-v{版本号}-macos-arm64.tar.gz claude_manager/

mv /tmp/claude-manager-v{版本号}-macos-arm64.tar.gz claude_manager/docs/releases/
```

##### Linux x86_64 版本
```bash
cd /Users/kp/项目/Proj
tar \
  --exclude='claude_manager/backend/venv' \
  --exclude='claude_manager/backend/dist' \
  --exclude='claude_manager/backend/build' \
  --exclude='claude_manager/venv' \
  --exclude='claude_manager/backend/__pycache__' \
  --exclude='claude_manager/backend/app/__pycache__' \
  --exclude='claude_manager/backend/app/*/__pycache__' \
  --exclude='claude_manager/frontend/node_modules' \
  --exclude='claude_manager/node_modules' \
  --exclude='claude_manager/frontend/.vite' \
  --exclude='claude_manager/.git' \
  --exclude='claude_manager/dist' \
  --exclude='claude_manager/release' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  --exclude='claude_manager/docs/logs/*.log' \
  --exclude='claude_manager/docs/releases' \
  --exclude='claude_manager/.claude' \
  --exclude='claude_manager/.figma' \
  --exclude='claude_manager/.playwright-mcp' \
  -czf /tmp/claude-manager-v{版本号}-linux-x86_64.tar.gz claude_manager/

mv /tmp/claude-manager-v{版本号}-linux-x86_64.tar.gz claude_manager/docs/releases/
```

**打包规范**：
- 必须排除 `node_modules`、`venv`、`dist`、`build`、`.git` 等目录
- 必须排除日志文件和已有的 releases 目录
- 必须排除临时文件和缓存目录
- 压缩包大小应控制在 100MB 以内（理想情况 < 70MB）

#### 5. Git 提交和标签

##### 提交代码
```bash
git add -A
git commit -m "Release v{版本号}: {简要描述}

🔴 严重问题修复:
- {修复内容}

🟡 中等问题修复:
- {修复内容}

✨ 新增功能:
- {功能描述}

📝 文档更新:
- {文档更新}

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

##### 创建标签
```bash
git tag -a v{版本号} -m "Release v{版本号}

🔴 严重问题修复:
- {修复内容}

🟡 中等问题修复:
- {修复内容}

✨ 新增功能:
- {功能描述}

📝 文档更新:
- {文档更新}"
```

##### 推送到 GitHub
```bash
git push origin main
git push origin v{版本号}
```

#### 6. 创建 GitHub Release

**必须同时上传 macOS 和 Linux 版本**

```bash
gh release create v{版本号} \
  --title "v{版本号} - {简要标题}" \
  --notes-file docs/release-notes/RELEASE_NOTES_v{版本号}.md \
  docs/releases/claude-manager-v{版本号}-macos-arm64.tar.gz \
  docs/releases/claude-manager-v{版本号}-linux-x86_64.tar.gz
```

**GitHub Release 规范**：
- 标题格式：`v{版本号} - {简要描述}`
- 必须使用 Release Notes 文件作为说明
- 必须同时上传 macOS 和 Linux 两个平台的压缩包
- 压缩包命名必须包含平台和架构信息

### 发布后验证

#### 1. 验证 GitHub Release
- [ ] 访问 Release 页面确认发布成功
- [ ] 确认两个平台的压缩包都已上传
- [ ] 确认 Release Notes 显示正确

#### 2. 验证压缩包
```bash
# 下载并解压测试
wget https://github.com/kp-z/open_adventure/releases/download/v{版本号}/claude-manager-v{版本号}-macos-arm64.tar.gz
tar -xzf claude-manager-v{版本号}-macos-arm64.tar.gz
cd claude-manager
./start.sh
```

- [ ] 压缩包可以正常解压
- [ ] 启动脚本可以正常运行
- [ ] 前端和后端都能正常启动
- [ ] 核心功能可以正常使用

#### 3. 更新文档索引
- [ ] 更新 `docs/README_INDEX.md` 中的 release-notes 部分
- [ ] 确认新版本的文档链接正确

### 注意事项

1. **版本号一致性**
   - `frontend/package.json` 的 version
   - Git 标签
   - Release Notes 文件名
   - 压缩包文件名
   - GitHub Release 标题
   - 以上所有位置的版本号必须完全一致

2. **平台支持**
   - 必须同时发布 macOS ARM64 和 Linux x86_64 版本
   - 如果某个平台无法测试，必须在 Release Notes 中说明

3. **文件大小限制**
   - GitHub 单文件建议不超过 50MB
   - 如果超过 100MB，考虑使用 Git LFS 或外部托管
   - 优先优化打包内容，减少不必要的文件

4. **破坏性变更**
   - 如有破坏性变更，必须在 Release Notes 中明确说明
   - 必须提供详细的升级指南
   - Major 版本号必须递增

5. **回滚准备**
   - 保留上一个版本的压缩包
   - 记录数据库 schema 变更
   - 准备回滚脚本（如需要）

### 发布流程总结

```bash
# 1. 更新版本号
# 编辑 frontend/package.json

# 2. 构建前端
cd frontend && npm run build

# 3. 创建 Release Notes
# 创建 docs/release-notes/RELEASE_NOTES_v{版本号}.md

# 4. 打包两个平台版本
# 执行上述 macOS 和 Linux 打包命令

# 5. Git 提交和标签
git add -A
git commit -m "Release v{版本号}: ..."
git tag -a v{版本号} -m "..."
git push origin main
git push origin v{版本号}

# 6. 创建 GitHub Release
gh release create v{版本号} \
  --title "v{版本号} - ..." \
  --notes-file docs/release-notes/RELEASE_NOTES_v{版本号}.md \
  docs/releases/claude-manager-v{版本号}-macos-arm64.tar.gz \
  docs/releases/claude-manager-v{版本号}-linux-x86_64.tar.gz

# 7. 验证发布
# 下载并测试压缩包
```

### 快速发布命令（AI 助手使用）

当用户要求"发布新版本 release"时，AI 助手应该：

1. 询问版本号（如果未指定）
2. 确认是否已完成所有修改
3. 按照上述流程执行：
   - 更新版本号
   - 构建前端
   - 创建 Release Notes
   - 打包 macOS 和 Linux 版本
   - Git 提交和标签
   - 创建 GitHub Release（同时上传两个平台）
4. 验证发布成功
5. 提供 Release 链接给用户
