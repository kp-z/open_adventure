#!/usr/bin/env python3
"""
测试终端是否创建新进程
"""
import subprocess
import time

def get_shell_processes():
    """获取所有 shell 进程"""
    result = subprocess.run(
        ['ps', 'aux'],
        capture_output=True,
        text=True
    )
    lines = result.stdout.split('\n')
    shells = [line for line in lines if '/bin/zsh' in line or '/bin/bash' in line]
    return len(shells), shells

print("=" * 60)
print("测试终端进程创建")
print("=" * 60)

print("\n初始 shell 进程数:")
initial_count, initial_shells = get_shell_processes()
print(f"共 {initial_count} 个 shell 进程")

print("\n请在前端创建一个新终端...")
print("等待 5 秒...")
time.sleep(5)

print("\n创建终端后的 shell 进程数:")
after_count, after_shells = get_shell_processes()
print(f"共 {after_count} 个 shell 进程")

if after_count > initial_count:
    print(f"\n✓ 成功创建了 {after_count - initial_count} 个新的 shell 进程")
    print("\n新增的进程:")
    new_shells = set(after_shells) - set(initial_shells)
    for shell in new_shells:
        print(f"  {shell}")
else:
    print(f"\n✗ 没有创建新的 shell 进程")
    print("可能的原因:")
    print("1. 终端没有成功连接到后端")
    print("2. PTY fork 失败")
    print("3. 进程立即退出")

print("\n" + "=" * 60)
