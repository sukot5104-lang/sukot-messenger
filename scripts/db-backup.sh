#!/bin/bash
# ============================================================
# SUKOT MESSENGER — database backup to private GitHub repo
# Pushes db/custom.db to github.com/sukot5104-lang/sukot-db-backup (PRIVATE)
# Token: env GITHUB_TOKEN or scripts/.secrets.env
# ============================================================
set -u
cd /home/z/my-project
LOG=/home/z/my-project/recovery.log
BACKUP_DIR=/home/z/my-project/backup
REPO=sukot5104-lang/sukot-db-backup
log(){ echo "[$(date '+%F %T')] [backup] $*" >> "$LOG"; }

# token
if [ -z "${GITHUB_TOKEN:-}" ] && [ -f scripts/.secrets.env ]; then
  GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' scripts/.secrets.env | cut -d= -f2-)
fi
if [ -z "${GITHUB_TOKEN:-}" ]; then
  log "ERROR: no GITHUB_TOKEN — backup aborted"
  echo "backup failed: no token"; exit 1
fi
export GITHUB_TOKEN

# serialize concurrent runs
mkdir -p "$BACKUP_DIR"
if ! mkdir "$BACKUP_DIR/.lock" 2>/dev/null; then
  log "another backup/restore is running — skipped"
  echo "backup skipped (locked)"; exit 0
fi
trap 'rmdir "$BACKUP_DIR/.lock" 2>/dev/null' EXIT

# consistent snapshot
if ! bun run scripts/db-checkpoint.ts >>"$LOG" 2>&1; then
  log "ERROR: checkpoint failed"; echo "backup failed: checkpoint"; exit 1
fi
if [ ! -s db/custom.db ]; then
  log "ERROR: db file missing/empty"; echo "backup failed: no db"; exit 1
fi

USERS=$(DATABASE_URL="file:/home/z/my-project/db/custom.db" bun run scripts/count-users.ts 2>>"$LOG" | tail -n 1 | tr -dc '0-9')
if [ "${USERS:-0}" -le 0 ] 2>/dev/null; then
  log "DB empty — nothing worth backing up, skipped"
  echo "backup skipped (empty db)"; exit 0
fi

# init or reuse local backup repo
if [ ! -d "$BACKUP_DIR/repo/.git" ]; then
  rm -rf "$BACKUP_DIR/repo"
  mkdir -p "$BACKUP_DIR/repo"
  git -C "$BACKUP_DIR/repo" init -q -b main
  git -C "$BACKUP_DIR/repo" config user.name "Sukot Backup"
  git -C "$BACKUP_DIR/repo" config user.email "sukot@users.noreply.github.com"
  git -C "$BACKUP_DIR/repo" remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git"
  log "backup repo initialized"
fi

cp db/custom.db "$BACKUP_DIR/repo/custom.db"
printf '%s\n' "{\"time\":\"$(date -u '+%FT%TZ')\",\"users\":${USERS:-0}}" > "$BACKUP_DIR/repo/meta.json"

# uploaded chat images (best effort)
if [ -d public/uploads ] && [ -n "$(ls -A public/uploads 2>/dev/null)" ]; then
  tar -czf "$BACKUP_DIR/repo/uploads.tar.gz" -C public uploads 2>>"$LOG" \
    && log "uploads archived ($(ls public/uploads | wc -l) files)" \
    || log "WARNING: uploads archive failed"
else
  rm -f "$BACKUP_DIR/repo/uploads.tar.gz"
fi

git -C "$BACKUP_DIR/repo" add -A
if git -C "$BACKUP_DIR/repo" diff --cached --quiet; then
  log "no changes since last backup"
  echo "backup: no changes"
  exit 0
fi
git -C "$BACKUP_DIR/repo" commit -qm "db backup: ${USERS:-?} users @ $(date '+%F %T')"
if git -C "$BACKUP_DIR/repo" push -q -u origin main >>"$LOG" 2>&1; then
  log "backup pushed ok (${USERS:-?} users)"
  echo "backup pushed: ${USERS:-?} users"
else
  log "ERROR: backup push failed"
  echo "backup failed: push"; exit 1
fi
