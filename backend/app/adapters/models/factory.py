"""
Model Provider Factory - 模型提供商工厂类
"""
from typing import Dict, Any

from .base import ModelProvider
from .anthropic_provider import AnthropicProvider
from .claude_cli_provider import ClaudeCliProvider
from .claude_cli_noninteractive_provider import ClaudeCliNonInteractiveProvider
from app.core.logging import get_logger

logger = get_logger(__name__)


class ModelProviderFactory:
    """模型提供商工厂类"""

    @staticmethod
    def create_provider(
        provider_type: str,
        config: Dict[str, Any]
    ) -> ModelProvider:
        """
        根据类型创建提供商实例

        Args:
            provider_type: 提供商类型 ('anthropic', 'claude_cli', 'claude_cli_noninteractive')
            config: 提供商配置

        Returns:
            ModelProvider: 提供商实例

        Raises:
            ValueError: 未知的提供商类型
        """
        logger.info(f"Creating provider: {provider_type}")

        if provider_type == 'anthropic':
            api_key = config.get('api_key')
            if not api_key:
                raise ValueError("Anthropic provider requires 'api_key' in config")
            return AnthropicProvider(api_key=api_key)

        elif provider_type == 'claude_cli':
            cli_path = config.get('cli_path', 'claude')
            return ClaudeCliProvider(cli_path=cli_path)

        elif provider_type == 'claude_cli_noninteractive':
            cli_path = config.get('cli_path', 'claude')
            return ClaudeCliNonInteractiveProvider(cli_path=cli_path)

        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
