"""
Skill Quality Evaluation Service
"""
import re
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SkillQualityService:
    """Skill 质量评估服务"""

    def __init__(self):
        self.max_score = 100
        # 调整权重：更关注实用性和示例
        self.dimensions = {
            "documentation": 40,  # 提高文档权重，重点看示例
            "clarity": 40,        # 提高功能明确性权重
            "structure": 10,      # 降低结构要求
            "maintainability": 10 # 降低可维护性要求
        }

    async def evaluate_skill(self, skill_path: Path, skill_data: dict) -> dict:
        """
        评估单个 skill 的质量

        Args:
            skill_path: skill 目录路径
            skill_data: skill 数据（包含 name, description, tags 等）

        Returns:
            评估结果字典
        """
        try:
            # 读取 skill.md 文件
            skill_md_path = self._find_skill_md(skill_path)
            if not skill_md_path:
                return self._create_error_evaluation("找不到 skill.md 或 SKILL.md 文件")

            skill_content = skill_md_path.read_text(encoding='utf-8')

            # 各维度评分
            doc_result = self._evaluate_documentation(skill_path, skill_content, skill_data)
            clarity_result = self._evaluate_clarity(skill_content, skill_data)
            structure_result = self._evaluate_structure(skill_path, skill_content)
            maintainability_result = self._evaluate_maintainability(skill_path, skill_content)

            # 计算总分
            total_score = (
                doc_result["score"] +
                clarity_result["score"] +
                structure_result["score"] +
                maintainability_result["score"]
            )

            # 计算等级
            grade = self._calculate_grade(total_score)

            # 收集优点和不足
            strengths = []
            weaknesses = []
            suggestions = []

            for result in [doc_result, clarity_result, structure_result, maintainability_result]:
                strengths.extend(result.get("strengths", []))
                weaknesses.extend(result.get("weaknesses", []))
                suggestions.extend(result.get("suggestions", []))

            return {
                "score": total_score,
                "grade": grade,
                "dimensions": {
                    "documentation": doc_result,
                    "clarity": clarity_result,
                    "structure": structure_result,
                    "maintainability": maintainability_result
                },
                "strengths": strengths,
                "weaknesses": weaknesses,
                "suggestions": suggestions
            }

        except Exception as e:
            logger.error(f"评估 skill 失败: {e}")
            return self._create_error_evaluation(str(e))

    def _find_skill_md(self, skill_path: Path) -> Optional[Path]:
        """查找 skill.md 或 SKILL.md 文件"""
        for name in ["skill.md", "SKILL.md"]:
            path = skill_path / name
            if path.exists():
                return path
        return None

    def _evaluate_documentation(self, skill_path: Path, content: str, skill_data: dict) -> dict:
        """评估文档完整性 (0-30分)"""
        score = 0
        max_score = self.dimensions["documentation"]
        issues = []
        strengths = []
        weaknesses = []
        suggestions = []

        # 1. 清晰的描述 (10分)
        desc_score = 0
        if "description" in skill_data and skill_data["description"]:
            desc_len = len(skill_data["description"])
            if 50 <= desc_len <= 200:
                desc_score = 5
                strengths.append("描述长度适中")
            elif desc_len < 50:
                desc_score = 2
                weaknesses.append("描述过于简短")
                suggestions.append("扩充描述到 50-200 字")
            else:
                desc_score = 3
                weaknesses.append("描述过于冗长")
                suggestions.append("精简描述到 200 字以内")

            # 检查描述是否清晰
            if desc_score > 0:
                desc_score += 3
                strengths.append("有明确的功能描述")

            # 检查是否准确
            if desc_score > 0:
                desc_score += 2
        else:
            issues.append("缺少描述")
            weaknesses.append("没有功能描述")
            suggestions.append("添加清晰的功能描述")

        score += desc_score

        # 2. 使用说明 (10分)
        usage_score = 0
        if re.search(r'#+\s*(使用方式|使用说明|Usage)', content, re.IGNORECASE):
            usage_score = 5
            strengths.append("有使用说明")

            # 检查是否有参数说明
            if re.search(r'参数|parameter|input|输入', content, re.IGNORECASE):
                usage_score += 3
            else:
                weaknesses.append("缺少参数说明")
                suggestions.append("添加参数说明和类型定义")

            # 检查是否有注意事项
            if re.search(r'注意事项|注意|note|important', content, re.IGNORECASE):
                usage_score += 2
            else:
                suggestions.append("添加注意事项章节")
        else:
            issues.append("缺少使用说明")
            weaknesses.append("没有使用说明")
            suggestions.append("添加详细的使用说明和示例")

        score += usage_score

        # 3. 示例 (5分)
        example_score = 0
        example_count = len(re.findall(r'#+\s*(示例|Example)', content, re.IGNORECASE))
        if example_count >= 2:
            example_score = 5
            strengths.append("有丰富的使用示例")
        elif example_count == 1:
            example_score = 3
            suggestions.append("添加更多使用场景的示例")
        else:
            issues.append("缺少示例")
            weaknesses.append("没有使用示例")
            suggestions.append("添加至少 2-3 个实际使用示例")

        score += example_score

        # 4. YAML Frontmatter (5分)
        frontmatter_score = 0
        if content.startswith('---'):
            frontmatter_score = 2

            # 检查 name 和 description
            if re.search(r'name:\s*\S+', content) and re.search(r'description:\s*\S+', content):
                frontmatter_score += 2
                strengths.append("YAML frontmatter 完整")
            else:
                weaknesses.append("frontmatter 缺少必要字段")

            # 检查 tags
            if re.search(r'tags:\s*\[', content):
                frontmatter_score += 1
            else:
                suggestions.append("在 frontmatter 中添加 tags")
        else:
            issues.append("缺少 YAML frontmatter")
            weaknesses.append("没有 YAML frontmatter")
            suggestions.append("添加 YAML frontmatter（name, description, tags）")

        score += frontmatter_score

        return {
            "score": score,
            "max": max_score,
            "issues": issues,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestions": suggestions
        }

    def _evaluate_clarity(self, content: str, skill_data: dict) -> dict:
        """评估功能明确性 (0-30分)"""
        score = 0
        max_score = self.dimensions["clarity"]
        issues = []
        strengths = []
        weaknesses = []
        suggestions = []

        # 1. 功能描述清晰 (15分)
        clarity_score = 0

        # 检查核心功能是否明确
        if re.search(r'#+\s*(核心功能|功能|Features?)', content, re.IGNORECASE):
            clarity_score = 8
            strengths.append("核心功能明确")
        else:
            weaknesses.append("核心功能不够明确")
            suggestions.append("添加核心功能章节")

        # 检查功能边界
        if re.search(r'(适用|不适用|限制|边界)', content, re.IGNORECASE):
            clarity_score += 4
            strengths.append("功能边界清晰")
        else:
            weaknesses.append("功能边界不清晰")
            suggestions.append("明确说明 skill 的适用场景和限制")

        # 检查是否有功能冲突
        clarity_score += 3  # 默认无冲突

        score += clarity_score

        # 2. 使用场景明确 (10分)
        scenario_score = 0

        # 检查适用场景
        if re.search(r'#+\s*(应用场景|使用场景|场景|Scenarios?)', content, re.IGNORECASE):
            scenario_score = 5
            strengths.append("使用场景明确")
        else:
            weaknesses.append("使用场景不够明确")
            suggestions.append("列出 3-5 个典型使用场景")

        # 检查不适用场景
        if re.search(r'(不适用|不建议|限制)', content, re.IGNORECASE):
            scenario_score += 3
        else:
            suggestions.append("说明 skill 的局限性和不适用场景")

        # 检查场景示例
        if scenario_score > 0 and re.search(r'示例|Example', content, re.IGNORECASE):
            scenario_score += 2

        score += scenario_score

        # 3. 输入输出定义 (5分)
        io_score = 0

        # 检查输入格式
        if re.search(r'(输入|Input|参数|Parameter)', content, re.IGNORECASE):
            io_score = 3
        else:
            weaknesses.append("缺少输入格式说明")
            suggestions.append("明确说明输入数据格式")

        # 检查输出格式
        if re.search(r'(输出|Output|返回|Return)', content, re.IGNORECASE):
            io_score += 2
        else:
            suggestions.append("明确说明输出数据格式")

        score += io_score

        if not issues and score >= 25:
            strengths.append("功能描述清晰准确")

        return {
            "score": score,
            "max": max_score,
            "issues": issues,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestions": suggestions
        }

    def _evaluate_structure(self, skill_path: Path, content: str) -> dict:
        """评估结构规范性 (0-20分)"""
        score = 0
        max_score = self.dimensions["structure"]
        issues = []
        strengths = []
        weaknesses = []
        suggestions = []

        # 1. 目录结构规范 (10分)
        structure_score = 0

        # 检查主文件
        if (skill_path / "skill.md").exists() or (skill_path / "SKILL.md").exists():
            structure_score = 5
            strengths.append("有主文件 skill.md")
        else:
            issues.append("缺少主文件")
            weaknesses.append("没有 skill.md 文件")

        # 检查 references 目录
        references_dir = skill_path / "references"
        if references_dir.exists() and references_dir.is_dir():
            structure_score += 3
            strengths.append("有 references 目录")
        else:
            suggestions.append("创建 references/ 目录存放参考文档")

        # 检查 scripts 目录
        scripts_dir = skill_path / "scripts"
        if scripts_dir.exists() and scripts_dir.is_dir():
            structure_score += 2

        score += structure_score

        # 2. 文件命名正确 (5分)
        naming_score = 5  # 默认满分，除非发现问题

        # 检查文件名是否使用小写和下划线
        for file in skill_path.rglob("*"):
            if file.is_file() and not file.name.startswith('.'):
                if not re.match(r'^[a-z0-9_\-\.]+$', file.name.lower()):
                    naming_score = 3
                    weaknesses.append("部分文件名不符合规范")
                    suggestions.append("使用小写字母、数字、下划线和连字符命名文件")
                    break

        if naming_score == 5:
            strengths.append("文件命名规范")

        score += naming_score

        # 3. 必要的元数据 (5分)
        metadata_score = 0

        if content.startswith('---'):
            metadata_score = 3

            # 检查元数据完整性
            if all(re.search(f'{field}:', content) for field in ['name', 'description', 'tags']):
                metadata_score += 2
                strengths.append("元数据完整")
            else:
                weaknesses.append("元数据不完整")
                suggestions.append("补充 frontmatter 中的必要字段")
        else:
            issues.append("缺少元数据")
            weaknesses.append("没有 YAML frontmatter")

        score += metadata_score

        return {
            "score": score,
            "max": max_score,
            "issues": issues,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestions": suggestions
        }

    def _evaluate_maintainability(self, skill_path: Path, content: str) -> dict:
        """评估可维护性 (0-20分)"""
        score = 0
        max_score = self.dimensions["maintainability"]
        issues = []
        strengths = []
        weaknesses = []
        suggestions = []

        # 1. 代码/脚本质量 (10分)
        code_score = 10  # 默认满分（如果没有代码）

        scripts_dir = skill_path / "scripts"
        if scripts_dir.exists() and scripts_dir.is_dir():
            script_files = list(scripts_dir.glob("*.py")) + list(scripts_dir.glob("*.js")) + list(scripts_dir.glob("*.sh"))
            if script_files:
                code_score = 4  # 有代码，重新评分

                # 简单检查：如果有脚本文件，假设代码清晰
                code_score += 3

                # 检查是否有注释（简单检查）
                has_comments = False
                for script_file in script_files[:3]:  # 只检查前3个文件
                    try:
                        script_content = script_file.read_text(encoding='utf-8')
                        if '#' in script_content or '//' in script_content or '"""' in script_content:
                            has_comments = True
                            break
                    except:
                        pass

                if has_comments:
                    code_score += 3
                    strengths.append("代码有注释")
                else:
                    weaknesses.append("代码缺少注释")
                    suggestions.append("在脚本中添加必要的注释")
        else:
            strengths.append("文档型 skill，无需代码")

        score += code_score

        # 2. 依赖管理 (5分)
        dep_score = 5  # 默认满分（如果没有依赖）

        # 检查是否有依赖文件
        has_deps = False
        for dep_file in ["requirements.txt", "package.json", "Pipfile", "pyproject.toml"]:
            if (skill_path / dep_file).exists():
                has_deps = True
                strengths.append("依赖管理清晰")
                break

        if scripts_dir.exists() and scripts_dir.is_dir() and list(scripts_dir.glob("*.py")):
            if not has_deps:
                dep_score = 0
                weaknesses.append("缺少依赖管理文件")
                suggestions.append("添加 requirements.txt 列出依赖")

        score += dep_score

        # 3. 错误处理 (5分)
        error_score = 5  # 默认满分（如果没有代码）

        if scripts_dir.exists() and scripts_dir.is_dir():
            script_files = list(scripts_dir.glob("*.py")) + list(scripts_dir.glob("*.js"))
            if script_files:
                error_score = 3  # 有代码，重新评分

                # 检查是否有错误处理
                has_error_handling = False
                for script_file in script_files[:3]:
                    try:
                        script_content = script_file.read_text(encoding='utf-8')
                        if 'try' in script_content or 'except' in script_content or 'catch' in script_content:
                            has_error_handling = True
                            break
                    except:
                        pass

                if has_error_handling:
                    error_score += 2
                    strengths.append("有错误处理逻辑")
                else:
                    weaknesses.append("缺少错误处理")
                    suggestions.append("在脚本中添加错误处理和日志")

        score += error_score

        return {
            "score": score,
            "max": max_score,
            "issues": issues,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestions": suggestions
        }

    def _calculate_grade(self, score: int) -> str:
        """根据分数计算等级"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"

    def _create_error_evaluation(self, error_msg: str) -> dict:
        """创建错误评估结果"""
        return {
            "score": 0,
            "grade": "F",
            "dimensions": {
                "documentation": {"score": 0, "max": 30, "issues": [error_msg]},
                "clarity": {"score": 0, "max": 30, "issues": []},
                "structure": {"score": 0, "max": 20, "issues": []},
                "maintainability": {"score": 0, "max": 20, "issues": []}
            },
            "strengths": [],
            "weaknesses": ["评估失败"],
            "suggestions": ["请检查 skill 文件是否存在且格式正确"]
        }
