# ThufaOS PWA & Offline Shell (based on uploaded files)

## Files
Replace the project's `index.html`, `style.css`, `app.js`, and `manifest.json` with the matching files in this package, and add `sw.js` to the project root. Keep your existing `assets/` folder and its image files.

## What this adds
- Web app manifest for installable standalone mode.
- Service worker that caches the app shell (`index.html`, `style.css`, `app.js`, `manifest.json`).
- Offline navigation fallback and an online/offline status banner.
- A reload button when a newer service worker is waiting.

## Important limits
- This caches the app shell only. It does not guarantee that every feature works offline.
- Schedule data is still stored in this browser's localStorage. It is not synced or backed up automatically.
- External Google Fonts need internet unless already cached by the browser.
- Service workers require HTTPS (GitHub Pages is HTTPS) or localhost. They do not work when opening `index.html` via `file://`.
- Keep the existing `assets/` folder. The manifest expects `assets/icon-192.png` and `assets/icon-512.png`; the page references `assets/icon.png`, `assets/favicon.png`, and `assets/apple-touch-icon.png`. Verify these files exist before deploying.

## Deploy and test
1. Back up the project folder and export a JSON schedule backup.
2. Replace the four matching files and add `sw.js` to the project root.
3. Commit and push.
4. Open the GitHub Pages site while online and wait for it to finish loading.
5. Refresh once, then use DevTools > Application > Service Workers to confirm the worker is active.
6. Test offline mode by disconnecting the network and reloading.
7. Reconnect, push a tiny version change, and confirm update notification behavior.

Do not treat this as a stable release until the normal schedule CRUD, import/export, Settings, calendar, Quick Add, Command Center, and offline reload are tested in the browser.
