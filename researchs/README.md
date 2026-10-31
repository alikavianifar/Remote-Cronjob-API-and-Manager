# Research Documentation

Background research and design notes written while the project was planned. They describe the reasoning and the options that were considered; the implemented behaviour is documented in the top-level [README](../README.md) and in [`docs/`](../docs).

## Contents

- [`01-technical-architecture.md`](./01-technical-architecture.md): Linux cron internals, Node.js security (safe process spawning), state synchronisation and system architecture.
- [`02-ux-cron-wizard.md`](./02-ux-cron-wizard.md): design notes for the cron schedule wizard.
- [`archive/`](./archive): the original research prompt and raw LLM output that the reports above were based on.

## How the findings were applied

| Finding | In the implementation |
|---------|----------------------|
| Use `spawn` with an argument list instead of `exec` to avoid shell injection | Applied: the `crontab` binary is started without a shell and receives the new table on stdin |
| Keep the application state and the real crontab consistent | Applied differently: the data file is the source of truth, and the crontab's managed block is regenerated from it after each change (no background drift detection) |
| Stream logs in real time with Server-Sent Events | Not implemented: logs are fetched on demand |
| Run the API as an unprivileged user | Recommended deployment, see the README's security notes |
