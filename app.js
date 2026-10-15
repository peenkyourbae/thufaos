const STORAGE_KEY = "thufaos_schedules_v1";

const $ = (selector) => document.querySelector(selector);

const dashboardView = $("#dashboard-view");
const calendarView = $("#calendar-view");
const schedulesView = $("#schedules-view");
const settingsView = $("#settings-view");
const modal = $("#schedule-modal");
const form = $("#schedule-form");

let schedules = loadSchedules();
let currentView = "dashboard";
let weekOffset = 0;
let selectedDate = dateKey(new Date());
let toastTimer;
const SETTINGS_KEY = "thufaos_preferences_v1";
let preferences = loadPreferences();
let lastBackupExportedAt = localStorage.getItem("thufaos_last_backup_exported_at") || "";

const categories = [
    "Academic",
    "TigaPlus Space",
    "PPIT",
    "Personal",
    "Other"
];

function loadPreferences() {
    const defaults = { theme: "dark", timeFormat: "24", weekStartsMonday: true };
    try {
        return { ...defaults, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) };
    } catch {
        return defaults;
    }
}

function savePreferences() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences));
}

function applyPreferences() {
    const theme = preferences.theme || "dark";
    const resolved = theme === "system"
        ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
        : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.timeFormat = preferences.timeFormat || "24";
}

function formatTime(time) {
    if (!time) return "--:--";
    if ((preferences.timeFormat || "24") === "24") return time;
    const match = String(time).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time;
    const hour = Number(match[1]);
    return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

function loadSchedules() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function saveSchedules() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function exportSchedules() {
    const backup = {
        app: "ThufaOS",
        version: 1,
        exportedAt: new Date().toISOString(),
        schedules: schedules
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const today = dateKey(new Date());

    link.href = url;
    link.download = `thufaos-backup-${today}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    lastBackupExportedAt = new Date().toISOString();
    try { localStorage.setItem("thufaos_last_backup_exported_at", lastBackupExportedAt); } catch {}
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    renderSettingsStatus();

    showToast(`${schedules.length} schedules exported.`);
}

async function importSchedules(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const backup = JSON.parse(text);

        const importedSchedules = Array.isArray(backup)
            ? backup
            : backup.schedules;

        if (!Array.isArray(importedSchedules)) {
            throw new Error("Invalid backup format.");
        }

        const validSchedules = importedSchedules.filter(item =>
            item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.date === "string" &&
            typeof item.start === "string" &&
            typeof item.end === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
            /^\d{2}:\d{2}$/.test(item.start) &&
            /^\d{2}:\d{2}$/.test(item.end)
        );

        if (validSchedules.length !== importedSchedules.length) {
            throw new Error(
                "Some schedules are invalid. No data was imported."
            );
        }

        const confirmed = confirm(
            `Import ${validSchedules.length} schedules?\n\n` +
            "Schedules with matching IDs will be updated. " +
            "Other schedules will be kept."
        );

        if (!confirmed) return;

        const merged = new Map(
            schedules.map(item => [item.id, item])
        );

        validSchedules.forEach(item => {
            merged.set(item.id, {
                ...item,
                calendarEventId: item.calendarEventId || null
            });
        });

        schedules = Array.from(merged.values());

        saveSchedules();
        renderAll();

        showToast(
            `Import successful. ${validSchedules.length} schedules processed.`
        );

    } catch (error) {
        console.error("Import failed:", error);

        showToast(
            error.message || "Unable to import backup file."
        );
    }
}

function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(dateString, options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
}) {
    return parseLocalDate(dateString).toLocaleDateString("en-GB", options);
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showToast(message) {
    const toast = $("#toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

function getSortedSchedules(items = schedules) {
    return [...items].sort((a, b) => {
        const first = `${a.date}T${a.start}`;
        const second = `${b.date}T${b.start}`;

        return first.localeCompare(second);
    });
}

function getTodaySchedules() {
    const today = dateKey(new Date());

    return getSortedSchedules(
        schedules.filter(event => event.date === today)
    );
}

function getUpcomingSchedules() {
    const today = dateKey(new Date());

    return getSortedSchedules(
        schedules.filter(event => event.date >= today)
    );
}


function getScheduleDateTime(event, field = "start") {
    const time = event[field] || "00:00";
    const [hours, minutes] = time.split(":").map(Number);
    const date = parseLocalDate(event.date);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
}

function getWeekDates(referenceDate = new Date()) {
    const start = startOfWeek(referenceDate);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function renderDashboardIntelligence() {
    const now = new Date();
    const today = dateKey(now);
    const todayEvents = getSortedSchedules(
        schedules.filter(item => item.date === today)
    );

    // Next event: prefer an event that is currently in progress, otherwise the next future start.
    const upcoming = getSortedSchedules(
        schedules.filter(item => getScheduleDateTime(item, "end") > now)
    );
    const nextEvent = upcoming[0];
    const nextTitle = $("#next-event-title");
    const nextMeta = $("#next-event-meta");
    const nextCountdown = $("#next-event-countdown");
    const nextCard = $("#next-event-card");

    if (nextEvent) {
        const startsAt = getScheduleDateTime(nextEvent, "start");
        const endsAt = getScheduleDateTime(nextEvent, "end");
        const isToday = nextEvent.date === today;
        const isOngoing = startsAt <= now && endsAt > now;

        nextTitle.textContent = nextEvent.title;
        nextMeta.textContent = [
            isToday ? "Today" : formatDate(nextEvent.date, { weekday: "short", day: "numeric", month: "short" }),
            `${formatTime(nextEvent.start)} – ${formatTime(nextEvent.end)}`,
            nextEvent.location || ""
        ].filter(Boolean).join(" · ");

        if (isOngoing) {
            const minutesLeft = Math.max(1, Math.ceil((endsAt - now) / 60000));
            nextCountdown.textContent = `In progress · ${minutesLeft} min left`;
        } else {
            const minutesUntil = Math.max(0, Math.ceil((startsAt - now) / 60000));
            if (minutesUntil < 1) {
                nextCountdown.textContent = "Starting now";
            } else if (minutesUntil < 60) {
                nextCountdown.textContent = `Starts in ${minutesUntil} min`;
            } else if (minutesUntil < 1440) {
                const hours = Math.floor(minutesUntil / 60);
                const minutes = minutesUntil % 60;
                nextCountdown.textContent = `Starts in ${hours}h${minutes ? ` ${minutes}m` : ""}`;
            } else {
                const days = Math.floor(minutesUntil / 1440);
                nextCountdown.textContent = `Starts in ${days} day${days === 1 ? "" : "s"}`;
            }
        }
        nextCard.classList.toggle("is-ongoing", isOngoing);
    } else {
        nextTitle.textContent = "You're all caught up.";
        nextMeta.textContent = "No upcoming events scheduled.";
        nextCountdown.textContent = "Enjoy the free time";
        nextCard.classList.remove("is-ongoing");
    }

    // Daily progress is time-based: events whose end time has passed count as completed.
    const completedToday = todayEvents.filter(
        item => getScheduleDateTime(item, "end") <= now
    ).length;
    const totalToday = todayEvents.length;
    const percent = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;

    $("#daily-progress-number").textContent = `${percent}%`;
    $("#daily-progress-title").textContent = totalToday
        ? `${completedToday} of ${totalToday} completed`
        : "A fresh start";
    $("#daily-progress-caption").textContent = totalToday
        ? `${totalToday - completedToday} event${totalToday - completedToday === 1 ? "" : "s"} left today`
        : "No events scheduled today";
    $("#daily-progress-fill").style.width = `${percent}%`;
    $("#daily-progress-bar").setAttribute("aria-valuenow", String(percent));
    $("#daily-progress-footnote").textContent = totalToday
        ? (percent === 100 ? "Everything on today's list is done." : "Progress updates with your schedule.")
        : "Your day, at your pace.";

    // Weekly overview: current Monday–Sunday, with a compact bar per day.
    const week = getWeekDates(now);
    const weekKeys = week.map(dateKey);
    const weeklyEvents = schedules.filter(item => weekKeys.includes(item.date));
    const counts = week.map(date => schedules.filter(item => item.date === dateKey(date)).length);
    const maxCount = Math.max(1, ...counts);
    const busiestIndex = counts.indexOf(Math.max(...counts));
    const busiestCount = counts[busiestIndex];

    $("#weekly-total").textContent = String(weeklyEvents.length);
    $("#weekly-range-label").textContent =
        `${week[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}–${week[6].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    $("#weekly-days").innerHTML = week.map((date, index) => {
        const key = dateKey(date);
        const isToday = key === today;
        const height = counts[index] ? Math.max(12, Math.round((counts[index] / maxCount) * 34)) : 5;
        return `<div class="weekly-day ${isToday ? "is-today" : ""}" title="${escapeHTML(date.toLocaleDateString("en-GB", { weekday: "long" }))}: ${counts[index]} event${counts[index] === 1 ? "" : "s"}">
            <span class="weekly-bar-wrap"><span class="weekly-bar" style="height:${height}px"></span></span>
            <span class="weekly-day-label">${date.toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
            <span class="weekly-day-count">${counts[index] || "–"}</span>
        </div>`;
    }).join("");

    $("#weekly-summary").textContent = weeklyEvents.length
        ? `${busiestCount} event${busiestCount === 1 ? "" : "s"} on ${week[busiestIndex].toLocaleDateString("en-GB", { weekday: "long" })} · ${Math.round(weeklyEvents.length / 7 * 10) / 10} per day on average`
        : "A little space for everything.";
}



let quickAddDraft = null;

function parseClockToken(token) {
    const normalized = token.toLowerCase().replace(/\./g, "").trim();
    const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = match[3];
    if (minute > 59 || hour > 24 || (meridiem && (hour < 1 || hour > 12))) return null;
    if (meridiem) {
        if (hour === 12) hour = 0;
        if (meridiem === "pm") hour += 12;
    }
    if (hour > 23 || (hour === 24 && minute !== 0)) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseNaturalSchedule(raw) {
    const original = raw.trim();
    if (!original) return null;

    let remaining = original;
    const now = new Date();
    let date = new Date(now);
    date.setHours(0, 0, 0, 0);

    const dateRules = [
        { re: /\bday after tomorrow\b/i, offset: 2 },
        { re: /\btomorrow\b/i, offset: 1 },
        { re: /\btoday\b/i, offset: 0 }
    ];
    let dateMatched = false;
    for (const rule of dateRules) {
        if (rule.re.test(remaining)) {
            date.setDate(date.getDate() + rule.offset);
            remaining = remaining.replace(rule.re, " ");
            dateMatched = true;
            break;
        }
    }

    if (!dateMatched) {
        const weekdayMatch = remaining.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        if (weekdayMatch) {
            const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const target = days[weekdayMatch[1].toLowerCase()];
            let delta = (target - date.getDay() + 7) % 7;
            if (delta === 0) delta = 7;
            date.setDate(date.getDate() + delta);
            remaining = remaining.replace(weekdayMatch[0], " ");
        } else {
            const explicit = remaining.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
            if (explicit) {
                date = new Date(Number(explicit[1]), Number(explicit[2]) - 1, Number(explicit[3]));
                remaining = remaining.replace(explicit[0], " ");
            } else {
                const shortDate = remaining.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
                if (shortDate) {
                    let year = shortDate[3] ? Number(shortDate[3]) : now.getFullYear();
                    if (year < 100) year += 2000;
                    date = new Date(year, Number(shortDate[1]) - 1, Number(shortDate[2]));
                    remaining = remaining.replace(shortDate[0], " ");
                }
            }
        }
    }

    const timeRange = remaining.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?:\s*(?:-|–|—|to|until)\s*)(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    if (!timeRange) return { error: "I couldn't find a start and end time. Try “Meeting tomorrow 2pm to 3pm”." };
    const start = parseClockToken(timeRange[1]);
    const end = parseClockToken(timeRange[2]);
    if (!start || !end || end <= start) return { error: "Please provide a valid time range where the end is later than the start." };

    const timeText = timeRange[0];
    remaining = remaining.replace(timeText, " ");

    let category = "Academic";
    const categories = ["Academic", "TigaPlus Space", "PPIT", "Personal", "Other"];
    const categoryMatch = remaining.match(/\bcategory\s*[:=]?\s*([^,;]+)/i);
    if (categoryMatch) {
        const candidate = categoryMatch[1].trim();
        const found = categories.find(item => item.toLowerCase() === candidate.toLowerCase());
        if (!found) {
            return { error: `“${candidate}” isn't an available category. Use: ${categories.join(", ")}.` };
        }
        category = found;
        remaining = remaining.replace(categoryMatch[0], " ");
    }

    let location = "";
    const locationMatch = remaining.match(/\b(?:at|location)\s*[:=]?\s*([^,;]+)/i);
    if (locationMatch) {
        location = locationMatch[1].trim();
        remaining = remaining.replace(locationMatch[0], " ");
    }

    const title = remaining.replace(/[,\s]+/g, " ").trim().replace(/^[,;:\-]+|[,;:\-]+$/g, "");
    if (!title) return { error: "I found the date and time, but not an event name. Add a title before the date or time." };

    const dateKeyValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { title, date: dateKeyValue, start, end, category, location, reminder: 15 };
}

function showQuickAddPreview(draft) {
    quickAddDraft = draft;
    const preview = $("#quick-add-preview");
    preview.classList.remove("hidden");
    $("#quick-add-confidence").textContent = "Please review";
    $("#quick-preview-title").textContent = draft.title;
    $("#quick-preview-date").textContent = formatDate(draft.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    $("#quick-preview-time").textContent = `${formatTime(draft.start)} – ${formatTime(draft.end)}`;
    $("#quick-preview-category").textContent = draft.category;
    $("#quick-add-hint").textContent = draft.location ? `Location detected: ${draft.location}` : "Check the preview before using this schedule.";
}

function handleQuickAddSubmit(event) {
    event.preventDefault();
    const result = parseNaturalSchedule($("#quick-add-input").value);
    if (!result) return;
    if (result.error) {
        $("#quick-add-hint").textContent = result.error;
        $("#quick-add-preview").classList.add("hidden");
        showToast("Could not parse schedule. Check the example format.");
        return;
    }
    showQuickAddPreview(result);
}

function useQuickAddDraft(openForEditing = false) {
    if (!quickAddDraft) return;
    const draft = { ...quickAddDraft };
    $("#quick-add-preview").classList.add("hidden");
    $("#quick-add-input").value = "";
    if (openForEditing) {
        openModal();
        $("#event-title").value = draft.title;
        $("#event-date").value = draft.date;
        $("#event-start").value = draft.start;
        $("#event-end").value = draft.end;
        $("#event-category").value = draft.category;
        $("#event-location").value = draft.location;
        $("#event-reminder").value = String(draft.reminder || 15);
        showToast("Review the details, then save the schedule.");
    } else {
        // Fill the existing schedule form and submit through its normal validation/storage flow.
        openModal();
        $("#event-title").value = draft.title;
        $("#event-date").value = draft.date;
        $("#event-start").value = draft.start;
        $("#event-end").value = draft.end;
        $("#event-category").value = draft.category;
        $("#event-location").value = draft.location;
        $("#event-reminder").value = String(draft.reminder || 15);
        showToast("Review the details, then tap Save Schedule.");
    }
}


let commandFilter = "all";
let commandQuery = "";

function getCommandScheduleResults() {
    const now = new Date();
    const today = dateKey(now);
    let items = getSortedSchedules();

    if (commandFilter === "today") {
        items = items.filter(item => item.date === today);
    } else if (commandFilter === "upcoming") {
        items = items.filter(item => getScheduleDateTime(item, "end") > now);
    } else if (commandFilter === "conflicts") {
        const conflictIds = new Set();
        const byDate = new Map();
        schedules.forEach(item => {
            if (!byDate.has(item.date)) byDate.set(item.date, []);
            byDate.get(item.date).push(item);
        });
        byDate.forEach(dayItems => {
            const ordered = getSortedSchedules(dayItems);
            for (let i = 0; i < ordered.length; i++) {
                const a = ordered[i], aStart = getScheduleDateTime(a, "start");
                let aEnd = getScheduleDateTime(a, "end");
                if (aEnd <= aStart) aEnd = new Date(aEnd.getTime() + 86400000);
                for (let j = i + 1; j < ordered.length; j++) {
                    const b = ordered[j], bStart = getScheduleDateTime(b, "start");
                    if (bStart >= aEnd) break;
                    let bEnd = getScheduleDateTime(b, "end");
                    if (bEnd <= bStart) bEnd = new Date(bEnd.getTime() + 86400000);
                    if (aStart < bEnd && bStart < aEnd) {
                        conflictIds.add(a.id); conflictIds.add(b.id);
                    }
                }
            }
        });
        items = items.filter(item => conflictIds.has(item.id));
    } else if (commandFilter === "focus") {
        const todayItems = getSortedSchedules(schedules.filter(item => item.date === today)).map(item => ({
            event: item, start: getScheduleDateTime(item, "start"), end: getScheduleDateTime(item, "end")
        })).sort((a,b) => a.start - b.start);
        const ids = new Set();
        for (let i = 0; i < todayItems.length - 1; i++) {
            if ((todayItems[i+1].start - todayItems[i].end) >= 3600000) {
                ids.add(todayItems[i].event.id); ids.add(todayItems[i+1].event.id);
            }
        }
        items = items.filter(item => ids.has(item.id));
    }

    if (commandQuery) {
        const q = commandQuery.toLowerCase();
        items = items.filter(item => [item.title,item.category,item.location,item.description,item.date]
            .some(value => String(value || "").toLowerCase().includes(q)));
    }
    return items;
}

function renderCommandCenter() {
    const input = $("#command-search");
    if (!input) return;
    const results = $("#command-results");
    $("#command-clear").classList.toggle("hidden", !commandQuery);
    document.querySelectorAll("[data-command-filter]").forEach(button =>
        button.classList.toggle("active", button.dataset.commandFilter === commandFilter)
    );
    const active = commandFilter !== "all" || commandQuery.length > 0;
    results.classList.toggle("hidden", !active);
    if (!active) { results.innerHTML = ""; return; }

    const items = getCommandScheduleResults();
    const label = {all:"Search results",today:"Today's schedules",upcoming:"Upcoming schedules",conflicts:"Schedules with conflicts",focus:"Schedules around focus gaps"}[commandFilter];
    if (!items.length) {
        results.innerHTML = '<div class="command-empty"><strong>No matching schedules</strong><span>Try another keyword or filter.</span></div>';
        return;
    }
    results.innerHTML = `<div class="command-results-heading"><span>${label}</span><span>${items.length} result${items.length===1?"":"s"}</span></div>` +
        items.slice(0,8).map(item => `<button type="button" class="command-result" data-command-open="${escapeHTML(item.id)}">
            <span class="command-result-date">${escapeHTML(formatDate(item.date,{weekday:"short",day:"numeric",month:"short"}))}<small>${escapeHTML(formatTime(item.start))}</small></span>
            <span class="command-result-main"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.category||"Uncategorized")}${item.location?` · ${escapeHTML(item.location)}`:""}</small></span><span class="command-result-arrow">↗</span>
        </button>`).join("");
}

function handleCommandSearch(value) {
    const text = value.trim();
    const commands = {"/today":"today","/upcoming":"upcoming","/conflicts":"conflicts","/focus":"focus","/all":"all"};
    const command = commands[text.toLowerCase()];
    if (command) {
        commandFilter = command;
        commandQuery = "";
        $("#command-search").value = "";
    } else {
        commandQuery = text;
    }
    renderCommandCenter();
    renderSettingsStatus();
}

function getEventDurationMinutes(event) {
    const start = getScheduleDateTime(event, "start");
    let end = getScheduleDateTime(event, "end");
    if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    return Math.max(0, (end - start) / 60000);
}

function renderProductivityIntelligence() {
    const now = new Date();
    const today = dateKey(now);
    const todayEvents = getSortedSchedules(schedules.filter(event => event.date === today));
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthEvents = schedules.filter(event => String(event.date || "").startsWith(monthKey));
    const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    $("#monthly-period-label").textContent = now.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    $("#monthly-title").textContent = monthName;

    // Time distribution is calculated from scheduled duration, grouped by category.
    const categoryTotals = new Map();
    monthEvents.forEach(event => {
        const category = event.category || "Uncategorized";
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + getEventDurationMinutes(event));
    });
    const distribution = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const totalMinutes = distribution.reduce((sum, item) => sum + item[1], 0);
    const distributionContainer = $("#time-distribution");

    if (!distribution.length || totalMinutes <= 0) {
        distributionContainer.innerHTML = '<p class="productivity-empty">Add schedules to see your time distribution.</p>';
    } else {
        distributionContainer.innerHTML = distribution.slice(0, 5).map(([category, minutes]) => {
            const percent = Math.round(minutes / totalMinutes * 100);
            const hours = minutes / 60;
            return `<div class="distribution-row">
                <div class="distribution-label-row"><span>${escapeHTML(category)}</span><span>${hours >= 1 ? `${Math.round(hours * 10) / 10}h` : `${Math.round(minutes)}m`} · ${percent}%</span></div>
                <div class="distribution-track"><span style="width:${percent}%"></span></div>
            </div>`;
        }).join("");
    }

    // Detect overlaps when two events on the same date intersect in time.
    const overlaps = [];
    const byDate = new Map();
    schedules.forEach(event => {
        if (!byDate.has(event.date)) byDate.set(event.date, []);
        byDate.get(event.date).push(event);
    });
    byDate.forEach((events, date) => {
        const sorted = getSortedSchedules(events);
        for (let i = 0; i < sorted.length; i++) {
            const first = sorted[i];
            const firstStart = getScheduleDateTime(first, "start");
            let firstEnd = getScheduleDateTime(first, "end");
            if (firstEnd <= firstStart) firstEnd = new Date(firstEnd.getTime() + 86400000);
            for (let j = i + 1; j < sorted.length; j++) {
                const second = sorted[j];
                const secondStart = getScheduleDateTime(second, "start");
                if (secondStart >= firstEnd) break;
                let secondEnd = getScheduleDateTime(second, "end");
                if (secondEnd <= secondStart) secondEnd = new Date(secondEnd.getTime() + 86400000);
                if (firstStart < secondEnd && secondStart < firstEnd) {
                    overlaps.push({ date, first, second });
                }
            }
        }
    });
    $("#conflict-count").textContent = String(overlaps.length);
    $("#conflict-count").classList.toggle("has-conflicts", overlaps.length > 0);
    $("#overlap-list").innerHTML = overlaps.length
        ? overlaps.slice(0, 4).map(item => `<div class="overlap-item">
            <span class="overlap-indicator"></span>
            <div><strong>${escapeHTML(item.first.title)}</strong><span>overlaps with ${escapeHTML(item.second.title)}</span>
            <small>${formatDate(item.date, { weekday: "short", day: "numeric", month: "short" })} · ${formatTime(item.first.start)} / ${formatTime(item.second.start)}</small></div>
        </div>`).join("") + (overlaps.length > 4 ? `<p class="card-footnote">And ${overlaps.length - 4} more conflict${overlaps.length - 4 === 1 ? "" : "s"}.</p>` : "")
        : '<p class="productivity-empty">No schedule conflicts detected.</p>';

    // Focus slots are gaps of at least 60 minutes between today's scheduled events.
    const timedToday = todayEvents.map(event => {
        const start = getScheduleDateTime(event, "start");
        let end = getScheduleDateTime(event, "end");
        if (end <= start) end = new Date(end.getTime() + 86400000);
        return { event, start, end };
    }).sort((a, b) => a.start - b.start);
    const focusSlots = [];
    for (let i = 0; i < timedToday.length - 1; i++) {
        const gapStart = timedToday[i].end;
        const gapEnd = timedToday[i + 1].start;
        const minutes = (gapEnd - gapStart) / 60000;
        if (minutes >= 60) focusSlots.push({ start: gapStart, end: gapEnd, minutes });
    }
    const focusMinutes = focusSlots.reduce((sum, slot) => sum + slot.minutes, 0);
    $("#focus-total").textContent = focusMinutes >= 60
        ? `${Math.floor(focusMinutes / 60)}h${Math.round(focusMinutes % 60) ? ` ${Math.round(focusMinutes % 60)}m` : ""}`
        : `${Math.round(focusMinutes)}m`;
    $("#focus-description").textContent = focusSlots.length
        ? `${focusSlots.length} open slot${focusSlots.length === 1 ? "" : "s"} of at least 1 hour between events.`
        : "No gaps of 1 hour or more between today's events.";
    $("#focus-slots").innerHTML = focusSlots.length
        ? focusSlots.map(slot => `<div class="focus-slot"><span class="focus-slot-icon">↗</span><div><strong>${formatTime(`${String(slot.start.getHours()).padStart(2,"0")}:${String(slot.start.getMinutes()).padStart(2,"0")}`)} – ${formatTime(`${String(slot.end.getHours()).padStart(2,"0")}:${String(slot.end.getMinutes()).padStart(2,"0")}`)}</strong><small>${slot.minutes >= 60 ? `${Math.floor(slot.minutes / 60)}h${Math.round(slot.minutes % 60) ? ` ${Math.round(slot.minutes % 60)}m` : ""} available` : `${Math.round(slot.minutes)}m available`}</small></div></div>`).join("")
        : '<p class="productivity-empty">Try leaving a little breathing room between events.</p>';

    // Monthly summary metrics are derived from the schedule list, not task-completion data.
    const activeDays = new Set(monthEvents.map(event => event.date)).size;
    const scheduledMinutes = monthEvents.reduce((sum, event) => sum + getEventDurationMinutes(event), 0);
    $("#monthly-total").textContent = String(monthEvents.length);
    $("#monthly-active-days").textContent = String(activeDays);
    $("#monthly-hours").textContent = `${Math.round(scheduledMinutes / 60 * 10) / 10}h`;
    const busiest = new Map();
    monthEvents.forEach(event => busiest.set(event.date, (busiest.get(event.date) || 0) + 1));
    const busiestEntry = [...busiest.entries()].sort((a, b) => b[1] - a[1])[0];
    $("#monthly-summary").textContent = monthEvents.length
        ? `${busiestEntry ? `${busiestEntry[1]} events on your busiest day` : "No busy days"} · based on scheduled time`
        : "Your month at a glance.";
}

function renderDashboard() {
    const now = new Date();
    const today = dateKey(now);

    const hour = now.getHours();

    $("#greeting").textContent =
        hour < 12 ? "GOOD MORNING" :
        hour < 18 ? "GOOD AFTERNOON" :
        "GOOD EVENING";

    $("#welcome-title").textContent =
        hour < 12 ? "Let's make today count." :
        hour < 18 ? "Keep your day on track." :
        "Let's wrap up your day.";

    $("#today-label").textContent = formatDate(today);

    $("#today-count").textContent = getTodaySchedules().length;

    $("#upcoming-count").textContent =
        schedules.filter(event => event.date >= today).length;

    $("#category-count").textContent = categories.length;
    renderDashboardIntelligence();
    renderProductivityIntelligence();

    renderAgendaList(
        $("#today-agenda"),
        getTodaySchedules(),
        "No events scheduled for today.",
        true
    );

    const upcoming = getUpcomingSchedules().filter(
        event => event.date !== today
    );

    renderAgendaList(
        $("#upcoming-agenda"),
        upcoming.slice(0, 5),
        "Nothing coming up. Enjoy your free time!"
    );
}

function renderAgendaList(container, items, emptyMessage, showToday = false) {
    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>All clear!</strong>
                ${escapeHTML(emptyMessage)}
            </div>
        `;

        return;
    }

    const now = new Date();

    container.innerHTML = items.map(event => {
        const startsAt = getScheduleDateTime(event, "start");
        const endsAt = getScheduleDateTime(event, "end");
        const status = endsAt <= now
            ? "past"
            : startsAt <= now && endsAt > now
                ? "current"
                : "upcoming";
        const statusLabel = status === "past"
            ? "Elapsed"
            : status === "current"
                ? "Happening now"
                : "Upcoming";

        return `
        <article class="agenda-card agenda-${status}">

            <div class="agenda-time">
                ${escapeHTML(formatTime(event.start))}
                <br>
                <span style="color:var(--muted);font-weight:400">
                    ${escapeHTML(formatTime(event.end))}
                </span>
            </div>

            <div class="agenda-details">

                <div class="agenda-title-row">
                    <h3>${escapeHTML(event.title)}</h3>
                    <span class="agenda-status status-${status}">
                        ${status === "current" ? '<span class="status-pulse"></span>' : ""}
                        ${statusLabel}
                    </span>
                </div>

                <p>
                    ${showToday ? "" :
                    escapeHTML(formatDate(event.date, {
                        weekday: "short",
                        day: "numeric",
                        month: "short"
                    })) + " · "}
                    ${event.location ?
                    "📍 " + escapeHTML(event.location) :
                    "No location specified"}
                </p>

                <div class="agenda-meta">
                    <span class="category-badge">
                        ${escapeHTML(event.category)}
                    </span>

                    ${event.reminder !== null &&
                      event.reminder !== undefined ? `
                        <span class="category-badge">
                            ${event.reminder === 0
                                ? "At event time"
                                : event.reminder >= 1440
                                    ? "1 day reminder"
                                    : `${event.reminder} min reminder`}
                        </span>
                    ` : ""}
                </div>

            </div>

            <div class="agenda-actions">

                <button
                    class="icon-button"
                    data-action="edit"
                    data-id="${escapeHTML(event.id)}"
                    aria-label="Edit schedule"
                    title="Edit"
                >✎</button>

                <button
                    class="icon-button delete"
                    data-action="delete"
                    data-id="${escapeHTML(event.id)}"
                    aria-label="Delete schedule"
                    title="Delete"
                >×</button>

            </div>

        </article>
    `;
    }).join("");
}

function startOfWeek(date) {
    const result = new Date(date);
    const day = result.getDay();
    const mondayFirst = preferences.weekStartsMonday !== false;
    const offset = mondayFirst ? (day === 0 ? -6 : 1 - day) : -day;

    result.setDate(result.getDate() + offset);
    result.setHours(0, 0, 0, 0);

    return result;
}

function getVisibleWeek() {
    const start = startOfWeek(new Date());
    start.setDate(start.getDate() + weekOffset * 7);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);

        return date;
    });
}

function renderCalendar() {
    const week = getVisibleWeek();

    const first = week[0];
    const last = week[6];

    $("#week-label").textContent =
        `${first.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short"
        })} – ${last.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })}`;

    const today = dateKey(new Date());

    $("#week-grid").innerHTML = week.map(date => {
        const key = dateKey(date);

        const count = schedules.filter(event => event.date === key).length;
        const selected = key === selectedDate;
        const maxVisibleCount = Math.max(1, ...getVisibleWeek().map(day =>
            schedules.filter(event => event.date === dateKey(day)).length
        ));
        const intensity = count === 0 ? "load-none" :
            count >= maxVisibleCount * 0.75 ? "load-high" :
            count >= maxVisibleCount * 0.4 ? "load-medium" : "load-low";
        const barHeight = count === 0 ? 3 : Math.max(7, Math.round((count / maxVisibleCount) * 22));

        return `
            <button
                class="day-card ${selected ? "selected" : ""} ${key === today ? "is-today" : ""} ${intensity}"
                data-date="${key}"
                aria-label="${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, ${count} event${count === 1 ? "" : "s"}"
            >
                <span class="day-card-weekday">${date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                <strong>${date.getDate()}</strong>
                <span class="day-load-meter" aria-hidden="true"><span style="height:${barHeight}px"></span></span>
                <small>
                    ${key === today ? "Today" :
                    count ? `${count} event${count > 1 ? "s" : ""}` :
                    "Free"}
                </small>
            </button>
        `;
    }).join("");

    const weekDates = new Set(week.map(dateKey));
    const weeklyEvents = getSortedSchedules(
        schedules.filter(event => weekDates.has(event.date))
    );

    // Calendar Intelligence for the currently visible week.
    const counts = week.map(date => schedules.filter(event => event.date === dateKey(date)).length);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const maxCount = Math.max(0, ...counts);
    const busiestIndex = counts.findIndex(count => count === maxCount);
    const freeDays = counts.filter(count => count === 0).length;

    $("#calendar-week-total").textContent = String(total);
    $("#calendar-busiest-day").textContent = maxCount
        ? week[busiestIndex].toLocaleDateString("en-GB", { weekday: "short" })
        : "—";
    $("#calendar-busiest-count").textContent = maxCount
        ? `${maxCount} event${maxCount === 1 ? "" : "s"} scheduled`
        : "No events yet";
    $("#calendar-free-days").textContent = String(freeDays);

    renderAgendaList(
        $("#week-agenda"),
        weeklyEvents,
        "No schedules in this week."
    );
}

function renderAllSchedules() {
    const selectedCategory = $("#category-filter").value;

    const items = getSortedSchedules(
        schedules.filter(event =>
            selectedCategory === "all" ||
            event.category === selectedCategory
        )
    );

    renderAgendaList(
        $("#all-agenda"),
        items,
        "No schedules found."
    );
}

function renderAll() {
    renderDashboard();
    renderCalendar();
    renderAllSchedules();
    renderCommandCenter();
}

function switchView(view) {
    currentView = view;

    dashboardView.classList.toggle("hidden", view !== "dashboard");
    calendarView.classList.toggle("hidden", view !== "calendar");
    schedulesView.classList.toggle("hidden", view !== "schedules");
    settingsView.classList.toggle("hidden", view !== "settings");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });

    const titles = {
        dashboard: "Dashboard",
        calendar: "Calendar",
        schedules: "All Schedules",
        settings: "Settings"
    };

    $("#page-title").textContent = titles[view];

    renderAll();
}

function openModal(event = null) {
    form.reset();

    $("#schedule-id").value = event?.id || "";

    $("#modal-title").textContent =
        event ? "Edit Schedule" : "Add Schedule";

    $("#event-title").value = event?.title || "";
    $("#event-date").value = event?.date || selectedDate;
    $("#event-start").value = event?.start || "09:00";
    $("#event-end").value = event?.end || "10:00";
    $("#event-category").value = event?.category || "Academic";
    $("#event-location").value = event?.location || "";
    $("#event-description").value = event?.description || "";

    $("#event-reminder").value =
        String(event?.reminder ?? 15);

    modal.classList.remove("hidden");

    setTimeout(() => $("#event-title").focus(), 50);
}

function closeModal() {
    modal.classList.add("hidden");
}

function handleFormSubmit(event) {
    event.preventDefault();

    const id = $("#schedule-id").value;
    const date = $("#event-date").value;
    const start = $("#event-start").value;
    const end = $("#event-end").value;

    if (!date || !start || !end || end <= start) {
        showToast("Please check the date and event times.");
        return;
    }

    const previous = schedules.find(item => item.id === id);

    const schedule = {
        id: id || (crypto.randomUUID
            ? crypto.randomUUID()
            : `schedule-${Date.now()}`),
        title: $("#event-title").value.trim(),
        date,
        start,
        end,
        category: $("#event-category").value,
        location: $("#event-location").value.trim(),
        description: $("#event-description").value.trim(),
        reminder: Number($("#event-reminder").value),
        calendarEventId: previous?.calendarEventId || null,
        createdAt: previous?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    console.log("Schedule:", JSON.stringify(schedule, null, 2));

    if (!schedule.title) {
        showToast("Please enter an event name.");
        return;
    }

    try {
        if (id) {
            schedules = schedules.map(item =>
                item.id === id ? schedule : item
            );
        } else {
            schedules.push(schedule);
        }

        saveSchedules();
    } catch (error) {
        console.error("Could not save schedule:", error);
        showToast("Could not save schedule.");
        return;
    }

    closeModal();
    renderAll();
    showToast(id ? "Schedule updated." : "Schedule saved.");

const [year, month, day] = schedule.date.split("-");

const shortcutInput = [
    schedule.title,
    `${year}-${month}-${day}`,
    schedule.start,
    schedule.end,
    schedule.location,
    schedule.description
].join("\n");
console.log("Shortcut input:", JSON.stringify(shortcutInput));


const shortcutURL =
    "shortcuts://run-shortcut?name=" +
    encodeURIComponent("ThufaOS — Tambah Jadwal") +
    "&input=text&text=" +
    encodeURIComponent(shortcutInput);


console.log("Shortcut input:", JSON.stringify(shortcutInput));
console.log("Shortcut URL:", shortcutURL);

const launchShortcut = confirm(
    "Schedule saved! Open ThufaOS Shortcut to add it to Calendar?"
);

if (launchShortcut) {
    window.location.href = shortcutURL;
}
}

function handleAgendaAction(event) {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;
    const schedule = schedules.find(item => item.id === id);

    if (!schedule) return;

    if (action === "edit") {
        openModal(schedule);
    }

    if (action === "delete") {
        const confirmed = confirm(
            `Delete "${schedule.title}"?`
        );

        if (!confirmed) return;

        schedules = schedules.filter(item => item.id !== id);

        saveSchedules();
        renderAll();

        showToast("Schedule deleted.");
    }
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        switchView(button.dataset.view);
    });
});

$("#open-add").addEventListener("click", () => openModal());
$("#export-schedules").addEventListener("click", exportSchedules);

$("#import-schedules").addEventListener("click", () => {
    $("#import-file").click();
});

$("#import-file").addEventListener("change", async event => {
    const file = event.target.files[0];

    if (file) {
        await importSchedules(file);
    }

    event.target.value = "";
});
$("#close-modal").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);

$("#view-all").addEventListener("click", () => {
    switchView("schedules");
});

$("#previous-week").addEventListener("click", () => {
    weekOffset--;
    renderCalendar();
});

$("#next-week").addEventListener("click", () => {
    weekOffset++;
    renderCalendar();
});

$("#week-grid").addEventListener("click", event => {
    const button = event.target.closest("[data-date]");

    if (!button) return;

    selectedDate = button.dataset.date;
    renderCalendar();
});

$("#category-filter").addEventListener("change", renderAllSchedules);

$("#today-agenda").addEventListener("click", handleAgendaAction);
$("#upcoming-agenda").addEventListener("click", handleAgendaAction);
$("#week-agenda").addEventListener("click", handleAgendaAction);
$("#all-agenda").addEventListener("click", handleAgendaAction);

form.addEventListener("submit", handleFormSubmit);

modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
});

// Keep countdowns and agenda status labels in sync with the clock.
window.setInterval(() => {
    renderAll();
}, 60 * 1000);

function renderSettingsStatus() {
    const count = Array.isArray(schedules) ? schedules.length : 0;
    const setText = (selector, value) => {
        const node = $(selector);
        if (node) node.textContent = value;
    };
    setText("#backup-schedule-count", String(count));
    setText("#settings-schedule-count", String(count));
    setText("#last-backup-time", lastBackupExportedAt
        ? new Date(lastBackupExportedAt).toLocaleString()
        : "Not recorded");
    setText("#backup-status-title", lastBackupExportedAt
        ? "A backup was exported"
        : "No backup recorded yet");
    setText("#backup-status-caption", lastBackupExportedAt
        ? "Export another copy after important changes."
        : "Your schedules currently live in this browser.");
    let health = "Available";
    try {
        localStorage.setItem("__thufaos_health_check", "1");
        localStorage.removeItem("__thufaos_health_check");
    } catch {
        health = "Unavailable";
    }
    setText("#storage-health", health);
}

function initializeSettings() {
    $("#theme-preference").value = preferences.theme || "dark";
    $("#time-format").value = preferences.timeFormat || "24";
    $("#week-start-monday").checked = preferences.weekStartsMonday !== false;
    renderSettingsStatus();
}

$("#theme-preference").addEventListener("change", event => {
    preferences.theme = event.target.value;
    savePreferences();
    applyPreferences();
    showToast("Theme preference saved.");
});
$("#time-format").addEventListener("change", event => {
    preferences.timeFormat = event.target.value;
    savePreferences();
    applyPreferences();
    renderAll();
    showToast("Time format updated.");
});
$("#week-start-monday").addEventListener("change", event => {
    preferences.weekStartsMonday = event.target.checked;
    savePreferences();
    renderAll();
    showToast("Calendar preference saved.");
});
$("#settings-export").addEventListener("click", exportSchedules);
$("#settings-import").addEventListener("click", () => $("#import-file").click());
$("#clear-schedules").addEventListener("click", () => {
    if (!schedules.length) {
        showToast("There are no schedules to delete.");
        return;
    }
    const firstConfirm = confirm(`Delete all ${schedules.length} schedules from this browser?\n\nThis cannot be undone unless you have exported a backup.`);
    if (!firstConfirm) return;
    const secondConfirm = prompt('Type DELETE to permanently remove all schedules from this browser.');
    if (secondConfirm !== "DELETE") {
        showToast("Deletion cancelled.");
        return;
    }
    schedules = [];
    try {
        saveSchedules();
        renderAll();
        renderSettingsStatus();
        showToast("All schedules were deleted from this browser.");
    } catch (error) {
        showToast("Could not delete schedules. Browser storage may be unavailable.");
        console.error("Schedule deletion failed:", error);
    }
});

$("#command-search").addEventListener("input", event => handleCommandSearch(event.target.value));
$("#command-clear").addEventListener("click", () => {
    commandQuery = "";
    $("#command-search").value = "";
    renderCommandCenter();
    $("#command-search").focus();
});
document.querySelectorAll("[data-command-filter]").forEach(button => {
    button.addEventListener("click", () => {
        commandFilter = button.dataset.commandFilter;
        renderCommandCenter();
    });
});
$("#command-results").addEventListener("click", event => {
    const button = event.target.closest("[data-command-open]");
    if (!button) return;
    const schedule = schedules.find(item => item.id === button.dataset.commandOpen);
    if (schedule) openModal(schedule);
});
document.addEventListener("keydown", event => {
    const target = event.target;
    const typing = target && (target.matches("input, textarea, select") || target.isContentEditable);
    if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        $("#command-search").focus();
    }
    if (event.key === "Escape" && document.activeElement === $("#command-search")) {
        commandQuery = "";
        commandFilter = "all";
        $("#command-search").value = "";
        renderCommandCenter();
        $("#command-search").blur();
    }
});

$("#quick-add-form").addEventListener("submit", handleQuickAddSubmit);
$("#quick-add-edit").addEventListener("click", () => useQuickAddDraft(true));
$("#quick-add-confirm").addEventListener("click", () => useQuickAddDraft(false));

applyPreferences();
initializeSettings();
renderAll();