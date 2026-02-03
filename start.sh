#!/bin/bash
cd /root/otel-playground

# Load secret
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Stop existing
./stop.sh 2>/dev/null

# Ensure tmp dirs
mkdir -p tmp/pids tmp/cache tmp/sockets log

# Start Rails (nohup instead of -d for reliable daemonization)
nohup env RAILS_ENV=production   SECRET_KEY_BASE=$SECRET_KEY_BASE   RAILS_SERVE_STATIC_FILES=1   RAILS_LOG_TO_STDOUT=0   bin/rails server -p 90 -b 127.0.0.1 --pid tmp/pids/server.pid >> log/production.log 2>&1 &

echo $! > tmp/pids/server.pid
sleep 2

if kill -0 $(cat tmp/pids/server.pid) 2>/dev/null; then
  echo "✓ OTel Playground started on port 90 (PID: $(cat tmp/pids/server.pid))"
else
  echo "✗ Failed to start. Checking log..."
  tail -20 log/production.log 2>/dev/null
  exit 1
fi
