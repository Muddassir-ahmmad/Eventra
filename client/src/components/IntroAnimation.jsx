import React, { useEffect, useState, useRef } from "react";
import "./IntroAnimation.css";

// 5 event-related symbols for Scene 1 with distinct angular coordinates
const EVENT_SYMBOLS = [
  { symbol: "🎟️", label: "Event Ticket", angle: 270, delay: 0.1 },  // Top
  { symbol: "🎤", label: "Microphone", angle: 342, delay: 0.28 },   // Top Right
  { symbol: "🎉", label: "Celebration", angle: 54, delay: 0.46 },   // Bottom Right
  { symbol: "🎭", label: "Performance", angle: 126, delay: 0.64 },  // Bottom Left
  { symbol: "📅", label: "Calendar", angle: 198, delay: 0.82 },     // Top Left
];

// 14 floating ambient particles for subtle cinematic background depth
const AMBIENT_PARTICLES = [
  { x: 14, y: 22, size: 2.5, dur: 5.5, delay: 0.1 },
  { x: 26, y: 38, size: 3.2, dur: 6.2, delay: 0.4 },
  { x: 38, y: 16, size: 2.0, dur: 4.8, delay: 0.8 },
  { x: 72, y: 24, size: 2.8, dur: 5.9, delay: 0.2 },
  { x: 86, y: 34, size: 2.2, dur: 6.5, delay: 0.6 },
  { x: 18, y: 74, size: 3.0, dur: 5.2, delay: 0.3 },
  { x: 32, y: 82, size: 2.2, dur: 6.8, delay: 0.9 },
  { x: 66, y: 76, size: 3.4, dur: 5.4, delay: 0.5 },
  { x: 84, y: 68, size: 2.0, dur: 4.9, delay: 0.7 },
  { x: 50, y: 20, size: 2.5, dur: 6.0, delay: 0.2 },
  { x: 20, y: 52, size: 2.8, dur: 5.7, delay: 0.4 },
  { x: 80, y: 54, size: 2.4, dur: 6.3, delay: 0.8 },
  { x: 44, y: 86, size: 2.2, dur: 5.1, delay: 0.5 },
  { x: 58, y: 12, size: 2.0, dur: 6.6, delay: 0.3 },
];

export default function IntroAnimation({ onComplete, onZoomOut }) {
  // Timeline Stages:
  // "orbit": 0s - 1.45s (Scene 1: Staggered entry & circular orbital floating)
  // "converge": 1.45s - 1.70s (Symbols implode into center, pulse burst)
  // "reveal": 1.70s - 3.50s (Scene 2: Letter-by-letter EVENTRA reveal + light sweep + hold)
  // "zoomOut": 3.50s - 5.85s (Scene 3: Long cinematic zoom-out & flight to header logo)
  const [stage, setStage] = useState("orbit");
  const [zoomCoords, setZoomCoords] = useState({ x: 0, y: 0, scale: 0.32 });
  const [isSkipping, setIsSkipping] = useState(false);
  const wordmarkRef = useRef(null);

  useEffect(() => {
    // Immediate bypass if reduced motion is preferred
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      handleComplete();
      return;
    }

    // Add active marker to document body (used to seamlessly hide real header logo until docking)
    document.body.classList.add("eventra-intro-active");

    // Timeline triggers:
    // 1. Converge symbols towards center at 1.45s
    const t1 = setTimeout(() => {
      setStage("converge");
    }, 1450);

    // 2. Reveal EVENTRA wordmark letter-by-letter at 1.70s
    const t2 = setTimeout(() => {
      setStage("reveal");
    }, 1700);

    // 3. Initiate Long Cinematic Zoom-Out at 3.50s
    const t3 = setTimeout(() => {
      startZoomOut();
    }, 3500);

    // 4. Complete & unmount at 5.85s
    const t4 = setTimeout(() => {
      handleComplete();
    }, 5850);

    // Listen for ESC key to allow instant skip
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
      document.body.classList.remove("eventra-intro-active");
    };
  }, []);

  function startZoomOut() {
    // Measure the exact position of the real header logo on screen
    const targetBrand = document.getElementById("app-header-brand") || document.querySelector(".app-header .brand");
    const logoEl = wordmarkRef.current;

    if (targetBrand && logoEl) {
      const targetRect = targetBrand.getBoundingClientRect();
      const logoRect = logoEl.getBoundingClientRect();

      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      const currentCenterX = window.innerWidth / 2;
      const currentCenterY = window.innerHeight / 2;

      const deltaX = Math.round(targetCenterX - currentCenterX);
      const deltaY = Math.round(targetCenterY - currentCenterY);

      const targetScale = logoRect.height > 0
        ? Math.round((targetRect.height / logoRect.height) * 1000) / 1000
        : 0.32;

      setZoomCoords({ x: deltaX, y: deltaY, scale: Math.max(0.2, Math.min(0.5, targetScale)) });
    } else {
      // Fallback coordinates based on standard responsive header layout
      const isMobile = window.innerWidth < 640;
      const fallbackTargetX = isMobile ? 55 : (window.innerWidth > 1240 ? (window.innerWidth - 1240) / 2 + 55 : 55);
      const fallbackTargetY = 34;
      const deltaX = Math.round(fallbackTargetX - window.innerWidth / 2);
      const deltaY = Math.round(fallbackTargetY - window.innerHeight / 2);
      setZoomCoords({ x: deltaX, y: deltaY, scale: 0.32 });
    }

    setStage("zoomOut");
    if (onZoomOut) onZoomOut();
  }

  function handleComplete() {
    document.body.classList.remove("eventra-intro-active");
    try {
      sessionStorage.removeItem("eventra_intro_seen");
    } catch {}
    if (onComplete) onComplete();
  }

  function handleSkip() {
    setIsSkipping(true);
    setTimeout(() => {
      handleComplete();
    }, 200);
  }

  // Circular orbit radius (scaled gracefully for mobile)
  const orbitRadius = typeof window !== "undefined" && window.innerWidth < 640 ? 105 : 145;

  return (
    <div
      className={`eventra-intro-overlay stage-${stage}${isSkipping ? " is-skipping" : ""}`}
      role="region"
      aria-label="EVENTRA Brand Introduction"
    >
      {/* Cinematic Ambient Lighting & Particles */}
      <div className="intro-ambient-lighting">
        <div className="intro-glow-orb intro-glow-orb-primary" />
        <div className="intro-glow-orb intro-glow-orb-secondary" />
        <div className="intro-glow-orb intro-glow-orb-center" />

        {AMBIENT_PARTICLES.map((p, idx) => (
          <span
            key={idx}
            className="intro-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Skip Button */}
      <button
        type="button"
        className="intro-skip-pill"
        onClick={handleSkip}
        title="Skip intro animation (Esc)"
      >
        <span>Skip</span>
        <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>✕</span>
      </button>

      {/* =========================================================================
          SCENE 1: EVENT SYMBOLS ORBIT & CONVERGENCE
          ========================================================================= */}
      <div className={`intro-orbital-container${stage === "converge" || stage === "reveal" || stage === "zoomOut" ? " is-imploded" : ""}`}>
        <div className="intro-orbital-ring" />
        {EVENT_SYMBOLS.map((item) => {
          const rad = (item.angle * Math.PI) / 180;
          const tx = Math.round(Math.cos(rad) * orbitRadius);
          const ty = Math.round(Math.sin(rad) * orbitRadius);

          return (
            <div
              key={item.label}
              className="intro-symbol-token"
              style={{
                "--tx": `${tx}px`,
                "--ty": `${ty}px`,
                "--delay": `${item.delay}s`,
              }}
              title={item.label}
            >
              <span className="intro-symbol-inner">{item.symbol}</span>
            </div>
          );
        })}
      </div>

      {/* Energy Burst Shockwave Pulse */}
      <div className={`intro-energy-pulse${stage === "converge" || stage === "reveal" ? " is-firing" : ""}`} />

      {/* =========================================================================
          SCENE 2 & 3: EVENTRA MAIN BRAND HERO & LONG CINEMATIC ZOOM-OUT
          ========================================================================= */}
      <div
        ref={wordmarkRef}
        className={`intro-wordmark-wrapper${stage === "reveal" ? " is-revealed" : ""}${stage === "zoomOut" ? " is-zooming" : ""}`}
        style={{
          "--zoom-x": `${zoomCoords.x}px`,
          "--zoom-y": `${zoomCoords.y}px`,
          "--zoom-scale": zoomCoords.scale,
        }}
      >
        {/* Dominant Wordmark with Sequential Letter Animation */}
        <div className="intro-wordmark-title" aria-label="EVENTRA">
          <span className="intro-letter intro-letter-base" style={{ "--i": 0 }}>E</span>
          <span className="intro-letter intro-letter-base" style={{ "--i": 1 }}>V</span>
          <span className="intro-letter intro-letter-base" style={{ "--i": 2 }}>E</span>
          <span className="intro-letter intro-letter-base" style={{ "--i": 3 }}>N</span>
          <span className="intro-letter intro-letter-base" style={{ "--i": 4 }}>T</span>
          <span className="intro-letter intro-letter-accent" style={{ "--i": 5 }}>R</span>
          <span className="intro-letter intro-letter-accent" style={{ "--i": 6 }}>A</span>
          <span className="intro-letter intro-letter-dot" style={{ "--i": 7 }}>•</span>
        </div>

        {/* Tagline & Badge (Dissolve during Scene 3 zoom-out) */}
        <div className="intro-sub-elements">
          <p className="intro-brand-tagline">
            Where Landmark Events Come to Life
          </p>
          <div className="intro-category-pill">
            <span style={{ fontSize: "0.7rem", color: "#34D399" }}>✦</span>
            <span>Premier Event &amp; Pass System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
