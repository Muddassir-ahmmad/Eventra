import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { getEventFontConfig } from "../utils/eventFonts";
import { formatEventDateDisplay, getEventTotalDays, isEventPastOrCompleted } from "../utils/eventTiming";

export default function EventRegistration() {
  const { slug } = useParams();

  const [event, setEvent] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    department: "",
    ticketType: "General Admission",
    customAnswers: {},
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {
    api.get(`/events/public/${slug}`)
      .then(({ data }) => {
        setEvent(data.event);
        if (isEventPastOrCompleted(data.event)) {
          setError("This event has already concluded and registration is closed.");
        } else if (data.event?.ticketTypes?.length > 0) {
          setForm((old) => ({
            ...old,
            ticketType: data.event.ticketTypes[0].name,
          }));
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load event");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  function update(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateCustom(key, value) {
    setForm((previous) => ({
      ...previous,
      customAnswers: {
        ...previous.customAnswers,
        [key]: value,
      },
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!agreeTerms) {
      setError("Please agree to the Terms and Conditions to complete your registration.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await api.post(`/registrations/public/${slug}`, form);
      setSuccess(data.registration);
      if (data.registration?.email) {
        localStorage.setItem("eventra_participant_email", data.registration.email);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="public-page-root" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#94a3b8" }}>Loading event registration...</p>
        </div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="public-page-root" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 460, padding: 30 }}>
          <span style={{ fontSize: "3rem" }}>⚠️</span>
          <h1 style={{ fontSize: "1.6rem", margin: "16px 0 8px" }}>Registration Unavailable</h1>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>{error}</p>
          <Link className="btn-hero-primary" to="/">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // SUCCESS SCREEN
  if (success) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(success.registrationId)}`;

    return (
      <main className="public-page-root" style={{ padding: "40px 20px 80px", "--event-heading-font": getEventFontConfig(event?.eventFont).headingFont, "--event-body-font": getEventFontConfig(event?.eventFont).bodyFont }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div
            style={{
              background: "#0c101d",
              borderRadius: 20,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: 32,
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
            }}
          >
            <span style={{ fontSize: "3rem", display: "block", marginBottom: 12 }}>🎉</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#10b981", letterSpacing: "0.12em" }}>
              REGISTRATION CONFIRMED
            </span>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "6px 0 8px", color: "#ffffff" }}>
              You're In! Welcome.
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 24px" }}>
              Your spot for <strong>{success.eventName || event.title}</strong> has been secured.
            </p>

            {/* QR Ticket Preview */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  padding: 12,
                  borderRadius: 12,
                  width: 180,
                  height: 180,
                  margin: "0 auto 16px",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <img src={qrUrl} alt="Ticket QR" style={{ width: "100%", height: "100%" }} />
              </div>

              <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>
                REGISTRATION ID
              </span>
              <strong style={{ display: "block", fontSize: "1.2rem", color: "#38bdf8", letterSpacing: "0.06em", marginTop: 2 }}>
                {success.registrationId}
              </strong>
              <small style={{ color: "#64748b", display: "block", marginTop: 4 }}>
                Tier: {success.ticketType || "General Admission"}
              </small>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link className="btn-hero-primary" style={{ justifyContent: "center" }} to={`/tickets/${success.registrationId}`}>
                🎟️ View &amp; Download Digital Ticket Pass →
              </Link>

              <Link
                className="button button-ghost"
                style={{
                  justifyContent: "center",
                  textDecoration: "none",
                  background: "rgba(124, 77, 255, 0.15)",
                  borderColor: "rgba(124, 77, 255, 0.4)",
                  color: "#c4b5fd",
                  fontWeight: 700,
                }}
                to="/participant/dashboard"
              >
                👤 Go to Participant Dashboard →
              </Link>

              <Link className="btn-hero-secondary" style={{ justifyContent: "center" }} to={`/events/${slug}`}>
                ← Return to Event Page
              </Link>
            </div>

            <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 20 }}>
              A confirmation email with your digital ticket pass and QR entry code has also been dispatched to{" "}
              <strong>{success.email}</strong>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // REGISTRATION FORM
  const regFields = event?.registrationFields && event.registrationFields.length > 0
    ? event.registrationFields
    : [
        { key: "name", label: "Full Name", type: "text", required: true },
        { key: "email", label: "Email Address", type: "email", required: true },
        { key: "phone", label: "Phone Number", type: "tel", required: true },
        { key: "college", label: "College / Institution", type: "text", required: true },
        { key: "department", label: "Department / Branch", type: "text", required: false },
      ];

  const nameField = regFields.find((f) => f.key === "name") || { label: "Full Name", required: true };
  const emailField = regFields.find((f) => f.key === "email") || { label: "Email Address", required: true };
  const phoneField = regFields.find((f) => f.key === "phone") || { label: "Phone Number", required: true };
  const collegeField = regFields.find((f) => f.key === "college");
  const deptField = regFields.find((f) => f.key === "department");
  const customFields = regFields.filter((f) => !["name", "email", "phone", "college", "department"].includes(f.key));

  return (
    <main className="public-page-root" style={{ padding: "40px 20px 80px", "--event-heading-font": getEventFontConfig(event?.eventFont).headingFont, "--event-body-font": getEventFontConfig(event?.eventFont).bodyFont }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <Link to={`/events/${slug}`} style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
          ← Back to Event Details
        </Link>

        <div
          style={{
            background: "#0c101d",
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: 32,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 20, marginBottom: 24 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#a855f7", letterSpacing: "0.1em" }}>
              FAST-TRACK REGISTRATION
            </span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "6px 0 6px", color: "#ffffff", fontFamily: "var(--event-heading-font, inherit)" }}>
              {event.title}
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
              📅 {formatEventDateDisplay(event)}
              {event.eventDurationType === "multi_day" ? ` (${getEventTotalDays(event)} Days All-Access Pass)` : ""}
              {" "}· 📍 {event.venue}
            </p>
          </div>

          {error && (
            <div className="alert-error" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
            {/* Ticket Tier Selection (Only for Paid Events with multiple tiers) */}
            {event.ticketMode === "paid" && event.ticketTypes?.length > 1 && (
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  Select Admission Tier *
                </label>
                <div style={{ display: "grid", gap: 8 }}>
                  {event.ticketTypes.map((tier) => (
                    <label
                      key={tier.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: form.ticketType === tier.name ? "1px solid #8b5cf6" : "1px solid rgba(255, 255, 255, 0.08)",
                        background: form.ticketType === tier.name ? "rgba(139, 92, 246, 0.1)" : "rgba(255, 255, 255, 0.02)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="radio"
                          name="ticketType"
                          value={tier.name}
                          checked={form.ticketType === tier.name}
                          onChange={(e) => update("ticketType", e.target.value)}
                        />
                        <strong>{tier.name}</strong>
                      </span>
                      <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                        {tier.price > 0 ? `₹${tier.price}` : "Free"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Identity: Full Name */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                {nameField.label || "Full Name"} {nameField.required && "*"}
              </label>
              <input
                type="text"
                required={nameField.required}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(0, 0, 0, 0.25)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Dynamic Identity: Email & Phone */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  {emailField.label || "Email Address"} {emailField.required && "*"}
                </label>
                <input
                  type="email"
                  required={emailField.required}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="rahul@example.com"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(0, 0, 0, 0.25)",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  {phoneField.label || "Phone Number"} {phoneField.required && "*"}
                </label>
                <input
                  type="tel"
                  required={phoneField.required}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+91 9876543210"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(0, 0, 0, 0.25)",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Dynamic College & Department (only displayed if configured in registrationFields) */}
            {(collegeField || deptField) && (
              <div style={{ display: "grid", gridTemplateColumns: (collegeField && deptField) ? "1fr 1fr" : "1fr", gap: 14 }}>
                {collegeField && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                      {collegeField.label || "College / Institution"} {collegeField.required && "*"}
                    </label>
                    <input
                      type={collegeField.type || "text"}
                      required={collegeField.required}
                      value={form.college}
                      onChange={(e) => update("college", e.target.value)}
                      placeholder={`e.g. ${collegeField.label || "Sahyadri College"}`}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        background: "rgba(0, 0, 0, 0.25)",
                        color: "#ffffff",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}

                {deptField && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                      {deptField.label || "Department / Branch"} {deptField.required && "*"}
                    </label>
                    <input
                      type={deptField.type || "text"}
                      required={deptField.required}
                      value={form.department}
                      onChange={(e) => update("department", e.target.value)}
                      placeholder={`e.g. ${deptField.label || "Computer Science"}`}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        background: "rgba(0, 0, 0, 0.25)",
                        color: "#ffffff",
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Custom Questions Configured by Organizer */}
            {customFields.map((field) => (
              <div key={field.key}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  {field.label} {field.required && "*"}
                </label>
                <input
                  type={field.type || "text"}
                  required={field.required}
                  value={form.customAnswers?.[field.key] || ""}
                  onChange={(e) => updateCustom(field.key, e.target.value)}
                  placeholder={`Your answer for ${field.label}`}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(0, 0, 0, 0.25)",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "16px 0 8px", textAlign: "left" }}>
              <input
                type="checkbox"
                id="attendeeAgreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                required
                style={{ width: 18, height: 18, marginTop: 2, accentColor: "#6366f1", cursor: "pointer", flexShrink: 0 }}
              />
              <label htmlFor="attendeeAgreeTerms" style={{ fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer", lineHeight: 1.45 }}>
                I agree to the{" "}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontWeight: 700, textDecoration: "underline" }}>
                  Terms and Conditions
                </Link>{" "}
                and acknowledge the single-access pass policy.
              </label>
            </div>

            <button
              type="submit"
              className="btn-hero-primary"
              disabled={submitting}
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            >
              {submitting ? "Confirming Registration..." : "Complete Registration & Get Ticket →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
