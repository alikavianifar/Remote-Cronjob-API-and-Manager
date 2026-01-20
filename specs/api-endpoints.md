# API Endpoints Specification

## Base URL
```
http://localhost:3000/api
```

---

## Authentication

### POST /auth/login
Login and get JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "username": "admin",
    "role": "admin"
  },
  "expiresIn": 86400
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

## Jobs

### GET /jobs
List all cronjobs.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Backup Database",
      "expression": "0 2 * * *",
      "expressionHuman": "Every day at 2:00 AM",
      "command": "/opt/scripts/backup.sh",
      "description": "Daily database backup",
      "status": "active",
      "lastRun": "2024-01-15T02:00:00Z",
      "nextRun": "2024-01-16T02:00:00Z",
      "lastExitCode": 0,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T02:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /jobs/:id
Get single job details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Backup Database",
    "expression": "0 2 * * *",
    "expressionHuman": "Every day at 2:00 AM",
    "command": "/opt/scripts/backup.sh",
    "description": "Daily database backup",
    "status": "active",
    "lastRun": "2024-01-15T02:00:00Z",
    "nextRun": "2024-01-16T02:00:00Z",
    "lastExitCode": 0,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T02:00:00Z"
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Job not found"
}
```

---

### POST /jobs
Create new cronjob.

**Request:**
```json
{
  "name": "Cleanup Logs",
  "expression": "0 0 * * 0",
  "command": "find /var/log -name '*.log' -mtime +7 -delete",
  "description": "Weekly log cleanup every Sunday at midnight"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Cleanup Logs",
    "expression": "0 0 * * 0",
    "expressionHuman": "Every Sunday at 12:00 AM",
    "command": "find /var/log -name '*.log' -mtime +7 -delete",
    "description": "Weekly log cleanup every Sunday at midnight",
    "status": "active",
    "nextRun": "2024-01-21T00:00:00Z",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "message": "Job created successfully"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "expression",
      "message": "Invalid cron expression"
    }
  ]
}
```

---

### PUT /jobs/:id
Update existing cronjob.

**Request:**
```json
{
  "name": "Cleanup Logs (Updated)",
  "expression": "0 0 * * 0",
  "command": "find /var/log -name '*.log' -mtime +14 -delete",
  "description": "Weekly log cleanup - keep 14 days"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Cleanup Logs (Updated)",
    "expression": "0 0 * * 0",
    "expressionHuman": "Every Sunday at 12:00 AM",
    "command": "find /var/log -name '*.log' -mtime +14 -delete",
    "description": "Weekly log cleanup - keep 14 days",
    "status": "active",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Job updated successfully"
}
```

---

### DELETE /jobs/:id
Delete cronjob.

**Response (200):**
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

---

### POST /jobs/:id/run
Force run a job immediately.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "executionId": "exec-123456",
    "startedAt": "2024-01-15T10:30:00Z",
    "status": "running"
  },
  "message": "Job execution started"
}
```

---

### POST /jobs/:id/toggle
Toggle job status (active/paused).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "paused",
    "previousStatus": "active"
  },
  "message": "Job status updated"
}
```

---

### GET /jobs/:id/logs
Get job execution logs.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-001",
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "executedAt": "2024-01-15T02:00:00Z",
      "duration": 1523,
      "exitCode": 0,
      "stdout": "Backup completed successfully\n3 files backed up",
      "stderr": "",
      "triggeredBy": "schedule"
    },
    {
      "id": "log-002",
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "executedAt": "2024-01-14T02:00:00Z",
      "duration": 1821,
      "exitCode": 0,
      "stdout": "Backup completed successfully\n2 files backed up",
      "stderr": "",
      "triggeredBy": "schedule"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

---

## Utility Endpoints

### GET /health
Health check endpoint.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "version": "1.0.0",
  "uptime": 86400
}
```

---

### POST /cron/parse
Parse cron expression to human readable format.

**Request:**
```json
{
  "expression": "*/15 * * * *"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "expression": "*/15 * * * *",
    "human": "Every 15 minutes",
    "nextRuns": [
      "2024-01-15T10:15:00Z",
      "2024-01-15T10:30:00Z",
      "2024-01-15T10:45:00Z",
      "2024-01-15T11:00:00Z",
      "2024-01-15T11:15:00Z"
    ],
    "isValid": true
  }
}
```

---

### GET /test
Self-test endpoint for Auto Test capability.

**Response (200):**
```json
{
  "success": true,
  "tests": [
    {
      "name": "Database Connection",
      "status": "passed",
      "duration": 5
    },
    {
      "name": "Crontab Access",
      "status": "passed",
      "duration": 12
    },
    {
      "name": "File Permissions",
      "status": "passed",
      "duration": 3
    },
    {
      "name": "API Authentication",
      "status": "passed",
      "duration": 8
    }
  ],
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |
