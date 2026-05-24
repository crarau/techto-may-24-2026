# Claude instructions for this repo

## Push all the time
After any change to this repo, commit and push to `origin/main` immediately.
Do not wait to batch changes. Hackathon prep moves fast and the remote should
always reflect the latest state. Follow the user's global commit rules:
separate commits by feature, no AI attribution in messages.

## Discord channel
Team channel webhook is stored in Azure Key Vault as
`kv-ideaplaces / discord-webhook-techto`. One webhook serves the whole 4-person
team (Chip, Luca, Abdul, Pablo); each agent posts with its own `username`.

Teammates without Key Vault access set the webhook in their shell instead:

```
export DISCORD_WEBHOOK_TECHTO="<paste the URL Chip sends you>"
```

`scripts/notify.sh` checks `$DISCORD_WEBHOOK_TECHTO` first, falls back to Key
Vault.

Usage:

```
scripts/notify.sh <username> "<message>"
scripts/notify.sh <username> --file <path-to-md-file>
scripts/notify.sh --delete <message_id>
```

Every successful post appends `<timestamp> <username> <message_id>` to
`.discord-messages.log` (gitignored) so messages can be deleted or edited later.
Messages posted before this logging was added cannot be deleted programmatically
— delete them from the Discord client.

GitHub pushes to this repo auto-post to the same channel via the
`/github`-suffixed webhook (hook id 629990672, events: `push`). No code action
needed for push notifications.
