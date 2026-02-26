"""
Skill Stream API - 流式生成接口
"""
import asyncio
import json
import re
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.routers.skills import ClaudeGenerateRequest, SkillFileItem, SKILL_CREATOR_SYSTEM_PROMPT, get_skill_service
from app.services.skill_service import SkillService
from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/skills", tags=["skills"])


@router.post(
    "/generate-with-claude-stream",
    status_code=200,
    summary="使用 Claude AI 生成完整 Skill（流式输出）"
)
async def generate_skill_with_claude_stream(
    request: ClaudeGenerateRequest,
    service: SkillService = Depends(get_skill_service)
):
    """
    使用 Claude Code CLI 生成完整的 Skill 结构，实时流式输出日志。

    返回 Server-Sent Events (SSE) 流：
    - type: log - 日志消息
    - type: complete - 生成完成，包含完整结果
    - type: error - 错误消息
    """
    async def event_generator():
        import os

        try:
            # 发送初始日志
            yield f"data: {json.dumps({'type': 'log', 'message': '开始生成 Skill...'}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'log', 'message': f'用户需求: {request.description[:60]}...'}, ensure_ascii=False)}\n\n"

            # 构建 prompt
            full_prompt = f"{SKILL_CREATOR_SYSTEM_PROMPT}\n\n## 用户需求\n{request.description}"

            # 调用 Claude CLI
            cli_path = settings.claude_cli_path
            cmd = [
                cli_path,
                "-p", full_prompt,
                "--output-format", "text",
                "--disable-slash-commands",
                "--setting-sources", "user"
            ]

            yield f"data: {json.dumps({'type': 'log', 'message': '调用 Claude CLI...'}, ensure_ascii=False)}\n\n"
            logger.info(f"Calling Claude CLI to generate skill: {request.description[:50]}...")

            # 清除环境变量
            env = os.environ.copy()
            env.pop('CLAUDECODE', None)
            env.pop('CLAUDE_CODE', None)

            # 创建进程
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )

            # 实时读取 stdout
            output_lines = []

            # 读取 stdout 并实时发送
            while True:
                line = await process.stdout.readline()
                if not line:
                    break

                line_text = line.decode('utf-8', errors='ignore').strip()
                if line_text:
                    output_lines.append(line_text)
                    # 发送日志到前端
                    yield f"data: {json.dumps({'type': 'log', 'message': f'[Claude] {line_text}'}, ensure_ascii=False)}\n\n"

            # 等待进程结束
            await process.wait()

            # 读取 stderr（如果有）
            stderr_data = await process.stderr.read()
            if stderr_data:
                stderr_text = stderr_data.decode('utf-8', errors='ignore').strip()
                if stderr_text:
                    yield f"data: {json.dumps({'type': 'log', 'message': f'[Error] {stderr_text}'}, ensure_ascii=False)}\n\n"

            # 检查返回码
            if process.returncode != 0:
                error_msg = f"Claude CLI 返回错误码: {process.returncode}"
                yield f"data: {json.dumps({'type': 'error', 'message': error_msg}, ensure_ascii=False)}\n\n"
                return

            # 合并所有输出
            output = '\n'.join(output_lines)

            if not output:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Claude CLI 没有返回任何内容'}, ensure_ascii=False)}\n\n"
                return

            yield f"data: {json.dumps({'type': 'log', 'message': '解析 Claude 输出...'}, ensure_ascii=False)}\n\n"
            logger.info(f"Claude CLI output length: {len(output)} chars")

            # 解析输出
            skill_data = None

            # 方法1：尝试匹配 ```json ... ``` 代码块
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', output)
            if json_match:
                try:
                    skill_data = json.loads(json_match.group(1))
                    yield f"data: {json.dumps({'type': 'log', 'message': '✓ 成功解析 JSON 代码块'}, ensure_ascii=False)}\n\n"
                except json.JSONDecodeError:
                    pass

            # 方法2：尝试匹配任何 JSON 对象
            if not skill_data:
                json_match = re.search(r'\{[^{}]*"name"\s*:\s*"[^"]+?"[^{}]*"skill_md"\s*:\s*"[\s\S]*?"\s*[,}][\s\S]*?\}', output, re.DOTALL)
                if json_match:
                    try:
                        skill_data = json.loads(json_match.group(0))
                        yield f"data: {json.dumps({'type': 'log', 'message': '✓ 成功解析 JSON 对象'}, ensure_ascii=False)}\n\n"
                    except json.JSONDecodeError:
                        pass

            # 方法3：括号匹配
            if not skill_data:
                start_idx = output.find('{')
                if start_idx != -1:
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
                            yield f"data: {json.dumps({'type': 'log', 'message': '✓ 通过括号匹配解析 JSON'}, ensure_ascii=False)}\n\n"
                        except json.JSONDecodeError:
                            pass

            # 如果所有解析都失败，使用 fallback 模板
            if not skill_data:
                words = request.description.lower().split()[:3]
                fallback_name = request.skill_name or "-".join(w for w in words if w.isalnum()) or "new-skill"

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
                yield f"data: {json.dumps({'type': 'log', 'message': '⚠ 使用基础模板（Claude 输出解析失败）'}, ensure_ascii=False)}\n\n"

            # 构建响应
            name = request.skill_name or skill_data.get("name", "generated-skill")
            skill_md = skill_data.get("skill_md", "")
            scripts = [SkillFileItem(**s) for s in skill_data.get("scripts", [])]
            references = [SkillFileItem(**s) for s in skill_data.get("references", [])]
            assets = [SkillFileItem(**s) for s in skill_data.get("assets", [])]

            yield f"data: {json.dumps({'type': 'log', 'message': f'✓ 生成成功！Skill 名称: {name}'}, ensure_ascii=False)}\n\n"

            # 发送完成事件
            result = {
                "type": "complete",
                "data": {
                    "success": True,
                    "name": name,
                    "skill_md": skill_md,
                    "scripts": [{"name": s.name, "content": s.content, "type": s.type} for s in scripts],
                    "references": [{"name": r.name, "content": r.content, "type": r.type} for r in references],
                    "assets": [{"name": a.name, "content": a.content, "type": a.type} for a in assets],
                    "saved_path": None,
                    "message": "Skill 生成成功"
                }
            }
            yield f"data: {json.dumps(result, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.error(f"Error in stream generation: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': f'生成失败: {str(e)}'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
