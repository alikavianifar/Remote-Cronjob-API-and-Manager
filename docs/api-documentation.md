# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /auth/login

Login and get JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  },
  "expiresIn": 86400
}
```

---

## Jobs Endpoints

### GET /jobs

List all cronjobs.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Backup Database",
      "expression": "0 2 * * *",
      "expressionHuman": "At 02:00 AM",
      "command": "/opt/scripts/backup.sh",
      "description": "Daily backup",
      "status": "active",
      "lastRun": "2024-01-15T02:00:00Z",
      "nextRun": "2024-01-16T02:00:00Z",
      "lastExitCode": 0
    }
  ],
  "total": 1
}
```

### GET /jobs/:id

Get single job details.

### POST /jobs

Create new job.

**Request:**
```json
{
  "name": "Backup Database",
  "expression": "0 2 * * *",
  "command": "/opt/scripts/backup.sh",
  "description": "Daily backup at 2 AM"
}
```

### PUT /jobs/:id

Update existing job.

### DELETE /jobs/:id

Delete job.

### POST /jobs/:id/run

Force run a job immediately.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "executionId": "exec-uuid",
    "startedAt": "2024-01-15T10:00:00Z",
    "completedAt": "2024-01-15T10:00:02Z",
    "duration": 1500,
    "exitCode": 0,
    "stdout": "Backup completed",
    "stderr": "",
    "status": "completed"
  }
}
```

### POST /jobs/:id/toggle

Toggle job status (active/paused).

### GET /jobs/:id/logs

Get execution logs.

**Query Parameters:**
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

---

## Utility Endpoints

### GET /health

Health check (no auth required).

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "mode": "mock"
}
```

### GET /test

Run self-tests (no auth required).

**Response:**
```json
{
  "success": true,
  "tests": [
    { "name": "Database Connection", "status": "passed", "duration": 5 },
    { "name": "Crontab Service", "status": "passed", "duration": 12 }
  ],
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0
  }
}
```

### POST /cron/parse

Parse cron expression to human readable.

**Request:**
```json
{
  "expression": "*/15 * * * *"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expression": "*/15 * * * *",
    "human": "Every 15 minutes",
    "isValid": true
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    { "field": "expression", "message": "Invalid cron expression" }
  ]
}
```

**HTTP Status Codes:**
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
