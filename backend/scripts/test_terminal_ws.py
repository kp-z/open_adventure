#!/usr/bin/env python3
"""
测试 Terminal WebSocket 连接
"""
import asyncio
import json
import websockets
import sys


async def test_terminal_connection(agent_id: int):
    """测试 Terminal WebSocket 连接"""
    uri = f"ws://localhost:8000/api/agents/{agent_id}/terminal"

    print(f"连接到: {uri}")

    try:
        async with websockets.connect(uri) as websocket:
            print("✓ WebSocket 连接成功")

            # 等待就绪消息
            print("等待就绪消息...")

            # 设置超时
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"收到消息: {data}")

                if data.get('type') == 'ready':
                    print("✓ 收到就绪消息")
                elif data.get('type') == 'error':
                    print(f"✗ 错误: {data.get('message')}")
                    return

                # 等待输出
                print("\n等待终端输出...")
                for i in range(10):
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                        data = json.loads(message)

                        if data.get('type') == 'output':
                            print(f"输出: {data.get('data', '')[:100]}")
                        elif data.get('type') == 'exit':
                            print(f"✓ 进程退出，退出码: {data.get('code')}")
                            break
                        elif data.get('type') == 'error':
                            print(f"✗ 错误: {data.get('message')}")
                            break
                    except asyncio.TimeoutError:
                        print(f"[{i+1}/10] 等待超时，继续...")
                        continue

                # 发送测试输入
                print("\n发送测试输入: 'echo hello'")
                await websocket.send(json.dumps({
                    'type': 'input',
                    'data': 'echo hello\n'
                }))

                # 等待响应
                for i in range(5):
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                        data = json.loads(message)

                        if data.get('type') == 'output':
                            print(f"响应: {data.get('data', '')}")
                        elif data.get('type') == 'exit':
                            print(f"进程退出")
                            break
                    except asyncio.TimeoutError:
                        print(f"[{i+1}/5] 等待响应超时...")
                        continue

                print("\n✓ 测试完成")

            except asyncio.TimeoutError:
                print("✗ 等待消息超时")

    except websockets.exceptions.WebSocketException as e:
        print(f"✗ WebSocket 错误: {e}")
    except Exception as e:
        print(f"✗ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python test_terminal_ws.py <agent_id>")
        sys.exit(1)

    agent_id = int(sys.argv[1])
    asyncio.run(test_terminal_connection(agent_id))
