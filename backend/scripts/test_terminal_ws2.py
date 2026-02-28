#!/usr/bin/env python3
"""
使用 websocket-client 测试 Terminal WebSocket 连接
"""
import json
import time
import sys
from websocket import create_connection


def test_terminal_connection(agent_id: int):
    """测试 Terminal WebSocket 连接"""
    uri = f"ws://localhost:8000/api/agents/{agent_id}/terminal"

    print(f"连接到: {uri}")

    try:
        ws = create_connection(uri)
        print("✓ WebSocket 连接成功")

        # 等待就绪消息
        print("等待就绪消息...")
        for i in range(10):
            try:
                message = ws.recv()
                data = json.loads(message)
                print(f"收到消息: {data}")

                if data.get('type') == 'ready':
                    print("✓ 收到就绪消息")
                    break
                elif data.get('type') == 'error':
                    print(f"✗ 错误: {data.get('message')}")
                    return
                elif data.get('type') == 'output':
                    print(f"输出: {data.get('data', '')[:100]}")
            except Exception as e:
                print(f"接收消息错误: {e}")
                time.sleep(0.5)

        # 等待一些输出
        print("\n等待终端输出...")
        for i in range(5):
            try:
                ws.settimeout(2.0)
                message = ws.recv()
                data = json.loads(message)

                if data.get('type') == 'output':
                    print(f"输出: {data.get('data', '')}")
                elif data.get('type') == 'exit':
                    print(f"✓ 进程退出，退出码: {data.get('code')}")
                    break
                elif data.get('type') == 'error':
                    print(f"✗ 错误: {data.get('message')}")
                    break
            except Exception as e:
                print(f"[{i+1}/5] 等待超时或错误: {e}")
                continue

        # 发送测试输入
        print("\n发送测试输入: 'echo hello'")
        ws.send(json.dumps({
            'type': 'input',
            'data': 'echo hello\n'
        }))

        # 等待响应
        for i in range(5):
            try:
                ws.settimeout(2.0)
                message = ws.recv()
                data = json.loads(message)

                if data.get('type') == 'output':
                    print(f"响应: {data.get('data', '')}")
                elif data.get('type') == 'exit':
                    print(f"进程退出")
                    break
            except Exception as e:
                print(f"[{i+1}/5] 等待响应超时: {e}")
                continue

        print("\n✓ 测试完成")

        # 关闭连接
        ws.send(json.dumps({'type': 'close'}))
        ws.close()

    except Exception as e:
        print(f"✗ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python test_terminal_ws2.py <agent_id>")
        sys.exit(1)

    agent_id = int(sys.argv[1])
    test_terminal_connection(agent_id)
