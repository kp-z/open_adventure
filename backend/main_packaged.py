#!/usr/bin/env python3
"""
Open Adventure - Packaged Entry Point
单文件可执行版本的启动脚本
"""
import sys
import os

# 禁用 Python 输出缓冲
os.environ["PYTHONUNBUFFERED"] = "1"
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', buffering=1)

import argparse
from pathlib import Path
import uvicorn
import webbrowser
import threading
import time

# 设置资源路径（PyInstaller 打包后的临时目录）
if getattr(sys, 'frozen', False):
    # 运行在 PyInstaller 打包环境
    # onefile 模式: 使用 _MEIPASS 临时目录
    BASE_DIR = Path(sys._MEIPASS)
    FRONTEND_DIR = BASE_DIR / "frontend_dist"
    DB_TEMPLATE = BASE_DIR / "open_adventure.db"

    # 将 app 模块路径添加到 sys.path
    APP_DIR = BASE_DIR / "app"
    if APP_DIR.exists():
        sys.path.insert(0, str(BASE_DIR))
else:
    # 开发环境
    BASE_DIR = Path(__file__).parent
    FRONTEND_DIR = BASE_DIR.parent / "frontend" / "dist"
    DB_TEMPLATE = BASE_DIR / "open_adventure.db"
    # 开发环境下也添加 backend 目录到路径
    sys.path.insert(0, str(BASE_DIR))

# 设置环境变量
os.environ["FRONTEND_DIST_DIR"] = str(FRONTEND_DIR)
os.environ["DB_TEMPLATE_PATH"] = str(DB_TEMPLATE)


def init_database():
    """初始化数据库"""
    global FRONTEND_DIR  # 声明全局变量
    import shutil

    user_dir = Path.home() / ".open_adventure"
    user_db = user_dir / "open_adventure.db"
    user_dir.mkdir(parents=True, exist_ok=True)

    if not user_db.exists() and DB_TEMPLATE.exists():
        shutil.copy(DB_TEMPLATE, user_db)
        print(f"✓ 数据库已初始化: {user_db}")

    # 更新数据库 URL
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{user_db}"

    # 复制前端资源到持久化目录（解决 PyInstaller onefile 模式临时目录被清理的问题）
    user_frontend = user_dir / "frontend_dist"

    # 调试信息
    print(f"调试: FRONTEND_DIR = {FRONTEND_DIR}")
    print(f"调试: FRONTEND_DIR.exists() = {FRONTEND_DIR.exists()}")
    print(f"调试: user_frontend = {user_frontend}")
    print(f"调试: user_frontend.exists() = {user_frontend.exists()}")

    if FRONTEND_DIR.exists():
        # 检查是否需要更新前端资源
        need_update = False
        if not user_frontend.exists():
            need_update = True
        elif not (user_frontend / "index.html").exists():
            need_update = True
        else:
            # 检查关键目录是否存在（用于检测不完整的安装）
            required_dirs = ["assets", "avatars", "images", "microverse"]
            for dir_name in required_dirs:
                if not (user_frontend / dir_name).exists():
                    print(f"⚠️  检测到缺失目录: {dir_name}，将重新复制前端资源")
                    need_update = True
                    break

        if need_update:
            if user_frontend.exists():
                shutil.rmtree(user_frontend)
            shutil.copytree(FRONTEND_DIR, user_frontend)
            print(f"✓ 前端资源已复制: {user_frontend}")
        else:
            print(f"✓ 前端资源已存在: {user_frontend}")
    else:
        print(f"⚠️  警告: 源前端目录不存在: {FRONTEND_DIR}")
        if not user_frontend.exists():
            print(f"⚠️  错误: 用户前端目录也不存在，前端将无法访问")

    # 更新前端资源路径为持久化目录
    FRONTEND_DIR = user_frontend
    os.environ["FRONTEND_DIST_DIR"] = str(user_frontend)

    # 初始化配置文件
    user_env = user_dir / ".env"
    if not user_env.exists():
        # 创建默认配置文件
        default_config = """# Open Adventure Configuration
# 应用配置
APP_NAME=Open Adventure
APP_VERSION=1.3.8
DEBUG=false
ENV=production

# API 配置
API_PREFIX=/api

# 安全配置（请修改为随机字符串）
SECRET_KEY=change-this-to-a-random-secret-key-in-production

# 数据库配置（自动设置）
# DATABASE_URL=sqlite+aiosqlite:///~/.open_adventure/open_adventure.db

# Claude 配置
# ANTHROPIC_API_KEY=your-api-key-here
CLAUDE_CLI_PATH=claude

# 模型提供商配置
DEFAULT_MODEL_PROVIDER=anthropic

# 日志配置
LOG_LEVEL=INFO

# CORS 配置（生产环境）
# CORS_ORIGIN_REGEX=^https?://(localhost|127\\.0\\.0\\.1)(?::\\d{1,5})?$
"""
        with open(user_env, 'w', encoding='utf-8') as f:
            f.write(default_config)
        print(f"✓ 配置文件已创建: {user_env}")
        print(f"  提示: 请编辑配置文件设置 ANTHROPIC_API_KEY")

    # 加载用户配置文件
    if user_env.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(user_env)
            print(f"✓ 已加载配置: {user_env}")
        except ImportError:
            print(f"⚠️  警告: python-dotenv 未安装，无法自动加载配置文件: {user_env}")
            print(f"   请手动设置环境变量，或安装: pip install python-dotenv")


def check_port_available(port: int) -> bool:
    """检查端口是否可用"""
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('0.0.0.0', port))
            return True
    except OSError:
        return False


def find_process_using_port(port: int):
    """查找占用端口的进程"""
    try:
        import psutil
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                for conn in proc.connections():
                    if conn.laddr.port == port:
                        return proc
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except ImportError:
        # 如果 psutil 不可用，使用系统命令
        import subprocess
        import platform

        system = platform.system()
        try:
            if system == "Darwin" or system == "Linux":
                # macOS 和 Linux 使用 lsof
                result = subprocess.run(
                    ["lsof", "-i", f":{port}", "-t"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0 and result.stdout.strip():
                    pid = int(result.stdout.strip().split()[0])
                    # 获取进程信息
                    proc_result = subprocess.run(
                        ["ps", "-p", str(pid), "-o", "comm="],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if proc_result.returncode == 0:
                        name = proc_result.stdout.strip()
                        return {"pid": pid, "name": name}
            elif system == "Windows":
                # Windows 使用 netstat
                result = subprocess.run(
                    ["netstat", "-ano"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                for line in result.stdout.split('\n'):
                    if f":{port}" in line and "LISTENING" in line:
                        parts = line.split()
                        pid = int(parts[-1])
                        # 获取进程名称
                        proc_result = subprocess.run(
                            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if proc_result.returncode == 0:
                            name = proc_result.stdout.split(',')[0].strip('"')
                            return {"pid": pid, "name": name}
        except Exception:
            pass

    return None


def kill_process(pid: int) -> bool:
    """终止进程"""
    try:
        import psutil
        proc = psutil.Process(pid)
        proc.terminate()
        proc.wait(timeout=5)
        return True
    except ImportError:
        # 如果 psutil 不可用，使用系统命令
        import subprocess
        import platform

        system = platform.system()
        try:
            if system == "Windows":
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], timeout=5)
            else:
                subprocess.run(["kill", str(pid)], timeout=5)
            return True
        except Exception:
            return False
    except Exception:
        return False


def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description="Open Adventure - AI Configuration Management System")
    parser.add_argument("--port", type=int, default=None, help="服务端口 (默认: 38080)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="监听地址 (默认: 0.0.0.0)")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    parser.add_argument("-d", "--daemon", action="store_true", default=False, help="后台运行模式（需要手动使用 nohup 或 &）")
    parser.add_argument("-f", "--foreground", action="store_true", default=True, help="前台运行模式（默认）")
    return parser.parse_args()


def get_local_ip():
    """获取本机局域网 IP 地址"""
    import socket
    try:
        # 创建一个 UDP 连接来获取本机 IP（不会真正发送数据）
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def open_browser(port: int, delay: float = 1.5):
    """延迟打开浏览器"""
    time.sleep(delay)
    url = f"http://localhost:{port}/"
    print(f"🌐 正在打开浏览器: {url}")
    webbrowser.open(url)


if __name__ == "__main__":
    print("=" * 60, flush=True)
    print("Open Adventure - AI Configuration Management System", flush=True)
    print("=" * 60, flush=True)

    # 解析命令行参数
    args = parse_args()

    # 如果指定了前台模式，则覆盖默认的后台模式
    if args.foreground:
        args.daemon = False

    # 后台运行模式提示
    if args.daemon:
        # 在 PyInstaller onefile 模式下，不能 fork 子进程
        # 因为父进程退出后临时目录会被清理
        port = args.port or 38080
        print("⚠️  后台模式说明:")
        print(f"   由于打包限制，请手动使用以下命令后台运行:")
        print(f"   nohup {sys.executable} -f --no-browser --port {port} > ~/.open_adventure/open_adventure.log 2>&1 &")
        print(f"\n   或者直接使用前台模式（推荐）:")
        print(f"   {sys.executable} -f --port {port}")
        sys.exit(0)

    # 初始化数据库
    init_database()

    # 确定端口（优先级: 命令行 > 环境变量 > 默认值）
    port = args.port or int(os.environ.get("PORT", 38080))
    host = args.host

    # 检查端口是否可用
    if not check_port_available(port):
        print(f"\n⚠️  端口 {port} 已被占用", flush=True)

        # 查找占用端口的进程
        proc_info = find_process_using_port(port)
        if proc_info:
            if isinstance(proc_info, dict):
                # 从系统命令获取的信息
                pid = proc_info.get("pid")
                name = proc_info.get("name", "未知进程")
            else:
                # 从 psutil 获取的进程对象
                try:
                    pid = proc_info.pid
                    name = proc_info.name()
                except:
                    pid = None
                    name = "未知进程"

            if pid:
                print(f"   占用进程: {name} (PID: {pid})")
                print(f"\n是否终止该进程并启动 Open Adventure？")
                print(f"   [y] 是，终止进程并启动")
                print(f"   [n] 否，退出程序")
                print(f"   [p] 使用其他端口启动")

                try:
                    choice = input("\n请选择 [y/n/p]: ").strip().lower()

                    if choice == 'y':
                        print(f"\n正在终止进程 {pid}...", flush=True)
                        if kill_process(pid):
                            print(f"✓ 进程已终止", flush=True)
                            # 等待端口释放
                            time.sleep(1)
                            if not check_port_available(port):
                                print(f"⚠️  端口仍被占用，请稍后重试", flush=True)
                                sys.exit(1)
                        else:
                            print(f"❌ 无法终止进程，请手动终止后重试", flush=True)
                            sys.exit(1)
                    elif choice == 'p':
                        # 提示用户输入新端口
                        try:
                            new_port = int(input("请输入新端口号: ").strip())
                            if 1024 <= new_port <= 65535:
                                port = new_port
                                if not check_port_available(port):
                                    print(f"⚠️  端口 {port} 也被占用，请使用 --port 参数指定其他端口", flush=True)
                                    sys.exit(1)
                            else:
                                print(f"⚠️  端口号必须在 1024-65535 之间", flush=True)
                                sys.exit(1)
                        except ValueError:
                            print(f"⚠️  无效的端口号", flush=True)
                            sys.exit(1)
                    else:
                        print(f"\n已取消启动", flush=True)
                        sys.exit(0)
                except (KeyboardInterrupt, EOFError):
                    print(f"\n\n已取消启动", flush=True)
                    sys.exit(0)
            else:
                print(f"   无法获取占用进程信息")
                print(f"\n请使用 --port 参数指定其他端口，例如: ./open-adventure --port 8001", flush=True)
                sys.exit(1)
        else:
            print(f"   无法获取占用进程信息")
            print(f"\n请使用 --port 参数指定其他端口，例如: ./open-adventure --port 8001", flush=True)
            sys.exit(1)

    # 获取局域网 IP
    local_ip = get_local_ip()

    # 生成前端运行时配置文件
    # 根据host参数决定前端配置
    if host == "0.0.0.0":
        # 绑定所有接口时，前端使用相对路径（自动适配访问地址）
        config_js_content = f"""// Auto-generated runtime configuration
window.__RUNTIME_CONFIG__ = {{
  API_BASE_URL: '/api',
  WS_BASE_URL: (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/api',
  PORT: {port}
}};
"""
    else:
        # 绑定特定地址时，使用指定地址
        ws_protocol = 'wss' if host.startswith('https') else 'ws'
        config_js_content = f"""// Auto-generated runtime configuration
window.__RUNTIME_CONFIG__ = {{
  API_BASE_URL: 'http://{host}:{port}/api',
  WS_BASE_URL: '{ws_protocol}://{host}:{port}/api',
  PORT: {port}
}};
"""
    config_js_path = FRONTEND_DIR / "config.js"
    try:
        with open(config_js_path, 'w', encoding='utf-8') as f:
            f.write(config_js_content)
        print(f"✓ 前端配置已生成: {config_js_path}", flush=True)
    except Exception as e:
        print(f"⚠️  警告: 无法生成前端配置文件: {e}", flush=True)

    # 启动 FastAPI 服务器
    print(f"\n🚀 启动服务器...", flush=True)
    print(f"📂 前端资源: {FRONTEND_DIR}", flush=True)
    print(f"💾 数据库: {os.environ['DATABASE_URL']}", flush=True)
    print(f"\n============================================", flush=True)
    print(f"✅ Open Adventure is running!", flush=True)
    print(f"============================================", flush=True)
    print(f"\n🌐 本地访问:", flush=True)
    print(f"   Frontend: http://localhost:{port}/", flush=True)
    print(f"   Backend API: http://localhost:{port}/api", flush=True)
    print(f"   API Docs: http://localhost:{port}/docs", flush=True)

    if local_ip:
        print(f"\n🌍 局域网访问:", flush=True)
        print(f"   Frontend: http://{local_ip}:{port}/", flush=True)
        print(f"   Backend API: http://{local_ip}:{port}/api", flush=True)

    print(f"\n按 Ctrl+C 停止服务", flush=True)
    print(f"============================================\n", flush=True)

    # 自动打开浏览器（除非指定 --no-browser）
    if not args.no_browser:
        browser_thread = threading.Thread(target=open_browser, args=(port,), daemon=True)
        browser_thread.start()

    try:
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            log_level="info",
        )
    except Exception as e:
        print(f"❌ 启动失败: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)
