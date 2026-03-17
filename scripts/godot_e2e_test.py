#!/usr/bin/env python3
"""
Godot 端到端集成测试脚本
测试 Godot 游戏模式与后端 API 的集成
"""
import asyncio
import aiohttp
import json
import time
from typing import Dict, Any, List
from datetime import datetime

# 配置
BASE_URL = "http://localhost:38080/api"
TEST_CHARACTER = "TestAgent"
TEST_AGENT_ID = 1

class Colors:
    """终端颜色"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class TestResult:
    """测试结果"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors: List[str] = []

    def add_pass(self, test_name: str):
        self.passed += 1
        print(f"{Colors.GREEN}✓{Colors.END} {test_name}")

    def add_fail(self, test_name: str, error: str):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"{Colors.RED}✗{Colors.END} {test_name}: {error}")

    def print_summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"测试总结: {total} 个测试")
        print(f"{Colors.GREEN}通过: {self.passed}{Colors.END}")
        print(f"{Colors.RED}失败: {self.failed}{Colors.END}")

        if self.errors:
            print(f"\n{Colors.RED}失败详情:{Colors.END}")
            for error in self.errors:
                print(f"  - {error}")

        print(f"{'='*60}\n")
        return self.failed == 0

async def test_backend_health(session: aiohttp.ClientSession, result: TestResult):
    """测试后端健康检查"""
    try:
        async with session.get(f"{BASE_URL.replace('/api', '')}/health") as resp:
            if resp.status == 200:
                result.add_pass("后端健康检查")
            else:
                result.add_fail("后端健康检查", f"状态码: {resp.status}")
    except Exception as e:
        result.add_fail("后端健康检查", str(e))

async def test_create_character(session: aiohttp.ClientSession, result: TestResult):
    """测试创建角色"""
    try:
        payload = {
            "character_name": TEST_CHARACTER,
            "display_name": "测试角色",
            "agent_id": TEST_AGENT_ID,
            "meta": {"test": True}
        }
        async with session.post(f"{BASE_URL}/microverse/characters", json=payload) as resp:
            if resp.status == 200:
                result.add_pass("创建角色")
            else:
                text = await resp.text()
                result.add_fail("创建角色", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("创建角色", str(e))

async def test_bind_character(session: aiohttp.ClientSession, result: TestResult):
    """测试绑定角色到 Agent"""
    try:
        payload = {"agent_id": TEST_AGENT_ID}
        async with session.put(
            f"{BASE_URL}/microverse/characters/{TEST_CHARACTER}/bind",
            json=payload
        ) as resp:
            if resp.status == 200:
                result.add_pass("绑定角色到 Agent")
            else:
                text = await resp.text()
                result.add_fail("绑定角色到 Agent", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("绑定角色到 Agent", str(e))

async def test_create_conversation(session: aiohttp.ClientSession, result: TestResult) -> str:
    """测试创建对话会话"""
    try:
        payload = {
            "character_name": TEST_CHARACTER,
            "context": {"test": True}
        }
        async with session.post(f"{BASE_URL}/microverse/conversations", json=payload) as resp:
            if resp.status == 200:
                data = await resp.json()
                session_id = data.get("session_id")
                if session_id:
                    result.add_pass("创建对话会话")
                    return session_id
                else:
                    result.add_fail("创建对话会话", "未返回 session_id")
            else:
                text = await resp.text()
                result.add_fail("创建对话会话", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("创建对话会话", str(e))
    return ""

async def test_send_message(session: aiohttp.ClientSession, session_id: str, result: TestResult):
    """测试发送消息"""
    if not session_id:
        result.add_fail("发送消息", "会话 ID 为空")
        return

    try:
        payload = {
            "message": "你好，这是一条测试消息",
            "context": {}
        }
        async with session.post(
            f"{BASE_URL}/microverse/conversations/{session_id}/messages",
            json=payload
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data.get("response"):
                    result.add_pass("发送消息并接收回复")
                else:
                    result.add_fail("发送消息并接收回复", "未返回响应")
            else:
                text = await resp.text()
                result.add_fail("发送消息并接收回复", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("发送消息并接收回复", str(e))

async def test_get_conversation_history(session: aiohttp.ClientSession, session_id: str, result: TestResult):
    """测试获取对话历史"""
    if not session_id:
        result.add_fail("获取对话历史", "会话 ID 为空")
        return

    try:
        async with session.get(
            f"{BASE_URL}/microverse/conversations/{session_id}/history"
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                if "messages" in data:
                    result.add_pass("获取对话历史")
                else:
                    result.add_fail("获取对话历史", "未返回消息列表")
            else:
                text = await resp.text()
                result.add_fail("获取对话历史", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("获取对话历史", str(e))

async def test_start_work(session: aiohttp.ClientSession, result: TestResult) -> int:
    """测试启动工作"""
    try:
        # 创建测试项目目录
        import os
        os.makedirs("/tmp/test_project", exist_ok=True)

        payload = {
            "task_description": "测试任务：列出当前目录文件",
            "project_path": "/tmp/test_project"
        }
        async with session.post(
            f"{BASE_URL}/microverse/characters/{TEST_CHARACTER}/work/start",
            json=payload
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                execution_id = data.get("execution_id")
                if execution_id:
                    result.add_pass("启动工作任务")
                    return execution_id
                else:
                    result.add_fail("启动工作任务", "未返回 execution_id")
            else:
                text = await resp.text()
                result.add_fail("启动工作任务", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("启动工作任务", str(e))
    return -1

async def test_get_work_status(session: aiohttp.ClientSession, result: TestResult):
    """测试获取工作状态"""
    try:
        async with session.get(
            f"{BASE_URL}/microverse/characters/{TEST_CHARACTER}/work/status"
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                if "status" in data:
                    result.add_pass("获取工作状态")
                else:
                    result.add_fail("获取工作状态", "未返回状态信息")
            else:
                text = await resp.text()
                result.add_fail("获取工作状态", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("获取工作状态", str(e))

async def test_pause_execution(session: aiohttp.ClientSession, execution_id: int, result: TestResult):
    """测试暂停执行"""
    if execution_id == -1:
        result.add_fail("暂停执行", "执行 ID 无效")
        return

    try:
        async with session.post(
            f"{BASE_URL}/microverse/executions/{execution_id}/pause"
        ) as resp:
            if resp.status == 200:
                result.add_pass("暂停执行")
            else:
                text = await resp.text()
                result.add_fail("暂停执行", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("暂停执行", str(e))

async def test_resume_execution(session: aiohttp.ClientSession, execution_id: int, result: TestResult):
    """测试恢复执行"""
    if execution_id == -1:
        result.add_fail("恢复执行", "执行 ID 无效")
        return

    try:
        async with session.post(
            f"{BASE_URL}/microverse/executions/{execution_id}/resume"
        ) as resp:
            if resp.status == 200:
                result.add_pass("恢复执行")
            else:
                text = await resp.text()
                result.add_fail("恢复执行", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("恢复执行", str(e))

async def test_stop_execution(session: aiohttp.ClientSession, execution_id: int, result: TestResult):
    """测试停止执行"""
    if execution_id == -1:
        result.add_fail("停止执行", "执行 ID 无效")
        return

    try:
        async with session.post(
            f"{BASE_URL}/microverse/executions/{execution_id}/stop"
        ) as resp:
            if resp.status == 200:
                result.add_pass("停止执行")
            else:
                text = await resp.text()
                result.add_fail("停止执行", f"状态码: {resp.status}, {text}")
    except Exception as e:
        result.add_fail("停止执行", str(e))

async def test_websocket_connection(result: TestResult):
    """测试 WebSocket 连接"""
    try:
        async with aiohttp.ClientSession() as session:
            ws_url = f"ws://localhost:38080/api/microverse/characters/{TEST_CHARACTER}/work-ws"
            async with session.ws_connect(ws_url) as ws:
                result.add_pass("WebSocket 连接建立")

                # 等待接收消息（最多 3 秒）
                try:
                    msg = await asyncio.wait_for(ws.receive(), timeout=3.0)
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        if data.get("type") == "status_update":
                            result.add_pass("WebSocket 接收状态更新")
                        else:
                            result.add_fail("WebSocket 接收状态更新", f"消息类型错误: {data.get('type')}")
                    else:
                        result.add_fail("WebSocket 接收状态更新", f"消息类型错误: {msg.type}")
                except asyncio.TimeoutError:
                    result.add_fail("WebSocket 接收状态更新", "超时未收到消息")
    except Exception as e:
        result.add_fail("WebSocket 连接", str(e))

async def test_error_handling(session: aiohttp.ClientSession, result: TestResult):
    """测试错误处理"""
    # 测试不存在的会话
    try:
        async with session.get(
            f"{BASE_URL}/microverse/conversations/nonexistent/history"
        ) as resp:
            if resp.status == 404:
                result.add_pass("错误处理 - 不存在的会话")
            else:
                result.add_fail("错误处理 - 不存在的会话", f"应返回 404，实际: {resp.status}")
    except Exception as e:
        result.add_fail("错误处理 - 不存在的会话", str(e))

    # 测试无效的执行 ID
    try:
        async with session.post(
            f"{BASE_URL}/microverse/executions/999999/pause"
        ) as resp:
            if resp.status == 404:
                result.add_pass("错误处理 - 无效的执行 ID")
            else:
                result.add_fail("错误处理 - 无效的执行 ID", f"应返回 404，实际: {resp.status}")
    except Exception as e:
        result.add_fail("错误处理 - 无效的执行 ID", str(e))

async def test_performance(session: aiohttp.ClientSession, result: TestResult):
    """测试性能"""
    # 测试 API 响应时间
    start_time = time.time()
    try:
        async with session.get(
            f"{BASE_URL}/microverse/characters/{TEST_CHARACTER}/work/status"
        ) as resp:
            elapsed = (time.time() - start_time) * 1000  # 转换为毫秒
            if resp.status == 200:
                if elapsed < 500:
                    result.add_pass(f"API 响应时间 ({elapsed:.0f}ms < 500ms)")
                else:
                    result.add_fail("API 响应时间", f"{elapsed:.0f}ms 超过 500ms")
            else:
                result.add_fail("API 响应时间", f"请求失败: {resp.status}")
    except Exception as e:
        result.add_fail("API 响应时间", str(e))

async def main():
    """主测试流程"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}Godot 端到端集成测试{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")

    result = TestResult()

    async with aiohttp.ClientSession() as session:
        # 1. 基础连接测试
        print(f"\n{Colors.YELLOW}[1/7] 基础连接测试{Colors.END}")
        await test_backend_health(session, result)
        await test_create_character(session, result)
        await test_bind_character(session, result)

        # 2. 对话功能测试
        print(f"\n{Colors.YELLOW}[2/7] 对话功能测试{Colors.END}")
        session_id = await test_create_conversation(session, result)
        await test_send_message(session, session_id, result)
        await test_get_conversation_history(session, session_id, result)

        # 3. 任务监控测试
        print(f"\n{Colors.YELLOW}[3/7] 任务监控测试{Colors.END}")
        execution_id = await test_start_work(session, result)
        await test_get_work_status(session, result)

        # 4. 任务控制测试
        print(f"\n{Colors.YELLOW}[4/7] 任务控制测试{Colors.END}")
        await test_pause_execution(session, execution_id, result)
        await test_resume_execution(session, execution_id, result)
        await test_stop_execution(session, execution_id, result)

        # 5. 错误处理测试
        print(f"\n{Colors.YELLOW}[5/7] 错误处理测试{Colors.END}")
        await test_error_handling(session, result)

        # 6. 性能测试
        print(f"\n{Colors.YELLOW}[6/7] 性能测试{Colors.END}")
        await test_performance(session, result)

    # WebSocket 测试（单独会话）
    print(f"\n{Colors.YELLOW}[7/7] WebSocket 实时更新测试{Colors.END}")
    # 注意：WebSocket 也需要使用正确的端口
    await test_websocket_connection(result)

    # 打印测试总结
    success = result.print_summary()

    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
