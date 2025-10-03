#!/bin/bash

# SmartEdify Governance Service Startup Script
# This script handles the startup process for the governance service

set -e

echo "🏛️  Starting SmartEdify Governance Service v3.2.2"
echo "=================================================="

# Check if required environment variables are set
check_env_vars() {
    local required_vars=(
        "DATABASE_HOST"
        "DATABASE_PORT" 
        "DATABASE_USERNAME"
        "DATABASE_PASSWORD"
        "DATABASE_NAME"
        "JWT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ Error: Required environment variable $var is not set"
            exit 1
        fi
    done
    
    echo "✅ Environment variables validated"
}

# Wait for database to be ready
wait_for_db() {
    echo "⏳ Waiting for database connection..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USERNAME" > /dev/null 2>&1; then
            echo "✅ Database is ready"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - Database not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ Database connection timeout after $max_attempts attempts"
    exit 1
}

# Run database migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    
    if npm run migration:run; then
        echo "✅ Migrations completed successfully"
    else
        echo "❌ Migration failed"
        exit 1
    fi
}

# Start the application
start_app() {
    echo "🚀 Starting application..."
    
    if [ "$NODE_ENV" = "production" ]; then
        echo "   Running in PRODUCTION mode"
        exec npm run start:prod
    elif [ "$NODE_ENV" = "development" ]; then
        echo "   Running in DEVELOPMENT mode"
        exec npm run start:dev
    else
        echo "   Running in DEFAULT mode"
        exec npm start
    fi
}

# Health check function
health_check() {
    local max_attempts=10
    local attempt=1
    
    echo "🔍 Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Service is healthy"
            return 0
        fi
        
        echo "   Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 3
        ((attempt++))
    done
    
    echo "❌ Health check failed after $max_attempts attempts"
    return 1
}

# Main execution
main() {
    echo "📋 Pre-flight checks..."
    check_env_vars
    
    # Only wait for DB and run migrations if not in development mode
    if [ "$NODE_ENV" != "development" ] || [ "$SKIP_MIGRATIONS" != "true" ]; then
        wait_for_db
        run_migrations
    fi
    
    echo "🎯 Starting governance service..."
    start_app
}

# Handle signals for graceful shutdown
trap 'echo "🛑 Received shutdown signal, stopping service..."; exit 0' SIGTERM SIGINT

# Execute main function
main "$@"