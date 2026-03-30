#!/usr/bin/env bash
# inator database backup script
# Creates a timestamped snapshot of all inator SQLite databases.
# Safe to run while services are running — uses sqlite3 .backup for consistency.
#
# Modes:
#   rotating (default): writes to backups/system-backup-<timestamp> and prunes to keep max 28
#   baseline: writes to backups/baseline/system-backup-<timestamp> and never prunes
#
# Usage:
#   ./scripts/backup.sh                # rotating backup (for cron)
#   ./scripts/backup.sh baseline       # baseline backup (manual)
#   task backup:baseline               # baseline backup (manual)
#
# Automatic scheduling (recommended):
#   crontab -e
#   Add: 0 0,12 * * * /path/to/inator/scripts/backup.sh >> /path/to/inator/logs/backup.log 2>&1

set -euo pipefail

MODE="${1:-rotating}"
case "$MODE" in
  rotating|baseline) ;;
  *)
    echo "Usage: ./scripts/backup.sh [rotating|baseline]"
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INATOR_DIR="$(dirname "$SCRIPT_DIR")"

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
BACKUP_NAME="system-backup-$TIMESTAMP"

if [[ "$MODE" == "baseline" ]]; then
  BACKUP_ROOT="$INATOR_DIR/backups/baseline"
  PRUNE_ROTATING=false
else
  BACKUP_ROOT="$INATOR_DIR/backups"
  PRUNE_ROTATING=true
fi

BACKUP_PATH="$BACKUP_ROOT/$BACKUP_NAME"
KEEP_MAX=28

echo ""
echo "📦 inator backup ($MODE) — $TIMESTAMP"
echo "───────────────────────────────────────"

mkdir -p "$BACKUP_PATH"

SERVICES=(RMAinator Userinator Authinator Fulfilinator)

BACKED_UP=0
for service in "${SERVICES[@]}"; do
  src="$INATOR_DIR/$service/backend/db.sqlite3"
  dest="$BACKUP_PATH/${service}-db.sqlite3"

  if [[ ! -f "$src" ]]; then
    echo "  ⚠️  $service — db not found at $src, skipping"
    continue
  fi

  # Use sqlite3 .backup for a hot, consistent snapshot (handles WAL correctly)
  if command -v sqlite3 &>/dev/null; then
    sqlite3 "$src" ".backup '$dest'"
  else
    cp "$src" "$dest"
  fi

  SIZE="$(du -sh "$dest" 2>/dev/null | cut -f1)"
  echo "  ✅  $service ($SIZE)"
  ((BACKED_UP+=1))
done

# Write a manifest
{
  echo "Backup: $BACKUP_NAME"
  echo "Mode: $MODE"
  echo "Created: $(date)"
  echo "Services:"
  for service in "${SERVICES[@]}"; do
    echo "  - $service"
  done
} > "$BACKUP_PATH/manifest.txt"

TOTAL_SIZE="$(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1)"
RELATIVE_PATH="${BACKUP_PATH#"$INATOR_DIR"/}"
echo ""
echo "📁 Saved to: $RELATIVE_PATH ($TOTAL_SIZE)"

PRUNED=0
if [[ "$PRUNE_ROTATING" == "true" ]]; then
  # Prune oldest rotating backups beyond KEEP_MAX (guarantees <= KEEP_MAX backups)
  while IFS= read -r old_dir; do
    [[ -z "$old_dir" ]] && continue
    rm -rf "$old_dir"
    echo "🗑  Pruned: $(basename "$old_dir")"
    ((PRUNED+=1)) || true
  done < <(ls -1dt "$BACKUP_ROOT"/system-backup-* 2>/dev/null | tail -n +$((KEEP_MAX+1)) || true)
fi

TOTAL_BACKUPS="$(find "$BACKUP_ROOT" -maxdepth 1 -name "system-backup-*" -type d | wc -l | tr -d ' ')"

echo ""
if [[ "$PRUNE_ROTATING" == "true" ]]; then
  echo "✅ Done — $BACKED_UP database(s) backed up, $TOTAL_BACKUPS rotating backup(s) on disk"
  if [[ $PRUNED -gt 0 ]]; then
    echo "   (pruned $PRUNED backup(s) to keep max $KEEP_MAX)"
  fi
else
  echo "✅ Done — $BACKED_UP database(s) backed up, $TOTAL_BACKUPS baseline backup(s) on disk"
fi

echo ""
