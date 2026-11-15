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
  const [selectedPoster, setSelectedPoster] = useState(null);
  const [shareToast, setShareToast] = useState("");
  const [sharingId, setSharingId] = useState(null);

  const organizerToken = typeof window !== "undefined" ? localStorage.getItem("eventra_token") : null;

  async function handleShareEvent(event) {
    if (!event) return;
    setSharingId(event._id);
    const eventUrl = `${window.location.origin}/events/${event.slug || event._id}`;
    const posterLine = event.posterUrl ? `\n🖼️ Official Flyer: ${event.posterUrl}\n` : "";
    const shareText = `🌟 Join me at *${event.title || "this event"}*!\n📍 Venue: ${event.venue || (event.mode === "online" ? "Virtual Online" : "Venue Announced Soon")}${posterLine}\n🎟️ Claim your attendee pass:\n${eventUrl}`;

    try {
      let posterFile = null;
      if (event.posterUrl && typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const res = await fetch(event.posterUrl);
          const blob = await res.blob();
          const cleanTitle = (event.slug || event.title || "event").replace(/[^a-zA-Z0-9_-]/g, "_");
          const ext = blob.type.includes("png") ? "png" : "jpg";
          posterFile = new File([blob], `${cleanTitle}-poster.${ext}`, { type: blob.type || "image/jpeg" });
        } catch (_) {}
      }

      if (posterFile && navigator.canShare && navigator.canShare({ files: [posterFile] })) {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: eventUrl,
          files: [posterFile],
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: eventUrl,
        });
        return;
      }

      navigator.clipboard?.writeText(shareText);
      setShareToast("✓ Event invite & link copied to clipboard!");
      setTimeout(() => setShareToast(""), 3000);
    } catch (err) {
      if (err.name !== "AbortError") {
        navigator.clipboard?.writeText(shareText);
        setShareToast("✓ Event invite & link copied to clipboard!");
        setTimeout(() => setShareToast(""), 3000);
      }
    } finally {
      setSharingId(null);
    }
  }

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
          <Link to="/" style={{ color: "#64748B", fontSize: "0.88rem", textDecoration: "none" }}>
            Explore Events
          </Link>
          {organizerToken ? (
            <Link
              to="/dashboard"
              style={{
                fontSize: "0.82rem",
                color: "#059669",
                padding: "6px 12px",
                borderRadius: 8,
                background: "#ECFDF5",
                textDecoration: "none",
                border: "1px solid #A7F3D0",
                fontWeight: 600,
              }}
            >
              Organizer Dashboard →
            </Link>
          ) : (
            <Link
              to="/login"
              style={{
                fontSize: "0.82rem",
                color: "#334155",
                padding: "6px 12px",
                borderRadius: 8,
                background: "#F1F5F9",
                textDecoration: "none",
                border: "1px solid #E2E8F0",
                fontWeight: 600,
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
            <h3 style={{ fontSize: "1.3rem", color: "#0F172A", margin: "0 0 8px" }}>No Registrations Found</h3>
            <p style={{ color: "#64748B", maxWidth: 440, margin: "0 auto 20px", fontSize: "0.92rem" }}>
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
            <h3 style={{ fontSize: "1.3rem", color: "#0F172A", margin: "0 0 8px" }}>Look Up Your Passes</h3>
            <p style={{ color: "#64748B", maxWidth: 480, margin: "0 auto 20px", fontSize: "0.92rem" }}>
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
                  style={{ background: "transparent", border: 0, color: "#059669", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
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
                      {event.posterUrl ? (
                        <>
                          <img
                            src={event.posterUrl}
                            alt={event.title}
                            className="participant-cover-img"
                          />
                          <div className="participant-cover-overlay" />
                          <button
                            type="button"
                            className="participant-cover-view-btn"
                            onClick={() => setSelectedPoster({ url: event.posterUrl, title: event.title })}
                            title="Click to view full event poster"
                          >
                            🔍 View Flyer
                          </button>
                        </>
                      ) : (
                        <div className="participant-cover-placeholder">
                          <span>EVENTRA</span>
                          <strong>{event.title}</strong>
                        </div>
                      )}
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
                            color: isExpired ? "#94A3B8" : "#059669",
                          }}>
                            {reg.registrationId}
                          </strong>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span>TIER</span>
                          <div style={{ fontSize: "0.85rem", color: "#0F172A", fontWeight: 700 }}>{reg.ticketType || "General"}</div>
                        </div>
                      </div>

                      {/* Enrolled Sessions Breakdown */}
                      {Array.isArray(reg.selectedSessions) && reg.selectedSessions.length > 0 && (
                        <div style={{ marginTop: 12, padding: "12px 14px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: "0.72rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                              Selected Sessions ({reg.selectedSessions.length})
                            </span>
                            <span style={{ fontSize: "0.74rem", color: "#059669", fontWeight: 700 }}>
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
                                <div key={sid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", padding: "6px 0", borderBottom: "1px solid #E2E8F0" }}>
                                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                                    <strong style={{ color: "#0F172A" }}>{ses ? ses.title : `Session #${sid}`}</strong>
                                    {ses?.startTime && <span style={{ color: "#64748B", marginLeft: 6, fontSize: "0.74rem" }}>({ses.startTime}{ses.endTime ? ` - ${ses.endTime}` : ""})</span>}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      padding: "3px 8px",
                                      borderRadius: 6,
                                      whiteSpace: "nowrap",
                                      background: isAttended
                                        ? "#ECFDF5"
                                        : isCancelled
                                        ? "#FEF2F2"
                                        : "#F1F5F9",
                                      border: `1px solid ${
                                        isAttended
                                          ? "#A7F3D0"
                                          : isCancelled
                                          ? "#FECACA"
                                          : "#E2E8F0"
                                      }`,
                                      color: isAttended ? "#059669" : isCancelled ? "#DC2626" : "#64748B",
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

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <Link
                            to={`/events/${event.slug || event._id}`}
                            className="button button-ghost"
                            style={{ textAlign: "center", textDecoration: "none", fontSize: "0.82rem", padding: "8px 10px" }}
                            title="View public event page and flyer"
                          >
                            🌐 Event Page
                          </Link>

                          <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => handleShareEvent(event)}
                            disabled={sharingId === event._id}
                            style={{ textAlign: "center", fontSize: "0.82rem", padding: "8px 10px" }}
                            title="Share event and poster with friends"
                          >
                            {sharingId === event._id ? "Sharing…" : "🔗 Share"}
                          </button>
                        </div>

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
                              style={{ fontSize: "0.82rem", color: "#D97706", borderColor: "#FDE68A", background: "#FFFBEB", textAlign: "center", textDecoration: "none", fontWeight: 600 }}
                            >
                              ✍️ Complete Feedback to Unlock Certificate
                            </Link>
                          )
                        ) : isExpired ? (
                          <span style={{ fontSize: "0.75rem", color: "#64748B", textAlign: "center", padding: "4px 0" }}>
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

      {/* Minimal Footer */}
      <footer
        style={{
          borderTop: "1px solid #E2E8F0",
          background: "#F1F5F9",
          padding: "24px 20px",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "#64748B",
        }}
      >
        Copyright © 2026{" "}
        <Link
          to="/admin/login"
          style={{ color: "#0F172A", fontWeight: 700, textDecoration: "none" }}
        >
          EVENTRA
        </Link>{" "}
        Inc. All rights reserved.
      </footer>

      {/* POSTER LIGHTBOX MODAL */}
      {selectedPoster && (
        <div
          className="poster-lightbox-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPoster(null);
          }}
        >
          <header className="poster-lightbox-header">
            <div className="poster-lightbox-title">
              <span>OFFICIAL FLYER</span>
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedPoster.title}
              </strong>
            </div>

            <div className="poster-lightbox-actions">
              <button
                type="button"
                className="poster-lightbox-close"
                onClick={() => setSelectedPoster(null)}
                aria-label="Close poster view"
              >
                ✕
              </button>
            </div>
          </header>

          <div
            className="poster-lightbox-viewport"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedPoster(null);
            }}
          >
            <img
              src={selectedPoster.url}
              alt={selectedPoster.title}
              className="poster-lightbox-image"
            />
          </div>
        </div>
      )}

      {/* SHARE TOAST NOTIFICATION */}
      {shareToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0F172A",
            color: "#34D399",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            borderRadius: 9999,
            padding: "10px 22px",
            fontSize: "0.88rem",
            fontWeight: 700,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {shareToast}
        </div>
      )}
    </main>
  );
}
