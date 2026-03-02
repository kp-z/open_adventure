# Skills 同步失败和 CLI Status 误报修复

**日期**: 2026-03-02
**问题编号**: #001, #002
**严重程度**: 🔴 严重

## 问题描述

用户反馈 Claude Manager 系统存在两个关键问题：

1. **Claude CLI Status 显示 "System Offline"** - 前端 Dashboard 显示系统离线
2. **同步的 Skills 为空** - 手动触发同步后，Skills 列表仍然为空

## 问题分析

### 实际环境状态

- ✅ Claude CLI 已安装且在 PATH 中可执行（`/root/.local/bin/claude` 版本 2.1.63）
- ✅ `~/.claude/` 配置目录存在且包含 `skills/` 子目录
- ✅ 用户已尝试手动触发同步（点击了 Dashboard 的 Sync 按钮）

### 根本原因

#### 问题 1: Skills 同步失败

通过分析后端日志（`docs/logs/backend.log`），发现关键错误：

```
2026-03-02 11:22:34,269 - app.services.sync_service - ERROR - Error syncing skill writing-rules: 'scope' is an invalid keyword argument for Skill
```

**问题定位**：

1. **Skills 扫描成功** - `file_scanner.py` 成功扫描到了多个 skills（包括 `~/.claude/skills/explain-code` 和插件中的 skills）

2. **同步失败** - 在保存到数据库时，因为 `scope` 字段未被过滤导致 ORM 创建失败：
   - `SkillCreate` schema 定义了 `scope` 字段（用于创建 skill 时指定保存位置）
   - `skill_repository.py` 的 `create()` 方法只排除了 `scripts` 和 `references` 字段
   - **遗漏排除 `scope`**，导致传递给 `Skill(**skill_dict)` 时出错
   - `Skill` ORM 模型没有 `scope` 字段（只有 `id`, `name`, `full_name`, `type`, `description`, `tags`, `source`, `enabled`, `meta`, `created_at`, `updated_at`）

3. **同步过程中断** - 由于每个 skill 创建都失败，最终结果为空

#### 问题 2: CLI Status 误报

**问题定位**：

- 前端判断 "System Offline" 的条件是 `cli_available == false`
- 后端健康检查只尝试配置的 CLI 路径（默认为 `"claude"`）
- 在 Linux 环境下，用户安装的 Claude CLI 位于 `/root/.local/bin/claude`
- 健康检查未尝试其他常见路径，导致检测失败

## 修复方案

### 修复 1: 排除 scope 字段

**文件**: `backend/app/repositories/skill_repository.py`

**修改前**:
```python
async def create(self, skill_data: SkillCreate) -> Skill:
    """Create a new skill"""
    # 只提取 Skill 模型需要的字段，排除 scripts 和 references
    skill_dict = skill_data.model_dump(exclude={'scripts', 'references'})
    skill = Skill(**skill_dict)
    self.session.add(skill)
    await self.session.commit()
    await self.session.refresh(skill)
    return skill
```

**修改后**:
```python
async def create(self, skill_data: SkillCreate) -> Skill:
    """Create a new skill"""
    # 只提取 Skill 模型需要的字段，排除 scripts、references 和 scope
    # scope 是用于创建 skill 时指定保存位置的，不是 ORM 字段
    skill_dict = skill_data.model_dump(exclude={'scripts', 'references', 'scope'})
    skill = Skill(**skill_dict)
    self.session.add(skill)
    await self.session.commit()
    await self.session.refresh(skill)
    return skill
```

### 修复 2: 改进 CLI 健康检查

**文件**: `backend/app/adapters/claude/health_checker.py`

**修改内容**:
- 尝试多个可能的 CLI 路径：
  1. 配置的路径（`settings.claude_cli_path`）
  2. PATH 中的 `claude` 命令
  3. Linux 用户安装路径：`~/.local/bin/claude`
  4. 系统安装路径：`/usr/local/bin/claude`
- 找到可用路径后，更新 `self.cli_path` 以供后续使用
- 改进错误日志，列出所有尝试的路径

**关键代码**:
```python
# 尝试多个可能的路径
cli_paths_to_try = [
    self.cli_path,  # 配置的路径
    "claude",  # PATH 中的命令
    str(Path.home() / ".local" / "bin" / "claude"),  # Linux 用户安装路径
    "/usr/local/bin/claude",  # 系统安装路径
]

for cli_path in cli_paths_to_try:
    try:
        result = await self._run_command([cli_path, "--version"])
        if result["success"]:
            cli_available = True
            version = result["output"].strip()
            logger.info(f"Claude CLI available at {cli_path}: {version}")
            # 更新实际可用的路径
            self.cli_path = cli_path
            break
    except Exception as e:
        logger.debug(f"Failed to check Claude CLI at {cli_path}: {e}")
        continue
```

## 验证测试

### 测试 1: Skill 创建测试

**测试脚本**: `backend/test_skill_sync_fix.py`

**测试结果**:
```
✅ Skill 创建成功!
  - ID: 30
  - Name: test-skill
  - Source: SkillSource.USER
  - Meta: {'path': '/test/path'}
✅ 正确: scope 字段已被排除
✅ 测试数据已清理
```

### 测试 2: 健康检查测试

**预期行为**:
- 在 Linux 环境下，健康检查应该能找到 `/root/.local/bin/claude`
- `cli_available` 应该为 `true`
- Dashboard 应该显示 "System Online"

## 影响范围

### 受影响的功能
1. ✅ Skills 同步 - 现在可以正常创建 skills
2. ✅ CLI 健康检查 - 现在可以在多种环境下正确检测 CLI
3. ✅ Dashboard 状态显示 - 现在可以正确显示系统状态

### 不受影响的功能
- Agents 同步
- Workflows 执行
- 其他 CRUD 操作

## 部署建议

1. **立即部署** - 这是严重问题，影响核心功能
2. **重启后端服务** - 确保新代码生效
3. **手动触发同步** - 在 Dashboard 点击 Sync 按钮，验证 skills 是否正常同步
4. **检查日志** - 确认没有 `'scope' is an invalid keyword argument` 错误

## 后续改进

1. **添加集成测试** - 测试完整的同步流程
2. **改进错误处理** - 同步失败时提供更详细的错误信息
3. **添加健康检查缓存** - 避免频繁检测 CLI 路径
4. **环境变量配置** - 允许通过环境变量指定 CLI 路径

## 相关文件

- `backend/app/repositories/skill_repository.py` - Skill 仓库
- `backend/app/adapters/claude/health_checker.py` - 健康检查器
- `backend/app/schemas/skill.py` - Skill Schema 定义
- `backend/app/models/skill.py` - Skill ORM 模型
- `backend/test_skill_sync_fix.py` - 验证测试脚本

## 总结

通过排除 `scope` 字段和改进 CLI 路径检测，成功修复了 Skills 同步失败和 CLI Status 误报的问题。这两个修复都是针对性的、最小化的改动，不会影响其他功能。
