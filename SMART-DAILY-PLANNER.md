# Smart Daily Planner

- Adds a dashboard planner for a chosen date.
- Summarizes saved events, booked time, open time, and overlapping events.
- Shows a time-ordered agenda with category-based hints; this is a default heuristic, not a user-defined priority system.
- Suggests uninterrupted 30/60/90/120-minute focus blocks between 07:00 and 22:00.
- `Plan focus` opens the existing schedule form prefilled with a date and time; the user must review and save. No existing schedule is moved automatically.
- Does not update Apple Calendar events.

## Apply
Replace `index.html`, `style.css`, `app.js`, and `sw.js` with these package versions. Keep your existing `manifest.json` and `assets` folder. Back up the project first and test the planner in the browser before deploying.
