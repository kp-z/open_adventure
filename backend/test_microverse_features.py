#!/usr/bin/env python3
"""
测试 Microverse Agent 关联和任务执行功能
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:38080"

async def test_character_creation():
    """测试创建角色"""
    print("\n=== 测试创建角色 ===")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/microverse/characters",
            json={
                "character_name": "TestCharacter",
                "display_name": "测试角色",
                "agent_id": None,
                "meta": {}
            }
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.json()

async def test_list_characters():
    """测试获取角色列表"""
    print("\n=== 测试获取角色列表 ===")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/microverse/characters")
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.json()

async def test_bind_agent():
    """测试绑定 Agent"""
    print("\n=== 测试绑定 Agent ===")
    async with httpx.AsyncClient() as client:
        # 先获取可用的 Agent
        agents_response = await client.get(f"{BASE_URL}/api/agents")
        agents = agents_response.json()

        if not agents:
            print("错误: 没有可用的 Agent")
            return None

        agent_id = agents[0]["id"]
        print(f"使用 Agent ID: {agent_id}")

        # 绑定 Agent
        response = await client.put(
            f"{BASE_URL}/api/microverse/characters/TestCharacter/bind",
            json={"agent_id": agent_id}
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.json()

async def test_add_task():
    """测试添加任务配置"""
    print("\n=== 测试添加任务配置 ===")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/microverse/characters/TestCharacter/tasks",
            json={
                "description": "搜索项目中的 TODO",
                "project_path": "/Users/kp/项目/Proj/claude_manager",
                "priority": 8,
                "auto_execute": True
            }
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.json()

async def test_get_tasks():
    """测试获取任务列表"""
    print("\n=== 测试获取任务列表 ===")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/microverse/characters/TestCharacter/tasks"
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.json()

async def test_start_work():
    """测试启动工作"""
    print("\n=== 测试启动工作 ===")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/microverse/characters/TestCharacter/work/start",
            json={
                "task_description": "搜索项目中的 TODO",
                "project_path": "/Users/kp/项目/Proj/claude_manager"
            }
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.json()

async def test_get_work_status():
    """测试获取工作状态"""
    print("\n=== 测试获取工作状态 ===")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/microverse/characters/TestCharacter/work/status"
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.json()

async def test_websocket():
    """测试 WebSocket 连接"""
    print("\n=== 测试 WebSocket 连接 ===")
    import websockets

    try:
        uri = "ws://localhost:38080/api/microverse/characters/TestCharacter/work-ws"
        print(f"连接到: {uri}")

        async with websockets.connect(uri) as websocket:
            print("WebSocket 已连接")

            # 接收几条消息
            for i in range(3):
                message = await websocket.recv()
                data = json.loads(message)
                print(f"收到消息 {i+1}: {data}")
                await asyncio.sleep(1)

    except Exception as e:
        print(f"WebSocket 错误: {e}")

async def main():
    """主测试流程"""
    try:
        # 1. 创建角色
        await test_character_creation()

        # 2. 获取角色列表
        await test_list_characters()

        # 3. 绑定 Agent
        await test_bind_agent()

        # 4. 添加任务
        await test_add_task()

        # 5. 获取任务列表
        await test_get_tasks()

        # 6. 启动工作
        # await test_start_work()

        # 7. 获取工作状态
        # await test_get_work_status()

        # 8. 测试 WebSocket
        # await test_websocket()

        print("\n=== 测试完成 ===")

    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
