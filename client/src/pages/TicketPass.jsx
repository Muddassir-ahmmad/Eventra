import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { isEventPastOrCompleted } from "../utils/eventTiming";

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
    <main className="public-page-root" style={{ padding: "40px 20px 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Link to="/participant/dashboard" className="public-nav-brand">
            EVENT<span>RA</span>
          </Link>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              to="/participant/dashboard"
              className="btn-hero-secondary"
              style={{ padding: "8px 16px", fontSize: "0.85rem", textDecoration: "none" }}
            >
              👤 Participant Dashboard
            </Link>
            <button
              type="button"
              onClick={downloadTicketPdf}
              disabled={isExpired || downloading}
              className="btn-hero-secondary"
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                cursor: isExpired ? "not-allowed" : "pointer",
                opacity: isExpired ? 0.5 : 1,
                color: isExpired ? "#fca5a5" : "inherit",
                borderColor: isExpired ? "rgba(244, 63, 94, 0.3)" : undefined,
              }}
              title={isExpired ? "Ticket pass expired as event admission has ended." : "Download ticket PDF"}
            >
              {isExpired ? "🛑 Ticket Expired" : downloading ? "Generating…" : "📥 Download PDF"}
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                cursor: isExpired ? "not-allowed" : "pointer",
                opacity: isExpired ? 0.5 : 1,
              }}
              onClick={() => {
                if (!isExpired) window.print();
              }}
              disabled={isExpired}
              title={isExpired ? "Printing disabled: Event date has passed." : "Print Pass"}
            >
              {isExpired ? "🛑 Pass Expired" : "🖨️ Print Pass"}
            </button>
          </div>
        </div>

        {/* Digital Admission Ticket Card */}
        <div
          style={{
            background: "#0c101d",
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              padding: "28px 28px 24px",
              background: "linear-gradient(135deg, #1e1b4b, #312e81)",
              borderBottom: "1px dashed rgba(255, 255, 255, 0.15)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    color: "#a5b4fc",
                    textTransform: "uppercase",
                  }}
                >
                  OFFICIAL ADMISSION PASS
                </span>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "6px 0 0", color: "#ffffff" }}>
                  {event.title}
                </h1>
              </div>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  background: registration.checkedIn
                    ? "rgba(16, 185, 129, 0.2)"
                    : isExpired
                    ? "rgba(244, 63, 94, 0.2)"
                    : "rgba(99, 102, 241, 0.18)",
                  border: `1px solid ${
                    registration.checkedIn ? "#10b981" : isExpired ? "rgba(244, 63, 94, 0.5)" : "#6366f1"
                  }`,
                  color: registration.checkedIn
                    ? "#6ee7b7"
                    : isExpired
                    ? "#fca5a5"
                    : "#a5b4fc",
                  fontSize: "0.75rem",
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
          <div style={{ padding: 28, display: "grid", gap: 24 }}>
            {/* Participant Details & QR */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 20, alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  TICKET HOLDER
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "4px 0 2px", color: "#ffffff" }}>
                  {registration.name}
                </h2>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.88rem" }}>
                  {registration.college} {registration.department ? `· ${registration.department}` : ""}
                </p>

                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    ADMISSION TIER
                  </span>
                  <p style={{ margin: "2px 0 0", color: "#a855f7", fontWeight: 700, fontSize: "0.95rem" }}>
                    {registration.ticketType || "General Admission"}
                  </p>
                </div>
              </div>

              {/* Dynamic QR Code or Expired State */}
              {isExpired ? (
                <div
                  style={{
                    background: "rgba(244, 63, 94, 0.08)",
                    border: "1px dashed rgba(244, 63, 94, 0.4)",
                    padding: "16px 10px",
                    borderRadius: 12,
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
                  <strong style={{ fontSize: "0.78rem", color: "#fb7185", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    QR Pass Expired
                  </strong>
                  <span style={{ fontSize: "0.68rem", color: "#94a3b8", lineHeight: 1.3 }}>
                    Event has ended. Gate scan is closed.
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: "#ffffff",
                    padding: 10,
                    borderRadius: 12,
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <img
                    src={qrUrl}
                    alt={`QR Code for ${registration.registrationId}`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                  <span style={{ fontSize: "0.62rem", color: "#000000", fontWeight: 700, display: "block", marginTop: 4 }}>
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
                gap: 14,
                padding: "16px 20px",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>DATE &amp; TIME</span>
                <strong style={{ display: "block", fontSize: "0.92rem", color: "#ffffff", marginTop: 2 }}>
                  {event.date ? new Date(event.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                </strong>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{event.startTime || "Schedule TBD"}</span>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>VENUE</span>
                <strong style={{ display: "block", fontSize: "0.92rem", color: "#ffffff", marginTop: 2 }}>
                  {event.venue}
                </strong>
                {event.location && /^https?:\/\//i.test(event.location.trim()) ? (
                  <a
                    href={event.location.trim()}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "0.82rem",
                      color: "#818cf8",
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
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
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
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Registration Code</span>
                {isExpired && (
                  <span style={{ display: "block", fontSize: "0.68rem", color: "#f87171", fontWeight: 700, marginTop: 2 }}>
                    ● Pass Expired (Event Ended)
                  </span>
                )}
              </div>
              <strong
                style={{
                  fontSize: "1rem",
                  color: isExpired ? "#94a3b8" : "#38bdf8",
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
                  padding: "18px 20px",
                  borderRadius: 12,
                  background: certificateEligible
                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.2))"
                    : "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(180, 83, 9, 0.2))",
                  border: `1px solid ${certificateEligible ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
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
                        color: certificateEligible ? "#34d399" : "#fbbf24",
                      }}
                    >
                      {certificateEligible ? "📜 CERTIFICATE OF PARTICIPATION READY" : "⏳ FEEDBACK REQUIRED FOR CERTIFICATE"}
                    </span>
                    <h3 style={{ margin: "4px 0 2px", fontSize: "1.05rem", color: "#ffffff" }}>
                      {certificateEligible
                        ? "Your official certificate is issued and ready."
                        : "Complete the survey to claim your certificate."}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
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
                      className="btn-hero-primary"
                      style={{ padding: "10px 20px", fontSize: "0.85rem", border: 0, cursor: "pointer" }}
                    >
                      {downloading ? "Downloading…" : "📥 Download Certificate PDF"}
                    </button>
                  ) : (
                    <Link
                      to={registration.feedbackToken ? `/feedback/${registration.feedbackToken}` : `/events/${event._id}/feedback`}
                      className="btn-hero-primary"
                      style={{ padding: "10px 20px", fontSize: "0.85rem", textDecoration: "none", background: "#f59e0b" }}
                    >
                      Complete Feedback Survey →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Important Instructions */}
            <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>
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
      </div>
    </main>
  );
}
