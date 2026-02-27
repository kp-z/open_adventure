# 终端自动切换项目目录 - 快速开始

## 快速配置（3 步）

### 1. 添加项目路径
使用 API 或前端界面添加项目路径：

```bash
curl -X POST http://localhost:8000/api/project-paths \
  -H "Content-Type: application/json" \
  -d '{
    "path": "~/项目/Proj/claude_manager",
    "alias": "Claude Manager",
    "enabled": true,
    "recursive_scan": true
  }'
```

### 2. 验证配置
检查项目路径是否添加成功：

```bash
curl http://localhost:8000/api/project-paths?enabled=true
```

### 3. 打开终端
在前端界面打开终端，系统会：
- ✓ 自动切换到项目目录
- ✓ 自动执行 `claude` 命令
- ✓ Claude 退出后返回 shell

## 常见问题

### Q: 终端没有自动切换到项目目录？
**A:** 检查以下几点：
1. 项目路径是否设置为 `enabled: true`
2. 路径是否存在且有访问权限
3. 查看后端日志是否有错误信息

### Q: Claude 命令没有自动执行？
**A:** 确保：
1. 系统已安装 Claude Code CLI
2. Claude 命令在 PATH 中可用
3. 检查终端输出是否有错误信息

### Q: 如何更改默认项目目录？
**A:** 两种方法：
1. 禁用当前第一个路径，启用其他路径
2. 删除当前第一个路径，其他路径会自动成为第一个

### Q: 可以为不同终端设置不同的项目目录吗？
**A:** 当前版本所有终端使用同一个默认目录（第一个启用的路径）。未来版本会支持多终端独立配置。

## 管理命令

### 查看所有项目路径
```bash
curl http://localhost:8000/api/project-paths
```

### 启用/禁用项目路径
```bash
# 切换状态
curl -X POST http://localhost:8000/api/project-paths/{id}/toggle
```

### 更新项目路径
```bash
curl -X PUT http://localhost:8000/api/project-paths/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "新别名",
    "enabled": true
  }'
```

### 删除项目路径
```bash
curl -X DELETE http://localhost:8000/api/project-paths/{id}
```

## 测试脚本

### 测试数据模型
```bash
cd backend
python test_terminal_auto_cd.py
```

### 测试 API
```bash
cd backend
python test_project_paths_api.py
```

## 技术细节
详细的技术文档请查看：
- [功能文档](./terminal-auto-cd-feature.md)
- [实现总结](./20260227-terminal-auto-cd-implementation.md)
