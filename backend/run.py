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
        port=8000,
        reload=is_dev,  # 只在开发环境启用 reload
        log_level="info",
    )
