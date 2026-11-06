import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setToken } from "../api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const { data } = await api.get("/events/mine");
      setEvents(data.events || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your events.");
      if (err.response?.status === 401) {
        setToken(null);
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }

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
            <Link className="button button-ghost" to="/dashboard/settings" style={{ fontSize: "0.88rem" }}>
              ⚙️ Account Settings
            </Link>
            <Link className="button button-primary" to="/create-event">
              ＋ Create Event
            </Link>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

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
