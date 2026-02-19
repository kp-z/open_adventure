#!/usr/bin/env python3
"""Test CRUD operations on API endpoints"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_create_skill():
    """Test creating a skill"""
    url = f"{BASE_URL}/api/skills"
    data = {
        "name": "test-skill",
        "full_name": "Test Skill",
        "description": "A test skill",
        "type": "command",
        "source": "global",
        "config": {"key": "value"}
    }

    try:
        response = requests.post(url, json=data)
        print(f"Create Skill - Status: {response.status_code}")
        if response.status_code in [200, 201]:
            result = response.json()
            print(json.dumps(result, indent=2))
            return result.get("id")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    return None

def test_create_agent():
    """Test creating an agent"""
    url = f"{BASE_URL}/api/agents"
    data = {
        "name": "test-agent",
        "description": "A test agent",
        "source": "local",
        "config": {"model": "claude-3"}
    }

    try:
        response = requests.post(url, json=data)
        print(f"Create Agent - Status: {response.status_code}")
        if response.status_code in [200, 201]:
            result = response.json()
            print(json.dumps(result, indent=2))
            return result.get("id")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    return None

def test_create_workflow():
    """Test creating a workflow"""
    url = f"{BASE_URL}/api/workflows"
    data = {
        "name": "test-workflow",
        "description": "A test workflow",
        "version": "1.0.0",
        "workflow_data": {
            "nodes": [
                {"id": "1", "type": "start", "data": {}}
            ],
            "edges": []
        }
    }

    try:
        response = requests.post(url, json=data)
        print(f"Create Workflow - Status: {response.status_code}")
        if response.status_code in [200, 201]:
            result = response.json()
            print(json.dumps(result, indent=2))
            return result.get("id")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    return None

def test_get_resource(resource_type, resource_id):
    """Test getting a resource by ID"""
    url = f"{BASE_URL}/api/{resource_type}/{resource_id}"

    try:
        response = requests.get(url)
        print(f"Get {resource_type} - Status: {response.status_code}")
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("=== Testing Create Skill ===")
    skill_id = test_create_skill()

    print("\n=== Testing Create Agent ===")
    agent_id = test_create_agent()

    print("\n=== Testing Create Workflow ===")
    workflow_id = test_create_workflow()

    if skill_id:
        print(f"\n=== Testing Get Skill {skill_id} ===")
        test_get_resource("skills", skill_id)

    if agent_id:
        print(f"\n=== Testing Get Agent {agent_id} ===")
        test_get_resource("agents", agent_id)

    if workflow_id:
        print(f"\n=== Testing Get Workflow {workflow_id} ===")
        test_get_resource("workflows", workflow_id)
