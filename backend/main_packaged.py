#!/usr/bin/env python3
"""
Claude Manager - Packaged Entry Point
单文件可执行版本的启动脚本
"""
import sys
import os
import argparse
from pathlib import Path
import uvicorn

# 设置资源路径（PyInstaller 打包后的临时目录）
if getattr(sys, 'frozen', False):
    # 运行在 PyInstaller 打包环境
    BASE_DIR = Path(sys._MEIPASS)
    FRONTEND_DIR = BASE_DIR / "frontend_dist"
    DB_TEMPLATE = BASE_DIR / "db_template.db"
else:
    # 开发环境
    BASE_DIR = Path(__file__).parent
    FRONTEND_DIR = BASE_DIR.parent / "frontend" / "dist"
    DB_TEMPLATE = BASE_DIR / "claude_manager.db"

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
    return parser.parse_args()


if __name__ == "__main__":
    print("=" * 60)
    print("Claude Manager - AI Configuration Management System")
    print("=" * 60)

    # 解析命令行参数
    args = parse_args()

    # 初始化数据库
    init_database()

    # 确定端口（优先级: 命令行 > 环境变量 > 默认值）
    port = args.port or int(os.environ.get("PORT", 8000))
    host = args.host

    # 启动 FastAPI 服务器
    print(f"\n🚀 启动服务器...")
    print(f"📂 前端资源: {FRONTEND_DIR}")
    print(f"💾 数据库: {os.environ['DATABASE_URL']}")
    print(f"\n🌐 访问地址: http://localhost:{port}")
    print("按 Ctrl+C 停止服务\n")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
    )
