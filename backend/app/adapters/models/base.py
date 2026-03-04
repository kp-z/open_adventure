"""
Model Provider Base Classes - 模型提供商抽象基类
"""
from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class Message:
    """统一的消息格式"""
    role: str  # 'user', 'assistant', 'system'
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata or {}
        }


class ModelProvider(ABC):
    """模型提供商抽象基类"""

    @abstractmethod
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
            agent_config: Agent 配置（包含 system_prompt, model, tools 等）
            session_id: 可选的会话 ID（用于恢复现有会话）

        Returns:
            session_id: 会话 ID
        """
        pass

    @abstractmethod
    async def send_message(
        self,
        session_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncIterator[Message]:
        """
        发送消息，流式返回响应

        Args:
            session_id: 会话 ID
            message: 用户消息
            context: 可选的上下文信息（如 model, max_tokens 等）

        Yields:
            Message: 流式返回的消息块
        """
        pass

    @abstractmethod
    async def close_session(self, session_id: str) -> None:
        """
        关闭会话

        Args:
            session_id: 会话 ID
        """
        pass

    @abstractmethod
    async def get_session_history(self, session_id: str) -> List[Message]:
        """
        获取会话历史

        Args:
            session_id: 会话 ID

        Returns:
            List[Message]: 会话历史消息列表
        """
        pass
