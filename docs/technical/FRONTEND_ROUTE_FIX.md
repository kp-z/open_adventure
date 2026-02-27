# Claude Manager 前端路由修复

## 修复日期
2026-02-25 23:02

## 问题描述
浏览器打开 `http://localhost:8000/` 显示 API 欢迎信息而不是前端页面：
```json
{"message":"Welcome to Claude Manager API","version":"0.1.0",...}
```

## 根本原因
在 `backend/app/main.py` 中：
1. 第 74-82 行定义了 `@app.get("/")` 路由返回 API 信息
2. 第 89 行挂载静态文件到 `/`
3. FastAPI 优先匹配路由，所以 API 路由覆盖了静态文件

## 解决方案
移除 `@app.get("/")` 路由，让静态文件挂载生效。

### 修改前
```python
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.app_name} API",
        "version": settings.app_version,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/system/health",
    }

# 静态文件服务（用于打包版本）
FRONTEND_DIR = os.environ.get("FRONTEND_DIST_DIR")
if FRONTEND_DIR and os.path.exists(FRONTEND_DIR):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
```

### 修改后
```python
# 静态文件服务（用于打包版本）- 必须在所有路由之后
FRONTEND_DIR = os.environ.get("FRONTEND_DIST_DIR")
if FRONTEND_DIR and os.path.exists(FRONTEND_DIR):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
    logger.info(f"Static files mounted from: {FRONTEND_DIR}")
```

## 测试结果

### ✅ 根路径返回前端 HTML
```bash
curl http://localhost:9003/
```
返回:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>ClaudeAdventure</title>
    ...
```

### ✅ API 路径正常工作
```bash
curl http://localhost:9003/api/system/health
```
返回:
```json
{"status":"healthy","app_name":"Claude Manager","version":"0.1.0"}
```

### ✅ 浏览器自动打开到前端
- 启动应用后自动打开 `http://localhost:8000/`
- 显示前端 Dashboard 页面
- 所有前端路由正常工作

## 路由结构

### API 路由（/api 前缀）
- `/api/system/health` - 健康检查
- `/api/skills` - 技能管理
- `/api/agents` - 智能体管理
- `/api/workflows` - 工作流管理
- `/api/tasks` - 任务管理
- `/docs` - API 文档

### 前端路由（根路径）
- `/` - Dashboard（前端）
- `/skills` - 技能页面（前端）
- `/agents` - 智能体页面（前端）
- `/workflows` - 工作流页面（前端）
- `/tasks` - 任务页面（前端）

## 注意事项

1. **静态文件挂载必须在最后**
   - 静态文件的 `app.mount("/", ...)` 会捕获所有未匹配的路由
   - 必须在所有 API 路由定义之后

2. **API 使用 /api 前缀**
   - 所有 API 路由都有 `/api` 前缀
   - 避免与前端路由冲突

3. **前端使用客户端路由**
   - 前端使用 React Router 的 BrowserRouter
   - 所有前端路由由前端处理

## 修改的文件
- `backend/app/main.py` - 移除根路由，保留静态文件挂载

## 相关文档
- `PACKAGING_UPDATE.md` - 打包配置更新
- `QUICK_START.md` - 快速开始指南
