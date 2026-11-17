#!/usr/bin/env bash
# Complemento al respaldo automático: programar con cron en un servidor persistente.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then set -a; source .env; set +a; fi
: "${DATABASE_URL:?DATABASE_URL es obligatorio}"
BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
file="$BACKUP_DIR/motopark-$(date +%F-%H%M%S).dump"
umask 077
pg_dump "$DATABASE_URL" --format=custom --file="$file"
find "$BACKUP_DIR" -name 'motopark-*.dump' -type f -mtime +30 -delete
printf 'Respaldo creado: %s\n' "$file"
