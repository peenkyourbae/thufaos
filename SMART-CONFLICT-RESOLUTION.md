# Smart Conflict Resolution

- Adds a “Find free time” action to each detected overlap in Productivity Intelligence.
- Suggests up to three slots aligned to 30-minute increments between 07:00 and 22:00, preserving the event duration and checking other same-day schedules.
- Moving an event requires confirmation and rechecks for conflicts before saving.
- Only the selected occurrence is moved; other recurring occurrences remain unchanged.
- Suggestions are local and deterministic; they do not modify Apple Calendar events.
- If no slot is found, the app asks the user to edit manually rather than moving anything automatically.
