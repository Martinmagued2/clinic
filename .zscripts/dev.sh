#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log_step_start() {
	local step_name="$1"
	echo "=========================================="
	echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: $step_name"
	echo "=========================================="
	export STEP_START_TIME
	STEP_START_TIME=$(date +%s)
}

log_step_end() {
	local step_name="${1:-Unknown step}"
	local end_time
	end_time=$(date +%s)
	local duration=$((end_time - STEP_START_TIME))
	echo "=========================================="
	echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed: $step_name"
	echo "[LOG] Step: $step_name | Duration: ${duration}s"
	echo "=========================================="
	echo ""
}

wait_for_service() {
	local host="$1"
	local port="$2"
	local name="$3"
	local timeout="${4:-60}"
	local elapsed=0

	echo "Waiting for $name on ${host}:${port}..."
	while ! curl -fsS "http://${host}:${port}" >/dev/null 2>&1; do
		sleep 2
		elapsed=$((elapsed + 2))
		if [ $elapsed -ge $timeout ]; then
			echo "ERROR: $name did not start within ${timeout}s"
			exit 1
		fi
	done
	echo "$name is ready (waited ${elapsed}s)"
}

cd "$PROJECT_DIR"

if ! command -v bun >/dev/null 2>&1; then
	echo "ERROR: bun is not installed or not in PATH"
	exit 1
fi

log_step_start "bun install"
echo "[BUN] Installing dependencies..."
bun install
log_step_end "bun install"

log_step_start "bun run db:push"
echo "[BUN] Setting up database..."
bun run db:push
log_step_end "bun run db:push"

log_step_start "Starting Next.js dev server"
echo "[BUN] Starting development server..."
bun run dev &
DEV_PID=$!
echo $DEV_PID > "$SCRIPT_DIR/dev.pid"
log_step_end "Starting Next.js dev server"

log_step_start "Waiting for Next.js dev server"
wait_for_service "localhost" "3000" "Next.js dev server"
log_step_end "Waiting for Next.js dev server"

log_step_start "Health check"
echo "[BUN] Performing health check..."
curl -fsS localhost:3000 >/dev/null
echo "[BUN] Health check passed"
log_step_end "Health check"

echo "Next.js dev server is running in background (PID: $DEV_PID)."
echo "Use 'kill $DEV_PID' to stop it."
disown "$DEV_PID" 2>/dev/null || true
unset DEV_PID
