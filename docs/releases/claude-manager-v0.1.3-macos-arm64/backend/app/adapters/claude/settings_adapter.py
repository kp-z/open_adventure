"""
Claude Settings Adapter
负责读取和写入 Claude 配置文件
"""
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional


class SettingsAdapter:
    """Claude 配置文件适配器"""

    def __init__(self, claude_home: Optional[str] = None):
        """
        初始化适配器

        Args:
            claude_home: Claude 配置目录路径，默认为 ~/.claude
        """
        self.claude_home = Path(claude_home or os.path.expanduser("~/.claude"))
        self.settings_file = self.claude_home / "settings.json"
        self.settings_local_file = self.claude_home / "settings.local.json"
        self.backup_dir = self.claude_home / "backups"

    def read_settings(self) -> Dict[str, Any]:
        """
        读取 Claude 配置文件

        优先级：settings.local.json 深度合并覆盖 settings.json

        Returns:
            配置字典

        Raises:
            FileNotFoundError: 配置文件不存在
            json.JSONDecodeError: JSON 解析失败
            PermissionError: 文件权限不足
        """
        # 检查基础配置文件是否存在
        if not self.settings_file.exists():
            raise FileNotFoundError(f"配置文件不存在: {self.settings_file}")

        # 读取基础配置
        try:
            with open(self.settings_file, 'r', encoding='utf-8') as f:
                base_settings = json.load(f)
        except PermissionError:
            raise PermissionError(f"无权限读取配置文件: {self.settings_file}")
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(
                f"配置文件 JSON 格式错误: {self.settings_file}",
                e.doc,
                e.pos
            )

        # 如果存在 local 配置，进行深度合并
        if self.settings_local_file.exists():
            try:
                with open(self.settings_local_file, 'r', encoding='utf-8') as f:
                    local_settings = json.load(f)
                    base_settings = self._deep_merge(base_settings, local_settings)
            except (PermissionError, json.JSONDecodeError):
                # local 文件读取失败不影响基础配置
                pass

        return base_settings

    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """
        深度合并两个字典

        Args:
            base: 基础字典
            override: 覆盖字典

        Returns:
            合并后的字典
        """
        result = base.copy()

        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value

        return result

    def write_settings(self, settings: Dict[str, Any], create_backup: bool = True) -> None:
        """
        写入 Claude 配置文件

        Args:
            settings: 配置字典
            create_backup: 是否创建备份

        Raises:
            PermissionError: 文件权限不足
            IOError: 写入失败
        """
        # 创建备份
        if create_backup and self.settings_file.exists():
            self._create_backup()

        # 写入配置文件
        try:
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings, f, indent=2, ensure_ascii=False)
        except PermissionError:
            raise PermissionError(f"无权限写入配置文件: {self.settings_file}")
        except Exception as e:
            raise IOError(f"写入配置文件失败: {e}")

    def _create_backup(self) -> Path:
        """
        创建配置文件备份

        Returns:
            备份文件路径

        Raises:
            IOError: 备份失败
        """
        # 确保备份目录存在
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # 生成备份文件名：settings_YYYYMMDD_HHMMSS.json
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"settings_{timestamp}.json"

        try:
            shutil.copy2(self.settings_file, backup_file)
            return backup_file
        except Exception as e:
            raise IOError(f"创建备份失败: {e}")

    def restore_from_backup(self, backup_file: Path) -> None:
        """
        从备份恢复配置

        Args:
            backup_file: 备份文件路径

        Raises:
            FileNotFoundError: 备份文件不存在
            IOError: 恢复失败
        """
        if not backup_file.exists():
            raise FileNotFoundError(f"备份文件不存在: {backup_file}")

        try:
            shutil.copy2(backup_file, self.settings_file)
        except Exception as e:
            raise IOError(f"从备份恢复失败: {e}")
