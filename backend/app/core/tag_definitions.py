"""
标签定义模块
定义所有可用的标签维度和标签值
"""
from typing import Dict, List, Set
from enum import Enum


class TagDimension(str, Enum):
    """标签维度"""
    TOOL = "工具"
    API = "API"
    RISK = "危险性"
    PHASE = "阶段"
    CHAIN = "链路"
    FUNCTION = "功能"
    SCOPE = "范围"


# 标签定义
TAG_DEFINITIONS: Dict[TagDimension, List[str]] = {
    TagDimension.TOOL: [
        "bash", "git", "文件读写", "代码搜索",
        "网络请求", "浏览器", "Figma", "AI增强"
    ],
    TagDimension.API: [
        "GitHub-API", "Claude-API", "外部API",
        "只读API", "写入API", "删除API"
    ],
    TagDimension.RISK: [
        "安全", "低风险", "中风险", "高风险", "极高风险"
    ],
    TagDimension.PHASE: [
        "规划", "开发", "测试", "审查", "部署", "运维"
    ],
    TagDimension.CHAIN: [
        "即时", "短链路", "中链路", "长链路", "交互式"
    ],
    TagDimension.FUNCTION: [
        "代码生成", "代码分析", "文档处理", "测试工具",
        "重构", "调试", "数据处理", "自动化", "部署发布", "监控"
    ],
    TagDimension.SCOPE: [
        "本地", "项目级", "仓库级", "需要网络", "外部依赖"
    ]
}

# 所有有效标签的集合（用于快速验证）
ALL_VALID_TAGS: Set[str] = set()
for tags in TAG_DEFINITIONS.values():
    ALL_VALID_TAGS.update(tags)

# 标签优先级规则
TAG_PRIORITY_RULES = {
    TagDimension.TOOL: {"max": 3, "required": True},
    TagDimension.API: {"max": 3, "required": False},
    TagDimension.RISK: {"max": 1, "required": True},
    TagDimension.PHASE: {"max": 1, "required": True},
    TagDimension.CHAIN: {"max": 1, "required": True},
    TagDimension.FUNCTION: {"max": 2, "required": False},
    TagDimension.SCOPE: {"max": 2, "required": False}
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
