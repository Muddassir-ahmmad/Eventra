import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

export default function EventManage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // End event modal state
  const [showEndModal, setShowEndModal] = useState(false);
  const [endingEvent, setEndingEvent] = useState(false);
  const [endRequireFeedback, setEndRequireFeedback] = useState(true);
  const [endDeadlineDays, setEndDeadlineDays] = useState(7);
  const [endSuccessMessage, setEndSuccessMessage] = useState("");

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  async function loadEventDetails() {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch {
      try {
        const { data } = await api.get("/events/mine");
        const found = data.events?.find((item) => item._id === eventId);
        if (found) setEvent(found);
        else setError("Event not found.");
      } catch (err) {
        setError(err.response?.data?.message || "Could not load event.");
      }
    }

    try {
      const regRes = await api.get(`/registrations/event/${eventId}`);
      if (regRes.data?.stats) {
        setStats(regRes.data.stats);
      }
    } catch {
      // Non-blocking if registration route is optional
    }
  }

  async function handleEndEvent() {
    setEndingEvent(true);
    setEndSuccessMessage("");
    try {
      const deadline = new Date(Date.now() + endDeadlineDays * 86400000).toISOString();
      const res = await api.post(`/events/${eventId}/end`, {
        requireFeedbackForCertificate: endRequireFeedback,
        feedbackDeadline: deadline,
      });

      setEvent(res.data.event);
      setEndSuccessMessage(res.data.message || "Event marked as completed! Feedback automation triggered.");
      setTimeout(() => {
        setShowEndModal(false);
        setEndSuccessMessage("");
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to end event.");
    } finally {
      setEndingEvent(false);
    }
  }

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
    return (
      <main className="center-page">
        <h1>{error}</h1>
        <Link className="button button-primary" to="/dashboard">
          Back to Dashboard
        </Link>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="center-page">
        <div className="spinner" />
        <p>Loading event...</p>
      </main>
    );
  }

  const modules = [
    ["Overview", "⌂", true, ""],
    ["Registrations", "◎", true, `/dashboard/events/${eventId}/registrations`],
    ["Attendance & QR Entry", "✓", true, `/dashboard/events/${eventId}/attendance`],
    ["Certificates", "◇", true, `/dashboard/events/${eventId}/certificates`],
    ["Emails & Delivery", "✉", true, `/dashboard/events/${eventId}/emails`],
    ["Participant Feedback", "★", true, `/dashboard/events/${eventId}/feedback`],
    ["Post-Event Report", "📄", true, `/dashboard/events/${eventId}/report`],
  ];

  const isDatePassed = event.date ? new Date(event.date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
  const isCompleted = event.status === "completed" || isDatePassed;

  return (
    <main className="manage-page">
      <section className="manage-container">
        <Link className="back-link" to="/dashboard">
          ← All Events
        </Link>

        <div className="manage-title-row">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <p className="section-kicker" style={{ margin: 0 }}>EVENT MANAGEMENT</p>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background:
                    event.status === "completed"
                      ? "rgba(16, 185, 129, 0.15)"
                      : event.status === "published"
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(148, 163, 184, 0.15)",
                  color:
                    event.status === "completed"
                      ? "#34d399"
                      : event.status === "published"
                      ? "#60a5fa"
                      : "#94a3b8",
                  border: `1px solid ${
                    event.status === "completed"
                      ? "rgba(16, 185, 129, 0.3)"
                      : event.status === "published"
                      ? "rgba(59, 130, 246, 0.3)"
                      : "rgba(148, 163, 184, 0.3)"
                  }`,
                }}
              >
                ● {event.status}
              </span>
            </div>
            <h1 style={{ marginTop: 8 }}>{event.title}</h1>
            <p>
              {new Date(event.date).toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · {event.venue}
            </p>
          </div>

          <div className="manage-actions" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link className="button button-ghost" to={`/events/${event.slug}`}>
              View Public Page ↗
            </Link>
            {!isCompleted ? (
              <Link className="button button-primary" to={`/dashboard/events/${eventId}/edit`}>
                ✎ Edit Event
              </Link>
            ) : (
              <span
                className="button button-ghost"
                style={{ opacity: 0.6, cursor: "not-allowed", borderStyle: "dashed" }}
                title="Concluded events cannot be edited; only management is permitted."
              >
                🔒 Editing Locked
              </span>
            )}

            {!isCompleted ? (
              <button
                type="button"
                className="button"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                }}
                onClick={() => setShowEndModal(true)}
              >
                ⏹ End Event
              </button>
            ) : (
              <Link
                className="button"
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  fontWeight: 700,
                }}
                to={`/dashboard/events/${eventId}/report`}
              >
                📄 View Post-Event Report →
              </Link>
            )}
          </div>
        </div>

        <div className="manage-layout">
          <aside className="manage-sidebar">
            <p className="sidebar-label">MANAGE</p>

            {modules.map(([name, icon, active, to]) =>
              active ? (
                <Link key={name} className="sidebar-link" to={to || "#"}>
                  <span>{icon}</span>
                  <strong>{name}</strong>
                </Link>
              ) : (
                <button key={name} className="sidebar-link sidebar-disabled">
                  <span>{icon}</span>
                  <div>
                    <strong>{name}</strong>
                    <small>Coming soon</small>
                  </div>
                </button>
              )
            )}

            <div className="sidebar-divider" />
            {!isCompleted ? (
              <Link className="sidebar-link" to={`/dashboard/events/${eventId}/edit`}>
                <span>✎</span>
                <strong>Edit Event</strong>
              </Link>
            ) : (
              <div className="sidebar-link sidebar-disabled" style={{ opacity: 0.5 }}>
                <span>🔒</span>
                <div>
                  <strong style={{ fontSize: "0.82rem" }}>Edit Locked</strong>
                  <small style={{ color: "#64748b", display: "block" }}>Event concluded</small>
                </div>
              </div>
            )}
            <Link className="sidebar-link" to="/create-event">
              <span>＋</span>
              <strong>Create another event</strong>
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
                <p>
                  Manage the full event lifecycle: registrations, live QR entry desk, digital tickets,
                  verifiable certificates, participant feedback surveys, and AI-assisted post-event reports.
                </p>
              </div>
              <div className="overview-symbol">✦</div>
            </div>

            <div className="overview-grid">
              <Overview
                title="Registrations"
                value={stats ? `${stats.confirmedRegistrations} / ${event.capacity}` : `Max ${event.capacity}`}
                text={`${stats?.cancelledRegistrations || 0} cancelled · Manage participant list & ticket passes`}
                to={`/dashboard/events/${eventId}/registrations`}
              />
              <Overview
                title="QR Entry & Attendance"
                value={stats ? `${stats.attendedParticipants} (${stats.attendancePercentage}%)` : (event.qrEnabled ? "Active" : "Ready")}
                text="Live camera scanner, fast code verification, manual check-in & CSV export."
                to={`/dashboard/events/${eventId}/attendance`}
              />
              <Overview
                title="Certificates"
                value={event.certificateEnabled ? "Enabled" : "Configured"}
                text="Design templates, customize headlines, preview live & issue certificates."
                to={`/dashboard/events/${eventId}/certificates`}
              />
              <Overview
                title="Post-Event Report"
                value={isCompleted ? "Ready" : "Pending"}
                text="Comprehensive metrics, attendee analytics, narrative sections & vector PDF download."
                to={`/dashboard/events/${eventId}/report`}
              />
            </div>

            <div className="manage-note">
              <span>✦</span>
              <div>
                <strong>Smart Closure &amp; Post-Event Automation:</strong>
                <p>
                  When your event finishes, click <strong>"End Event"</strong> to close new registrations,
                  dispatch feedback survey emails to attendees, and unlock the executive post-event report studio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* End Event Modal */}
      {showEndModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 20,
              maxWidth: 540,
              width: "100%",
              padding: 32,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                }}
              >
                ⏹
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#ffffff" }}>
                  End "{event.title}"?
                </h3>
                <small style={{ color: "#94a3b8" }}>
                  Initiate post-event closure and participant engagement
                </small>
              </div>
            </div>

            {endSuccessMessage ? (
              <div
                style={{
                  padding: "16px 20px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 12,
                  color: "#34d399",
                  fontSize: "0.95rem",
                  marginBottom: 16,
                }}
              >
                ✓ {endSuccessMessage}
              </div>
            ) : (
              <>
                <p style={{ color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.6 }}>
                  Ending this event will perform the following automated actions:
                </p>
                <ul
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.88rem",
                    lineHeight: 1.6,
                    paddingLeft: 20,
                    margin: "12px 0 20px",
                  }}
                >
                  <li>Mark the event status as <strong>Completed</strong> and record the end timestamp.</li>
                  <li>Prevent any future participant registrations.</li>
                  <li>Dispatch automated <strong>Feedback Request emails</strong> to all confirmed participants.</li>
                  <li>Enable the <strong>Post-Event Report Studio</strong> with real attendance analytics.</li>
                </ul>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      color: "#e2e8f0",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={endRequireFeedback}
                      onChange={(e) => setEndRequireFeedback(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: "#8b5cf6" }}
                    />
                    Require feedback before issuing certificates
                  </label>
                  <small style={{ color: "#94a3b8", display: "block", marginTop: 6, marginLeft: 28 }}>
                    Participants will only receive certificate access once they complete the feedback survey.
                  </small>

                  <div style={{ marginTop: 14, marginLeft: 28 }}>
                    <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: 4 }}>
                      Feedback Survey Deadline (days from now):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={endDeadlineDays}
                      onChange={(e) => setEndDeadlineDays(Number(e.target.value) || 7)}
                      style={{
                        width: 100,
                        padding: "6px 10px",
                        background: "#020617",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: 8,
                        color: "#ffffff",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => setShowEndModal(false)}
                    disabled={endingEvent}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button"
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 700,
                      padding: "10px 22px",
                    }}
                    onClick={handleEndEvent}
                    disabled={endingEvent}
                  >
                    {endingEvent ? "Finalizing Event..." : "Confirm & End Event"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Overview({ title, value, text, to }) {
  const body = (
    <>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <p>{text}</p>
      {to && <span className="card-arrow">→</span>}
    </>
  );
  return to ? (
    <Link className="overview-card" to={to}>
      {body}
    </Link>
  ) : (
    <div className="overview-card">{body}</div>
  );
}
