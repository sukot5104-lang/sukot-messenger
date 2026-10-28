#!/bin/bash
# ============================================================
# SUKOT MESSENGER — restore database from private GitHub backup
# ONLY writes the target DB if it is empty (never overwrites live data).
# Usage: bash scripts/db-restore.sh   (target: db/custom.db via .env)
# ============================================================
set -u
cd /home/z/my-project
LOG=/home/z/my-project/recovery.log
BACKUP_DIR=/home/z/my-project/backup
REPO=sukot5104-lang/sukot-db-backup
log(){ echo "[$(date '+%F %T')] [restore] $*" >> "$LOG"; }

if [ -z "${GITHUB_TOKEN:-}" ] && [ -f scripts/.secrets.env ]; then
  GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' scripts/.secrets.env | cut -d= -f2-)
fi
if [ -z "${GITHUB_TOKEN:-}" ]; then
  log "ERROR: no GITHUB_TOKEN — restore aborted"
  echo "restore failed: no token"; exit 1
fi

# local DB already has data? never touch it
CUR=$(DATABASE_URL="file:/home/z/my-project/db/custom.db" bun run scripts/count-users.ts 2>>"$LOG" | tail -n 1 | tr -dc '0-9')
if [ "${CUR:-0}" -gt 0 ] 2>/dev/null; then
  log "local DB has ${CUR} users — restore not needed"
  echo "restore skipped (local db not empty)"; exit 0
fi

mkdir -p "$BACKUP_DIR"
TMP="$BACKUP_DIR/restore-tmp"
rm -rf "$TMP"
if ! git clone -q --depth 1 "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$TMP" >>"$LOG" 2>&1; then
  log "ERROR: could not clone backup repo"
  echo "restore failed: clone"; exit 1
fi

if [ ! -s "$TMP/custom.db" ]; then
  log "ERROR: backup repo has no custom.db"
  echo "restore failed: no backup file"; exit 1
fi

mkdir -p db
cp "$TMP/custom.db" db/custom.db
rm -rf "$TMP"

# make sure schema matches current code (in case backup is older)
if DATABASE_URL="file:/home/z/my-project/db/custom.db" bunx prisma db push --skip-generate >>"$LOG" 2>&1; then
  N=$(DATABASE_URL="file:/home/z/my-project/db/custom.db" bun run scripts/count-users.ts 2>>"$LOG" | tail -n 1 | tr -dc '0-9')
  log "restored from backup (${N:-0} users)"
  echo "restored: ${N:-0} users"
else
  log "ERROR: schema push after restore failed"
  echo "restore failed: schema"; exit 1
fi
