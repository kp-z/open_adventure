"""
Anthropic API Provider - Anthropic API 提供商实现
"""
import uuid
from typing import AsyncIterator, Dict, Any, Optional, List
from datetime import datetime

from anthropic import AsyncAnthropic
from anthropic.types import MessageStreamEvent

from .base import ModelProvider, Message
from app.core.logging import get_logger

logger = get_logger(__name__)


class AnthropicProvider(ModelProvider):
    """Anthropic API 提供商实现"""

    def __init__(self, api_key: str):
        """
        初始化 Anthropic 提供商

        Args:
            api_key: Anthropic API Key
        """
        self.client = AsyncAnthropic(api_key=api_key)
        self.sessions: Dict[str, List[Message]] = {}
        logger.info("AnthropicProvider initialized")

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
        if not session_id:
            session_id = str(uuid.uuid4())

        logger.info(f"Creating session {session_id} for agent {agent_id}")

        # 初始化会话历史
        self.sessions[session_id] = []

        # 如果有 system_prompt，添加到会话历史
        if agent_config.get('system_prompt'):
            system_msg = Message(
                role='system',
                content=agent_config['system_prompt'],
                timestamp=datetime.utcnow().isoformat()
            )
            self.sessions[session_id].append(system_msg)
            logger.debug(f"Added system prompt to session {session_id}")

        return session_id

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
        if session_id not in self.sessions:
            logger.error(f"Session {session_id} not found")
            raise ValueError(f"Session {session_id} not found")

        context = context or {}
        logger.info(f"Sending message to session {session_id}")

        # 添加用户消息到历史
        user_msg = Message(
            role='user',
            content=message,
            timestamp=datetime.utcnow().isoformat()
        )
        self.sessions[session_id].append(user_msg)

        # 构建 API 请求
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in self.sessions[session_id]
            if msg.role != 'system'
        ]

        system_prompt = next(
            (msg.content for msg in self.sessions[session_id] if msg.role == 'system'),
            None
        )

        # 获取模型配置
        model = context.get('model', 'claude-opus-4-6')
        # 映射模型名称
        model_mapping = {
            'opus': 'claude-opus-4-6',
            'sonnet': 'claude-sonnet-4-6',
            'haiku': 'claude-3-5-haiku-20241022',
            'inherit': 'claude-opus-4-6'
        }
        if model in model_mapping:
            model = model_mapping[model]

        max_tokens = context.get('max_tokens', 4096)

        logger.debug(f"Using model: {model}, max_tokens: {max_tokens}")

        try:
            # 调用 Anthropic API（流式）
            assistant_content = ""
            async with self.client.messages.stream(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=messages
            ) as stream:
                async for text in stream.text_stream:
                    assistant_content += text
                    yield Message(
                        role='assistant',
                        content=text,
                        timestamp=datetime.utcnow().isoformat(),
                        metadata={'is_chunk': True}
                    )

            # 添加完整的 assistant 消息到历史
            assistant_msg = Message(
                role='assistant',
                content=assistant_content,
                timestamp=datetime.utcnow().isoformat()
            )
            self.sessions[session_id].append(assistant_msg)
            logger.info(f"Message sent successfully to session {session_id}")

        except Exception as e:
            logger.error(f"Error sending message to session {session_id}: {e}")
            raise

    async def close_session(self, session_id: str) -> None:
        """
        关闭会话

        Args:
            session_id: 会话 ID
        """
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Session {session_id} closed")
        else:
            logger.warning(f"Attempted to close non-existent session {session_id}")

    async def get_session_history(self, session_id: str) -> List[Message]:
        """
        获取会话历史

        Args:
            session_id: 会话 ID

        Returns:
            List[Message]: 会话历史消息列表
        """
        return self.sessions.get(session_id, [])
