#!/usr/bin/env bash
# WorldSpeak Phase 2 · local migration + RLS test harness.
# Ephemeral PostgreSQL (Homebrew binaries) unless PGHOST is set, in which
# case the given server is used (CI service) and never started/stopped here.
# Applies supabase/tests/setup-shim.sql, migrations in order, then the
# isolation suite with ON_ERROR_STOP. No cloud, no secrets, no model calls.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Destructive reset is allowed only in a named local scratch database.
# Refuse hosted URLs/hosts even when a caller accidentally exports them.
DB_NAME="${PGDATABASE:-worldspeak_phase2}"
DB_PORT="${PGPORT:-54399}"
case "$DB_NAME" in worldspeak_phase2|worldspeak_phase2_[a-zA-Z0-9_]*) ;; *) echo "Refusing non-scratch database" >&2; exit 2;; esac
[[ "$DB_NAME" =~ ^[a-zA-Z0-9_]+$ ]] || exit 2
[[ "$DB_PORT" =~ ^[0-9]+$ ]] || exit 2
if [ -n "${DATABASE_URL:-}${PGSERVICE:-}${PGSERVICEFILE:-}" ]; then
  echo "Refusing connection URL/service configuration in destructive local harness" >&2; exit 2
fi
case "${PGHOST:-}" in ""|localhost|127.0.0.1|::1|/tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;; *) echo "Refusing non-local PGHOST" >&2; exit 2;; esac
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
    initdb -D "$DATA_DIR" -U postgres --auth=trust >/dev/null
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

echo "db-test: running concurrent inference scenarios"
pnpm --filter @worldspeak/worker test:db
