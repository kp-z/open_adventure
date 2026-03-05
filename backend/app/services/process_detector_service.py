"""Service for detecting and managing Claude Code processes."""

import logging
import os
import signal
from datetime import datetime
from typing import List, Optional

import psutil

from app.schemas.process import ClaudeProcessInfo, ProcessStatus

logger = logging.getLogger(__name__)


class ProcessDetectorService:
    """Service for detecting and managing Claude Code processes."""

    def __init__(self):
        """Initialize the process detector service."""
        self.current_pid = os.getpid()
        self.managed_pids = set()  # PIDs managed by this system

    def scan_claude_processes(self) -> List[ClaudeProcessInfo]:
        """
        Scan all running Claude Code processes.

        Returns:
            List of ClaudeProcessInfo objects for all detected Claude processes.
        """
        processes = []

        for proc in psutil.process_iter(["pid", "name", "cmdline", "create_time"]):
            try:
                if self.is_claude_process(proc):
                    process_info = self._extract_process_info(proc)
                    if process_info:
                        processes.append(process_info)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                # Process terminated or we don't have permission
                continue
            except Exception as e:
                logger.warning(f"Error scanning process {proc.pid}: {e}")
                continue

        return processes

    def get_process_details(self, pid: int) -> Optional[ClaudeProcessInfo]:
        """
        Get detailed information about a specific process.

        Args:
            pid: Process ID to query.

        Returns:
            ClaudeProcessInfo if process exists and is accessible, None otherwise.
        """
        try:
            proc = psutil.Process(pid)
            if self.is_claude_process(proc):
                return self._extract_process_info(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
        except Exception as e:
            logger.warning(f"Error getting process details for PID {pid}: {e}")

        return None

    def is_claude_process(self, proc: psutil.Process) -> bool:
        """
        Check if a process is a Claude Code process.

        Args:
            proc: psutil.Process object to check.

        Returns:
            True if this is a Claude Code process, False otherwise.
        """
        try:
            # Skip our own process
            if proc.pid == self.current_pid:
                return False

            # Get process name and command line
            name = proc.name().lower()
            cmdline = proc.cmdline()

            # Check if it's a Claude process
            # Look for "claude" in process name or command line
            if "claude" in name:
                # Exclude claude-manager itself
                if "claude-manager" in name or "claude_manager" in name:
                    return False
                return True

            # Check command line for claude executable
            if cmdline:
                cmd_str = " ".join(cmdline).lower()
                if "claude" in cmd_str and "claude-manager" not in cmd_str:
                    return True

            return False

        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False

    def stop_process(self, pid: int, force: bool = False) -> bool:
        """
        Stop a Claude Code process.

        Args:
            pid: Process ID to stop.
            force: If True, use SIGKILL instead of SIGTERM.

        Returns:
            True if process was stopped successfully, False otherwise.
        """
        try:
            proc = psutil.Process(pid)

            # Verify it's a Claude process before stopping
            if not self.is_claude_process(proc):
                logger.warning(f"PID {pid} is not a Claude process, refusing to stop")
                return False

            # Send appropriate signal
            if force:
                proc.kill()  # SIGKILL
            else:
                proc.terminate()  # SIGTERM

            # Wait for process to terminate (up to 5 seconds)
            try:
                proc.wait(timeout=5)
            except psutil.TimeoutExpired:
                if not force:
                    # If graceful termination failed, force kill
                    logger.warning(f"Process {pid} did not terminate gracefully, force killing")
                    proc.kill()
                    proc.wait(timeout=5)

            # Remove from managed PIDs if it was managed
            self.managed_pids.discard(pid)

            return True

        except psutil.NoSuchProcess:
            # Process already terminated
            self.managed_pids.discard(pid)
            return True
        except psutil.AccessDenied:
            logger.error(f"Access denied when trying to stop process {pid}")
            return False
        except Exception as e:
            logger.error(f"Error stopping process {pid}: {e}")
            return False

    def mark_as_managed(self, pid: int):
        """
        Mark a process as managed by this system.

        Args:
            pid: Process ID to mark as managed.
        """
        self.managed_pids.add(pid)

    def _extract_process_info(self, proc: psutil.Process) -> Optional[ClaudeProcessInfo]:
        """
        Extract detailed information from a process.

        Args:
            proc: psutil.Process object.

        Returns:
            ClaudeProcessInfo object or None if extraction fails.
        """
        try:
            # Get basic info
            pid = proc.pid
            name = proc.name()
            cmdline = proc.cmdline()
            cmd_str = " ".join(cmdline) if cmdline else name

            # Get working directory
            try:
                cwd = proc.cwd()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                cwd = None

            # Get start time
            create_time = datetime.fromtimestamp(proc.create_time())

            # Get resource usage
            try:
                cpu_percent = proc.cpu_percent(interval=0.1)
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                cpu_percent = 0.0

            try:
                mem_info = proc.memory_info()
                memory_mb = mem_info.rss / (1024 * 1024)  # Convert to MB
                memory_percent = proc.memory_percent()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                memory_mb = 0.0
                memory_percent = 0.0

            # Determine status based on CPU usage
            if cpu_percent > 50:
                status = ProcessStatus.HIGH_LOAD
            elif cpu_percent > 5:
                status = ProcessStatus.RUNNING
            else:
                status = ProcessStatus.IDLE

            # Try to extract agent name from command line
            agent_name = self._extract_agent_name(cmdline)

            # Check if this is a managed process
            is_managed = pid in self.managed_pids

            return ClaudeProcessInfo(
                pid=pid,
                name=name,
                agent_name=agent_name,
                working_directory=cwd,
                command_line=cmd_str,
                start_time=create_time,
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                memory_mb=memory_mb,
                status=status,
                is_managed=is_managed,
            )

        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return None
        except Exception as e:
            logger.warning(f"Error extracting process info for PID {proc.pid}: {e}")
            return None

    def _extract_agent_name(self, cmdline: List[str]) -> Optional[str]:
        """
        Try to extract agent name from command line arguments.

        Args:
            cmdline: Command line arguments list.

        Returns:
            Agent name if found, None otherwise.
        """
        if not cmdline:
            return None

        # Look for common patterns:
        # - --agent <name>
        # - --name <name>
        # - -a <name>
        for i, arg in enumerate(cmdline):
            if arg in ["--agent", "--name", "-a"] and i + 1 < len(cmdline):
                return cmdline[i + 1]

        # Look for agent name in command string
        cmd_str = " ".join(cmdline).lower()
        if "agent" in cmd_str:
            # Try to extract agent name after "agent"
            parts = cmd_str.split("agent")
            if len(parts) > 1:
                # Get the next word after "agent"
                words = parts[1].strip().split()
                if words:
                    return words[0]

        return None
