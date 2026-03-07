"""
标签定义模块
定义所有可用的标签维度和标签值
"""
from __future__ import annotations

from typing import Dict, List, Set
from enum import Enum


class TagDimension(str, Enum):
    """标签维度"""
    TOOL = "工具"
    API = "接口"
    RISK = "风险"
    PHASE = "阶段"
    CHAIN = "链路"
    FUNCTION = "功能"
    SCOPE = "范围"
    TECH_STACK = "技术栈"


# 标签定义：固定维度 + 固定标签
TAG_DEFINITIONS: Dict[TagDimension, List[str]] = {
    TagDimension.TOOL: [
        "命令", "文件", "搜索", "网络", "浏览", "设计", "增强"
    ],
    TagDimension.API: [
        "读接口", "写接口", "删接口", "外部"
    ],
    TagDimension.RISK: [
        "安全", "低险", "中险", "高险", "极险"
    ],
    TagDimension.PHASE: [
        "规划", "开发", "测试", "评审", "发布", "运维"
    ],
    TagDimension.CHAIN: [
        "即时", "短链", "中链", "长链", "交互"
    ],
    TagDimension.FUNCTION: [
        "生成", "分析", "文档", "调试", "重构", "自动", "部署", "监控"
    ],
    TagDimension.SCOPE: [
        "本地", "项目", "仓库", "联网", "依赖"
    ],
    TagDimension.TECH_STACK: [
        "前端", "后端", "全栈", "React", "Vue", "Node", "数据库", "云原生"
    ]
}

# 所有有效标签的集合（用于快速验证）
ALL_VALID_TAGS: Set[str] = set()
for tags in TAG_DEFINITIONS.values():
    ALL_VALID_TAGS.update(tags)

# 标签优先级规则
TAG_PRIORITY_RULES = {
    TagDimension.TOOL: {"max": 3, "required": True},
    TagDimension.API: {"max": 2, "required": False},
    TagDimension.RISK: {"max": 1, "required": True},
    TagDimension.PHASE: {"max": 1, "required": True},
    TagDimension.CHAIN: {"max": 1, "required": True},
    TagDimension.FUNCTION: {"max": 2, "required": False},
    TagDimension.SCOPE: {"max": 2, "required": False},
    TagDimension.TECH_STACK: {"max": 2, "required": False},
}


def validate_tags(tags: List[str]) -> tuple[bool, str]:
    """
    验证标签列表是否符合规范

    Args:
        tags: 标签列表

    Returns:
        (is_valid, error_message)
    """
    if len(tags) > 10:
        return False, f"标签数量超过限制（{len(tags)} > 10）"

    # 检查是否有无效标签
    invalid_tags = [tag for tag in tags if tag not in ALL_VALID_TAGS]
    if invalid_tags:
        return False, f"包含无效标签: {', '.join(invalid_tags)}"

    # 检查必填维度
    dimension_counts = {dim: 0 for dim in TagDimension}
    for tag in tags:
        for dim, dim_tags in TAG_DEFINITIONS.items():
            if tag in dim_tags:
                dimension_counts[dim] += 1

    for dim, rules in TAG_PRIORITY_RULES.items():
        count = dimension_counts[dim]
        if rules["required"] and count == 0:
            return False, f"缺少必填维度: {dim.value}"
        if count > rules["max"]:
            return False, f"维度 {dim.value} 标签过多（{count} > {rules['max']}）"

    return True, ""


def get_tag_dimension(tag: str) -> TagDimension | None:
    """
    获取标签所属的维度

    Args:
        tag: 标签名称

    Returns:
        标签所属的维度，如果标签无效则返回 None
    """
    for dim, dim_tags in TAG_DEFINITIONS.items():
        if tag in dim_tags:
            return dim
    return None

