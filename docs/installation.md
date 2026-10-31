# Installation Guide

## Prerequisites

- **Node.js** 20.19+ or 22.12+ (the frontend toolchain needs it; the backend runs on Node 20+) – check with `node --version`
- **npm** 10+ (included with Node.js)
- **Linux with cron** for real scheduling. On Windows the backend starts in mock mode, and on macOS or any system without `crontab` you can set `CRONMGR_MOCK=true`.

## Install

```bash
git clone https://github.com/alikavianifar/Remote-Cronjob-API-and-Manager.git
cd Remote-Cronjob-API-and-Manager

cd src/backend && npm ci && cd ../..
cd src/frontend && npm ci && cd ../..
```

On Windows, `install.bat` does the same.

## Run in development

```bash
# terminal 1
cd src/backend
npm run dev          # http://127.0.0.1:3000

# terminal 2
cd src/frontend
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend. If the backend runs elsewhere, start the frontend with `VITE_API_TARGET=http://host:port npm run dev`.

Without `ADMIN_PASSWORD` the development login is `admin` / `admin123`, and the backend logs a warning about it.

## Configuration

All settings are environment variables; see [`src/backend/.env.example`](../src/backend/.env.example) for the complete list. To load a file: `node --env-file=.env server.js`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Set `production` to enable the safety checks below |
| `HOST` / `PORT` | `127.0.0.1` / `3000` | Listen address |
| `JWT_SECRET` | random per start (dev) | Token signing key. **Required in production, 32+ characters** |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin123` (dev) | Administrator account. **Password required in production, 12+ characters** |
| `CORS_ORIGINS` | `http://localhost:5173,…` | Allowed browser origins |
| `DATA_FILE` | `src/backend/data/db.json` | Users, jobs and logs |
| `CRONMGR_MOCK` | `true` on Windows | Do not touch the crontab or run commands |
| `COMMAND_TIMEOUT_MS` | `60000` | Force Run time limit |

In production the server refuses to start when `JWT_SECRET` or `ADMIN_PASSWORD` is missing or weak.

## Production deployment

1. Create an unprivileged user (for example `cronmgr`). Its personal crontab is the one that is managed and its privileges are the ones jobs run with. Do not run the service as root.
2. Install the backend as above, then provide the configuration:

   ```ini
   # /etc/systemd/system/cronjob-manager.service
   [Unit]
   Description=Cronjob Manager API
   After=network.target

   [Service]
   User=cronmgr
   WorkingDirectory=/opt/cronjob-manager/src/backend
   Environment=NODE_ENV=production
   EnvironmentFile=/etc/cronjob-manager.env
   ExecStart=/usr/bin/node server.js
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   with `/etc/cronjob-manager.env` (mode `600`) containing `JWT_SECRET`, `ADMIN_PASSWORD`, `CORS_ORIGINS` and, behind a proxy, `TRUST_PROXY=true`.
3. Build the frontend with `npm run build` in `src/frontend` and serve `dist/` with a web server (nginx, Caddy) that also proxies `/api` to `127.0.0.1:3000`. Terminate TLS there – the login form sends the password and the token is a bearer credential.

## Run the tests

```bash
cd src/backend && npm test          # 130 tests, no database or cron required
cd src/frontend && npm run build    # compile check
```

## Troubleshooting

**`Invalid configuration: JWT_SECRET is required in production`** – set the variables listed above, or run without `NODE_ENV=production` for local use.

**`Crontab is not accessible` in the log** – the `crontab` command is missing or not usable by the service user. Install cron (`apt install cron`) or set `CRONMGR_MOCK=true`.

**`Data file … is not valid JSON`** – the data file was damaged. It is never overwritten automatically; repair it or move it away to start fresh.

**Login says "Too many login attempts"** – wait for the period in the `Retry-After` header, or adjust `LOGIN_RATE_MAX`.

**Port already in use** – set another `PORT` (and `VITE_API_TARGET` for the frontend).
