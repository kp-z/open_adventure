"""
Settings Service
负责配置管理业务逻辑
"""
import re
from typing import Dict, Any, List, Optional
from app.adapters.claude.settings_adapter import SettingsAdapter


class ConfigValidationError(Exception):
    """配置验证错误"""
    pass


class SettingsService:
    """配置管理服务"""

    # 敏感字段关键词（不区分大小写）
    SENSITIVE_KEYWORDS = [
        'token', 'key', 'secret', 'password', 'auth',
        'credential', 'apikey', 'api_key'
    ]

    # 保留的占位符（不脱敏）
    PLACEHOLDER_VALUES = [
        'PROXY_MANAGED',
        'ANTHROPIC_BASE_URL'
    ]

    # 允许的顶级配置键
    ALLOWED_TOP_LEVEL_KEYS = [
        'env', 'permissions', 'model', 'enabledPlugins',
        'language', 'effortLevel', 'hooks'
    ]

    # 允许的语言选项
    ALLOWED_LANGUAGES = [
        '简体中文', 'English', '日本語', '한국어',
        'Français', 'Deutsch', 'Español'
    ]

    # 允许的 effortLevel 选项
    ALLOWED_EFFORT_LEVELS = ['low', 'medium', 'high']

    def __init__(self, adapter: SettingsAdapter = None):
        """
        初始化服务

        Args:
            adapter: 配置适配器，默认创建新实例
        """
        self.adapter = adapter or SettingsAdapter()

    def get_settings(self) -> Dict[str, Any]:
        """
        获取脱敏后的配置

        Returns:
            脱敏后的配置字典

        Raises:
            FileNotFoundError: 配置文件不存在
            json.JSONDecodeError: JSON 解析失败
            PermissionError: 文件权限不足
        """
        # 读取原始配置
        settings = self.adapter.read_settings()

        # 脱敏处理
        sanitized_settings = self._sanitize_settings(settings)

        return sanitized_settings

    def _sanitize_settings(self, data: Any, parent_key: str = "") -> Any:
        """
        递归脱敏配置数据

        Args:
            data: 待脱敏的数据
            parent_key: 父级键名（用于判断是否为敏感字段）

        Returns:
            脱敏后的数据
        """
        if isinstance(data, dict):
            return {
                key: self._sanitize_settings(value, key)
                for key, value in data.items()
            }
        elif isinstance(data, list):
            return [self._sanitize_settings(item, parent_key) for item in data]
        elif isinstance(data, str):
            return self._sanitize_string(data, parent_key)
        else:
            return data

    def _sanitize_string(self, value: str, key: str) -> str:
        """
        脱敏字符串值

        Args:
            value: 字符串值
            key: 字段名

        Returns:
            脱敏后的字符串
        """
        # 检查是否为占位符（不脱敏）
        if value in self.PLACEHOLDER_VALUES:
            return value

        # 检查是否为 URL（不脱敏）
        if self._is_url(value):
            return value

        # 检查是否为纯数字（不脱敏）
        if value.isdigit():
            return value

        # 检查字段名是否包含敏感关键词
        if self._is_sensitive_field(key):
            return self._mask_value(value)

        return value

    def _is_sensitive_field(self, key: str) -> bool:
        """
        判断字段是否为敏感字段

        Args:
            key: 字段名

        Returns:
            是否为敏感字段
        """
        key_lower = key.lower()
        return any(keyword in key_lower for keyword in self.SENSITIVE_KEYWORDS)

    def _is_url(self, value: str) -> bool:
        """
        判断字符串是否为 URL

        Args:
            value: 字符串值

        Returns:
            是否为 URL
        """
        url_pattern = re.compile(
            r'^https?://',
            re.IGNORECASE
        )
        return bool(url_pattern.match(value))

    def _mask_value(self, value: str) -> str:
        """
        脱敏字符串值

        规则：保留前4位和后4位，中间用 **** 替换

        Args:
            value: 原始值

        Returns:
            脱敏后的值
        """
        if len(value) <= 8:
            # 太短的值全部脱敏
            return "****"

        return f"{value[:4]}****{value[-4:]}"

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        更新配置（部分更新）

        Args:
            updates: 要更新的配置字段

        Returns:
            更新后的完整配置（脱敏）

        Raises:
            ConfigValidationError: 配置验证失败
            FileNotFoundError: 配置文件不存在
            PermissionError: 文件权限不足
            IOError: 写入失败
        """
        # 验证更新数据
        self._validate_updates(updates)

        # 读取当前配置
        current_settings = self.adapter.read_settings()

        # 合并配置
        updated_settings = self._merge_settings(current_settings, updates)

        # 验证合并后的配置
        self._validate_settings(updated_settings)

        # 写入配置（自动创建备份）
        try:
            self.adapter.write_settings(updated_settings, create_backup=True)
        except Exception as e:
            # 写入失败，尝试从最新备份恢复
            raise IOError(f"配置更新失败: {e}")

        # 返回脱敏后的配置
        return self._sanitize_settings(updated_settings)

    def _validate_updates(self, updates: Dict[str, Any]) -> None:
        """
        验证更新数据

        Args:
            updates: 要更新的配置字段

        Raises:
            ConfigValidationError: 验证失败
        """
        if not isinstance(updates, dict):
            raise ConfigValidationError("更新数据必须是字典类型")

        if not updates:
            raise ConfigValidationError("更新数据不能为空")

        # 检查是否包含不允许的顶级键
        invalid_keys = set(updates.keys()) - set(self.ALLOWED_TOP_LEVEL_KEYS)
        if invalid_keys:
            raise ConfigValidationError(
                f"不允许的配置键: {', '.join(invalid_keys)}"
            )

    def _validate_settings(self, settings: Dict[str, Any]) -> None:
        """
        验证完整配置

        Args:
            settings: 完整配置

        Raises:
            ConfigValidationError: 验证失败
        """
        # 验证 language
        if 'language' in settings:
            if settings['language'] not in self.ALLOWED_LANGUAGES:
                raise ConfigValidationError(
                    f"不支持的语言: {settings['language']}"
                )

        # 验证 effortLevel
        if 'effortLevel' in settings:
            if settings['effortLevel'] not in self.ALLOWED_EFFORT_LEVELS:
                raise ConfigValidationError(
                    f"不支持的 effortLevel: {settings['effortLevel']}"
                )

        # 验证 model
        if 'model' in settings:
            if not isinstance(settings['model'], str) or not settings['model']:
                raise ConfigValidationError("model 必须是非空字符串")

        # 验证 env
        if 'env' in settings:
            if not isinstance(settings['env'], dict):
                raise ConfigValidationError("env 必须是字典类型")

        # 验证 permissions
        if 'permissions' in settings:
            if not isinstance(settings['permissions'], dict):
                raise ConfigValidationError("permissions 必须是字典类型")
            if 'allow' in settings['permissions']:
                if not isinstance(settings['permissions']['allow'], list):
                    raise ConfigValidationError("permissions.allow 必须是数组类型")
            if 'deny' in settings['permissions']:
                if not isinstance(settings['permissions']['deny'], list):
                    raise ConfigValidationError("permissions.deny 必须是数组类型")

        # 验证 enabledPlugins
        if 'enabledPlugins' in settings:
            if not isinstance(settings['enabledPlugins'], dict):
                raise ConfigValidationError("enabledPlugins 必须是字典类型")

    def _merge_settings(self, base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        合并配置（深度合并）

        Args:
            base: 基础配置
            updates: 更新配置

        Returns:
            合并后的配置
        """
        result = base.copy()

        for key, value in updates.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_settings(result[key], value)
            else:
                result[key] = value

        return result
