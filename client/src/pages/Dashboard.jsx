import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setToken } from "../api";

const DISMISSED_NOTIFICATIONS_KEY = "eventra_dismissed_platform_notifications";

const NOTIFICATION_TYPE_META = {
  SECURITY_ALERT: { label: "Security Alert", accent: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
  MAINTENANCE: { label: "Maintenance", accent: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  BILLING_REMINDER: { label: "Billing Reminder", accent: "#38bdf8", bg: "rgba(56, 189, 248, 0.1)" },
  POLICY_UPDATE: { label: "Policy Update", accent: "#a855f7", bg: "rgba(168, 85, 247, 0.1)" },
  ANNOUNCEMENT: { label: "Announcement", accent: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
};

function readDismissedNotifications() {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(readDismissedNotifications);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const [eventsResult, notificationsResult] = await Promise.allSettled([
        api.get("/events/mine"),
        api.get("/organizer/notifications"),
      ]);

      if (eventsResult.status === "fulfilled") {
        setEvents(eventsResult.value.data.events || []);
      } else {
        const err = eventsResult.reason;
        setError(err?.response?.data?.message || "Could not load your events.");
        if (err?.response?.status === 401) {
          setToken(null);
          navigate("/login");
          return;
        }
      }

      if (notificationsResult.status === "fulfilled") {
        setNotifications(notificationsResult.value.data.notifications || []);
      }
    } finally {
      setLoading(false);
    }
  }

  function dismissNotification(id) {
    const next = Array.from(new Set([...dismissedIds, id]));
    setDismissedIds(next);
    try {
      localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }

  const visibleNotifications = notifications.filter((n) => !dismissedIds.includes(n._id));

  const publishedCount = events.filter((e) => e.status === "published").length;
  const completedCount = events.filter((e) => e.status === "completed").length;
  const draftCount = events.filter((e) => e.status === "draft").length;

  return (
    <main className="dashboard-page">
      <section className="dashboard-container">
        <div className="dashboard-welcome">
          <div>
            <p className="section-kicker">ORGANIZER COMMAND CENTER</p>
            <h1>Good to see you again 👋</h1>
            <p>
              Manage your events, live QR attendance, verified tickets, certificates, and post-event analytics.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              className="button button-ghost"
              to="/dashboard/support"
              style={{
                fontSize: "0.88rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#6366f1",
                borderColor: "rgba(99, 102, 241, 0.4)",
                background: "rgba(99, 102, 241, 0.06)",
                fontWeight: 600,
              }}
            >
              🎧 Talk to Admin
            </Link>
            <Link
              className="button button-ghost"
              to="/dashboard/settings"
              style={{
                fontSize: "0.88rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
              }}
            >
              ⚙️ Account Settings
            </Link>
            <Link className="button button-primary" to="/create-event">
              ＋ Create Event
            </Link>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {visibleNotifications.length > 0 && (
          <section
            aria-label="Platform announcements"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 22,
            }}
          >
            {visibleNotifications.slice(0, 3).map((item) => {
              const meta = NOTIFICATION_TYPE_META[item.type] || NOTIFICATION_TYPE_META.ANNOUNCEMENT;
              return (
                <div
                  key={item._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `1px solid ${meta.accent}44`,
                    background: meta.bg,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: `${meta.accent}22`,
                          color: meta.accent,
                          border: `1px solid ${meta.accent}55`,
                        }}
                      >
                        {meta.label}
                      </span>
                      <strong style={{ color: "#f8fafc", fontSize: "0.95rem" }}>{item.title}</strong>
                      {item.createdAt && (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          · {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.86rem", lineHeight: 1.45 }}>
                      {item.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissNotification(item._id)}
                    title="Dismiss announcement"
                    aria-label="Dismiss announcement"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      lineHeight: 1,
                      padding: "2px 6px",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </section>
        )}

        <div className="stats-row">
          <Stat label="Total Events" value={events.length} icon="◈" />
          <Stat label="Published / Live" value={publishedCount} icon="●" />
          <Stat label="Drafts" value={draftCount} icon="◌" />
          <Stat label="Completed" value={completedCount} icon="★" />
        </div>

        <div className="events-section-head">
          <div>
            <h2>Your Events</h2>
            <p>All events created from your organizer account.</p>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-empty">
            <div className="spinner" />
            <p>Loading your events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="dashboard-empty">
            <div className="empty-icon">✦</div>
            <h3>Your first event starts here</h3>
            <p>
              Create an event and EVENTRA will generate a high-converting public landing page and digital pass system.
            </p>
            <Link className="button button-primary" to="/create-event">
              Create First Event
            </Link>
          </div>
        ) : (
          <div className="event-dashboard-grid">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function EventCard({ event }) {
  return (
    <article className="dashboard-event-card">
      <div className="event-cover">
        {event.posterUrl ? (
          <img src={event.posterUrl} alt={event.title} />
        ) : (
          <div className="event-cover-default">
            <span>EVENTRA</span>
            <strong>{event.title}</strong>
          </div>
        )}
        <span className={`event-status ${event.status}`}>{event.status}</span>
      </div>
      <div className="dashboard-event-body">
        <div className="event-date-line">
          ◷{" "}
          {new Date(event.date).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        <h3>{event.title}</h3>
        <p className="event-venue">⌖ {event.venue}</p>
        <div className="capacity-line">
          <div>
            <span>Registration capacity</span>
            <strong>{event.capacity}</strong>
          </div>
          <div className="capacity-track">
            <span />
          </div>
        </div>
        <div className="event-card-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <Link className="button button-primary small" to={`/dashboard/events/${event._id}`}>
            Manage Hub
          </Link>
          <Link className="button button-ghost small" to={`/dashboard/events/${event._id}/attendance`}>
            ✓ Attendance
          </Link>
          <Link className="button button-ghost small" to={`/events/${event.slug}`}>
            View Page ↗
          </Link>
        </div>
      </div>
    </article>
  );
}
