"""API router for Claude Code process management."""

import asyncio
import logging
from typing import List

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from app.schemas.process import (
    ClaudeProcessInfo,
    ProcessListResponse,
    ProcessStopRequest,
    ProcessStopResponse,
)
from app.services.process_detector_service import ProcessDetectorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/processes", tags=["processes"])

# Global process detector service instance
process_detector = ProcessDetectorService()


@router.get("/running", response_model=ProcessListResponse)
async def get_running_processes():
    """
    Get all running Claude Code processes.

    Returns:
        ProcessListResponse with list of running processes.
    """
    try:
        processes = await asyncio.to_thread(process_detector.scan_claude_processes)
        return ProcessListResponse(processes=processes, total=len(processes))
    except Exception as e:
        logger.error(f"Error scanning processes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan processes: {str(e)}")


@router.get("/{pid}", response_model=ClaudeProcessInfo)
async def get_process_details(pid: int):
    """
    Get detailed information about a specific process.

    Args:
        pid: Process ID to query.

    Returns:
        ClaudeProcessInfo with process details.

    Raises:
        HTTPException: If process not found or not accessible.
    """
    try:
        process_info = await asyncio.to_thread(process_detector.get_process_details, pid)
        if not process_info:
            raise HTTPException(status_code=404, detail=f"Process {pid} not found or not accessible")
        return process_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting process details for PID {pid}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get process details: {str(e)}")


@router.post("/{pid}/stop", response_model=ProcessStopResponse)
async def stop_process(pid: int, request: ProcessStopRequest = ProcessStopRequest()):
    """
    Stop a Claude Code process.

    Args:
        pid: Process ID to stop.
        request: Stop request with optional force flag.

    Returns:
        ProcessStopResponse with operation result.

    Raises:
        HTTPException: If operation fails.
    """
    try:
        success = await asyncio.to_thread(process_detector.stop_process, pid, request.force)
        if success:
            return ProcessStopResponse(
                success=True, message=f"Process {pid} stopped successfully"
            )
        else:
            return ProcessStopResponse(
                success=False, message=f"Failed to stop process {pid}"
            )
    except Exception as e:
        logger.error(f"Error stopping process {pid}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop process: {str(e)}")


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time process status updates.

    Sends process list updates every 5 seconds.
    """
    await websocket.accept()
    logger.info("WebSocket connection established for process monitoring")

    try:
        # Store previous process list to detect changes
        previous_pids = set()

        while True:
            try:
                # Scan processes
                processes = await asyncio.to_thread(process_detector.scan_claude_processes)
                current_pids = {p.pid for p in processes}

                # Detect changes
                new_pids = current_pids - previous_pids
                removed_pids = previous_pids - current_pids

                # Send update if there are changes or this is the first scan
                if not previous_pids or new_pids or removed_pids:
                    await websocket.send_json(
                        {
                            "type": "process_update",
                            "processes": [p.model_dump() for p in processes],
                            "total": len(processes),
                            "new_pids": list(new_pids),
                            "removed_pids": list(removed_pids),
                        }
                    )
                    logger.debug(
                        f"Sent process update: {len(processes)} total, "
                        f"{len(new_pids)} new, {len(removed_pids)} removed"
                    )

                previous_pids = current_pids

                # Wait 5 seconds before next scan
                await asyncio.sleep(5)

            except Exception as e:
                logger.error(f"Error in WebSocket process scan: {e}")
                await websocket.send_json(
                    {"type": "error", "message": f"Error scanning processes: {str(e)}"}
                )
                await asyncio.sleep(5)

    except WebSocketDisconnect:
        logger.info("WebSocket connection closed for process monitoring")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
