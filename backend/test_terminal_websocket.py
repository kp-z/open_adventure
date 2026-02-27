#!/usr/bin/env python3
"""
测试终端自动启动 Claude 功能
"""
import asyncio
import websockets
import json


async def test_terminal_auto_start():
    """测试终端自动启动功能"""
    uri = "ws://localhost:8000/api/terminal/ws"

    print("=" * 60)
    print("测试终端自动启动 Claude")
    print("=" * 60)

    try:
        async with websockets.connect(uri) as websocket:
            print("\n✓ WebSocket 连接成功")
            print("等待终端输出...")

            # 接收前几秒的输出
            timeout = 5
            start_time = asyncio.get_event_loop().time()

            while asyncio.get_event_loop().time() - start_time < timeout:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    print(message, end='', flush=True)
                except asyncio.TimeoutError:
                    continue

            print("\n\n" + "=" * 60)
            print("测试完成")
            print("=" * 60)
            print("\n预期行为：")
            print("1. Shell 启动")
            print("2. 自动执行 'cd' 命令切换到项目目录")
            print("3. 自动执行 'claude' 命令启动 Claude Code CLI")

    except Exception as e:
        print(f"\n✗ 连接失败: {e}")
        print("\n请确保：")
        print("1. 后端服务正在运行 (http://localhost:8000)")
        print("2. 已配置至少一个启用的项目路径")


if __name__ == "__main__":
    asyncio.run(test_terminal_auto_start())
