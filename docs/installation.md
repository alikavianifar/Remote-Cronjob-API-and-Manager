# Installation Guide

## Prerequisites

Before installing, make sure you have the following installed:

1. **Node.js** (version 18.0.0 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (version 9.0.0 or higher)
   - Comes with Node.js
   - Verify: `npm --version`

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/remote-cronjob-manager.git
cd remote-cronjob-manager
```

### Step 2: Install Backend Dependencies

```bash
cd src/backend
npm install
```

This will install all backend dependencies including:
- express
- better-sqlite3
- jsonwebtoken
- bcryptjs
- cors
- helmet
- winston
- zod
- cronstrue
- uuid

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

This will install all frontend dependencies including:
- react
- react-dom
- axios
- lucide-react
- vite

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd src/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd src/frontend
npm run dev
```

### Production Mode

**Backend:**
```bash
cd src/backend
npm start
```

**Frontend:**
```bash
cd src/frontend
npm run build
npm run preview
```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Self-Test**: http://localhost:3000/api/test

## Default Credentials

- **Username**: admin
- **Password**: admin123

> ⚠️ Change these credentials in production by setting environment variables:
> - `ADMIN_USERNAME`
> - `ADMIN_PASSWORD`

## Environment Variables

Create a `.env` file in `src/backend/` for custom configuration:

```env
# Server
PORT=3000
HOST=localhost

# JWT
JWT_SECRET=your-secure-secret-key
JWT_EXPIRES_IN=24h

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Logging
LOG_LEVEL=info
```

## Troubleshooting

### "better-sqlite3" installation fails
This is a native module. On Windows, you may need:
```bash
npm install --global windows-build-tools
```

### Port already in use
Change the port in environment variables or kill the existing process:
```bash
# Find process
netstat -ano | findstr :3000
# Kill process
taskkill /PID <PID> /F
```

### CORS errors
Make sure the frontend URL is in the CORS origins list in `src/backend/config/index.js`.
