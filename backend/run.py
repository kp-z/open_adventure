#!/usr/bin/env python3
"""Run the FastAPI application."""
import os
import uvicorn

if __name__ == "__main__":
    # 生产环境禁用 reload
    is_dev = os.getenv("ENV", "production") == "development"

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=38080,
        reload=is_dev,  # 只在开发环境启用 reload
        log_level="info",
        ws_ping_interval=10,  # 每 10s 发 WS 协议级 ping（Cloudflare Tunnel 保活）
        ws_ping_timeout=30,   # 30s 无 pong 则关闭连接
    )
