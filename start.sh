#!/bin/bash
cd /root/otel-playground

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Kill anything on port 90
fuser -k 90/tcp 2>/dev/null
sleep 1
rm -f tmp/pids/server.pid
mkdir -p tmp/pids tmp/cache tmp/sockets log

nohup env RAILS_ENV=production   SECRET_KEY_BASE=$SECRET_KEY_BASE   RAILS_SERVE_STATIC_FILES=1   bin/rails server -p 90 -b 127.0.0.1 --pid tmp/pids/server.pid >> log/production.log 2>&1 &

sleep 3

if ss -tlnp | grep -q ':90 '; then
  echo "✓ OTel Playground started on port 90"
else
  echo "✗ Failed to start"
  tail -10 log/production.log
  exit 1
fi
