"""
标签分类器
根据 Skill 的描述、名称、meta 信息自动推荐标签
"""
from typing import List, Dict, Any
from app.core.tag_definitions import TAG_DEFINITIONS, TagDimension


class TagClassifier:
    """标签分类器"""

    def __init__(self):
        # 关键词映射表
        self.keyword_mappings = self._build_keyword_mappings()

    def _build_keyword_mappings(self) -> Dict[str, List[str]]:
        """构建关键词到标签的映射"""
        return {
            # 工具类关键词
            "bash": ["bash"],
            "shell": ["bash"],
            "command": ["bash"],
            "git": ["git"],
            "commit": ["git"],
            "push": ["git"],
            "file": ["文件读写"],
            "read": ["文件读写"],
            "write": ["文件读写"],
            "search": ["代码搜索"],
            "grep": ["代码搜索"],
            "find": ["代码搜索"],
            "web": ["网络请求"],
            "http": ["网络请求"],
            "api": ["网络请求"],
            "browser": ["浏览器"],
            "playwright": ["浏览器"],
            "figma": ["Figma"],
            "ai": ["AI增强"],
            "prompt": ["AI增强"],
            "optimize": ["AI增强"],

            # API 类关键词
            "github": ["GitHub-API"],
            "claude": ["Claude-API"],

            # 危险性关键词
            "read-only": ["安全"],
            "safe": ["安全"],
            "delete": ["高风险"],
            "remove": ["高风险"],
            "force": ["极高风险"],
            "destructive": ["极高风险"],

            # 阶段关键词
            "plan": ["规划"],
            "design": ["规划"],
            "develop": ["开发"],
            "code": ["开发"],
            "test": ["测试"],
            "review": ["审查"],
            "deploy": ["部署"],
            "monitor": ["运维"],
            "maintain": ["运维"],

            # 链路关键词
            "instant": ["即时"],
            "quick": ["短链路"],
            "fast": ["短链路"],
            "long": ["长链路"],
            "interactive": ["交互式"],

            # 功能关键词
            "generate": ["代码生成"],
            "create": ["代码生成"],
            "analyze": ["代码分析"],
            "document": ["文档处理"],
            "refactor": ["重构"],
            "debug": ["调试"],
            "data": ["数据处理"],
            "automate": ["自动化"],
            "automation": ["自动化"],
        }

    def suggest_tags(self, skill_data: Dict[str, Any]) -> List[str]:
        """
        根据 Skill 数据推荐标签

        Args:
            skill_data: Skill 数据字典，包含 name, description, meta 等字段

        Returns:
            推荐的标签列表（最多 10 个）
        """
        suggested_tags = set()

        # 从名称和描述中提取关键词
        text = f"{skill_data.get('name', '')} {skill_data.get('description', '')}".lower()

        # 根据关键词匹配标签
        for keyword, tags in self.keyword_mappings.items():
            if keyword in text:
                suggested_tags.update(tags)

        # 如果没有匹配到危险性标签，默认为"安全"
        has_risk_tag = any(
            tag in suggested_tags
            for tag in TAG_DEFINITIONS[TagDimension.RISK]
        )
        if not has_risk_tag:
            suggested_tags.add("安全")

        # 如果没有匹配到阶段标签，默认为"开发"
        has_phase_tag = any(
            tag in suggested_tags
            for tag in TAG_DEFINITIONS[TagDimension.PHASE]
        )
        if not has_phase_tag:
            suggested_tags.add("开发")

        # 如果没有匹配到链路标签，默认为"短链路"
        has_chain_tag = any(
            tag in suggested_tags
            for tag in TAG_DEFINITIONS[TagDimension.CHAIN]
        )
        if not has_chain_tag:
            suggested_tags.add("短链路")

        # 限制标签数量为 10
        return list(suggested_tags)[:10]
