# Remote Cronjob API & Manager

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)

**Modern REST API and web-based management panel for Linux Cronjobs**

*"Linux cron servisi API destekler mi?" sorusuna "Evet, bu araçla destekler!" dedirtecek bir katman.*

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Auto Test](#-auto-test)
- [Technologies](#-technologies)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔌 **REST API** | Secure API endpoints for crontab operations (GET, POST, PUT, DELETE) |
| 📊 **Visual Dashboard** | Modern React dashboard showing job status, schedules, and errors |
| ⏰ **Period Wizard** | Convert complex cron expressions to human-readable format with visual builder |
| ▶️ **Force Run** | Manually execute jobs before their scheduled time |
| 📝 **Log Tracking** | Record and view stdout/stderr output and execution history |
| 🔐 **JWT Authentication** | Secure API with JSON Web Tokens |
| 🧪 **Auto Test** | Built-in self-test mechanism for functionality verification |
| 🌙 **Dark Theme** | Premium dark mode design with vibrant accent colors |

---

## 📸 Screenshots

### Dashboard
Modern dashboard with job cards showing status, schedule, and quick actions.

### Period Wizard
Visual cron expression builder with presets and custom options.

### Log Viewer
Detailed execution logs with stdout/stderr output.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Linux** (for production) or **Windows** (with mock mode for development)

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/remote-cronjob-manager.git
cd remote-cronjob-manager

# Install and start backend
cd src/backend
npm install
npm start

# In another terminal, install and start frontend
cd src/frontend
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

**Default Login:**
- Username: `admin`
- Password: `admin123`

---

## 📦 Installation

### Backend Setup

```bash
cd src/backend

# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

The backend will run on `http://localhost:3000`.

### Frontend Setup

```bash
cd src/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The frontend will run on `http://localhost:5173`.

---

## 📖 Usage

### Login
1. Open http://localhost:5173
2. Enter credentials (default: admin/admin123)
3. You'll be redirected to the dashboard

### Create a Job
1. Click **"+ New Job"** button
2. Fill in job details:
   - **Name**: Descriptive name for the job
   - **Command**: Shell command to execute
   - **Schedule**: Cron expression (use wizard for help)
   - **Description**: Optional description
3. Click **"Create Job"**

### Use Period Wizard
1. In the job form, click **"Use Wizard"**
2. Choose from presets or build custom schedule
3. Preview the expression and click **"Apply"**

### Force Run a Job
1. Find the job in the list
2. Click **"Force Run"** button
3. View execution result in logs

### View Logs
1. Click the log icon on a job card
2. Expand entries to see stdout/stderr

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login and get JWT token |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/:id` | Get job details |
| POST | `/api/jobs` | Create new job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| POST | `/api/jobs/:id/run` | Force run job |
| POST | `/api/jobs/:id/toggle` | Toggle active/paused |
| GET | `/api/jobs/:id/logs` | Get execution logs |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/test` | Run self-tests |
| POST | `/api/cron/parse` | Parse cron expression |

### Example Request

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Create job (with token)
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

## 📁 Project Structure

```
remote-cronjob-manager/
├── researchs/                    # Deep research outputs
│   ├── research.chatgpt.prompt.md
│   ├── research.chatgpt.result.md
│   ├── research.chatgpt.sources.md
│   └── research.chatgpt.chat_link.txt
├── specs/                        # Requirements and analysis
│   ├── technical-specs.md
│   ├── api-endpoints.md
│   └── ui-requirements.md
├── src/
│   ├── backend/                  # Node.js Express API
│   │   ├── config/               # Configuration
│   │   ├── database/             # SQLite setup
│   │   ├── middleware/           # Auth, error handling
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic
│   │   ├── test/                 # Self-test scripts
│   │   └── server.js             # Entry point
│   └── frontend/                 # React Vite app
│       ├── src/
│       │   ├── components/       # React components
│       │   ├── hooks/            # Custom hooks
│       │   ├── services/         # API client
│       │   └── styles/           # CSS styles
│       └── index.html
├── docs/                         # Documentation
├── project_info.json             # Project metadata
└── README.md                     # This file
```

---

## 🧪 Auto Test

The project includes built-in self-test capabilities as required.

### Run Self-Test via API

```bash
curl http://localhost:3000/api/test
```

### Run Self-Test Script

```bash
cd src/backend
npm test
```

### Tests Include:
- ✅ Database Connection
- ✅ Crontab Service
- ✅ Cron Expression Parser
- ✅ Logging System
- ✅ Configuration
- ✅ Authentication
- ✅ API Endpoints

---

## 🛠️ Technologies

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | Web framework |
| SQLite | 3.x | Database |
| JWT | 9.x | Authentication |
| Winston | 3.x | Logging |
| Zod | 3.x | Validation |
| cronstrue | 2.x | Cron parsing |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| Axios | 1.x | HTTP client |
| Lucide React | - | Icons |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Student Name**

Project for: **Açık Kaynak Sistemleri** (Open Source Systems) Course

---

<div align="center">

Made with ❤️ using Node.js and React

</div>
