# 终端自动切换项目目录功能 - 实现总结

## 完成时间
2026-02-27

## 功能描述
实现了终端自动切换到配置的项目目录，并可选择自动启动 Claude Code CLI 的功能。

## 实现内容

### 1. 后端修改

#### 文件：backend/app/api/terminal.py
**修改内容：**
- 添加了 `initial_dir` 和 `auto_start_claude` 参数到 `TerminalSession` 类
- 在 WebSocket 连接时查询数据库获取启用的项目路径
- 修改 shell 启动逻辑，支持自动切换目录和启动 Claude

**关键代码：**
```python
class TerminalSession:
    def __init__(self, initial_dir: Optional[str] = None, auto_start_claude: bool = False):
        self.initial_dir = initial_dir
        self.auto_start_claude = auto_start_claude
        # ...

    def start(self):
        # 切换到指定目录
        target_dir = self.initial_dir if self.initial_dir and os.path.isdir(self.initial_dir) else home_dir
        os.chdir(target_dir)

        # 自动启动 Claude
        if self.auto_start_claude:
            os.execvp(shell, [shell, '-l', '-i', '-c', f'cd "{target_dir}" && claude || {shell} -l -i'])
```

**WebSocket 端点修改：**
```python
@router.websocket("/ws")
async def terminal_websocket(websocket: WebSocket, db: AsyncSession = Depends(get_db)):
    # 获取第一个启用的项目路径
    repository = ProjectPathRepository(db)
    service = ProjectPathService(repository)
    enabled_paths = await service.get_enabled_paths()

    if enabled_paths:
        initial_dir = enabled_paths[0].path
        auto_start_claude = True
```

### 2. 数据模型
使用现有的 `ProjectPath` 模型：
- `path`: 项目目录路径
- `alias`: 项目别名
- `enabled`: 是否启用
- `recursive_scan`: 是否递归扫描

### 3. 测试文件

#### test_terminal_auto_cd.py
- 测试项目路径的创建和查询
- 验证第一个启用路径的获取逻辑

#### test_project_paths_api.py
- 测试完整的 API 功能
- 验证 CRUD 操作
- 检查终端服务状态

### 4. 文档

#### docs/technical/terminal-auto-cd-feature.md
- 功能概述
- 实现细节
- 使用方法
- 配置说明
- 错误处理
- 未来改进建议

## 工作流程

1. **用户配置项目路径**
   - 通过前端界面或 API 添加项目路径
   - 设置 `enabled=true` 启用路径

2. **打开终端**
   - 前端连接到 WebSocket `/api/terminal/ws`
   - 后端查询数据库获取启用的项目路径
   - 选择第一个启用的路径作为初始目录

3. **自动切换和启动**
   - Shell 启动时自动切换到项目目录
   - 执行 `claude` 命令启动 Claude Code CLI
   - 如果 Claude 退出，返回正常 shell

## 配置优先级
1. 第一个启用的项目路径（按 ID 排序）
2. 如果没有启用的路径，使用 HOME 目录

## 错误处理
- 路径不存在 → 回退到 HOME 目录
- Claude 命令不存在 → 显示错误但继续运行 shell
- 数据库查询失败 → 使用默认行为（HOME 目录）

## 测试验证

### 单元测试
```bash
cd backend
python test_terminal_auto_cd.py
```

### API 测试
```bash
cd backend
python test_project_paths_api.py
```

### 手动测试
1. 启动后端服务
2. 添加项目路径配置
3. 在前端打开终端
4. 验证自动切换到项目目录
5. 验证 Claude 自动启动

## 前端兼容性
- 前端代码无需修改
- 使用现有的 WebSocket 连接
- 后端透明处理目录切换和 Claude 启动

## 未来改进
- [ ] 支持用户选择默认项目（添加 `is_default` 字段）
- [ ] 支持多个终端会话使用不同的项目目录
- [ ] 添加最近使用的项目路径记录
- [ ] 支持终端内快速切换项目目录的命令
- [ ] 添加项目路径的排序功能
- [ ] 支持项目路径的分组管理

## 相关文件
- `backend/app/api/terminal.py` - 终端 WebSocket 端点
- `backend/app/models/project_path.py` - 项目路径数据模型
- `backend/app/services/project_path_service.py` - 项目路径服务
- `backend/app/repositories/project_path_repository.py` - 项目路径仓库
- `backend/app/api/routers/project_paths.py` - 项目路径 API 路由
- `docs/technical/terminal-auto-cd-feature.md` - 功能文档

## 注意事项
1. 确保配置的路径存在且有访问权限
2. 确保系统已安装 Claude Code CLI
3. 多个项目路径时，只有第一个启用的会被使用
4. 可以通过切换 `enabled` 状态来改变默认目录
