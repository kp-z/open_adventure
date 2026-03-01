"""FastAPI application entry point."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import health, skills, agents, agent_teams, workflows, tasks, claude, executions, workflow_templates, stats, team_messages, team_tasks, team_state, skills_stream, websocket, project_paths, token_usage, plugins
from app.api.routers import settings as settings_router
from app.api import dashboard, auth, terminal
from app.config.settings import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging, get_logger

# 导入所有模型以确保它们被注册到 Base.metadata（必须在 init_db 之前）
from app.models import Skill, Agent, AgentTeam, Workflow, Task, User, TeamMessage, TeamTask, TeamState, ProjectPath

# Setup logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting Claude Manager Backend...")
    await init_db()
    logger.info("Database initialized")

    # 启动终端清理任务
    terminal.start_cleanup_task()

    yield

    # Shutdown
    logger.info("Shutting down Claude Manager Backend...")

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=False,  # 使用通配符时必须设为 False
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(token_usage.router, prefix=f"{settings.api_prefix}")
app.include_router(plugins.router, prefix=f"{settings.api_prefix}")
app.include_router(settings_router.router, prefix=f"{settings.api_prefix}")
app.include_router(dashboard.router, prefix=f"{settings.api_prefix}/dashboard", tags=["dashboard"])
app.include_router(terminal.router, prefix=f"{settings.api_prefix}/terminal", tags=["terminal"])
app.include_router(websocket.router, prefix=f"{settings.api_prefix}/ws")


# 静态文件服务（用于打包版本）- 必须在所有路由之后
FRONTEND_DIR = os.environ.get("FRONTEND_DIST_DIR")
if FRONTEND_DIR and os.path.exists(FRONTEND_DIR):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
    logger.info(f"Static files mounted from: {FRONTEND_DIR}")
