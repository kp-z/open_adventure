#!/usr/bin/env python3
"""
测试 Terminal 创建逻辑
"""
import asyncio
import websockets
import json

async def test_terminal_creation():
    """测试创建多个 terminal 连接"""

    # 测试1：创建第一个 terminal
    print("=== 测试1：创建第一个 terminal ===")
    uri1 = "ws://localhost:8000/api/terminal/ws"
    async with websockets.connect(uri1) as ws1:
        print(f"✓ Terminal 1 连接成功")

        # 等待初始输出
        await asyncio.sleep(1)

        # 测试2：创建第二个 terminal（不同路径）
        print("\n=== 测试2：创建第二个 terminal（不同路径）===")
        uri2 = "ws://localhost:8000/api/terminal/ws?project_path=/Users/kp"
        async with websockets.connect(uri2) as ws2:
            print(f"✓ Terminal 2 连接成功")

            # 等待初始输出
            await asyncio.sleep(1)

            # 测试3：创建第三个 terminal（相同路径）
            print("\n=== 测试3：创建第三个 terminal（相同路径）===")
            uri3 = "ws://localhost:8000/api/terminal/ws?project_path=/Users/kp"
            async with websockets.connect(uri3) as ws3:
                print(f"✓ Terminal 3 连接成功")

                # 发送命令到每个 terminal
                print("\n=== 测试4：向每个 terminal 发送不同命令 ===")

                # Terminal 1: echo "Terminal 1"
                await ws1.send(json.dumps({
                    'type': 'input',
                    'data': 'echo "Terminal 1"\n'
                }))
                print("✓ 向 Terminal 1 发送命令")

                # Terminal 2: echo "Terminal 2"
                await ws2.send(json.dumps({
                    'type': 'input',
                    'data': 'echo "Terminal 2"\n'
                }))
                print("✓ 向 Terminal 2 发送命令")

                # Terminal 3: echo "Terminal 3"
                await ws3.send(json.dumps({
                    'type': 'input',
                    'data': 'echo "Terminal 3"\n'
                }))
                print("✓ 向 Terminal 3 发送命令")

                # 等待输出
                await asyncio.sleep(2)

                print("\n=== 测试完成 ===")
                print("请检查后端日志，确认是否创建了3个不同的 PTY 进程")

if __name__ == "__main__":
    asyncio.run(test_terminal_creation())
