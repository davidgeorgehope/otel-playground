#!/bin/bash
cd /root/otel-playground

if [ -f tmp/pids/server.pid ]; then
  PID=$(cat tmp/pids/server.pid)
  if kill -0 $PID 2>/dev/null; then
    kill $PID
    sleep 1
    if kill -0 $PID 2>/dev/null; then
      kill -9 $PID
    fi
    echo "✓ OTel Playground stopped (PID: $PID)"
  else
    echo "Process $PID not running"
  fi
  rm -f tmp/pids/server.pid
else
  echo "No PID file found"
fi
