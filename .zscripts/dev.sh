#!/bin/bash
# SUKOT MESSENGER — custom boot script (found by /start.sh at container boot).
# Runs full recovery once, then keeps the web server alive with a respawn loop.
cd /home/z/my-project
echo "[dev.sh] running full-recovery..."
bash scripts/full-recovery.sh || true
echo "[dev.sh] starting web with respawn loop..."
while true; do
  bunx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[dev.sh] web exited, respawning in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
