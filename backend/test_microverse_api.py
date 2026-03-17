"""
测试 Microverse API
"""
import asyncio
import httpx

BASE_URL = "http://localhost:38080"

async def test_microverse_api():
    """测试 Microverse API"""
    async with httpx.AsyncClient() as client:
        print("=== 测试 Microverse API ===\n")

        # 1. 创建 Agent
        print("1. 创建 Agent...")
        agent_response = await client.post(
            f"{BASE_URL}/api/agents",
            json={
                "name": "microverse_test_agent",
                "description": "Test agent for Microverse",
                "framework": "claude_code",
                "system_prompt": "You are a helpful assistant."
            }
        )
        print(f"Status: {agent_response.status_code}")
        if agent_response.status_code == 200:
            agent_data = agent_response.json()
            agent_id = agent_data["id"]
            print(f"Agent created: ID={agent_id}, Name={agent_data['name']}\n")
        else:
            print(f"Error: {agent_response.text}\n")
            return

        # 2. 创建角色并绑定 Agent
        print("2. 创建角色并绑定 Agent...")
        character_response = await client.post(
            f"{BASE_URL}/api/microverse/characters",
            json={
                "character_name": "TestChar",
                "display_name": "测试角色",
                "agent_id": agent_id
            }
        )
        print(f"Status: {character_response.status_code}")
        if character_response.status_code == 200:
            character_data = character_response.json()
            print(f"Character created: {character_data}\n")
        else:
            print(f"Error: {character_response.text}\n")
            return

        # 3. 获取角色详细信息
        print("3. 获取角色详细信息...")
        detail_response = await client.get(
            f"{BASE_URL}/api/microverse/characters/TestChar"
        )
        print(f"Status: {detail_response.status_code}")
        if detail_response.status_code == 200:
            detail_data = detail_response.json()
            print(f"Character detail: {detail_data}\n")
        else:
            print(f"Error: {detail_response.text}\n")

        # 4. 获取所有角色列表
        print("4. 获取所有角色列表...")
        list_response = await client.get(
            f"{BASE_URL}/api/microverse/characters"
        )
        print(f"Status: {list_response.status_code}")
        if list_response.status_code == 200:
            list_data = list_response.json()
            print(f"Characters: {len(list_data)} found")
            for char in list_data:
                print(f"  - {char['character_name']} (Agent ID: {char['agent_id']})")
            print()
        else:
            print(f"Error: {list_response.text}\n")

        # 5. 测试启动工作（会失败，因为没有实际的 Runtime）
        print("5. 测试启动工作...")
        start_work_response = await client.post(
            f"{BASE_URL}/api/microverse/characters/TestChar/work/start",
            json={
                "task_description": "列出当前目录的文件",
                "project_path": "/tmp"
            }
        )
        print(f"Status: {start_work_response.status_code}")
        if start_work_response.status_code == 200:
            work_data = start_work_response.json()
            print(f"Work started: {work_data}\n")
        else:
            print(f"Error: {start_work_response.text}\n")

        # 6. 查询工作状态
        print("6. 查询工作状态...")
        status_response = await client.get(
            f"{BASE_URL}/api/microverse/characters/TestChar/work/status"
        )
        print(f"Status: {status_response.status_code}")
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"Work status: {status_data}\n")
        else:
            print(f"Error: {status_response.text}\n")

        # 7. 停止工作
        print("7. 停止工作...")
        stop_work_response = await client.post(
            f"{BASE_URL}/api/microverse/characters/TestChar/work/stop"
        )
        print(f"Status: {stop_work_response.status_code}")
        if stop_work_response.status_code == 200:
            stop_data = stop_work_response.json()
            print(f"Work stopped: {stop_data}\n")
        else:
            print(f"Error: {stop_work_response.text}\n")

        # 8. 解绑 Agent
        print("8. 解绑 Agent...")
        unbind_response = await client.delete(
            f"{BASE_URL}/api/microverse/characters/TestChar/bind"
        )
        print(f"Status: {unbind_response.status_code}")
        if unbind_response.status_code == 200:
            unbind_data = unbind_response.json()
            print(f"Agent unbound: {unbind_data}\n")
        else:
            print(f"Error: {unbind_response.text}\n")

        print("=== 测试完成 ===")

if __name__ == "__main__":
    asyncio.run(test_microverse_api())
