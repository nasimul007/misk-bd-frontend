#!/usr/bin/env bash
# Private local Postgres for development (no Docker or sudo needed). Data lives outside the repo.
# Usage: scripts/db-dev.sh [start|stop|status|psql]
set -euo pipefail

BIN="${PG_BIN:-/usr/lib/postgresql/17/bin}"
DIR="${MISK_PG_DIR:-$HOME/.local/share/misk-bd-pg}"
PORT="${MISK_PG_PORT:-5433}"
DB="misk_bd"

init() {
  [ -f "$DIR/PG_VERSION" ] && return
  mkdir -p "$DIR"
  "$BIN/initdb" -D "$DIR" -U misk --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
}

case "${1:-start}" in
  start)
    init
    "$BIN/pg_ctl" -D "$DIR" status >/dev/null 2>&1 || "$BIN/pg_ctl" -D "$DIR" -l "$DIR/server.log" -o "-p $PORT -k $DIR -c listen_addresses=localhost" -w start >/dev/null
    "$BIN/psql" -h localhost -p "$PORT" -U misk -d postgres -Atc "select 1 from pg_database where datname='$DB'" | grep -q 1 \
      || "$BIN/createdb" -h localhost -p "$PORT" -U misk "$DB"
    echo "postgresql://misk@localhost:$PORT/$DB"
    ;;
  stop) "$BIN/pg_ctl" -D "$DIR" stop ;;
  status) "$BIN/pg_ctl" -D "$DIR" status ;;
  psql) exec "$BIN/psql" -h localhost -p "$PORT" -U misk "$DB" ;;
  *) echo "usage: $0 [start|stop|status|psql]" >&2; exit 1 ;;
esac
