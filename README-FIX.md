# ThufaOS Date Parsing / Add Schedule Fix

## Fixes
- `parseLocalDate()` validates input before calling `split()` and safely handles missing/invalid dates.
- `openModal()` now supplies a valid date when calculating the default estimated duration for a new schedule.
- Keeps the existing schedule storage key and does not clear or migrate Local Storage.

## Install
1. Back up your current `app.js`.
2. Replace only `app.js` with this file.
3. Reload ThufaOS and test Add Schedule, Edit Schedule, and JSON import.
4. Do not clear browser Local Storage.

JavaScript syntax checked with `node --check`; browser interaction testing is still required.
