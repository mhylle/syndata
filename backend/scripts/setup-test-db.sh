#!/bin/bash

# Script to set up test database
# This script creates a separate test database for running E2E tests

set -e

echo "Setting up test database..."

# Load test environment variables
source .env.test 2>/dev/null || echo "No .env.test file found, using defaults"

# Database connection details
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-11003}
DB_USER=${DATABASE_USER:-mynotes_user}
DB_PASSWORD=${DATABASE_PASSWORD:-mynotes_password}
DB_NAME=${DATABASE_NAME:-mynotes_test}

# Check if PostgreSQL is running
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw postgres; then
    echo "Error: PostgreSQL is not running or not accessible at $DB_HOST:$DB_PORT"
    echo "Please ensure PostgreSQL is running (e.g., docker compose up -d postgres)"
    exit 1
fi

# Drop test database if it exists
echo "Dropping existing test database (if exists)..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true

# Create test database
echo "Creating test database: $DB_NAME"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "Test database setup complete!"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
