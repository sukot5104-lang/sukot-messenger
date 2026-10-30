#!/bin/bash
# SUKOT MESSENGER — custom boot script (found by /start.sh at container boot).
# Since this runs as a boot-descended process tree, anything spawned here
# survives the sandbox's session reaper. Supervise BOTH services forever.
cd /home/z/my-project
echo "[dev.sh] running full-recovery..."
bash scripts/full-recovery.sh || true

# chat-service supervisor
(
  while true; do
    if ! curl -s -m 3 http://localhost:3004/internal/health 2>/dev/null | grep -q '"ok":true'; then
      ( cd mini-services/chat-service && exec bun run index.ts ) >> /home/z/my-project/chat.log 2>&1
      echo "[dev.sh] chat exited, respawn in 3s" >> /home/z/my-project/chat.log
      sleep 3
    fi
    sleep 5
  done
) &

# web supervisor
(
  while true; do
    if ! curl -s -o /dev/null -m 3 http://localhost:3000; then
      bunx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
      echo "[dev.sh] web exited, respawn in 3s" >> /home/z/my-project/dev.log
      sleep 3
    fi
    sleep 5
  done
) &

echo "[dev.sh] supervisors started — staying alive"
wait
