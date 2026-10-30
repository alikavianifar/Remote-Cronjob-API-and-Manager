<div align="center">

# Remote Cronjob API & Manager

**Manage Linux cron jobs through a secure REST API and a web dashboard.**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)

</div>

---

## Overview

Linux `cron` has no built-in API. This project adds one: an Express-based REST API for creating, scheduling, running and monitoring cron jobs, together with a React dashboard that makes the same operations available from the browser.

- **Backend:** Node.js, Express, SQLite, JWT authentication
- **Frontend:** React 18 and Vite
- **Target platform:** Linux (production). On Windows, the backend can be used for development through a mock mode.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Security Notes](#security-notes)
- [Project Structure](#project-structure)
- [Self-Test](#self-test)
- [Technologies](#technologies)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Features

| Feature | Description |
|---------|-------------|
| **REST API** | Endpoints for creating, reading, updating and deleting crontab jobs |
| **Visual dashboard** | React dashboard showing job status, schedules and errors |
| **Period wizard** | Visual builder that turns cron expressions into readable schedules, with presets and custom options |
| **Force run** | Execute a job manually before its next scheduled time |
| **Log tracking** | Stores and displays stdout, stderr and execution history for each job |
| **JWT authentication** | API access is protected with JSON Web Tokens |
| **Self-test** | Built-in check of the main components, available as a script and as an API endpoint |
| **Dark theme** | Dark interface with accent colors |

---

## Quick Start

### Prerequisites

- Node.js 18.0.0 or later
- npm 9.0.0 or later
- Linux for production use, or Windows (mock mode) for development

### Run locally

```bash
# Clone the repository
git clone https://github.com/alikavianifar/Remote-Cronjob-API-and-Manager.git
cd Remote-Cronjob-API-and-Manager

# Start the backend
cd src/backend
npm install
npm start

# In a second terminal, start the frontend
cd src/frontend
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

**Default login (local development only):**

- Username: `admin`
- Password: `admin123`

> **Important:** These credentials are intended for local development. Change them, and the JWT signing secret, in the backend configuration before using the service anywhere else. See [Security Notes](#security-notes).

---

## Installation

### Backend

```bash
cd src/backend

# Install dependencies
npm install

# Development server
npm run dev

# Production server
npm start
```

The API runs on <http://localhost:3000>.

### Frontend

```bash
cd src/frontend

# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
```

The development server runs on <http://localhost:5173>.

---

## Usage

### Sign in

1. Open <http://localhost:5173>.
2. Enter your credentials.
3. You are redirected to the dashboard.

### Create a job

1. Click **+ New Job**.
2. Fill in the job details:
   - **Name:** a descriptive name
   - **Command:** the shell command to execute
   - **Schedule:** a cron expression (use the wizard if you need help)
   - **Description:** optional
3. Click **Create Job**.

### Use the period wizard

1. In the job form, click **Use Wizard**.
2. Choose a preset or build a custom schedule.
3. Check the generated expression and click **Apply**.

### Force-run a job

1. Find the job in the list.
2. Click **Force Run**.
3. Open the job's logs to see the result.

### View logs

1. Click the log icon on a job card.
2. Expand an entry to see its stdout and stderr output.

---

## API Reference

All job and utility endpoints expect a JWT in the `Authorization: Bearer <token>` header, except the login and health-check routes.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Log in and receive a JWT |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/:id` | Get a job |
| POST | `/api/jobs` | Create a job |
| PUT | `/api/jobs/:id` | Update a job |
| DELETE | `/api/jobs/:id` | Delete a job |
| POST | `/api/jobs/:id/run` | Run a job immediately |
| POST | `/api/jobs/:id/toggle` | Pause or resume a job |
| GET | `/api/jobs/:id/logs` | Get a job's execution logs |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/test` | Run the self-test |
| POST | `/api/cron/parse` | Parse a cron expression |

### Example requests

```bash
# Log in
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Create a job (replace YOUR_TOKEN with the token returned by the login request)
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Backup Database",
    "expression": "0 2 * * *",
    "command": "/opt/scripts/backup.sh",
    "description": "Daily database backup"
  }'
```

---

## Security Notes

This service executes shell commands on the host it runs on. Treat it accordingly:

- Commands run with the privileges of the user that runs the backend. Use a dedicated, least-privileged account.
- Change the default credentials and the JWT signing secret before any use outside local development.
- Do not expose the API directly to the internet. Place it behind a reverse proxy with HTTPS and restrict access to trusted networks.
- Review the commands stored in jobs regularly. Anyone who can create a job can run arbitrary commands.

---

## Project Structure

```
Remote-Cronjob-API-and-Manager/
├── specs/                  # Requirements and analysis
│   ├── technical-specs.md
│   ├── api-endpoints.md
│   └── ui-requirements.md
├── src/
│   ├── backend/            # Node.js + Express API
│   │   ├── config/         # Configuration
│   │   ├── database/       # SQLite setup
│   │   ├── middleware/     # Authentication and error handling
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── test/           # Self-test scripts
│   │   └── server.js       # Entry point
│   └── frontend/           # React + Vite application
│       ├── src/
│       │   ├── components/ # React components
│       │   ├── hooks/      # Custom hooks
│       │   ├── services/   # API client
│       │   └── styles/     # CSS
│       └── index.html
├── docs/                   # Documentation
├── project_info.json       # Project metadata
└── README.md
```

---

## Self-Test

The project includes a self-test that checks its main components:

- Database connection
- Crontab service
- Cron expression parser
- Logging system
- Configuration
- Authentication
- API endpoints

Run it from the command line:

```bash
cd src/backend
npm test
```

Or call the API endpoint:

```bash
curl http://localhost:3000/api/test
```

---

## Technologies

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | Web framework |
| SQLite | 3.x | Database |
| JWT | 9.x | Authentication |
| Winston | 3.x | Logging |
| Zod | 3.x | Input validation |
| cronstrue | 2.x | Human-readable cron descriptions |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| Axios | 1.x | HTTP client |
| Lucide React | – | Icons |

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a pull request.

---

## License

Released under the [MIT License](LICENSE).

---

## Author

**Ali Kaviani Far**
Web & Backend Developer

[GitHub](https://github.com/alikavianifar) · [LinkedIn](https://www.linkedin.com/in/alikavianifar/) · [alikavianifar@proton.me](mailto:alikavianifar@proton.me)
