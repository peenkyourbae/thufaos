# ThufaOS Settings & Privacy Fixes

## What changed
- Moved the Settings section back inside the main application content. Previously it was outside `.app-container` and `<main>`, which could make the view appear blank or render in the wrong layout.
- Removed the duplicate `formatTime()` definition so the saved 12/24-hour preference is respected consistently.
- Made the calendar's first day respect the saved week-start preference (Monday or Sunday).
- Made Settings status updates tolerate missing display nodes without aborting the rest of the status refresh.
- Added a Privacy panel explaining local-only storage, no app-server upload, lack of cross-device sync, and the fact that exported JSON backups are unencrypted.
- Added an explicit, two-step “Delete all schedules” action. It requires confirmation and typing `DELETE`; it does not delete preferences or exported backup files.
- Preserved the existing schedule storage key and PWA/offline shell. No Local Storage migration or automatic clearing was added.

## Checks performed
- `node --check app.js` passed.
- `node --check sw.js` passed.
- Basic HTML nesting validation passed.

## Still requires manual browser QA
- Open Settings from the sidebar at the deployed GitHub Pages URL.
- Switch theme, reload, and verify it persists.
- Switch 12/24-hour format and verify times across Dashboard, Calendar, and All Schedules.
- Toggle week start and verify the visible calendar week changes between Monday-first and Sunday-first.
- Export a JSON backup, import it in a test session, and verify schedules merge as expected.
- Test the delete action only with disposable test schedules or after exporting a backup.
- Verify online/offline behavior on the deployed HTTPS site.

These are code-level fixes and static checks, not a claim that live-browser testing has already been completed.
