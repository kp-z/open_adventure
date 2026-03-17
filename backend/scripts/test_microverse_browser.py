#!/usr/bin/env python3
"""
Microverse 缓存功能浏览器自动化测试

使用 Playwright 进行实际的浏览器测试，验证：
1. 首次进入游戏模式，游戏正常加载
2. 切换到其他页面，组件未卸载
3. 再次进入游戏模式，无加载动画，游戏立即显示
4. 验证 Network 请求，确认无重复资源加载
"""

import asyncio
import sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("错误: 未安装 playwright")
    print("请运行: pip install playwright && playwright install chromium")
    sys.exit(1)

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

async def test_microverse_cache():
    """测试 Microverse 缓存功能"""

    print("\n" + "="*60)
    print("Microverse 缓存功能浏览器自动化测试")
    print("="*60 + "\n")

    async with async_playwright() as p:
        # 启动浏览器
        print_info("启动浏览器...")
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # 记录控制台日志
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        # 记录网络请求
        network_requests = []
        page.on("request", lambda request: network_requests.append({
            "url": request.url,
            "method": request.method,
            "resource_type": request.resource_type
        }))

        try:
            # 测试 1: 访问首页
            print_info("测试 1: 访问首页...")
            await page.goto("http://localhost:5173", wait_until="networkidle")
            await asyncio.sleep(2)
            print_success("首页加载成功")

            # 测试 2: 首次进入游戏模式
            print_info("\n测试 2: 首次进入游戏模式...")
            initial_request_count = len(network_requests)

            # 点击左上角 logo 进入游戏模式
            logo_button = page.locator('button:has-text("Open")')
            if await logo_button.count() > 0:
                await logo_button.first.click()
                print_success("点击 logo 进入游戏模式")
            else:
                print_error("未找到 logo 按钮")
                return False

            # 等待游戏加载
            print_info("等待游戏加载...")
            await asyncio.sleep(3)

            # 检查是否有 Microverse 组件挂载的日志
            mount_logs = [log for log in console_logs if "组件挂载" in log and "gameHasLoaded = false" in log]
            if mount_logs:
                print_success(f"检测到组件挂载日志: {mount_logs[0]}")
            else:
                print_warning("未检测到组件挂载日志（可能已经加载过）")

            # 检查网络请求
            game_requests = [req for req in network_requests[initial_request_count:]
                           if "microverse" in req["url"] or ".wasm" in req["url"] or ".pck" in req["url"]]
            if game_requests:
                print_success(f"首次加载：检测到 {len(game_requests)} 个游戏资源请求")
            else:
                print_warning("未检测到游戏资源请求（可能已缓存）")

            # 测试 3: 切换到其他页面
            print_info("\n测试 3: 切换到其他页面...")
            await asyncio.sleep(2)

            # 点击 Dashboard 链接
            dashboard_link = page.locator('a[href="/"]').first
            await dashboard_link.click()
            await asyncio.sleep(2)
            print_success("切换到 Dashboard 页面")

            # 检查是否有组件卸载的日志
            unmount_logs = [log for log in console_logs if "组件卸载" in log]
            if unmount_logs:
                print_error(f"检测到组件卸载日志: {unmount_logs[0]}")
                print_error("缓存失败：组件被卸载了！")
                return False
            else:
                print_success("未检测到组件卸载日志（组件保持挂载）")

            # 测试 4: 再次进入游戏模式
            print_info("\n测试 4: 再次进入游戏模式...")
            second_request_count = len(network_requests)

            # 再次点击 logo
            await logo_button.first.click()
            await asyncio.sleep(2)
            print_success("再次进入游戏模式")

            # 检查是否有新的组件挂载日志
            new_mount_logs = [log for log in console_logs[len(mount_logs):] if "组件挂载" in log]
            if new_mount_logs:
                print_error(f"检测到新的组件挂载日志: {new_mount_logs[0]}")
                print_error("缓存失败：组件被重新挂载了！")
                return False
            else:
                print_success("未检测到新的组件挂载日志（组件未重新挂载）")

            # 检查是否有 "游戏已缓存" 的日志
            cached_logs = [log for log in console_logs if "游戏已缓存" in log]
            if cached_logs:
                print_success(f"检测到缓存日志: {cached_logs[0]}")
            else:
                print_warning("未检测到 '游戏已缓存' 日志")

            # 检查网络请求
            new_game_requests = [req for req in network_requests[second_request_count:]
                               if ".wasm" in req["url"] or ".pck" in req["url"]]
            if new_game_requests:
                print_error(f"检测到 {len(new_game_requests)} 个新的游戏资源请求")
                print_error("缓存失败：游戏资源被重新下载了！")
                for req in new_game_requests[:3]:
                    print(f"  - {req['url']}")
                return False
            else:
                print_success("未检测到新的游戏资源请求（使用缓存）")

            # 测试 5: 检查 isLoading 状态变化
            print_info("\n测试 5: 检查加载状态...")
            loading_logs = [log for log in console_logs if "isLoading 变化" in log]
            if loading_logs:
                print_info(f"检测到 {len(loading_logs)} 个加载状态变化日志")
                # 检查最后一次是否是 false
                last_loading_log = loading_logs[-1]
                if "false" in last_loading_log:
                    print_success("最后的加载状态为 false（无加载动画）")
                else:
                    print_warning(f"最后的加载状态: {last_loading_log}")

            # 打印所有控制台日志（用于调试）
            print_info("\n控制台日志摘要:")
            microverse_logs = [log for log in console_logs if "[Microverse]" in log]
            for log in microverse_logs[-10:]:  # 只显示最后 10 条
                print(f"  {log}")

            print("\n" + "="*60)
            print_success("所有测试通过！缓存功能正常工作。")
            print("="*60)

            # 保持浏览器打开 5 秒，让用户看到结果
            print_info("\n浏览器将在 5 秒后关闭...")
            await asyncio.sleep(5)

            return True

        except Exception as e:
            print_error(f"测试过程中发生错误: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await browser.close()

async def main():
    """主函数"""
    try:
        result = await test_microverse_cache()
        return 0 if result else 1
    except Exception as e:
        print_error(f"测试失败: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
