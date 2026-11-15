import React, { useEffect, useState } from "react";
import "./IntroAnimation.css";

// 5 event-related emojis with radial orbit positions (angles in degrees)
const EVENT_EMOJIS = [
  { emoji: "🎟️", label: "Event ticket", angle: 270, delay: "0.08s" }, // Top
  { emoji: "🎤", label: "Microphone", angle: 342, delay: "0.24s" },   // Top Right
  { emoji: "🎉", label: "Celebration", angle: 54, delay: "0.40s" },   // Bottom Right
  { emoji: "🎭", label: "Performance", angle: 126, delay: "0.56s" },  // Bottom Left
  { emoji: "📅", label: "Calendar", angle: 198, delay: "0.72s" },     // Top Left
];

export default function IntroAnimation({ onComplete }) {
  // Stage flow: "emojis" (0 - 1.45s) -> "converging" (1.45 - 1.65s) -> "reveal" (1.65 - 2.85s) -> "zoomOut" (2.85 - 3.65s)
  const [stage, setStage] = useState("emojis");
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // If user prefers reduced motion, skip intro immediately
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      handleComplete();
      return;
    }

    // Scene 2 Trigger: Emojis converge inwards at 1.45s
    const t1 = setTimeout(() => {
      setStage("converging");
    }, 1450);

    // Scene 2 Trigger: EVENTRA brand revealed at 1.65s
    const t2 = setTimeout(() => {
      setStage("reveal");
    }, 1650);

    // Scene 3 Trigger: Zoom out & dissolve start at 2.85s
    const t3 = setTimeout(() => {
      setStage("zoomOut");
      setIsExiting(true);
    }, 2850);

    // Complete & unmount at 3.65s
    const t4 = setTimeout(() => {
      handleComplete();
    }, 3650);

    // ESC key listener to skip
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function handleComplete() {
    try {
      sessionStorage.setItem("eventra_intro_seen", "true");
    } catch {}
    if (onComplete) onComplete();
  }

  function handleSkip() {
    setIsExiting(true);
    setTimeout(() => {
      handleComplete();
    }, 250);
  }

  // Radius for circular positioning (responsive)
  const orbitRadius = typeof window !== "undefined" && window.innerWidth < 640 ? 105 : 138;

  return (
    <div
      className={`eventra-intro-overlay${isExiting ? " is-exiting" : ""}`}
      role="region"
      aria-label="EVENTRA Brand Introduction"
    >
      {/* Ambient background glows */}
      <div className="intro-ambient-orb intro-ambient-orb-1" />
      <div className="intro-ambient-orb intro-ambient-orb-2" />

      {/* Skip Intro action button */}
      <button
        type="button"
        className="intro-skip-btn"
        onClick={handleSkip}
        title="Skip intro animation (Esc)"
      >
        <span>Skip</span>
        <span>✕</span>
      </button>

      {/* Central Animated Stage */}
      <div className="intro-stage-center">
        {/* Orbital ring track indicator */}
        <div className={`intro-orbit-track${stage !== "emojis" ? " is-fading" : ""}`} />

        {/* Scene 1: Orbiting Event Emojis */}
        <div
          className={`intro-orbital-system${
            stage === "converging" || stage === "reveal" || stage === "zoomOut"
              ? " is-converging"
              : ""
          }`}
        >
          {EVENT_EMOJIS.map((item) => {
            const rad = (item.angle * Math.PI) / 180;
            const tx = Math.round(Math.cos(rad) * orbitRadius);
            const ty = Math.round(Math.sin(rad) * orbitRadius);

            return (
              <div
                key={item.label}
                className="intro-emoji-item"
                style={{
                  "--tx": `${tx}px`,
                  "--ty": `${ty}px`,
                  "--delay": item.delay,
                }}
                aria-hidden="true"
              >
                <span className="intro-emoji-inner">{item.emoji}</span>
              </div>
            );
          })}
        </div>

        {/* Energy burst pulse when emojis converge */}
        <div
          className={`intro-energy-burst${
            stage === "converging" || stage === "reveal" ? " is-firing" : ""
          }`}
        />

        {/* Scene 2 & 3: EVENTRA Brand Reveal */}
        <div
          className={`intro-brand-reveal${
            stage === "reveal" || stage === "zoomOut" ? " is-active" : ""
          }`}
        >
          <h1 className="intro-logo-title">EVENTRA</h1>
          <p className="intro-logo-tagline">Where landmark events come to life</p>
          <div className="intro-badge-pill">
            <span style={{ fontSize: "0.65rem" }}>✦</span>
            <span>Premier Event &amp; Pass System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
