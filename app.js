const STORAGE_KEY = "thufaos_schedules_v1";

const $ = (selector) => document.querySelector(selector);

const dashboardView = $("#dashboard-view");
const calendarView = $("#calendar-view");
const schedulesView = $("#schedules-view");
const modal = $("#schedule-modal");
const form = $("#schedule-form");

let schedules = loadSchedules();
let currentView = "dashboard";
let weekOffset = 0;
let selectedDate = dateKey(new Date());
let toastTimer;

const categories = [
    "Academic",
    "TigaPlus Space",
    "PPIT",
    "Personal",
    "Other"
];

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

    setTimeout(() => URL.revokeObjectURL(url), 1000);

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

function formatTime(time) {
    if (!time) return "--:--";

    const [hours, minutes] = time.split(":").map(Number);
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
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

    container.innerHTML = items.map(event => `
        <article class="agenda-card">

            <div class="agenda-time">
                ${escapeHTML(formatTime(event.start))}
                <br>
                <span style="color:var(--muted);font-weight:400">
                    ${escapeHTML(formatTime(event.end))}
                </span>
            </div>

            <div class="agenda-details">

                <h3>${escapeHTML(event.title)}</h3>

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
    `).join("");
}

function startOfWeek(date) {
    const result = new Date(date);
    const day = result.getDay();

    result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
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

        const count = schedules.filter(
            event => event.date === key
        ).length;

        const selected = key === selectedDate;

        return `
            <button
                class="day-card ${selected ? "selected" : ""}"
                data-date="${key}"
            >
                ${date.toLocaleDateString("en-GB", {
                    weekday: "short"
                })}

                <strong>${date.getDate()}</strong>

                <small>
                    ${key === today ? "Today" :
                    count ? `${count} event${count > 1 ? "s" : ""}` :
                    "—"}
                </small>
            </button>
        `;
    }).join("");

    const weekDates = new Set(week.map(dateKey));

    const weeklyEvents = getSortedSchedules(
        schedules.filter(event => weekDates.has(event.date))
    );

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
}

function switchView(view) {
    currentView = view;

    dashboardView.classList.toggle("hidden", view !== "dashboard");
    calendarView.classList.toggle("hidden", view !== "calendar");
    schedulesView.classList.toggle("hidden", view !== "schedules");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });

    const titles = {
        dashboard: "Dashboard",
        calendar: "Calendar",
        schedules: "All Schedules"
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

renderAll();