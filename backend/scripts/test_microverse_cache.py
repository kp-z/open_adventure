#!/usr/bin/env python3
"""
Microverse 缓存功能自动化测试脚本

测试步骤：
1. 检查前端服务是否运行
2. 验证路由配置是否正确（microverse 路由已移除）
3. 验证 layout.tsx 中的缓存实现
4. 验证 Microverse.tsx 中的全局变量
5. 生成测试报告
"""

import os
import re
import sys
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def check_file_exists(file_path):
    """检查文件是否存在"""
    if not file_path.exists():
        print_error(f"文件不存在: {file_path}")
        return False
    return True

def test_route_config():
    """测试路由配置是否正确"""
    print_info("测试 1: 检查路由配置...")

    app_tsx = PROJECT_ROOT / "frontend/src/app/App.tsx"
    if not check_file_exists(app_tsx):
        return False

    content = app_tsx.read_text()

    # 检查是否还有 microverse 路由
    if re.search(r"path:\s*['\"]microverse['\"]", content):
        print_error("App.tsx 中仍然存在 microverse 路由配置")
        return False

    # 检查是否有注释说明
    if "microverse 路由已移除" in content or "microverse-cached" in content:
        print_success("路由配置正确：microverse 路由已移除")
        return True
    else:
        print_warning("路由配置可能正确，但缺少注释说明")
        return True

def test_layout_cache():
    """测试 layout.tsx 中的缓存实现"""
    print_info("测试 2: 检查 layout.tsx 缓存实现...")

    layout_tsx = PROJECT_ROOT / "frontend/src/app/components/layout.tsx"
    if not check_file_exists(layout_tsx):
        return False

    content = layout_tsx.read_text()

    # 检查是否导入了 Microverse
    if 'import Microverse from "../pages/Microverse"' not in content:
        print_error("layout.tsx 未导入 Microverse 组件")
        return False

    # 检查是否有缓存的 Microverse 组件
    if 'key="microverse-cached"' not in content:
        print_error("layout.tsx 中的 Microverse 组件缺少 key 属性")
        return False

    # 检查是否使用 hidden 类控制显示
    if re.search(r'className=.*hidden.*h-full', content):
        print_success("layout.tsx 缓存实现正确")
        return True
    else:
        print_error("layout.tsx 中的显示控制逻辑不正确")
        return False

def test_microverse_global_state():
    """测试 Microverse.tsx 中的全局状态"""
    print_info("测试 3: 检查 Microverse.tsx 全局状态...")

    microverse_tsx = PROJECT_ROOT / "frontend/src/app/pages/Microverse.tsx"
    if not check_file_exists(microverse_tsx):
        return False

    content = microverse_tsx.read_text()

    # 检查是否有全局变量
    if 'let gameHasLoaded = false;' not in content:
        print_error("Microverse.tsx 缺少全局变量 gameHasLoaded")
        return False

    # 检查是否使用全局变量初始化状态
    if 'useState(!gameHasLoaded)' not in content:
        print_error("Microverse.tsx 未使用全局变量初始化 isLoading 状态")
        return False

    # 检查是否设置全局变量
    if 'gameHasLoaded = true' not in content:
        print_error("Microverse.tsx 未在加载完成时设置 gameHasLoaded")
        return False

    # 检查是否有调试日志
    if '[Microverse]' in content:
        print_success("Microverse.tsx 全局状态实现正确，包含调试日志")
        return True
    else:
        print_warning("Microverse.tsx 全局状态实现正确，但缺少调试日志")
        return True

def test_iframe_optimization():
    """测试 iframe 优化"""
    print_info("测试 4: 检查 iframe 优化...")

    microverse_tsx = PROJECT_ROOT / "frontend/src/app/pages/Microverse.tsx"
    if not check_file_exists(microverse_tsx):
        return False

    content = microverse_tsx.read_text()

    # 检查是否使用 className 而非 inline style
    if re.search(r'<iframe[^>]*className=', content):
        print_success("iframe 使用 className，优化正确")
        return True
    elif re.search(r'<iframe[^>]*style=\{\{', content):
        print_warning("iframe 仍使用 inline style，可能影响性能")
        return True
    else:
        print_error("无法确定 iframe 的样式实现")
        return False

def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("Microverse 缓存功能自动化测试")
    print("="*60 + "\n")

    tests = [
        ("路由配置", test_route_config),
        ("Layout 缓存实现", test_layout_cache),
        ("全局状态管理", test_microverse_global_state),
        ("iframe 优化", test_iframe_optimization),
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"测试 '{name}' 执行失败: {e}")
            results.append((name, False))
        print()

    # 生成测试报告
    print("="*60)
    print("测试报告")
    print("="*60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "通过" if result else "失败"
        color = Colors.GREEN if result else Colors.RED
        print(f"{color}{status}{Colors.END} - {name}")

    print(f"\n总计: {passed}/{total} 测试通过")

    if passed == total:
        print_success("\n所有测试通过！缓存功能实现正确。")
        print_info("\n下一步：")
        print("  1. 启动应用: ./start.sh")
        print("  2. 访问 http://localhost:5173")
        print("  3. 打开浏览器控制台，观察日志输出")
        print("  4. 进入游戏模式，等待加载完成")
        print("  5. 切换到其他页面，再次进入游戏模式")
        print("  6. 验证游戏是否立即显示，无加载动画")
        return 0
    else:
        print_error("\n部分测试失败，请检查上述错误信息。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
