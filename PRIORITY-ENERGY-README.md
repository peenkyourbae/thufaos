# ThufaOS — Priority & Energy Management

## Files
Replace `index.html`, `style.css`, `app.js`, and `sw.js` in the ThufaOS project with these versions. Keep the existing `assets/` folder and `manifest.json`.

## Added
- Priority: Critical / High / Medium / Low.
- Energy type: Deep Work / Normal / Light Task.
- Estimated effort in minutes.
- Dashboard Smart Daily Planner priority queue for the selected day.
- Priority and energy tags in the chronological recommended flow.
- Existing events without these fields remain compatible (default Medium / Normal; estimated duration falls back to event duration).
- Recurring-series edits propagate the new metadata.
- Service worker cache version bumped.

## Important
This package also fixes the `timeToMinutes is not defined` scope problem by moving shared helper functions and the conflict-resolution listener outside `switchView()`.
Test locally before pushing. Keep a backup of the project. Schedule data remains in the browser's localStorage; do not clear site data to update the app.
