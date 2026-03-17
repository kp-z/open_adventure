#!/usr/bin/env python3
"""
Godot 性能和资源监控测试
测试 WebSocket 延迟、内存占用和 CPU 使用率
"""
import asyncio
import aiohttp
import psutil
import time
import json
from typing import List, Dict
from datetime import datetime

BASE_URL = "http://localhost:38080/api"
TEST_CHARACTER = "TestAgent"

class PerformanceMetrics:
    """性能指标收集器"""
    def __init__(self):
        self.websocket_latencies: List[float] = []
        self.memory_samples: List[float] = []
        self.cpu_samples: List[float] = []
        self.message_count = 0
        self.start_time = time.time()

    def add_latency(self, latency_ms: float):
        self.websocket_latencies.append(latency_ms)

    def add_memory_sample(self, memory_mb: float):
        self.memory_samples.append(memory_mb)

    def add_cpu_sample(self, cpu_percent: float):
        self.cpu_samples.append(cpu_percent)

    def get_summary(self) -> Dict:
        return {
            "websocket": {
                "message_count": len(self.websocket_latencies),
                "avg_latency_ms": sum(self.websocket_latencies) / len(self.websocket_latencies) if self.websocket_latencies else 0,
                "min_latency_ms": min(self.websocket_latencies) if self.websocket_latencies else 0,
                "max_latency_ms": max(self.websocket_latencies) if self.websocket_latencies else 0,
                "p95_latency_ms": sorted(self.websocket_latencies)[int(len(self.websocket_latencies) * 0.95)] if self.websocket_latencies else 0,
            },
            "memory": {
                "avg_mb": sum(self.memory_samples) / len(self.memory_samples) if self.memory_samples else 0,
                "max_mb": max(self.memory_samples) if self.memory_samples else 0,
                "min_mb": min(self.memory_samples) if self.memory_samples else 0,
            },
            "cpu": {
                "avg_percent": sum(self.cpu_samples) / len(self.cpu_samples) if self.cpu_samples else 0,
                "max_percent": max(self.cpu_samples) if self.cpu_samples else 0,
            },
            "duration_seconds": time.time() - self.start_time
        }

async def test_websocket_latency(duration_seconds: int = 30) -> PerformanceMetrics:
    """
    测试 WebSocket 延迟

    Args:
        duration_seconds: 测试持续时间（秒）

    Returns:
        PerformanceMetrics: 性能指标
    """
    print(f"\n🔍 测试 WebSocket 延迟（持续 {duration_seconds} 秒）...")
    metrics = PerformanceMetrics()

    try:
        async with aiohttp.ClientSession() as session:
            ws_url = f"ws://localhost:38080/api/microverse/characters/{TEST_CHARACTER}/work-ws"
            async with session.ws_connect(ws_url) as ws:
                print("✓ WebSocket 连接已建立")

                end_time = time.time() + duration_seconds

                while time.time() < end_time:
                    start = time.time()

                    try:
                        msg = await asyncio.wait_for(ws.receive(), timeout=2.0)

                        if msg.type == aiohttp.WSMsgType.TEXT:
                            latency_ms = (time.time() - start) * 1000
                            metrics.add_latency(latency_ms)

                            # 每 10 条消息打印一次进度
                            if len(metrics.websocket_latencies) % 10 == 0:
                                print(f"  已接收 {len(metrics.websocket_latencies)} 条消息，平均延迟: {latency_ms:.2f}ms")

                    except asyncio.TimeoutError:
                        print("  ⚠️ 接收消息超时")
                        continue

                print(f"✓ 测试完成，共接收 {len(metrics.websocket_latencies)} 条消息")

    except Exception as e:
        print(f"❌ WebSocket 测试失败: {e}")

    return metrics

async def test_resource_usage(duration_seconds: int = 30) -> PerformanceMetrics:
    """
    测试资源占用（内存和 CPU）

    Args:
        duration_seconds: 测试持续时间（秒）

    Returns:
        PerformanceMetrics: 性能指标
    """
    print(f"\n🔍 测试资源占用（持续 {duration_seconds} 秒）...")
    metrics = PerformanceMetrics()

    # 查找后端进程
    backend_process = None
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info['cmdline']
            if cmdline and 'uvicorn' in ' '.join(cmdline):
                backend_process = psutil.Process(proc.info['pid'])
                print(f"✓ 找到后端进程 PID: {proc.info['pid']}")
                break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    if not backend_process:
        print("❌ 未找到后端进程")
        return metrics

    end_time = time.time() + duration_seconds
    sample_count = 0

    while time.time() < end_time:
        try:
            # 获取内存使用（MB）
            memory_info = backend_process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            metrics.add_memory_sample(memory_mb)

            # 获取 CPU 使用率
            cpu_percent = backend_process.cpu_percent(interval=0.1)
            metrics.add_cpu_sample(cpu_percent)

            sample_count += 1

            # 每 10 个样本打印一次
            if sample_count % 10 == 0:
                print(f"  样本 {sample_count}: 内存 {memory_mb:.1f}MB, CPU {cpu_percent:.1f}%")

            await asyncio.sleep(1)

        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            print(f"❌ 无法访问进程: {e}")
            break

    print(f"✓ 测试完成，共采集 {sample_count} 个样本")
    return metrics

async def test_concurrent_connections(num_connections: int = 10) -> Dict:
    """
    测试并发 WebSocket 连接

    Args:
        num_connections: 并发连接数

    Returns:
        Dict: 测试结果
    """
    print(f"\n🔍 测试并发连接（{num_connections} 个连接）...")

    results = {
        "successful": 0,
        "failed": 0,
        "connection_times": []
    }

    async def connect_websocket(index: int):
        try:
            start = time.time()
            async with aiohttp.ClientSession() as session:
                ws_url = f"ws://localhost:38080/api/microverse/characters/{TEST_CHARACTER}/work-ws"
                async with session.ws_connect(ws_url) as ws:
                    connection_time = (time.time() - start) * 1000
                    results["connection_times"].append(connection_time)
                    results["successful"] += 1

                    # 保持连接 5 秒
                    await asyncio.sleep(5)
        except Exception as e:
            results["failed"] += 1
            print(f"  ❌ 连接 {index} 失败: {e}")

    # 并发创建连接
    tasks = [connect_websocket(i) for i in range(num_connections)]
    await asyncio.gather(*tasks)

    if results["connection_times"]:
        avg_time = sum(results["connection_times"]) / len(results["connection_times"])
        print(f"✓ 成功: {results['successful']}, 失败: {results['failed']}")
        print(f"  平均连接时间: {avg_time:.2f}ms")

    return results

async def test_api_throughput(num_requests: int = 100) -> Dict:
    """
    测试 API 吞吐量

    Args:
        num_requests: 请求数量

    Returns:
        Dict: 测试结果
    """
    print(f"\n🔍 测试 API 吞吐量（{num_requests} 个请求）...")

    results = {
        "successful": 0,
        "failed": 0,
        "response_times": []
    }

    async def make_request(session: aiohttp.ClientSession):
        try:
            start = time.time()
            async with session.get(
                f"{BASE_URL}/microverse/characters/{TEST_CHARACTER}/work/status"
            ) as resp:
                response_time = (time.time() - start) * 1000

                if resp.status == 200:
                    results["successful"] += 1
                    results["response_times"].append(response_time)
                else:
                    results["failed"] += 1
        except Exception as e:
            results["failed"] += 1

    async with aiohttp.ClientSession() as session:
        start_time = time.time()

        # 并发发送请求
        tasks = [make_request(session) for _ in range(num_requests)]
        await asyncio.gather(*tasks)

        duration = time.time() - start_time

    if results["response_times"]:
        avg_time = sum(results["response_times"]) / len(results["response_times"])
        throughput = results["successful"] / duration

        print(f"✓ 成功: {results['successful']}, 失败: {results['failed']}")
        print(f"  平均响应时间: {avg_time:.2f}ms")
        print(f"  吞吐量: {throughput:.2f} 请求/秒")

        results["avg_response_time_ms"] = avg_time
        results["throughput_rps"] = throughput
        results["duration_seconds"] = duration

    return results

def print_performance_report(
    websocket_metrics: PerformanceMetrics,
    resource_metrics: PerformanceMetrics,
    concurrent_results: Dict,
    throughput_results: Dict
):
    """打印性能测试报告"""
    print("\n" + "="*60)
    print("性能测试报告")
    print("="*60)

    # WebSocket 性能
    ws_summary = websocket_metrics.get_summary()
    print("\n📊 WebSocket 性能:")
    print(f"  消息数量: {ws_summary['websocket']['message_count']}")
    print(f"  平均延迟: {ws_summary['websocket']['avg_latency_ms']:.2f}ms")
    print(f"  最小延迟: {ws_summary['websocket']['min_latency_ms']:.2f}ms")
    print(f"  最大延迟: {ws_summary['websocket']['max_latency_ms']:.2f}ms")
    print(f"  P95 延迟: {ws_summary['websocket']['p95_latency_ms']:.2f}ms")

    # 资源占用
    resource_summary = resource_metrics.get_summary()
    print("\n💾 资源占用:")
    print(f"  平均内存: {resource_summary['memory']['avg_mb']:.1f}MB")
    print(f"  最大内存: {resource_summary['memory']['max_mb']:.1f}MB")
    print(f"  平均 CPU: {resource_summary['cpu']['avg_percent']:.1f}%")
    print(f"  最大 CPU: {resource_summary['cpu']['max_percent']:.1f}%")

    # 并发连接
    print("\n🔗 并发连接:")
    print(f"  成功连接: {concurrent_results['successful']}")
    print(f"  失败连接: {concurrent_results['failed']}")
    if concurrent_results['connection_times']:
        avg_conn_time = sum(concurrent_results['connection_times']) / len(concurrent_results['connection_times'])
        print(f"  平均连接时间: {avg_conn_time:.2f}ms")

    # API 吞吐量
    print("\n⚡ API 吞吐量:")
    print(f"  成功请求: {throughput_results['successful']}")
    print(f"  失败请求: {throughput_results['failed']}")
    if 'avg_response_time_ms' in throughput_results:
        print(f"  平均响应时间: {throughput_results['avg_response_time_ms']:.2f}ms")
        print(f"  吞吐量: {throughput_results['throughput_rps']:.2f} 请求/秒")

    print("\n" + "="*60)

    # 性能评估
    print("\n📈 性能评估:")

    # WebSocket 延迟评估
    if ws_summary['websocket']['avg_latency_ms'] < 100:
        print("  ✅ WebSocket 延迟: 优秀 (< 100ms)")
    elif ws_summary['websocket']['avg_latency_ms'] < 500:
        print("  ⚠️ WebSocket 延迟: 良好 (< 500ms)")
    else:
        print("  ❌ WebSocket 延迟: 需要优化 (> 500ms)")

    # 内存占用评估
    if resource_summary['memory']['avg_mb'] < 100:
        print("  ✅ 内存占用: 优秀 (< 100MB)")
    elif resource_summary['memory']['avg_mb'] < 200:
        print("  ⚠️ 内存占用: 良好 (< 200MB)")
    else:
        print("  ❌ 内存占用: 需要优化 (> 200MB)")

    # CPU 占用评估
    if resource_summary['cpu']['avg_percent'] < 10:
        print("  ✅ CPU 占用: 优秀 (< 10%)")
    elif resource_summary['cpu']['avg_percent'] < 30:
        print("  ⚠️ CPU 占用: 良好 (< 30%)")
    else:
        print("  ❌ CPU 占用: 需要优化 (> 30%)")

    print("\n" + "="*60)

async def main():
    """主测试流程"""
    print("\n" + "="*60)
    print("Godot 性能和资源监控测试")
    print("="*60)

    # 1. WebSocket 延迟测试
    websocket_metrics = await test_websocket_latency(duration_seconds=30)

    # 2. 资源占用测试
    resource_metrics = await test_resource_usage(duration_seconds=30)

    # 3. 并发连接测试
    concurrent_results = await test_concurrent_connections(num_connections=10)

    # 4. API 吞吐量测试
    throughput_results = await test_api_throughput(num_requests=100)

    # 打印报告
    print_performance_report(
        websocket_metrics,
        resource_metrics,
        concurrent_results,
        throughput_results
    )

if __name__ == "__main__":
    asyncio.run(main())
