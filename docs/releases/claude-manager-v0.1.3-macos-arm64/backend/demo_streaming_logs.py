#!/usr/bin/env python3
"""
实时日志功能演示 - 模拟真实使用场景
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from app.adapters.claude.cli_client import ClaudeCliClient


class ColoredLogger:
    """带颜色的日志输出"""

    COLORS = {
        "stdout": "\033[32m",   # 绿色
        "stderr": "\033[31m",   # 红色
        "info": "\033[36m",     # 青色
        "error": "\033[91m",    # 亮红色
        "reset": "\033[0m"      # 重置
    }

    @classmethod
    def log(cls, stream_type: str, line: str):
        """彩色日志输出"""
        color = cls.COLORS.get(stream_type, cls.COLORS["reset"])
        reset = cls.COLORS["reset"]
        print(f"{color}{line}{reset}", flush=True)


async def demo_skill_execution():
    """演示：执行技能并实时显示日志"""
    print("\n" + "="*70)
    print("场景演示：执行 Claude Skill 并实时监控")
    print("="*70 + "\n")

    client = ClaudeCliClient()

    # 模拟一个技能执行过程
    cmd = [
        "bash", "-c",
        """
        echo "🚀 初始化技能环境..."
        sleep 0.5
        echo "📦 加载依赖..."
        sleep 0.5
        echo "🔍 分析输入数据..."
        sleep 0.5
        echo "⚙️  执行核心逻辑..."
        sleep 1
        echo "✅ 技能执行完成"
        echo "📊 生成执行报告..."
        sleep 0.3
        """
    ]

    print("💡 提示：观察日志是如何实时输出的，而不是等待命令完成\n")

    result = await client.run_command_with_streaming(
        cmd=cmd,
        log_callback=ColoredLogger.log,
        timeout=30
    )

    print("\n" + "-"*70)
    print("📈 执行统计:")
    print(f"  ✓ 状态: {'成功' if result['success'] else '失败'}")
    print(f"  ⏱️  耗时: {result['duration']:.2f} 秒")
    print(f"  📝 日志行数: {len(result['logs'])}")
    print("-"*70 + "\n")


async def demo_parallel_execution():
    """演示：并行执行多个命令"""
    print("\n" + "="*70)
    print("场景演示：并行执行多个任务并实时监控")
    print("="*70 + "\n")

    client = ClaudeCliClient()

    # 任务 1: 数据处理
    task1_cmd = [
        "bash", "-c",
        """
        echo "[任务1] 开始数据处理..."
        sleep 0.3
        echo "[任务1] 处理第 1 批数据"
        sleep 0.3
        echo "[任务1] 处理第 2 批数据"
        sleep 0.3
        echo "[任务1] 数据处理完成"
        """
    ]

    # 任务 2: 模型训练
    task2_cmd = [
        "bash", "-c",
        """
        echo "[任务2] 开始模型训练..."
        sleep 0.4
        echo "[任务2] Epoch 1/3"
        sleep 0.4
        echo "[任务2] Epoch 2/3"
        sleep 0.4
        echo "[任务2] Epoch 3/3"
        sleep 0.4
        echo "[任务2] 模型训练完成"
        """
    ]

    print("💡 提示：两个任务并行执行，日志交错实时输出\n")

    # 并行执行
    results = await asyncio.gather(
        client.run_command_with_streaming(task1_cmd, ColoredLogger.log, 30),
        client.run_command_with_streaming(task2_cmd, ColoredLogger.log, 30)
    )

    print("\n" + "-"*70)
    print("📈 执行统计:")
    for i, result in enumerate(results, 1):
        print(f"  任务 {i}: {'✅ 成功' if result['success'] else '❌ 失败'} | "
              f"耗时 {result['duration']:.2f}秒 | "
              f"{len(result['logs'])} 行日志")
    print("-"*70 + "\n")


async def demo_error_handling():
    """演示：错误处理和日志捕获"""
    print("\n" + "="*70)
    print("场景演示：错误处理和异常日志捕获")
    print("="*70 + "\n")

    client = ClaudeCliClient()

    cmd = [
        "bash", "-c",
        """
        echo "🔧 开始执行任务..."
        sleep 0.3
        echo "⚠️  检测到潜在问题" >&2
        sleep 0.3
        echo "🔄 尝试恢复..."
        sleep 0.3
        echo "❌ 恢复失败" >&2
        exit 1
        """
    ]

    print("💡 提示：观察 stdout 和 stderr 如何被区分显示\n")

    result = await client.run_command_with_streaming(
        cmd=cmd,
        log_callback=ColoredLogger.log,
        timeout=30
    )

    print("\n" + "-"*70)
    print("📈 执行统计:")
    print(f"  ✗ 状态: 失败")
    print(f"  ⏱️  耗时: {result['duration']:.2f} 秒")
    print(f"  ❌ 错误: {result['error']}")
    print(f"  📝 日志行数: {len(result['logs'])}")
    print("-"*70 + "\n")


async def demo_real_claude_command():
    """演示：真实的 Claude CLI 命令"""
    print("\n" + "="*70)
    print("场景演示：执行真实的 Claude CLI 命令")
    print("="*70 + "\n")

    client = ClaudeCliClient()

    # 尝试列出所有技能
    cmd = ["claude", "code", "ctl", "skill", "list"]

    print("💡 提示：执行 'claude code ctl skill list' 命令\n")

    try:
        result = await client.run_command_with_streaming(
            cmd=cmd,
            log_callback=ColoredLogger.log,
            timeout=10
        )

        print("\n" + "-"*70)
        print("📈 执行统计:")
        print(f"  {'✅ 成功' if result['success'] else '❌ 失败'}")
        print(f"  ⏱️  耗时: {result['duration']:.2f} 秒")
        print(f"  📝 输出行数: {len(result['logs'])}")
        print("-"*70 + "\n")

    except Exception as e:
        print(f"\n⚠️  命令执行失败: {e}\n")


async def main():
    """运行所有演示"""
    print("\n" + "="*70)
    print("🎯 Claude CLI 实时日志功能演示")
    print("="*70)

    try:
        # 演示 1: 技能执行
        await demo_skill_execution()
        await asyncio.sleep(1)

        # 演示 2: 并行执行
        await demo_parallel_execution()
        await asyncio.sleep(1)

        # 演示 3: 错误处理
        await demo_error_handling()
        await asyncio.sleep(1)

        # 演示 4: 真实命令
        await demo_real_claude_command()

        print("\n" + "="*70)
        print("✨ 所有演示完成！")
        print("="*70 + "\n")

        print("📚 关键特性总结:")
        print("  1. ✅ 真正的实时输出（逐行推送）")
        print("  2. ✅ 区分 stdout 和 stderr")
        print("  3. ✅ 准确的时间戳和耗时统计")
        print("  4. ✅ 支持并行执行")
        print("  5. ✅ 完整的错误处理")
        print("  6. ✅ 超时保护机制")
        print()

    except KeyboardInterrupt:
        print("\n\n⚠️  演示被用户中断")
    except Exception as e:
        print(f"\n\n❌ 演示失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
