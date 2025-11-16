#!/bin/bash
set -e

# This script configures pg_hba.conf for trust authentication
# It runs during container initialization

echo "Configuring pg_hba.conf for trust authentication..."

cat > ${PGDATA}/pg_hba.conf << 'EOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
host    all             all             all                     trust
EOF

echo "pg_hba.conf configured successfully"
