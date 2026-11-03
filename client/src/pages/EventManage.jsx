import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

export default function EventManage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState(false);

  // End Event Modal State
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);
  const [feedbackDeadline, setFeedbackDeadline] = useState("");
  const [requireFeedbackForCertificate, setRequireFeedbackForCertificate] = useState(false);

  // Post-event live summary
  const [postEventData, setPostEventData] = useState(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    try {
      const { data } = await api.get("/events/mine");
      const found = data.events.find((item) => item._id === eventId);
      if (found) {
        setEvent(found);
        setRequireFeedbackForCertificate(found.requireFeedbackForCertificate === true);
        if (found.feedbackDeadline) {
          setFeedbackDeadline(new Date(found.feedbackDeadline).toISOString().slice(0, 10));
        }

        const isEnded =
          found.status === "completed" ||
          found.status === "closed" ||
          (found.date && new Date(found.date).getTime() < Date.now());

        if (isEnded) {
          loadPostEventSummary();
        }
      } else {
        setError("Event not found.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load event.");
    }
  }

  async function loadPostEventSummary() {
    try {
      const { data } = await api.get(`/events/${eventId}/post-event`);
      setPostEventData(data);
    } catch {
      // Non-critical background fetch
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

  async function handleConfirmEndEvent() {
    setEnding(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/events/${eventId}/end`, {
        feedbackDeadline: feedbackDeadline ? new Date(feedbackDeadline) : null,
        requireFeedbackForCertificate,
      });

      setEvent(data.event);
      setShowEndModal(false);
      const emailText = data.emailResult
        ? ` (${data.emailResult.sent} feedback emails sent, ${data.emailResult.failed} failed)`
        : "";
      setNotice(`Event marked as Completed.${emailText} Post-event automations are now active.`);
      loadPostEventSummary();
    } catch (err) {
      setError(err.response?.data?.message || "Could not end event. Please try again.");
    } finally {
      setEnding(false);
    }
  }

  if (error && !event) {
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

  const isCompleted =
    event.status === "completed" ||
    event.status === "closed" ||
    (event.date && new Date(event.date).getTime() < Date.now());

  const modules = [
    ["Overview", "⌂", true, ""],
    ["Registrations", "◎", true, `/dashboard/events/${eventId}/registrations`],
    ["Tickets", "▣", false, ""],
    ["Attendance", "✓", false, ""],
    ["Volunteers", "♙", false, ""],
    ["Certificates", "◇", true, `/dashboard/events/${eventId}/certificates`],
    ["Participant Feedback", "★", true, `/dashboard/events/${eventId}/feedback`],
    ["Post-Event Report", "📄", true, `/dashboard/events/${eventId}/report`],
    ["Payments", "₹", false, ""],
    ["Analytics", "↗", false, ""],
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
            {event.status !== "completed" && (
              <button
                type="button"
                className="button button-accent"
                style={{ background: "#0f766e", color: "#ffffff", border: "none" }}
                onClick={() => setShowEndModal(true)}
              >
                🏁 End Event
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div className="certificate-alert" style={{ marginBottom: "1.5rem" }} role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="certificate-alert is-error" style={{ marginBottom: "1.5rem" }} role="alert">
            {error}
          </div>
        )}

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
                  <span>{icon}</span><strong>{name}</strong>
                  <em>soon</em>
                </button>
              )
            )}

            <div className="manage-danger-zone">
              <p className="sidebar-label danger-label">DANGER ZONE</p>
              <button
                className="button button-danger full-width"
                onClick={deleteEvent}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </aside>

          <div className="manage-content">
            <div className="overview-hero">
              <div>
                <span className={`live-dot ${event.status === "completed" ? "is-completed" : ""}`}>
                  ● {event.status.toUpperCase()}
                </span>
                <h2>Event overview</h2>
                <p>
                  {isCompleted
                    ? "This event has concluded. Post-event operations including feedback collection, certificate verification, and executive reporting are active."
                    : "Your event workspace. Configure tickets, entry, attendance certificates, and manage registrations."}
                </p>
              </div>
              <div className="overview-symbol">✦</div>
            </div>

            {/* Post-Event Automation Grid (Highlighted when event concluded) */}
            {isCompleted && (
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 1rem 0", color: "#0f766e" }}>
                  POST-EVENT AUTOMATION STATUS
                </h3>
                <div className="overview-grid">
                  <Overview
                    title="Participant Feedback"
                    value={postEventData ? `${postEventData.feedback.submissionsReceived} Received` : "FEEDBACK"}
                    text={postEventData ? `${postEventData.feedback.responseRate}% response rate · ${postEventData.feedback.averageOverallRating || 0}★ rating` : "Review feedback responses."}
                    to={`/dashboard/events/${eventId}/feedback`}
                  />
                  <Overview
                    title="Certificates"
                    value={postEventData ? `${postEventData.certificates.issuedCount} Issued` : "CERTIFICATES"}
                    text={postEventData ? `${postEventData.certificates.eligibleCount} eligible attendees` : "Design and issue credentials."}
                    to={`/dashboard/events/${eventId}/certificates`}
                  />
                  <Overview
                    title="Post-Event Report"
                    value={postEventData?.report.status.toUpperCase() || "AVAILABLE"}
                    text="Comprehensive 12-section audit with real attendance metrics and PDF export."
                    to={`/dashboard/events/${eventId}/report`}
                  />
                </div>
              </div>
            )}

            <div className="overview-grid">
              <Overview
                title="Registrations"
                value={postEventData ? String(postEventData.attendance.totalRegistrations) : "—"}
                text={`Maximum capacity: ${event.capacity} seats`}
                to={`/dashboard/events/${eventId}/registrations`}
              />
              <Overview
                title="QR Attendance"
                value={event.qrEnabled ? (postEventData ? `${postEventData.attendance.attendanceRate}%` : "ON") : "OFF"}
                text={postEventData ? `${postEventData.attendance.attendedCount} checked in · ${postEventData.attendance.absentCount} absent` : "QR check-in attendance verification."}
              />
              <Overview
                title="Volunteers"
                value={event.volunteerEnabled ? "ON" : "OFF"}
                text="Volunteer management and roles."
              />
              <Overview
                title="Certificates"
                value={event.certificateEnabled ? "ON" : "OFF"}
                text={event.requireFeedbackForCertificate ? "Feedback required before issuing" : "Configure designs and issue to attendees."}
                to={`/dashboard/events/${eventId}/certificates`}
              />
              <Overview
                title="Post-Event Report"
                value={isCompleted ? "UNLOCKED" : "UPCOMING"}
                text={isCompleted ? "Review analytics, edit 12 report sections, and download multi-page PDF." : "Unlocks automatically once the event concludes."}
                to={`/dashboard/events/${eventId}/report`}
              />
            </div>

            <div className="manage-note">
              <span>✦</span>
              <div>
                <strong>Post-Event Automation Built-in</strong>
                <p>
                  Ending an event automatically blocks incoming registrations, emails feedback survey links to confirmed attendees, and unlocks official report generation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* End Event Modal Dialog */}
      {showEndModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "0.85rem",
              maxWidth: "520px",
              width: "100%",
              padding: "2rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.75rem" }}>🏁</span>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Conclude & End Event
              </h2>
            </div>

            <p style={{ color: "#475569", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 1.25rem 0" }}>
              Are you sure you want to end <strong>{event.title}</strong>? Concluding the event will:
            </p>

            <ul style={{ color: "#334155", fontSize: "0.9rem", lineHeight: 1.6, paddingLeft: "1.25rem", margin: "0 0 1.5rem 0" }}>
              <li>Update event status to <strong>Completed</strong>.</li>
              <li>Prevent any further participant registrations.</li>
              <li>Trigger automated <strong>Feedback Request Emails</strong> to confirmed attendees.</li>
              <li>Unlock the <strong>Post-Event Report Studio</strong>.</li>
            </ul>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.35rem" }}>
                Feedback Submission Deadline (Optional)
              </label>
              <input
                type="date"
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
                value={feedbackDeadline}
                onChange={(e) => setFeedbackDeadline(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "1.5rem", background: "#f8fafc", padding: "0.85rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={requireFeedbackForCertificate}
                  onChange={(e) => setRequireFeedbackForCertificate(e.target.checked)}
                  style={{ width: "1.25rem", height: "1.25rem", marginTop: "0.15rem", cursor: "pointer" }}
                />
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                    Require Feedback for Certificates
                  </strong>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                    When enabled, attendees must complete the feedback survey before their certificate can be issued.
                  </p>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setShowEndModal(false)}
                disabled={ending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-accent"
                style={{ background: "#0f766e", color: "#ffffff" }}
                onClick={handleConfirmEndEvent}
                disabled={ending}
              >
                {ending ? "Concluding Event..." : "Confirm & End Event"}
              </button>
            </div>
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
