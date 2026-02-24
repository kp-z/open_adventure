#!/usr/bin/env python3
"""
创建示例数据脚本
通过 API 创建真实的 Agent、AgentTeam、Workflow、Task 示例数据
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"

def print_result(name: str, response: requests.Response):
    """打印 API 响应结果"""
    if response.ok:
        print(f"✅ {name} 创建成功: {response.json().get('id', 'N/A')}")
        return response.json()
    else:
        print(f"❌ {name} 创建失败: {response.status_code} - {response.text}")
        return None


def create_agents():
    """步骤 1: 创建 Agents"""
    print("\n" + "="*50)
    print("步骤 1: 创建 Agents")
    print("="*50)
    
    agents_data = [
        {
            "name": "CodeReviewer",
            "description": "专业代码审查智能体，擅长发现代码问题、安全漏洞和最佳实践建议",
            "system_prompt": "你是一个专业的代码审查专家。你的职责是审查代码质量、发现潜在bug、安全漏洞，并提供改进建议。",
            "model": "claude-sonnet-4-20250514",
            "capability_ids": [1, 2, 3],
            "source": "manual",
            "meta": {
                "avatar_id": "hero_warrior",
                "level": 15,
                "experience": 2500,
                "specialization": "security"
            }
        },
        {
            "name": "TestWriter",
            "description": "测试用例编写智能体，能够为各种代码生成高质量的单元测试和集成测试",
            "system_prompt": "你是一个测试专家。你的职责是为代码编写全面的测试用例，确保代码质量和功能正确性。",
            "model": "claude-sonnet-4-20250514",
            "capability_ids": [1, 4],
            "source": "manual",
            "meta": {
                "avatar_id": "hero_mage",
                "level": 12,
                "experience": 1800,
                "specialization": "testing"
            }
        },
        {
            "name": "DocWriter",
            "description": "文档编写智能体，擅长生成清晰、结构化的技术文档和 API 文档",
            "system_prompt": "你是一个技术文档专家。你的职责是编写清晰、准确、易于理解的技术文档。",
            "model": "claude-sonnet-4-20250514",
            "capability_ids": [5, 6],
            "source": "manual",
            "meta": {
                "avatar_id": "hero_healer",
                "level": 10,
                "experience": 1200,
                "specialization": "documentation"
            }
        },
        {
            "name": "Architect",
            "description": "系统架构设计智能体，擅长设计可扩展、高性能的系统架构",
            "system_prompt": "你是一个系统架构师。你的职责是设计高效、可扩展、易维护的系统架构。",
            "model": "claude-opus-4-20250514",
            "capability_ids": [1, 7, 8],
            "source": "manual",
            "meta": {
                "avatar_id": "hero_tank",
                "level": 20,
                "experience": 5000,
                "specialization": "architecture"
            }
        },
        {
            "name": "Debugger",
            "description": "调试专家智能体，擅长定位和修复复杂的程序错误",
            "system_prompt": "你是一个调试专家。你的职责是快速定位bug原因并提供修复方案。",
            "model": "claude-sonnet-4-20250514",
            "capability_ids": [1, 2, 9],
            "source": "manual",
            "meta": {
                "avatar_id": "hero_assassin",
                "level": 18,
                "experience": 3500,
                "specialization": "debugging"
            }
        }
    ]
    
    created_agents = []
    for agent_data in agents_data:
        response = requests.post(f"{BASE_URL}/agents", json=agent_data)
        result = print_result(f"Agent [{agent_data['name']}]", response)
        if result:
            created_agents.append(result)
    
    return created_agents


def create_agent_teams(agents: list):
    """步骤 2: 创建 AgentTeams"""
    print("\n" + "="*50)
    print("步骤 2: 创建 AgentTeams")
    print("="*50)
    
    if len(agents) < 3:
        print("⚠️ 需要至少 3 个 Agent 才能创建团队")
        return []
    
    teams_data = [
        {
            "name": "代码质量团队",
            "description": "专注于代码质量保障的精英团队，包含代码审查、测试编写和调试专家",
            "members": [
                {"agent_id": agents[0]["id"], "role": "leader", "priority": 1},  # CodeReviewer
                {"agent_id": agents[1]["id"], "role": "member", "priority": 2},  # TestWriter
                {"agent_id": agents[4]["id"], "role": "member", "priority": 3},  # Debugger
            ],
            "tags": ["quality", "review", "testing"],
            "meta": {
                "team_level": 5,
                "total_missions": 42,
                "success_rate": 0.95
            }
        },
        {
            "name": "全栈开发团队",
            "description": "全能型开发团队，覆盖从架构设计到文档编写的完整开发流程",
            "members": [
                {"agent_id": agents[3]["id"], "role": "leader", "priority": 1},  # Architect
                {"agent_id": agents[0]["id"], "role": "member", "priority": 2},  # CodeReviewer
                {"agent_id": agents[2]["id"], "role": "member", "priority": 3},  # DocWriter
            ],
            "tags": ["fullstack", "architecture", "documentation"],
            "meta": {
                "team_level": 7,
                "total_missions": 85,
                "success_rate": 0.92
            }
        },
        {
            "name": "快速修复小队",
            "description": "紧急问题快速响应团队，专门处理线上 bug 和紧急修复",
            "members": [
                {"agent_id": agents[4]["id"], "role": "leader", "priority": 1},  # Debugger
                {"agent_id": agents[0]["id"], "role": "member", "priority": 2},  # CodeReviewer
            ],
            "tags": ["hotfix", "emergency", "debugging"],
            "meta": {
                "team_level": 4,
                "total_missions": 28,
                "success_rate": 0.89
            }
        }
    ]
    
    created_teams = []
    for team_data in teams_data:
        response = requests.post(f"{BASE_URL}/agent-teams", json=team_data)
        result = print_result(f"AgentTeam [{team_data['name']}]", response)
        if result:
            created_teams.append(result)
    
    return created_teams


def create_workflows():
    """步骤 3: 创建 Workflows"""
    print("\n" + "="*50)
    print("步骤 3: 创建 Workflows")
    print("="*50)
    
    workflows_data = [
        {
            "name": "代码审查流程",
            "description": "完整的代码审查工作流，包含静态分析、安全检查和人工复核",
            "version": "1.0.0",
            "active": True,
            "nodes": [
                {
                    "name": "静态代码分析",
                    "type": "task",
                    "config": {"tool": "eslint", "strict": True},
                    "position_x": 100,
                    "position_y": 100
                },
                {
                    "name": "安全漏洞扫描",
                    "type": "task",
                    "config": {"tool": "snyk", "severity": "high"},
                    "position_x": 300,
                    "position_y": 100
                },
                {
                    "name": "代码质量检查",
                    "type": "decision",
                    "config": {"threshold": 80},
                    "position_x": 500,
                    "position_y": 100
                },
                {
                    "name": "生成审查报告",
                    "type": "task",
                    "config": {"format": "markdown"},
                    "position_x": 700,
                    "position_y": 100
                }
            ],
            "edges": [],
            "meta": {
                "category": "quality",
                "estimated_time": "15min",
                "difficulty": "medium"
            }
        },
        {
            "name": "自动化测试流程",
            "description": "从单元测试到集成测试的完整自动化测试工作流",
            "version": "2.1.0",
            "active": True,
            "nodes": [
                {
                    "name": "单元测试",
                    "type": "task",
                    "config": {"framework": "pytest", "coverage": True},
                    "position_x": 100,
                    "position_y": 100
                },
                {
                    "name": "并行测试网关",
                    "type": "parallel_gateway",
                    "config": {},
                    "position_x": 250,
                    "position_y": 100
                },
                {
                    "name": "集成测试",
                    "type": "task",
                    "config": {"timeout": 300},
                    "position_x": 400,
                    "position_y": 50
                },
                {
                    "name": "E2E 测试",
                    "type": "task",
                    "config": {"browser": "chrome"},
                    "position_x": 400,
                    "position_y": 150
                },
                {
                    "name": "测试汇总",
                    "type": "parallel_join",
                    "config": {},
                    "position_x": 550,
                    "position_y": 100
                },
                {
                    "name": "生成测试报告",
                    "type": "task",
                    "config": {"format": "html"},
                    "position_x": 700,
                    "position_y": 100
                }
            ],
            "edges": [],
            "meta": {
                "category": "testing",
                "estimated_time": "30min",
                "difficulty": "high"
            }
        },
        {
            "name": "文档生成流程",
            "description": "自动生成 API 文档和使用指南的工作流",
            "version": "1.2.0",
            "active": True,
            "nodes": [
                {
                    "name": "扫描代码注释",
                    "type": "task",
                    "config": {"languages": ["python", "typescript"]},
                    "position_x": 100,
                    "position_y": 100
                },
                {
                    "name": "提取 API 定义",
                    "type": "task",
                    "config": {"format": "openapi"},
                    "position_x": 300,
                    "position_y": 100
                },
                {
                    "name": "生成 Markdown 文档",
                    "type": "task",
                    "config": {"template": "default"},
                    "position_x": 500,
                    "position_y": 100
                }
            ],
            "edges": [],
            "meta": {
                "category": "documentation",
                "estimated_time": "10min",
                "difficulty": "low"
            }
        },
        {
            "name": "CI/CD 部署流程",
            "description": "完整的持续集成和部署工作流",
            "version": "3.0.0",
            "active": False,
            "nodes": [
                {
                    "name": "代码拉取",
                    "type": "task",
                    "config": {"branch": "main"},
                    "position_x": 100,
                    "position_y": 100
                },
                {
                    "name": "依赖安装",
                    "type": "task",
                    "config": {"cache": True},
                    "position_x": 250,
                    "position_y": 100
                },
                {
                    "name": "构建检查",
                    "type": "decision",
                    "config": {"on_failure": "abort"},
                    "position_x": 400,
                    "position_y": 100
                },
                {
                    "name": "部署到测试环境",
                    "type": "task",
                    "config": {"env": "staging"},
                    "position_x": 550,
                    "position_y": 100
                },
                {
                    "name": "部署到生产环境",
                    "type": "task",
                    "config": {"env": "production", "approval_required": True},
                    "position_x": 700,
                    "position_y": 100
                }
            ],
            "edges": [],
            "meta": {
                "category": "deployment",
                "estimated_time": "45min",
                "difficulty": "high"
            }
        }
    ]
    
    created_workflows = []
    for wf_data in workflows_data:
        response = requests.post(f"{BASE_URL}/workflows", json=wf_data)
        result = print_result(f"Workflow [{wf_data['name']}]", response)
        if result:
            created_workflows.append(result)
    
    return created_workflows


def create_tasks(workflows: list, teams: list):
    """步骤 4: 创建 Tasks"""
    print("\n" + "="*50)
    print("步骤 4: 创建 Tasks")
    print("="*50)
    
    tasks_data = [
        {
            "title": "审查用户认证模块代码",
            "description": "对新开发的用户认证模块进行全面代码审查，包括安全性检查和性能评估",
            "project_path": "/Users/kp/项目/Proj/claude_manager",
            "workflow_id": workflows[0]["id"] if workflows else None,
            "agent_team_id": teams[0]["id"] if teams else None,
            "meta": {
                "priority": "high",
                "estimated_hours": 4,
                "tags": ["security", "authentication"]
            }
        },
        {
            "title": "编写支付系统单元测试",
            "description": "为支付处理模块编写完整的单元测试，覆盖率目标 90%",
            "project_path": "/Users/kp/项目/Proj/payment-service",
            "workflow_id": workflows[1]["id"] if len(workflows) > 1 else None,
            "agent_team_id": teams[0]["id"] if teams else None,
            "meta": {
                "priority": "medium",
                "estimated_hours": 8,
                "tags": ["testing", "payment"]
            }
        },
        {
            "title": "生成 REST API 文档",
            "description": "自动扫描后端代码并生成完整的 REST API 文档",
            "project_path": "/Users/kp/项目/Proj/claude_manager/backend",
            "workflow_id": workflows[2]["id"] if len(workflows) > 2 else None,
            "agent_team_id": teams[1]["id"] if len(teams) > 1 else None,
            "meta": {
                "priority": "low",
                "estimated_hours": 2,
                "tags": ["documentation", "api"]
            }
        },
        {
            "title": "修复登录页面 500 错误",
            "description": "紧急修复生产环境登录页面出现的 500 Internal Server Error",
            "project_path": "/Users/kp/项目/Proj/web-app",
            "workflow_id": None,
            "agent_team_id": teams[2]["id"] if len(teams) > 2 else None,
            "meta": {
                "priority": "critical",
                "estimated_hours": 1,
                "tags": ["hotfix", "production", "urgent"]
            }
        },
        {
            "title": "重构数据库访问层",
            "description": "将直接 SQL 查询重构为 ORM 模式，提高代码可维护性",
            "project_path": "/Users/kp/项目/Proj/legacy-system",
            "workflow_id": workflows[0]["id"] if workflows else None,
            "agent_team_id": teams[1]["id"] if len(teams) > 1 else None,
            "meta": {
                "priority": "medium",
                "estimated_hours": 16,
                "tags": ["refactoring", "database", "orm"]
            }
        }
    ]
    
    created_tasks = []
    for task_data in tasks_data:
        response = requests.post(f"{BASE_URL}/tasks", json=task_data)
        result = print_result(f"Task [{task_data['title'][:30]}...]", response)
        if result:
            created_tasks.append(result)
    
    return created_tasks


def update_task_statuses(tasks: list):
    """步骤 5: 更新部分 Task 状态以显示不同状态"""
    print("\n" + "="*50)
    print("步骤 5: 更新 Task 状态")
    print("="*50)
    
    if len(tasks) >= 5:
        status_updates = [
            (tasks[0]["id"], "succeeded"),
            (tasks[1]["id"], "running"),
            (tasks[2]["id"], "succeeded"),
            (tasks[3]["id"], "running"),
            (tasks[4]["id"], "pending"),
        ]
        
        for task_id, status in status_updates:
            response = requests.put(
                f"{BASE_URL}/tasks/{task_id}",
                json={"status": status}
            )
            if response.ok:
                print(f"✅ Task {task_id} 状态更新为: {status}")
            else:
                print(f"❌ Task {task_id} 状态更新失败: {response.text}")


def main():
    """主函数"""
    print("="*50)
    print("🚀 Claude Manager 示例数据创建脚本")
    print(f"⏰ 执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*50)
    
    # 检查后端是否运行
    try:
        health = requests.get(f"{BASE_URL}/system/health", timeout=5)
        if not health.ok:
            print("❌ 后端服务未正常运行，请先启动后端")
            return
        print("✅ 后端服务运行正常")
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务，请确保后端运行在 http://127.0.0.1:8000")
        return
    
    # 按顺序创建数据
    agents = create_agents()
    teams = create_agent_teams(agents)
    workflows = create_workflows()
    tasks = create_tasks(workflows, teams)
    update_task_statuses(tasks)
    
    # 打印汇总
    print("\n" + "="*50)
    print("📊 创建汇总")
    print("="*50)
    print(f"✅ Agents: {len(agents)} 个")
    print(f"✅ AgentTeams: {len(teams)} 个")
    print(f"✅ Workflows: {len(workflows)} 个")
    print(f"✅ Tasks: {len(tasks)} 个")
    print("\n🎉 示例数据创建完成！请刷新前端页面查看。")


if __name__ == "__main__":
    main()
