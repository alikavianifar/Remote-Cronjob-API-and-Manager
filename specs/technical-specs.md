# Technical Specifications

> **Note:** This is the original design specification. Where it differs from the implementation (for example it proposes SQLite, while the implementation stores data in a JSON file), the top-level README and `docs/` describe the actual behaviour.

## 1. System Overview

### 1.1 Project Description
Remote Cronjob API & Manager is a modern REST API and web-based management panel for managing scheduled tasks (Cronjobs) on Linux servers.

### 1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                     React Dashboard (Vite)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Express   │  │ JWT Auth    │  │   Crontab Service       │  │
│  │   Router    │  │ Middleware  │  │   (Read/Write/Execute)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Logger    │  │ Validator   │  │   Job Runner            │  │
│  │   (Winston) │  │ (Zod)       │  │   (Force Run)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ File System / Exec
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LINUX SYSTEM                                │
│  ┌─────────────────┐  ┌───────────────┐  ┌─────────────────┐   │
│  │    Crontab      │  │   Log Files   │  │  SQLite DB      │   │
│  │    (/var/spool) │  │   (/var/log)  │  │  (jobs.db)      │   │
│  └─────────────────┘  └───────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Functional Requirements

### 2.1 Cron API (Core Features)

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F01 | List Jobs | GET /api/jobs - List all cronjobs | High |
| F02 | Get Job | GET /api/jobs/:id - Get single job details | High |
| F03 | Create Job | POST /api/jobs - Create new cronjob | High |
| F04 | Update Job | PUT /api/jobs/:id - Update existing job | High |
| F05 | Delete Job | DELETE /api/jobs/:id - Remove cronjob | High |
| F06 | Force Run | POST /api/jobs/:id/run - Manual execution | High |
| F07 | Toggle Status | POST /api/jobs/:id/toggle - Enable/disable | Medium |
| F08 | Get Logs | GET /api/jobs/:id/logs - Job execution history | High |

### 2.2 Dashboard (UI Features)

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| U01 | Job List | Display all jobs with status indicators | High |
| U02 | Job Form | Create/Edit job with validation | High |
| U03 | Period Wizard | Visual cron expression builder | High |
| U04 | Log Viewer | Display stdout/stderr logs | High |
| U05 | Force Run Button | Trigger manual job execution | High |
| U06 | Search/Filter | Find jobs by name/status | Medium |
| U07 | Dark Mode | Toggle light/dark theme | Low |
| U08 | Responsive Design | Mobile-friendly layout | Medium |

### 2.3 Auto Control & Auto Test

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| A01 | Health Check | API endpoint for system health | High |
| A02 | Self Test | Automated functionality testing | High |
| A03 | Error Detection | Automatic error status reporting | High |

---

## 3. Non-Functional Requirements

### 3.1 Performance
- API response time < 200ms
- Dashboard initial load < 3 seconds
- Support for 100+ concurrent jobs

### 3.2 Security
- JWT-based authentication
- Input validation on all endpoints
- Shell injection prevention
- HTTPS enforcement (production)

### 3.3 Reliability
- Graceful error handling
- Automatic reconnection
- Data persistence (SQLite)

### 3.4 Usability
- Intuitive UI design
- Clear error messages
- Comprehensive documentation

---

## 4. API Specification

### 4.1 Authentication

**Login:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

### 4.2 Jobs Endpoints

**List Jobs:**
```http
GET /api/jobs
Authorization: Bearer <token>
```

**Create Job:**
```http
POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Backup Database",
  "expression": "0 2 * * *",
  "command": "/opt/scripts/backup.sh",
  "description": "Daily database backup at 2 AM"
}
```

**Force Run:**
```http
POST /api/jobs/:id/run
Authorization: Bearer <token>
```

---

## 5. Data Models

### 5.1 Job Model

```typescript
interface Job {
  id: string;           // UUID
  name: string;         // Job name
  expression: string;   // Cron expression
  command: string;      // Shell command
  description?: string; // Optional description
  status: 'active' | 'paused' | 'error';
  lastRun?: Date;       // Last execution time
  nextRun?: Date;       // Next scheduled run
  lastExitCode?: number;// Last run exit code
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.2 Log Model

```typescript
interface JobLog {
  id: string;
  jobId: string;
  executedAt: Date;
  duration: number;     // milliseconds
  exitCode: number;
  stdout: string;
  stderr: string;
  triggeredBy: 'schedule' | 'manual';
}
```

### 5.3 User Model

```typescript
interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'viewer';
  createdAt: Date;
}
```

---

## 6. Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend Runtime | Node.js | 18+ |
| Backend Framework | Express.js | 4.x |
| Database | SQLite | 3.x |
| Authentication | JWT | - |
| Validation | Zod | 3.x |
| Logging | Winston | 3.x |
| Frontend Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| HTTP Client | Axios | 1.x |
| Icons | Lucide React | - |

---

## 7. File Structure

```
src/
├── backend/
│   ├── package.json
│   ├── server.js              # Entry point
│   ├── config/
│   │   └── index.js           # Configuration
│   ├── middleware/
│   │   ├── auth.js            # JWT middleware
│   │   └── errorHandler.js    # Error handling
│   ├── routes/
│   │   ├── auth.js            # Auth routes
│   │   └── jobs.js            # Jobs routes
│   ├── services/
│   │   ├── crontab.js         # Crontab operations
│   │   ├── jobRunner.js       # Execute jobs
│   │   └── logger.js          # Logging service
│   ├── utils/
│   │   ├── cronParser.js      # Parse cron expressions
│   │   └── validators.js      # Input validation
│   └── database/
│       └── db.js              # SQLite setup
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx           # Entry point
    │   ├── App.jsx            # Main component
    │   ├── components/
    │   │   ├── Dashboard.jsx
    │   │   ├── JobList.jsx
    │   │   ├── JobForm.jsx
    │   │   ├── PeriodWizard.jsx
    │   │   ├── LogViewer.jsx
    │   │   └── Header.jsx
    │   ├── services/
    │   │   └── api.js         # API client
    │   ├── hooks/
    │   │   └── useJobs.js     # Custom hooks
    │   └── styles/
    │       └── index.css      # Global styles
    └── public/
        └── favicon.ico
```
