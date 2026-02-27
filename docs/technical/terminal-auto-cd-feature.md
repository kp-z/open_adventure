# 终端自动切换到项目目录功能

## 功能概述
终端现在支持自动切换到配置的项目目录，并可选择自动启动 Claude Code CLI。

## 实现细节

### 1. 数据模型
使用现有的 `ProjectPath` 模型来存储项目路径配置：
- `path`: 项目目录的绝对路径
- `alias`: 项目别名（可选）
- `enabled`: 是否启用该路径
- `recursive_scan`: 是否递归扫描（用于其他功能）

### 2. 终端启动逻辑
当用户打开终端时：
1. 查询数据库获取所有启用的项目路径
2. 选择第一个启用的路径作为初始目录
3. 如果找到项目路径，自动切换到该目录并启动 Claude
4. 如果没有配置项目路径，使用默认的 HOME 目录

### 3. 代码修改

#### backend/app/api/terminal.py
- 添加了 `initial_dir` 和 `auto_start_claude` 参数到 `TerminalSession`
- 在 WebSocket 连接时查询项目路径配置
- Shell 启动后，通过写入 PTY 的方式自动发送 `cd` 和 `claude` 命令

```python
# 关键代码片段
if auto_start_claude and initial_dir:
    async def send_startup_commands():
        """Send cd and claude commands after shell is ready"""
        await asyncio.sleep(0.5)  # Wait for shell to be ready
        # Send cd command
        cd_command = f'cd "{initial_dir}"\n'
        await asyncio.get_event_loop().run_in_executor(
            None, session.write, cd_command
        )
        await asyncio.sleep(0.2)
        # Send claude command
        await asyncio.get_event_loop().run_in_executor(
            None, session.write, 'claude\n'
        )

    asyncio.create_task(send_startup_commands())
```

## 使用方法

### 1. 配置项目路径
通过前端界面或 API 添加项目路径：

```bash
# 使用 API 添加项目路径
curl -X POST http://localhost:8000/api/project-paths \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/Users/username/projects/my-project",
    "alias": "My Project",
    "enabled": true,
    "recursive_scan": true
  }'
```

### 2. 查看配置的路径
```bash
# 获取所有项目路径
curl http://localhost:8000/api/project-paths

# 只获取启用的路径
curl http://localhost:8000/api/project-paths?enabled=true
```

### 3. 打开终端
在前端界面打开终端，系统会：
1. 自动切换到第一个启用的项目目录
2. 自动执行 `claude` 命令启动 Claude Code CLI
3. 如果 Claude 退出，返回到正常的 shell 环境

## 配置优先级
1. 第一个启用的项目路径（按 ID 排序）
2. 如果没有启用的路径，使用 HOME 目录

## 错误处理
- 如果配置的路径不存在，回退到 HOME 目录
- 如果 Claude 命令不存在，shell 会显示错误但继续运行
- 数据库查询失败时，使用默认行为（HOME 目录）

## 测试
运行测试脚本验证功能：
```bash
cd backend
python test_terminal_auto_cd.py
```

## 注意事项
1. 确保配置的路径存在且有访问权限
2. 确保系统已安装 Claude Code CLI
3. 多个项目路径时，只有第一个启用的会被使用
4. 可以通过切换 `enabled` 状态来改变默认目录

## 未来改进
- [ ] 支持用户选择默认项目（添加 `is_default` 字段）
- [ ] 支持多个终端会话使用不同的项目目录
- [ ] 添加最近使用的项目路径记录
- [ ] 支持终端内快速切换项目目录的命令
