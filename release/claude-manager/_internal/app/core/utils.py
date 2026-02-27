"""Utility functions."""
import hashlib
import json
from datetime import datetime
from typing import Any


def generate_id(prefix: str, *args: Any) -> str:
    """Generate a unique ID based on prefix and arguments.

    Args:
        prefix: ID prefix
        *args: Arguments to hash

    Returns:
        Generated ID string
    """
    content = json.dumps([str(arg) for arg in args], sort_keys=True)
    hash_value = hashlib.sha256(content.encode()).hexdigest()[:12]
    return f"{prefix}_{hash_value}"


def now_utc() -> datetime:
    """Get current UTC datetime.

    Returns:
        Current UTC datetime
    """
    return datetime.utcnow()


def safe_dict_get(data: dict, *keys: str, default: Any = None) -> Any:
    """Safely get nested dictionary value.

    Args:
        data: Dictionary to query
        *keys: Nested keys
        default: Default value if key not found

    Returns:
        Value or default
    """
    result = data
    for key in keys:
        if isinstance(result, dict):
            result = result.get(key)
        else:
            return default
        if result is None:
            return default
    return result
