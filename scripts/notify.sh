#!/usr/bin/env bash
# Post (or delete) messages in the TechTO hackathon Discord channel.
#
# Send:
#   scripts/notify.sh <username> <message...>
#   scripts/notify.sh <username> --file <path>
#
# Delete:
#   scripts/notify.sh --delete <message_id>
#
# Webhook URL is resolved in this order:
#   1. $DISCORD_WEBHOOK_TECHTO env var (use this if you don't have Key Vault access)
#   2. Azure Key Vault: kv-ideaplaces / discord-webhook-techto (Chip only)
#
# Each successful post appends a line to .discord-messages.log at the repo
# root so the message can be deleted/edited later.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$REPO_ROOT/.discord-messages.log"

resolve_webhook() {
  if [[ -n "${DISCORD_WEBHOOK_TECHTO:-}" ]]; then
    echo "$DISCORD_WEBHOOK_TECHTO"
    return
  fi
  if command -v az >/dev/null 2>&1; then
    az keyvault secret show \
      --vault-name kv-ideaplaces \
      --name discord-webhook-techto \
      --query value -o tsv 2>/dev/null && return
  fi
  echo "error: no webhook URL. Set DISCORD_WEBHOOK_TECHTO or run 'az login'." >&2
  exit 2
}

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <username> <message...|--file path>   |   $0 --delete <message_id>" >&2
  exit 1
fi

WEBHOOK="$(resolve_webhook)"

if [[ "$1" == "--delete" ]]; then
  MSG_ID="${2:?usage: $0 --delete <message_id>}"
  curl -sS -X DELETE "${WEBHOOK}/messages/${MSG_ID}" -w "HTTP %{http_code}\n"
  exit 0
fi

USERNAME="$1"
shift
if [[ "${1:-}" == "--file" ]]; then
  shift
  MSG="$(cat "${1:?missing file path}")"
else
  MSG="$*"
fi

PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"username": sys.argv[1], "content": sys.argv[2]}))' "$USERNAME" "$MSG")"

RESP="$(curl -sS -X POST "${WEBHOOK}?wait=true" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")"

MSG_ID="$(echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("id",""))' 2>/dev/null || true)"

if [[ -n "$MSG_ID" ]]; then
  echo "$(date -u +%FT%TZ) $USERNAME $MSG_ID" >> "$LOG"
  echo "posted: $MSG_ID"
else
  echo "error: no message id in response" >&2
  echo "$RESP" >&2
  exit 3
fi
