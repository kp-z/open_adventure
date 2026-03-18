"""Console logs API router."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pathlib import Path
from datetime import datetime, timedelta
import json
import asyncio
from typing import List, Optional

from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/logs", tags=["logs"])

# 日志存储目录
LOG_DIR = Path("docs/logs/console")
LOG_DIR.mkdir(parents=True, exist_ok=True)

# WebSocket 连接池
active_connections: List[WebSocket] = []


@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    """实时日志流 WebSocket"""
    await websocket.accept()
    active_connections.append(websocket)
    logger.info(f"New log stream connection. Total connections: {len(active_connections)}")

    try:
        while True:
            # 接收来自客户端的日志
            data = await websocket.receive_text()
            log_entry = json.loads(data)

            # 写入文件
            await save_log_entry(log_entry)

            # 广播到所有连接
            await broadcast_log(log_entry)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logger.info(f"Log stream connection closed. Total connections: {len(active_connections)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)


async def save_log_entry(log_entry: dict):
    """保存日志条目到文件"""
    try:
        source = log_entry.get('source', 'unknown')
        date = datetime.now().strftime('%Y%m%d')
        log_file = LOG_DIR / f"{source}-{date}.log"

        # 异步写入文件
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: log_file.open('a', encoding='utf-8').write(
                json.dumps(log_entry, ensure_ascii=False) + '\n'
            )
        )
    except Exception as e:
        logger.error(f"Failed to save log entry: {e}")


async def broadcast_log(log_entry: dict):
    """广播日志到所有 WebSocket 连接"""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(log_entry)
        except Exception as e:
            logger.error(f"Failed to send log to connection: {e}")
            disconnected.append(connection)

    # 清理断开的连接
    for connection in disconnected:
        if connection in active_connections:
            active_connections.remove(connection)


@router.post("/capture")
async def capture_log(log_entry: dict):
    """接收前端日志（HTTP POST 方式）"""
    try:
        await save_log_entry(log_entry)
        await broadcast_log(log_entry)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Failed to capture log: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/export")
async def export_logs(
    source: Optional[str] = Query(None, description="日志来源"),
    date: Optional[str] = Query(None, description="日期 (YYYYMMDD)")
):
    """导出日志"""
    try:
        if date:
            pattern = f"*-{date}.log"
        elif source:
            pattern = f"{source}-*.log"
        else:
            pattern = "*.log"

        logs = []
        for log_file in LOG_DIR.glob(pattern):
            with open(log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        logs.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass

        return {"logs": logs, "count": len(logs)}
    except Exception as e:
        logger.error(f"Failed to export logs: {e}")
        return {"logs": [], "count": 0, "error": str(e)}


@router.post("/cleanup")
async def cleanup_old_logs(days: int = Query(7, description="清理多少天前的日志")):
    """清理旧日志"""
    try:
        cutoff = datetime.now() - timedelta(days=days)
        deleted = []

        for log_file in LOG_DIR.glob("*.log"):
            if log_file.stat().st_mtime < cutoff.timestamp():
                log_file.unlink()
                deleted.append(log_file.name)

        logger.info(f"Cleaned up {len(deleted)} old log files")
        return {"deleted": deleted, "count": len(deleted)}
    except Exception as e:
        logger.error(f"Failed to cleanup logs: {e}")
        return {"deleted": [], "count": 0, "error": str(e)}


@router.get("/backend")
async def get_backend_logs(lines: int = Query(100, description="读取最后多少行")):
    """读取后端日志"""
    try:
        backend_log = Path("docs/logs/backend.log")
        if not backend_log.exists():
            return {"logs": []}

        # 读取最后 N 行
        with open(backend_log, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:]

        logs = []
        for line in recent_lines:
            try:
                log_entry = json.loads(line)
                log_entry['source'] = 'backend'
                logs.append(log_entry)
            except json.JSONDecodeError:
                # 非 JSON 格式的日志
                logs.append({
                    'timestamp': datetime.now().isoformat(),
                    'level': 'info',
                    'source': 'backend',
                    'message': line.strip()
                })

        return {"logs": logs}
    except Exception as e:
        logger.error(f"Failed to get backend logs: {e}")
        return {"logs": [], "error": str(e)}
