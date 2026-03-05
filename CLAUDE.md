# Open Adventure 项目上下文

## 项目信息
- **项目名称**: Open Adventure
- **GitHub 仓库**: https://github.com/kp-z/open_adventure
- **仓库所有者**: kp-z
- **仓库名称**: open_adventure

## 项目概述
Open Adventure 是一个管理 Claude AI 生态的系统，包含技能(Skills)、智能体(Agents)、队伍(AgentTeams)、工作流(Workflows)和任务(Tasks)的统一管理平台。

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

### Claude Code Plugin 自动安装
- **内置 Marketplace**：项目包含 `marketplace/open_adventure/` 目录，存放内置的 skills
- **首次启动自动安装**：运行 `./start.sh` 时自动检测并安装插件到 `~/.claude/plugins/open_adventure/`
- **幂等性保证**：重复运行不会重复安装或报错
- **自动配置**：自动更新 `~/.claude/settings.json`，将插件添加到 `enabledPlugins`
- **已包含 Skills**：
  - `prompt_optimizer`: 优化用户输入的 prompt，使其更清晰、具体、结构化

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

marketplace/            # 内置 Claude Code Plugins
└── open_adventure/     # Open Adventure 官方插件
    └── skills/         # Skills 目录
        └── prompt_optimizer/  # Prompt 优化 skill

scripts/
└── install_plugins.sh  # 插件自动安装脚本
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
  - 示例: `open-adventure-v0.1.1-macos-arm64.tar.gz`

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
- 前后端功能如有报错需求，必须统一通过 Notification 组件进行错误提示

### 文件创建规范
- **禁止在项目根目录创建日志、图片、文档文件**
- 创建文件前必须检查上述"文件组织规范"，将文件放到正确的目录
- 生成截图、日志、文档时，自动使用规范的目录路径
- 如发现根目录有不符合规范的文件，应立即移动到正确位置

### 同步 Figma 前端修改
当用户说"同步 Figma 前端修改"或类似指令时，指的是：

**参考项目**: `~/项目/Proj/Claudeadventure`

**操作流程**:
1. 用户会指定一个时间范围或具体的 commit
2. 在 `~/项目/Proj/Claudeadventure` 项目中查找该时间范围内的 commit
3. 查看这些 commit 中的前端代码修改
4. 参考这些修改，将相应的设计和代码应用到当前项目（`open_adventure`）的前端

**示例**:
- "同步 Figma 前端修改，参考昨天的 commit" → 查看 Claudeadventure 项目昨天的 commit
- "同步 Figma 前端修改，参考 2024-01-15 的修改" → 查看该日期的 commit
- "同步 Figma 前端修改，参考 commit abc123" → 查看指定的 commit

**注意事项**:
- 不要直接复制粘贴，要根据当前项目的架构和需求进行适配
- 保持当前项目的代码风格和组件结构
- 如果涉及新的依赖或组件，需要先确认是否需要安装

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

**必须同时发布 macOS 和 Linux 版本的二进制包**

##### 二进制构建（推荐）

使用 PyInstaller 构建保护源码的二进制版本：

**macOS ARM64 版本**：
```bash
cd /Users/kp/项目/Proj/open_adventure
./scripts/build_binary.sh
```

**Linux x86_64 版本**：
```bash
# 在 Linux 环境中运行
cd /path/to/open_adventure
./scripts/build_binary.sh
```

**二进制构建特点**：
- ✅ 源码保护：所有 Python 代码编译为字节码，无法直接查看
- ✅ 独立运行：包含 Python 解释器和所有依赖
- ✅ 用户友好：无需安装 Python 环境
- ⚠️ 体积较大：约 30-40MB（压缩后）

**构建产物**：
- 压缩包位置：`docs/releases/open_adventure-v{版本号}-{平台}-{架构}.tar.gz`
- 压缩包命名：`open_adventure-v{版本号}-macos-arm64.tar.gz`
- 压缩包命名：`open_adventure-v{版本号}-linux-x86_64.tar.gz`

##### 源码打包（可选）

如果需要提供源码版本（用于开发或调试）：

**macOS ARM64 版本**：
```bash
cd /Users/kp/项目/Proj
tar \
  --exclude='open_adventure/backend/venv' \
  --exclude='open_adventure/backend/dist' \
  --exclude='open_adventure/backend/build' \
  --exclude='open_adventure/venv' \
  --exclude='open_adventure/backend/__pycache__' \
  --exclude='open_adventure/backend/app/__pycache__' \
  --exclude='open_adventure/backend/app/*/__pycache__' \
  --exclude='open_adventure/frontend/node_modules' \
  --exclude='open_adventure/node_modules' \
  --exclude='open_adventure/frontend/.vite' \
  --exclude='open_adventure/.git' \
  --exclude='open_adventure/frontend/.git' \
  --exclude='open_adventure/dist' \
  --exclude='open_adventure/release' \
  --exclude='open_adventure/docs' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  --exclude='open_adventure/.claude' \
  --exclude='open_adventure/.figma' \
  --exclude='open_adventure/.playwright-mcp' \
  -czf /tmp/open_adventure-v{版本号}-macos-arm64-source.tar.gz open_adventure/

mv /tmp/open_adventure-v{版本号}-macos-arm64-source.tar.gz open_adventure/docs/releases/
```

**Linux x86_64 版本**：
```bash
cd /Users/kp/项目/Proj
tar \
  --exclude='open_adventure/backend/venv' \
  --exclude='open_adventure/backend/dist' \
  --exclude='open_adventure/backend/build' \
  --exclude='open_adventure/venv' \
  --exclude='open_adventure/backend/__pycache__' \
  --exclude='open_adventure/backend/app/__pycache__' \
  --exclude='open_adventure/backend/app/*/__pycache__' \
  --exclude='open_adventure/frontend/node_modules' \
  --exclude='open_adventure/node_modules' \
  --exclude='open_adventure/frontend/.vite' \
  --exclude='open_adventure/.git' \
  --exclude='open_adventure/frontend/.git' \
  --exclude='open_adventure/dist' \
  --exclude='open_adventure/release' \
  --exclude='open_adventure/docs' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  --exclude='open_adventure/.claude' \
  --exclude='open_adventure/.figma' \
  --exclude='open_adventure/.playwright-mcp' \
  -czf /tmp/open_adventure-v{版本号}-linux-x86_64-source.tar.gz open_adventure/

mv /tmp/open_adventure-v{版本号}-linux-x86_64-source.tar.gz open_adventure/docs/releases/
```

**源码打包规范**：
- 必须排除 `node_modules`、`venv`、`dist`、`build`、`.git`（包括子目录的 `.git`）等目录
- **必须排除整个 `docs` 目录**（包含开发文档、设计资源、历史版本，不需要分发给用户）
- 必须排除临时文件和缓存目录（`.claude`、`.figma`、`.playwright-mcp`、`.vite`、`__pycache__`）
- 压缩包应仅包含运行所需的核心文件：
  - 后端代码（`backend/app/`、`backend/alembic/` 等）
  - 前端代码（`frontend/src/`、`frontend/dist/`、`frontend/public/` 等）
  - 配置文件（`README.md`、`start.sh`、`requirements.txt`、`package.json`、`.env.example` 等）
  - 工具脚本（`scripts/`）
- 压缩包大小应控制在 **5MB 以内**（理想情况 < 3MB）

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
  docs/releases/open-adventure-v{版本号}-macos-arm64.tar.gz \
  docs/releases/open-adventure-v{版本号}-linux-x86_64.tar.gz
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
wget https://github.com/kp-z/open_adventure/releases/download/v{版本号}/open-adventure-v{版本号}-macos-arm64.tar.gz
tar -xzf open-adventure-v{版本号}-macos-arm64.tar.gz
cd open-adventure
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
  docs/releases/open-adventure-v{版本号}-macos-arm64.tar.gz \
  docs/releases/open-adventure-v{版本号}-linux-x86_64.tar.gz

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
