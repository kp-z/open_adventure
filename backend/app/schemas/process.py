"""Process-related schemas for Claude Code process monitoring."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class ProcessStatus(str, Enum):
    """Process status enumeration."""

    RUNNING = "running"
    IDLE = "idle"
    HIGH_LOAD = "high_load"
    STOPPED = "stopped"


class ClaudeProcessInfo(BaseModel):
    """Information about a Claude Code process."""

    pid: int = Field(..., description="Process ID")
    name: str = Field(..., description="Process name")
    agent_name: Optional[str] = Field(None, description="Agent name if identifiable")
    working_directory: Optional[str] = Field(None, description="Working directory")
    command_line: str = Field(..., description="Full command line")
    start_time: datetime = Field(..., description="Process start time")
    cpu_percent: float = Field(0.0, description="CPU usage percentage")
    memory_percent: float = Field(0.0, description="Memory usage percentage")
    memory_mb: float = Field(0.0, description="Memory usage in MB")
    status: ProcessStatus = Field(ProcessStatus.RUNNING, description="Process status")
    is_managed: bool = Field(
        False, description="Whether this process is managed by Open Adventure"
    )

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "pid": 12345,
                "name": "claude",
                "agent_name": "researcher",
                "working_directory": "/Users/user/project",
                "command_line": "claude --agent researcher",
                "start_time": "2024-01-15T10:30:00",
                "cpu_percent": 15.5,
                "memory_percent": 2.3,
                "memory_mb": 256.0,
                "status": "running",
                "is_managed": True,
            }
        }


class ProcessListResponse(BaseModel):
    """Response for listing processes."""

    processes: List[ClaudeProcessInfo] = Field(default_factory=list)
    total: int = Field(0, description="Total number of processes")


class ProcessStopRequest(BaseModel):
    """Request to stop a process."""

    force: bool = Field(False, description="Force kill the process")


class ProcessStopResponse(BaseModel):
    """Response for stopping a process."""

    success: bool = Field(..., description="Whether the operation succeeded")
    message: str = Field(..., description="Result message")
