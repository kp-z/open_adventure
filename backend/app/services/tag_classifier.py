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
            "bash": ["命令"],
            "shell": ["命令"],
            "command": ["命令"],
            "git": ["命令"],
            "commit": ["命令"],
            "push": ["命令"],
            "file": ["文件"],
            "read": ["文件"],
            "write": ["文件"],
            "search": ["搜索"],
            "grep": ["搜索"],
            "find": ["搜索"],
            "web": ["网络"],
            "http": ["网络"],
            "browser": ["浏览"],
            "playwright": ["浏览"],
            "figma": ["设计"],
            "ai": ["增强"],
            "prompt": ["增强"],
            "optimize": ["增强"],

            # API 类关键词
            "github": ["外部", "读接口"],
            "claude": ["外部", "读接口"],
            "api": ["外部", "读接口"],
            "delete api": ["删接口"],
            "update api": ["写接口"],

            # 危险性关键词
            "read-only": ["安全"],
            "safe": ["安全"],
            "delete": ["高险"],
            "remove": ["高险"],
            "force": ["极险"],
            "destructive": ["极险"],

            # 阶段关键词
            "plan": ["规划"],
            "design": ["规划"],
            "develop": ["开发"],
            "code": ["开发"],
            "test": ["测试"],
            "review": ["评审"],
            "deploy": ["发布"],
            "monitor": ["运维"],
            "maintain": ["运维"],

            # 链路关键词
            "instant": ["即时"],
            "quick": ["短链"],
            "fast": ["短链"],
            "long": ["长链"],
            "interactive": ["交互"],

            # 功能关键词
            "generate": ["生成"],
            "create": ["生成"],
            "analyze": ["分析"],
            "document": ["文档"],
            "refactor": ["重构"],
            "debug": ["调试"],
            "data": ["分析"],
            "automate": ["自动"],
            "automation": ["自动"],

            # 技术栈关键词
            "frontend": ["前端"],
            "ui": ["前端"],
            "react": ["React"],
            "vue": ["Vue"],
            "backend": ["后端"],
            "node": ["Node"],
            "fullstack": ["全栈"],
            "full-stack": ["全栈"],
            "database": ["数据库"],
            "sql": ["数据库"],
            "k8s": ["云原生"],
            "kubernetes": ["云原生"],
            "cloud": ["云原生"],
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

        # 如果没有匹配到链路标签，默认为"短链"
        has_chain_tag = any(
            tag in suggested_tags
            for tag in TAG_DEFINITIONS[TagDimension.CHAIN]
        )
        if not has_chain_tag:
            suggested_tags.add("短链")

        # 技术栈维度：若未识别，给一个兜底
        has_tech_stack_tag = any(
            tag in suggested_tags
            for tag in TAG_DEFINITIONS[TagDimension.TECH_STACK]
        )
        if not has_tech_stack_tag:
            suggested_tags.add("全栈")

        # 限制标签数量为 10
        return list(suggested_tags)[:10]
