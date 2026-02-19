#!/usr/bin/env python3
"""Test terminal WebSocket functionality."""

import asyncio
import json
import websockets


async def test_terminal():
    """Test terminal WebSocket connection."""
    uri = "ws://127.0.0.1:8000/api/terminal/ws"

    print("🔌 Connecting to terminal WebSocket...")

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")

            # Send a simple command
            command = {"type": "input", "data": "echo 'Hello from terminal test'\n"}
            await websocket.send(json.dumps(command))
            print(f"📤 Sent command: {command['data'].strip()}")

            # Receive response
            print("\n📥 Receiving output:")
            for _ in range(5):  # Read a few messages
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    print(response, end='')
                except asyncio.TimeoutError:
                    break

            print("\n\n✅ Terminal test completed successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    return True


if __name__ == "__main__":
    result = asyncio.run(test_terminal())
    exit(0 if result else 1)
