import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";

const DEFAULT_DESCRIPTION = "This certificate is proudly presented to {name} for participating in {event}.";
const TEMPLATES = [
  { id: "royalGold", name: "Royal Gold", category: "Luxury Prestige" },
  { id: "techAurora", name: "Tech Aurora", category: "Cyber & Dev" },
  { id: "emeraldExecutive", name: "Emerald", category: "Executive" },
  { id: "crimsonLuxe", name: "Crimson", category: "Honors Distinction" },
  { id: "classic", name: "Classic", category: "Traditional" },
  { id: "modern", name: "Modern", category: "Minimal Sage" },
  { id: "academic", name: "Academic", category: "University Crest" },
  { id: "vintageParchment", name: "Vintage", category: "Antique Parchment" },
];
const TEMPLATE_NAMES = TEMPLATES.map((t) => t.id);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const PLACEHOLDER_TAGS = [
  { tag: "{name}", label: "Participant Name" },
  { tag: "{participantName}", label: "Full Name" },
  { tag: "{event}", label: "Event Name" },
  { tag: "{eventName}", label: "Full Title" },
  { tag: "{date}", label: "Event Date" },
  { tag: "{eventDate}", label: "Full Date" },
];

function certificateSettings(event) {
  return {
    certificateEnabled: event.certificateEnabled ?? false,
    requireFeedbackForCertificate: event.requireFeedbackForCertificate === true,
    certificateTemplate: event.certificateTemplate || "classic",
    certificateTitle: event.certificateTitle || "Certificate of Participation",
    certificateDescription: event.certificateDescription || DEFAULT_DESCRIPTION,
    certificateShowOrganization: event.certificateShowOrganization !== false,
    certificateOrganization: event.certificateOrganization || "EVENTRA",
    certificateLogoUrl: event.certificateLogoUrl || "",
    certificateLogoPath: event.certificateLogoPath || "",
    eventType: event.eventType || "",
    signatures: (event.signatures || []).map((signature) => ({
      ...signature,
      role: signature.designation || signature.role || "",
    })),
  };
}

export default function CertificateManager() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [organizer, setOrganizer] = useState({});
  const [participants, setParticipants] = useState([]);
  const [counts, setCounts] = useState({ registered: 0, attended: 0, eligible: 0, generated: 0, cancelled: 0 });
  const [settings, setSettings] = useState(null);
  const [selected, setSelected] = useState([]);
  const [previewId, setPreviewId] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [imageStorage, setImageStorage] = useState("local");
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCertificates();
  }, [eventId]);

  async function loadCertificates() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/certificates/event/${eventId}`);
      setEvent(data.event);
      setOrganizer(data.organizer || {});
      setParticipants(data.participants || []);
      setCounts(data.counts || { registered: 0, attended: 0, eligible: 0, generated: 0, cancelled: 0 });
      setImageStorage(data.imageStorage || "unconfigured");
      setEmailConfigured(Boolean(data.emailConfigured));
      setAiConfigured(Boolean(data.aiConfigured));
      setSettings(certificateSettings(data.event));
      setSelected((data.participants || [])
        .filter((person) => person.eligibilityStatus === "eligible" && !person.certificate)
        .map((person) => person._id));
      setPreviewId((data.participants || []).find((person) => person.checkedIn)?._id || "");
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Could not load certificate settings.");
    } finally {
      setLoading(false);
    }
  }

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function insertPlaceholder(tag) {
    const current = settings.certificateDescription || "";
    update("certificateDescription", current ? `${current} ${tag}` : tag);
  }

  function updateSignature(index, key, value) {
    const signatures = [...settings.signatures];
    signatures[index] = {
      ...signatures[index],
      [key]: value,
      ...(key === "role" ? { designation: value } : {}),
    };
    update("signatures", signatures);
  }

  function clearSignatureImage(index) {
    const signatures = [...settings.signatures];
    signatures[index] = { ...signatures[index], imageUrl: "", imagePath: "" };
    update("signatures", signatures);
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(`/certificates/event/${eventId}`, settings);
      setEvent(data.event);
      setSettings(certificateSettings(data.event));
      setNotice("Certificate settings saved.");
      await loadCertificates();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Could not save certificate settings.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(kind, file, index = -1) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type) && !/\.(png|jpe?g)$/i.test(file.name)) {
      setError("Choose a PNG or JPEG image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image files must be 5 MB or smaller.");
      return;
    }
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post(`/certificates/event/${eventId}/assets/${kind}`, formData);
      if (kind === "logo") {
        update("certificateLogoUrl", data.imageUrl);
        update("certificateLogoPath", data.imagePath);
      } else {
        const signatures = [...settings.signatures];
        signatures[index] = { ...signatures[index], imagePath: data.imagePath, imageUrl: data.imageUrl };
        update("signatures", signatures);
      }
      setNotice("Image uploaded. Save settings to use it on certificates.");
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || "Could not upload the image.");
    } finally {
      setWorking(false);
    }
  }

  async function removeImage(imagePath, onRemoved) {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      if (imagePath) {
        await api.delete(`/certificates/event/${eventId}/assets`, { data: { imagePath } });
      }
      onRemoved();
      setNotice("Image removed. Save settings to keep the updated design.");
    } catch (removeError) {
      setError(removeError.response?.data?.message || "Could not remove the image.");
    } finally {
      setWorking(false);
    }
  }

  async function removeSignature(index) {
    const signature = settings.signatures[index];
    const onRemoved = () => update(
      "signatures",
      settings.signatures.filter((_item, itemIndex) => itemIndex !== index)
    );
    if (signature.imagePath) {
      await removeImage(signature.imagePath, onRemoved);
    } else {
      onRemoved();
    }
  }

  async function askForSuggestion() {
    setWorking(true);
    setError("");
    setNotice("");
    setSuggestion(null);
    try {
      const { data } = await api.post(`/certificates/event/${eventId}/ai-suggestion`, {
        eventType: settings.eventType,
        customPrompt: customAiPrompt,
      });
      if (!data.configured) {
        setAiConfigured(false);
        setNotice(data.message || "Configure GEMINI_API_KEY on the server to enable suggestions.");
        return;
      }
      setSuggestion(data.suggestion);
    } catch (suggestionError) {
      setError(suggestionError.response?.data?.message || "Could not get a certificate suggestion.");
    } finally {
      setWorking(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    setSettings((current) => ({
      ...current,
      certificateTemplate: suggestion.template,
      certificateTitle: suggestion.title,
      certificateDescription: suggestion.description,
    }));
    setSuggestion(null);
    setNotice("AI certificate design applied! Click 'Save settings' above to persist.");
  }

  function toggleParticipant(id) {
    setSelected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  function toggleAllEligible() {
    const eligibleIds = participants
      .filter((person) => person.eligibilityStatus === "eligible" && !person.certificate)
      .map((person) => person._id);
    setSelected((current) => current.length === eligibleIds.length ? [] : eligibleIds);
  }

  async function generate(ids = selected, regenerate = false) {
    if (!settings.certificateEnabled) {
      setError("Enable certificates and save settings before generating.");
      return;
    }
    if (!ids.length) return;
    if (regenerate && !window.confirm(`Regenerate ${ids.length} selected certificate(s)?`)) return;

    setWorking(true);
    setError("");
    setNotice("");
    try {
      await api.put(`/certificates/event/${eventId}`, settings);
      const { data } = await api.post(`/certificates/event/${eventId}/generate`, {
        registrationIds: ids,
        regenerate,
      });
      const parts = [];
      if (data.issued.length) parts.push(`${data.issued.length} generated`);
      if (data.alreadyIssued.length) parts.push(`${data.alreadyIssued.length} already issued`);
      if (data.ineligible.length) parts.push(`${data.ineligible.length} not eligible (absent or feedback pending)`);
      setNotice(parts.join(" · ") || "No certificates were generated.");
      await loadCertificates();
    } catch (generateError) {
      setError(generateError.response?.data?.message || "Could not generate certificates.");
    } finally {
      setWorking(false);
    }
  }

  async function downloadCertificate(person) {
    setWorking(true);
    setError("");
    try {
      const { data } = await api.get(`/certificates/event/${eventId}/${person._id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `eventra-certificate-${person._id}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.response?.data?.message || "Could not download the certificate PDF.");
    } finally {
      setWorking(false);
    }
  }

  async function bulkEmailCertificates() {
    if (!emailConfigured) {
      setError("Email delivery requires SMTP configuration on the server.");
      return;
    }
    const withCerts = participants.filter((p) => p.certificate).map((p) => p._id);
    if (withCerts.length === 0) {
      setError("No generated certificates available to deliver.");
      return;
    }
    const targetIds = selected.length > 0 ? selected : withCerts;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/certificates/event/${eventId}/email-bulk`, {
        registrationIds: targetIds,
      });
      setNotice(data.message || "Bulk certificate emails processed.");
      await loadCertificates();
    } catch (bulkErr) {
      setError(bulkErr.response?.data?.message || "Could not deliver certificates in bulk.");
    } finally {
      setWorking(false);
    }
  }

  async function emailCertificate(person) {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/certificates/event/${eventId}/${person._id}/email`);
      setNotice(data.message);
      await loadCertificates();
    } catch (emailError) {
      setError(emailError.response?.data?.message || "Could not send certificate email.");
    } finally {
      setWorking(false);
    }
  }

  async function testEmail() {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/certificates/event/${eventId}/email/test`);
      setNotice(data.message);
    } catch (emailError) {
      setError(emailError.response?.data?.message || "Email configuration test failed.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <main className="center-page"><div className="spinner" /><p>Loading certificates...</p></main>;
  if (error && !event) return <main className="center-page"><h1>{error}</h1><Link className="button button-primary" to="/dashboard">Back to dashboard</Link></main>;
  if (!event || !settings) return null;

  const eligibleList = participants.filter((person) => person.eligibilityStatus === "eligible");
  const selectedWithCertificates = participants.filter((person) => selected.includes(person._id) && person.certificate).length;
  const previewPerson = eligibleList.find((person) => person._id === previewId) || participants.find((person) => person._id === previewId) || eligibleList[0] || participants[0] || { name: "Jordan Lee" };
  const storageAvailable = imageStorage === "local" || imageStorage === "cloudinary";

  return (
    <main className="certificate-page">
      <div className="certificate-shell">
        <header className="certificate-header">
          <div>
            <Link className="certificate-back" to={`/dashboard/events/${eventId}`}>← Event workspace</Link>
            <p className="certificate-kicker">CERTIFICATE STUDIO</p>
            <h1>{event.title}</h1>
            <p className="certificate-subtitle">Design, preview and issue attendance certificates · {event.status}</p>
          </div>
          <div className="certificate-header-actions">
            <span className={`certificate-state ${settings.certificateEnabled ? "is-on" : ""}`}>
              {settings.certificateEnabled ? "Issuing enabled" : "Issuing disabled"}
            </span>
            <button className="cert-button cert-button-primary" onClick={saveSettings} disabled={saving || working}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </header>

        {error && <div className="certificate-alert is-error" role="alert">{error}</div>}
        {notice && <div className="certificate-alert" role="status">{notice}</div>}

        <section className="certificate-top-grid">
          <div className="certificate-panel certificate-editor">
            <div className="certificate-panel-heading">
              <div><p className="certificate-kicker">01 / DESIGN</p><h2>Certificate details</h2></div>
              <label className="certificate-switch">
                <input type="checkbox" checked={settings.certificateEnabled} onChange={(change) => update("certificateEnabled", change.target.checked)} />
                <span>{settings.certificateEnabled ? "On" : "Off"}</span>
              </label>
            </div>

            <div className="certificate-template-list" role="radiogroup" aria-label="Certificate template">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  className={`certificate-template-choice ${settings.certificateTemplate === tmpl.id ? "is-selected" : ""}`}
                  aria-pressed={settings.certificateTemplate === tmpl.id}
                  onClick={() => update("certificateTemplate", tmpl.id)}
                >
                  <span className={`certificate-template-swatch template-${tmpl.id}`}><i /><b /><em /></span>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <strong style={{ display: "block", fontSize: "0.74rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tmpl.name}
                    </strong>
                    <span style={{ fontSize: "0.64rem", color: "#94a3b8" }}>{tmpl.category}</span>
                  </div>
                </button>
              ))}
            </div>

            <label className="certificate-field">
              <span>Certificate headline</span>
              <input maxLength="100" value={settings.certificateTitle} onChange={(change) => update("certificateTitle", change.target.value)} />
            </label>
            <label className="certificate-field">
              <span>Certificate Top Header (Organization / Brand)</span>
              <input
                maxLength="100"
                value={settings.certificateOrganization}
                onChange={(change) => update("certificateOrganization", change.target.value)}
                placeholder="EVENTRA"
              />
              <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                Displays at the very top of the certificate (defaults to "EVENTRA", can be changed to your organization or institution).
              </small>
            </label>
            <label className="certificate-field">
              <span>Event type</span>
              <input maxLength="80" value={settings.eventType} onChange={(change) => update("eventType", change.target.value)} placeholder="Workshop, conference, symposium, course…" />
            </label>
            <label className="certificate-field">
              <span>Certificate description</span>
              <textarea rows="4" maxLength="500" value={settings.certificateDescription} onChange={(change) => update("certificateDescription", change.target.value)} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", width: "100%" }}>Insert dynamic placeholder:</span>
                {PLACEHOLDER_TAGS.map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: "0.72rem",
                      color: "#38bdf8",
                      cursor: "pointer",
                    }}
                    onClick={() => insertPlaceholder(tag)}
                    title={`Insert ${label}`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </label>

            {/* Feedback Gating Toggle */}
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 8,
              }}
            >
              <label className="certificate-switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={settings.requireFeedbackForCertificate}
                  onChange={(change) => update("requireFeedbackForCertificate", change.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>Require Feedback Before Issuing</span>
              </label>
              <small style={{ display: "block", color: "#94a3b8", marginTop: 4, fontSize: "0.78rem" }}>
                When enabled, attendees must complete their post-event feedback survey before their certificate becomes eligible.
              </small>
            </div>

            <div className="certificate-logo-control">
              <div>
                <strong>Organization logo</strong>
                <small>Optional PNG or JPEG, up to 5 MB. No logo is required for a polished design.</small>
              </div>
              {settings.certificateLogoUrl && <img src={settings.certificateLogoUrl} alt="Certificate logo preview" />}
              <label className="cert-button upload-label">
                {working ? "Working…" : settings.certificateLogoUrl ? "Replace logo" : "Upload logo"}
                <input type="file" accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg" disabled={!storageAvailable || working} onChange={(change) => uploadImage("logo", change.target.files?.[0])} />
              </label>
              {settings.certificateLogoUrl && (
                <button type="button" className="text-action" disabled={working} onClick={() => removeImage(settings.certificateLogoPath, () => {
                  update("certificateLogoUrl", "");
                  update("certificateLogoPath", "");
                })}>Remove logo</button>
              )}
            </div>
            {!storageAvailable && <p className="certificate-inline-warning">Image uploads are unavailable. Configure Cloudinary in production.</p>}

            {/* AI Certificate Studio */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                borderRadius: 10,
                marginTop: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    ✦ GEMINI AI STUDIO
                  </span>
                  <strong style={{ display: "block", fontSize: "0.92rem", color: "#ffffff", marginTop: 2 }}>
                    AI Certificate Designer
                  </strong>
                  <small style={{ color: "#94a3b8", display: "block", fontSize: "0.74rem", marginTop: 2 }}>
                    Generate tailored theme recommendations, titles, descriptions & signatories using Google Gemini.
                  </small>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  type="text"
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  placeholder="Custom goal (e.g. 1st Place Hackathon, Medical Conference, Leadership)..."
                  style={{
                    flex: 1,
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 6,
                    background: "rgba(14, 20, 36, 0.85)",
                    color: "#ffffff",
                    padding: "7px 11px",
                    fontSize: "0.75rem",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && askForSuggestion()}
                />
                <button
                  type="button"
                  className="cert-button cert-button-primary"
                  onClick={askForSuggestion}
                  disabled={working || !aiConfigured}
                  style={{ flexShrink: 0 }}
                >
                  {working ? "Designing…" : "Design with AI ✦"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Quick prompts:</span>
                {[
                  "Hackathon Championship",
                  "Tech Workshop",
                  "Masterclass Distinction",
                  "Executive Leadership",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    style={{
                      background: "rgba(99, 102, 241, 0.14)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      borderRadius: 4,
                      padding: "2px 7px",
                      fontSize: "0.68rem",
                      color: "#c7d2fe",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setCustomAiPrompt(chip);
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {!aiConfigured && (
                <p className="certificate-empty-line" style={{ marginTop: 8 }}>
                  AI suggestions unavailable. Configure GEMINI_API_KEY in server .env.
                </p>
              )}

              {suggestion && (
                <div className="certificate-suggestion" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className={`suggestion-chip template-${suggestion.template}`}>
                        {suggestion.template}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 700 }}>
                        ✓ Gemini Recommended
                      </span>
                    </div>
                    <strong style={{ fontSize: "0.9rem", color: "#ffffff" }}>{suggestion.title}</strong>
                    <p style={{ marginTop: 4, fontSize: "0.76rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                      {suggestion.description}
                    </p>
                    {suggestion.suggestedSignatories?.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: "0.7rem", color: "#94a3b8" }}>
                        <b style={{ color: "#c7d2fe" }}>Recommended Signatories:</b>{" "}
                        {suggestion.suggestedSignatories.join(", ")}
                      </div>
                    )}
                    <p style={{ marginTop: 6, fontSize: "0.7rem", color: "#818cf8" }}>
                      <b>Why this fits:</b> {suggestion.reason}
                    </p>
                  </div>
                  <div className="suggestion-actions" style={{ marginLeft: 10 }}>
                    <button type="button" className="cert-button cert-button-primary" onClick={applySuggestion}>
                      Apply AI Design
                    </button>
                    <button type="button" className="text-action" onClick={() => setSuggestion(null)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="certificate-preview-panel">
            <div className="certificate-panel-heading">
              <div><p className="certificate-kicker">LIVE PREVIEW</p><h2>{settings.certificateTemplate} certificate</h2></div>
              <label className="preview-participant">
                <span>Eligible participant</span>
                <select value={previewId} onChange={(change) => setPreviewId(change.target.value)}>
                  {eligibleList.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
                  {participants.length === 0 && <option value="">Sample participant</option>}
                  {participants.length > 0 && eligibleList.length === 0 && <option value={participants[0]._id}>No eligible participants yet</option>}
                </select>
              </label>
            </div>
            <CertificatePreview event={event} organizer={organizer} settings={settings} participant={previewPerson} />
            <p className="preview-caption">Preview updates in real-time as you edit; generated PDFs use this saved design.</p>
          </div>
        </section>

        <section className="certificate-panel signatories-panel">
          <div className="certificate-panel-heading">
            <div><p className="certificate-kicker">02 / AUTHORIZATION</p><h2>Signatories</h2></div>
            <button type="button" className="cert-button" disabled={settings.signatures.length >= 4} onClick={() => update("signatures", [...settings.signatures, { name: "", role: "", imagePath: "", imageUrl: "" }])}>＋ Add signatory</button>
          </div>
          {settings.signatures.length === 0 && <p className="certificate-empty-line">No signatories added. The certificate remains professionally styled without signatures.</p>}
          <div className="signatory-list">
            {settings.signatures.map((signature, index) => (
              <div className="signatory-row" key={`${signature.imagePath || "signer"}-${index}`}>
                <label className="certificate-field"><span>Name</span><input value={signature.name || ""} onChange={(change) => updateSignature(index, "name", change.target.value)} /></label>
                <label className="certificate-field"><span>Designation</span><input value={signature.role || ""} onChange={(change) => updateSignature(index, "role", change.target.value)} /></label>
                <div className="signature-upload">
                  {signature.imageUrl ? <img src={signature.imageUrl} alt={`${signature.name || "Signatory"} signature preview`} /> : <span className="signature-placeholder">Signature image</span>}
                  <label className="cert-button upload-label">
                    {working ? "Working…" : signature.imageUrl ? "Replace image" : "Upload image"}
                    <input type="file" accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg" disabled={!storageAvailable || working} onChange={(change) => uploadImage("signature", change.target.files?.[0], index)} />
                  </label>
                </div>
                {signature.imageUrl && <button type="button" className="text-action" disabled={working} onClick={() => removeImage(signature.imagePath, () => clearSignatureImage(index))}>Remove image</button>}
                <button type="button" className="remove-signatory" aria-label={`Remove ${signature.name || "signatory"}`} onClick={() => removeSignature(index)}>×</button>
              </div>
            ))}
          </div>
        </section>

        <section className="certificate-panel participant-panel">
          <div className="certificate-panel-heading participants-heading">
            <div>
              <p className="certificate-kicker">03 / ELIGIBILITY &amp; ISSUANCE</p>
              <h2>Participants</h2>
              <p>{counts.registered} registered · {counts.attended} attended · {counts.eligible} eligible · {counts.generated} generated · {counts.cancelled} cancelled</p>
            </div>
            <div className="participant-actions">
              <button type="button" className="cert-button" onClick={toggleAllEligible} disabled={!eligibleList.some((person) => !person.certificate)}>
                {selected.length ? "Clear selection" : "Select all eligible"}
              </button>
              <button type="button" className="cert-button cert-button-primary" onClick={() => generate()} disabled={working || !selected.length || !settings.certificateEnabled}>Generate selected ({selected.length})</button>
              {selectedWithCertificates > 0 && <button type="button" className="cert-button cert-button-danger" onClick={() => generate(selected, true)} disabled={working}>Regenerate selected</button>}
              <button
                type="button"
                className="cert-button"
                style={{ background: "#4f46e5", color: "#ffffff", borderColor: "#4f46e5" }}
                onClick={bulkEmailCertificates}
                disabled={working || !emailConfigured || !participants.some((p) => p.certificate)}
                title={!emailConfigured ? "SMTP is not configured" : "Deliver certificates via email"}
              >
                ✉ Email Certificates
              </button>
            </div>
          </div>

          {/* Feedback Gating Alert Banner */}
          {settings.requireFeedbackForCertificate && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 18px",
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#fbbf24",
                fontSize: "0.88rem",
                margin: "12px 0 16px",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>🔒</span>
              <div>
                <strong>Feedback Gating Active:</strong> Attendees must submit their post-event feedback survey before their certificate can be generated or downloaded.
              </div>
            </div>
          )}

          {!settings.certificateEnabled && <p className="certificate-inline-warning">Enable certificates and save settings before issuing certificates.</p>}
          <div className="attendance-note"><span>✓</span> Only confirmed registrations with attendance verified at the gate can receive certificates. Cancelled and absent participants are excluded.</div>
          
          <div className="participant-table-wrap">
            <table className="participant-table">
              <thead>
                <tr>
                  <th><span className="sr-only">Select</span></th>
                  <th>Participant</th>
                  <th>Email</th>
                  <th>Attendance</th>
                  <th>Eligibility</th>
                  <th>Certificate</th>
                  <th>Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((person) => {
                  const isEligible = person.eligibilityStatus === "eligible";
                  const isPending = person.eligibilityStatus === "feedback_pending";
                  const isAbsent = !person.checkedIn;

                  return (
                    <tr key={person._id}>
                      <td>
                        <input
                          aria-label={`Select ${person.name}`}
                          type="checkbox"
                          checked={selected.includes(person._id)}
                          disabled={!isEligible}
                          onChange={() => toggleParticipant(person._id)}
                        />
                      </td>
                      <td><strong>{person.name}</strong></td>
                      <td>{person.email}</td>
                      <td>
                        <span className={`participant-status ${person.checkedIn ? "is-eligible" : ""}`}>
                          {person.checkedIn ? "✓ Checked in" : "● Absent"}
                        </span>
                      </td>
                      <td>
                        {isEligible && (
                          <span style={{ color: "#34d399", fontWeight: 700, fontSize: "0.82rem" }}>
                            ✓ Eligible
                          </span>
                        )}
                        {isPending && (
                          <span
                            style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.82rem" }}
                            title="Attendee checked in, but has not completed the feedback survey yet."
                          >
                            ⏳ Feedback Pending
                          </span>
                        )}
                        {isAbsent && (
                          <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
                            Ineligible (Absent)
                          </span>
                        )}
                      </td>
                      <td>
                        {person.certificate ? (
                          <span className="issued-status">Issued · v{person.certificate.generation}</span>
                        ) : (
                          <span className="not-issued">Not issued</span>
                        )}
                      </td>
                      <td>
                        {person.certificate?.lastEmailedAt
                          ? `Emailed ${new Date(person.certificate.lastEmailedAt).toLocaleDateString()}`
                          : "—"}
                      </td>
                      <td className="participant-actions-cell">
                        {isEligible && !person.certificate && (
                          <button
                            type="button"
                            className="text-action"
                            onClick={() => generate([person._id])}
                            disabled={working || !settings.certificateEnabled}
                          >
                            Generate
                          </button>
                        )}
                        {isPending && (
                          <span style={{ color: "#f59e0b", fontSize: "0.78rem" }}>
                            Awaiting Survey
                          </span>
                        )}
                        {person.certificate && (
                          <>
                            <button
                              type="button"
                              className="text-action"
                              onClick={() => downloadCertificate(person)}
                              disabled={working}
                            >
                              Download PDF
                            </button>
                            <button
                              type="button"
                              className="text-action"
                              onClick={() => emailCertificate(person)}
                              disabled={working || !emailConfigured}
                              title={!emailConfigured ? "Configure SMTP on the server" : "Email certificate"}
                            >
                              Email
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {participants.length === 0 && (
                  <tr>
                    <td className="empty-participants" colSpan="8">
                      No registrations yet. A sample participant is shown in the preview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="certificate-panel email-panel">
          <div><p className="certificate-kicker">04 / DELIVERY</p><h2>Email provider</h2><p>{emailConfigured ? "SMTP credentials are present on the server." : "Email is not configured. Delivery actions are unavailable."}</p></div>
          <span className={`provider-state ${emailConfigured ? "is-ready" : ""}`}>{emailConfigured ? "Configured" : "Not configured"}</span>
          <button type="button" className="cert-button" onClick={testEmail} disabled={!emailConfigured || working}>Send test email</button>
        </section>
      </div>
    </main>
  );
}

function CertificatePreview({ event, organizer, settings, participant }) {
  const date = event.date
    ? new Date(event.date).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    : "Event date";
  const description = (settings.certificateDescription || DEFAULT_DESCRIPTION)
    .replaceAll("{name}", participant.name || "Participant Name")
    .replaceAll("{participantName}", participant.name || "Participant Name")
    .replaceAll("{event}", event.title || "Event Name")
    .replaceAll("{eventName}", event.title || "Event Name")
    .replaceAll("{date}", date)
    .replaceAll("{eventDate}", date)
    .replace(/\{[^{}]+\}/g, "");
  const signatures = (settings.signatures || []).filter((signature) => signature.name || signature.imageUrl);
  const organizationDisplay = (settings.certificateOrganization || "EVENTRA").trim();
  return (
    <div className={`certificate-art certificate-art-${settings.certificateTemplate}`}>
      <div className="certificate-art-inner">
        <header className="certificate-art-header">
          {settings.certificateLogoUrl && <img className="certificate-organization-logo" src={settings.certificateLogoUrl} alt="Organization logo" />}
          {organizationDisplay && <span className="certificate-organization-name">{organizationDisplay}</span>}
        </header>
        <span className="certificate-art-brand">
          {settings.certificateTemplate === "techAurora"
            ? "✦ TECH MERIT & INNOVATION ✦"
            : settings.certificateTemplate === "royalGold"
            ? "✦ ROYAL MERIT & DISTINCTION ✦"
            : settings.certificateTemplate === "academic"
            ? "ACADEMIC DISTINCTION"
            : settings.certificateTemplate === "emeraldExecutive"
            ? "EXECUTIVE LEADERSHIP"
            : settings.certificateTemplate === "crimsonLuxe"
            ? "PRESTIGIOUS HONORS"
            : "OFFICIAL RECOGNITION"}
        </span>
        <h3>{settings.certificateTitle || "Certificate of Participation"}</h3>
        <p className="certificate-presented">This certificate is proudly presented to</p>
        <strong className="certificate-recipient">{participant.name || "Participant Name"}</strong>
        <p className="certificate-art-description">{description}</p>
        <strong className="certificate-event-name">{event.title || "Event Name"}</strong>
        <span className="certificate-art-date">{date}</span>
        <div className="certificate-art-signatories">
          {signatures.slice(0, 4).map((signature, index) => (
            <div key={`${signature.name}-${index}`}>
              {signature.imageUrl && <img src={signature.imageUrl} alt={`${signature.name || "Signatory"} signature`} />}
              <i />
              <strong>{signature.name || "Authorized signatory"}</strong>
              <span>{signature.designation || signature.role}</span>
            </div>
          ))}
        </div>
        <span className="certificate-organizer">EVENTRA · EVENT CERTIFICATE</span>
      </div>
    </div>
  );
}
