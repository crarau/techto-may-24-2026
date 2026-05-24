#!/usr/bin/env bash
# Post a message to the TechTO hackathon Discord channel as a named persona.
#
# Usage:
#   scripts/notify.sh <username> <message...>
#   scripts/notify.sh <username> --file <path>
#
# Examples:
#   scripts/notify.sh Chip "ingestion pipeline working"
#   scripts/notify.sh Pablo --file /tmp/dataset-status.md
#
# Requires: az CLI (for Key Vault), python3, curl. Webhook URL is loaded
# from Azure Key Vault (kv-ideaplaces / discord-webhook-techto).

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <username> <message...|--file path>" >&2
  exit 1
fi

USERNAME="$1"
shift

if [[ "${1:-}" == "--file" ]]; then
  shift
  MSG="$(cat "${1:?missing file path}")"
else
  MSG="$*"
fi

WEBHOOK="$(az keyvault secret show \
  --vault-name kv-ideaplaces \
  --name discord-webhook-techto \
  --query value -o tsv)"

PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"username": sys.argv[1], "content": sys.argv[2]}))' "$USERNAME" "$MSG")"

curl -sS -X POST "$WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -w "\nHTTP %{http_code}\n"
