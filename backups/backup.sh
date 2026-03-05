#!/bin/bash
BACKUP_DIR="/var/BachHoaMMO/BachHoaMMO/backups"
DB_FILE="/var/BachHoaMMO/BachHoaMMO/backend/prisma/dev.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dev.db.backup_$TIMESTAMP"

cp "$DB_FILE" "$BACKUP_FILE"

# Keep last 1440 backups (= 24 hours of per-minute backups)
ls -t "$BACKUP_DIR"/dev.db.backup_* 2>/dev/null | tail -n +1441 | xargs rm -f 2>/dev/null
