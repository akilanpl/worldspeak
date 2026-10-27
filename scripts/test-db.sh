#!/usr/bin/env bash
# WorldSpeak Phase 2 · local migration + RLS test harness.
# Ephemeral PostgreSQL (Homebrew binaries) unless PGHOST is set, in which
# case the given server is used (CI service) and never started/stopped here.
# Applies supabase/tests/setup-shim.sql, migrations in order, then the
# isolation suite with ON_ERROR_STOP. No cloud, no secrets, no model calls.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="${PGDATABASE:-worldspeak_phase2}"
DB_PORT="${PGPORT:-54399}"
export PGDATABASE="$DB_NAME" PGPORT="$DB_PORT"

started=""
DATA_DIR=""

cleanup() {
  if [ -n "$started" ]; then
    pg_ctl -D "$DATA_DIR" -m fast stop >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ -z "${PGHOST:-}" ]; then
  DATA_DIR="${TMPDIR:-/tmp}/worldspeak-pg-$DB_PORT"
  if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
    rm -rf "$DATA_DIR" /tmp/.s.PGSQL."$DB_PORT"* 2>/dev/null || true
    if ! initdb -D "$DATA_DIR" -U postgres --auth=trust >/dev/null 2>&1; then
      # Sandboxed users without passwd lookup cannot initdb; clone the
      # system template cluster instead (override with SYSTEM_PGDATA).
      cp -a "${SYSTEM_PGDATA:-/opt/homebrew/var/postgresql@15}/" "$DATA_DIR"
      rm -f "$DATA_DIR/postmaster.pid"
      chmod 700 "$DATA_DIR"
    fi
  fi
  if ! pg_ctl -D "$DATA_DIR" -l "$DATA_DIR.log" status >/dev/null 2>&1; then
    pg_ctl -D "$DATA_DIR" -l "$DATA_DIR.log" -o "-p $DB_PORT -k $DATA_DIR" start >/dev/null
  fi
  export PGHOST="$DATA_DIR"
  started=1
  psql -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 \
    || psql -d postgres -c "CREATE DATABASE \"$DB_NAME\"" >/dev/null
fi

# Always reset: the suite proves migrations apply from an empty state.
# Only ever point this at a scratch database (default worldspeak_phase2).
psql -d postgres -q -c "DROP DATABASE IF EXISTS \"$DB_NAME\"" -c "CREATE DATABASE \"$DB_NAME\"" >/dev/null

echo "db-test: applying shim + migrations on ${PGHOST:-localhost}:$DB_PORT/$DB_NAME"
psql -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/setup-shim.sql" >/dev/null
for mig in "$ROOT"/supabase/migrations/*.sql; do
  echo "db-test: $(basename "$mig")"
  psql -v ON_ERROR_STOP=1 -q -f "$mig" >/dev/null
done

echo "db-test: running isolation suite"
psql -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/isolation.test.sql"
