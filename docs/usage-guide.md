# Usage Guide

## Signing in

Open the dashboard (<http://localhost:5173> in development) and sign in with the administrator account. The session lasts as long as the token (24 hours by default) and ends earlier if you click the logout button. If the session expires you are returned to the login page.

## Creating a job

1. Click **+ New Job**.
2. Fill in:
   - **Job Name** – a short label.
   - **Command** – a single-line shell command, for example `/opt/scripts/backup.sh` or `df -h >> /tmp/disk.log`. Pipes, redirects and `&&` work, because the command is run with `/bin/sh -c`, exactly as cron does. Line breaks are not allowed; put multi-line logic in a script.
   - **Schedule** – a cron expression, or use the wizard. A description of the schedule and its next run time appears under the field while you type.
   - **Description** – optional notes.
3. Click **Create Job**. The job is added to the crontab immediately.

## Schedule wizard

Click **Use Wizard** next to the schedule field.

- **Quick Presets** – common schedules such as every 5 minutes, daily at 2 AM or monthly.
- **Custom Builder** – choose each field from a list. If the current expression contains a value the lists do not offer (for example `*/7`), it is shown as "Current (…)" and kept until you change it.

Click **Apply Schedule** to copy the result into the form. Press **Esc** to close the wizard.

## Editing, pausing and deleting

- **Edit** (pencil) – change any field and click **Update Job**.
- **Pause / Activate** – a paused job stays in the list but does not run; it is kept in the crontab as a commented line.
- **Delete** (trash) – asks for confirmation, then removes the job, its logs and its crontab entry.

## Force Run

Click **Force Run** to execute the command now. The button shows a spinner until it finishes, and a notification reports the result:

- green – the command exited with code 0
- yellow – it exited with a non-zero code or exceeded the time limit (60 seconds by default) and was stopped

Force Run also works for paused jobs.

## Logs

Click the document icon on a job to see its execution history, newest first. Click an entry to expand stdout and stderr. Use **Load more** for older entries.

Only runs started with Force Run are recorded. Runs started by cron itself write nothing to this list; if you need their output, redirect it inside the command (for example `… >> /var/log/job.log 2>&1`).

## Self-test

The **Self-Test** button in the header checks the data store, crontab access, the cron parser, token signing and command execution. It does not create or change jobs.

## Status badges

| Badge | Meaning |
|-------|---------|
| Active | The job is in the crontab and will run on schedule |
| Paused | The job is kept as a comment and will not run |

The ✓ / ✗ next to **Last run** shows whether the latest forced run exited with 0.

## Cron expression cheat sheet

| Expression | Meaning |
|------------|---------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Daily at midnight |
| `0 2 * * 1-5` | 02:00 on weekdays |
| `0 0 * * 0` | Weekly, Sunday at midnight |
| `0 0 1 * *` | Monthly, on the 1st |

Times use the server's time zone. See the [API documentation](api-documentation.md#cron-expression-format) for the full syntax.

## Keyboard

| Key | Action |
|-----|--------|
| `Esc` | Close the open dialog (the wizard first, then the form) |

## Things to know

- Jobs are stored in the application's data file, and the crontab is generated from it. Lines in your crontab outside the managed `# BEGIN CRONMGR … # END CRONMGR` block are never touched, but edits inside the block are overwritten.
- `%` characters in commands are escaped automatically (cron would otherwise treat them as line breaks), so `date +%F` works as written.
- Commands run as the user that runs the backend service.
