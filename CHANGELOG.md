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

## 1.0.5

- Sidebar enhancements.
   - Use action buttons and compressed UI to fit more tasks.
   - Include project totals view.
   - Track state better, and use for everything.
- Generate report changes.
   - Fix defect with day 1/day 7, when done on Sunday.
   - Include new section in report for project totals.

## 1.0.6

- More sidebar enhancements (improve project summaries).
    - Refactor sidebars to accept a more complex state object.
    - Refactor calculations/parsing for values to only occur in report-info (no more duplicate parsing/calculations).
    - Use full state to include weekly totals and grand totals in summary section.

## 1.0.7

- Fix project summary sorting.
    - Was sorting by totals, descending, which looked strange.
    - Sort by project name instead.

## 1.0.8

- Add notes suggestions for tasks, based on previous notes for current day.
    - Should save copy/pasting for tasks that are repeated throughout the day.

## 1.0.9

- Refactor logic for existing notes.
    - Add notes to ReportInfo data, and use array for the week instead of just the day.
    - Remove additional method written for gathering this info for the current day.