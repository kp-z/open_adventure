"""
Claude CLI Provider - Claude Code CLI 提供商实现（保留向后兼容）
"""
import uuid
from typing import AsyncIterator, Dict, Any, Optional, List
from datetime import datetime

from .base import ModelProvider, Message
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClaudeCliProvider(ModelProvider):
    """
    Claude Code CLI 提供商实现

    保留向后兼容，使用 PTY + Claude CLI 的方式
    """

    def __init__(self, cli_path: str = "claude"):
        """
        初始化 Claude CLI 提供商

        Args:
            cli_path: Claude CLI 可执行文件路径
        """
        self.cli_path = cli_path
        self.sessions: Dict[str, Dict[str, Any]] = {}
        logger.info(f"ClaudeCliProvider initialized with cli_path: {cli_path}")

    async def create_session(
        self,
        agent_id: int,
        agent_config: Dict[str, Any],
        session_id: Optional[str] = None
    ) -> str:
        """
        创建会话

        Args:
            agent_id: Agent ID
            agent_config: Agent 配置
            session_id: 可选的会话 ID

        Returns:
            session_id: 会话 ID
        """
        if not session_id:
            session_id = str(uuid.uuid4())

        logger.info(f"Creating CLI session {session_id} for agent {agent_id}")

        # 存储会话信息（实际的 PTY 进程由 AgentProcessManager 管理）
        self.sessions[session_id] = {
            'agent_id': agent_id,
            'agent_config': agent_config,
            'history': []
        }

        return session_id

    async def send_message(
        self,
        session_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncIterator[Message]:
        """
        发送消息（通过 PTY）

        注意：这个方法在 CLI 模式下不会被直接调用，
        实际的消息发送由 AgentProcessManager 通过 PTY 处理

        Args:
            session_id: 会话 ID
            message: 用户消息
            context: 可选的上下文信息

        Yields:
            Message: 流式返回的消息块
        """
        if session_id not in self.sessions:
            logger.error(f"Session {session_id} not found")
            raise ValueError(f"Session {session_id} not found")

        logger.warning(
            "ClaudeCliProvider.send_message() called directly. "
            "In CLI mode, messages should be sent through AgentProcessManager."
        )

        # 返回一个占位消息
        yield Message(
            role='system',
            content='CLI mode: messages are handled by AgentProcessManager',
            timestamp=datetime.utcnow().isoformat()
        )

    async def close_session(self, session_id: str) -> None:
        """
        关闭会话

        Args:
            session_id: 会话 ID
        """
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"CLI session {session_id} closed")
        else:
            logger.warning(f"Attempted to close non-existent CLI session {session_id}")

    async def get_session_history(self, session_id: str) -> List[Message]:
        """
        获取会话历史

        Args:
            session_id: 会话 ID

        Returns:
            List[Message]: 会话历史消息列表
        """
        session = self.sessions.get(session_id, {})
        return session.get('history', [])
