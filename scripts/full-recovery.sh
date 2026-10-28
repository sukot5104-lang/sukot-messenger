#!/bin/bash
# ============================================================
# SUKOT MESSENGER — self-recovery script
# Runs on every dev-server boot (package.json "dev" hook) and
# can be invoked by the scheduled health-check agent.
# Restores: .env, prisma schema, official Sukot seed, chat-service.
# NOTE: real passwords live in scripts/.secrets.env (gitignored).
#       If that file is lost, the scheduled agent rewrites .env
#       with the owner-chosen values.
# ============================================================
set -u
cd /home/z/my-project
LOG=/home/z/my-project/recovery.log
log(){ echo "[$(date '+%F %T')] $*" >> "$LOG"; }

# ---- 1) .env ------------------------------------------------
# Owner-chosen credentials (also mirrored in scripts/.secrets.env when present).
OWNER_PASSWORD="mrzban679@gmail.com"
ENV_OK=1
if [ ! -f .env ]; then ENV_OK=0; fi
if [ -f .env ] && ! grep -q '^ADMIN_PASSWORD=' .env; then ENV_OK=0; fi
if [ -f .env ] && ! grep -q '^SUKOT_PASSWORD=' .env; then ENV_OK=0; fi
if [ "$ENV_OK" = "0" ]; then
  if [ -f scripts/.secrets.env ]; then
    {
      echo "DATABASE_URL=file:/home/z/my-project/db/custom.db"
      grep -E '^(ADMIN_PASSWORD|SUKOT_PASSWORD)=' scripts/.secrets.env || true
    } > .env
    log ".env (re)built from scripts/.secrets.env"
  else
    cat > .env <<ENVEOF
DATABASE_URL=file:/home/z/my-project/db/custom.db
ADMIN_PASSWORD=${OWNER_PASSWORD}
SUKOT_PASSWORD=${OWNER_PASSWORD}
ENVEOF
    log "WARNING: .env rebuilt with owner passwords (scripts/.secrets.env missing — scheduled agent must restore it with GITHUB_TOKEN)"
  fi
fi

set -a
. ./.env
set +a
export DATABASE_URL

# ---- 2) dependencies ---------------------------------------
if [ ! -d node_modules/.prisma/client ]; then
  log "prisma client missing -> bun install + prisma generate"
  bun install >>"$LOG" 2>&1
  bunx prisma generate >>"$LOG" 2>&1
fi

# ---- 3) restore DB from private backup ----------------------
# db-restore.sh itself decides: empty DB -> restore; seed-only DB -> safe
# overwrite with backup; real user data -> never touched.
bash scripts/db-restore.sh >>"$LOG" 2>&1 || log "restore attempt failed (continuing)"

# ---- 4) schema (idempotent) ---------------------------------
mkdir -p db public/uploads
if bunx prisma db push --skip-generate >>"$LOG" 2>&1; then
  log "schema ok"
else
  log "ERROR: prisma db push failed"
fi

# ---- 5) seed if DB is empty ---------------------------------
N=$(bun run scripts/count-users.ts 2>>"$LOG" | tail -n 1 | tr -dc '0-9')
if [ "${N:-0}" -le 0 ] 2>/dev/null; then
  log "DB empty -> seeding official data"
  SUKOT_PASSWORD="${SUKOT_PASSWORD:-mrzban679@gmail.com}" bun run scripts/seed.ts >>"$LOG" 2>&1 \
    && log "seed done (Sukot account + reserved IDs + settings)" \
    || log "ERROR: seed failed"
else
  log "DB ok (${N} users) — seed skipped"
fi

# ---- 6) chat-service ----------------------------------------
OK=""
for i in 1 2 3 4 5; do
  if curl -s -m 2 http://localhost:3004/internal/health 2>/dev/null | grep -q '"ok":true'; then OK=1; break; fi
  sleep 2
done
if [ -z "$OK" ]; then
  ( cd mini-services/chat-service && nohup bun run index.ts >>"$LOG" 2>&1 & )
  sleep 3
  if curl -s -m 2 http://localhost:3004/internal/health 2>/dev/null | grep -q '"ok":true'; then
    log "chat-service was down -> started"
  else
    log "ERROR: chat-service failed to start"
  fi
else
  log "chat-service ok"
fi

# ---- 7) backup current state (best effort) ------------------
timeout 90 bash scripts/db-backup.sh >>"$LOG" 2>&1 \
  || log "backup attempt failed/timed out (non-fatal)"

# ---- 8) report ----------------------------------------------
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 3 http://localhost:3000 2>/dev/null || true)
log "recovery finished (web:${CODE:-?} users:${N:-0})"
echo "recovery complete: web=${CODE:-?} users=${N:-0}"
