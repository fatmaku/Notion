#!/bin/sh
# Consistent backup of the database (VACUUM INTO) plus uploaded files, keeps 30 days.
# Cron: 15 2 * * * /opt/ladeklar/deploy/backup.sh /srv/backups
set -eu
DEST=${1:-./backups}; STAMP=$(date +%F-%H%M); mkdir -p "$DEST"
docker compose -f "$(dirname "$0")/docker-compose.yml" exec -T app node --disable-warning=ExperimentalWarning -e "new (require('node:sqlite').DatabaseSync)('/data/ladeklar.db').exec(\"VACUUM INTO '/data/backup.db'\")"
docker compose -f "$(dirname "$0")/docker-compose.yml" exec -T app tar -C /data -czf - backup.db files > "$DEST/ladeklar-$STAMP.tar.gz"
docker compose -f "$(dirname "$0")/docker-compose.yml" exec -T app rm -f /data/backup.db
find "$DEST" -name 'ladeklar-*.tar.gz' -mtime +30 -delete
echo "Backup: $DEST/ladeklar-$STAMP.tar.gz"
