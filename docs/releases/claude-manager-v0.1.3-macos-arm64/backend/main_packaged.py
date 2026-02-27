#!/usr/bin/env python3
"""
Claude Manager - Packaged Entry Point
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
    DB_TEMPLATE = BASE_DIR / "claude_manager.db"

    # 将 app 模块路径添加到 sys.path
    APP_DIR = BASE_DIR / "app"
    if APP_DIR.exists():
        sys.path.insert(0, str(BASE_DIR))
else:
    # 开发环境
    BASE_DIR = Path(__file__).parent
    FRONTEND_DIR = BASE_DIR.parent / "frontend" / "dist"
    DB_TEMPLATE = BASE_DIR / "claude_manager.db"
    # 开发环境下也添加 backend 目录到路径
    sys.path.insert(0, str(BASE_DIR))

# 设置环境变量
os.environ["FRONTEND_DIST_DIR"] = str(FRONTEND_DIR)
os.environ["DB_TEMPLATE_PATH"] = str(DB_TEMPLATE)


def init_database():
    """初始化数据库"""
    user_dir = Path.home() / ".claude_manager"
    user_db = user_dir / "claude_manager.db"
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


def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description="Claude Manager - AI Configuration Management System")
    parser.add_argument("--port", type=int, default=None, help="服务端口 (默认: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="监听地址 (默认: 0.0.0.0)")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    return parser.parse_args()


def open_browser(port: int, delay: float = 1.5):
    """延迟打开浏览器"""
    time.sleep(delay)
    url = f"http://localhost:{port}/"
    print(f"🌐 正在打开浏览器: {url}")
    webbrowser.open(url)


if __name__ == "__main__":
    print("=" * 60, flush=True)
    print("Claude Manager - AI Configuration Management System", flush=True)
    print("=" * 60, flush=True)

    # 解析命令行参数
    args = parse_args()

    # 初始化数据库
    init_database()

    # 确定端口（优先级: 命令行 > 环境变量 > 默认值）
    port = args.port or int(os.environ.get("PORT", 8000))
    host = args.host

    # 启动 FastAPI 服务器
    print(f"\n🚀 启动服务器...", flush=True)
    print(f"📂 前端资源: {FRONTEND_DIR}", flush=True)
    print(f"💾 数据库: {os.environ['DATABASE_URL']}", flush=True)
    print(f"\n🌐 访问地址: http://localhost:{port}/", flush=True)
    print("按 Ctrl+C 停止服务\n", flush=True)

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
