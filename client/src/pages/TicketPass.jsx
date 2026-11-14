import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { formatEventDateDisplay, getEventTotalDays, isEventPastOrCompleted } from "../utils/eventTiming";

export default function TicketPass() {
  const { registrationId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/registrations/ticket/${registrationId}`)
      .then((res) => {
        setData(res.data);
        if (res.data?.registration?.email) {
          localStorage.setItem("eventra_participant_email", res.data.registration.email);
        }
      })
      .catch((err) => setError(err.response?.data?.message || "Ticket pass not found."))
      .finally(() => setLoading(false));
  }, [registrationId]);

  async function downloadTicketPdf() {
    try {
      setDownloading(true);
      const res = await api.get(`/registrations/ticket/${registrationId}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `eventra-ticket-${registrationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not download ticket PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function downloadCertificatePdf() {
    if (!data?.registration?._id) return;
    try {
      setDownloading(true);
      const res = await api.get(`/certificates/public/${data.registration._id}/download`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `eventra-certificate-${registrationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not download certificate PDF. Please ensure feedback is submitted.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main className="public-page-root" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#94a3b8" }}>Generating your digital ticket pass...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="public-page-root" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 440, padding: 30 }}>
          <span style={{ fontSize: "3rem" }}>🎫</span>
          <h1 style={{ fontSize: "1.6rem", margin: "16px 0 8px" }}>Ticket Pass Unavailable</h1>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>{error || "Could not retrieve ticket pass."}</p>
          <Link className="btn-hero-primary" to="/">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const { registration, event } = data;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(registration.registrationId)}`;

  const isAttended = registration.checkedIn === true;
  const isExpired = isEventPastOrCompleted(event);
  const requireFeedback = event.requireFeedbackForCertificate === true;
  const feedbackSubmitted = registration.feedbackSubmitted === true;
  const certificateEligible = isAttended && (!requireFeedback || feedbackSubmitted);

  return (
    <main className="public-page-root" style={{ padding: "40px 20px 80px", position: "relative", background: "#F8F9FA" }}>
      <div style={{ maxWidth: 660, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Navigation Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Link to="/participant/dashboard" className="public-nav-brand" style={{ textDecoration: "none", color: "#0F172A", fontSize: "1.35rem", fontWeight: 800 }}>
            EVENT<span style={{ color: "#059669" }}>RA</span>
          </Link>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              to="/participant/dashboard"
              className="button button-ghost small"
              style={{ textDecoration: "none" }}
            >
              👤 Participant Portal
            </Link>
            <button
              type="button"
              onClick={downloadTicketPdf}
              disabled={isExpired || downloading}
              className="button button-ghost small"
              style={{
                cursor: isExpired ? "not-allowed" : "pointer",
                opacity: isExpired ? 0.5 : 1,
                color: isExpired ? "#DC2626" : "inherit",
              }}
              title={isExpired ? "Ticket pass expired as event admission has ended." : "Download ticket PDF"}
            >
              {isExpired ? "🛑 Expired" : downloading ? "Generating…" : "📥 Download PDF"}
            </button>
            <button
              type="button"
              className="button button-ghost small"
              style={{
                cursor: isExpired ? "not-allowed" : "pointer",
                opacity: isExpired ? 0.5 : 1,
              }}
              onClick={() => {
                if (!isExpired) window.print();
              }}
              disabled={isExpired}
              title={isExpired ? "Printing disabled: Event date has passed." : "Print Pass"}
            >
              🖨️ Print Pass
            </button>
          </div>
        </div>

        {/* Digital Admission Ticket Card */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 24,
            border: "1px solid #E2E8F0",
            overflow: "hidden",
            boxShadow: "0 16px 45px rgba(36, 43, 43, 0.08)",
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              padding: "26px 28px",
              background: "#F1F5F9",
              borderBottom: "2px dashed #E2E8F0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    color: "#059669",
                    textTransform: "uppercase",
                  }}
                >
                  OFFICIAL ADMISSION PASS · EVENTRA
                </span>
                <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "6px 0 0", color: "#0F172A", letterSpacing: "-0.03em" }}>
                  {event.title}
                </h1>
                <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: "0.85rem" }}>
                  📅 {formatEventDateDisplay(event)}
                  {event.eventDurationType === "multi_day" ? ` · ${getEventTotalDays(event)} Days All-Access Pass` : ""}
                </p>
              </div>
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  background: registration.checkedIn
                    ? "rgba(57, 131, 107, 0.12)"
                    : isExpired
                    ? "rgba(198, 93, 85, 0.12)"
                    : "rgba(5, 150, 105, 0.12)",
                  border: `1px solid ${
                    registration.checkedIn ? "#059669" : isExpired ? "rgba(198, 93, 85, 0.4)" : "#059669"
                  }`,
                  color: registration.checkedIn
                    ? "#059669"
                    : isExpired
                    ? "#DC2626"
                    : "#059669",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {registration.checkedIn
                  ? "✓ Attended"
                  : isExpired
                  ? "🛑 Expired · Event Ended"
                  : "● Gate Entry Ready"}
              </span>
            </div>
          </div>

          {/* Ticket Body */}
          <div style={{ padding: "30px 28px", display: "grid", gap: 24, background: "#FFFFFF" }}>
            {/* Participant Details & QR */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 24, alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  TICKET HOLDER
                </span>
                <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: "4px 0 2px", color: "#0F172A", letterSpacing: "-0.02em" }}>
                  {registration.name}
                </h2>
                <p style={{ margin: 0, color: "#64748B", fontSize: "0.88rem" }}>
                  {registration.college} {registration.department ? `· ${registration.department}` : ""}
                </p>

                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                    ADMISSION TIER
                  </span>
                  <p style={{ margin: "2px 0 0", color: "#059669", fontWeight: 700, fontSize: "0.95rem" }}>
                    {registration.ticketType || "General Admission"}
                  </p>
                </div>

                {event.eventDurationType === "multi_day" && Array.isArray(event.days) && event.days.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <span style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6, fontWeight: 700 }}>
                      DAILY CHECK-IN STATUS ({(registration.attendedDays || []).length}/{event.days.length})
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {event.days.map((d) => {
                        const checked = (registration.attendedDays || []).includes(d.dayNumber);
                        return (
                          <span
                            key={d.dayNumber}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 9999,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: checked ? "rgba(57, 131, 107, 0.12)" : "#F1F5F9",
                              border: `1px solid ${checked ? "#059669" : "#E2E8F0"}`,
                              color: checked ? "#059669" : "#64748B",
                            }}
                          >
                            {checked ? "✓ " : ""}{d.title || `Day ${d.dayNumber}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {Array.isArray(registration.selectedSessions) && registration.selectedSessions.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <span style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6, fontWeight: 700 }}>
                      ENROLLED SESSIONS ({(registration.attendedSessions || []).length}/{registration.selectedSessions.length})
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {registration.selectedSessions.map((sesId) => {
                        const allS = (event.days || []).flatMap((d) => d.sessions || []);
                        const ses = allS.find((s) => String(s.sessionId) === String(sesId));
                        const checked = (registration.attendedSessions || []).includes(String(sesId));
                        return (
                          <span
                            key={sesId}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 9999,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: checked ? "rgba(57, 131, 107, 0.12)" : "#F1F5F9",
                              border: `1px solid ${checked ? "#059669" : "#E2E8F0"}`,
                              color: checked ? "#059669" : "#64748B",
                            }}
                          >
                            {checked ? "✓ " : ""}{ses ? ses.title : `Session ${sesId}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic QR Code or Expired State */}
              {isExpired ? (
                <div
                  style={{
                    background: "rgba(198, 93, 85, 0.08)",
                    border: "1px dashed rgba(198, 93, 85, 0.4)",
                    padding: "16px 10px",
                    borderRadius: 16,
                    textAlign: "center",
                    minHeight: 140,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: "2rem" }}>🛑</span>
                  <strong style={{ fontSize: "0.78rem", color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    QR Pass Expired
                  </strong>
                  <span style={{ fontSize: "0.68rem", color: "#64748B", lineHeight: 1.3 }}>
                    Event has ended. Gate scan is closed.
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: 12,
                    borderRadius: 16,
                    textAlign: "center",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <img
                    src={qrUrl}
                    alt={`QR Code for ${registration.registrationId}`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                  <span style={{ fontSize: "0.65rem", color: "#0F172A", fontWeight: 700, display: "block", marginTop: 6, letterSpacing: "0.05em" }}>
                    SCAN FOR ENTRY
                  </span>
                </div>
              )}
            </div>

            {/* Event Schedule & Venue Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                padding: "18px 20px",
                background: "#F1F5F9",
                borderRadius: 14,
                border: "1px solid #E2E8F0",
              }}
            >
              <div>
                <span style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>DATE &amp; TIME</span>
                <strong style={{ display: "block", fontSize: "0.95rem", color: "#0F172A", marginTop: 2 }}>
                  {event.date ? new Date(event.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                </strong>
                <span style={{ fontSize: "0.82rem", color: "#64748B" }}>{event.startTime || "Schedule TBD"}</span>
              </div>

              <div>
                <span style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>VENUE</span>
                <strong style={{ display: "block", fontSize: "0.95rem", color: "#0F172A", marginTop: 2 }}>
                  {event.venue}
                </strong>
                {event.location && /^https?:\/\//i.test(event.location.trim()) ? (
                  <a
                    href={event.location.trim()}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "0.82rem",
                      color: "#059669",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {event.mode === "online" ? "🌐 Join Platform Link ↗" : "🗺️ View Venue on Map ↗"}
                  </a>
                ) : (
                  <span style={{ fontSize: "0.82rem", color: "#64748B" }}>
                    {event.location || (event.mode === "online" ? "Virtual Meeting" : "Main Campus")}
                  </span>
                )}
              </div>
            </div>

            {/* Registration ID Banner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderRadius: 12,
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
              }}
            >
              <div>
                <span style={{ fontSize: "0.82rem", color: "#64748B", fontWeight: 600 }}>Registration ID</span>
                {isExpired && (
                  <span style={{ display: "block", fontSize: "0.68rem", color: "#DC2626", fontWeight: 700, marginTop: 2 }}>
                    ● Pass Expired (Event Ended)
                  </span>
                )}
              </div>
              <strong
                style={{
                  fontSize: "1.05rem",
                  color: isExpired ? "#64748B" : "#059669",
                  textDecoration: isExpired ? "line-through" : "none",
                  letterSpacing: "0.08em",
                }}
              >
                {registration.registrationId}
              </strong>
            </div>

            {/* Certificate Access Banner for Attended Attendees */}
            {isAttended && (
              <div
                style={{
                  padding: "20px 22px",
                  borderRadius: 16,
                  background: certificateEligible
                    ? "rgba(57, 131, 107, 0.1)"
                    : "rgba(197, 138, 59, 0.1)",
                  border: `1px solid ${certificateEligible ? "rgba(57, 131, 107, 0.3)" : "rgba(197, 138, 59, 0.3)"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: certificateEligible ? "#059669" : "#D97706",
                      }}
                    >
                      {certificateEligible ? "📜 CERTIFICATE OF PARTICIPATION READY" : "⏳ FEEDBACK REQUIRED FOR CERTIFICATE"}
                    </span>
                    <h3 style={{ margin: "4px 0 2px", fontSize: "1.05rem", color: "#0F172A" }}>
                      {certificateEligible
                        ? "Your official certificate is issued and ready."
                        : "Complete the survey to claim your certificate."}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748B" }}>
                      {certificateEligible
                        ? "Verified attendance certificate with digital authorization."
                        : "Your feedback helps the organizers improve future events."}
                    </p>
                  </div>

                  {certificateEligible ? (
                    <button
                      type="button"
                      onClick={downloadCertificatePdf}
                      disabled={downloading}
                      className="button button-primary small"
                      style={{ border: 0, cursor: "pointer" }}
                    >
                      {downloading ? "Downloading…" : "📥 Download Certificate PDF"}
                    </button>
                  ) : (
                    <Link
                      to={registration.feedbackToken ? `/feedback/${registration.feedbackToken}` : `/events/${event._id}/feedback`}
                      className="button button-primary small"
                      style={{ textDecoration: "none", background: "#D97706" }}
                    >
                      Complete Feedback Survey →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Important Instructions */}
            <div style={{ fontSize: "0.78rem", color: "#64748B", lineHeight: 1.5 }}>
              <p style={{ margin: "0 0 4px 0" }}>
                • Present this digital ticket or printed pass at the event registration desk.
              </p>
              <p style={{ margin: "0 0 4px 0" }}>
                • Gate entry is verified via single-use secure QR code scan.
              </p>
              {event.organizer?.name && (
                <p style={{ margin: 0 }}>
                  • Organized by <strong>{event.organizer.name}</strong> {event.organizer.organization ? `(${event.organizer.organization})` : ""}.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer
          style={{
            marginTop: 40,
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
      </div>
    </main>
  );
}
