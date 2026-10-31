# API Documentation

Base URL (local development): `http://localhost:3000/api`

Every endpoint except `GET /api/health` and `POST /api/auth/login` requires a JWT:

```
Authorization: Bearer <token>
```

All responses are JSON. Successful responses contain `"success": true`; failures contain `"success": false` and an `error` message, plus a `details` array for validation errors.

## Status codes

| Code | Meaning |
|------|---------|
| 200 / 201 | Success / created |
| 400 | Validation failed or the body is not valid JSON |
| 401 | Missing, invalid or expired token; wrong credentials |
| 404 | Unknown route or job |
| 409 | The job is already running |
| 413 | Request body larger than 100 KB |
| 429 | Rate limit exceeded (see the `Retry-After` header) |
| 500 | Internal error (details are logged on the server, not returned) |

Validation errors look like this:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [{ "field": "expression", "message": "minute must be between 0 and 59" }]
}
```

---

## Authentication

### POST /auth/login

```json
{ "username": "admin", "password": "your-password" }
```

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "5d1c…", "username": "admin" }
}
```

Tokens are valid for `JWT_EXPIRES_IN` (24 hours by default). Login is limited to `LOGIN_RATE_MAX` attempts per `LOGIN_RATE_WINDOW_MS` per client IP.

### GET /auth/me

Returns the authenticated user: `{ "success": true, "user": { "id": "…", "username": "admin" } }`.

### POST /auth/logout

Tokens are stateless, so this only acknowledges the request; the client discards its token.

---

## Jobs

A job has these fields:

| Field | Description |
|-------|-------------|
| `id` | UUID |
| `name` | 1–100 characters, no control characters |
| `expression` | Standard 5-field cron expression (see below) |
| `expressionHuman` | The schedule in plain language |
| `command` | One line, up to 2000 characters, run with `/bin/sh -c` |
| `description` | Optional, up to 1000 characters |
| `status` | `active` or `paused` |
| `lastRun`, `lastExitCode` | Result of the latest run started through the API, otherwise `null` |
| `nextRun` | Next scheduled time (server local time), `null` while paused |
| `createdAt`, `updatedAt` | ISO timestamps |

### GET /jobs

```json
{ "success": true, "data": [ { "id": "…", "name": "Backup", "expression": "0 2 * * *", "status": "active" } ] }
```

### GET /jobs/:id

Returns `{ "success": true, "data": { …job } }`, or 404.

### POST /jobs

```json
{
  "name": "Backup database",
  "expression": "0 2 * * *",
  "command": "/opt/scripts/backup.sh",
  "description": "Nightly backup"
}
```

Responds with 201 and the created job. The crontab is updated before the response is sent; if that fails, nothing is stored and the response is a 500.

### PUT /jobs/:id

Send any subset of `name`, `expression`, `command`, `description` (at least one). Responds with the updated job.

### DELETE /jobs/:id

Removes the job, its logs and its crontab entry.

### POST /jobs/:id/toggle

Switches between `active` and `paused`. Paused jobs stay in the crontab as a commented line (`#PAUSED …`), so they do not run.

### POST /jobs/:id/run

Runs the command now, waits for it to finish (or for `COMMAND_TIMEOUT_MS`), stores a log entry and returns it:

```json
{
  "success": true,
  "data": {
    "id": "log-uuid",
    "jobId": "job-uuid",
    "executedAt": "2026-10-31T10:00:00.000Z",
    "completedAt": "2026-10-31T10:00:02.000Z",
    "duration": 1500,
    "exitCode": 0,
    "stdout": "Backup completed\n",
    "stderr": "",
    "timedOut": false,
    "triggeredBy": "manual"
  }
}
```

A command that exits with a non-zero code is still a successful API call (HTTP 200); check `exitCode`. Exit code `124` means the command timed out and was killed, `127` that the command was not found. A second request while the job is running returns 409.

### GET /jobs/:id/logs?limit=20&offset=0

Newest first. `limit` is 1–100 (default 20).

```json
{ "success": true, "data": [ { …log } ], "pagination": { "total": 42, "limit": 20, "offset": 0 } }
```

Only runs started through `POST /jobs/:id/run` are logged. Executions started by cron itself are not captured. At most `LOG_RETENTION_PER_JOB` (200) entries are kept per job.

---

## Utilities

### GET /health  (public)

```json
{ "success": true, "status": "ok", "timestamp": "2026-10-31T10:00:00.000Z" }
```

### POST /cron/parse

```json
{ "expression": "*/15 * * * *" }
```

```json
{
  "success": true,
  "data": {
    "expression": "*/15 * * * *",
    "human": "Every 15 minutes",
    "nextRuns": ["2026-10-31T10:15:00.000Z", "…"]
  }
}
```

Invalid expressions return 400 with the reason in `error`.

### GET /test

Non-destructive self-test (data store, crontab access, cron parser, token signing, command execution). It never creates or changes jobs.

```json
{
  "success": true,
  "mode": "system",
  "summary": { "total": 5, "passed": 5, "failed": 0 },
  "tests": [ { "name": "Crontab is accessible", "passed": true } ]
}
```

`mode` is `system` for the real crontab or `mock`.

---

## Cron expression format

Five fields separated by spaces:

```
┌───────────── minute        0-59
│ ┌─────────── hour          0-23
│ │ ┌───────── day of month  1-31
│ │ │ ┌─────── month         1-12 or jan-dec
│ │ │ │ ┌───── day of week   0-7 (0 and 7 are Sunday) or sun-sat
│ │ │ │ │
* * * * *
```

Supported: `*`, lists (`1,15`), ranges (`1-5`), steps (`*/10`, `0-30/5`) and month/weekday names. Not supported: `@daily`-style shortcuts, `L`, `W`, `#` and a seconds field. When both day-of-month and day-of-week are restricted, a day matches if **either** matches (standard cron behaviour).

## Example session

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"your-password"}' | jq -r .token)

curl -s -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Disk usage","expression":"0 * * * *","command":"df -h >> /tmp/disk.log"}'
```
