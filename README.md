<div align="center">

# Remote Cronjob API & Manager

**Manage Linux cron jobs through a secure REST API and a web dashboard.**

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)
![React](https://img.shields.io/badge/react-18-61dafb.svg)

</div>

---

## Overview

Cron has no API. This project adds one: an Express REST API that creates, edits, pauses, deletes and force-runs cron jobs, plus a React dashboard for the same operations.

- **Backend:** Node.js 20+, Express, JWT authentication, Zod validation
- **Frontend:** React 18 and Vite
- **Storage:** a JSON data file – no database server to install
- **Platform:** Linux with cron for real scheduling; mock mode for development on Windows or macOS
- **Tests:** 130 automated backend tests (`node:test`, no extra tooling)

The API manages one block inside the service user's crontab. Everything else in that crontab is left exactly as it was.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [API Overview](#api-overview)
- [Security](#security)
- [Limitations](#limitations)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Technologies](#technologies)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Features

| Feature | Description |
|---------|-------------|
| **Full job management** | Create, edit, pause/resume and delete jobs; the crontab is updated on every change |
| **Safe crontab access** | The `crontab` binary is started without a shell; job text is validated and `%` is escaped |
| **Schedule wizard** | Presets and a custom builder, with a plain-language description and the next run time |
| **Force run** | Run any job on demand with a timeout and an output limit |
| **Execution logs** | stdout, stderr, exit code and duration of each forced run, with pagination |
| **Authentication** | JWT, login rate limiting, constant-time credential checks |
| **Production guard** | The server refuses to start in production without a strong secret and admin password |
| **Self-test** | Non-destructive check of the main components, from the dashboard or the API |

---

## Quick Start

**Requirements:** Node.js 20.19+ (or 22.12+), npm 10+, and Linux with cron for real scheduling.

```bash
git clone https://github.com/alikavianifar/Remote-Cronjob-API-and-Manager.git
cd Remote-Cronjob-API-and-Manager

# Terminal 1 – API on http://127.0.0.1:3000
cd src/backend
npm ci
npm run dev

# Terminal 2 – dashboard on http://localhost:5173
cd src/frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. While `ADMIN_PASSWORD` is not set, the development login is `admin` / `admin123` and the backend logs a warning. On Windows, `install.bat` and `start.bat` do the same; the backend then runs in mock mode and neither touches the real crontab nor executes commands.

---

## Configuration

Settings are environment variables; the full list with explanations is in [`src/backend/.env.example`](src/backend/.env.example). The most important ones:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` enables the startup checks |
| `JWT_SECRET` | random per start (dev) | **Required in production**, at least 32 characters |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | `admin`, `admin123` (dev) | **Password required in production**, at least 12 characters |
| `HOST`, `PORT` | `127.0.0.1`, `3000` | Listen address |
| `CORS_ORIGINS` | `http://localhost:5173,…` | Browser origins allowed to call the API |
| `DATA_FILE` | `src/backend/data/db.json` | Users, jobs and logs |
| `CRONMGR_MOCK` | `true` on Windows | Simulate cron and do not run commands |
| `COMMAND_TIMEOUT_MS` | `60000` | Time limit for Force Run |

Production setup (systemd unit, reverse proxy, TLS) is described in the [installation guide](docs/installation.md#production-deployment).

---

## How It Works

```
Browser ──HTTPS──▶ reverse proxy ──▶ Express API ──▶ JSON data file   (source of truth)
                                          │
                                          └─ spawn("crontab", ["-"]) ──▶ user crontab
```

1. A job is validated (cron syntax, single-line command, length limits) and saved in the data file.
2. The managed block of the crontab is regenerated from all stored jobs and written with `crontab -`. If that fails, the saved change is rolled back, so the data file and the crontab never disagree.
3. Paused jobs are written as `#PAUSED …` comments; lines outside the block are preserved.

```
MAILTO=ops@example.com                      ← your own entries stay untouched
17 3 * * * /usr/local/bin/rotate

# BEGIN CRONMGR (managed block - changes made here are overwritten)
# CRONMGR:3f6c…  Backup database
0 2 * * * /opt/scripts/backup.sh
# CRONMGR:9a1d…  Disk report
#PAUSED 0 * * * * df -h >> /tmp/disk.log
# END CRONMGR
```

Cron itself runs the scheduled commands, so jobs keep running when the API is stopped.

---

## API Overview

All endpoints except `GET /api/health` and `POST /api/auth/login` require `Authorization: Bearer <token>`. Details, request/response examples and status codes are in the [API documentation](docs/api-documentation.md).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Log in, receive a JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create a job |
| GET / PUT / DELETE | `/api/jobs/:id` | Read, update, delete a job |
| POST | `/api/jobs/:id/toggle` | Pause or resume |
| POST | `/api/jobs/:id/run` | Run now and record the result |
| GET | `/api/jobs/:id/logs` | Execution logs (paginated) |
| POST | `/api/cron/parse` | Describe an expression and list upcoming runs |
| GET | `/api/test` | Self-test |
| GET | `/api/health` | Health check (public) |

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"your-password"}' | jq -r .token)

curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Backup database","expression":"0 2 * * *","command":"/opt/scripts/backup.sh"}'
```

---

## Security

This service runs shell commands on the machine it is installed on – that is its purpose. Anyone who can sign in can run arbitrary commands as the service user.

What the project does:

- no shell is involved in reading or writing the crontab; line breaks and control characters are rejected so a job cannot add extra cron lines
- all endpoints except the health check require a token (HS256 only, expiry enforced); login is rate-limited and does not reveal whether a username exists
- production mode refuses weak or missing secrets; no secret or password is stored in the repository
- the data file is created with owner-only permissions; Force Run children do not inherit `JWT_SECRET` or `ADMIN_PASSWORD`
- Helmet security headers, a CORS allow-list, a 100 KB body limit, command timeout and output limit

What you should do:

- run the service as a dedicated unprivileged user, never as root
- keep it on `127.0.0.1` behind a reverse proxy with TLS, and restrict access to trusted networks
- set `TRUST_PROXY=true` only when a proxy is actually in front of it

The dashboard keeps its token in `localStorage`, as most single-page apps do; serve it only over HTTPS and from your own origin.

---

## Limitations

- Logs are recorded for Force Run only. Executions started by cron itself are not captured; redirect their output inside the command if you need it.
- The data file is the source of truth. Edits made by hand *inside* the managed block are overwritten on the next change (lines outside it are never touched).
- One administrator account; no roles or multi-user support.
- State and rate limits are held by a single process; run one instance.
- Schedules use standard 5-field cron syntax in the server's time zone. `@daily`-style shortcuts, `L`/`W`/`#` and seconds are not supported.

---

## Project Structure

```
Remote-Cronjob-API-and-Manager/
├── src/
│   ├── backend/
│   │   ├── config/        # Environment configuration and production checks
│   │   ├── lib/           # Cron parser, logger, error types
│   │   ├── middleware/    # Authentication, rate limiting, error handling
│   │   ├── routes/        # auth, jobs, utilities
│   │   ├── services/      # Jobs, crontab driver, command runner, auth
│   │   ├── store/         # Atomic JSON data store
│   │   ├── utils/         # Request validation schemas
│   │   ├── test/          # Test suite (node:test)
│   │   ├── testkit/       # Test helpers
│   │   ├── app.js         # Express app factory
│   │   └── server.js      # Entry point
│   └── frontend/
│       └── src/           # components, context, hooks, services, styles
├── docs/                  # API, installation and usage documentation
├── specs/                 # Original requirements and design specifications
├── researchs/             # Research notes behind the design
├── .github/workflows/     # CI
└── project_info.json
```

---

## Testing

```bash
cd src/backend
npm test
```

The suite covers the cron parser, crontab block generation (including a stand-in `crontab` executable to verify that no shell syntax is evaluated), the data store, the command runner (exit codes, timeout, output limit, secret isolation), configuration checks, and the full HTTP API: authentication, validation, CRUD, running jobs, logs, rate limiting, CORS, rollback on failure and concurrency. No database or real cron is needed.

Frontend: `cd src/frontend && npm run build`. CI runs both on every push.

---

## Technologies

| Area | Stack |
|------|-------|
| Backend | Node.js 20+, Express 4, jsonwebtoken, bcryptjs, helmet, cors, Zod, cronstrue |
| Frontend | React 18, Vite, Axios, Lucide React |
| Testing | `node:test`, built-in `fetch` |

---

## Documentation

- [Installation guide](docs/installation.md)
- [Usage guide](docs/usage-guide.md)
- [API documentation](docs/api-documentation.md)
- [Technical overview](docs/project_overview.html), [specifications](specs/) and [research notes](researchs/)

---

## Contributing

1. Fork the repository and create a branch: `git checkout -b feature/your-feature`
2. Make your change and add tests; run `npm test` in `src/backend`
3. Commit, push and open a pull request

---

## License

Released under the [MIT License](LICENSE).

---

## Author

**Ali Kaviani Far**
Web & Backend Developer

[GitHub](https://github.com/alikavianifar) · [LinkedIn](https://www.linkedin.com/in/alikavianifar/) · [alikavianifar@proton.me](mailto:alikavianifar@proton.me)
