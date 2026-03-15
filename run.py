"""Run the FastAPI application."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "open_adventure.main:app",
        host="0.0.0.0",
        port=38080,
        reload=True,
    )
