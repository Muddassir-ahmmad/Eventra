import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import { formatEventDateDisplay, getEventTotalDays, isEventPastOrCompleted } from "../utils/eventTiming";
import "../participant-dashboard.css";

export default function ParticipantDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("email") || searchParams.get("query") || localStorage.getItem("eventra_participant_email") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeSearch, setActiveSearch] = useState(initialQuery);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const organizerToken = typeof window !== "undefined" ? localStorage.getItem("eventra_token") : null;

  useEffect(() => {
    if (initialQuery.trim()) {
      performLookup(initialQuery.trim());
    }
  }, []);

  async function performLookup(searchVal) {
    const targetQuery = (searchVal || "").trim();
    if (!targetQuery) return;
    setLoading(true);
    setError("");
    setHasSearched(true);
    setActiveSearch(targetQuery);

    try {
      const isEmail = targetQuery.includes("@");
      const paramKey = isEmail ? "email" : "phone";
      const { data } = await api.get(`/registrations/participant/lookup?${paramKey}=${encodeURIComponent(targetQuery)}`);
      setRegistrations(data.registrations || []);

      if (isEmail) {
        localStorage.setItem("eventra_participant_email", targetQuery);
      } else {
        localStorage.setItem("eventra_participant_phone", targetQuery);
      }
      // Immediately clear the search input field so user can start a fresh search
      setQuery("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not retrieve your registrations. Please verify your email or phone.");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ query: query.trim() });
      performLookup(query.trim());
    }
  }

  function clearResults() {
    setRegistrations([]);
    setHasSearched(false);
    setActiveSearch("");
    setQuery("");
    setError("");
    setSearchParams({});
    localStorage.removeItem("eventra_participant_email");
    localStorage.removeItem("eventra_participant_phone");
  }

  // Reliable PDF download handler for Ticket Passes
  async function downloadTicketPdf(regId) {
    try {
      setDownloadingId(`ticket-${regId}`);
      const res = await api.get(`/registrations/ticket/${regId}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `eventra-ticket-${regId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not download ticket PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  // Reliable PDF download handler for Certificates
  async function downloadCertificatePdf(regId) {
    try {
      setDownloadingId(`cert-${regId}`);
      const res = await api.get(`/certificates/public/${regId}/download`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `eventra-certificate-${regId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Certificate not yet available or feedback survey pending.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="participant-page-root">
      {/* Participant Header Navigation */}
      <nav className="participant-nav">
        <Link to="/participant/dashboard" className="participant-brand">
          EVENT<span>RA</span>
        </Link>
        <div className="participant-nav-actions">
          <Link to="/" style={{ color: "#94a3b8", fontSize: "0.88rem", textDecoration: "none" }}>
            Explore Events
          </Link>
          {organizerToken ? (
            <Link
              to="/dashboard"
              style={{
                fontSize: "0.82rem",
                color: "#c4b5fd",
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(124, 77, 255, 0.15)",
                textDecoration: "none",
                border: "1px solid rgba(124, 77, 255, 0.3)",
              }}
            >
              Organizer Dashboard →
            </Link>
          ) : (
            <Link
              to="/login"
              style={{
                fontSize: "0.82rem",
                color: "#94a3b8",
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                textDecoration: "none",
              }}
            >
              Organizer Login
            </Link>
          )}
        </div>
      </nav>

      {/* Hero & Search Section */}
      <section className="participant-hero-section">
        <span className="participant-kicker">✦ ATTENDEE &amp; PARTICIPANT PORTAL</span>
        <h1>My Tickets &amp; Certificates</h1>
        <p>
          Access your digital admission passes, event QR codes, verified attendance certificates,
          and feedback surveys in one unified participant workspace.
        </p>

        <form onSubmit={handleSearch} className="participant-search-bar">
          <input
            type="text"
            placeholder="Enter your registered email or phone number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: 0,
                color: "#94a3b8",
                fontSize: "1rem",
                cursor: "pointer",
                padding: "0 8px",
              }}
              title="Clear input"
            >
              ✕
            </button>
          )}
          <button type="submit" className="button button-primary" style={{ padding: "10px 20px" }}>
            {loading ? "Searching…" : "Find My Passes"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 16, color: "#f87171", fontSize: "0.9rem" }}>
            ⚠️ {error}
          </div>
        )}
      </section>

      {/* Results Section */}
      <section className="participant-tickets-container">
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#94a3b8" }}>Searching for your event registrations...</p>
          </div>
        )}

        {!loading && hasSearched && registrations.length === 0 && (
          <div className="participant-empty-box">
            <span className="participant-empty-icon">🎟️</span>
            <h3 style={{ fontSize: "1.3rem", color: "#ffffff", margin: "0 0 8px" }}>No Registrations Found</h3>
            <p style={{ color: "#94a3b8", maxWidth: 440, margin: "0 auto 20px", fontSize: "0.92rem" }}>
              We could not find any active tickets under "{activeSearch}". Double check your email or phone number,
              or browse upcoming public events.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button type="button" onClick={clearResults} className="btn-clear-search">
                ✕ Clear Search
              </button>
              <Link to="/" className="button button-primary">
                Explore Available Events
              </Link>
            </div>
          </div>
        )}

        {!loading && !hasSearched && registrations.length === 0 && (
          <div className="participant-empty-box">
            <span className="participant-empty-icon">🔍</span>
            <h3 style={{ fontSize: "1.3rem", color: "#ffffff", margin: "0 0 8px" }}>Look Up Your Passes</h3>
            <p style={{ color: "#94a3b8", maxWidth: 480, margin: "0 auto 20px", fontSize: "0.92rem" }}>
              Enter the email address or phone number you used when booking an event ticket to view your live passes,
              download vector PDFs, and access attendance certificates.
            </p>
          </div>
        )}

        {!loading && registrations.length > 0 && (
          <div>
            <div className="participant-search-meta">
              <div className="participant-search-meta-text">
                Showing passes for: <strong>{activeSearch}</strong> &nbsp;·&nbsp; Found <strong>{registrations.length}</strong> registration{registrations.length > 1 ? "s" : ""}
              </div>
              <div className="participant-search-meta-actions">
                <button
                  type="button"
                  onClick={() => performLookup(activeSearch)}
                  style={{ background: "transparent", border: 0, color: "#a78bfa", fontSize: "0.82rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  ↻ Refresh
                </button>
                <button
                  type="button"
                  onClick={clearResults}
                  className="btn-clear-search"
                  title="Remove results and clear search"
                >
                  ✕ Clear Results
                </button>
              </div>
            </div>

            <div className="participant-grid">
              {registrations.map((reg) => {
                const event = reg.eventId || {};
                const isMulti = event.eventDurationType === "multi_day" || (Array.isArray(event.days) && event.days.length > 1);
                const eventDate = isMulti
                  ? formatEventDateDisplay(event)
                  : event.date
                  ? new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Date TBD";

                const isCheckedIn = reg.checkedIn === true;
                const isExpired = isEventPastOrCompleted(event);
                const requireFeedback = event.requireFeedbackForCertificate === true;
                const feedbackSubmitted = reg.feedbackSubmitted === true;
                const canDownloadCert = isCheckedIn && (!requireFeedback || feedbackSubmitted);

                return (
                  <article key={reg._id} className="participant-card">
                    {/* Cover Banner */}
                    <div className="participant-card-cover">
                      {event.posterUrl && <img src={event.posterUrl} alt={event.title} />}
                      <span className={`participant-card-status-badge ${isCheckedIn ? "attended" : isExpired ? "expired" : "upcoming"}`}>
                        {isCheckedIn ? "✓ Attended" : isExpired ? "🛑 Event Ended · Expired" : "Confirmed Pass"}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="participant-card-body">
                      <h3>{event.title || "Event Name"}</h3>

                      <div className="participant-meta-row">
                        <span>📅</span>
                        <span>{eventDate} {event.startTime ? `· ${event.startTime}` : ""}</span>
                      </div>

                      <div className="participant-meta-row">
                        <span>📍</span>
                        <span>{event.mode === "online" ? "Virtual Online Event" : event.venue || "Venue Announced Soon"}</span>
                      </div>

                      <div className="participant-ticket-pill">
                        <div>
                          <span>{isExpired ? "REGISTRATION ID (EXPIRED)" : "REGISTRATION ID"}</span>
                          <strong style={{
                            textDecoration: isExpired ? "line-through" : "none",
                            color: isExpired ? "#94a3b8" : "#818cf8",
                          }}>
                            {reg.registrationId}
                          </strong>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span>TIER</span>
                          <div style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>{reg.ticketType || "General"}</div>
                        </div>
                      </div>

                      {/* Enrolled Sessions Breakdown */}
                      {Array.isArray(reg.selectedSessions) && reg.selectedSessions.length > 0 && (
                        <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                              Selected Sessions ({reg.selectedSessions.length})
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700 }}>
                              {(reg.attendedSessions || []).length}/{reg.selectedSessions.length} Attended
                            </span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {reg.selectedSessions.map((sid) => {
                              const allS = (event.days || []).flatMap((d) => d.sessions || []);
                              const ses = allS.find((s) => String(s.sessionId) === String(sid));
                              const isAttended = (reg.attendedSessions || []).includes(String(sid));
                              const isCancelled = ses?.status === "CANCELLED";
                              return (
                                <div key={sid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                                    <strong style={{ color: "#ffffff" }}>{ses ? ses.title : `Session #${sid}`}</strong>
                                    {ses?.startTime && <span style={{ color: "#94a3b8", marginLeft: 6, fontSize: "0.74rem" }}>({ses.startTime}{ses.endTime ? ` - ${ses.endTime}` : ""})</span>}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      whiteSpace: "nowrap",
                                      background: isAttended
                                        ? "rgba(16, 185, 129, 0.16)"
                                        : isCancelled
                                        ? "rgba(239, 68, 68, 0.16)"
                                        : "rgba(148, 163, 184, 0.12)",
                                      border: `1px solid ${
                                        isAttended
                                          ? "rgba(16, 185, 129, 0.3)"
                                          : isCancelled
                                          ? "rgba(239, 68, 68, 0.3)"
                                          : "rgba(148, 163, 184, 0.2)"
                                      }`,
                                      color: isAttended ? "#6ee7b7" : isCancelled ? "#fca5a5" : "#94a3b8",
                                    }}
                                  >
                                    {isAttended ? "✓ Present" : isCancelled ? "Cancelled" : "Pending"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action Links */}
                      <div className="participant-card-actions">
                        <Link
                          to={`/tickets/${reg.registrationId}`}
                          className={isExpired ? "button button-ghost" : "button button-primary"}
                          style={{ textAlign: "center", textDecoration: "none", fontSize: "0.86rem" }}
                        >
                          {isExpired ? "📋 View Ticket Details (Pass Expired)" : "🎟️ View Digital QR Pass"}
                        </Link>

                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => {
                            if (!isExpired) downloadTicketPdf(reg.registrationId);
                          }}
                          disabled={isExpired || downloadingId === `ticket-${reg.registrationId}`}
                          style={{
                            fontSize: "0.84rem",
                            opacity: isExpired ? 0.5 : 1,
                            cursor: isExpired ? "not-allowed" : "pointer",
                            borderColor: isExpired ? "rgba(244, 63, 94, 0.3)" : undefined,
                            color: isExpired ? "#fca5a5" : undefined,
                          }}
                          title={isExpired ? "Event date has passed. Ticket pass is expired." : "Download ticket PDF"}
                        >
                          {isExpired ? "🛑 Ticket Pass Expired" : downloadingId === `ticket-${reg.registrationId}` ? "Generating PDF…" : "📥 Download Ticket PDF"}
                        </button>

                        {/* Certificate Button if Attended */}
                        {isCheckedIn ? (
                          canDownloadCert ? (
                            <button
                              type="button"
                              className="button"
                              onClick={() => downloadCertificatePdf(reg.registrationId)}
                              disabled={downloadingId === `cert-${reg.registrationId}`}
                              style={{ background: "#059669", color: "#ffffff", fontSize: "0.84rem", border: 0 }}
                            >
                              {downloadingId === `cert-${reg.registrationId}` ? "Downloading…" : "🎓 Download Certificate PDF"}
                            </button>
                          ) : (
                            <Link
                              to={`/events/${event._id}/feedback`}
                              className="button button-ghost"
                              style={{ fontSize: "0.82rem", color: "#fbbf24", borderColor: "rgba(251, 191, 36, 0.4)", textAlign: "center", textDecoration: "none" }}
                            >
                              ✍️ Complete Feedback to Unlock Certificate
                            </Link>
                          )
                        ) : isExpired ? (
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "4px 0" }}>
                            Event has concluded · Gate scan expired
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
