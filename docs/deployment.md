# Staging deployment

The first deployment target is `giftguard.grafskov.ru` on the existing Ubuntu server. GitHub Actions runs tests, an online PostgreSQL migration, TypeScript checks and Docker builds. The separate **Deploy staging** workflow is manual and repeats CI before shipping images. It builds Linux images on the GitHub runner, transfers them over pinned SSH, then starts Compose on the server. The 1 vCPU / 1 GB VPS does not build images.

The deployment user is `giftguard`, with Docker access and a writable `/opt/giftguard` directory. The server host key is pinned in `deploy/known_hosts`. PostgreSQL, Redis and the API are reachable only on the Compose network; Next.js binds to `127.0.0.1:3000`, ready for Nginx. The frontend proxies `/api/*` to the backend inside Compose.

## One-time GitHub configuration

Create the `staging` environment in GitHub. Add two environment or repository secrets:

- `DEPLOY_SSH_KEY`: the **passphrase-protected** private key corresponding to `/home/giftguard/.ssh/authorized_keys`.
- `DEPLOY_SSH_PASSPHRASE`: the passphrase for that key.

The generated key is stored locally at `~/.ssh/giftguard_deploy` on the development machine. Change its temporary passphrase interactively with `ssh-keygen -p -f ~/.ssh/giftguard_deploy` before adding it to GitHub. Never commit or paste the private key into a PR, issue or chat. The workflow loads it into `ssh-agent` and deletes the temporary key file on the runner.

## Server configuration

Create `/opt/giftguard/.env` (mode 600, owned by `giftguard`) with strong unique `POSTGRES_PASSWORD` and `APP_SECRET`, a valid `BOT_TOKEN`, the matching `DATABASE_URL`, and `FRONTEND_URL=https://giftguard.grafskov.ru`. The deployment workflow requires this file but never copies it from GitHub. Use `.env.example` only as a field reference.

After the stack passes a local health check, add an Nginx vhost for `giftguard.grafskov.ru` that proxies to `http://127.0.0.1:3000`. Obtain a certificate with Certbot and configure the BotFather Mini App URL to the HTTPS URL. Do not expose ports 3000, 8000, 5432 or 6379 in the firewall.

Run **Deploy staging** from the Actions tab. The backend applies Alembic migrations at startup. On the server, inspect `cd /opt/giftguard && docker compose -f compose.yml ps` and `curl -I http://127.0.0.1:3000`. The public API health path is `https://giftguard.grafskov.ru/api/health` after Nginx is configured.

## Telegram API connectivity on this VPS

The host reaches api.telegram.org over IPv6, but its IPv4 connection times out. The bot has restarted on Telegram getMe timeouts; it is stopped until a proxy is configured. The staging Compose file includes an optional Xray sidecar under the xray profile. It publishes no ports and runs as the giftguard UID (1001) so it can read a server-only config with mode 600.

After the Xray share URI is converted to /opt/giftguard/xray/config.json, set COMPOSE_PROFILES=xray and TELEGRAM_PROXY_URL=socks5://xray:1080 in the server .env. Never commit the share URI or generated config. Test the Xray configuration and a real Telegram getMe request before enabling the bot. The deploy workflow now performs that getMe smoke check and fails if Telegram remains unreachable.

## Release limits

The server has 1 vCPU and about 1 GB RAM and already runs another website. Monitor memory and disk during the first deployment; increase RAM before live traffic. This is a staging workflow. Production mode rejects the current `timestamp-dev` draw entropy by design. Implement and verify an independently sourced, precommitted entropy round before accepting real prizes or advertising production fairness.
