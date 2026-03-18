"""
Skills API 集成测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_skills(client: AsyncClient):
    """测试获取 Skills 列表"""
    response = await client.get("/api/skills")
    assert response.status_code == 200
    data = response.json()
    assert "skills" in data
    assert isinstance(data["skills"], list)


@pytest.mark.asyncio
async def test_get_skill_by_id(client: AsyncClient):
    """测试获取单个 Skill"""
    # 先创建一个 Skill
    create_response = await client.post(
        "/api/skills",
        json={
            "name": "test_skill",
            "description": "Test skill",
            "content": "Test content"
        }
    )
    assert create_response.status_code == 200
    skill_id = create_response.json()["id"]

    # 获取 Skill
    response = await client.get(f"/api/skills/{skill_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "test_skill"


@pytest.mark.asyncio
async def test_create_skill(client: AsyncClient):
    """测试创建 Skill"""
    response = await client.post(
        "/api/skills",
        json={
            "name": "new_skill",
            "description": "New skill",
            "content": "New content"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "new_skill"
    assert "id" in data


@pytest.mark.asyncio
async def test_update_skill(client: AsyncClient):
    """测试更新 Skill"""
    # 先创建一个 Skill
    create_response = await client.post(
        "/api/skills",
        json={
            "name": "update_test",
            "description": "Test",
            "content": "Test"
        }
    )
    skill_id = create_response.json()["id"]

    # 更新 Skill
    response = await client.put(
        f"/api/skills/{skill_id}",
        json={
            "name": "updated_skill",
            "description": "Updated",
            "content": "Updated"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "updated_skill"


@pytest.mark.asyncio
async def test_delete_skill(client: AsyncClient):
    """测试删除 Skill"""
    # 先创建一个 Skill
    create_response = await client.post(
        "/api/skills",
        json={
            "name": "delete_test",
            "description": "Test",
            "content": "Test"
        }
    )
    skill_id = create_response.json()["id"]

    # 删除 Skill
    response = await client.delete(f"/api/skills/{skill_id}")
    assert response.status_code == 200

    # 验证已删除
    get_response = await client.get(f"/api/skills/{skill_id}")
    assert get_response.status_code == 404
