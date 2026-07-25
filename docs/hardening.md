# Hardening checklist

## Runtime hardening

- Rate limiting: add at the reverse proxy or edge layer before public exposure.
- Logs with rotation: route stdout/stderr to Docker logs and rotate via the host.
- Daily backups: schedule a cron job on the VPS for database dumps and file storage.
- Simple in-memory cache: keep it process-local and safe to clear on restart.

## Deployment notes

- Build and run through Docker on the VPS.
- Put SSL termination in front of the app (reverse proxy or load balancer).
- Keep external secrets (SMTP, VAPID, storage credentials) in environment variables.

## Verification

- `npm test`
- `npm run build`
