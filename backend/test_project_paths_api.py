#!/usr/bin/env python3
"""
API 测试：验证项目路径管理功能
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"


def test_project_paths_api():
    """测试项目路径 API"""
    print("=" * 60)
    print("测试项目路径 API")
    print("=" * 60)

    # 1. 创建项目路径
    print("\n1. 创建项目路径")
    create_data = {
        "path": "~/项目/Proj/claude_manager",
        "alias": "Claude Manager",
        "enabled": True,
        "recursive_scan": True
    }

    try:
        response = requests.post(f"{BASE_URL}/project-paths", json=create_data)
        if response.status_code == 201:
            project_path = response.json()
            print(f"✓ 创建成功")
            print(f"  ID: {project_path['id']}")
            print(f"  Path: {project_path['path']}")
            print(f"  Alias: {project_path['alias']}")
            print(f"  Enabled: {project_path['enabled']}")
            path_id = project_path['id']
        elif response.status_code == 409:
            print("⚠ 项目路径已存在，继续测试...")
            # 获取现有路径
            response = requests.get(f"{BASE_URL}/project-paths")
            paths = response.json()
            if paths['items']:
                path_id = paths['items'][0]['id']
            else:
                print("✗ 无法获取项目路径")
                return
        else:
            print(f"✗ 创建失败: {response.status_code}")
            print(f"  {response.text}")
            return
    except Exception as e:
        print(f"✗ 请求失败: {e}")
        return

    # 2. 获取所有项目路径
    print("\n2. 获取所有项目路径")
    try:
        response = requests.get(f"{BASE_URL}/project-paths")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 获取成功，共 {data['total']} 个路径")
            for item in data['items']:
                print(f"  - [{item['id']}] {item['alias']}: {item['path']} (enabled: {item['enabled']})")
        else:
            print(f"✗ 获取失败: {response.status_code}")
    except Exception as e:
        print(f"✗ 请求失败: {e}")

    # 3. 获取启用的项目路径
    print("\n3. 获取启用的项目路径")
    try:
        response = requests.get(f"{BASE_URL}/project-paths?enabled=true")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 获取成功，共 {data['total']} 个启用的路径")
            for item in data['items']:
                print(f"  - [{item['id']}] {item['alias']}: {item['path']}")
            if data['items']:
                print(f"\n  → 终端将自动切换到: {data['items'][0]['path']}")
        else:
            print(f"✗ 获取失败: {response.status_code}")
    except Exception as e:
        print(f"✗ 请求失败: {e}")

    # 4. 更新项目路径
    print("\n4. 更新项目路径")
    update_data = {
        "alias": "Claude Manager (Updated)"
    }
    try:
        response = requests.put(f"{BASE_URL}/project-paths/{path_id}", json=update_data)
        if response.status_code == 200:
            project_path = response.json()
            print(f"✓ 更新成功")
            print(f"  新别名: {project_path['alias']}")
        else:
            print(f"✗ 更新失败: {response.status_code}")
    except Exception as e:
        print(f"✗ 请求失败: {e}")

    # 5. 切换启用状态
    print("\n5. 切换启用状态")
    try:
        response = requests.post(f"{BASE_URL}/project-paths/{path_id}/toggle")
        if response.status_code == 200:
            project_path = response.json()
            print(f"✓ 切换成功")
            print(f"  当前状态: {'启用' if project_path['enabled'] else '禁用'}")

            # 再切换回来
            response = requests.post(f"{BASE_URL}/project-paths/{path_id}/toggle")
            if response.status_code == 200:
                project_path = response.json()
                print(f"✓ 切换回来")
                print(f"  当前状态: {'启用' if project_path['enabled'] else '禁用'}")
        else:
            print(f"✗ 切换失败: {response.status_code}")
    except Exception as e:
        print(f"✗ 请求失败: {e}")

    # 6. 检查终端状态
    print("\n6. 检查终端状态")
    try:
        response = requests.get(f"{BASE_URL}/terminal/status")
        if response.status_code == 200:
            status = response.json()
            print(f"✓ 终端服务可用")
            print(f"  活动会话: {status['active_sessions']}")
            print(f"  平台: {status['platform']}")
        else:
            print(f"✗ 获取状态失败: {response.status_code}")
    except Exception as e:
        print(f"✗ 请求失败: {e}")

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
    print("\n使用说明：")
    print("1. 后端服务已配置项目路径功能")
    print("2. 在前端打开终端，会自动切换到第一个启用的项目目录")
    print("3. 终端会自动执行 'claude' 命令")
    print("4. 可以通过 API 或前端界面管理项目路径")


if __name__ == "__main__":
    test_project_paths_api()
