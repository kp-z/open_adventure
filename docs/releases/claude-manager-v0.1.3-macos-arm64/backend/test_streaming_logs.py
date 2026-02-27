#!/usr/bin/env python3
"""
测试 Claude CLI 实时日志输出功能
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.adapters.claude.cli_client import ClaudeCliClient


def log_callback(stream_type: str, line: str):
    """日志回调函数 - 实时打印日志"""
    if stream_type == "stdout":
        print(f"[STDOUT] {line}")
    elif stream_type == "stderr":
        print(f"[STDERR] {line}")
    elif stream_type == "info":
        print(f"[INFO] {line}")
    elif stream_type == "error":
        print(f"[ERROR] {line}")
    else:
        print(f"[{stream_type.upper()}] {line}")


async def test_simple_command():
    """测试简单命令的实时输出"""
    print("\n" + "="*60)
    print("测试 1: 简单命令 (echo + sleep)")
    print("="*60 + "\n")

    client = ClaudeCliClient()

    # 使用 bash 执行一个会产生多行输出的命令
    cmd = [
        "bash", "-c",
        "echo 'Line 1'; sleep 1; echo 'Line 2'; sleep 1; echo 'Line 3'"
    ]

    result = await client.run_command_with_streaming(
        cmd=cmd,
        log_callback=log_callback,
        timeout=10
    )

    print("\n" + "-"*60)
    print("执行结果:")
    print(f"  成功: {result['success']}")
    print(f"  返回码: {result['returncode']}")
    print(f"  耗时: {result.get('duration', 0):.2f}秒")
    print(f"  输出行数: {len(result.get('logs', []))}")
    print("-"*60 + "\n")


async def test_long_running_command():
    """测试长时间运行的命令"""
    print("\n" + "="*60)
    print("测试 2: 长时间运行命令 (循环输出)")
    print("="*60 + "\n")

    client = ClaudeCliClient()

    # 模拟一个长时间运行的命令
    cmd = [
        "bash", "-c",
        "for i in {1..5}; do echo \"Processing step $i\"; sleep 0.5; done"
    ]

    result = await client.run_command_with_streaming(
        cmd=cmd,
        log_callback=log_callback,
        timeout=10
    )

    print("\n" + "-"*60)
    print("执行结果:")
    print(f"  成功: {result['success']}")
    print(f"  返回码: {result['returncode']}")
    print(f"  耗时: {result.get('duration', 0):.2f}秒")
    print(f"  输出行数: {len(result.get('logs', []))}")
    print("-"*60 + "\n")


async def test_error_command():
    """测试错误命令的输出"""
    print("\n" + "="*60)
    print("测试 3: 错误命令 (stderr 输出)")
    print("="*60 + "\n")

    client = ClaudeCliClient()

    # 执行一个会产生错误的命令
    cmd = [
        "bash", "-c",
        "echo 'Starting...'; sleep 0.5; echo 'Error occurred!' >&2; exit 1"
    ]

    result = await client.run_command_with_streaming(
        cmd=cmd,
        log_callback=log_callback,
        timeout=10
    )

    print("\n" + "-"*60)
    print("执行结果:")
    print(f"  成功: {result['success']}")
    print(f"  返回码: {result['returncode']}")
    print(f"  耗时: {result.get('duration', 0):.2f}秒")
    print(f"  错误信息: {result.get('error', 'N/A')}")
    print("-"*60 + "\n")


async def test_claude_cli_command():
    """测试真实的 Claude CLI 命令（如果可用）"""
    print("\n" + "="*60)
    print("测试 4: Claude CLI 命令 (claude code ctl --help)")
    print("="*60 + "\n")

    client = ClaudeCliClient()

    # 尝试执行 claude code ctl --help
    cmd = ["claude", "code", "ctl", "--help"]

    try:
        result = await client.run_command_with_streaming(
            cmd=cmd,
            log_callback=log_callback,
            timeout=10
        )

        print("\n" + "-"*60)
        print("执行结果:")
        print(f"  成功: {result['success']}")
        print(f"  返回码: {result['returncode']}")
        print(f"  耗时: {result.get('duration', 0):.2f}秒")
        print(f"  输出行数: {len(result.get('logs', []))}")
        print("-"*60 + "\n")

    except Exception as e:
        print(f"\n[警告] Claude CLI 不可用: {e}")
        print("这是正常的，如果 Claude CLI 未安装或不在 PATH 中\n")


async def main():
    """运行所有测试"""
    print("\n" + "="*60)
    print("Claude CLI 实时日志输出测试")
    print("="*60)

    try:
        await test_simple_command()
        await test_long_running_command()
        await test_error_command()
        await test_claude_cli_command()

        print("\n" + "="*60)
        print("所有测试完成！")
        print("="*60 + "\n")

    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
    except Exception as e:
        print(f"\n\n测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
