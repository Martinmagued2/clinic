#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: production server"
echo "=========================================="

# Ensure database is ready
echo "[START] Ensuring database is ready..."
bun run db:push

# Start the production server
echo "[START] Starting Next.js production server on port 3000..."
exec env NODE_ENV=production bun .next/standalone/server.js
