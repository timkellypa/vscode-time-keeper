# Change Log

All notable changes to the "vscode-time-keeper" extension will be documented in this file.

## 1.0.0

- Initial release of VSCode Time Keeper
    * Contains commands to start/stop tasks
    * Contains a command to generate a weekly report (timesheet).
    * Contains options to define projects/tasks, custom note support, and the ability to change the granularity of times to allow.

## 1.0.1

- Add `Edit Time Log` function to open a daily time log for manual editing.

## 1.0.2

- Add tests and minor defect fixes.

## 1.0.3

- Start/stop usability enhancements
    - Use more subtle status bar messaging.
        - No link to open file, because there's a task for it.
    - No link to open CSV, just opens externally automatically.
    - Always add 24:00 as an option on time pickers.
    - Show previous line in title when starting a task.

## 1.0.4

- Create sidebar for navigating time logs and starting tasks.
    - Add svelte, rollup, etc.
    - Create sidebar provider and components.
- Minor updates to dates (were incorrectly using UTC when reformatted from strings).
- Minor updates to task timer.
    - Always use projects/tasks (not suggestions).
    - Fix time interval issue causing -15 minutes.
    - Allow date to be passed into all functions (allows date to be specified by sidebar).