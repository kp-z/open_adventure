"""
Skill API Router
"""
import subprocess
import asyncio
import json
import re
from typing import Optional, List
from pathlib import Path
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.repositories.skill_repository import SkillRepository
from app.services.skill_service import SkillService
from app.schemas.skill import SkillCreate, SkillUpdate, SkillResponse, SkillListResponse
from app.models.skill import SkillSource
from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/skills", tags=["skills"])


class SkillGenerateRequest(BaseModel):
    """Request schema for generating a skill from natural language"""
    description: str
    name: Optional[str] = None


class SkillGenerateResponse(BaseModel):
    """Response schema for skill generation"""
    skill: SkillCreate
    message: str


# ============ Claude AI 生成 Skill 相关 Schema ============

class SkillFileItem(BaseModel):
    """单个文件项"""
    name: str
    content: str
    type: str = "text"


class ClaudeGenerateRequest(BaseModel):
    """Claude AI 生成 Skill 请求"""
    description: str = Field(..., description="自然语言描述技能需求")
    skill_name: Optional[str] = Field(None, description="可选，指定技能名称")
    save_to_global: bool = Field(False, description="是否直接保存到全局 skills 目录")


class ClaudeGenerateResponse(BaseModel):
    """Claude AI 生成 Skill 响应"""
    success: bool
    name: str
    skill_md: str
    scripts: List[SkillFileItem] = []
    references: List[SkillFileItem] = []
    assets: List[SkillFileItem] = []
    saved_path: Optional[str] = None
    message: str


class SaveSkillRequest(BaseModel):
    """保存 Skill 到指定目录请求"""
    name: str = Field(..., description="技能名称（kebab-case）")
    skill_md: str = Field(..., description="SKILL.md 内容")
    scripts: List[SkillFileItem] = Field(default_factory=list, description="脚本文件列表")
    references: List[SkillFileItem] = Field(default_factory=list, description="参考文件列表")
    assets: List[SkillFileItem] = Field(default_factory=list, description="资源文件列表")
    scope: Optional[str] = Field('user', description="保存位置：user, project, plugin")
    plugin_name: Optional[str] = Field(None, description="Plugin 名称（scope=plugin 时必填）")
    project_path: Optional[str] = Field(None, description="项目路径（scope=project 时必填）")


class SaveSkillResponse(BaseModel):
    """保存 Skill 响应"""
    success: bool
    saved_path: str
    message: str


# Claude AI 生成 Skill 的系统 Prompt
SKILL_CREATOR_SYSTEM_PROMPT = '''你是一个 Claude Skill 创建专家。根据用户的需求描述，生成符合规范的 Skill 结构。

## 重要：输出格式
你必须只输出一个 JSON 对象，不要添加任何解释、说明或其他文字。直接输出 JSON，不要使用 markdown 代码块包裹。

## Skill 结构规范
每个 Skill 必须包含：
1. SKILL.md（必需）：包含 YAML frontmatter (name, description) + Markdown 指令

可选目录：
- scripts/：可执行脚本（Python/Bash/JavaScript），仅在技能需要执行代码时生成
- references/：参考文档（JSON/YAML配置、API文档等），仅在需要配置或参考资料时生成
- assets/：资源文件（模板、图标等），仅在需要输出模板时生成

## SKILL.md 格式示例
---
name: skill-name
description: 简短的技能描述（一句话）
---

# Skill 标题

详细说明这个技能的用途和使用方法。

## 使用场景
- 场景1
- 场景2

## 示例
提供使用示例...

## 输出格式（必须严格遵守）
直接输出以下格式的 JSON 对象，不要添加任何其他内容：

{
  "name": "skill-name-kebab-case",
  "skill_md": "完整的 SKILL.md 内容，使用 \\n 表示换行",
  "scripts": [
    {"name": "main.py", "content": "脚本内容", "type": "python"}
  ],
  "references": [
    {"name": "config.json", "content": "配置内容", "type": "json"}
  ],
  "assets": []
}

注意事项：
1. name 使用 kebab-case 格式
2. 根据实际需求决定是否生成 scripts/references/assets，不需要的留空数组
3. 脚本应该实用且可执行
4. JSON 内容需要正确转义
5. 不要使用 ```json 代码块，直接输出 JSON
6. 不要添加任何解释文字，只输出 JSON'''


def get_skill_service(db: AsyncSession = Depends(get_db)) -> SkillService:
    """Dependency to get skill service"""
    repository = SkillRepository(db)
    return SkillService(repository)


def get_skill_repository(db: AsyncSession = Depends(get_db)) -> SkillRepository:
    """Dependency to get skill repository directly"""
    return SkillRepository(db)


@router.post(
    "",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new skill"
)
async def create_skill(
    skill_data: SkillCreate,
    service: SkillService = Depends(get_skill_service)
):
    """Create a new skill"""
    return await service.create_skill(skill_data)


@router.get(
    "",
    response_model=SkillListResponse,
    summary="List all skills"
)
async def list_skills(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    source: Optional[SkillSource] = Query(None, description="Filter by source"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    service: SkillService = Depends(get_skill_service)
):
    """List all skills with pagination and filters"""
    return await service.list_skills(skip=skip, limit=limit, source=source, enabled=enabled)


@router.get(
    "/categories",
    summary="Get skill categories and subcategories"
)
async def get_skill_categories(
    service: SkillService = Depends(get_skill_service)
):
    """Get all skill categories with their subcategories (plugins and projects)"""
    skills = await service.list_skills(skip=0, limit=10000)

    # Count by source
    counts = {
        "builtin": 0,
        "user": 0,
        "project": 0,
        "plugin": 0
    }

    # Collect unique plugins and projects
    plugins = {}  # plugin_name -> count
    projects = {}  # project_name -> count

    for skill in skills.items:
        source = skill.source.value if hasattr(skill.source, 'value') else skill.source
        # Map 'global' to 'builtin'
        if source == "global":
            source = "builtin"
        counts[source] = counts.get(source, 0) + 1

        # Extract plugin name
        if source == "plugin" and skill.meta:
            plugin_name = skill.meta.get("plugin_name", "unknown")
            if plugin_name and plugin_name != "unknown":
                plugins[plugin_name] = plugins.get(plugin_name, 0) + 1

        # Extract project name from path
        if source == "project" and skill.meta:
            path = skill.meta.get("path", "")
            if path:
                # Extract project directory name from path
                # Example: /path/to/project/.claude/skills/skill_name -> project
                parts = Path(path).parts
                if ".claude" in parts:
                    claude_index = parts.index(".claude")
                    if claude_index > 0:
                        project_name = parts[claude_index - 1]
                        projects[project_name] = projects.get(project_name, 0) + 1

    return {
        "counts": counts,
        "plugins": [
            {"id": name, "name": name, "count": count}
            for name, count in sorted(plugins.items())
        ],
        "projects": [
            {"id": name, "name": name, "count": count}
            for name, count in sorted(projects.items())
        ]
    }


@router.get(
    "/search",
    response_model=SkillListResponse,
    summary="Search skills"
)
async def search_skills(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: SkillService = Depends(get_skill_service)
):
    """Search skills by name or description"""
    return await service.search_skills(query=q, skip=skip, limit=limit)


@router.post(
    "/generate",
    response_model=SkillGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a skill from natural language description"
)
async def generate_skill(
    request: SkillGenerateRequest,
    service: SkillService = Depends(get_skill_service)
):
    """
    Generate a complete skill definition from natural language description.
    Uses AI to generate the skill structure based on the description.
    """
    try:
        # Generate skill name from description if not provided
        if not request.name:
            # Create a simple name from description (first few words, kebab-case)
            words = request.description.lower().split()[:3]
            generated_name = "-".join(w for w in words if w.isalnum())
        else:
            generated_name = request.name

        # Generate full name (title case)
        full_name = " ".join(word.capitalize() for word in generated_name.split("-"))

        # Determine skill type based on keywords in description
        description_lower = request.description.lower()
        if any(word in description_lower for word in ["analyze", "check", "inspect", "review"]):
            skill_type = "analysis"
        elif any(word in description_lower for word in ["format", "convert", "transform"]):
            skill_type = "utility"
        elif any(word in description_lower for word in ["generate", "create", "build"]):
            skill_type = "generator"
        elif any(word in description_lower for word in ["test", "validate"]):
            skill_type = "testing"
        else:
            skill_type = "utility"

        # Extract potential tags from description
        common_tags = ["python", "javascript", "typescript", "json", "yaml", "git",
                      "docker", "api", "database", "security", "performance"]
        tags = [tag for tag in common_tags if tag in description_lower]

        # Create basic skill structure
        skill_create = SkillCreate(
            name=generated_name,
            full_name=full_name,
            type=skill_type,
            description=request.description,
            tags=tags[:5],  # Limit to 5 tags
            source=SkillSource.PROJECT,
            enabled=True,
            references=None,
            scripts=None
        )

        return SkillGenerateResponse(
            skill=skill_create,
            message="Skill template generated successfully. You can customize it before creating."
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate skill: {str(e)}"
        )


@router.post(
    "/generate-with-claude",
    response_model=ClaudeGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="使用 Claude AI 生成完整 Skill"
)
async def generate_skill_with_claude(
    request: ClaudeGenerateRequest,
    service: SkillService = Depends(get_skill_service)
):
    """
    使用 Claude Code CLI 生成完整的 Skill 结构。
    
    - 调用 Claude CLI 并传入系统 prompt + 用户描述
    - 返回完整的 Skill 结构（SKILL.md + scripts + references + assets）
    - 可选择直接保存到全局 skills 目录
    """
    try:
        # 步骤1：构建完整的 prompt
        full_prompt = f"{SKILL_CREATOR_SYSTEM_PROMPT}\n\n## 用户需求\n{request.description}"
        
        # 步骤2：调用 Claude CLI
        cli_path = settings.claude_cli_path
        
        # 使用 -p 参数以非交互模式运行
        # --disable-slash-commands 禁用技能触发，避免被项目配置的工作流程干扰
        # --setting-sources user 只加载用户配置，跳过项目配置
        cmd = [
            cli_path,
            "-p", full_prompt,
            "--output-format", "text",
            "--disable-slash-commands",
            "--setting-sources", "user"
        ]
        
        logger.info(f"Calling Claude CLI to generate skill: {request.description[:50]}...")
        
        # 清除 CLAUDECODE 环境变量，避免嵌套会话检测
        import os
        env = os.environ.copy()
        env.pop('CLAUDECODE', None)
        env.pop('CLAUDE_CODE', None)
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=120  # 2分钟超时
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise HTTPException(
                status_code=504,
                detail="Claude CLI 调用超时，请稍后重试"
            )
        
        if process.returncode != 0:
            error_msg = stderr.decode("utf-8") if stderr else "未知错误"
            logger.error(f"Claude CLI error: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=f"Claude CLI 调用失败: {error_msg}"
            )
        
        output = stdout.decode("utf-8")
        logger.info(f"Claude CLI output length: {len(output)} chars")
        logger.debug(f"Claude CLI output: {output[:1000]}...")
        
        # 步骤3：解析 Claude 输出中的 JSON
        skill_data = None
        
        # 方法1：尝试匹配 ```json ... ``` 代码块
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', output)
        if json_match:
            try:
                skill_data = json.loads(json_match.group(1))
                logger.info("Parsed JSON from code block")
            except json.JSONDecodeError:
                pass
        
        # 方法2：尝试匹配任何 JSON 对象
        if not skill_data:
            json_match = re.search(r'\{[^{}]*"name"\s*:\s*"[^"]+?"[^{}]*"skill_md"\s*:\s*"[\s\S]*?"\s*[,}][\s\S]*?\}', output, re.DOTALL)
            if json_match:
                try:
                    skill_data = json.loads(json_match.group(0))
                    logger.info("Parsed JSON from regex match")
                except json.JSONDecodeError:
                    pass
        
        # 方法3：尝试找到最外层的 { } 并解析
        if not skill_data:
            start_idx = output.find('{')
            if start_idx != -1:
                # 找到匹配的结束括号
                brace_count = 0
                end_idx = start_idx
                for i, char in enumerate(output[start_idx:], start_idx):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i + 1
                            break
                
                if end_idx > start_idx:
                    try:
                        json_str = output[start_idx:end_idx]
                        skill_data = json.loads(json_str)
                        logger.info("Parsed JSON from brace matching")
                    except json.JSONDecodeError as e:
                        logger.warning(f"Brace matching JSON parse failed: {e}")
        
        # 方法4：如果都失败，尝试从输出构建基本结构
        if not skill_data:
            logger.warning(f"Failed to parse JSON, attempting to extract content manually")
            # 尝试提取 SKILL.md 内容
            md_match = re.search(r'```(?:markdown)?\s*(---[\s\S]*?---)?\s*(#[\s\S]*?)```', output)
            if md_match:
                skill_md = (md_match.group(1) or '') + '\n' + md_match.group(2)
                skill_data = {
                    "name": request.skill_name or "generated-skill",
                    "skill_md": skill_md.strip(),
                    "scripts": [],
                    "references": [],
                    "assets": []
                }
                logger.info("Extracted skill content from markdown block")
        
        # 方法5：如果所有解析都失败，生成基础模板
        if not skill_data:
            logger.warning(f"All JSON parsing methods failed, generating fallback template. Output sample: {output[:500]}")
            
            # 生成基础技能名称
            words = request.description.lower().split()[:3]
            fallback_name = request.skill_name or "-".join(w for w in words if w.isalnum()) or "new-skill"
            
            # 生成基础 SKILL.md
            fallback_skill_md = f"""---
name: {fallback_name}
description: {request.description[:100]}
---

# {fallback_name.replace('-', ' ').title()}

{request.description}

## 使用方法

请根据需求完善此技能的具体实现。

## 注意事项

- 这是自动生成的基础模板
- 请根据实际需求修改内容
"""
            
            skill_data = {
                "name": fallback_name,
                "skill_md": fallback_skill_md,
                "scripts": [],
                "references": [],
                "assets": []
            }
            logger.info("Generated fallback template")
        
        # 步骤4：构建响应
        name = request.skill_name or skill_data.get("name", "generated-skill")
        skill_md = skill_data.get("skill_md", "")
        scripts = [SkillFileItem(**s) for s in skill_data.get("scripts", [])]
        references = [SkillFileItem(**r) for r in skill_data.get("references", [])]
        assets = [SkillFileItem(**a) for a in skill_data.get("assets", [])]
        
        saved_path = None
        
        # 步骤5：如果需要保存到全局目录
        if request.save_to_global:
            skills_dir = settings.claude_skills_dir / name
            skills_dir.mkdir(parents=True, exist_ok=True)
            
            # 写入 SKILL.md
            (skills_dir / "SKILL.md").write_text(skill_md, encoding="utf-8")
            
            # 写入 scripts
            if scripts:
                scripts_dir = skills_dir / "scripts"
                scripts_dir.mkdir(exist_ok=True)
                for script in scripts:
                    (scripts_dir / script.name).write_text(script.content, encoding="utf-8")
            
            # 写入 references
            if references:
                refs_dir = skills_dir / "references"
                refs_dir.mkdir(exist_ok=True)
                for ref in references:
                    (refs_dir / ref.name).write_text(ref.content, encoding="utf-8")
            
            # 写入 assets
            if assets:
                assets_dir = skills_dir / "assets"
                assets_dir.mkdir(exist_ok=True)
                for asset in assets:
                    (assets_dir / asset.name).write_text(asset.content, encoding="utf-8")
            
            saved_path = str(skills_dir)
            logger.info(f"Skill saved to: {saved_path}")
        
        return ClaudeGenerateResponse(
            success=True,
            name=name,
            skill_md=skill_md,
            scripts=scripts,
            references=references,
            assets=assets,
            saved_path=saved_path,
            message="Skill 生成成功" + (f"，已保存到 {saved_path}" if saved_path else "")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating skill with Claude: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"生成 Skill 失败: {str(e)}"
        )


@router.post(
    "/save-to-global",
    response_model=SaveSkillResponse,
    status_code=status.HTTP_200_OK,
    summary="保存 Skill 到指定目录"
)
async def save_skill_to_global(
    request: SaveSkillRequest,
    repository: SkillRepository = Depends(get_skill_repository)
):
    """
    将编辑好的 Skill 内容保存到指定目录。

    - 支持 user/plugin/project scope
    - 创建技能目录
    - 写入 SKILL.md 和可选的 scripts/references/assets
    - 自动同步到数据库（直接操作 repository，不触发文件系统同步）
    """
    try:
        # 步骤1：清理技能名称
        skill_name = request.name.strip().lower()
        skill_name = re.sub(r'[^a-z0-9\u4e00-\u9fff-]', '-', skill_name)
        skill_name = re.sub(r'-+', '-', skill_name).strip('-')

        if not skill_name:
            skill_name = "new-skill"

        # 步骤2：确定保存路径
        scope = getattr(request, 'scope', 'user')

        if scope == 'plugin':
            plugin_name = getattr(request, 'plugin_name', None)
            if not plugin_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Plugin scope 需要指定 plugin_name"
                )
            skills_dir = Path.home() / ".claude" / "plugins" / plugin_name / "skills" / skill_name

            # 验证 plugin 是否存在
            if not skills_dir.parent.parent.exists():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Plugin '{plugin_name}' 不存在"
                )
        elif scope == 'project':
            project_path = getattr(request, 'project_path', None)
            if not project_path:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Project scope 需要指定 project_path"
                )
            skills_dir = Path(project_path) / ".claude" / "skills" / skill_name
        else:  # user
            skills_dir = settings.claude_skills_dir / skill_name

        # 创建技能目录并写入文件
        skills_dir.mkdir(parents=True, exist_ok=True)

        # 写入 SKILL.md
        skill_md_path = skills_dir / "SKILL.md"
        skill_md_path.write_text(request.skill_md, encoding="utf-8")
        logger.info(f"Written SKILL.md to {skill_md_path}")

        # 写入 scripts
        if request.scripts:
            scripts_dir = skills_dir / "scripts"
            scripts_dir.mkdir(exist_ok=True)
            for script in request.scripts:
                script_path = scripts_dir / script.name
                script_path.write_text(script.content, encoding="utf-8")
                logger.info(f"Written script: {script_path}")

        # 写入 references
        if request.references:
            refs_dir = skills_dir / "references"
            refs_dir.mkdir(exist_ok=True)
            for ref in request.references:
                ref_path = refs_dir / ref.name
                ref_path.write_text(ref.content, encoding="utf-8")
                logger.info(f"Written reference: {ref_path}")

        # 写入 assets
        if request.assets:
            assets_dir = skills_dir / "assets"
            assets_dir.mkdir(exist_ok=True)
            for asset in request.assets:
                asset_path = assets_dir / asset.name
                asset_path.write_text(asset.content, encoding="utf-8")
                logger.info(f"Written asset: {asset_path}")

        saved_path = str(skills_dir)
        logger.info(f"Skill files saved to: {saved_path}")

        # 步骤3：同步到数据库
        # 从 SKILL.md 提取描述
        description = skill_name
        desc_match = re.search(r'^description:\s*(.+?)$', request.skill_md, re.MULTILINE)
        if desc_match:
            description = desc_match.group(1).strip()

        # 提取标签
        tags = []
        tags_match = re.search(r'^tags:\s*\[(.+?)\]', request.skill_md, re.MULTILINE)
        if tags_match:
            tags = [t.strip().strip('"\'') for t in tags_match.group(1).split(',')]

        # 构建 meta 信息
        meta = {
            "path": str(skills_dir),
            "skill_md_path": str(skill_md_path),
        }
        if scope == 'plugin':
            meta["plugin_name"] = plugin_name
        elif scope == 'project':
            meta["project_path"] = project_path

        if request.scripts:
            meta["scripts"] = [s.name for s in request.scripts]
        if request.references:
            meta["references"] = [r.name for r in request.references]
        if request.assets:
            meta["assets"] = [a.name for a in request.assets]

        # 检查是否已存在同名技能（直接查询数据库）
        existing_skill = await repository.get_by_name(skill_name)

        if existing_skill:
            # 更新现有技能
            skill_update = SkillUpdate(
                description=description,
                tags=tags,
                meta=meta,
                enabled=True
            )
            await repository.update(existing_skill.id, skill_update)
            logger.info(f"Updated existing skill in database: {skill_name}")
        else:
            # 创建新技能（直接通过 repository，不触发文件系统操作）
            skill_create = SkillCreate(
                name=skill_name,
                full_name=skill_name,
                type="custom",
                description=description,
                tags=tags,
                source=SkillSource.GLOBAL,
                enabled=True,
                meta=meta
            )
            await repository.create(skill_create)
            logger.info(f"Created new skill in database: {skill_name}")
        
        return SaveSkillResponse(
            success=True,
            saved_path=saved_path,
            message=f"Skill 已成功保存到 {saved_path} 并同步到数据库"
        )
        
    except Exception as e:
        logger.error(f"Error saving skill: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"保存 Skill 失败: {str(e)}"
        )


class SkillContentResponse(BaseModel):
    """技能完整内容响应"""
    id: int
    name: str
    path: Optional[str] = None  # 技能目录的实际路径
    skill_md: str
    scripts: List[SkillFileItem] = []
    references: List[SkillFileItem] = []
    assets: List[SkillFileItem] = []


@router.get(
    "/{skill_id}/content",
    response_model=SkillContentResponse,
    summary="获取技能完整内容（包括文件）"
)
async def get_skill_content(
    skill_id: int,
    service: SkillService = Depends(get_skill_service)
):
    """
    获取技能的完整内容，包括 SKILL.md 和所有附属文件。
    用于在编辑器中加载和编辑现有技能。
    """
    # 获取技能基本信息
    skill = await service.get_skill(skill_id)
    
    # 获取技能目录路径
    skill_path = None
    if skill.meta and 'path' in skill.meta:
        skill_path = Path(skill.meta['path'])
    elif skill.meta and 'skill_md_path' in skill.meta:
        skill_path = Path(skill.meta['skill_md_path']).parent
    else:
        # 根据 source 推断路径
        if skill.source == SkillSource.GLOBAL:
            skill_path = settings.claude_skills_dir / skill.name
        elif skill.source == SkillSource.PROJECT:
            skill_path = Path.cwd() / ".claude" / "skills" / skill.name
    
    skill_md = f"# {skill.name}\n\n{skill.description}"
    scripts: List[SkillFileItem] = []
    references: List[SkillFileItem] = []
    assets: List[SkillFileItem] = []
    
    if skill_path and skill_path.exists():
        # 读取 SKILL.md
        skill_md_file = skill_path / "SKILL.md"
        if skill_md_file.exists():
            skill_md = skill_md_file.read_text(encoding="utf-8")
        
        # 读取 scripts
        scripts_dir = skill_path / "scripts"
        if scripts_dir.exists() and scripts_dir.is_dir():
            for f in scripts_dir.iterdir():
                if f.is_file():
                    scripts.append(SkillFileItem(
                        name=f.name,
                        content=f.read_text(encoding="utf-8"),
                        type="script"
                    ))
        
        # 读取 references
        refs_dir = skill_path / "references"
        if refs_dir.exists() and refs_dir.is_dir():
            for f in refs_dir.iterdir():
                if f.is_file():
                    references.append(SkillFileItem(
                        name=f.name,
                        content=f.read_text(encoding="utf-8"),
                        type="reference"
                    ))
        
        # 读取 assets
        assets_dir = skill_path / "assets"
        if assets_dir.exists() and assets_dir.is_dir():
            for f in assets_dir.iterdir():
                if f.is_file():
                    try:
                        content = f.read_text(encoding="utf-8")
                        assets.append(SkillFileItem(
                            name=f.name,
                            content=content,
                            type="asset"
                        ))
                    except UnicodeDecodeError:
                        # 跳过二进制文件
                        pass
    
    return SkillContentResponse(
        id=skill.id,
        name=skill.name,
        path=str(skill_path) if skill_path else None,
        skill_md=skill_md,
        scripts=scripts,
        references=references,
        assets=assets
    )


@router.get(
    "/{skill_id}",
    response_model=SkillResponse,
    summary="Get skill by ID"
)
async def get_skill(
    skill_id: int,
    service: SkillService = Depends(get_skill_service)
):
    """Get a skill by ID"""
    return await service.get_skill(skill_id)


@router.put(
    "/{skill_id}",
    response_model=SkillResponse,
    summary="Update a skill"
)
async def update_skill(
    skill_id: int,
    skill_data: SkillUpdate,
    service: SkillService = Depends(get_skill_service)
):
    """Update a skill"""
    return await service.update_skill(skill_id, skill_data)


@router.delete(
    "/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a skill"
)
async def delete_skill(
    skill_id: int,
    service: SkillService = Depends(get_skill_service)
):
    """Delete a skill"""
    await service.delete_skill(skill_id)
