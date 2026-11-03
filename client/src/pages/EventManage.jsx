import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

export default function EventManage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get("/events/mine")
      .then(({ data }) => {
        const found = data.events.find((item) => item._id === eventId);
        if (found) setEvent(found);
        else setError("Event not found.");
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load event."));
  }, [eventId]);

  async function deleteEvent() {
    const confirmed = window.confirm(
      `Delete "${event.title}"?\n\nThis action cannot be undone. All event data may be removed.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete(`/events/${eventId}`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete the event.");
      setDeleting(false);
    }
  }

  if (error) {
    return <main className="center-page"><h1>{error}</h1><Link className="button button-primary" to="/dashboard">Back to Dashboard</Link></main>;
  }

  if (!event) {
    return <main className="center-page"><div className="spinner" /><p>Loading event...</p></main>;
  }

  const modules = [
    ["Overview", "⌂", true, ""],
    ["Registrations", "◎", true, `/dashboard/events/${eventId}/registrations`],
    ["Tickets", "▣", false, ""],
    ["Attendance", "✓", false, ""],
    ["Volunteers", "♙", false, ""],
    ["Certificates", "◇", true, `/dashboard/events/${eventId}/certificates`],
    ["Emails & Delivery", "✉", true, `/dashboard/events/${eventId}/emails`],
    ["Payments", "₹", false, ""],
    ["Analytics", "↗", false, ""]
  ];

  return (
    <main className="manage-page">
      <section className="manage-container">
        <Link className="back-link" to="/dashboard">← All Events</Link>

        <div className="manage-title-row">
          <div>
            <p className="section-kicker">EVENT MANAGEMENT</p>
            <h1>{event.title}</h1>
            <p>{new Date(event.date).toLocaleString()} · {event.venue}</p>
          </div>

          <div className="manage-actions">
            <Link className="button button-ghost" to={`/events/${event.slug}`}>
              View Public Page ↗
            </Link>
            <Link className="button button-primary" to={`/dashboard/events/${eventId}/edit`}>
              ✎ Edit Event
            </Link>
          </div>
        </div>

        <div className="manage-layout">
          <aside className="manage-sidebar">
            <p className="sidebar-label">MANAGE</p>

            {modules.map(([name, icon, active, to]) =>
              active ? (
                <Link key={name} className="sidebar-link" to={to || "#"}>
                  <span>{icon}</span><strong>{name}</strong>
                </Link>
              ) : (
                <button key={name} className="sidebar-link sidebar-disabled">
                  <span>{icon}</span>
                  <div><strong>{name}</strong><small>Coming soon</small></div>
                </button>
              )
            )}

            <div className="sidebar-divider" />
            <Link className="sidebar-link" to={`/dashboard/events/${eventId}/edit`}>
              <span>✎</span><strong>Edit Event</strong>
            </Link>
            <Link className="sidebar-link" to="/create-event">
              <span>＋</span><strong>Create another event</strong>
            </Link>

            <div className="sidebar-danger">
              <button onClick={deleteEvent} disabled={deleting}>
                <span>⌫</span>
                {deleting ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </aside>

          <div className="manage-content">
            <div className="overview-hero">
              <div>
                <span className="live-dot">● {event.status}</span>
                <h2>Event overview</h2>
                <p>Your event workspace. Edit your event whenever you need. Tickets, QR entry, volunteers, certificates, payments and analytics will live here.</p>
              </div>
              <div className="overview-symbol">✦</div>
            </div>

            <div className="overview-grid">
              <Overview title="Registrations" value="—" text={`Maximum ${event.capacity} participants`} to={`/dashboard/events/${eventId}/registrations`} />
              <Overview title="QR Entry" value={event.qrEnabled ? "ON" : "OFF"} text="QR check-in will be activated in the ticket phase." />
              <Overview title="Volunteers" value={event.volunteerEnabled ? "ON" : "OFF"} text="Volunteer management is coming next." />
              <Overview
                title="Certificates"
                value={event.certificateEnabled ? "ON" : "OFF"}
                text="Configure designs, preview certificates and issue them to attendees."
                to={`/dashboard/events/${eventId}/certificates`}
              />
            </div>

            <div className="manage-note">
              <span>✦</span>
              <div>
                <strong>Published events remain editable.</strong>
                <p>If you change the date, venue, capacity, poster or other details, the public event page will use the updated information.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Overview({ title, value, text, to }) {
  const body = <>
    <div><span>{title}</span><strong>{value}</strong></div>
    <p>{text}</p>
    {to && <span className="card-arrow">→</span>}
  </>;
  return to ? <Link className="overview-card" to={to}>{body}</Link> : <div className="overview-card">{body}</div>;
}
