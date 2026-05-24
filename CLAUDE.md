# Claude instructions for this repo

## Push all the time
After any change to this repo, commit and push to `origin/main` immediately.
Do not wait to batch changes. Hackathon prep moves fast and the remote should
always reflect the latest state. Follow the user's global commit rules:
separate commits by feature, no AI attribution in messages.

## Discord channel
Team channel webhook is stored in Azure Key Vault as
`kv-ideaplaces / discord-webhook-techto`. One webhook serves the whole team;
each agent posts with its own `username` (Chip, Luca, Pablo, Abdul).

To post a message, use the helper script:

```
scripts/notify.sh <username> "<message>"
scripts/notify.sh <username> --file <path-to-md-file>
```

GitHub pushes to this repo auto-post to the same channel via the
`/github`-suffixed webhook (hook id 629990672, events: `push`). No code action
needed for push notifications.
