import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const token = typeof window !== "undefined" ? localStorage.getItem("eventra_token") : null;
  const [activeTab, setActiveTab] = useState("pass");
  const [activeDay, setActiveDay] = useState(1);

  return (
    <main className="landing" style={{ overflowX: "hidden", position: "relative" }}>
      {/* ThreeUI Ambient Aurora Lighting */}
      <div
        style={{
          position: "absolute",
          top: "-150px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1200px",
          height: "650px",
          background:
            "radial-gradient(ellipse 65% 50% at 50% 20%, rgba(0, 113, 227, 0.22), rgba(139, 92, 246, 0.12) 45%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* =========================================================================
          1. APPLE FLAGSHIP HERO SECTION
          ========================================================================= */}
      <section className="landing-hero" style={{ position: "relative", zIndex: 1, paddingTop: "60px", paddingBottom: "20px" }}>
        <div className="hero-content" style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px" }}>
          {/* Eyebrow Badge */}
          <div className="apple-eyebrow" style={{ marginBottom: "24px" }}>
            <span className="pulse-dot" />
            <span>EVENTRA 2026 · INTELLIGENT EVENT ARCHITECTURE</span>
          </div>

          {/* Cinematic Headline */}
          <h1
            style={{
              fontSize: "clamp(2.8rem, 6.5vw, 5.2rem)",
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: "-0.045em",
              color: "#f5f5f7",
              margin: "0 0 24px",
            }}
          >
            The new standard for events.
            <br />
            <span className="apple-gradient-text">Orchestrated to perfection.</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
              lineHeight: 1.6,
              color: "#86868b",
              maxWidth: "680px",
              margin: "0 auto 36px",
              fontWeight: 400,
            }}
          >
            From multi-day agendas and session-level QR attendance to anti-fraud certificates
            and 12-section institutional reports — EVENTRA delivers a seamless, cinematic experience
            for organizers and attendees alike.
          </p>

          {/* Action Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "14px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {token ? (
              <>
                <Link
                  className="button button-primary"
                  to="/create-event"
                  style={{
                    padding: "12px 28px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    boxShadow: "0 4px 24px rgba(0, 113, 227, 0.45)",
                  }}
                >
                  ✦ Create New Event ↗
                </Link>
                <Link
                  className="button button-ghost"
                  to="/dashboard"
                  style={{ padding: "12px 26px", fontSize: "0.95rem" }}
                >
                  Organizer Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  className="button button-primary"
                  to="/register"
                  style={{
                    padding: "12px 30px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    boxShadow: "0 4px 24px rgba(0, 113, 227, 0.45)",
                  }}
                >
                  Get Started Free ↗
                </Link>
                <Link
                  className="button button-ghost"
                  to="/participant/dashboard"
                  style={{ padding: "12px 26px", fontSize: "0.95rem" }}
                >
                  🎟️ Find My Ticket Pass
                </Link>
              </>
            )}
          </div>

          {/* Trust Highlights Strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "28px",
              marginTop: "40px",
              color: "#6e6e73",
              fontSize: "0.82rem",
              fontWeight: 500,
              flexWrap: "wrap",
            }}
          >
            <span>⚡ Sub-Second QR Entry</span>
            <span>•</span>
            <span>🗓️ Multi-Day Dynamic Agendas</span>
            <span>•</span>
            <span>🛡️ Anti-Fraud Cryptographic Passes</span>
            <span>•</span>
            <span>📄 12-Section Executive PDFs</span>
          </div>
        </div>

        {/* =========================================================================
            2. THREEUI INTERACTIVE PRODUCT SHOWCASE STAGE
            ========================================================================= */}
        <div className="apple-stage-container" style={{ padding: "0 20px" }}>
          {/* Interactive Switcher Tabs */}
          <div className="apple-tab-bar">
            <button
              type="button"
              className={`apple-tab-btn ${activeTab === "pass" ? "active" : ""}`}
              onClick={() => setActiveTab("pass")}
            >
              🎫 Digital Wallet Pass
            </button>
            <button
              type="button"
              className={`apple-tab-btn ${activeTab === "agenda" ? "active" : ""}`}
              onClick={() => setActiveTab("agenda")}
            >
              🗓️ Multi-Day Keynote Agenda
            </button>
            <button
              type="button"
              className={`apple-tab-btn ${activeTab === "scanner" ? "active" : ""}`}
              onClick={() => setActiveTab("scanner")}
            >
              ⚡ Sub-Second QR Scanner
            </button>
            <button
              type="button"
              className={`apple-tab-btn ${activeTab === "cert" ? "active" : ""}`}
              onClick={() => setActiveTab("cert")}
            >
              🎓 Verified Certificates
            </button>
          </div>

          {/* Stage Card */}
          <div className="apple-stage-card">
            {/* TAB 1: DIGITAL WALLET PASS */}
            {activeTab === "pass" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "36px",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: "#2997ff",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    APPLE WALLET GRADE PASS
                  </span>
                  <h3
                    style={{
                      fontSize: "1.9rem",
                      color: "#ffffff",
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      margin: "8px 0 14px",
                    }}
                  >
                    One unified ticket for the entire multi-day journey.
                  </h3>
                  <p style={{ color: "#86868b", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 20px" }}>
                    Participants register once and receive an encrypted vector digital pass.
                    Enrolled session chips, live check-in timestamps, and anti-fraud QR tokens
                    update in real time across days.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "6px 14px",
                        borderRadius: "9999px",
                        background: "rgba(0, 113, 227, 0.14)",
                        border: "1px solid rgba(0, 113, 227, 0.35)",
                        color: "#2997ff",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      ✓ 100% Vector PDF
                    </span>
                    <span
                      style={{
                        padding: "6px 14px",
                        borderRadius: "9999px",
                        background: "rgba(16, 185, 129, 0.14)",
                        border: "1px solid rgba(16, 185, 129, 0.35)",
                        color: "#34d399",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Atomic Check-In
                    </span>
                    <span
                      style={{
                        padding: "6px 14px",
                        borderRadius: "9999px",
                        background: "rgba(168, 85, 247, 0.14)",
                        border: "1px solid rgba(168, 85, 247, 0.35)",
                        color: "#c084fc",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Cloud Verified
                    </span>
                  </div>
                </div>

                {/* Simulated Apple Wallet Pass */}
                <div className="apple-wallet-card">
                  <div className="apple-wallet-holo-strip">
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#ffffff", letterSpacing: "0.14em" }}>
                      EVENTRA ADMISSION PASS
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "9999px",
                        background: "rgba(255, 255, 255, 0.2)",
                        color: "#ffffff",
                      }}
                    >
                      VIP ALL-ACCESS
                    </span>
                  </div>

                  <div style={{ padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: "1.3rem", color: "#ffffff", fontWeight: 800 }}>
                          TechSummit 2026
                        </h4>
                        <p style={{ margin: 0, color: "#86868b", fontSize: "0.82rem" }}>
                          📅 Nov 20 - Nov 22, 2026 · Main Auditorium
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#10b981",
                          background: "rgba(16, 185, 129, 0.15)",
                          padding: "4px 10px",
                          borderRadius: "9999px",
                        }}
                      >
                        CONFIRMED
                      </span>
                    </div>

                    <div
                      style={{
                        margin: "18px 0",
                        padding: "14px",
                        borderRadius: "14px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ display: "block", color: "#6e6e73", fontSize: "0.7rem", fontWeight: 600 }}>
                          ATTENDEE
                        </span>
                        <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>Alex Morgan</strong>
                        <span style={{ display: "block", color: "#86868b", fontSize: "0.75rem" }}>
                          ID: #EVT-98421
                        </span>
                      </div>
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          background: "#ffffff",
                          borderRadius: "10px",
                          padding: "4px",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <img
                          src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=EVT-98421"
                          alt="QR Demo"
                          style={{ width: "100%", height: "100%" }}
                        />
                      </div>
                    </div>

                    {/* Enrolled Sessions Pills */}
                    <div>
                      <span style={{ display: "block", color: "#6e6e73", fontSize: "0.7rem", fontWeight: 700, marginBottom: "8px" }}>
                        ENROLLED SESSIONS
                      </span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(0, 113, 227, 0.15)", color: "#7dd3fc", fontSize: "0.72rem" }}>
                          Day 1: AI Keynote
                        </span>
                        <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(139, 92, 246, 0.15)", color: "#c4b5fd", fontSize: "0.72rem" }}>
                          Day 2: Web Sprint
                        </span>
                        <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7", fontSize: "0.72rem" }}>
                          Day 3: Cyber Workshop
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MULTI-DAY AGENDA */}
            {activeTab === "agenda" && (
              <div>
                <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 28px" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#2997ff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    DAY-WISE AGENDA ARCHITECTURE
                  </span>
                  <h3 style={{ fontSize: "1.8rem", color: "#ffffff", fontWeight: 800, margin: "6px 0 10px" }}>
                    Dynamic Multi-Day Schedules &amp; Track Management
                  </h3>
                  <p style={{ color: "#86868b", fontSize: "0.92rem", margin: 0 }}>
                    Build complex conference agendas with reorderable sessions, speaker rosters, venues, and capacity guards.
                  </p>
                </div>

                {/* Day Switcher */}
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setActiveDay(d)}
                      style={{
                        padding: "8px 20px",
                        borderRadius: "9999px",
                        border: activeDay === d ? "1px solid rgba(0, 113, 227, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                        background: activeDay === d ? "rgba(0, 113, 227, 0.2)" : "rgba(255, 255, 255, 0.04)",
                        color: activeDay === d ? "#ffffff" : "#86868b",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Day {d}: {d === 1 ? "Foundations" : d === 2 ? "Deep Dive" : "Hackathon & Showcase"}
                    </button>
                  ))}
                </div>

                {/* Agenda Timeline Cards */}
                <div style={{ display: "grid", gap: "12px", maxWidth: "780px", margin: "0 auto" }}>
                  {activeDay === 1 && (
                    <>
                      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#2997ff", fontWeight: 700 }}>09:00 AM – 10:30 AM · MAIN AUDITORIUM</span>
                          <h4 style={{ margin: "4px 0 2px", color: "#ffffff", fontSize: "1.05rem" }}>Opening Keynote: Future of Autonomous AI</h4>
                          <span style={{ color: "#86868b", fontSize: "0.82rem" }}>Speaker: Dr. Elena Vance (Lead AI Researcher)</span>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "0.75rem", fontWeight: 700 }}>
                          🟢 OPEN
                        </span>
                      </div>
                      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#2997ff", fontWeight: 700 }}>11:00 AM – 01:00 PM · LAB 4</span>
                          <h4 style={{ margin: "4px 0 2px", color: "#ffffff", fontSize: "1.05rem" }}>Hands-on Workshop: Scalable Fullstack Systems</h4>
                          <span style={{ color: "#86868b", fontSize: "0.82rem" }}>Speaker: Marcus Chen (Principal Architect)</span>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(0, 113, 227, 0.15)", color: "#38bdf8", fontSize: "0.75rem", fontWeight: 700 }}>
                          ⚡ POPULAR
                        </span>
                      </div>
                    </>
                  )}
                  {activeDay === 2 && (
                    <>
                      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#2997ff", fontWeight: 700 }}>10:00 AM – 12:30 PM · SEMINAR HALL 1</span>
                          <h4 style={{ margin: "4px 0 2px", color: "#ffffff", fontSize: "1.05rem" }}>Cybersecurity &amp; Zero-Trust Infrastructure</h4>
                          <span style={{ color: "#86868b", fontSize: "0.82rem" }}>Speaker: Sarah Jenkins (CISO)</span>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "0.75rem", fontWeight: 700 }}>
                          🟢 OPEN
                        </span>
                      </div>
                    </>
                  )}
                  {activeDay === 3 && (
                    <>
                      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#2997ff", fontWeight: 700 }}>09:00 AM – 04:00 PM · GRAND BALLROOM</span>
                          <h4 style={{ margin: "4px 0 2px", color: "#ffffff", fontSize: "1.05rem" }}>24-Hour Hackathon Demo &amp; Awards Gala</h4>
                          <span style={{ color: "#86868b", fontSize: "0.82rem" }}>Judging Panel &amp; Keynote Speakers</span>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", fontSize: "0.75rem", fontWeight: 700 }}>
                          🏆 FINALE
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SUB-SECOND QR SCANNER */}
            {activeTab === "scanner" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "36px",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#2997ff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    ATOMIC IDEMPOTENT CHECK-IN
                  </span>
                  <h3 style={{ fontSize: "1.9rem", color: "#ffffff", fontWeight: 800, margin: "8px 0 14px", letterSpacing: "-0.03em" }}>
                    Sub-second verification. Zero duplicate check-ins.
                  </h3>
                  <p style={{ color: "#86868b", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 20px" }}>
                    Built with camera barcode detection, encrypted ticket signatures, and atomic MongoDB updates.
                    Organizers can scan for overall daily entry or track individual session attendance seamlessly.
                  </p>
                  <div
                    style={{
                      padding: "16px 20px",
                      borderRadius: "14px",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <span style={{ fontSize: "1.8rem" }}>✅</span>
                    <div>
                      <strong style={{ display: "block", color: "#34d399", fontSize: "0.92rem" }}>
                        Verification Confirmed (0.18s)
                      </strong>
                      <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
                        Alex Morgan · Registration #EVT-98421 · Day 1 Checked In
                      </span>
                    </div>
                  </div>
                </div>

                {/* Animated Scanner Visual */}
                <div
                  style={{
                    padding: "30px",
                    borderRadius: "20px",
                    background: "#0a0c13",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    textAlign: "center",
                  }}
                >
                  <div className="scanner-viewfinder">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=EVT-98421"
                      alt="Scanner Target"
                      style={{ width: "130px", height: "130px", opacity: 0.8 }}
                    />
                    <div className="scanner-laser" />
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "16px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#38bdf8",
                    }}
                  >
                    ● Camera Live &amp; Scanning at 60 FPS
                  </span>
                </div>
              </div>
            )}

            {/* TAB 4: VERIFIED CERTIFICATES */}
            {activeTab === "cert" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "36px",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#f59e0b", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    CRYPTOGRAPHIC CERTIFICATE STUDIO
                  </span>
                  <h3 style={{ fontSize: "1.9rem", color: "#ffffff", fontWeight: 800, margin: "8px 0 14px", letterSpacing: "-0.03em" }}>
                    Zero fraud. Attendance-gated credentials.
                  </h3>
                  <p style={{ color: "#86868b", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 20px" }}>
                    Certificates are only issued to participants whose attendance has been physically verified.
                    Choose flexible rules: All days attended, minimum days attended, or required sessions completed.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 14px", borderRadius: "9999px", background: "rgba(245, 158, 11, 0.14)", border: "1px solid rgba(245, 158, 11, 0.35)", color: "#fbbf24", fontSize: "0.78rem", fontWeight: 600 }}>
                      📜 8 Signature Templates
                    </span>
                    <span style={{ padding: "6px 14px", borderRadius: "9999px", background: "rgba(16, 185, 129, 0.14)", border: "1px solid rgba(16, 185, 129, 0.35)", color: "#34d399", fontSize: "0.78rem", fontWeight: 600 }}>
                      ⭐ Feedback Gating
                    </span>
                  </div>
                </div>

                {/* Simulated Certificate Graphic */}
                <div
                  style={{
                    padding: "28px",
                    borderRadius: "18px",
                    background: "linear-gradient(145deg, #181926, #0e101a)",
                    border: "2px solid rgba(245, 158, 11, 0.4)",
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(245, 158, 11, 0.1)",
                    textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", letterSpacing: "0.18em", color: "#fbbf24", fontWeight: 800, textTransform: "uppercase" }}>
                    CERTIFICATE OF PARTICIPATION
                  </span>
                  <h4 style={{ margin: "14px 0 6px", fontSize: "1.45rem", color: "#ffffff", fontFamily: "Georgia, serif" }}>
                    Alex Morgan
                  </h4>
                  <p style={{ color: "#94a3b8", fontSize: "0.78rem", margin: "0 0 16px" }}>
                    Has successfully completed all verified requirements of
                    <br />
                    <strong style={{ color: "#e2e8f0" }}>TechSummit 2026</strong>
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-around", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "14px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.68rem", color: "#6e6e73" }}>DATE</span>
                      <strong style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>Nov 22, 2026</strong>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "0.68rem", color: "#6e6e73" }}>VERIFICATION</span>
                      <strong style={{ fontSize: "0.78rem", color: "#10b981" }}>CR-98421-OK</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. KEY METRICS RIBBON (Apple Keynote Numbers)
          ========================================================================= */}
      <section
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 11, 16, 0.6)",
          padding: "44px 24px",
          margin: "80px 0 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1140px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <strong style={{ display: "block", fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.04em" }}>
              0.18s
            </strong>
            <span style={{ color: "#86868b", fontSize: "0.85rem", fontWeight: 500 }}>
              Sub-second QR verification
            </span>
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.04em" }}>
              100%
            </strong>
            <span style={{ color: "#86868b", fontSize: "0.85rem", fontWeight: 500 }}>
              Anti-fraud certificate gating
            </span>
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.04em" }}>
              12
            </strong>
            <span style={{ color: "#86868b", fontSize: "0.85rem", fontWeight: 500 }}>
              Section institutional reports
            </span>
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.04em" }}>
              Single
            </strong>
            <span style={{ color: "#86868b", fontSize: "0.85rem", fontWeight: 500 }}>
              Pass for multi-day events
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. APPLE BENTO BOX FEATURE GRID
          ========================================================================= */}
      <section style={{ maxWidth: "1140px", margin: "60px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div className="apple-eyebrow" style={{ marginBottom: "14px" }}>
            <span>THE EVENTRA PLATFORM</span>
          </div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.035em", margin: "0 0 14px" }}>
            Engineered for performance.
            <br />
            <span className="apple-gradient-text">Designed with elegance.</span>
          </h2>
          <p style={{ color: "#86868b", fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto" }}>
            Every touchpoint — from participant registration to the final audited executive report — is seamlessly connected.
          </p>
        </div>

        <div className="apple-bento-grid" style={{ margin: 0, padding: 0 }}>
          {/* Bento 1: Multi-day Studio (Wide) */}
          <div className="apple-bento-card wide">
            <div>
              <div className="bento-icon">🗓️</div>
              <h3>Smart Multi-Day Studio</h3>
              <p>
                Manage conferences spanning single or multiple dates with individual day schedules,
                dynamic session builders, speaker profiles, room designations, and capacity controls.
                Never duplicate event records again.
              </p>
            </div>
            <div style={{ marginTop: "24px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.06)", color: "#cbd5e1", fontSize: "0.78rem" }}>
                Auto Day Numbering
              </span>
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.06)", color: "#cbd5e1", fontSize: "0.78rem" }}>
                Session Capacities
              </span>
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.06)", color: "#cbd5e1", fontSize: "0.78rem" }}>
                Instant Slug Publishing
              </span>
            </div>
          </div>

          {/* Bento 2: Sub-Second Scanner */}
          <div className="apple-bento-card">
            <div>
              <div className="bento-icon">⚡</div>
              <h3>Fast QR Check-In</h3>
              <p>
                Sub-second camera scanning powered by atomic database operations and unique indexes
                to eliminate duplicate check-ins even under heavy network traffic.
              </p>
            </div>
            <div style={{ marginTop: "24px" }}>
              <span style={{ color: "#34d399", fontSize: "0.82rem", fontWeight: 600 }}>
                ✓ Daily &amp; Session Modes
              </span>
            </div>
          </div>

          {/* Bento 3: Digital Wallet Passes */}
          <div className="apple-bento-card">
            <div>
              <div className="bento-icon">🎫</div>
              <h3>Digital Passes</h3>
              <p>
                Cryptographic vector PDF passes generated instantly and dispatched to attendee inboxes,
                complete with live enrolled sessions and barcode tokens.
              </p>
            </div>
            <div style={{ marginTop: "24px" }}>
              <span style={{ color: "#2997ff", fontSize: "0.82rem", fontWeight: 600 }}>
                ✓ Apple Wallet Inspired
              </span>
            </div>
          </div>

          {/* Bento 4: Attendance-Gated Certificates */}
          <div className="apple-bento-card">
            <div>
              <div className="bento-icon">🎓</div>
              <h3>Verified Certificates</h3>
              <p>
                Issue tamper-proof certificates governed by attendance threshold rules:
                all days attended, minimum days attended, or required sessions completed.
              </p>
            </div>
            <div style={{ marginTop: "24px" }}>
              <span style={{ color: "#fbbf24", fontSize: "0.82rem", fontWeight: 600 }}>
                ✓ 8 Signature Layouts
              </span>
            </div>
          </div>

          {/* Bento 5: Executive Post-Event Reports (Wide) */}
          <div className="apple-bento-card wide">
            <div>
              <div className="bento-icon">📄</div>
              <h3>12-Section Institutional Reports</h3>
              <p>
                Generate multi-page vector PDF reports with running headers, footers, attendance charts,
                session participation breakdown, and feedback sentiment computed directly from real MongoDB records.
              </p>
            </div>
            <div style={{ marginTop: "24px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.06)", color: "#cbd5e1", fontSize: "0.78rem" }}>
                Day-by-Day Turnout
              </span>
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.06)", color: "#cbd5e1", fontSize: "0.78rem" }}>
                Session Drop-off Rates
              </span>
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.06)", color: "#cbd5e1", fontSize: "0.78rem" }}>
                Audited Executive Summary
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. APPLE COMPARISON SECTION (Why Organizers Switch)
          ========================================================================= */}
      <section style={{ maxWidth: "980px", margin: "100px auto 40px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#2997ff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            WHY EVENTRA
          </span>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.03em", margin: "8px 0" }}>
            Engineered without compromise.
          </h2>
        </div>

        <div
          style={{
            borderRadius: "20px",
            background: "rgba(18, 19, 28, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr",
              padding: "18px 24px",
              background: "rgba(255, 255, 255, 0.03)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "#86868b",
            }}
          >
            <span>CAPABILITY</span>
            <span style={{ color: "#2997ff" }}>EVENTRA</span>
            <span>LEGACY PLATFORMS</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "18px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "0.88rem" }}>
            <span style={{ color: "#ffffff", fontWeight: 600 }}>Multi-Day Architecture</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>✓ Unified Event, Single Pass</span>
            <span style={{ color: "#6e6e73" }}>Separate events per day</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "18px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "0.88rem" }}>
            <span style={{ color: "#ffffff", fontWeight: 600 }}>QR Attendance Scanning</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>✓ Sub-second atomic verification</span>
            <span style={{ color: "#6e6e73" }}>Slow manual paper check-ins</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "18px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "0.88rem" }}>
            <span style={{ color: "#ffffff", fontWeight: 600 }}>Certificate Issuance</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>✓ Attendance &amp; feedback gated</span>
            <span style={{ color: "#6e6e73" }}>Unverified mass emailing</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "18px 24px", fontSize: "0.88rem" }}>
            <span style={{ color: "#ffffff", fontWeight: 600 }}>Post-Event Reporting</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>✓ 12-section vector PDF studio</span>
            <span style={{ color: "#6e6e73" }}>Basic CSV spreadsheet dumps</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. APPLE STRUCTURED DIRECTORY FOOTER
          ========================================================================= */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#050608",
          padding: "60px 24px 40px",
          marginTop: "100px",
        }}
      >
        <div
          style={{
            maxWidth: "1140px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "36px",
            marginBottom: "48px",
          }}
        >
          {/* Col 1 */}
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#ffffff", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase" }}>
              Product
            </span>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px", fontSize: "0.84rem", color: "#86868b" }}>
              <li><Link to="/create-event" style={{ color: "inherit" }}>Smart Event Studio</Link></li>
              <li><Link to="/dashboard" style={{ color: "inherit" }}>Multi-Day Agendas</Link></li>
              <li><Link to="/dashboard" style={{ color: "inherit" }}>Fast QR Scanner</Link></li>
              <li><Link to="/dashboard" style={{ color: "inherit" }}>Certificate Manager</Link></li>
              <li><Link to="/dashboard" style={{ color: "inherit" }}>Post-Event Reports</Link></li>
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#ffffff", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase" }}>
              Participants
            </span>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px", fontSize: "0.84rem", color: "#86868b" }}>
              <li><Link to="/participant/dashboard" style={{ color: "inherit" }}>Find My Ticket Pass</Link></li>
              <li><Link to="/participant/dashboard" style={{ color: "inherit" }}>Download Certificate</Link></li>
              <li><Link to="/terms" style={{ color: "inherit" }}>Participant Guide</Link></li>
              <li><Link to="/support" style={{ color: "inherit" }}>Organizer Support</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#ffffff", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase" }}>
              Platform &amp; Legal
            </span>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px", fontSize: "0.84rem", color: "#86868b" }}>
              <li><Link to="/terms" style={{ color: "inherit" }}>Terms &amp; Conditions</Link></li>
              <li><Link to="/terms" style={{ color: "inherit" }}>Privacy &amp; Data Security</Link></li>
              <li><Link to="/admin/login" style={{ color: "inherit" }}>Super Admin Console</Link></li>
              <li><span style={{ color: "#34d399" }}>● System Operational</span></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#ffffff", letterSpacing: "0.08em", marginBottom: "16px", textTransform: "uppercase" }}>
              EVENTRA Engine
            </span>
            <p style={{ color: "#86868b", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>
              The all-in-one platform for modern conferences, symposiums, and college fests.
              Built with React, Node.js, and MongoDB.
            </p>
          </div>
        </div>

        {/* Bottom Copyright & Badge Bar */}
        <div
          style={{
            maxWidth: "1140px",
            margin: "0 auto",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            fontSize: "0.8rem",
            color: "#6e6e73",
          }}
        >
          <div>
            Copyright © 2026{" "}
            <strong style={{ color: "#ffffff" }}>EVENTRA</strong> Inc. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link to="/terms" style={{ color: "inherit" }}>Terms of Use</Link>
            <span>·</span>
            <Link to="/terms" style={{ color: "inherit" }}>Privacy Policy</Link>
            <span>·</span>
            <Link to="/admin/login" style={{ color: "inherit" }}>Executive Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}