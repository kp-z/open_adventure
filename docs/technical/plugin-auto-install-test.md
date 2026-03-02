# Claude Manager Plugin 自动安装功能测试

## 测试日期
2026-03-02

## 测试目的
验证 Claude Manager 在首次启动时能够自动安装内置的 Claude Code plugins 和 skills。

## 测试环境
- 操作系统: macOS
- Claude Code CLI: 已安装
- Python: 3.x

## 测试步骤

### 1. 清理测试环境
```bash
# 删除已安装的插件（如果存在）
rm -rf ~/.claude/plugins/open_adventure

# 备份 settings.json（可选）
cp ~/.claude/settings.json ~/.claude/settings.json.backup
```

### 2. 运行启动脚本
```bash
cd /Users/kp/项目/Proj/claude_manager
./start.sh
```

### 3. 验证安装结果

#### 3.1 检查插件目录
```bash
ls -la ~/.claude/plugins/open_adventure/
```

**期望结果**：
- 目录存在
- 包含 `skills/` 子目录
- `skills/prompt_optimizer/SKILL.md` 文件存在

#### 3.2 检查 settings.json
```bash
cat ~/.claude/settings.json | grep -A 5 '"enabledPlugins"'
```

**期望结果**：
- `enabledPlugins` 对象中包含 `"open_adventure": true`

#### 3.3 检查 SKILL.md 内容
```bash
cat ~/.claude/plugins/open_adventure/skills/prompt_optimizer/SKILL.md | head -10
```

**期望结果**：
- 文件包含正确的 YAML frontmatter
- `name: prompt_optimizer`
- `description` 字段存在

### 4. 测试幂等性
```bash
# 再次运行安装脚本
bash scripts/install_plugins.sh
```

**期望结果**：
- 输出 "✅ 插件已安装"
- 不会重复安装或报错

## 测试结果

### ✅ 测试通过

所有测试步骤均通过，功能正常：

1. **插件目录创建** ✅
   - 目录: `~/.claude/plugins/open_adventure/`
   - 文件结构正确

2. **文件复制** ✅
   - `skills/prompt_optimizer/SKILL.md` 正确复制
   - 文件内容完整

3. **settings.json 更新** ✅
   - `enabledPlugins` 对象正确更新
   - 插件已启用: `"open_adventure": true`

4. **幂等性** ✅
   - 重复运行不会报错
   - 正确检测已安装状态

## 使用说明

### 在 Claude Code 中使用

#### 方法 1: 手动调用
```
/prompt_optimizer 帮我写个登录功能
```

#### 方法 2: 自动调用
Claude 会在检测到模糊需求时自动使用该 skill，无需手动调用。

### 示例对话

**用户输入**：
```
帮我实现一个用户管理系统
```

**Claude 使用 prompt_optimizer 后**：
```
任务目标：实现用户管理系统

具体要求：
- 用户 CRUD 操作（创建、读取、更新、删除）
- 用户认证和授权
- 角色和权限管理
- 用户信息验证

输出格式：
- 后端 API 接口
- 数据库模型
- 前端管理界面

约束条件：
- 使用项目现有技术栈
- 遵循 RESTful API 设计
- 添加必要的安全措施
```

## 故障排查

### 问题 1: 插件未安装
**症状**: 运行 `start.sh` 后，`~/.claude/plugins/open_adventure/` 不存在

**解决方案**:
1. 检查 `marketplace/open_adventure/` 目录是否存在
2. 手动运行: `bash scripts/install_plugins.sh`
3. 查看错误输出

### 问题 2: settings.json 更新失败
**症状**: 插件目录存在，但 `settings.json` 中没有 `open_adventure`

**解决方案**:
1. 检查 `~/.claude/settings.json` 是否可写
2. 手动添加:
```json
{
  "enabledPlugins": {
    "open_adventure": true
  }
}
```

### 问题 3: Claude Code 无法识别插件
**症状**: 插件已安装，但 `/prompt_optimizer` 命令不可用

**解决方案**:
1. 重启 Claude Code CLI
2. 检查 SKILL.md 格式是否正确
3. 运行 `claude --debug` 查看插件加载日志

## 后续改进

### 计划添加的 Skills
1. **code_reviewer**: 代码审查 skill
2. **api_generator**: API 文档生成 skill
3. **test_generator**: 测试用例生成 skill

### 改进方向
1. 添加插件版本管理
2. 支持插件更新检测
3. 添加插件卸载功能
4. 支持从远程仓库安装插件

## 参考资料
- [Claude Code Skills 文档](https://code.claude.com/docs/en/skills)
- [Claude Code Plugins 文档](https://code.claude.com/docs/en/plugins-reference)
- [项目 CLAUDE.md](../CLAUDE.md)
