#!/usr/bin/env bash

set -euo pipefail

# Fit the prebuilt database in a shared Docker Desktop VM.
spfile="$(readlink -f "${ORACLE_BASE_CONFIG}/dbs/spfile${ORACLE_SID}.ora")"
init_dir="$(mktemp -d)"
sqlplus -s / as sysdba <<EOF
WHENEVER SQLERROR EXIT SQL.SQLCODE
CREATE PFILE = '${init_dir}/original.ora' FROM SPFILE = '${spfile}';
EXIT
EOF

grep -Ev '^[^.]+\.__|^\*\.(sga_target|pga_aggregate_target|processes|cpu_count)=' \
  "${init_dir}/original.ora" > "${init_dir}/fixture.ora"
cat >> "${init_dir}/fixture.ora" <<'EOF'
*.sga_target=512m
*.pga_aggregate_target=96m
*.processes=120
*.cpu_count=1
EOF

sqlplus -s / as sysdba <<EOF
WHENEVER SQLERROR EXIT SQL.SQLCODE
CREATE SPFILE = '${spfile}' FROM PFILE = '${init_dir}/fixture.ora';
EXIT
EOF

unlink "${init_dir}/original.ora"
unlink "${init_dir}/fixture.ora"
rmdir "${init_dir}"

exec container-entrypoint.sh "$@"
