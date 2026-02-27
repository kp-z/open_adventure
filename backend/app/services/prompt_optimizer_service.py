"""
Prompt Optimizer Service

使用 Anthropic API 或规则引擎优化用户输入的 prompt
避免嵌套 Claude Code 会话的问题
"""
import re
import anthropic
from typing import Optional
from enum import Enum
from app.config.settings import settings


class OptimizerMode(str, Enum):
    """优化器模式"""
    AI = "ai"  # 使用 Anthropic API
    RULE = "rule"  # 使用规则引擎


class PromptOptimizerService:
    """Prompt 优化服务"""

    def __init__(self, mode: OptimizerMode = OptimizerMode.RULE):
        """
        初始化服务

        Args:
            mode: 优化模式（ai 或 rule）
        """
        self.mode = mode
        self.client = None
        self.model = "claude-opus-4-20250514"

        if mode == OptimizerMode.AI:
            self._init_ai_mode()

    def _init_ai_mode(self):
        """初始化 AI 模式"""
        # 尝试从配置中获取真实的 API Key
        api_key = settings.anthropic_api_key

        if not api_key or api_key.startswith("sk-ant-test"):
            raise ValueError(
                "AI mode requires a valid ANTHROPIC_API_KEY. "
                "Please set it in backend/.env file."
            )

        self.client = anthropic.Anthropic(api_key=api_key)

    async def optimize_prompt(
        self,
        prompt: str,
        context: Optional[str] = None
    ) -> dict:
        """
        优化用户输入的 prompt

        Args:
            prompt: 原始用户输入
            context: 可选的上下文信息

        Returns:
            dict: {
                "optimized_prompt": str,  # 优化后的 prompt
                "analysis": str,          # 优化分析说明
                "mode": str,              # 使用的模式
                "success": bool,
                "error": Optional[str]
            }
        """
        if self.mode == OptimizerMode.AI:
            return await self._optimize_with_ai(prompt, context)
        else:
            return await self._optimize_with_rules(prompt, context)

    async def _optimize_with_ai(
        self,
        prompt: str,
        context: Optional[str] = None
    ) -> dict:
        """使用 AI 优化"""
        try:
            # 构建系统提示
            system_prompt = self._build_system_prompt()

            # 构建用户消息
            user_message = self._build_user_message(prompt, context)

            # 调用 Claude API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_message}
                ]
            )

            # 解析响应
            optimized_text = response.content[0].text

            # 尝试从响应中提取优化后的 prompt 和分析
            result = self._parse_response(optimized_text)

            return {
                "optimized_prompt": result["optimized_prompt"],
                "analysis": result["analysis"],
                "mode": "ai",
                "success": True,
                "error": None
            }

        except Exception as e:
            return {
                "optimized_prompt": prompt,
                "analysis": "",
                "mode": "ai",
                "success": False,
                "error": str(e)
            }

    async def _optimize_with_rules(
        self,
        prompt: str,
        context: Optional[str] = None
    ) -> dict:
        """使用规则引擎优化"""
        try:
            optimized = prompt
            improvements = []

            # 规则 1: 补充缺失的动词
            if not self._has_action_verb(prompt):
                improvements.append("添加明确的动作指令")
                optimized = self._add_action_verb(optimized)

            # 规则 2: 结构化模糊需求
            if self._is_vague(prompt):
                improvements.append("将模糊需求结构化")
                optimized = self._structure_vague_prompt(optimized, context)

            # 规则 3: 补充技术栈信息
            if context and not self._has_tech_stack(prompt):
                improvements.append("补充技术栈信息")
                optimized = self._add_tech_stack(optimized, context)

            # 规则 4: 分解复杂需求
            if self._is_complex(prompt):
                improvements.append("分解为多个步骤")
                optimized = self._break_down_complex(optimized)

            # 规则 5: 添加约束条件
            if not self._has_constraints(prompt):
                improvements.append("添加基本约束条件")
                optimized = self._add_constraints(optimized)

            # 如果没有任何改进，说明原 prompt 已经很好
            if not improvements:
                improvements.append("原 prompt 已经足够清晰")

            analysis = "优化内容：\n" + "\n".join(f"- {imp}" for imp in improvements)

            return {
                "optimized_prompt": optimized,
                "analysis": analysis,
                "mode": "rule",
                "success": True,
                "error": None
            }

        except Exception as e:
            return {
                "optimized_prompt": prompt,
                "analysis": "",
                "mode": "rule",
                "success": False,
                "error": str(e)
            }

    # ========== 规则引擎辅助方法 ==========

    def _has_action_verb(self, prompt: str) -> bool:
        """检查是否包含动作动词"""
        action_verbs = [
            "创建", "添加", "修改", "删除", "实现", "开发", "构建", "设计",
            "优化", "重构", "修复", "调试", "测试", "部署", "配置",
            "create", "add", "modify", "delete", "implement", "develop",
            "build", "design", "optimize", "refactor", "fix", "debug",
            "test", "deploy", "configure"
        ]
        return any(verb in prompt.lower() for verb in action_verbs)

    def _add_action_verb(self, prompt: str) -> str:
        """添加动作动词"""
        # 简单启发式：如果是名词短语，添加"实现"
        if not prompt.startswith(("请", "帮我", "我想", "需要")):
            return f"请实现：{prompt}"
        return prompt

    def _is_vague(self, prompt: str) -> bool:
        """检查是否模糊"""
        vague_indicators = [
            "做个", "弄个", "搞个", "来个", "整个",
            "make a", "do a", "create something"
        ]
        return any(indicator in prompt.lower() for indicator in vague_indicators)

    def _structure_vague_prompt(self, prompt: str, context: Optional[str]) -> str:
        """结构化模糊 prompt"""
        # 提取关键词
        keywords = self._extract_keywords(prompt)

        structured = f"""请实现以下功能：

**目标**：{keywords}

**要求**：
1. 实现基本功能
2. 确保代码可读性
3. 遵循最佳实践
"""
        return structured

    def _extract_keywords(self, prompt: str) -> str:
        """提取关键词"""
        # 移除常见的口语化词汇
        noise_words = ["做个", "弄个", "搞个", "来个", "整个", "帮我", "请"]
        cleaned = prompt
        for word in noise_words:
            cleaned = cleaned.replace(word, "")
        return cleaned.strip()

    def _has_tech_stack(self, prompt: str) -> bool:
        """检查是否包含技术栈信息"""
        tech_keywords = [
            "react", "vue", "angular", "python", "java", "typescript",
            "javascript", "node", "django", "flask", "spring"
        ]
        return any(tech in prompt.lower() for tech in tech_keywords)

    def _add_tech_stack(self, prompt: str, context: str) -> str:
        """添加技术栈信息"""
        return f"{prompt}\n\n**技术栈**：{context}"

    def _is_complex(self, prompt: str) -> bool:
        """检查是否复杂（包含多个需求）"""
        # 简单启发式：包含"和"、"并且"、"同时"等连接词
        connectors = ["和", "并且", "同时", "以及", "还要", "and", "also"]
        return any(conn in prompt for conn in connectors)

    def _break_down_complex(self, prompt: str) -> str:
        """分解复杂需求"""
        # 尝试按连接词分割
        parts = re.split(r'[和并且同时以及还要]|and|also', prompt)

        if len(parts) > 1:
            structured = "请按以下步骤实现：\n\n"
            for i, part in enumerate(parts, 1):
                part = part.strip()
                if part:
                    structured += f"{i}. {part}\n"
            return structured

        return prompt

    def _has_constraints(self, prompt: str) -> bool:
        """检查是否包含约束条件"""
        constraint_keywords = [
            "要求", "需要", "必须", "不能", "应该", "确保",
            "requirement", "must", "should", "ensure"
        ]
        return any(keyword in prompt.lower() for keyword in constraint_keywords)

    def _add_constraints(self, prompt: str) -> str:
        """添加基本约束条件"""
        if "**要求**" not in prompt:
            prompt += "\n\n**要求**：\n- 代码清晰易读\n- 遵循项目规范"
        return prompt

    # ========== AI 模式辅助方法 ==========

    def _build_system_prompt(self) -> str:
        """构建系统提示"""
        return """你是一个专业的 Prompt 优化助手。你的任务是将用户模糊、不清晰的需求转换为清晰、结构化、可执行的指令。

优化原则：
1. **明确性**：消除歧义，明确指出要做什么
2. **结构化**：使用清晰的步骤或要点组织内容
3. **可执行**：确保 AI 能够直接理解并执行
4. **完整性**：补充必要的上下文和约束条件
5. **简洁性**：去除冗余，保持核心信息

输出格式：
请按以下格式输出：

---OPTIMIZED_PROMPT---
[优化后的 prompt 内容]
---END_OPTIMIZED_PROMPT---

---ANALYSIS---
[简要说明你做了哪些优化]
---END_ANALYSIS---
"""

    def _build_user_message(self, prompt: str, context: Optional[str]) -> str:
        """构建用户消息"""
        message = f"请优化以下 prompt：\n\n{prompt}"

        if context:
            message += f"\n\n上下文信息：\n{context}"

        return message

    def _parse_response(self, response_text: str) -> dict:
        """解析 API 响应"""
        # 尝试提取标记的内容
        optimized_prompt = ""
        analysis = ""

        # 提取优化后的 prompt
        if "---OPTIMIZED_PROMPT---" in response_text:
            start = response_text.find("---OPTIMIZED_PROMPT---") + len("---OPTIMIZED_PROMPT---")
            end = response_text.find("---END_OPTIMIZED_PROMPT---")
            if end != -1:
                optimized_prompt = response_text[start:end].strip()

        # 提取分析说明
        if "---ANALYSIS---" in response_text:
            start = response_text.find("---ANALYSIS---") + len("---ANALYSIS---")
            end = response_text.find("---END_ANALYSIS---")
            if end != -1:
                analysis = response_text[start:end].strip()

        # 如果没有找到标记，使用整个响应作为优化后的 prompt
        if not optimized_prompt:
            optimized_prompt = response_text.strip()

        return {
            "optimized_prompt": optimized_prompt,
            "analysis": analysis
        }
