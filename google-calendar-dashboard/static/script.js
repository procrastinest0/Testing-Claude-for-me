let eventsData = [];
let nextEvent = null;

// Update the clock every second
function updateClock() {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

// Update countdown to next event
function updateCountdown() {
    const banner = document.getElementById("countdown-banner");
    const timerEl = document.getElementById("countdown-timer");
    const nameEl = document.getElementById("countdown-event-name");

    if (!nextEvent) {
        banner.classList.add("hidden");
        return;
    }

    const now = new Date();
    const start = new Date(nextEvent.start);
    const diff = start - now;

    if (diff <= 0) {
        timerEl.textContent = "Now!";
        nameEl.textContent = nextEvent.summary;
        banner.classList.remove("hidden");
        return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${String(minutes).padStart(2, "0")}m`);
    parts.push(`${String(seconds).padStart(2, "0")}s`);

    timerEl.textContent = parts.join(" ");
    nameEl.textContent = nextEvent.summary;
    banner.classList.remove("hidden");
}

// Group events by day
function groupByDay(events) {
    const groups = {};
    for (const event of events) {
        const date = new Date(event.start);
        const key = date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
        });
        if (!groups[key]) groups[key] = [];
        groups[key].push(event);
    }
    return groups;
}

// Format time from ISO string
function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Sanitize text to prevent XSS
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Render events to the DOM
function renderEvents(events) {
    const container = document.getElementById("events-container");

    if (events.length === 0) {
        container.innerHTML = '<div class="loading">No upcoming events</div>';
        return;
    }

    const groups = groupByDay(events);
    let html = "";

    for (const [day, dayEvents] of Object.entries(groups)) {
        html += `<div class="day-group">`;
        html += `<div class="day-header">${escapeHtml(day)}</div>`;

        for (const event of dayEvents) {
            const color = event.calendar_color || "#4285f4";
            const title = escapeHtml(event.summary);
            const linkStart = event.html_link
                ? `<a href="${escapeHtml(event.html_link)}" target="_blank" rel="noopener">`
                : "";
            const linkEnd = event.html_link ? "</a>" : "";

            let timeHtml;
            if (event.all_day) {
                timeHtml = '<div class="event-time-allday">All day</div>';
            } else {
                timeHtml = `
                    <div class="event-time-start">${formatTime(event.start)}</div>
                    <div class="event-time-end">${formatTime(event.end)}</div>
                `;
            }

            let metaHtml = "";
            if (event.location || event.calendar_name) {
                metaHtml = '<div class="event-meta">';
                if (event.location) {
                    metaHtml += `<span class="event-location">${escapeHtml(event.location)}</span>`;
                }
                if (event.calendar_name) {
                    metaHtml += `<span class="event-calendar">${escapeHtml(event.calendar_name)}</span>`;
                }
                metaHtml += "</div>";
            }

            let descHtml = "";
            if (event.description) {
                descHtml = `<div class="event-description">${escapeHtml(event.description)}</div>`;
            }

            html += `
                <div class="event-card" style="border-left-color: ${color}">
                    <div class="event-time">${timeHtml}</div>
                    <div class="event-details">
                        <div class="event-title">${linkStart}${title}${linkEnd}</div>
                        ${metaHtml}
                        ${descHtml}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
    }

    container.innerHTML = html;
}

// Fetch events from the API
async function fetchEvents() {
    try {
        const response = await fetch("/api/events");
        const data = await response.json();

        const errorEl = document.getElementById("error-message");
        const loadingEl = document.getElementById("loading");

        loadingEl.classList.add("hidden");

        if (data.error) {
            errorEl.textContent = data.error;
            errorEl.classList.remove("hidden");
            return;
        }

        errorEl.classList.add("hidden");
        eventsData = data.events;

        // Find next upcoming non-all-day event
        const now = new Date();
        nextEvent = eventsData.find(
            (e) => !e.all_day && new Date(e.start) > now
        ) || null;

        renderEvents(eventsData);
    } catch (err) {
        document.getElementById("loading").classList.add("hidden");
        const errorEl = document.getElementById("error-message");
        errorEl.textContent = "Could not connect to server. Retrying...";
        errorEl.classList.remove("hidden");
    }
}

// Initialize
updateClock();
fetchEvents();

// Tick every second for clock and countdown
setInterval(() => {
    updateClock();
    updateCountdown();
}, 1000);

// Refresh events every 5 minutes
setInterval(fetchEvents, 5 * 60 * 1000);
