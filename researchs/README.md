# Research Documentation

This directory contains the in-depth research, technical analysis, and design specifications for the Remote Cronjob API & Manager project.

## Directory Structure

*   [**01-technical-architecture.md**](./01-technical-architecture.md): The core technical report covering Linux internals, Node.js security (safe spawning), Drift Detection, and System Architecture. **Start here.**
*   [**02-ux-cron-wizard.md**](./02-ux-cron-wizard.md): Design specifications for the Cron Period Wizard UI, including the decision tree logic and JSON configuration schema.
*   **archive/**: Contains initial research prompts and results (GPT/LLM outputs) that have been superseded by the formal reports above.

## Key Findings Summary

*   **Security**: Switched from `exec` to `spawn` to prevent Shell Injection.
*   **Stability**: Implemented "Drift Detection" to sync DB with actual crontab state.
*   **Performance**: Recommended Server-Sent Events (SSE) for real-time log streaming.
*   **Market Position**: Positioned as a lightweight, native Crontab manager, unlike heavy alternatives like Rundeck.
