#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: production build"
echo "=========================================="

# Install dependencies
echo "[BUILD] Installing dependencies..."
bun install

# Generate Prisma client
echo "[BUILD] Generating Prisma client..."
bun run db:generate

# Push database schema
echo "[BUILD] Pushing database schema..."
bun run db:push

# Seed database if empty
echo "[BUILD] Checking if database needs seeding..."
PATIENT_COUNT=$(bun -e "const { PrismaClient } = require('@prisma/client'); const db = new PrismaClient(); db.patient.count().then(c => { console.log(c); return db.\$disconnect(); }).catch(() => { console.log(0); process.exit(0); })" 2>/dev/null || echo "0")
if [ "$PATIENT_COUNT" = "0" ]; then
  echo "[BUILD] Seeding database..."
  bun run db:seed
else
  echo "[BUILD] Database already has $PATIENT_COUNT patients, skipping seed."
fi

# Build the Next.js project
echo "[BUILD] Building Next.js project..."
bun run build

echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed: production build"
echo "=========================================="
