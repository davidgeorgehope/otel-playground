#!/bin/bash
cd /root/otel-playground

# Load secret
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Stop existing
./stop.sh 2>/dev/null

# Ensure tmp dirs
mkdir -p tmp/pids tmp/cache tmp/sockets log

# Start Rails
RAILS_ENV=production \
  SECRET_KEY_BASE=$SECRET_KEY_BASE \
  RAILS_SERVE_STATIC_FILES=1 \
  RAILS_LOG_TO_STDOUT=1 \
  bin/rails server -p 88 -b 127.0.0.1 -d --pid tmp/pids/server.pid 2>&1

sleep 2
if [ -f tmp/pids/server.pid ] && kill -0 $(cat tmp/pids/server.pid) 2>/dev/null; then
  echo "✓ OTel Playground started on port 88 (PID: $(cat tmp/pids/server.pid))"
else
  echo "✗ Failed to start. Checking log..."
  tail -20 log/production.log 2>/dev/null
  exit 1
fi
