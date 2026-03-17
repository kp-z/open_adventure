#!/usr/bin/env python3
"""
修复 AIAgent.gd 中的 HTTPRequest 回调问题
在每个 lambda 回调的开始添加立即释放 HTTPRequest 的代码
"""

import re

file_path = "/Users/kp/项目/Proj/claude_manager/microverse/script/ai/AIAgent.gd"

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找所有的 http_request.request_completed.connect(func(...): 模式
# 并在 lambda 函数体的开始添加释放代码

# 模式：匹配 lambda 函数的开始
pattern = r'(http_request\.request_completed\.connect\(func\([^)]+\):\s*\n)'

# 替换函数
def add_cleanup(match):
    lambda_start = match.group(1)
    # 添加清理代码（保持缩进）
    cleanup_code = '\t\t# 立即释放 HTTPRequest，避免在对象被释放后仍然检查连接\n\t\tif http_request and is_instance_valid(http_request):\n\t\t\thttp_request.queue_free()\n'
    return lambda_start + cleanup_code

# 执行替换
new_content = re.sub(pattern, add_cleanup, content)

# 写回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"✅ 已修复 AIAgent.gd 中的 HTTPRequest 回调")
print(f"📝 修改了 {len(re.findall(pattern, content))} 处")
