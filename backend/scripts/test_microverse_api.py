#!/usr/bin/env python3
"""
测试 Microverse API 端点
验证 Godot 游戏模式所需的所有 API 是否正常工作
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_get_agents():
    """测试获取 Agent 列表"""
    print("\n=== 测试获取 Agent 列表 ===")
    try:
        response = requests.get(f"{BASE_URL}/agents")
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            agents = response.json()
            print(f"成功获取 {len(agents)} 个 Agent")
            for agent in agents[:3]:  # 只显示前3个
                print(f"  - {agent.get('name')}: {agent.get('description', '')}")
            return True
        else:
            print(f"失败: {response.text}")
            return False
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_bind_character(character_name="TestWorker", agent_id=1):
    """测试绑定角色到 Agent"""
    print(f"\n=== 测试绑定角色 {character_name} 到 Agent {agent_id} ===")
    try:
        url = f"{BASE_URL}/microverse/characters/{character_name}/bind"
        data = {"agent_id": agent_id}
        response = requests.post(url, json=data)
        print(f"状态码: {response.status_code}")
        if response.status_code in [200, 201]:
            print("绑定成功")
            return True
        else:
            print(f"失败: {response.text}")
            return False
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_add_task(character_name="TestWorker"):
    """测试添加任务"""
    print(f"\n=== 测试为角色 {character_name} 添加任务 ===")
    try:
        url = f"{BASE_URL}/microverse/characters/{character_name}/tasks"
        data = {
            "description": "搜索项目中的 TODO",
            "project_path": "/Users/kp/项目/Proj/claude_manager",
            "priority": 8,
            "auto_execute": True
        }
        response = requests.post(url, json=data)
        print(f"状态码: {response.status_code}")
        if response.status_code in [200, 201]:
            task = response.json()
            print(f"任务添加成功，ID: {task.get('id')}")
            return task.get('id')
        else:
            print(f"失败: {response.text}")
            return None
    except Exception as e:
        print(f"错误: {e}")
        return None

def test_get_tasks(character_name="TestWorker"):
    """测试获取任务列表"""
    print(f"\n=== 测试获取角色 {character_name} 的任务列表 ===")
    try:
        url = f"{BASE_URL}/microverse/characters/{character_name}/tasks"
        response = requests.get(url)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            tasks = response.json()
            print(f"成功获取 {len(tasks)} 个任务")
            for task in tasks:
                print(f"  - [{task.get('id')}] {task.get('description')} (优先级: {task.get('priority')})")
            return True
        else:
            print(f"失败: {response.text}")
            return False
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_start_work(character_name="TestWorker"):
    """测试开始工作"""
    print(f"\n=== 测试角色 {character_name} 开始工作 ===")
    try:
        url = f"{BASE_URL}/microverse/characters/{character_name}/work"
        data = {
            "task_description": "搜索项目中的 TODO",
            "project_path": "/Users/kp/项目/Proj/claude_manager"
        }
        response = requests.post(url, json=data)
        print(f"状态码: {response.status_code}")
        if response.status_code in [200, 201]:
            print("工作启动成功")
            return True
        else:
            print(f"失败: {response.text}")
            return False
    except Exception as e:
        print(f"错误: {e}")
        return False

def test_get_work_status(character_name="TestWorker"):
    """测试获取工作状态"""
    print(f"\n=== 测试获取角色 {character_name} 的工作状态 ===")
    try:
        url = f"{BASE_URL}/microverse/characters/{character_name}/work/status"
        response = requests.get(url)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            status = response.json()
            print(f"状态: {status.get('status')}")
            print(f"PID: {status.get('pid')}")
            return True
        else:
            print(f"失败: {response.text}")
            return False
    except Exception as e:
        print(f"错误: {e}")
        return False

def main():
    """运行所有测试"""
    print("=" * 60)
    print("Microverse API 测试")
    print("=" * 60)

    # 测试 Agent 列表
    test_get_agents()

    # 测试绑定
    test_bind_character()

    # 测试添加任务
    task_id = test_add_task()

    # 测试获取任务列表
    test_get_tasks()

    # 测试开始工作（可选，会实际启动 Agent）
    # test_start_work()

    # 测试获取工作状态
    # test_get_work_status()

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    main()
