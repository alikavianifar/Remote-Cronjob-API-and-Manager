# Usage Guide

## Getting Started

### 1. First Login

1. Open http://localhost:5173 in your browser
2. Enter the default credentials:
   - **Username**: admin
   - **Password**: admin123
3. Click "Sign In"

### 2. Dashboard Overview

After logging in, you'll see the main dashboard with:

- **Header**: Logo, self-test button, user menu, logout
- **Jobs List**: All configured cronjobs with their status

## Managing Jobs

### Creating a New Job

1. Click the **"+ New Job"** button in the top right
2. Fill in the form:
   - **Job Name**: A descriptive name (e.g., "Database Backup")
   - **Command**: The shell command to execute
   - **Schedule**: Cron expression (use wizard for help)
   - **Description**: Optional description
3. Click **"Create Job"**

### Using the Period Wizard

The Period Wizard helps you create cron expressions visually:

1. In the job form, click **"Use Wizard"**
2. Choose a mode:
   - **Quick Presets**: Common schedules (every minute, hourly, daily, etc.)
   - **Custom Builder**: Build your own schedule with dropdowns
3. Preview the expression and human-readable description
4. Click **"Apply Schedule"**

### Editing a Job

1. Find the job in the list
2. Click the **pencil icon** (✏️)
3. Modify the fields
4. Click **"Update Job"**

### Deleting a Job

1. Find the job in the list
2. Click the **trash icon** (🗑️)
3. Confirm the deletion

### Toggling Job Status

Jobs can be **active** or **paused**:

1. Find the job
2. Click **"Pause"** or **"Activate"** button
3. Paused jobs won't run automatically

## Force Running Jobs

To manually execute a job:

1. Find the job in the list
2. Click **"Force Run"** button
3. Wait for execution to complete
4. View results in the logs

## Viewing Logs

To see execution history:

1. Click the **log icon** (📄) on a job card
2. See all previous executions
3. Click an entry to expand and view:
   - **stdout**: Standard output
   - **stderr**: Error output
   - **Exit code**: 0 = success
   - **Duration**: Execution time
   - **Trigger**: "schedule" or "manual"

## Running Self-Tests

To verify the system is working:

1. Click **"Self-Test"** button in the header
2. Wait for tests to complete
3. See results in the toast notification

## Understanding Job Status

| Status | Color | Meaning |
|--------|-------|---------|
| Active | 🟢 Green | Job is scheduled and will run |
| Paused | 🟡 Yellow | Job won't run until activated |
| Error | 🔴 Red | Last execution failed |

## Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

### Common Expressions

| Expression | Meaning |
|------------|---------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Daily at midnight |
| `0 2 * * *` | Daily at 2 AM |
| `0 0 * * 0` | Weekly on Sunday |
| `0 0 1 * *` | Monthly on 1st |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close modal |

## Troubleshooting

### Can't login?
- Check if backend is running on port 3000
- Verify credentials (admin/admin123)

### Jobs not showing?
- Check backend logs for errors
- Ensure you're authenticated

### Force Run not working?
- Check if job command is valid
- Look at logs for error details
