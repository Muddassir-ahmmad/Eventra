import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import {
  formatEventDateDisplay,
  getEventTotalDays,
  isEventPastOrCompleted,
} from "../utils/eventTiming";
import { getEventFontConfig } from "../utils/eventFonts";

export default function PublicEvent() {
  const { slug } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Participant ticket & certificate self-service retrieval
  const [showLookup, setShowLookup] = useState(false);
  const [lookupQuery, setLookupQuery] = useState(localStorage.getItem("eventra_participant_email") || "");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        const { data } = await api.get(`/events/public/${slug}`);
        setEvent(data.event);
      } catch (err) {
        setError(err.response?.data?.message || "Event not found or inactive.");
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [slug]);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showPosterLightbox, setShowPosterLightbox] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(false);
  const [downloadingPoster, setDownloadingPoster] = useState(false);
  const [copyingPoster, setCopyingPoster] = useState(false);
  const [copiedPosterSuccess, setCopiedPosterSuccess] = useState(false);
  const [sharingPoster, setSharingPoster] = useState(false);

  // Keyboard shortcut listener to close modals
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowPosterLightbox(false);
        setLightboxZoom(false);
        setShowShareModal(false);
        setShowLookup(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Dynamic OpenGraph & Twitter meta tags for rich social sharing previews
  useEffect(() => {
    if (!event) return;
    document.title = `${event.title} | EVENTRA`;

    const updateMeta = (prop, content, isName = false) => {
      if (!content) return;
      const attr = isName ? `name="${prop}"` : `property="${prop}"`;
      let el = document.querySelector(`meta[${attr}]`);
      if (!el) {
        el = document.createElement("meta");
        if (isName) el.setAttribute("name", prop);
        else el.setAttribute("property", prop);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    updateMeta("og:title", event.title);
    updateMeta("og:description", event.shortDescription || event.description?.slice(0, 160) || "Join us on EVENTRA");
    updateMeta("og:url", window.location.href);
    if (event.posterUrl) {
      updateMeta("og:image", event.posterUrl);
      updateMeta("twitter:image", event.posterUrl);
      updateMeta("twitter:card", "summary_large_image", true);
    }
  }, [event]);

  function handleShare() {
    setShowShareModal(true);
  }

  function getShareMessage() {
    const posterLine = event?.posterUrl ? `\n🖼️ Official Event Flyer: ${event.posterUrl}\n` : "";
    return `🌟 Join me at *${event?.title || "this event"}*!\n\n📅 Date: ${formattedDate}\n⏰ Time: ${timeString}\n📍 Venue: ${event?.venue || (event?.mode === "online" ? "Virtual Online Platform" : "Venue TBA")}\n${posterLine}\n🎟️ Claim your verified attendee pass:\n${window.location.href}`;
  }

  function copyShareInvite() {
    navigator.clipboard?.writeText(getShareMessage());
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }

  // Download high-resolution poster
  async function downloadPosterFile() {
    if (!event?.posterUrl) return;
    try {
      setDownloadingPoster(true);
      const res = await fetch(event.posterUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanTitle = (event.slug || event.title || "event").replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      link.download = `${cleanTitle}-official-poster.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(event.posterUrl, "_blank");
    } finally {
      setDownloadingPoster(false);
    }
  }

  // Convert poster URL to File object for Web Share API Level 2 file attachment
  async function getPosterFile() {
    if (!event?.posterUrl) return null;
    try {
      const response = await fetch(event.posterUrl);
      const blob = await response.blob();
      const cleanTitle = (event.slug || event.title || "event").replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      const filename = `${cleanTitle}-poster.${ext}`;
      return new File([blob], filename, { type: blob.type || "image/jpeg" });
    } catch (err) {
      console.warn("Could not fetch poster file:", err);
      return null;
    }
  }

  // Native share with attached poster file if supported
  async function handleNativeShareWithPoster() {
    setSharingPoster(true);
    try {
      const shareData = {
        title: `${event?.title || "Event"} | EVENTRA`,
        text: getShareMessage(),
        url: window.location.href,
      };

      if (event?.posterUrl && typeof navigator !== "undefined" && navigator.canShare) {
        const file = await getPosterFile();
        if (file && navigator.canShare({ files: [file] })) {
          await navigator.share({
            ...shareData,
            files: [file],
          });
          return;
        }
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }

      setShowShareModal(true);
    } catch (err) {
      if (err.name !== "AbortError") {
        setShowShareModal(true);
      }
    } finally {
      setSharingPoster(false);
    }
  }

  // Copy poster image directly to clipboard for instant pasting
  async function copyPosterImage() {
    if (!event?.posterUrl) return;
    try {
      setCopyingPoster(true);
      const res = await fetch(event.posterUrl);
      const blob = await res.blob();

      let pngBlob = blob;
      if (!blob.type.includes("png")) {
        pngBlob = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((b) => resolve(b || blob), "image/png");
          };
          img.onerror = () => resolve(blob);
          img.src = event.posterUrl;
        });
      }

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);
        setCopiedPosterSuccess(true);
        setTimeout(() => setCopiedPosterSuccess(false), 2500);
      } else {
        navigator.clipboard?.writeText(event.posterUrl);
        setCopiedPosterSuccess(true);
        setTimeout(() => setCopiedPosterSuccess(false), 2500);
      }
    } catch (err) {
      navigator.clipboard?.writeText(event.posterUrl);
      setCopiedPosterSuccess(true);
      setTimeout(() => setCopiedPosterSuccess(false), 2500);
    } finally {
      setCopyingPoster(false);
    }
  }

  async function handleNativeShare() {
    return handleNativeShareWithPoster();
  }

  async function downloadTicketPdf(regId) {
    try {
      setDownloadingPdf(`ticket-${regId}`);
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
      setDownloadingPdf(null);
    }
  }

  async function downloadCertificatePdf(regId) {
    try {
      setDownloadingPdf(`cert-${regId}`);
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
      setDownloadingPdf(null);
    }
  }

  async function handleLookupSubmit(e) {
    e?.preventDefault();
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const isEmail = lookupQuery.includes("@");
      const paramKey = isEmail ? "email" : "phone";
      const { data } = await api.get(`/registrations/participant/lookup?slug=${slug}&${paramKey}=${encodeURIComponent(lookupQuery.trim())}`);
      if (data.registrations && data.registrations.length > 0) {
        setLookupResult(data.registrations[0]);
        setLookupQuery("");
        if (isEmail) {
          localStorage.setItem("eventra_participant_email", lookupQuery.trim());
        } else {
          localStorage.setItem("eventra_participant_phone", lookupQuery.trim());
        }
      } else {
        setLookupError(`No confirmed registration found for ${event.title} with that ${isEmail ? "email address" : "phone number"}.`);
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || "Could not retrieve ticket pass. Please check your details.");
    } finally {
      setLookupLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="public-page-root">
        <div style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#94a3b8" }}>Loading event presentation...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="public-page-root">
        <div style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 480, padding: 24 }}>
            <span style={{ fontSize: "3rem" }}>🔍</span>
            <h1 style={{ fontSize: "1.8rem", margin: "16px 0 8px" }}>{error || "Event Not Found"}</h1>
            <p style={{ color: "#94a3b8", marginBottom: 24 }}>
              The event link may have expired or is not yet published by the organizer.
            </p>
            <Link className="btn-hero-primary" to="/">
              Explore EVENTRA
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isMultiDay = event.eventDurationType === "multi_day" || (Array.isArray(event.days) && event.days.length > 1);
  const totalDays = getEventTotalDays(event);
  const isCompleted = isEventPastOrCompleted(event);
  const isClosed = event.status === "closed" || isCompleted;
  const isSoldOut = event.isSoldOut === true;
  const canRegister = !isClosed && !isSoldOut;

  const eventDateObj = event.date ? new Date(event.date) : null;
  const formattedDate = isMultiDay
    ? formatEventDateDisplay(event)
    : eventDateObj
    ? eventDateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Date TBD";

  const timeString = event.startTime
    ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ""}`
    : "Time TBD";

  const isLocationUrl = Boolean(
    event.location && /^https?:\/\//i.test(event.location.trim())
  );

  const googleMapsUrl = isLocationUrl
    ? event.location.trim()
    : event.venue && event.mode !== "online"
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${event.venue} ${event.location || ""}`.trim()
      )}`
    : null;

  const fontConfig = getEventFontConfig(event?.eventFont);

  return (
    <main
      className="public-page-root"
      style={{
        "--event-heading-font": fontConfig.headingFont,
        "--event-body-font": fontConfig.bodyFont,
      }}
    >
      {/* Ambient Radial Lighting */}
      <div className="ambient-glow-bg" />

      {/* Public Navigation */}
      <nav className="public-nav-bar">
        <Link className="public-nav-brand" to="/participant/dashboard">
          EVENT<span>RA</span>
        </Link>
        <div className="public-nav-right">
          <button
            type="button"
            className="btn-hero-secondary"
            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            onClick={() => setShowLookup(true)}
          >
            🎟️ Find My Ticket Pass
          </button>
          <button type="button" className="btn-hero-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }} onClick={handleShare}>
            🔗 Share
          </button>
          {canRegister ? (
            <Link className="btn-hero-primary" style={{ padding: "10px 20px", fontSize: "0.88rem" }} to={`/events/${event.slug}/register`}>
              Register Now
            </Link>
          ) : (
            <span className={`status-pill-badge ${isSoldOut ? "soldout" : "completed"}`}>
              {isSoldOut ? "Sold Out" : "Event Concluded"}
            </span>
          )}
        </div>
      </nav>

      {/* 1. HERO SECTION & POSTER */}
      <header className="hero-wrapper">
        <div className="hero-grid">
          <div className="hero-left-content">
            <div className="badge-row">
              <span className="category-pill">{event.category || "Event"}</span>
              <span className="mode-pill-badge">
                {event.mode === "offline" ? "📍 In-Person" : event.mode === "online" ? "🌐 Online" : "⚡ Hybrid"}
              </span>
              {isMultiDay && (
                <span className="duration-pill-badge">
                  🗓️ {totalDays}-Day Event · Single All-Access Pass
                </span>
              )}
              <span className={`status-pill-badge ${canRegister ? "open" : isSoldOut ? "soldout" : "completed"}`}>
                {canRegister ? "● Registration Open" : isSoldOut ? "● Sold Out" : "● Concluded"}
              </span>
            </div>

            <h1 className="hero-title">
              {event.title}
            </h1>

            <p className="hero-tagline">
              {event.shortDescription || event.description?.slice(0, 160) || "Join us for this premier event experience."}
            </p>

            <div className="hero-meta-grid">
              <div className="hero-meta-card">
                <span className="hero-meta-icon">📅</span>
                <div className="hero-meta-info">
                  <strong>{formattedDate}</strong>
                  <span>{timeString}</span>
                </div>
              </div>

              <div className="hero-meta-card">
                <span className="hero-meta-icon">📍</span>
                <div className="hero-meta-info">
                  <strong>{event.venue || (event.mode === "online" ? "Virtual Platform" : "Venue")}</strong>
                  {isLocationUrl ? (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hero-locate-btn"
                      title="Open location map in new tab"
                    >
                      {event.mode === "online" ? "🌐 Join Platform ↗" : "🗺️ Locate Venue ↗"}
                    </a>
                  ) : (
                    <span>{event.location || (event.mode === "online" ? "Virtual Meeting" : "Main Campus")}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="hero-cta-row">
              {canRegister ? (
                <Link className="btn-hero-primary" to={`/events/${event.slug}/register`}>
                  Claim Your Ticket Pass →
                </Link>
              ) : (
                <button type="button" className="btn-hero-primary" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
                  {isSoldOut ? "Event Sold Out" : "Registration Closed"}
                </button>
              )}

              <button
                type="button"
                className="btn-hero-secondary"
                style={{ borderColor: "rgba(124, 77, 255, 0.4)", color: "#c4b5fd" }}
                onClick={() => setShowLookup(true)}
              >
                🔍 Already Registered? Retrieve Ticket / Certificate
              </button>

              <button type="button" className="btn-hero-secondary" onClick={handleShare}>
                🔗 Share Event
              </button>
            </div>
          </div>

          {/* 1b. THEATER-GRADE POSTER SHOWCASE */}
          <div className="hero-poster-showcase">
            {event.posterUrl ? (
              <div className="poster-showcase-inner">
                {/* Atmospheric Ambient Glow matching the poster colors */}
                <div
                  className="poster-ambient-glow"
                  style={{ backgroundImage: `url("${event.posterUrl}")` }}
                  aria-hidden="true"
                />

                {/* Framing Canvas Wrapper */}
                <div
                  className="poster-canvas-wrapper"
                  onClick={() => setShowPosterLightbox(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setShowPosterLightbox(true);
                  }}
                  title="Click to view full-resolution poster"
                >
                  <img
                    src={event.posterUrl}
                    alt={`${event.title} Official Poster`}
                    className="hero-poster-image"
                    loading="eager"
                  />

                  {/* Top Badge: Official Flyer */}
                  <div className="poster-top-badge">
                    <span>✦ Official Event Flyer</span>
                  </div>

                  {/* Hover / Tap Quick Action Pills */}
                  <div className="poster-hover-actions">
                    <button
                      type="button"
                      className="poster-action-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPosterLightbox(true);
                      }}
                      title="Open full-resolution lightbox"
                    >
                      🔍 Enlarge
                    </button>
                    <button
                      type="button"
                      className="poster-action-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPosterFile();
                      }}
                      title="Download high-resolution poster"
                    >
                      📥 Download
                    </button>
                    <button
                      type="button"
                      className="poster-action-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNativeShareWithPoster();
                      }}
                      title="Share with poster attached"
                    >
                      🚀 Share with Image
                    </button>
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="poster-toolbar-strip">
                  <button
                    type="button"
                    className="poster-strip-btn"
                    onClick={() => setShowPosterLightbox(true)}
                    title="View full poster in high resolution"
                  >
                    🔍 View Full Poster
                  </button>
                  <button
                    type="button"
                    className="poster-strip-btn"
                    onClick={downloadPosterFile}
                    disabled={downloadingPoster}
                    title="Save poster to your device"
                  >
                    {downloadingPoster ? "Saving…" : "📥 Save Flyer"}
                  </button>
                  <button
                    type="button"
                    className="poster-strip-btn highlight"
                    onClick={handleNativeShareWithPoster}
                    title="Share event and poster"
                  >
                    🔗 Share Event &amp; Flyer
                  </button>
                </div>
              </div>
            ) : (
              <div className="poster-showcase-fallback">
                <div className="poster-fallback-decor" />
                <div className="poster-fallback-body">
                  <span className="poster-fallback-brand">EVENTRA · OFFICIAL EVENT</span>
                  <h3 className="poster-fallback-title">{event.title}</h3>
                  <div className="poster-fallback-meta">
                    <span>📅 {formattedDate}</span>
                    <span>📍 {event.venue || (event.mode === "online" ? "Virtual Online" : "Venue Announced Soon")}</span>
                  </div>
                  <span className="poster-fallback-badge">
                    {canRegister ? "✦ Verified Attendee Pass Open" : "Event Concluded"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* POSTER LIGHTBOX MODAL */}
      {showPosterLightbox && event.posterUrl && (
        <div
          className="poster-lightbox-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPosterLightbox(false);
              setLightboxZoom(false);
            }
          }}
        >
          <header className="poster-lightbox-header">
            <div className="poster-lightbox-title">
              <span>OFFICIAL FLYER</span>
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {event.title}
              </strong>
            </div>

            <div className="poster-lightbox-actions">
              <button
                type="button"
                className="poster-lightbox-btn btn-ghost"
                onClick={() => setLightboxZoom(!lightboxZoom)}
                title={lightboxZoom ? "Reset zoom" : "Zoom in"}
              >
                {lightboxZoom ? "🔍 Reset Zoom" : "🔍 Zoom In"}
              </button>

              <button
                type="button"
                className="poster-lightbox-btn btn-ghost"
                onClick={downloadPosterFile}
                disabled={downloadingPoster}
                title="Download high-resolution poster"
              >
                {downloadingPoster ? "Downloading…" : "📥 Download High-Res"}
              </button>

              <button
                type="button"
                className="poster-lightbox-btn btn-primary"
                onClick={handleNativeShareWithPoster}
                title="Share event with poster image"
              >
                🚀 Share with Poster
              </button>

              <button
                type="button"
                className="poster-lightbox-close"
                onClick={() => {
                  setShowPosterLightbox(false);
                  setLightboxZoom(false);
                }}
                aria-label="Close poster view"
              >
                ✕
              </button>
            </div>
          </header>

          <div
            className="poster-lightbox-viewport"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPosterLightbox(false);
                setLightboxZoom(false);
              }
            }}
          >
            <img
              src={event.posterUrl}
              alt={`${event.title} Poster Full`}
              className={`poster-lightbox-image${lightboxZoom ? " is-zoomed" : ""}`}
              onClick={() => setLightboxZoom(!lightboxZoom)}
              title="Click to toggle zoom"
            />
          </div>
        </div>
      )}

      {/* 2. SHARE EVENT MODAL (Poster, Details, Website Link & Direct Channels) */}
      {showShareModal && (
        <div
          className="share-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
        >
          <div className="share-modal">
            <button
              type="button"
              className="share-modal-close"
              onClick={() => setShowShareModal(false)}
            >
              ✕
            </button>

            <span className="category-pill" style={{ marginBottom: 10, background: "rgba(5, 150, 105, 0.12)", color: "#059669", borderColor: "rgba(5, 150, 105, 0.3)" }}>
              ✦ EVENT &amp; FLYER SHARING
            </span>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: "6px 0 4px", color: "#0F172A" }}>
              Share {event.title}
            </h2>
            <p style={{ color: "#64748B", fontSize: "0.88rem", margin: "0 0 16px" }}>
              Invite attendees with the official event flyer, verified schedule, venue location, and direct pass link.
            </p>

            {/* Poster & Details Card Preview */}
            <div className="share-card-preview">
              {event.posterUrl ? (
                <div
                  className="share-poster-thumb-wrapper"
                  onClick={() => setShowPosterLightbox(true)}
                  title="Click to view full poster"
                >
                  <img src={event.posterUrl} alt={event.title} className="share-poster-thumb" />
                  <span className="share-poster-badge">Attached</span>
                </div>
              ) : (
                <div className="share-poster-placeholder">
                  <span>EVENTRA</span>
                  <strong>{event.title}</strong>
                </div>
              )}
              <div className="share-card-info">
                <h3>{event.title}</h3>
                <div className="share-card-meta">
                  <span>📅 {formattedDate}</span>
                  <span>⏱ {timeString}</span>
                  <span>📍 {event.venue || (event.mode === "online" ? "Virtual Online Platform" : "Venue TBA")}</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ color: "#059669", fontWeight: 700, fontSize: "0.78rem" }}>
                      {event.ticketMode === "free" ? "✦ Free Admission" : "Verified Ticket Admission"}
                    </span>
                    {event.posterUrl && (
                      <span style={{ color: "#2563EB", fontWeight: 700, fontSize: "0.78rem" }}>
                        ✓ Official Flyer Attached
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Action: Native Share with File (attaches poster file to WhatsApp/Apps) */}
            <button
              type="button"
              className="btn-hero-primary"
              style={{ width: "100%", justifyContent: "center", fontSize: "0.96rem", padding: "13px 20px", gap: 8 }}
              onClick={handleNativeShareWithPoster}
              disabled={sharingPoster}
            >
              {sharingPoster ? "Preparing Poster File…" : "🚀 Share Event with Poster (WhatsApp / Apps)"}
            </button>

            {/* Secondary Action Grid: Download Poster & Copy Image */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn-hero-secondary"
                style={{ justifyContent: "center", fontSize: "0.82rem", padding: "10px 14px", gap: 6 }}
                onClick={downloadPosterFile}
                disabled={downloadingPoster || !event.posterUrl}
                title="Download high-resolution poster file"
              >
                {downloadingPoster ? "Downloading…" : "📥 Download Poster"}
              </button>

              <button
                type="button"
                className="btn-hero-secondary"
                style={{ justifyContent: "center", fontSize: "0.82rem", padding: "10px 14px", gap: 6 }}
                onClick={copyPosterImage}
                disabled={copyingPoster || !event.posterUrl}
                title="Copy poster image directly to clipboard"
              >
                {copyingPoster ? "Copying…" : copiedPosterSuccess ? "✓ Image Copied!" : "📋 Copy Poster Image"}
              </button>
            </div>

            {/* One-Click Copy Full Text Invite + Web Link */}
            <button
              type="button"
              className="btn-hero-secondary"
              style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", padding: "11px 16px", marginTop: 10 }}
              onClick={copyShareInvite}
            >
              {shareCopied ? "✓ Full Invite & Pass Link Copied to Clipboard!" : "🔗 Copy Full Invite + Website Link"}
            </button>

            {/* Direct Social Share Channels */}
            <div style={{ marginTop: 18 }}>
              <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "block", marginBottom: 8 }}>
                Share Directly to
              </span>
              <div className="share-channels-grid">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareMessage())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="share-channel-btn whatsapp"
                  title="Share to WhatsApp with pass link and flyer"
                >
                  💬 WhatsApp
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="share-channel-btn linkedin"
                  title="Share to LinkedIn"
                >
                  💼 LinkedIn
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me at ${event.title}! 📅 ${formattedDate}`)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="share-channel-btn twitter"
                  title="Share to X (Twitter)"
                >
                  🐦 X / Twitter
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(getShareMessage())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="share-channel-btn telegram"
                  title="Share to Telegram"
                >
                  ✈️ Telegram
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(`Invitation: ${event.title}`)}&body=${encodeURIComponent(getShareMessage())}`}
                  className="share-channel-btn email"
                  title="Share via Email"
                >
                  ✉️ Email
                </a>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    type="button"
                    onClick={handleNativeShareWithPoster}
                    className="share-channel-btn native"
                    title="Open device share menu"
                  >
                    📱 More Apps
                  </button>
                )}
              </div>
            </div>

            {/* Website Direct Link Input */}
            <div className="share-link-input-row">
              <input type="text" readOnly value={window.location.href} />
              <button
                type="button"
                className="btn-hero-secondary"
                style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
              >
                {shareCopied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2b. RETRIEVE TICKET & CERTIFICATE MODAL */}
      {showLookup && (
        <div className="retrieve-pass-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowLookup(false); }}>
          <div className="retrieve-pass-modal">
            <button type="button" className="retrieve-pass-close" onClick={() => setShowLookup(false)}>✕</button>

            <span className="category-pill" style={{ marginBottom: 12 }}>✦ TICKET &amp; PASS RECOVERY</span>
            <h2 style={{ fontSize: "1.55rem", fontWeight: 800, margin: "6px 0 8px", color: "#ffffff" }}>
              Retrieve Your Ticket &amp; Certificate
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "0 0 20px", lineHeight: 1.6 }}>
              Registered for <strong>{event.title}</strong>? Enter your registered email address or phone number to retrieve your admission pass, QR code, or attendance certificate.
            </p>

            <form onSubmit={handleLookupSubmit} className="retrieve-search-box">
              <input
                type="text"
                placeholder="Enter your registered email or phone number..."
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-hero-primary" style={{ padding: "10px 20px" }}>
                {lookupLoading ? "Searching…" : "Retrieve Pass"}
              </button>
            </form>

            {lookupError && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "0.88rem", marginTop: 12 }}>
                ⚠️ {lookupError}
              </div>
            )}

            {lookupResult && (() => {
              const isModalPassExpired = isEventPastOrCompleted(event);
              return (
                <div className="retrieve-result-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        ✓ REGISTRATION VERIFIED
                      </span>
                      <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", margin: "4px 0 2px" }}>
                        {lookupResult.name}
                      </h3>
                      <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{lookupResult.email} · {lookupResult.phone}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span
                        className={`status-pill-badge ${lookupResult.checkedIn ? "completed" : isModalPassExpired ? "soldout" : "open"}`}
                        style={{ fontSize: "0.72rem" }}
                      >
                        {lookupResult.checkedIn ? "✓ Attended" : isModalPassExpired ? "🛑 Pass Expired (Event Ended)" : "Confirmed Pass"}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setLookupResult(null); setLookupError(""); setLookupQuery(""); }}
                        style={{ background: "transparent", border: 0, color: "#fb7185", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline" }}
                      >
                        ✕ Clear / Search Another
                      </button>
                    </div>
                  </div>

                  <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", display: "block" }}>
                        {isModalPassExpired ? "REGISTRATION ID (EXPIRED)" : "REGISTRATION ID"}
                      </span>
                      <strong
                        style={{
                          fontSize: "1.1rem",
                          color: isModalPassExpired ? "#94a3b8" : "#38bdf8",
                          fontFamily: "monospace",
                          textDecoration: isModalPassExpired ? "line-through" : "none",
                        }}
                      >
                        {lookupResult.registrationId}
                      </strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", display: "block" }}>TICKET TIER</span>
                      <span style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>{lookupResult.ticketType || "General Admission"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Link
                      to={`/tickets/${lookupResult.registrationId}`}
                      className={isModalPassExpired ? "btn-hero-secondary" : "btn-hero-primary"}
                      style={{ justifyContent: "center", textDecoration: "none" }}
                    >
                      {isModalPassExpired ? "📋 View Ticket Details (Pass Expired)" : "🎟️ View Live QR Digital Pass →"}
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isModalPassExpired) downloadTicketPdf(lookupResult.registrationId);
                      }}
                      disabled={isModalPassExpired || downloadingPdf === `ticket-${lookupResult.registrationId}`}
                      className="btn-hero-secondary"
                      style={{
                        justifyContent: "center",
                        opacity: isModalPassExpired ? 0.5 : 1,
                        cursor: isModalPassExpired ? "not-allowed" : "pointer",
                        borderColor: isModalPassExpired ? "rgba(244, 63, 94, 0.3)" : undefined,
                        color: isModalPassExpired ? "#fca5a5" : undefined,
                      }}
                      title={isModalPassExpired ? "Event date has passed. Ticket pass is expired." : "Download ticket PDF"}
                    >
                      {isModalPassExpired ? "🛑 Ticket Pass Expired" : downloadingPdf === `ticket-${lookupResult.registrationId}` ? "Generating PDF…" : "📥 Download Ticket PDF"}
                    </button>

                    {lookupResult.checkedIn && (
                      lookupResult.feedbackSubmitted || !event.requireFeedbackForCertificate ? (
                        <button
                          type="button"
                          onClick={() => downloadCertificatePdf(lookupResult.registrationId)}
                          disabled={downloadingPdf === `cert-${lookupResult.registrationId}`}
                          className="btn-hero-primary"
                          style={{ background: "#059669", justifyContent: "center" }}
                        >
                          {downloadingPdf === `cert-${lookupResult.registrationId}` ? "Downloading…" : "🎓 Download Official Certificate PDF"}
                        </button>
                      ) : (
                        <Link
                          to={`/events/${event._id}/feedback`}
                          className="btn-hero-secondary"
                          style={{ borderColor: "rgba(251, 191, 36, 0.5)", color: "#fbbf24", justifyContent: "center", textDecoration: "none" }}
                        >
                          ✍️ Complete Feedback Survey to Unlock Certificate
                        </Link>
                      )
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2c. EVENT HIGHLIGHTS RIBBON */}
      <section className="highlights-ribbon">
        <div className="highlights-container">
          <div className="highlight-box">
            <div className="highlight-icon">🎟️</div>
            <div className="highlight-text">
              <strong>{event.ticketMode === "free" ? "Free Admission" : "Tiered Tickets"}</strong>
              <span>Verified Digital Pass</span>
            </div>
          </div>

          <div className="highlight-box">
            <div className="highlight-icon">⚡</div>
            <div className="highlight-text">
              <strong>{event.qrEnabled !== false ? "Instant QR Entry" : "Standard Entry"}</strong>
              <span>Fast Track Gate Check-in</span>
            </div>
          </div>

          <div className="highlight-box">
            <div className="highlight-icon">🎓</div>
            <div className="highlight-text">
              <strong>{event.certificateEnabled ? "Official Certificate" : "Event Access"}</strong>
              <span>{event.certificateEnabled ? "Verified Participation" : "Full Session Access"}</span>
            </div>
          </div>

          <div className="highlight-box">
            <div className="highlight-icon">👥</div>
            <div className="highlight-text">
              <strong>{event.capacity} Capacity</strong>
              <span>Limited Seat Availability</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ABOUT THE EVENT */}
      <section className="section-wrapper">
        <div className="about-grid">
          <div>
            <div className="section-head">
              <span className="section-kicker-pro">OVERVIEW</span>
              <h2>About this Event</h2>
            </div>
            <div className="about-body-text">
              {event.description || "The organizer has not provided an extended description for this event yet."}
            </div>
          </div>

          {/* Organizer Card */}
          <aside className="organizer-side-card">
            <span style={{ fontSize: "0.72rem", color: "#a855f7", fontWeight: 800, letterSpacing: "0.1em" }}>
              HOSTED BY
            </span>
            <h3 style={{ marginTop: 6 }}>{event.organizer?.name || "Event Organizer"}</h3>
            {event.organizer?.organization && <p>{event.organizer.organization}</p>}

            <div style={{ display: "grid", gap: 10 }}>
              {event.contactEmail && (
                <a className="contact-button-link" href={`mailto:${event.contactEmail}`}>
                  ✉ Email Organizer
                </a>
              )}
              {event.contactPhone && (
                <a className="contact-button-link" href={`tel:${event.contactPhone}`}>
                  📞 {event.contactPhone}
                </a>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* 4. EVENT AGENDA & SCHEDULE (Multi-Day Tabs or Single-Day List) */}
      {(isMultiDay && Array.isArray(event.days) && event.days.length > 0) ? (
        <section className="section-wrapper">
          <div className="section-head">
            <span className="section-kicker-pro">MULTI-DAY SCHEDULE</span>
            <h2>Day-Wise Program Schedule</h2>
            <p>Explore sessions across all {totalDays} days. One registration grants access to the entire event.</p>
          </div>

          <div className="public-multiday-tabs" role="tablist" aria-label="Event schedule by day">
            {event.days.map((day, idx) => (
              <button
                key={day.dayNumber || idx}
                type="button"
                role="tab"
                aria-selected={activeDayIndex === idx}
                className={`public-day-tab${activeDayIndex === idx ? " is-active" : ""}`}
                onClick={() => setActiveDayIndex(idx)}
              >
                <span>{day.title || `Day ${idx + 1}`}</span>
                <small>
                  {day.date
                    ? new Date(day.date).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })
                    : `Day ${idx + 1}`}
                  {" · "}{(day.sessions || []).length} {(day.sessions || []).length === 1 ? "session" : "sessions"}
                </small>
              </button>
            ))}
          </div>

          {(() => {
            const currentDay = event.days[Math.min(activeDayIndex, event.days.length - 1)];
            if (!currentDay) return null;
            const dayDateStr = currentDay.date
              ? new Date(currentDay.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : "";
            return (
              <>
                <div className="public-day-banner">
                  <div>
                    <strong style={{ color: "#ffffff", fontSize: "1.05rem", display: "block" }}>
                      {currentDay.title || `Day ${currentDay.dayNumber}`}
                    </strong>
                    <span style={{ color: "#cbd5e1", fontSize: "0.86rem" }}>{dayDateStr}</span>
                  </div>
                  {(currentDay.startTime || currentDay.endTime) && (
                    <span className="agenda-time-pill">
                      ⏰ {currentDay.startTime || ""}{currentDay.endTime ? ` – ${currentDay.endTime}` : ""}
                    </span>
                  )}
                </div>

                {(!currentDay.sessions || currentDay.sessions.length === 0) ? (
                  <div className="agenda-row-card">
                    <div className="agenda-content">
                      <h3>General Program Schedule</h3>
                      <p>Detailed sessions for {currentDay.title || `Day ${currentDay.dayNumber}`} will follow the event start and end timings.</p>
                    </div>
                  </div>
                ) : (
                  <div className="agenda-timeline-wrap">
                    {currentDay.sessions.map((ses, sIdx) => (
                      <div key={ses.sessionId || sIdx} className="agenda-row-card">
                        <div className="agenda-time-pill">
                          <span>⏱</span>
                          {ses.startTime ? `${ses.startTime}${ses.endTime ? ` – ${ses.endTime}` : ""}` : "Scheduled"}
                        </div>
                        <div className="agenda-content">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <h3>{ses.title}</h3>
                            {ses.status && ses.status !== "UPCOMING" && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  background: ses.status === "COMPLETED" ? "rgba(16, 185, 129, 0.15)" : ses.status === "CANCELLED" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                  color: ses.status === "COMPLETED" ? "#6ee7b7" : ses.status === "CANCELLED" ? "#fca5a5" : "#fbbf24",
                                  border: `1px solid ${ses.status === "COMPLETED" ? "rgba(16, 185, 129, 0.3)" : ses.status === "CANCELLED" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                                }}
                              >
                                {ses.status}
                              </span>
                            )}
                          </div>
                          {ses.description && <p>{ses.description}</p>}
                          <div className="agenda-meta-tags">
                            {ses.speaker && <span className="agenda-speaker-tag">👤 {ses.speaker}</span>}
                            {ses.venue && <span className="agenda-speaker-tag">📍 {ses.venue}</span>}
                            {ses.capacity && <span className="agenda-speaker-tag">👥 Cap: {ses.capacity}</span>}
                            {ses.registrationAvailable === false && (
                              <span className="agenda-speaker-tag" style={{ color: "#fb7185", borderColor: "rgba(251, 113, 133, 0.3)" }}>
                                🔒 Closed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </section>
      ) : event.agenda?.length > 0 && (
        <section className="section-wrapper">
          <div className="section-head">
            <span className="section-kicker-pro">TIMELINE</span>
            <h2>Event Schedule & Agenda</h2>
            <p>Plan your day with our structured sessions, keynotes, and activities.</p>
          </div>

          <div className="agenda-timeline-wrap">
            {event.agenda.map((item, idx) => (
              <div key={idx} className="agenda-row-card">
                <div className="agenda-time-pill">
                  <span>⏱</span>
                  {item.time || "Scheduled"}
                </div>
                <div className="agenda-content">
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                  {item.speaker && (
                    <span className="agenda-speaker-tag">
                      👤 {item.speaker}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. SPEAKERS & GUESTS (Only if populated) */}
      {event.speakers?.length > 0 && (
        <section className="section-wrapper">
          <div className="section-head">
            <span className="section-kicker-pro">FACULTY &amp; LEADERSHIP</span>
            <h2>Featured Speakers & Guests</h2>
            <p>Learn from industry experts, thought leaders, and distinguished guests.</p>
          </div>

          <div className="speakers-pro-grid">
            {event.speakers.map((spk, idx) => (
              <article key={idx} className="speaker-pro-card">
                <div className="speaker-avatar-wrap">
                  {spk.photoUrl ? (
                    <img src={spk.photoUrl} alt={spk.name} />
                  ) : (
                    <span>{spk.name?.charAt(0) || "👤"}</span>
                  )}
                </div>
                <span className="speaker-role-pill">{spk.role || "Speaker"}</span>
                <h3>{spk.name}</h3>
                <p>
                  {spk.designation}
                  {spk.organization ? ` · ${spk.organization}` : ""}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 6. VENUE & LOCATION */}
      <section className="section-wrapper">
        <div className="section-head">
          <span className="section-kicker-pro">DIRECTIONS</span>
          <h2>Venue & Location</h2>
        </div>

        <div className="venue-card-pro">
          <div className="venue-details">
            <span style={{ color: "#a855f7", fontWeight: 700, fontSize: "0.85rem" }}>
              {event.mode === "offline" ? "PHYSICAL ON-SITE VENUE" : event.mode === "online" ? "VIRTUAL PLATFORM" : "HYBRID ACCESS"}
            </span>
            <h3>{event.venue}</h3>
            {isLocationUrl ? (
              <div style={{ marginTop: 14 }}>
                <a
                  className="btn-hero-primary"
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "10px 22px", fontSize: "0.9rem" }}
                >
                  {event.mode === "online" ? "🌐 Open Online Platform ↗" : "🗺️ Open in Google Maps ↗"}
                </a>
              </div>
            ) : (
              <>
                <p>{event.location || "Full address and directions available upon registration."}</p>
                {googleMapsUrl && (
                  <a
                    className="btn-hero-secondary"
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", marginTop: 10 }}
                  >
                    {event.mode === "online" ? "🌐 Open Online Platform ↗" : "🗺️ Open in Google Maps ↗"}
                  </a>
                )}
              </>
            )}
          </div>

          <div style={{ fontSize: "4rem", opacity: 0.35 }}>
            {event.mode === "online" ? "🌐" : "📍"}
          </div>
        </div>
      </section>

      {/* 7. TICKET & REGISTRATION INFORMATION */}
      <section className="section-wrapper">
        <div className="section-head">
          <span className="section-kicker-pro">ADMISSION</span>
          <h2>Ticket Passes &amp; Registration</h2>
          <p>
            {event.ticketMode === "paid"
              ? "Choose your admission pass tier to secure your spot for the event."
              : "Register for free admission to secure your verified attendee pass."}
          </p>
        </div>

        <div className="tickets-pro-grid">
          {event.ticketMode === "paid" && event.ticketTypes?.length > 0 ? (
            event.ticketTypes.map((ticket, idx) => (
              <div key={idx} className={`ticket-pro-card ${idx === 0 ? "featured" : ""}`}>
                <div>
                  <h3 className="ticket-tier-name">{ticket.name}</h3>
                  <div className="ticket-price-display">
                    {ticket.price > 0 ? `₹${ticket.price}` : "Free"}
                    <span> / attendee</span>
                  </div>
                  <ul style={{ paddingLeft: 18, margin: "0 0 20px 0", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.8 }}>
                    <li>Full access to sessions and keynotes</li>
                    {event.certificateEnabled && <li>Official Certificate of Participation</li>}
                    {event.qrEnabled !== false && <li>Instant Digital QR Ticket Pass</li>}
                    <li>Networking and interactive access</li>
                  </ul>
                </div>

                {canRegister ? (
                  <Link className="btn-hero-primary" style={{ width: "100%", justifyContent: "center" }} to={`/events/${event.slug}/register`}>
                    Select {ticket.name}
                  </Link>
                ) : (
                  <button className="btn-hero-primary" disabled style={{ opacity: 0.6, width: "100%" }}>
                    Registration Closed
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="ticket-pro-card featured" style={{ maxWidth: 540, margin: "0 auto", width: "100%" }}>
              <div>
                <span className="category-pill" style={{ display: "inline-block", marginBottom: 12, background: "rgba(16, 185, 129, 0.15)", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                  ✦ 100% FREE ADMISSION
                </span>
                <h3 className="ticket-tier-name">General Admission Pass</h3>
                <div className="ticket-price-display">
                  Free <span>/ attendee</span>
                </div>
                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.6, margin: "8px 0 16px" }}>
                  Includes unrestricted access to all keynote sessions, workshops, interactive Q&amp;A, and attendee networking.
                </p>
                <ul style={{ paddingLeft: 18, margin: "0 0 24px 0", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.8 }}>
                  <li>Free admission to all scheduled event tracks</li>
                  {event.certificateEnabled && <li>Official Verified Certificate of Participation</li>}
                  {event.qrEnabled !== false && <li>Instant Digital QR Ticket Pass for Fast Check-In</li>}
                  <li>Direct access to event resources &amp; materials</li>
                </ul>
              </div>

              {canRegister ? (
                <Link className="btn-hero-primary" style={{ width: "100%", justifyContent: "center", fontSize: "1.02rem", padding: "14px 24px" }} to={`/events/${event.slug}/register`}>
                  Register for Free Pass →
                </Link>
              ) : (
                <button className="btn-hero-primary" disabled style={{ opacity: 0.6, width: "100%" }}>
                  Registration Closed
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS (Only if populated) */}
      {event.faqs?.length > 0 && (
        <section className="section-wrapper">
          <div className="section-head">
            <span className="section-kicker-pro">FAQ</span>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about attendance, requirements, and venue entry.</p>
          </div>

          <div className="faq-list-pro">
            {event.faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="faq-pro-item">
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                  >
                    <span>{faq.question}</span>
                    <span style={{ fontSize: "1.2rem", color: "#a855f7" }}>{isOpen ? "−" : "＋"}</span>
                  </button>
                  {isOpen && <div className="faq-answer-body">{faq.answer}</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 9. FOOTER */}
      <footer className="public-footer">
        <p>
          Copyright © 2026{" "}
          <Link
            to="/admin/login"
            style={{ color: "#0F172A", fontWeight: 700, textDecoration: "none" }}
          >
            EVENTRA
          </Link>{" "}
          Inc. All rights reserved.
        </p>
      </footer>

      {/* Mobile Sticky Bottom CTA */}
      <div className="mobile-sticky-bar">
        <div className="mobile-bar-left">
          <strong>{event.title}</strong>
          <span>{event.ticketMode === "free" ? "Free Admission" : "Verified Ticket"}</span>
        </div>
        {canRegister ? (
          <Link className="btn-hero-primary" style={{ padding: "10px 20px", fontSize: "0.9rem" }} to={`/events/${event.slug}/register`}>
            Register Now
          </Link>
        ) : (
          <span className="status-pill-badge completed">Closed</span>
        )}
      </div>
    </main>
  );
}
