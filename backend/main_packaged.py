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
    # --onedir 模式: 可执行文件在目录中，资源在同一目录
    if hasattr(sys, '_MEIPASS'):
        # 单文件模式（不应该到这里，但保留兼容）
        BASE_DIR = Path(sys._MEIPASS)
    else:
        # 目录模式
        BASE_DIR = Path(sys.executable).parent

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
    user_dir = Path.home() / ".open_adventure"
    user_db = user_dir / "open_adventure.db"
    user_dir.mkdir(parents=True, exist_ok=True)

    if not user_db.exists() and DB_TEMPLATE.exists():
        import shutil
        shutil.copy(DB_TEMPLATE, user_db)
        print(f"✓ 数据库已初始化: {user_db}")

    # 更新数据库 URL
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{user_db}"

    # 加载用户配置文件
    user_env = user_dir / ".env"
    if user_env.exists():
        from dotenv import load_dotenv
        load_dotenv(user_env)
        print(f"✓ 已加载配置: {user_env}")


def check_port_available(port: int) -> bool:
    """检查端口是否可用"""
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('0.0.0.0', port))
            return True
    except OSError:
        return False


def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description="Open Adventure - AI Configuration Management System")
    parser.add_argument("--port", type=int, default=None, help="服务端口 (默认: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="监听地址 (默认: 0.0.0.0)")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    parser.add_argument("-d", "--daemon", action="store_true", help="后台运行模式")
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

    # 后台运行模式
    if args.daemon:
        import subprocess
        import signal

        # 获取当前可执行文件路径
        exe_path = sys.executable if getattr(sys, 'frozen', False) else sys.argv[0]

        # 构建后台运行命令（去掉 --daemon 参数）
        daemon_args = [exe_path]
        if args.port:
            daemon_args.extend(["--port", str(args.port)])
        if args.host != "0.0.0.0":
            daemon_args.extend(["--host", args.host])
        daemon_args.append("--no-browser")  # 后台模式强制不打开浏览器

        # 创建 PID 文件目录
        user_dir = Path.home() / ".open_adventure"
        user_dir.mkdir(parents=True, exist_ok=True)
        pid_file = user_dir / "open_adventure.pid"
        log_file = user_dir / "open_adventure.log"

        # 检查是否已有进程在运行
        if pid_file.exists():
            try:
                with open(pid_file, 'r') as f:
                    old_pid = int(f.read().strip())
                # 检查进程是否存在
                os.kill(old_pid, 0)
                print(f"⚠️  Open Adventure 已在运行 (PID: {old_pid})")
                print(f"如需重启，请先运行: kill {old_pid}")
                sys.exit(1)
            except (OSError, ValueError):
                # 进程不存在，删除旧的 PID 文件
                pid_file.unlink()

        # 启动后台进程
        print(f"🚀 启动后台服务...")
        print(f"📝 日志文件: {log_file}")

        with open(log_file, 'w') as log:
            process = subprocess.Popen(
                daemon_args,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True  # 创建新会话，脱离终端
            )

        # 保存 PID
        with open(pid_file, 'w') as f:
            f.write(str(process.pid))

        # 等待服务启动
        port = args.port or int(os.environ.get("PORT", 8000))
        print(f"⏳ 等待服务启动...")
        time.sleep(3)

        # 获取局域网 IP
        local_ip = get_local_ip()

        # 验证服务是否启动成功
        try:
            import urllib.request
            urllib.request.urlopen(f"http://localhost:{port}/api/system/health", timeout=5)
            print(f"✅ 服务已启动 (PID: {process.pid})")
            print(f"\n============================================")
            print(f"✅ Open Adventure is running in background!")
            print(f"============================================")
            print(f"\n🌐 本地访问:")
            print(f"   Frontend: http://localhost:{port}/")
            print(f"   Backend API: http://localhost:{port}/api")
            print(f"   API Docs: http://localhost:{port}/docs")
            if local_ip:
                print(f"\n🌍 局域网访问:")
                print(f"   Frontend: http://{local_ip}:{port}/")
                print(f"   Backend API: http://{local_ip}:{port}/api")
            print(f"\n📋 进程信息:")
            print(f"   PID: {process.pid}")
            print(f"\n📝 日志文件:")
            print(f"   {log_file}")
            print(f"\n🛑 停止服务: kill {process.pid}")
            print(f"📊 查看日志: tail -f {log_file}")
            print(f"============================================")
        except Exception as e:
            print(f"⚠️  服务可能未正常启动，请查看日志: {log_file}")
            print(f"错误: {e}")

        sys.exit(0)

    # 初始化数据库
    init_database()

    # 确定端口（优先级: 命令行 > 环境变量 > 默认值）
    port = args.port or int(os.environ.get("PORT", 8000))
    host = args.host

    # 检查端口是否可用
    if not check_port_available(port):
        print(f"⚠️  端口 {port} 已被占用", flush=True)
        print(f"请使用 --port 参数指定其他端口，例如: ./open-adventure --port 8001", flush=True)
        sys.exit(1)

    # 获取局域网 IP
    local_ip = get_local_ip()

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
