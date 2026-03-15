"""
测试 Agent Runtime Service
"""
import asyncio
from app.core.database import SessionLocal
from app.services.agent_runtime_service import AgentRuntimeService
from app.models.agent import Agent

async def test_agent_runtime():
    """测试 Agent Runtime"""
    db = SessionLocal()
    
    try:
        # 获取第一个 Agent
        agent = db.query(Agent).first()
        if not agent:
            print("❌ 没有找到 Agent")
            return
        
        print(f"✅ 找到 Agent: {agent.name} (ID: {agent.id})")
        
        # 创建 Runtime Service
        runtime_service = AgentRuntimeService(db)
        
        # 启动 Agent
        print("\n🚀 启动 Agent 后台运行...")
        task_description = "请帮我分析一下当前项目的结构"
        
        execution = await runtime_service.start_agent(
            agent=agent,
            task_description=task_description,
            project_path="/Users/kp/项目/Proj/claude_manager",
            background=True
        )
        
        print(f"✅ Agent 启动成功!")
        print(f"   - Execution ID: {execution.id}")
        print(f"   - Session ID: {execution.session_id}")
        print(f"   - PID: {execution.process_pid}")
        print(f"   - Work Dir: {execution.work_dir}")
        print(f"   - Log File: {execution.log_file}")
        
        # 等待 5 秒
        print("\n⏳ 等待 5 秒...")
        await asyncio.sleep(5)
        
        # 获取状态
        print("\n📊 获取 Agent 状态...")
        status = await runtime_service.get_agent_status(execution.id)
        print(f"   - Status: {status['status']}")
        print(f"   - PID: {status['pid']}")
        print(f"   - Output Lines: {status['output_lines']}")
        print(f"   - CPU: {status['cpu_percent']:.2f}%")
        print(f"   - Memory: {status['memory_mb']:.2f} MB")
        
        # 获取日志
        print("\n📝 获取 Agent 日志...")
        logs = await runtime_service.get_agent_logs(execution.id, offset=0, limit=10)
        print(f"   - Total Lines: {logs['total']}")
        print(f"   - Has More: {logs['has_more']}")
        if logs['logs']:
            print("\n   最新日志:")
            for line in logs['logs'][:5]:
                print(f"   {line}")
        
        # 停止 Agent
        print("\n🛑 停止 Agent...")
        success = await runtime_service.stop_agent(execution.id)
        print(f"   - Success: {success}")
        
        print("\n✅ 测试完成!")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_agent_runtime())
