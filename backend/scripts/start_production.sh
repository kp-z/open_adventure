#!/bin/bash
# Production Startup Script

set -e

echo "🚀 Starting Claude Manager (Production Mode)..."

# Check if .env file exists
if [ ! -f "/app/.env" ]; then
    echo "⚠️  .env file not found, using .env.production"
    cp /app/.env.production /app/.env
fi

# Initialize database
echo "📊 Initializing database..."
bash /app/scripts/init_db.sh

# Start Uvicorn in production mode
echo "✅ Starting FastAPI server..."
echo "📍 Server: http://0.0.0.0:${PORT:-8000}"
echo "📚 API Documentation: http://0.0.0.0:${PORT:-8000}/docs"
echo ""

exec uvicorn app.main:app \
    --host "${HOST:-0.0.0.0}" \
    --port "${PORT:-8000}" \
    --workers "${WORKERS:-4}" \
    --log-level "${LOG_LEVEL:-warning}" \
    --no-access-log
