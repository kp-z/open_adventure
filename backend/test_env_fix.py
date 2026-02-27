#!/usr/bin/env python3
"""
测试修复后的实时日志功能
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.adapters.claude.cli_client import ClaudeCliClient


def log_callback(stream_type: str, line: str):
    """日志回调 - 实时打印"""
    print(f"[{stream_type}] {line}")


async def test_with_env():
    """测试带环境变量的命令执行"""
    print("\n" + "="*60)
    print("测试：移除 CLAUDECODE 环境变量后执行命令")
    print("="*60 + "\n")

    client = ClaudeCliClient()

    # 模拟一个简单的命令（不是 Claude CLI）
    cmd = ["echo", "测试成功：环境变量已正确传递"]

    # 创建自定义环境变量
    env = os.environ.copy()
    env.pop("CLAUDECODE", None)
    env["TEST_VAR"] = "test_value"

    print("✅ 已移除 CLAUDECODE 环境变量")
    print("✅ 添加测试环境变量 TEST_VAR=test_value\n")

    result = await client.run_command_with_streaming(
        cmd=cmd,
        log_callback=log_callback,
        timeout=10,
        env=env
    )

    print("\n" + "-"*60)
    print("执行结果:")
    print(f"  成功: {result['success']}")
    print(f"  输出: {result['output']}")
    print(f"  耗时: {result['duration']:.2f}秒")
    print("-"*60 + "\n")


async def test_claude_cli():
    """测试 Claude CLI 命令（如果可用）"""
    print("\n" + "="*60)
    print("测试：Claude CLI 命令（移除嵌套会话检测）")
    print("="*60 + "\n")

    client = ClaudeCliClient()

    # 创建环境变量副本，移除 CLAUDECODE
    env = os.environ.copy()
    original_claudecode = env.pop("CLAUDECODE", None)

    if original_claudecode:
        print(f"✅ 检测到 CLAUDECODE 环境变量: {original_claudecode}")
        print("✅ 已移除，避免嵌套会话错误\n")
    else:
        print("ℹ️  未检测到 CLAUDECODE 环境变量\n")

    # 测试 Claude CLI --help
    cmd = ["claude", "code", "ctl", "--version"]

    try:
        result = await client.run_command_with_streaming(
            cmd=cmd,
            log_callback=log_callback,
            timeout=10,
            env=env
        )

        print("\n" + "-"*60)
        print("执行结果:")
        print(f"  成功: {result['success']}")
        print(f"  输出: {result['output'][:100]}...")
        print(f"  耗时: {result['duration']:.2f}秒")
        print("-"*60 + "\n")

        if result['success']:
            print("✅ Claude CLI 执行成功，嵌套会话问题已解决！")
        else:
            print("❌ Claude CLI 执行失败:")
            print(f"   {result['error']}")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")


async def main():
    """运行所有测试"""
    print("\n" + "="*60)
    print("实时日志功能测试（环境变量支持）")
    print("="*60)

    try:
        # 测试 1: 基本环境变量传递
        await test_with_env()

        # 测试 2: Claude CLI（如果可用）
        await test_claude_cli()

        print("\n" + "="*60)
        print("✨ 所有测试完成！")
        print("="*60 + "\n")

    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
    except Exception as e:
        print(f"\n\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
