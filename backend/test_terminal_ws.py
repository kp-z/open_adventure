#!/usr/bin/env python3
"""
测试 Terminal WebSocket 连接
"""
import asyncio
import websockets
import json

async def test_terminal():
    uri = "ws://localhost:8000/api/terminal/ws"

    print(f"连接到 {uri}...")

    try:
        async with websockets.connect(uri) as websocket:
            print("✓ WebSocket 连接成功")

            # 接收初始消息
            initial = await asyncio.wait_for(websocket.recv(), timeout=2.0)
            print(f"收到初始消息: {repr(initial)}")

            # 发送测试命令
            test_command = json.dumps({
                "type": "input",
                "data": "echo 'Hello from Terminal Test'\n"
            })

            print(f"发送命令: echo 'Hello from Terminal Test'")
            await websocket.send(test_command)

            # 接收响应（最多等待 3 秒）
            print("等待响应...")
            responses = []
            try:
                for _ in range(10):  # 最多接收 10 条消息
                    response = await asyncio.wait_for(websocket.recv(), timeout=0.5)
                    responses.append(response)
                    print(f"收到: {repr(response)}")
            except asyncio.TimeoutError:
                pass

            if responses:
                print(f"\n✓ Terminal 测试成功！收到 {len(responses)} 条响应")
                return True
            else:
                print("\n✗ 未收到响应")
                return False

    except asyncio.TimeoutError:
        print("✗ 连接超时")
        return False
    except Exception as e:
        print(f"✗ 错误: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_terminal())
    exit(0 if result else 1)
