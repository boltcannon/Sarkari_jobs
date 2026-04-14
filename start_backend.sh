#!/usr/bin/env bash
# Start the FastAPI backend
# Run from the project root: bash start_backend.sh

set -e
cd "$(dirname "$0")"

echo "=== Sarkari Jobs Backend ==="

# Setup DB (creates DB + tables) — safe to re-run
python setup_db.py

# Start server
echo ""
echo "Starting FastAPI on http://localhost:8000 ..."
echo "Docs: http://localhost:8000/docs"
echo ""
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
