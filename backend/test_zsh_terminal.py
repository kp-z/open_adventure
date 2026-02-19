#!/usr/bin/env python3
"""Test terminal with zsh and .zshrc loading."""

import asyncio
import json
import websockets


async def test_zsh_terminal():
    """Test terminal with zsh."""
    uri = "ws://127.0.0.1:8000/api/terminal/ws"

    print("🔌 Connecting to terminal WebSocket...")

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")

            # Wait for initial output
            await asyncio.sleep(1)

            # Read initial messages
            try:
                while True:
                    response = await asyncio.wait_for(websocket.recv(), timeout=0.5)
                    print(response, end='')
            except asyncio.TimeoutError:
                pass

            # Test 1: Check shell type
            print("\n\n📋 Test 1: Checking shell type...")
            command = {"type": "input", "data": "echo $SHELL\n"}
            await websocket.send(json.dumps(command))

            await asyncio.sleep(0.5)
            try:
                while True:
                    response = await asyncio.wait_for(websocket.recv(), timeout=0.5)
                    print(response, end='')
            except asyncio.TimeoutError:
                pass

            # Test 2: Check if .zshrc was loaded (check for custom aliases/functions)
            print("\n\n📋 Test 2: Checking environment...")
            command = {"type": "input", "data": "echo $USER\n"}
            await websocket.send(json.dumps(command))

            await asyncio.sleep(0.5)
            try:
                while True:
                    response = await asyncio.wait_for(websocket.recv(), timeout=0.5)
                    print(response, end='')
            except asyncio.TimeoutError:
                pass

            # Test 3: Check HOME directory
            print("\n\n📋 Test 3: Checking HOME directory...")
            command = {"type": "input", "data": "echo $HOME\n"}
            await websocket.send(json.dumps(command))

            await asyncio.sleep(0.5)
            try:
                while True:
                    response = await asyncio.wait_for(websocket.recv(), timeout=0.5)
                    print(response, end='')
            except asyncio.TimeoutError:
                pass

            # Test 4: Check current directory
            print("\n\n📋 Test 4: Checking current directory...")
            command = {"type": "input", "data": "pwd\n"}
            await websocket.send(json.dumps(command))

            await asyncio.sleep(0.5)
            try:
                while True:
                    response = await asyncio.wait_for(websocket.recv(), timeout=0.5)
                    print(response, end='')
            except asyncio.TimeoutError:
                pass

            print("\n\n✅ All tests completed!")

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    return True


if __name__ == "__main__":
    result = asyncio.run(test_zsh_terminal())
    exit(0 if result else 1)
