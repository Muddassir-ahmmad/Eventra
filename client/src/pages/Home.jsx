import React, { useState } from "react";
import { Link } from "react-router-dom";
import IntroAnimation from "../components/IntroAnimation";

export default function Home() {
  const token = typeof window !== "undefined" ? localStorage.getItem("eventra_token") : null;
  const [activeTab, setActiveTab] = useState("pass");
  const [activeDay, setActiveDay] = useState(1);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
    return true; // Automatically plays intro on page load and on every page refresh
  });
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  const handleZoomOut = () => {
    setIsRevealing(true);
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
    setIsRevealing(false);
    setHasRevealed(true);
  };

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} onZoomOut={handleZoomOut} />}
      <main
        className={`homepage-reveal-wrapper${isRevealing ? " is-revealing" : ""}${hasRevealed ? " is-entering-reveal" : ""}`}
        style={{ background: "#F8F9FA", color: "#0F172A", minHeight: "100vh", overflowX: "hidden" }}
      >
      {/* =========================================================================
          1. EDITORIAL HERO SECTION
          ========================================================================= */}
      <section style={{ position: "relative", paddingTop: "70px", paddingBottom: "40px" }}>
        {/* Soft Ambient Floating Glow Orbs */}
        <div
          className="ambient-glow-circle"
          style={{
            top: "-40px",
            left: "15%",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(5, 150, 105, 0.14) 0%, transparent 70%)",
          }}
        />
        <div
          className="ambient-glow-circle"
          style={{
            top: "80px",
            right: "12%",
            width: "440px",
            height: "440px",
            background: "radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, transparent 70%)",
            animationDelay: "-5s",
          }}
        />

        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 24px", textAlign: "center", position: "relative", zIndex: 1 }}>
          {/* Eyebrow Badge */}
          <div
            className="animate-hero-eyebrow"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "9999px",
              background: "#F1F5F9",
              border: "1px solid #E2E8F0",
              color: "#059669",
              fontSize: "0.74rem",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "24px",
            }}
          >
            <span className="live-pulse-indicator" />
            <span>EVENTRA · PREMIER EVENT MANAGEMENT &amp; PASS SYSTEM</span>
          </div>

          {/* Cinematic Headline */}
          <h1
            className="animate-hero-headline"
            style={{
              fontSize: "clamp(2.6rem, 5.5vw, 4.8rem)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              color: "#0F172A",
              margin: "0 0 24px",
            }}
          >
            Where landmark events come to life.
            <br />
            <span style={{ color: "#059669" }}>Orchestrated with precision.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="animate-hero-subtitle"
            style={{
              fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)",
              lineHeight: 1.65,
              color: "#64748B",
              maxWidth: "720px",
              margin: "0 auto 36px",
              fontWeight: 400,
            }}
          >
            From multi-day dynamic agendas and session-level QR attendance to anti-fraud certificates
            and 12-section institutional reports — EVENTRA delivers a seamless, high-converting experience
            for organizers and attendees alike.
          </p>

          {/* Action CTAs */}
          <div
            className="animate-hero-ctas"
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
                  className="button button-primary home-cta-button"
                  to="/create-event"
                  style={{
                    padding: "13px 32px",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    background: "#059669",
                    color: "#FFFFFF",
                    textDecoration: "none",
                    boxShadow: "0 4px 18px rgba(5, 150, 105, 0.28)",
                  }}
                >
                  ✦ Create New Event ↗
                </Link>
                <Link
                  className="button button-ghost home-ghost-button"
                  to="/dashboard"
                  style={{
                    padding: "13px 28px",
                    fontSize: "0.95rem",
                    borderRadius: "9999px",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    border: "1px solid #E2E8F0",
                    textDecoration: "none",
                  }}
                >
                  Organizer Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  className="button button-primary home-cta-button"
                  to="/register"
                  style={{
                    padding: "13px 32px",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    background: "#059669",
                    color: "#FFFFFF",
                    textDecoration: "none",
                    boxShadow: "0 4px 18px rgba(5, 150, 105, 0.28)",
                  }}
                >
                  Get Started Free ↗
                </Link>
                <Link
                  className="button button-ghost home-ghost-button"
                  to="/login"
                  style={{
                    padding: "13px 28px",
                    fontSize: "0.95rem",
                    borderRadius: "9999px",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    border: "1px solid #E2E8F0",
                    textDecoration: "none",
                  }}
                >
                  Organizer Login
                </Link>
              </>
            )}
          </div>

          {/* Trust Highlights Strip */}
          <div
            className="animate-hero-proof"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "28px",
              marginTop: "44px",
              color: "#64748B",
              fontSize: "0.85rem",
              fontWeight: 600,
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
            2. INTERACTIVE THREEUI-INSPIRED SHOWCASE STAGE
            ========================================================================= */}
        <div className="animate-hero-stage" style={{ maxWidth: "1140px", margin: "48px auto 0", padding: "0 20px" }}>
          {/* Segmented Switcher Tab Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              margin: "0 auto 28px",
              background: "#F1F5F9",
              padding: "6px",
              borderRadius: "9999px",
              width: "fit-content",
              border: "1px solid #E2E8F0",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("pass")}
              style={{
                padding: "10px 22px",
                borderRadius: "9999px",
                border: "none",
                background: activeTab === "pass" ? "#FFFFFF" : "transparent",
                color: activeTab === "pass" ? "#0F172A" : "#64748B",
                fontWeight: activeTab === "pass" ? 700 : 500,
                fontSize: "0.88rem",
                cursor: "pointer",
                boxShadow: activeTab === "pass" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              🎫 Digital Pass &amp; Ticket
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("agenda")}
              style={{
                padding: "10px 22px",
                borderRadius: "9999px",
                border: "none",
                background: activeTab === "agenda" ? "#FFFFFF" : "transparent",
                color: activeTab === "agenda" ? "#0F172A" : "#64748B",
                fontWeight: activeTab === "agenda" ? 700 : 500,
                fontSize: "0.88rem",
                cursor: "pointer",
                boxShadow: activeTab === "agenda" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              🗓️ Multi-Day Keynote Agenda
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scanner")}
              style={{
                padding: "10px 22px",
                borderRadius: "9999px",
                border: "none",
                background: activeTab === "scanner" ? "#FFFFFF" : "transparent",
                color: activeTab === "scanner" ? "#0F172A" : "#64748B",
                fontWeight: activeTab === "scanner" ? 700 : 500,
                fontSize: "0.88rem",
                cursor: "pointer",
                boxShadow: activeTab === "scanner" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              ⚡ Sub-Second QR Scanner
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cert")}
              style={{
                padding: "10px 22px",
                borderRadius: "9999px",
                border: "none",
                background: activeTab === "cert" ? "#FFFFFF" : "transparent",
                color: activeTab === "cert" ? "#0F172A" : "#64748B",
                fontWeight: activeTab === "cert" ? 700 : 500,
                fontSize: "0.88rem",
                cursor: "pointer",
                boxShadow: activeTab === "cert" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              🎓 Verified Certificates
            </button>
          </div>

          {/* Stage Surface Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "24px",
              padding: "40px",
              boxShadow: "0 10px 35px rgba(36, 43, 43, 0.05)",
            }}
          >
            {/* TAB 1: DIGITAL PASS */}
            {activeTab === "pass" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "40px", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#059669", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    PHYSICAL &amp; DIGITAL ADMISSION
                  </span>
                  <h3 style={{ fontSize: "2rem", color: "#0F172A", fontWeight: 800, letterSpacing: "-0.03em", margin: "10px 0 16px" }}>
                    One unified ticket for the complete multi-day journey.
                  </h3>
                  <p style={{ color: "#64748B", fontSize: "0.98rem", lineHeight: 1.65, margin: "0 0 24px" }}>
                    Participants register once and receive an encrypted digital pass with enrolled session chips,
                    real-time attendance checkpoints, and vector PDF download capability.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 14px", borderRadius: "9999px", background: "rgba(5, 150, 105, 0.12)", color: "#059669", fontSize: "0.8rem", fontWeight: 700 }}>
                      ✓ 100% Vector PDF
                    </span>
                    <span style={{ padding: "6px 14px", borderRadius: "9999px", background: "rgba(57, 131, 107, 0.12)", color: "#059669", fontSize: "0.8rem", fontWeight: 700 }}>
                      ✓ Atomic Check-In
                    </span>
                    <span style={{ padding: "6px 14px", borderRadius: "9999px", background: "#F1F5F9", color: "#0F172A", fontSize: "0.8rem", fontWeight: 700 }}>
                      ✓ Multi-Day All-Access
                    </span>
                  </div>
                </div>

                {/* Simulated Ticket Pass */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "20px",
                    overflow: "hidden",
                    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <div style={{ background: "#F1F5F9", padding: "18px 22px", borderBottom: "2px dashed #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#059669", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      EVENTRA ADMISSION PASS
                    </span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "9999px", background: "rgba(5, 150, 105, 0.15)", color: "#059669" }}>
                      ALL-ACCESS PASS
                    </span>
                  </div>
                  <div style={{ padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: "1.25rem", color: "#0F172A", fontWeight: 800 }}>
                          TechSummit 2026
                        </h4>
                        <p style={{ margin: 0, color: "#64748B", fontSize: "0.82rem" }}>
                          📅 Nov 20 - Nov 22, 2026 · Main Auditorium
                        </p>
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#059669", background: "rgba(57, 131, 107, 0.12)", padding: "4px 10px", borderRadius: "9999px" }}>
                        ● ENTRY READY
                      </span>
                    </div>

                    <div style={{ padding: "14px", borderRadius: "12px", background: "#FFFFFF", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <div>
                        <span style={{ display: "block", color: "#64748B", fontSize: "0.7rem", fontWeight: 700 }}>
                          ATTENDEE
                        </span>
                        <strong style={{ color: "#0F172A", fontSize: "0.95rem" }}>Alex Morgan</strong>
                        <span style={{ display: "block", color: "#059669", fontSize: "0.75rem", fontWeight: 600 }}>
                          ID: #EVT-98421
                        </span>
                      </div>
                      <div style={{ width: "56px", height: "56px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "3px", display: "grid", placeItems: "center" }}>
                        <img
                          src="https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=EVT-98421"
                          alt="QR Demo"
                          style={{ width: "100%", height: "100%" }}
                        />
                      </div>
                    </div>

                    <div>
                      <span style={{ display: "block", color: "#64748B", fontSize: "0.7rem", fontWeight: 700, marginBottom: "8px" }}>
                        ENROLLED SESSIONS
                      </span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", fontSize: "0.72rem", fontWeight: 600 }}>
                          Day 1: AI Keynote
                        </span>
                        <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", fontSize: "0.72rem", fontWeight: 600 }}>
                          Day 2: Fullstack Systems
                        </span>
                        <span style={{ padding: "4px 10px", borderRadius: "8px", background: "rgba(5, 150, 105, 0.12)", color: "#059669", fontSize: "0.72rem", fontWeight: 600 }}>
                          Day 3: Hackathon Demo
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
                <div style={{ textAlign: "center", maxWidth: "650px", margin: "0 auto 28px" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#059669", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    DYNAMIC MULTI-DAY ARCHITECTURE
                  </span>
                  <h3 style={{ fontSize: "1.9rem", color: "#0F172A", fontWeight: 800, margin: "8px 0 10px" }}>
                    Day-Wise Schedules &amp; Track Management
                  </h3>
                  <p style={{ color: "#64748B", fontSize: "0.95rem", margin: 0 }}>
                    Build complex conferences with reorderable sessions, speaker rosters, venues, and capacity guards.
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
                        border: activeDay === d ? "1px solid #059669" : "1px solid #E2E8F0",
                        background: activeDay === d ? "#059669" : "#F8FAFC",
                        color: activeDay === d ? "#FFFFFF" : "#64748B",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
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
                      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}>09:00 AM – 10:30 AM · MAIN AUDITORIUM</span>
                          <h4 style={{ margin: "4px 0 2px", color: "#0F172A", fontSize: "1.05rem", fontWeight: 700 }}>Opening Keynote: Autonomous AI Systems</h4>
                          <span style={{ color: "#64748B", fontSize: "0.82rem" }}>Speaker: Dr. Elena Vance (Lead AI Researcher)</span>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(57, 131, 107, 0.12)", color: "#059669", fontSize: "0.75rem", fontWeight: 700 }}>
                          🟢 OPEN
                        </span>
                      </div>
                      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}>11:00 AM – 01:00 PM · LAB 4</span>
                          <h4 style={{ margin: "4px 0 2px", color: "#0F172A", fontSize: "1.05rem", fontWeight: 700 }}>Hands-on Workshop: Scalable Fullstack Architectures</h4>
                          <span style={{ color: "#64748B", fontSize: "0.82rem" }}>Speaker: Marcus Chen (Principal Architect)</span>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(5, 150, 105, 0.12)", color: "#059669", fontSize: "0.75rem", fontWeight: 700 }}>
                          ⚡ POPULAR
                        </span>
                      </div>
                    </>
                  )}
                  {activeDay === 2 && (
                    <>
                      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}>10:00 AM – 12:30 PM · SEMINAR HALL 1</span>
                          <h4 style={{ margin: "4px 0 2px", color: "#0F172A", fontSize: "1.05rem", fontWeight: 700 }}>Cybersecurity &amp; Zero-Trust Infrastructure</h4>
                          <span style={{ color: "#64748B", fontSize: "0.82rem" }}>Speaker: Sarah Jenkins (CISO)</span>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(57, 131, 107, 0.12)", color: "#059669", fontSize: "0.75rem", fontWeight: 700 }}>
                          🟢 OPEN
                        </span>
                      </div>
                    </>
                  )}
                  {activeDay === 3 && (
                    <>
                      <div style={{ padding: "16px 20px", borderRadius: "14px", background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}>09:00 AM – 04:00 PM · GRAND BALLROOM</span>
                          <h4 style={{ margin: "4px 0 2px", color: "#0F172A", fontSize: "1.05rem", fontWeight: 700 }}>24-Hour Hackathon Demo &amp; Awards Gala</h4>
                          <span style={{ color: "#64748B", fontSize: "0.82rem" }}>Judging Panel &amp; Keynote Speakers</span>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(217, 141, 118, 0.15)", color: "#F97316", fontSize: "0.75rem", fontWeight: 700 }}>
                          🏆 FINALE
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SUB-SECOND QR CHECK-IN */}
            {activeTab === "scanner" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "40px", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#059669", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    ATOMIC IDEMPOTENT CHECK-IN
                  </span>
                  <h3 style={{ fontSize: "2rem", color: "#0F172A", fontWeight: 800, margin: "8px 0 14px", letterSpacing: "-0.03em" }}>
                    Sub-second verification. Zero duplicate check-ins.
                  </h3>
                  <p style={{ color: "#64748B", fontSize: "0.98rem", lineHeight: 1.65, margin: "0 0 24px" }}>
                    Built with camera barcode detection, encrypted ticket signatures, and atomic database check-ins.
                    Scan tickets for overall daily admission or track individual session attendance seamlessly.
                  </p>
                  <div
                    style={{
                      padding: "16px 20px",
                      borderRadius: "14px",
                      background: "rgba(57, 131, 107, 0.12)",
                      border: "1px solid rgba(57, 131, 107, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <span style={{ fontSize: "1.8rem" }}>✅</span>
                    <div>
                      <strong style={{ display: "block", color: "#059669", fontSize: "0.95rem" }}>
                        Verification Confirmed (0.18s)
                      </strong>
                      <span style={{ color: "#64748B", fontSize: "0.82rem" }}>
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
                    background: "#0F172A",
                    border: "1px solid #E2E8F0",
                    textAlign: "center",
                  }}
                >
                  <div className="scanner-viewfinder" style={{ position: "relative", width: "160px", height: "160px", margin: "0 auto", border: "2px solid #059669", borderRadius: "14px", padding: "12px", display: "grid", placeItems: "center", overflow: "hidden" }}>
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=EVT-98421"
                      alt="Scanner Target"
                      style={{ width: "100%", height: "100%", opacity: 0.9 }}
                    />
                    <div className="scan-laser-line" />
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "16px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#A7D5CD",
                    }}
                  >
                    ● Camera Live &amp; Scanning at 60 FPS
                  </span>
                </div>
              </div>
            )}

            {/* TAB 4: VERIFIED CERTIFICATES */}
            {activeTab === "cert" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "40px", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#D97706", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    CRYPTOGRAPHIC CERTIFICATE STUDIO
                  </span>
                  <h3 style={{ fontSize: "2rem", color: "#0F172A", fontWeight: 800, margin: "8px 0 14px", letterSpacing: "-0.03em" }}>
                    Zero fraud. Attendance-gated credentials.
                  </h3>
                  <p style={{ color: "#64748B", fontSize: "0.98rem", lineHeight: 1.65, margin: "0 0 24px" }}>
                    Certificates are only issued to participants whose attendance has been physically verified.
                    Choose flexible rules: All days attended, minimum days attended, or required sessions completed.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 14px", borderRadius: "9999px", background: "rgba(197, 138, 59, 0.12)", border: "1px solid rgba(197, 138, 59, 0.3)", color: "#D97706", fontSize: "0.8rem", fontWeight: 700 }}>
                      📜 8 Signature Templates
                    </span>
                    <span style={{ padding: "6px 14px", borderRadius: "9999px", background: "rgba(57, 131, 107, 0.12)", border: "1px solid rgba(57, 131, 107, 0.3)", color: "#059669", fontSize: "0.8rem", fontWeight: 700 }}>
                      ⭐ Feedback Gating
                    </span>
                  </div>
                </div>

                {/* Simulated Certificate Graphic */}
                <div
                  style={{
                    padding: "28px",
                    borderRadius: "18px",
                    background: "#F8FAFC",
                    border: "2px solid #E2E8F0",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
                    textAlign: "center",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", letterSpacing: "0.18em", color: "#059669", fontWeight: 800, textTransform: "uppercase" }}>
                    CERTIFICATE OF PARTICIPATION
                  </span>
                  <h4 style={{ margin: "14px 0 6px", fontSize: "1.5rem", color: "#0F172A", fontFamily: "Georgia, serif" }}>
                    Alex Morgan
                  </h4>
                  <p style={{ color: "#64748B", fontSize: "0.85rem", margin: "0 0 16px" }}>
                    Has successfully completed all verified requirements of
                    <br />
                    <strong style={{ color: "#0F172A" }}>TechSummit 2026</strong>
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-around", borderTop: "1px solid #E2E8F0", paddingTop: "14px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.68rem", color: "#64748B", fontWeight: 700 }}>DATE</span>
                      <strong style={{ fontSize: "0.82rem", color: "#0F172A" }}>Nov 22, 2026</strong>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "0.68rem", color: "#64748B", fontWeight: 700 }}>VERIFICATION</span>
                      <strong style={{ fontSize: "0.82rem", color: "#059669" }}>CR-98421-OK</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. KEY METRICS RIBBON
          ========================================================================= */}
      <section
        style={{
          borderTop: "1px solid #E2E8F0",
          borderBottom: "1px solid #E2E8F0",
          background: "#F1F5F9",
          padding: "44px 24px",
          margin: "80px 0 60px",
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
            <strong style={{ display: "block", fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.04em" }}>
              0.18s
            </strong>
            <span style={{ color: "#64748B", fontSize: "0.88rem", fontWeight: 600 }}>
              Sub-second QR verification
            </span>
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.04em" }}>
              100%
            </strong>
            <span style={{ color: "#64748B", fontSize: "0.88rem", fontWeight: 600 }}>
              Anti-fraud certificate gating
            </span>
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.04em" }}>
              12
            </strong>
            <span style={{ color: "#64748B", fontSize: "0.88rem", fontWeight: 600 }}>
              Section institutional reports
            </span>
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "clamp(2rem, 3.5vw, 3rem)", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.04em" }}>
              Single
            </strong>
            <span style={{ color: "#64748B", fontSize: "0.88rem", fontWeight: 600 }}>
              Pass for multi-day events
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. BENTO BOX FEATURE GRID
          ========================================================================= */}
      <section style={{ maxWidth: "1140px", margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#059669", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            THE EVENTRA ECOSYSTEM
          </span>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.035em", margin: "8px 0 14px" }}>
            Engineered for performance.
            <br />
            <span style={{ color: "#059669" }}>Designed with restraint.</span>
          </h2>
          <p style={{ color: "#64748B", fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto" }}>
            Every touchpoint — from participant registration to the final audited executive report — is seamlessly connected.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {/* Bento 1: Multi-day Studio (Wide) */}
          <div className="home-interactive-card" style={{ gridColumn: "span 2", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "12px" }}>🗓️</div>
            <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>
              Smart Multi-Day Studio
            </h3>
            <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
              Manage conferences spanning single or multiple dates with individual day schedules,
              dynamic session builders, speaker profiles, room designations, and capacity controls.
              Never duplicate event records again.
            </p>
            <div style={{ marginTop: "24px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ padding: "5px 12px", borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", fontSize: "0.8rem", fontWeight: 600 }}>
                Auto Day Numbering
              </span>
              <span style={{ padding: "5px 12px", borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", fontSize: "0.8rem", fontWeight: 600 }}>
                Session Capacities
              </span>
              <span style={{ padding: "5px 12px", borderRadius: "8px", background: "rgba(5, 150, 105, 0.12)", color: "#059669", fontSize: "0.8rem", fontWeight: 600 }}>
                Instant Slug Publishing
              </span>
            </div>
          </div>

          {/* Bento 2: Sub-Second Scanner */}
          <div className="home-interactive-card" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "12px" }}>⚡</div>
            <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>
              Fast QR Check-In
            </h3>
            <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
              Sub-second camera scanning powered by atomic database operations and unique indexes
              to eliminate duplicate check-ins even under heavy gate traffic.
            </p>
            <div style={{ marginTop: "24px" }}>
              <span style={{ color: "#059669", fontSize: "0.82rem", fontWeight: 700 }}>
                ✓ Daily &amp; Session Modes
              </span>
            </div>
          </div>

          {/* Bento 3: Digital Wallet Passes */}
          <div className="home-interactive-card" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "12px" }}>🎫</div>
            <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>
              Digital Passes
            </h3>
            <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
              Cryptographic vector PDF passes generated instantly and dispatched to attendee inboxes,
              complete with live enrolled sessions and barcode tokens.
            </p>
            <div style={{ marginTop: "24px" }}>
              <span style={{ color: "#059669", fontSize: "0.82rem", fontWeight: 700 }}>
                ✓ Apple Wallet Grade Aesthetics
              </span>
            </div>
          </div>

          {/* Bento 4: Attendance-Gated Certificates */}
          <div className="home-interactive-card" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "12px" }}>🎓</div>
            <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>
              Verified Certificates
            </h3>
            <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
              Issue tamper-proof certificates governed by attendance threshold rules:
              all days attended, minimum days attended, or required sessions completed.
            </p>
            <div style={{ marginTop: "24px" }}>
              <span style={{ color: "#D97706", fontSize: "0.82rem", fontWeight: 700 }}>
                ✓ 8 Signature Layouts
              </span>
            </div>
          </div>

          {/* Bento 5: Executive Post-Event Reports */}
          <div className="home-interactive-card" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "12px" }}>📄</div>
            <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>
              12-Section Reports
            </h3>
            <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
              Generate audited executive vector PDF reports with running headers, attendance charts,
              session participation breakdown, and sentiment analysis directly from live records.
            </p>
            <div style={{ marginTop: "24px" }}>
              <span style={{ color: "#059669", fontSize: "0.82rem", fontWeight: 700 }}>
                ✓ Executive Ready
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. COMPARISON MATRIX
          ========================================================================= */}
      <section style={{ maxWidth: "980px", margin: "0 auto 100px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#059669", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            WHY ORGANIZERS CHOOSE EVENTRA
          </span>
          <h2 style={{ fontSize: "2.3rem", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", margin: "8px 0" }}>
            Engineered without compromise.
          </h2>
        </div>

        <div
          style={{
            borderRadius: "20px",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            overflow: "hidden",
            boxShadow: "0 6px 25px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr",
              padding: "18px 24px",
              background: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
              fontWeight: 800,
              fontSize: "0.85rem",
              color: "#64748B",
            }}
          >
            <span>CAPABILITY</span>
            <span style={{ color: "#059669" }}>EVENTRA</span>
            <span>LEGACY PLATFORMS</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "18px 24px", borderBottom: "1px solid #E2E8F0", fontSize: "0.9rem" }}>
            <span style={{ color: "#0F172A", fontWeight: 700 }}>Multi-Day Architecture</span>
            <span style={{ color: "#059669", fontWeight: 700 }}>✓ Unified Event, Single Pass</span>
            <span style={{ color: "#64748B" }}>Separate events per day</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "18px 24px", borderBottom: "1px solid #E2E8F0", fontSize: "0.9rem" }}>
            <span style={{ color: "#0F172A", fontWeight: 700 }}>QR Attendance Scanning</span>
            <span style={{ color: "#059669", fontWeight: 700 }}>✓ Sub-second atomic verification</span>
            <span style={{ color: "#64748B" }}>Slow manual paper check-ins</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "18px 24px", borderBottom: "1px solid #E2E8F0", fontSize: "0.9rem" }}>
            <span style={{ color: "#0F172A", fontWeight: 700 }}>Certificate Issuance</span>
            <span style={{ color: "#059669", fontWeight: 700 }}>✓ Attendance &amp; feedback gated</span>
            <span style={{ color: "#64748B" }}>Unverified mass emailing</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "18px 24px", fontSize: "0.9rem" }}>
            <span style={{ color: "#0F172A", fontWeight: 700 }}>Post-Event Reporting</span>
            <span style={{ color: "#059669", fontWeight: 700 }}>✓ 12-section vector PDF studio</span>
            <span style={{ color: "#64748B" }}>Basic CSV spreadsheet dumps</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. MINIMAL FOOTER
          ========================================================================= */}
      <footer
        style={{
          borderTop: "1px solid #E2E8F0",
          background: "#F1F5F9",
          padding: "26px 24px",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "#64748B",
          fontFamily: "var(--font-body, 'Inter', sans-serif)",
        }}
      >
        <div>
          Copyright © 2026{" "}
          <Link
            to={token && localStorage.getItem("eventra_user_role") === "SUPER_ADMIN" ? "/admin" : "/admin/login"}
            style={{
              color: "#0F172A",
              fontWeight: 700,
              textDecoration: "none",
              transition: "color 0.16s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#059669")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#0F172A")}
            title="EVENTRA Admin"
          >
            EVENTRA
          </Link>{" "}
          Inc. All rights reserved.
        </div>
      </footer>
    </main>
  </>
);
}
