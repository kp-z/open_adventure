"""FastAPI application entry point."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import health, skills, agents, agent_teams, workflows, tasks, claude, executions, workflow_templates, stats, team_messages, team_tasks, team_state, skills_stream, websocket, project_paths, projects, token_usage, plugins, processes, config, microverse, tasks_ws, testing, logs, localfs
from app.api.routers import settings as settings_router
from app.api import dashboard, auth, terminal
from app.config.settings import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging, get_logger

# 导入所有模型以确保它们被注册到 Base.metadata（必须在 init_db 之前）
from app.models import Skill, Agent, AgentTeam, Workflow, Task, User, TeamMessage, TeamTask, TeamState, ProjectPath, Project

# Setup logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting Open Adventure Backend...")
    await init_db()
    logger.info("Database initialized")

    # 启动终端清理任务
    terminal.start_cleanup_task()
    await terminal.reconcile_orphan_terminal_executions()

    # 启动 Agent Monitor Service
    from app.services.agent_monitor_service import get_monitor_service
    monitor_service = get_monitor_service()
    await monitor_service.start()
    logger.info("Agent Monitor Service started")

    # 启动 Agent Session 清理任务
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.agent_session_service_async import AgentSessionServiceAsync

    cleanup_task = None

    async def cleanup_agent_sessions():
        """定期清理超过 30 分钟无活动的 Agent 会话"""
        while True:
            try:
                await asyncio.sleep(300)  # 每 5 分钟执行一次

                # 监控连接池状态
                try:
                    from app.core.database import get_connection_pool_status
                    pool_status = await get_connection_pool_status()
                    logger.info(f"Connection pool status: {pool_status}")

                    # 如果连接池使用率过高，发出警告
                    if pool_status.get('checked_out', 0) > 15:  # 超过75%使用率
                        logger.warning(f"High connection pool usage: {pool_status['checked_out']}/20 connections in use")
                except Exception as e:
                    logger.error(f"Failed to get connection pool status: {e}")

                # 使用正确的数据库连接管理
                async with AsyncSessionLocal() as db:
                    session_service = AgentSessionServiceAsync(db)
                    count = await session_service.cleanup_inactive_sessions()
                    if count > 0:
                        logger.info(f"Cleaned up {count} inactive agent sessions")
            except Exception as e:
                logger.error(f"Error cleaning up agent sessions: {e}")
                # 添加更详细的错误信息
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")

    cleanup_task = asyncio.create_task(cleanup_agent_sessions())
    logger.info("Agent session cleanup task started")

    yield

    # Shutdown
    logger.info("Shutting down Open Adventure Backend...")

    # 停止 Agent Monitor Service
    from app.services.agent_monitor_service import get_monitor_service
    monitor_service = get_monitor_service()
    await monitor_service.stop()
    logger.info("Agent Monitor Service stopped")

    # 停止 Agent Session 清理任务
    if cleanup_task:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        logger.info("Agent session cleanup task stopped")

    # 停止终端清理任务并清理所有会话
    terminal.stop_cleanup_task()
    terminal.cleanup_dead_sessions()

    # 清理所有 WebSocket 连接
    from app.services.websocket_manager import get_connection_manager
    manager = get_connection_manager()
    await manager.shutdown()

    await close_db()
    logger.info("Database connections closed")
    logger.info("All processes cleaned up")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="AI Configuration and Management Tool for Claude - Backend API",
    version=settings.app_version,
    lifespan=lifespan,
)

# Request ID Middleware
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        from app.core.logging import set_request_id
        set_request_id(request_id)
        response = await call_next(request)
        response.headers['X-Request-ID'] = request_id
        return response

app.add_middleware(RequestIDMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.get_effective_cors_origin_regex(),
    allow_credentials=False,  # 与现有行为保持一致
    allow_methods=["*"],
    allow_headers=["*"],
)

# Internet access guard (only active when ACCESS_PASSWORD is set)
if settings.internet_access_enabled:
    from app.middleware.access_guard import AccessGuardMiddleware
    app.add_middleware(AccessGuardMiddleware, password=settings.access_password)

# Include routers
app.include_router(auth.router, prefix=f"{settings.api_prefix}")
app.include_router(health.router, prefix=f"{settings.api_prefix}/system")
app.include_router(claude.router, prefix=f"{settings.api_prefix}")
app.include_router(skills.router, prefix=f"{settings.api_prefix}")
app.include_router(skills_stream.router, prefix=f"{settings.api_prefix}")
app.include_router(agents.router, prefix=f"{settings.api_prefix}")
app.include_router(agent_teams.router, prefix=f"{settings.api_prefix}")
app.include_router(workflows.router, prefix=f"{settings.api_prefix}")
app.include_router(workflow_templates.router, prefix=f"{settings.api_prefix}")
app.include_router(tasks.router, prefix=f"{settings.api_prefix}")
app.include_router(executions.router, prefix=f"{settings.api_prefix}")
app.include_router(stats.router, prefix=f"{settings.api_prefix}")
app.include_router(team_messages.router, prefix=f"{settings.api_prefix}")
app.include_router(team_tasks.router, prefix=f"{settings.api_prefix}")
app.include_router(team_state.router, prefix=f"{settings.api_prefix}")
app.include_router(project_paths.router, prefix=f"{settings.api_prefix}")
app.include_router(projects.router, prefix=f"{settings.api_prefix}")
app.include_router(token_usage.router, prefix=f"{settings.api_prefix}")
app.include_router(plugins.router, prefix=f"{settings.api_prefix}")
app.include_router(config.router, prefix=f"{settings.api_prefix}")
app.include_router(settings_router.router, prefix=f"{settings.api_prefix}")
app.include_router(microverse.router, prefix=f"{settings.api_prefix}")
app.include_router(dashboard.router, prefix=f"{settings.api_prefix}/dashboard", tags=["dashboard"])
app.include_router(terminal.router, prefix=f"{settings.api_prefix}/terminal", tags=["terminal"])
app.include_router(processes.router, prefix=f"{settings.api_prefix}")
app.include_router(websocket.router, prefix=f"{settings.api_prefix}/ws")
app.include_router(tasks_ws.router, prefix=f"{settings.api_prefix}/ws")
app.include_router(testing.router)
app.include_router(logs.router)
app.include_router(localfs.router, prefix=f"{settings.api_prefix}")


# 静态文件服务配置 - 先定义目录路径
# 优先使用环境变量指定的目录，否则使用默认的 ../frontend/dist
FRONTEND_DIR = os.environ.get("FRONTEND_DIST_DIR")
if not FRONTEND_DIR:
    # 开发模式：使用相对路径（从 backend/app/main.py 到 frontend/dist）
    current_file = os.path.abspath(__file__)  # backend/app/main.py
    backend_dir = os.path.dirname(os.path.dirname(current_file))  # backend/
    project_root = os.path.dirname(backend_dir)  # 项目根目录
    FRONTEND_DIR = os.path.join(project_root, "frontend", "dist")


# 清除缓存标记端点 - 必须在静态文件挂载之前
@app.get("/.clear-cache")
async def check_clear_cache_flag() -> dict:
    """
    检查清除缓存标记文件是否存在

    前端通过此端点检查是否需要清除 localStorage。
    如果文件存在，返回 200；否则返回 404。
    """
    from pathlib import Path
    from fastapi import HTTPException

    clear_cache_file = Path(FRONTEND_DIR) / ".clear-cache"

    if clear_cache_file.exists():
        return {
            "status": "exists",
            "message": "Clear cache flag exists",
            "file": str(clear_cache_file)
        }
    else:
        raise HTTPException(status_code=404, detail="Clear cache flag not found")


@app.delete("/.clear-cache")
async def delete_clear_cache_flag() -> dict:
    """
    删除清除缓存标记文件

    前端在检测到 .clear-cache 文件后会清除 localStorage，
    然后调用此端点删除标记文件，避免重复清除。
    """
    try:
        from pathlib import Path

        # 获取前端 dist 目录路径
        clear_cache_file = Path(FRONTEND_DIR) / ".clear-cache"

        if clear_cache_file.exists():
            clear_cache_file.unlink()
            logger.info(f"Deleted clear cache flag: {clear_cache_file}")
            return {
                "status": "success",
                "message": "Clear cache flag deleted",
                "file": str(clear_cache_file)
            }
        else:
            return {
                "status": "not_found",
                "message": "Clear cache flag not found",
                "file": str(clear_cache_file)
            }
    except Exception as e:
        logger.error(f"Failed to delete clear cache flag: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to delete clear cache flag: {str(e)}")


# 静态文件服务 - 必须在所有路由之后
if os.path.exists(FRONTEND_DIR):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    from starlette.types import Scope

    # 自定义 StaticFiles 类，为 Godot 游戏文件添加缓存控制
    class MicroverseStaticFiles(StaticFiles):
        async def get_response(self, path: str, scope: Scope):
            response = await super().get_response(path, scope)
            # 为 .pck 和 .wasm 文件设置短期缓存（5 分钟）
            if path.endswith(('.pck', '.wasm')):
                response.headers['Cache-Control'] = 'public, max-age=300'
                logger.debug(f"Set cache header for {path}: max-age=300")
            return response

    # 确保必要的子目录存在
    required_dirs = ["assets", "avatars", "images", "microverse"]
    for dir_name in required_dirs:
        dir_path = os.path.join(FRONTEND_DIR, dir_name)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)
            logger.warning(f"Created missing directory: {dir_path}")

    # 挂载静态文件目录
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")
    app.mount("/avatars", StaticFiles(directory=os.path.join(FRONTEND_DIR, "avatars")), name="avatars")
    app.mount("/images", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images")), name="images")
    # 使用自定义的 MicroverseStaticFiles 类
    app.mount("/microverse", MicroverseStaticFiles(directory=os.path.join(FRONTEND_DIR, "microverse"), html=True), name="microverse")

    # SPA catch-all 路由 - 将所有非 API 请求重定向到 index.html
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """
        SPA catch-all 路由

        将所有非 API、非静态文件的请求重定向到 index.html
        """
        # 如果请求的是静态文件，直接返回
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # 否则返回 index.html（SPA 路由）
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    logger.info(f"Static files mounted from: {FRONTEND_DIR}")
else:
    logger.warning(f"Frontend directory not found: {FRONTEND_DIR}")
    logger.warning("Frontend will not be served. Please build frontend first: cd frontend && npm run build")
