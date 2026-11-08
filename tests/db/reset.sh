#!/usr/bin/env bash
# Recreate the local test database and apply shim + all migrations (+ optional demo seed).
set -euo pipefail
DB=${TEST_DB:-stayzone_test}
export PGPASSWORD=${PGPASSWORD:-postgres}
P="psql -h localhost -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB"
$P -d postgres -c "alter database $DB set search_path = \"\$user\", public, extensions"
DIR=$(cd "$(dirname "$0")/../.." && pwd)
$P -d $DB -f "$DIR/tests/db/supabase_shim.sql"
for f in "$DIR"/supabase/migrations/*.sql; do echo "→ $(basename "$f")"; $P -d $DB -f "$f"; done
if [ "${WITH_DEMO:-0}" = "1" ]; then echo "→ demo seed"; $P -d $DB -f "$DIR/supabase/demo/demo_seed.sql"; fi
echo "Database $DB ready."
