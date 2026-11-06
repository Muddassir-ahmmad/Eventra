import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import {
  POSTER_CATEGORIES,
  generatePosterDataUrl,
} from "../utils/posterTemplates";

const STEPS = [
  ["basics", "Basics"],
  ["design", "Poster & Design"],
  ["speakers", "Speakers & Guests"],
  ["agenda", "Schedule & Agenda"],
  ["faqs", "FAQs"],
  ["registration", "Registration Form"],
  ["tickets", "Tickets & Capacity"],
  ["certificates", "Certificates"],
  ["preview", "Preview & Publish"],
];

const CATEGORIES = [
  "Technical",
  "Hackathon",
  "Workshop",
  "Conference",
  "College Festival",
  "Seminar",
  "Cultural",
  "Competition",
  "Other",
];

const defaultForm = {
  title: "",
  shortDescription: "",
  description: "",
  category: "Technical",
  mode: "offline",
  contactEmail: "",
  contactPhone: "",
  date: "",
  startTime: "",
  endTime: "",
  venue: "",
  location: "",
  capacity: 100,
  registrationDeadline: "",
  posterUrl: "",
  posterType: "template",
  posterTemplateData: {
    templateId: "technical",
    themeColor: "#6366f1",
    accentColor: "#06b6d4",
    headline: "",
    tagline: "",
  },
  theme: "aurora",
  speakers: [],
  agenda: [],
  faqs: [],
  registrationFields: [
    { key: "name", label: "Full Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "phone", label: "Phone", type: "tel", required: true },
    { key: "college", label: "College / Institution", type: "text", required: true },
    { key: "department", label: "Department / Major", type: "text", required: false },
  ],
  ticketMode: "free",
  qrEnabled: true,
  ticketTypes: [{ name: "General Admission", price: 0, capacity: 100 }],
  volunteerEnabled: false,
  volunteerRoles: [],
  certificateEnabled: false,
  certificateTemplate: "classic",
  certificateTitle: "Certificate of Participation",
  certificateDescription: "This certificate is proudly presented to {name} for participating in {event}.",
  certificateShowOrganization: false,
  certificateOrganization: "",
  certificateLogoUrl: "",
  certificateLogoPath: "",
  signatures: [],
  requireFeedbackForCertificate: false,
  feedbackDeadline: "",
  status: "draft",
};

export default function EventBuilder() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(eventId);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) {
      // Auto-generate standard poster template for new events
      const defaultPoster = generatePosterDataUrl({
        templateId: "technical",
        title: "NEW EVENT",
        subtitle: "EVENTRA Smart Event Platform",
      });
      setForm((old) => ({ ...old, posterUrl: defaultPoster }));
      return;
    }

    api.get("/events/mine")
      .then(({ data }) => {
        const event = data.events.find((item) => item._id === eventId);
        if (!event) {
          setError("Event not found.");
          return;
        }

        const isDatePassed = event.date ? new Date(event.date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
        if (event.status === "completed" || isDatePassed) {
          alert("This event has concluded. Concluded events cannot be edited; only management actions are permitted.");
          navigate(`/dashboard/events/${eventId}`, { replace: true });
          return;
        }

        setForm((old) => ({
          ...old,
          ...event,
          date: event.date ? dateOnly(event.date) : "",
          registrationDeadline: event.registrationDeadline
            ? dateTimeLocal(event.registrationDeadline)
            : "",
          speakers: event.speakers || [],
          agenda: event.agenda || [],
          faqs: event.faqs || [],
          registrationFields: event.registrationFields?.length ? event.registrationFields : old.registrationFields,
          ticketTypes: event.ticketTypes?.length ? event.ticketTypes : old.ticketTypes,
          volunteerRoles: event.volunteerRoles || [],
          signatures: event.signatures || [],
        }));
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load event.");
      })
      .finally(() => setLoading(false));
  }, [editing, eventId]);

  const update = (key, value) => {
    setForm((old) => ({ ...old, [key]: value }));
    setMessage("");
  };

  async function saveDraft(goNext = false) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editing) {
        const { data } = await api.put(`/events/${eventId}`, {
          ...form,
          status: form.status || "draft",
        });
        setForm((old) => ({ ...old, ...data.event }));
        setMessage("Draft saved.");
      } else {
        if (!form.title.trim()) {
          setError("Enter an event title before saving.");
          setSaving(false);
          return;
        }

        const payload = {
          ...form,
          date: form.date || new Date().toISOString(),
          venue: form.venue || "TBD Venue",
          capacity: Number(form.capacity || 100),
          status: "draft",
        };

        const { data } = await api.post("/events", payload);
        setMessage("Event draft created.");
        navigate(`/dashboard/events/${data.event._id}/edit`, { replace: true });
      }

      if (goNext && step < STEPS.length - 1) {
        setStep((old) => old + 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not save event.");
    } finally {
      setSaving(false);
    }
  }

  async function publishEvent() {
    if (!form.title.trim()) {
      setError("Event title is required.");
      setStep(0);
      return;
    }
    if (!form.date) {
      setError("Event date is required.");
      setStep(0);
      return;
    }
    if (!form.venue.trim()) {
      setError("Event venue is required.");
      setStep(0);
      return;
    }
    if (!form.capacity || Number(form.capacity) < 1) {
      setError("Capacity must be at least 1.");
      setStep(0);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        status: "published",
      };

      if (editing) {
        await api.put(`/events/${eventId}`, payload);
      } else {
        await api.post("/events", payload);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not publish event.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="builder-page">
        <div className="center-page">
          <div className="spinner" />
          <p>Loading event builder...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="builder-page">
      <div className="builder-topbar">
        <Link className="brand" to="/dashboard">EVENT<span>RA</span></Link>
        <div className="builder-top-title">
          <span>{editing ? "EDIT EVENT" : "CREATE EVENT"}</span>
          <strong>{form.title || "Untitled Event"}</strong>
        </div>
        <div className="builder-top-actions">
          <Link className="button button-ghost small" to="/dashboard">Exit</Link>
          <button className="button button-ghost small" onClick={() => saveDraft(false)} disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button className="button button-publish small" onClick={publishEvent} disabled={saving}>
            {saving ? "Publishing..." : "Publish Event 🚀"}
          </button>
        </div>
      </div>

      <div className="builder-layout">
        <aside className="builder-sidebar">
          <p className="builder-sidebar-label">EVENT SETUP</p>
          {STEPS.map(([key, label], index) => (
            <button
              key={key}
              className={`builder-step ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}
              onClick={() => setStep(index)}
            >
              <span>{index < step ? "✓" : index + 1}</span>
              {label}
            </button>
          ))}

          <div className="builder-sidebar-tip">
            <span>✦</span>
            <div>
              <strong>Save Anytime</strong>
              <p>Keep your event as a draft while editing. Publish whenever you're ready.</p>
            </div>
          </div>
        </aside>

        <section className="builder-content">
          <div className="builder-heading">
            <div>
              <p className="section-kicker">{String(step + 1).padStart(2, "0")} / {STEPS.length}</p>
              <h1>{STEPS[step][1]}</h1>
            </div>
            {message && <span className="builder-saved">✓ {message}</span>}
          </div>

          {error && <div className="alert-error" style={{ marginBottom: 20 }}>{error}</div>}

          {step === 0 && <Basics form={form} update={update} />}
          {step === 1 && <Design form={form} update={update} />}
          {step === 2 && <Speakers form={form} update={update} />}
          {step === 3 && <Agenda form={form} update={update} />}
          {step === 4 && <Faqs form={form} update={update} />}
          {step === 5 && <Registration form={form} update={update} />}
          {step === 6 && <Tickets form={form} update={update} />}
          {step === 7 && <Certificates form={form} update={update} eventId={eventId} />}
          {step === 8 && <Preview form={form} />}

          <div className="builder-footer">
            <button
              className="button button-ghost"
              disabled={step === 0 || saving}
              onClick={() => setStep((old) => old - 1)}
            >
              ← Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                className="button button-primary"
                onClick={() => saveDraft(true)}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save & Continue →"}
              </button>
            ) : (
              <button
                className="button button-publish"
                onClick={publishEvent}
                disabled={saving}
              >
                {saving ? "Publishing..." : "Publish Event 🚀"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------
   STEP 1: BASICS
------------------------------------------------------------------------- */
function Basics({ form, update }) {
  const [draftingCopy, setDraftingCopy] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");

  const handleAiDraft = async () => {
    if (!form.title) {
      alert("Please enter an Event Title first so Gemini can draft descriptions tailored to your event.");
      return;
    }
    setDraftingCopy(true);
    setCopyNotice("");
    try {
      const { data } = await api.post("/events/ai-description", {
        title: form.title,
        category: form.category,
        venue: form.venue,
        existingDescription: form.description,
      });

      if (data.shortDescription) {
        update("shortDescription", data.shortDescription);
      }
      if (data.description) {
        update("description", data.description);
      }
      setCopyNotice("✨ Event tagline & description generated via Gemini AI!");
      setTimeout(() => setCopyNotice(""), 4500);
    } catch (err) {
      alert(err.response?.data?.message || "Could not generate copy via Gemini. Please check API key.");
    } finally {
      setDraftingCopy(false);
    }
  };

  return (
    <div className="builder-card">
      <Field label="Event Title" required>
        <input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. NextGen Autonomous Hackathon 2026"
        />
      </Field>

      <div className="builder-two">
        <Field label="Event Category" required>
          <select value={form.category} onChange={(e) => update("category", e.target.value)}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </Field>

        <Field label="Event Mode" required>
          <div className="mode-pills">
            {["offline", "online", "hybrid"].map((m) => (
              <button
                type="button"
                key={m}
                className={`mode-pill ${form.mode === m ? "selected" : ""}`}
                onClick={() => update("mode", m)}
              >
                {m === "offline" ? "📍 In-Person" : m === "online" ? "🌐 Online" : "⚡ Hybrid"}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, marginTop: 8 }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#e2e8f0" }}>Event Copywriting & Overview</span>
        <button
          type="button"
          className="button button-ghost small"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            fontSize: "0.78rem",
            color: "#c4b5fd",
            borderColor: "rgba(167, 139, 250, 0.4)",
            background: "rgba(167, 139, 250, 0.08)",
          }}
          onClick={handleAiDraft}
          disabled={draftingCopy}
        >
          {draftingCopy ? "✨ Drafting with Gemini..." : "✨ AI Draft with Gemini"}
        </button>
      </div>
      {copyNotice && (
        <div style={{ fontSize: "0.8rem", color: "#34d399", marginBottom: 10, fontWeight: 500 }}>
          {copyNotice}
        </div>
      )}

      <Field label="Short Tagline">
        <input
          value={form.shortDescription}
          onChange={(e) => update("shortDescription", e.target.value)}
          placeholder="A punchy one-sentence summary for event cards"
        />
      </Field>

      <Field label="Detailed Description">
        <textarea
          rows="6"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Tell participants what the event is about, why they should attend, and what to expect..."
        />
      </Field>

      <div className="builder-two">
        <Field label="Event Date" required>
          <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
        </Field>
        <Field label="Registration Deadline">
          <input
            type="datetime-local"
            value={form.registrationDeadline}
            onChange={(e) => update("registrationDeadline", e.target.value)}
          />
        </Field>
      </div>

      <div className="builder-two">
        <Field label="Start Time">
          <input type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} />
        </Field>
        <Field label="End Time">
          <input type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} />
        </Field>
      </div>

      <div className="builder-two">
        <Field label="Venue / Location Name" required>
          <input
            value={form.venue}
            onChange={(e) => update("venue", e.target.value)}
            placeholder="College Auditorium, Hotel Grand, Tech Park..."
          />
        </Field>
        <Field label="City / Address / Online URL">
          <input
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="e.g. Bangalore, Karnataka or Google Maps / Zoom URL"
          />
          {form.location && /^https?:\/\//i.test(form.location.trim()) && (
            <small style={{ color: "#38bdf8", marginTop: 4, display: "block", fontSize: "0.72rem" }}>
              ✓ Link detected: Will display cleanly as a direct "Locate on Map" / "Join Online" button on event page.
            </small>
          )}
        </Field>
      </div>

      <div className="builder-three">
        <Field label="Maximum Capacity" required>
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => update("capacity", Number(e.target.value))}
          />
        </Field>
        <Field label="Contact Email">
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
            placeholder="organizer@event.com"
          />
        </Field>
        <Field label="Contact Phone">
          <input
            type="tel"
            value={form.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
            placeholder="+91 9876543210"
          />
        </Field>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   STEP 2: POSTER & BRANDING (UPLOAD, 8 TEMPLATES, AI)
------------------------------------------------------------------------- */
function Design({ form, update }) {
  const [tab, setTab] = useState("templates"); // 'upload' | 'templates' | 'ai'
  const [selectedTemplate, setSelectedTemplate] = useState("technical");
  const [customTitle, setCustomTitle] = useState(form.title || "");
  const [customTagline, setCustomTagline] = useState(form.shortDescription || "");
  const [customPrimaryColor, setCustomPrimaryColor] = useState("#6366f1");
  const [customAccentColor, setCustomAccentColor] = useState("#06b6d4");
  const [uploading, setUploading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiStyle, setAiStyle] = useState("futuristic neon cyberpunk");

  const themes = [
    ["aurora", "Aurora", "Modern gradient glow"],
    ["minimal", "Minimal", "Clean & professional slate"],
    ["conference", "Conference", "Corporate leadership summit"],
    ["creative", "Creative", "Bold vibrant energy"],
  ];

  // Apply selected template directly
  function applyTemplate(tmplId = selectedTemplate, pColor = customPrimaryColor, aColor = customAccentColor) {
    const dataUrl = generatePosterDataUrl({
      templateId: tmplId,
      title: customTitle || form.title || "EVENT TITLE",
      subtitle: customTagline || form.shortDescription || "",
      date: form.date ? new Date(form.date).toLocaleDateString() : "",
      venue: form.venue || "",
      themeColor: pColor,
      accentColor: aColor,
    });
    update("posterUrl", dataUrl);
    update("posterType", "template");
  }

  // Handle Poster File Upload
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("poster", file);

    try {
      const { data } = await api.post("/events/upload-poster", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      update("posterUrl", data.posterUrl);
      update("posterType", "upload");
    } catch (err) {
      alert(err.response?.data?.message || "Could not upload image. Please check file format and size.");
    } finally {
      setUploading(false);
    }
  }

  // Handle AI Poster Generation
  async function handleAiGenerate() {
    setAiGenerating(true);
    setAiMessage("");

    try {
      const { data } = await api.post("/events/generate-poster", {
        title: form.title || customTitle || "Event",
        category: form.category,
        description: form.description || customTagline,
        visualStyle: aiStyle,
        colorPreference: `${customPrimaryColor} and ${customAccentColor}`,
      });

      if (data.posterUrl) {
        update("posterUrl", data.posterUrl);
        update("posterType", "ai");
      }
    } catch (err) {
      if (err.response?.status === 503) {
        setAiMessage(
          err.response.data?.message ||
            "AI generation is not configured on the server. You can select one of our 8 standard poster templates below or upload your own file."
        );
      } else {
        setAiMessage(err.response?.data?.message || "AI poster generation could not complete. Try standard templates.");
      }
    } finally {
      setAiGenerating(false);
    }
  }

  return (
    <div className="builder-card">
      <div className="poster-tabs">
        <button
          type="button"
          className={`poster-tab-btn ${tab === "templates" ? "active" : ""}`}
          onClick={() => setTab("templates")}
        >
          🎨 Standard Templates (8 Categories)
        </button>
        <button
          type="button"
          className={`poster-tab-btn ${tab === "upload" ? "active" : ""}`}
          onClick={() => setTab("upload")}
        >
          📁 Upload Poster File
        </button>
        <button
          type="button"
          className={`poster-tab-btn ${tab === "ai" ? "active" : ""}`}
          onClick={() => setTab("ai")}
        >
          ✨ AI Poster Generator
        </button>
      </div>

      {/* Live Poster Preview */}
      {form.posterUrl ? (
        <div className="poster-preview-card">
          <img src={form.posterUrl} alt="Event Poster" />
        </div>
      ) : (
        <div className="poster-upload-box" style={{ marginBottom: 16 }}>
          <p>No poster selected yet. Choose a template or upload your file.</p>
        </div>
      )}

      {/* TAB 1: STANDARD TEMPLATES */}
      {tab === "templates" && (
        <div>
          <p className="muted" style={{ marginBottom: 14 }}>
            Choose a professionally designed web-standard poster template. Customizes instantly with your event details.
          </p>

          <div className="template-grid-pro">
            {POSTER_CATEGORIES.map((tmpl) => (
              <button
                type="button"
                key={tmpl.id}
                className={`template-card-btn ${selectedTemplate === tmpl.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedTemplate(tmpl.id);
                  setCustomPrimaryColor(tmpl.themeColor);
                  setCustomAccentColor(tmpl.accentColor);
                  applyTemplate(tmpl.id, tmpl.themeColor, tmpl.accentColor);
                }}
              >
                <div
                  className="template-mini-header"
                  style={{
                    background: `linear-gradient(135deg, ${tmpl.bgFrom}, ${tmpl.bgTo})`,
                    border: `1px solid ${tmpl.themeColor}40`,
                  }}
                >
                  <span>{tmpl.icon}</span>
                </div>
                <strong>{tmpl.name}</strong>
                <small>{tmpl.tagline}</small>
              </button>
            ))}
          </div>

          <div className="template-controls">
            <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem" }}>Customize Poster Details</h4>
            <div className="builder-two">
              <Field label="Poster Headline">
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={form.title || "EVENT TITLE"}
                />
              </Field>
              <Field label="Poster Subtitle">
                <input
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  placeholder="Event tagline or short summary"
                />
              </Field>
            </div>

            <div className="color-pickers-row">
              <div className="color-picker-item">
                <span>Theme Glow:</span>
                <input
                  type="color"
                  value={customPrimaryColor}
                  onChange={(e) => setCustomPrimaryColor(e.target.value)}
                />
              </div>
              <div className="color-picker-item">
                <span>Accent Highlight:</span>
                <input
                  type="color"
                  value={customAccentColor}
                  onChange={(e) => setCustomAccentColor(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="button button-primary small"
                style={{ marginLeft: "auto" }}
                onClick={() => applyTemplate(selectedTemplate)}
              >
                Apply Updated Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FILE UPLOAD */}
      {tab === "upload" && (
        <div>
          <label className="poster-upload-box" style={{ display: "block" }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <span style={{ fontSize: "2rem" }}>📤</span>
            <strong style={{ display: "block", margin: "10px 0 4px" }}>
              {uploading ? "Uploading Poster..." : "Click or drag poster file here"}
            </strong>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
              Supports JPG, PNG, and WebP (up to 5 MB).
            </p>
          </label>

          {form.posterUrl && (
            <div className="poster-preview-actions">
              <button
                type="button"
                className="button button-ghost small"
                onClick={() => update("posterUrl", "")}
              >
                Remove Poster
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI POSTER GENERATION */}
      {tab === "ai" && (
        <div>
          <div className="ai-notice-banner">
            <span>✨</span>
            <div>
              <strong>Gemini AI Poster Generation</strong>
              <p style={{ margin: 0 }}>
                Synthesizes a high-resolution, vector-crisp event poster using Google Gemini based on your event name, category, and style preference. Powered by your Gemini API Key.
              </p>
            </div>
          </div>

          {aiMessage && (
            <div className="alert-error" style={{ marginBottom: 14 }}>
              {aiMessage}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: "0.82rem", color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Quick Style Presets (Click to apply):
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                "Futuristic Neon Cyberpunk",
                "3D Holographic Isometric",
                "Minimalist Swiss Typography",
                "Dark Mode Electric Glow",
                "Retro Synthwave Sunset",
                "Glassmorphism Modern Tech",
              ].map((stylePreset) => (
                <button
                  type="button"
                  key={stylePreset}
                  className={`mode-pill ${aiStyle.toLowerCase() === stylePreset.toLowerCase() ? "selected" : ""}`}
                  style={{ fontSize: "0.76rem", padding: "4px 10px" }}
                  onClick={() => setAiStyle(stylePreset.toLowerCase())}
                >
                  {stylePreset}
                </button>
              ))}
            </div>
          </div>

          <div className="builder-two">
            <Field label="Visual Art Style">
              <input
                value={aiStyle}
                onChange={(e) => setAiStyle(e.target.value)}
                placeholder="e.g. 3D holographic isometric, cyberpunk, minimal Swiss typography"
              />
            </Field>
            <Field label="Category Context">
              <input value={form.category} disabled />
            </Field>
          </div>

          <button
            type="button"
            className="button button-primary"
            onClick={handleAiGenerate}
            disabled={aiGenerating}
          >
            {aiGenerating ? "Generating Poster with Gemini AI..." : "✨ Generate Poster via Gemini AI"}
          </button>
        </div>
      )}

      {/* Event Website Theme */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <h3 className="subheading">Landing Page Visual Palette</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Choose the ambient backdrop gradient for the public event page.
        </p>

        <div className="theme-grid">
          {themes.map(([key, name, text]) => (
            <button
              type="button"
              key={key}
              className={`theme-choice ${form.theme === key ? "selected" : ""}`}
              onClick={() => update("theme", key)}
            >
              <div className={`theme-preview theme-${key}`}>
                <span>PALETTE</span>
                <strong>{form.title || "EVENT"}</strong>
              </div>
              <strong>{name}</strong>
              <small>{text}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   SPEAKER PHOTO COMPONENT (DEVICE UPLOAD & URL)
------------------------------------------------------------------------- */
function SpeakerPhotoUpload({ photoUrl, onPhotoChange, onRemove }) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image under 5MB.");
      return;
    }

    // High performance client-side avatar resizer using HTML5 Canvas
    // Produces crisp 400x400 square avatar data URL
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        const width = img.width;
        const height = img.height;

        // Crop/scale to square avatar
        const minSide = Math.min(width, height);
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        canvas.width = Math.min(minSide, maxDim);
        canvas.height = Math.min(minSide, maxDim);

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, canvas.width, canvas.height);

        const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        onPhotoChange(resizedDataUrl);
      };
      img.src = loadEvent.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
      <label className="field-label" style={{ marginBottom: 8, display: "block", fontWeight: 600 }}>Speaker Photo</label>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {/* Avatar Preview */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            overflow: "hidden",
            backgroundColor: "#1e1b4b",
            border: "2px solid rgba(139, 92, 246, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Speaker preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: "1.6rem", opacity: 0.6 }}>👤</span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            <button
              type="button"
              className="button button-ghost small"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <span>📁</span> Choose Photo from Device
            </button>

            {photoUrl && (
              <button
                type="button"
                className="button button-ghost small"
                style={{ color: "#f87171", fontSize: "0.82rem" }}
                onClick={onRemove}
              >
                Remove
              </button>
            )}

            <button
              type="button"
              className="button button-ghost small"
              style={{ opacity: 0.7, fontSize: "0.75rem", border: "none", textDecoration: "underline", background: "none", cursor: "pointer" }}
              onClick={() => setShowUrlInput(!showUrlInput)}
            >
              {showUrlInput ? "Hide URL input" : "Or paste image link"}
            </button>
          </div>

          {showUrlInput && (
            <input
              type="url"
              value={photoUrl.startsWith("data:") ? "" : photoUrl}
              onChange={(e) => onPhotoChange(e.target.value)}
              placeholder="https://example.com/speaker.jpg"
              style={{ maxWidth: 360, fontSize: "0.82rem", marginTop: 4 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   STEP 3: SPEAKERS & GUESTS
------------------------------------------------------------------------- */
function Speakers({ form, update }) {
  const addSpeaker = () => {
    update("speakers", [
      ...form.speakers,
      { name: "", designation: "", organization: "", role: "Speaker", photoUrl: "" },
    ]);
  };

  const removeSpeaker = (index) => {
    update("speakers", form.speakers.filter((_, i) => i !== index));
  };

  const updateSpeaker = (index, key, val) => {
    const list = [...form.speakers];
    list[index] = { ...list[index], [key]: val };
    update("speakers", list);
  };

  return (
    <div className="builder-card">
      <div className="section-row">
        <div>
          <h3 className="subheading">Featured Speakers & VIP Guests</h3>
          <p className="muted">Showcase keynote speakers, workshop leads, panellists, and judges.</p>
        </div>
        <button type="button" className="button button-ghost small" onClick={addSpeaker}>
          ＋ Add Speaker
        </button>
      </div>

      {form.speakers.length === 0 ? (
        <div className="builder-empty">
          <p>No speakers added yet. Click "+ Add Speaker" above to feature presenters.</p>
        </div>
      ) : (
        form.speakers.map((spk, idx) => (
          <div key={idx} className="repeat-card">
            <div className="repeat-card-title">
              <strong>Speaker #{idx + 1}</strong>
              <button type="button" className="remove-button" onClick={() => removeSpeaker(idx)}>
                Remove
              </button>
            </div>

            <div className="builder-two">
              <Field label="Full Name">
                <input
                  value={spk.name}
                  onChange={(e) => updateSpeaker(idx, "name", e.target.value)}
                  placeholder="Dr. Jane Doe"
                />
              </Field>
              <Field label="Role / Title">
                <input
                  value={spk.role}
                  onChange={(e) => updateSpeaker(idx, "role", e.target.value)}
                  placeholder="Keynote Speaker / Judge / Mentor"
                />
              </Field>
            </div>

            <div className="builder-two">
              <Field label="Designation">
                <input
                  value={spk.designation}
                  onChange={(e) => updateSpeaker(idx, "designation", e.target.value)}
                  placeholder="Principal AI Architect"
                />
              </Field>
              <Field label="Company / Organization">
                <input
                  value={spk.organization}
                  onChange={(e) => updateSpeaker(idx, "organization", e.target.value)}
                  placeholder="Google DeepMind"
                />
              </Field>
            </div>

            <SpeakerPhotoUpload
              photoUrl={spk.photoUrl || ""}
              onPhotoChange={(url) => updateSpeaker(idx, "photoUrl", url)}
              onRemove={() => updateSpeaker(idx, "photoUrl", "")}
            />
          </div>
        ))
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   STEP 4: SCHEDULE & AGENDA
------------------------------------------------------------------------- */
function Agenda({ form, update }) {
  const addAgendaItem = () => {
    update("agenda", [
      ...form.agenda,
      { time: "", title: "", description: "", speaker: "" },
    ]);
  };

  const removeAgendaItem = (index) => {
    update("agenda", form.agenda.filter((_, i) => i !== index));
  };

  const updateAgenda = (index, key, val) => {
    const list = [...form.agenda];
    list[index] = { ...list[index], [key]: val };
    update("agenda", list);
  };

  return (
    <div className="builder-card">
      <div className="section-row">
        <div>
          <h3 className="subheading">Event Schedule & Timeline</h3>
          <p className="muted">Organize your sessions, keynotes, breaks, and hackathon milestones.</p>
        </div>
        <button type="button" className="button button-ghost small" onClick={addAgendaItem}>
          ＋ Add Session
        </button>
      </div>

      {form.agenda.length === 0 ? (
        <div className="builder-empty">
          <p>No agenda items added yet. Click "+ Add Session" to create your schedule.</p>
        </div>
      ) : (
        form.agenda.map((item, idx) => (
          <div key={idx} className="agenda-timeline-card">
            <div className="repeat-card-title">
              <strong>Session #{idx + 1}</strong>
              <button type="button" className="remove-button" onClick={() => removeAgendaItem(idx)}>
                Remove
              </button>
            </div>

            <div className="builder-two">
              <Field label="Time / Time Slot">
                <input
                  value={item.time}
                  onChange={(e) => updateAgenda(idx, "time", e.target.value)}
                  placeholder="09:00 AM - 10:30 AM"
                />
              </Field>
              <Field label="Speaker / Facilitator">
                <input
                  value={item.speaker}
                  onChange={(e) => updateAgenda(idx, "speaker", e.target.value)}
                  placeholder="Keynote Speaker Name"
                />
              </Field>
            </div>

            <Field label="Session Title">
              <input
                value={item.title}
                onChange={(e) => updateAgenda(idx, "title", e.target.value)}
                placeholder="Opening Keynote: Future of Autonomous AI Systems"
              />
            </Field>

            <Field label="Session Description">
              <textarea
                rows="2"
                value={item.description}
                onChange={(e) => updateAgenda(idx, "description", e.target.value)}
                placeholder="Brief summary of what will be covered in this session..."
              />
            </Field>
          </div>
        ))
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   STEP 5: FAQS
------------------------------------------------------------------------- */
function Faqs({ form, update }) {
  const addFaq = () => {
    update("faqs", [
      ...form.faqs,
      { question: "", answer: "" },
    ]);
  };

  const removeFaq = (index) => {
    update("faqs", form.faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index, key, val) => {
    const list = [...form.faqs];
    list[index] = { ...list[index], [key]: val };
    update("faqs", list);
  };

  return (
    <div className="builder-card">
      <div className="section-row">
        <div>
          <h3 className="subheading">Frequently Asked Questions</h3>
          <p className="muted">Help attendees with common queries regarding prerequisites, venue, tickets, and entry.</p>
        </div>
        <button type="button" className="button button-ghost small" onClick={addFaq}>
          ＋ Add FAQ
        </button>
      </div>

      {form.faqs.length === 0 ? (
        <div className="builder-empty">
          <p>No FAQs added yet. Click "+ Add FAQ" to answer attendee questions upfront.</p>
        </div>
      ) : (
        form.faqs.map((faq, idx) => (
          <div key={idx} className="faq-builder-item">
            <div className="repeat-card-title">
              <strong>Question #{idx + 1}</strong>
              <button type="button" className="remove-button" onClick={() => removeFaq(idx)}>
                Remove
              </button>
            </div>

            <Field label="Question">
              <input
                value={faq.question}
                onChange={(e) => updateFaq(idx, "question", e.target.value)}
                placeholder="e.g. Who is eligible to participate?"
              />
            </Field>

            <Field label="Answer">
              <textarea
                rows="3"
                value={faq.answer}
                onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                placeholder="Clear answer explaining requirements or guidelines..."
              />
            </Field>
          </div>
        ))
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   STEP 6: REGISTRATION CONFIGURATION
------------------------------------------------------------------------- */
function Registration({ form, update }) {
  const addField = () => {
    const key = `custom_${Date.now()}`;
    update("registrationFields", [
      ...form.registrationFields,
      { key, label: "Custom Question", type: "text", required: false },
    ]);
  };

  const removeField = (index) => {
    // Preserve mandatory fields
    if (index < 3) return;
    update("registrationFields", form.registrationFields.filter((_, i) => i !== index));
  };

  const updateField = (index, key, val) => {
    const list = [...form.registrationFields];
    list[index] = { ...list[index], [key]: val };
    update("registrationFields", list);
  };

  return (
    <div className="builder-card">
      <div className="section-row">
        <div>
          <h3 className="subheading">Registration Form Fields</h3>
          <p className="muted">Configure what attendee information you want to collect during registration.</p>
        </div>
        <button type="button" className="button button-ghost small" onClick={addField}>
          ＋ Add Custom Question
        </button>
      </div>

      <div className="field-list">
        {form.registrationFields.map((field, idx) => (
          <div key={field.key || idx} className="registration-field">
            <span className="field-drag">☰</span>
            <div className="field-main">
              <input
                value={field.label}
                disabled={idx < 3}
                onChange={(e) => updateField(idx, "label", e.target.value)}
                placeholder="Field Question Label"
              />
              <select
                value={field.type}
                disabled={idx < 3}
                onChange={(e) => updateField(idx, "type", e.target.value)}
              >
                <option value="text">Text input</option>
                <option value="email">Email</option>
                <option value="tel">Phone</option>
                <option value="number">Number</option>
              </select>
            </div>
            <label className="mini-check">
              <input
                type="checkbox"
                checked={field.required}
                disabled={idx < 3}
                onChange={(e) => updateField(idx, "required", e.target.checked)}
              />
              Required
            </label>
            <button
              type="button"
              className="remove-button"
              disabled={idx < 3}
              onClick={() => removeField(idx)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   STEP 7: TICKETS & CAPACITY
------------------------------------------------------------------------- */
function Tickets({ form, update }) {
  const addTicketType = () => {
    update("ticketTypes", [
      ...form.ticketTypes,
      { name: "VIP Pass", price: 499, capacity: 50 },
    ]);
  };

  const removeTicketType = (index) => {
    if (form.ticketTypes.length <= 1) return;
    update("ticketTypes", form.ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (index, key, val) => {
    const list = [...form.ticketTypes];
    list[index] = { ...list[index], [key]: val };
    update("ticketTypes", list);
  };

  const handleSelectFree = () => {
    update("ticketMode", "free");
    const currentCap = form.ticketTypes?.[0]?.capacity || 100;
    update("ticketTypes", [{ name: "General Admission", price: 0, capacity: currentCap }]);
  };

  const handleSelectPaid = () => {
    update("ticketMode", "paid");
    if (form.ticketTypes.length === 1 && form.ticketTypes[0].price === 0) {
      update("ticketTypes", [{ ...form.ticketTypes[0], price: 299 }]);
    }
  };

  return (
    <div className="builder-card">
      <div className="ticket-mode">
        <button
          type="button"
          className={form.ticketMode === "free" ? "selected" : ""}
          onClick={handleSelectFree}
        >
          Free Event
        </button>
        <button
          type="button"
          className={form.ticketMode === "paid" ? "selected" : ""}
          onClick={handleSelectPaid}
        >
          Paid / Tiered Tickets
        </button>
      </div>

      <div className="toggle-row">
        <span>
          <strong>QR Digital Tickets & Attendance Pass</strong>
          <small>Generate dynamic QR codes for attendee entry and verification</small>
        </span>
        <input
          type="checkbox"
          checked={form.qrEnabled}
          onChange={(e) => update("qrEnabled", e.target.checked)}
        />
      </div>

      {form.ticketMode === "free" ? (
        <div style={{ marginTop: 20, padding: "20px 22px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "rgba(255, 255, 255, 0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: "1.8rem" }}>🎟️</div>
            <div>
              <strong style={{ fontSize: "0.98rem", color: "var(--text-white)", display: "block" }}>Free General Admission Event</strong>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.84rem", lineHeight: 1.5 }}>
                Attendees register for 100% free with automated digital QR ticket passes. Ticket pricing tiers are omitted for free admission.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 18, maxWidth: 300 }}>
            <Field label="Maximum Event Capacity (Total Attendees)">
              <input
                type="number"
                min="1"
                value={form.ticketTypes?.[0]?.capacity || 100}
                onChange={(e) => {
                  const cap = Number(e.target.value) || 100;
                  update("ticketTypes", [{ name: "General Admission", price: 0, capacity: cap }]);
                }}
                placeholder="100"
              />
            </Field>
          </div>
        </div>
      ) : (
        <>
          <div className="section-row" style={{ marginTop: 24 }}>
            <div>
              <h3 className="subheading">Paid Admission Tiers</h3>
              <p className="muted">Configure paid entry tiers (VIP, Student, Early Bird), pricing, and capacity limits.</p>
            </div>
            <button type="button" className="button button-ghost small" onClick={addTicketType}>
              ＋ Add Ticket Tier
            </button>
          </div>

          {form.ticketTypes.map((ticket, idx) => (
            <div key={idx} className="repeat-card">
              <div className="repeat-card-title">
                <strong>Ticket Tier #{idx + 1}</strong>
                <button
                  type="button"
                  className="remove-button"
                  disabled={form.ticketTypes.length <= 1}
                  onClick={() => removeTicketType(idx)}
                >
                  Remove
                </button>
              </div>

              <div className="builder-three">
                <Field label="Tier Name">
                  <input
                    value={ticket.name}
                    onChange={(e) => updateTicketType(idx, "name", e.target.value)}
                    placeholder="VIP / Standard / Early Bird"
                  />
                </Field>
                <Field label="Price (₹)">
                  <input
                    type="number"
                    min="1"
                    value={ticket.price || ""}
                    onChange={(e) => updateTicketType(idx, "price", Number(e.target.value))}
                    placeholder="299"
                  />
                </Field>
                <Field label="Tier Capacity">
                  <input
                    type="number"
                    min="1"
                    value={ticket.capacity}
                    onChange={(e) => updateTicketType(idx, "capacity", Number(e.target.value))}
                  />
                </Field>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   STEP 8: CERTIFICATES
------------------------------------------------------------------------- */
function Certificates({ form, update, eventId }) {
  return (
    <div className="builder-card">
      <div className="toggle-row">
        <span>
          <strong>Enable Certificate of Participation</strong>
          <small>Generate verified digital PDF certificates for attendees</small>
        </span>
        <input
          type="checkbox"
          checked={form.certificateEnabled}
          onChange={(e) => update("certificateEnabled", e.target.checked)}
        />
      </div>

      {form.certificateEnabled && (
        <>
          <div className="toggle-row" style={{ background: "rgba(124, 77, 255, 0.05)" }}>
            <span>
              <strong>Require Feedback Before Certificate Issuance</strong>
              <small>Attendees must complete post-event feedback to unlock their certificate</small>
            </span>
            <input
              type="checkbox"
              checked={form.requireFeedbackForCertificate}
              onChange={(e) => update("requireFeedbackForCertificate", e.target.checked)}
            />
          </div>

          <Field label="Certificate Headline">
            <input
              value={form.certificateTitle}
              onChange={(e) => update("certificateTitle", e.target.value)}
              placeholder="Certificate of Participation"
            />
          </Field>

          <Field label="Certificate Description">
            <textarea
              rows="3"
              value={form.certificateDescription}
              onChange={(e) => update("certificateDescription", e.target.value)}
              placeholder="This certificate is proudly presented to {name} for participating in {event} on {date}."
            />
          </Field>
          <small className="muted" style={{ display: "block", marginBottom: 18 }}>
            Placeholders supported: <code>{"{name}"}</code>, <code>{"{event}"}</code>, <code>{"{date}"}</code>.
          </small>

          <div className="toggle-row">
            <span>
              <strong>Display Organization Branding</strong>
              <small>Show your custom organization name and logo on certificates</small>
            </span>
            <input
              type="checkbox"
              checked={form.certificateShowOrganization}
              onChange={(e) => update("certificateShowOrganization", e.target.checked)}
            />
          </div>

          {form.certificateShowOrganization && (
            <Field label="Organization Name">
              <input
                value={form.certificateOrganization}
                onChange={(e) => update("certificateOrganization", e.target.value)}
                placeholder="e.g. Sahyadri College of Engineering / Acme Innovations"
              />
            </Field>
          )}

          {eventId && (
            <div style={{ marginTop: 20 }}>
              <Link
                className="button button-ghost small"
                to={`/dashboard/events/${eventId}/certificates`}
                target="_blank"
              >
                Open Full Certificate Studio ↗
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   STEP 9: PREVIEW
------------------------------------------------------------------------- */
function Preview({ form }) {
  return (
    <div className="builder-card">
      <div className="event-preview">
        <div className="preview-poster">
          {form.posterUrl ? (
            <img src={form.posterUrl} alt="Poster Preview" />
          ) : (
            <div>
              <span>EVENTRA EVENT</span>
              <strong>{form.title || "UNTITLED EVENT"}</strong>
              <p>{form.shortDescription || "Event details will appear here."}</p>
            </div>
          )}
        </div>

        <div className="preview-body">
          <p className="section-kicker">{form.category || "General Event"} · {form.mode?.toUpperCase() || "OFFLINE"}</p>
          <h2>{form.title || "Event Title"}</h2>
          <p>{form.description || "Detailed event description will be visible to participants."}</p>

          <div className="preview-meta">
            <span>📅 {form.date ? new Date(form.date).toLocaleDateString() : "Date TBD"}</span>
            <span>⏰ {form.startTime || "Time TBD"}</span>
            <span>📍 {form.venue || "Venue TBD"}</span>
            <span>👥 Capacity: {form.capacity}</span>
            <span>🎟️ {form.ticketMode === "free" ? "Free Admission" : "Paid Pass"}</span>
          </div>

          {form.speakers?.length > 0 && (
            <div>
              <h3>Featured Speakers ({form.speakers.length})</h3>
              <div className="preview-speakers">
                {form.speakers.map((spk, i) => (
                  <div key={i}>
                    <strong>{spk.name || "Speaker Name"}</strong>
                    <span>{spk.designation || "Title"} {spk.organization ? `· ${spk.organization}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {form.agenda?.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h3>Schedule Overview ({form.agenda.length} Sessions)</h3>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {form.agenda.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <strong>{item.title || "Session"}</strong>
                      {item.speaker && <small style={{ display: "block", color: "#94a3b8" }}>{item.speaker}</small>}
                    </div>
                    <span style={{ color: "#a855f7", fontSize: "0.8rem", fontWeight: 600 }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="builder-field">
      <span>
        {label} {required && <b>*</b>}
      </span>
      {children}
    </label>
  );
}

function dateOnly(val) {
  if (!val) return "";
  return new Date(val).toISOString().slice(0, 10);
}

function dateTimeLocal(val) {
  if (!val) return "";
  return new Date(val).toISOString().slice(0, 16);
}
