# ThufaOS — Quick Schedule Completion

## Added
- Mark a schedule completed directly from any agenda card using the small circle/check button.
- Undo completion with the same control.
- Completed schedules show a Completed badge and subdued, struck-through title.
- Dashboard daily progress respects manually completed schedules as well as events whose end time has passed.
- Editing an event preserves its completion state.

## Data safety
- Uses the existing `thufaos_schedules_v1` localStorage record; no new storage key.
- Existing schedules without `completedAt` continue to work.
- No data migration or deletion is performed.

## Files
Replace `app.js` and `style.css` in the existing project. Keep `index.html`, `manifest.json`, `sw.js`, and `assets` from the current project.

## QA
JavaScript syntax check performed. Browser interaction testing is still required.
