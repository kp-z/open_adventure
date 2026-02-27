#!/usr/bin/env python3
"""
测试 Agent SSE 流式输出端点
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient
from app.main import app

def test_sse_endpoint():
    """测试 SSE 端点"""
    print("\n" + "="*60)
    print("测试 Agent SSE 流式输出端点")
    print("="*60 + "\n")

    client = TestClient(app)

    # 假设有一个 agent_id = 1
    agent_id = 1
    prompt = "你好，请介绍一下你的能力"

    print(f"📡 发送请求: /agents/{agent_id}/test-stream")
    print(f"📝 提示: {prompt}\n")

    try:
        with client.stream("POST", f"/agents/{agent_id}/test-stream?prompt={prompt}") as response:
            print(f"✅ 连接成功，状态码: {response.status_code}")
            print(f"📋 Content-Type: {response.headers.get('content-type')}\n")

            if response.status_code != 200:
                print(f"❌ 错误: {response.text}")
                return

            print("📨 接收 SSE 消息:\n")
            print("-" * 60)

            for line in response.iter_lines():
                if line:
                    # SSE 格式: data: {...}
                    if line.startswith("data: "):
                        data = line[6:]  # 去掉 "data: " 前缀
                        print(f"[SSE] {data}")

            print("-" * 60)
            print("\n✅ 测试完成")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_sse_endpoint()
