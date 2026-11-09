#!/usr/bin/env bash
# Rebuilds src/data/demo-catalog.json from the demo seed (needs local PostgreSQL; see README → Testing).
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 scripts/demo/generate_demo_seed.py
WITH_DEMO=1 TEST_DB=stayzone_demo_export ./tests/db/reset.sh >/dev/null
PGPASSWORD=${PGPASSWORD:-postgres} psql -h localhost -U postgres -d stayzone_demo_export -tAq -f scripts/demo/export_demo_catalog.sql > src/data/demo-catalog.json
echo "Wrote src/data/demo-catalog.json"
