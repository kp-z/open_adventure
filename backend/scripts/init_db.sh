#!/bin/bash
# Database Initialization Script

set -e

echo "🗄️  Initializing database..."

# Check if data directory exists
if [ ! -d "/app/data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p /app/data
fi

# Check if database exists
if [ ! -f "/app/data/claude_manager.db" ]; then
    echo "🆕 Database not found, creating new database..."

    # Run Alembic migrations
    cd /app
    alembic upgrade head

    echo "✅ Database initialized successfully"
else
    echo "📊 Database already exists, running migrations..."

    # Run Alembic migrations to update schema
    cd /app
    alembic upgrade head

    echo "✅ Database migrations completed"
fi

echo "✅ Database initialization complete"
