# ThufaOS Productivity Hub + Date Guard Fix

## Changes
- Adds a single **Productivity Hub** sidebar menu.
- Moves Productivity Intelligence and Smart Daily Planner out of the Dashboard and into that menu.
- Updates view switching and page title for the new menu.
- Makes parseLocalDate resilient to missing/invalid values so `.split()` on undefined cannot crash the UI. This fallback is only used for calculations; it does not modify saved schedule data.
- Bumps the service-worker cache name to `thufaos-shell-v3`.

## Install
1. Back up your project folder and export a JSON backup of schedules.
2. Replace `index.html`, `style.css`, `app.js`, and `sw.js` in `D:\Projects\ThufaOS`.
3. Keep your existing `manifest.json` and `assets` folder.
4. Test locally before pushing: Dashboard counts, Productivity Hub, planner date selection, Add Schedule, Edit Schedule, and JSON import.
5. Do not use “Clear site data”; it may remove Local Storage schedule data. If the old UI persists, unregister the service worker and clear Cache Storage only, leaving Local Storage untouched, then reload.

## Git
```powershell
git status
git add index.html style.css app.js sw.js
git diff --cached --stat
git commit -m "feat: combine productivity insights and daily planner hub"
git push origin main
```
