#!/usr/bin/env bash

set -euo pipefail

sqlnet="$(readlink -f "${ORACLE_BASE_HOME}/network/admin/sqlnet.ora")"
original="${sqlnet}.nne-test-original"
if [ ! -f "${original}" ]; then
  cp "${sqlnet}" "${original}"
fi

case "${NNE_ORACLE_POLICY}" in
  required|strong)
    cat "${original}" > "${sqlnet}"
    cat >> "${sqlnet}" <<'EOF'

SQLNET.ENCRYPTION_SERVER = REQUIRED
SQLNET.ENCRYPTION_TYPES_SERVER = (AES256)
SQLNET.CRYPTO_CHECKSUM_SERVER = REQUIRED
SQLNET.CRYPTO_CHECKSUM_TYPES_SERVER = (SHA256)
EOF
    if [ "${NNE_ORACLE_POLICY}" = strong ]; then
      echo 'SQLNET.ALLOW_WEAK_CRYPTO_CLIENTS = FALSE' >> "${sqlnet}"
    else
      echo 'SQLNET.ALLOW_WEAK_CRYPTO_CLIENTS = TRUE' >> "${sqlnet}"
    fi
    ;;
  plaintext)
    cat "${original}" > "${sqlnet}"
    cat >> "${sqlnet}" <<'EOF'

SQLNET.ENCRYPTION_SERVER = REJECTED
SQLNET.CRYPTO_CHECKSUM_SERVER = REJECTED
EOF
    ;;
  *)
    echo "Invalid NNE_ORACLE_POLICY: ${NNE_ORACLE_POLICY}" >&2
    exit 1
    ;;
esac
