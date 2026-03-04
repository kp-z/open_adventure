"""
Claude CLI Non-Interactive Provider - 使用 claude -p 进行非交互式对话
"""
import os
import uuid
import asyncio
from typing import AsyncIterator, Dict, Any, Optional, List
from datetime import datetime

from .base import ModelProvider, Message
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClaudeCliNonInteractiveProvider(ModelProvider):
    """
    Claude CLI 非交互式提供商实现

    使用 `claude -p --agent <agent_name>` 进行对话
    """

    def __init__(self, cli_path: str = "claude"):
        """
        初始化 Claude CLI 非交互式提供商

        Args:
            cli_path: Claude CLI 可执行文件路径
        """
        self.cli_path = cli_path
        self.sessions: Dict[str, List[Message]] = {}
        logger.info(f"ClaudeCliNonInteractiveProvider initialized with cli_path: {cli_path}")

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

        logger.info(f"Creating CLI non-interactive session {session_id} for agent {agent_id}")

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

        return session_id

    async def send_message(
        self,
        session_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncIterator[Message]:
        """
        发送消息，使用 claude -p 执行

        Args:
            session_id: 会话 ID
            message: 用户消息
            context: 可选的上下文信息（如 agent_name, model 等）

        Yields:
            Message: 流式返回的消息块
        """
        if session_id not in self.sessions:
            logger.error(f"Session {session_id} not found")
            raise ValueError(f"Session {session_id} not found")

        context = context or {}
        agent_name = context.get('agent_name', '')
        model = context.get('model', 'inherit')

        logger.info(f"Sending message to session {session_id} using claude -p")
        logger.info(f"Agent name: {agent_name}, Model: {model}")
        logger.info(f"Message content: {message[:100]}...")

        # 添加用户消息到历史
        user_msg = Message(
            role='user',
            content=message,
            timestamp=datetime.utcnow().isoformat()
        )
        self.sessions[session_id].append(user_msg)

        # 构建 claude 命令
        cmd = [self.cli_path, '-p']

        # 添加 agent 参数
        if agent_name:
            cmd.extend(['--agent', agent_name])
            logger.info(f"Using agent: {agent_name}")

        # 添加 model 参数
        if model and model != 'inherit':
            cmd.extend(['--model', model])
            logger.info(f"Using model: {model}")

        # 添加用户消息
        cmd.append(message)

        logger.info(f"Executing command: {' '.join(cmd)}")

        try:
            # 执行 claude 命令
            # 复制当前环境变量并取消嵌套检查
            env = os.environ.copy()
            env['CLAUDECODE'] = ''

            logger.info(f"Starting subprocess with command: {cmd}")

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )

            logger.info(f"Subprocess started with PID: {process.pid}")

            # 读取输出（流式）
            assistant_content = ""
            chunk_count = 0
            if process.stdout:
                while True:
                    chunk = await process.stdout.read(1024)
                    if not chunk:
                        logger.info(f"No more chunks to read, total chunks: {chunk_count}")
                        break

                    text = chunk.decode('utf-8', errors='ignore')
                    assistant_content += text
                    chunk_count += 1

                    logger.info(f"Received chunk {chunk_count}, size: {len(text)} bytes")

                    # 流式返回
                    yield Message(
                        role='assistant',
                        content=text,
                        timestamp=datetime.utcnow().isoformat(),
                        metadata={'is_chunk': True}
                    )

            # 等待进程结束
            logger.info(f"Waiting for process to complete...")
            await process.wait()
            logger.info(f"Process completed with return code: {process.returncode}")

            if process.returncode != 0:
                stderr = await process.stderr.read() if process.stderr else b''
                error_msg = stderr.decode('utf-8', errors='ignore')
                logger.error(f"Claude CLI error (return code {process.returncode}): {error_msg}")
                raise RuntimeError(f"Claude CLI failed: {error_msg}")

            logger.info(f"Total content length: {len(assistant_content)} bytes")

            # 发送最终的完整消息(非 chunk),通知前端流式响应已完成
            logger.info(f"Sending final message (is_chunk=False)")
            yield Message(
                role='assistant',
                content=assistant_content,
                timestamp=datetime.utcnow().isoformat(),
                metadata={'is_chunk': False}
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
            logger.info(f"CLI non-interactive session {session_id} closed")
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
        return self.sessions.get(session_id, [])
