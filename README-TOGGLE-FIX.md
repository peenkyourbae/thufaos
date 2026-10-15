ThufaOS — Compact Settings Toggle Fix

This patch contains style.css based on the current Smart Daily Planner stylesheet, with an appended high-specificity override for .settings-toggle input[type="checkbox"].

Install:
1. Back up D:\Projects\ThufaOS\style.css.
2. Replace style.css with the file in this package.
3. Hard-refresh the app (Ctrl+Shift+R). Do not clear Local Storage / site data.
4. Verify the Start week on Monday switch is about 36 x 20 px and still toggles.

Only CSS is changed; app.js and schedule data are untouched.
