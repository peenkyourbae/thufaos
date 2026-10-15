# Recurring Schedules

- Added repeat options: none, daily (30 days), weekdays (30 days), weekly (12 weeks).
- Occurrences are saved as separate schedule records in the existing localStorage collection, preserving compatibility with existing data and JSON backup/import.
- Each occurrence can be edited or completed independently. Editing an existing event does not regenerate its series.
- Recurrence is finite and local-only; it does not create repeating events in Apple Calendar/Shortcuts.
- Service-worker shell cache bumped to v2 so updated app files can be picked up.

Please test in a browser before deploying.
