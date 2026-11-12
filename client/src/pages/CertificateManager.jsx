import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import CertificateImageCropper from "../components/CertificateImageCropper";
import { formatEventDateDisplay } from "../utils/eventTiming";
import { formatParticipantName } from "../utils/participantName";

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

const CERTIFICATE_FONTS = [
  { id: "theme", label: "Theme Default", cssFamily: null, cssStyle: "normal" },
  { id: "serif", label: "Classic Serif", cssFamily: 'Georgia, "Times New Roman", serif', cssStyle: "normal" },
  { id: "sans", label: "Modern Sans", cssFamily: 'Arial, "Helvetica Neue", system-ui, sans-serif', cssStyle: "normal" },
  { id: "italicSerif", label: "Elegant Italic Serif", cssFamily: 'Georgia, "Times New Roman", serif', cssStyle: "italic" },
  { id: "italicSans", label: "Sleek Oblique Sans", cssFamily: 'Arial, "Helvetica Neue", system-ui, sans-serif', cssStyle: "italic" },
  { id: "mono", label: "Technical Mono", cssFamily: '"Courier New", ui-monospace, monospace', cssStyle: "normal" },
];

const TEXT_ELEMENT_CONFIG = {
  organization: {
    label: "Top Header",
    editableKey: "certificateOrganization",
    defaultSize: 14,
    minSize: 8,
    maxSize: 30,
    presets: { sm: 10, md: 14, lg: 18, xl: 22 },
  },
  title: {
    label: "Headline",
    editableKey: "certificateTitle",
    defaultSize: 28,
    minSize: 14,
    maxSize: 44,
    presets: { sm: 20, md: 28, lg: 34, xl: 40 },
  },
  recipient: {
    label: "Participant Name",
    editableKey: null,
    defaultSize: 34,
    minSize: 16,
    maxSize: 48,
    presets: { sm: 24, md: 34, lg: 40, xl: 46 },
  },
  description: {
    label: "Description",
    editableKey: "certificateDescription",
    multiline: true,
    defaultSize: 13,
    minSize: 8,
    maxSize: 24,
    presets: { sm: 10, md: 13, lg: 16, xl: 19 },
  },
  eventName: {
    label: "Event Name",
    editableKey: "certificateEventTitle",
    defaultSize: 16,
    minSize: 9,
    maxSize: 32,
    presets: { sm: 12, md: 16, lg: 20, xl: 26 },
  },
};

function buildTextStylesState(raw = {}, legacyOrgSize = "md", legacyOrgAlign = "center") {
  const input = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const [key, cfg] of Object.entries(TEXT_ELEMENT_CONFIG)) {
    const item = input[key] && typeof input[key] === "object" ? input[key] : {};
    const orgPreset = key === "organization" ? cfg.presets[legacyOrgSize] : null;
    out[key] = {
      font: item.font || "theme",
      fontSize: item.fontSize ?? orgPreset ?? null,
      align: item.align ?? (key === "organization" ? legacyOrgAlign : null),
      x: item.x ?? null,
      y: item.y ?? null,
    };
  }
  return out;
}

function resolveCssFontStyle(styleObj) {
  const fontEntry = CERTIFICATE_FONTS.find((f) => f.id === styleObj?.font) || CERTIFICATE_FONTS[0];
  const css = {};
  if (fontEntry.cssFamily) css.fontFamily = fontEntry.cssFamily;
  if (fontEntry.id !== "theme") css.fontStyle = fontEntry.cssStyle;
  if (styleObj?.fontSize) {
    // 1 PDF pt on 841.89pt A4 landscape equals 0.1188cqw across any viewport width
    const cqw = Math.round(Number(styleObj.fontSize) * 0.1188 * 100) / 100;
    css.fontSize = `${cqw}cqw`;
  }
  if (styleObj?.align) {
    css.textAlign = styleObj.align;
    css.alignSelf =
      styleObj.align === "left" ? "flex-start" : styleObj.align === "right" ? "flex-end" : "center";
  }
  return css;
}

function certificateSettings(event) {
  const orgSize = event.certificateOrganizationSize || "md";
  const orgAlign = event.certificateOrganizationAlign || "center";
  const savedOrg = String(event.certificateOrganization || "").trim();
  return {
    certificateEnabled: event.certificateEnabled ?? false,
    requireFeedbackForCertificate: event.requireFeedbackForCertificate === true,
    certificateTemplate: event.certificateTemplate || "classic",
    certificateTitle: event.certificateTitle || "Certificate of Participation",
    certificateDescription: event.certificateDescription || DEFAULT_DESCRIPTION,
    certificateEligibilityRule: event.certificateEligibilityRule || {
      mode: "any_day",
      minDays: 1,
      requiredSessionIds: [],
    },
    certificateEventTitle: event.certificateEventTitle || "",
    certificateShowOrganization: event.certificateShowOrganization === true || Boolean(savedOrg) || !event.certificateUpdatedAt,
    certificateOrganization: savedOrg || "EVENTRA",
    certificateOrganizationTagline: String(event.certificateOrganizationTagline || "").trim(),
    certificateOrganizationSize: orgSize,
    certificateOrganizationAlign: orgAlign,
    certificateOrganizationUppercase: event.certificateOrganizationUppercase === true,
    certificateTextStyles: buildTextStylesState(event.certificateTextStyles, orgSize, orgAlign),
    certificateLogoUrl: event.certificateLogoUrl || "",
    certificateLogoPath: event.certificateLogoPath || "",
    certificateLogoX: event.certificateLogoX ?? null,
    certificateLogoY: event.certificateLogoY ?? null,
    certificateLogoSize: event.certificateLogoSize ?? 8,
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
  const [eventDays, setEventDays] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selected, setSelected] = useState([]);
  const [previewId, setPreviewId] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [shownTemplates, setShownTemplates] = useState([]);
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const lastAiTitleRef = useRef("");
  const [selectedCanvasItem, setSelectedCanvasItem] = useState({ type: "text", key: "title" });
  const [cropQueue, setCropQueue] = useState(null);
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
      setEventDays(data.days || []);
      setAllSessions(data.allSessions || []);
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
    setSettings((current) => ({
      ...current,
      [key]: value,
      ...(key === "certificateOrganization" && String(value || "").trim()
        ? { certificateShowOrganization: true }
        : {}),
    }));
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

  function openCropper(kind, file, index = -1) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type) && !/\.(png|jpe?g)$/i.test(file.name)) {
      setError("Choose a PNG or JPEG image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Source image must be 15 MB or smaller.");
      return;
    }
    setError("");
    setCropQueue({ file, kind, index });
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
        setSettings((current) => ({
          ...current,
          certificateLogoUrl: data.imageUrl,
          certificateLogoPath: data.imagePath,
        }));
        setSelectedCanvasItem({ type: "logo" });
      } else {
        setSettings((current) => {
          const signatures = [...current.signatures];
          signatures[index] = { ...signatures[index], imagePath: data.imagePath, imageUrl: data.imageUrl };
          return { ...current, signatures };
        });
        setSelectedCanvasItem({ type: "signature", index });
      }
      setNotice("Cropped image uploaded. Drag on the certificate to place it, then Save settings.");
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

  async function askForSuggestion(exploreMore = false) {
    setWorking(true);
    setError("");
    setNotice("");
    const excludeList = exploreMore ? shownTemplates : [];
    if (!exploreMore) {
      setSuggestions([]);
    }
    try {
      const { data } = await api.post(`/certificates/event/${eventId}/ai-suggestion`, {
        eventType: settings.eventType,
        customPrompt: customAiPrompt,
        currentTemplate: settings.certificateTemplate,
        excludeTemplates: excludeList,
      });
      if (!data.configured) {
        setAiConfigured(false);
        setNotice(data.message || "Configure GEMINI_API_KEY on the server to enable suggestions.");
        return;
      }
      const nextList = Array.isArray(data.suggestions) && data.suggestions.length > 0
        ? data.suggestions
        : data.suggestion
        ? [data.suggestion]
        : [];
      setSuggestions(nextList);
      setShownTemplates((prev) => {
        const merged = exploreMore ? [...prev] : [];
        for (const item of nextList) {
          if (item?.template && !merged.includes(item.template)) {
            merged.push(item.template);
          }
        }
        return merged.length >= TEMPLATES.length ? nextList.map((i) => i.template) : merged;
      });
    } catch (suggestionError) {
      setError(suggestionError.response?.data?.message || "Could not get certificate suggestions.");
    } finally {
      setWorking(false);
    }
  }

  function applySuggestion(chosenSuggestion, includeSignatories = false, forceAiTitle = false) {
    if (!chosenSuggestion) return;
    const aiTitleSet = new Set(suggestions.map((s) => String(s?.title || "").trim()).filter(Boolean));
    const currentTitle = String(settings?.certificateTitle || "").trim();
    const isCustomHeading = Boolean(
      currentTitle &&
      currentTitle !== "Certificate of Participation" &&
      !aiTitleSet.has(currentTitle) &&
      currentTitle !== lastAiTitleRef.current
    );
    const keepCustomHeading = !forceAiTitle && isCustomHeading;

    setSettings((current) => {
      let nextSignatures = current.signatures || [];
      if (includeSignatories && Array.isArray(chosenSuggestion.suggestedSignatories) && chosenSuggestion.suggestedSignatories.length > 0) {
        const existing = [...nextSignatures];
        chosenSuggestion.suggestedSignatories.forEach((roleTitle, idx) => {
          if (idx >= 4) return;
          if (existing[idx]) {
            existing[idx] = {
              ...existing[idx],
              role: existing[idx].role || roleTitle,
              designation: existing[idx].designation || roleTitle,
            };
          } else {
            existing.push({ name: "", role: roleTitle, designation: roleTitle, imagePath: "", imageUrl: "" });
          }
        });
        nextSignatures = existing;
      }
      const nextTitle = keepCustomHeading ? current.certificateTitle : chosenSuggestion.title;
      if (!keepCustomHeading) {
        lastAiTitleRef.current = String(chosenSuggestion.title || "").trim();
      }
      return {
        ...current,
        certificateTemplate: chosenSuggestion.template,
        certificateTitle: nextTitle,
        certificateDescription: chosenSuggestion.description,
        signatures: nextSignatures,
      };
    });
    const matchedTemplate = TEMPLATES.find((t) => t.id === chosenSuggestion.template);
    setNotice(
      `Applied "${matchedTemplate?.name || chosenSuggestion.template}" design${includeSignatories ? " + signatory roles" : ""}${keepCustomHeading ? ` (kept your custom heading "${currentTitle}")` : ""}! Click 'Save settings' or 'Download PDF' to publish.`
    );
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
      if (settings) {
        await api.put(`/certificates/event/${eventId}`, settings);
      }
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
      if (settings) {
        await api.put(`/certificates/event/${eventId}`, settings);
      }
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
      if (settings) {
        await api.put(`/certificates/event/${eventId}`, settings);
      }
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
  const storageAvailable = ["local", "cloudinary", "database"].includes(imageStorage);

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
            <InlineTextStyleRow
              elementKey="title"
              styleObj={settings.certificateTextStyles?.title}
              onChange={(patch) => {
                setSettings((curr) => ({
                  ...curr,
                  certificateTextStyles: {
                    ...curr.certificateTextStyles,
                    title: { ...curr.certificateTextStyles?.title, ...patch },
                  },
                }));
                setNotice("");
              }}
            />
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
              <span>Header Tagline / Sub-details (Optional — Address, Pin Code, Phone, Affiliation…)</span>
              <input
                maxLength="200"
                value={settings.certificateOrganizationTagline || ""}
                onChange={(change) => update("certificateOrganizationTagline", change.target.value)}
                placeholder="e.g. Sahyadri Campus, Adyar, Mangaluru - 575007 · Ph: 0824-2277222"
              />
              <small style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                Printed neatly below the top header on the certificate (leave blank to omit).
              </small>
            </label>
            <div className="certificate-header-style-controls">
              <div className="certificate-style-group">
                <span>Header size</span>
                <div className="certificate-pill-group" role="group" aria-label="Header font size">
                  {[
                    { id: "sm", label: "Small" },
                    { id: "md", label: "Medium" },
                    { id: "lg", label: "Large" },
                    { id: "xl", label: "XL" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`certificate-pill-btn${(settings.certificateOrganizationSize || "md") === item.id ? " is-active" : ""}`}
                      onClick={() => {
                        const presetPt = TEXT_ELEMENT_CONFIG.organization.presets[item.id];
                        setSettings((curr) => ({
                          ...curr,
                          certificateOrganizationSize: item.id,
                          certificateTextStyles: {
                            ...curr.certificateTextStyles,
                            organization: { ...curr.certificateTextStyles?.organization, fontSize: presetPt },
                          },
                        }));
                        setNotice("");
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="certificate-style-group">
                <span>Header font</span>
                <select
                  className="certificate-inline-select"
                  value={settings.certificateTextStyles?.organization?.font || "theme"}
                  onChange={(e) => {
                    const font = e.target.value;
                    setSettings((curr) => ({
                      ...curr,
                      certificateTextStyles: {
                        ...curr.certificateTextStyles,
                        organization: { ...curr.certificateTextStyles?.organization, font },
                      },
                    }));
                    setNotice("");
                  }}
                >
                  {CERTIFICATE_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="certificate-style-group">
                <span>Position</span>
                <div className="certificate-pill-group" role="group" aria-label="Header alignment">
                  {[
                    { id: "left", label: "Left" },
                    { id: "center", label: "Middle" },
                    { id: "right", label: "Right" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`certificate-pill-btn${(settings.certificateOrganizationAlign || "center") === item.id ? " is-active" : ""}`}
                      onClick={() => {
                        setSettings((curr) => ({
                          ...curr,
                          certificateOrganizationAlign: item.id,
                          certificateTextStyles: {
                            ...curr.certificateTextStyles,
                            organization: { ...curr.certificateTextStyles?.organization, align: item.id },
                          },
                        }));
                        setNotice("");
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="certificate-style-group">
                <span>Letter case</span>
                <button
                  type="button"
                  className={`certificate-pill-btn${settings.certificateOrganizationUppercase ? " is-active" : ""}`}
                  onClick={() => update("certificateOrganizationUppercase", !settings.certificateOrganizationUppercase)}
                >
                  {settings.certificateOrganizationUppercase ? "ALL CAPS ✓" : "UPPERCASE"}
                </button>
              </div>
            </div>
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
            <InlineTextStyleRow
              elementKey="description"
              styleObj={settings.certificateTextStyles?.description}
              onChange={(patch) => {
                setSettings((curr) => ({
                  ...curr,
                  certificateTextStyles: {
                    ...curr.certificateTextStyles,
                    description: { ...curr.certificateTextStyles?.description, ...patch },
                  },
                }));
                setNotice("");
              }}
            />

            {/* Multi-Day Certificate Eligibility Rules */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(99, 102, 241, 0.28)",
                borderRadius: 10,
                marginTop: 14,
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <strong style={{ color: "#ffffff", fontSize: "0.92rem", display: "block" }}>
                  Certificate Eligibility Rule
                </strong>
                <small style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                  Select the attendance verification criteria required before certificates can be generated or downloaded.
                </small>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {[
                  { id: "any_day", label: "At least one day attended", desc: "Participants verified on at least 1 event day qualify." },
                  { id: "all_days", label: "All event days attended", desc: "Participants must attend every scheduled event day." },
                  { id: "min_days", label: "Minimum number of days attended", desc: "Require a minimum day count across the event." },
                  { id: "required_sessions", label: "Required sessions attended", desc: "Require check-ins for specific mandatory agenda sessions." },
                ].map((rule) => {
                  const currentMode = settings.certificateEligibilityRule?.mode || "any_day";
                  const isSel = currentMode === rule.id;
                  return (
                    <label
                      key={rule.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: isSel ? "rgba(99, 102, 241, 0.16)" : "rgba(255, 255, 255, 0.02)",
                        border: `1px solid ${isSel ? "#818cf8" : "rgba(255, 255, 255, 0.08)"}`,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="certRuleMode"
                        checked={isSel}
                        onChange={() => {
                          update("certificateEligibilityRule", {
                            ...settings.certificateEligibilityRule,
                            mode: rule.id,
                          });
                        }}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: isSel ? "#ffffff" : "#cbd5e1" }}>
                          {rule.label}
                        </strong>
                        <p style={{ margin: "2px 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
                          {rule.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {settings.certificateEligibilityRule?.mode === "min_days" && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(0,0,0,0.25)", borderRadius: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem", color: "#cbd5e1" }}>
                    <span>Minimum days required:</span>
                    <input
                      type="number"
                      min="1"
                      max={eventDays.length || 14}
                      value={settings.certificateEligibilityRule?.minDays || 1}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        update("certificateEligibilityRule", {
                          ...settings.certificateEligibilityRule,
                          minDays: val,
                        });
                      }}
                      style={{
                        width: 70,
                        padding: "4px 8px",
                        background: "#0f172a",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        borderRadius: 6,
                        textAlign: "center",
                      }}
                    />
                    <small style={{ color: "#94a3b8" }}>of {eventDays.length || 1} total days</small>
                  </label>
                </div>
              )}

              {settings.certificateEligibilityRule?.mode === "required_sessions" && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(0,0,0,0.25)", borderRadius: 8 }}>
                  <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                    Select mandatory sessions:
                  </span>
                  {allSessions.length === 0 ? (
                    <small style={{ color: "#94a3b8" }}>No sessions configured in the event schedule yet.</small>
                  ) : (
                    <div style={{ display: "grid", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                      {allSessions.map((ses) => {
                        const reqList = settings.certificateEligibilityRule?.requiredSessionIds || [];
                        const checked = reqList.includes(ses.sessionId);
                        return (
                          <label key={ses.sessionId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "#e2e8f0" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const nextList = e.target.checked
                                  ? [...reqList, ses.sessionId]
                                  : reqList.filter((id) => id !== ses.sessionId);
                                update("certificateEligibilityRule", {
                                  ...settings.certificateEligibilityRule,
                                  requiredSessionIds: nextList,
                                });
                              }}
                            />
                            <span>D{ses.dayNumber} · <strong>{ses.title}</strong> {ses.speaker ? `(${ses.speaker})` : ""}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                When enabled, attendees must complete their post-event feedback survey before their certificate becomes eligible.{" "}
                <Link
                  to={`/dashboard/events/${eventId}/edit?step=feedback`}
                  style={{ color: "#a5b4fc", textDecoration: "underline", fontWeight: 600 }}
                >
                  Edit feedback questions →
                </Link>
              </small>
            </div>

            <div className="certificate-logo-control">
              <div>
                <strong>Organization logo</strong>
                <small>Optional PNG or JPEG, up to 5 MB. No logo is required for a polished design.</small>
              </div>
              {settings.certificateLogoUrl && <img src={settings.certificateLogoUrl} alt="Certificate logo preview" />}
              <label className="cert-button upload-label">
                {working ? "Working…" : settings.certificateLogoUrl ? "Crop / replace logo" : "Upload & crop logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
                  disabled={!storageAvailable || working}
                  onChange={(change) => {
                    const picked = change.target.files?.[0];
                    change.target.value = "";
                    openCropper("logo", picked);
                  }}
                />
              </label>
              {settings.certificateLogoUrl && (
                <button type="button" className="text-action" disabled={working} onClick={() => removeImage(settings.certificateLogoPath, () => {
                  setSettings((current) => ({
                    ...current,
                    certificateLogoUrl: "",
                    certificateLogoPath: "",
                    certificateLogoX: null,
                    certificateLogoY: null,
                  }));
                  if (selectedCanvasItem?.type === "logo") setSelectedCanvasItem(null);
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
                  onKeyDown={(e) => e.key === "Enter" && askForSuggestion(false)}
                />
                <button
                  type="button"
                  className="cert-button cert-button-primary"
                  onClick={() => askForSuggestion(false)}
                  disabled={working || !aiConfigured}
                  style={{ flexShrink: 0 }}
                >
                  {working ? "Designing…" : "Suggest 4 Themes ✦"}
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

              {suggestions.length > 0 && (
                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#c7d2fe" }}>
                      {suggestions.length} AI Template Concepts Ready — Click any option to preview live
                    </span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        type="button"
                        className="cert-button"
                        onClick={() => askForSuggestion(true)}
                        disabled={working || !aiConfigured}
                        style={{ minHeight: 28, padding: "4px 10px", fontSize: "0.7rem" }}
                      >
                        {working ? "Loading…" : "↻ More Themes"}
                      </button>
                      <button type="button" className="text-action" onClick={() => setSuggestions([])} style={{ marginRight: 0 }}>
                        Clear
                      </button>
                    </div>
                  </div>

                  {suggestions.map((item, idx) => {
                    const tmplMeta = TEMPLATES.find((t) => t.id === item.template);
                    const isApplied = settings.certificateTemplate === item.template;
                    const curTitle = String(settings.certificateTitle || "").trim();
                    const hasDifferentCustomTitle = Boolean(curTitle && curTitle !== item.title && curTitle !== "Certificate of Participation");
                    return (
                      <div
                        key={`${item.template}-${idx}`}
                        className="certificate-suggestion"
                        style={{
                          marginTop: 0,
                          borderColor: isApplied ? "#34d399" : "rgba(99, 102, 241, 0.35)",
                          background: isApplied ? "rgba(16, 185, 129, 0.1)" : "rgba(99, 102, 241, 0.1)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <span
                              className={`certificate-template-swatch template-${item.template}`}
                              style={{ width: 58, height: 36, flexShrink: 0 }}
                            >
                              <i /><b /><em />
                            </span>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span className={`suggestion-chip template-${item.template}`}>
                                  {tmplMeta?.name || item.template}
                                </span>
                                {item.styleTag && (
                                  <span style={{ fontSize: "0.68rem", color: "#cbd5e1", fontWeight: 600 }}>
                                    {item.styleTag}
                                  </span>
                                )}
                                {idx === 0 && (
                                  <span style={{ fontSize: "0.68rem", color: "#34d399", fontWeight: 700 }}>
                                    ★ Top Match
                                  </span>
                                )}
                                {isApplied && (
                                  <span style={{ fontSize: "0.68rem", color: "#6ee7b7", fontWeight: 700 }}>
                                    ✓ Active on Preview
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <strong style={{ fontSize: "0.88rem", color: "#ffffff", marginTop: 2 }}>{item.title}</strong>
                          <p style={{ marginTop: 4, fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                            {item.description}
                          </p>
                          {item.suggestedSignatories?.length > 0 && (
                            <div style={{ marginTop: 5, fontSize: "0.69rem", color: "#94a3b8" }}>
                              <b style={{ color: "#c7d2fe" }}>Signatories:</b>{" "}
                              {item.suggestedSignatories.join(", ")}
                            </div>
                          )}
                          <p style={{ marginTop: 4, fontSize: "0.69rem", color: "#a5b4fc" }}>
                            <b>Why this fits:</b> {item.reason}
                          </p>
                        </div>

                        <div className="suggestion-actions" style={{ marginLeft: 8 }}>
                          <button
                            type="button"
                            className="cert-button cert-button-primary"
                            onClick={() => applySuggestion(item, false, false)}
                            style={{ minHeight: 32, padding: "6px 11px", fontSize: "0.73rem" }}
                          >
                            {isApplied ? "Re-Apply Theme" : "Apply Theme"}
                          </button>
                          {hasDifferentCustomTitle && (
                            <button
                              type="button"
                              className="text-action"
                              onClick={() => applySuggestion(item, false, true)}
                              style={{ marginRight: 0, fontSize: "0.69rem" }}
                              title={`Replace your current heading with "${item.title}"`}
                            >
                              + Use AI Heading
                            </button>
                          )}
                          {item.suggestedSignatories?.length > 0 && (
                            <button
                              type="button"
                              className="text-action"
                              onClick={() => applySuggestion(item, true, false)}
                              style={{ marginRight: 0, fontSize: "0.69rem" }}
                            >
                              + Apply Signatories
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
            <CertificatePreview
              event={event}
              organizer={organizer}
              settings={settings}
              participant={previewPerson}
              selectedItem={selectedCanvasItem}
              onSelectItem={setSelectedCanvasItem}
              onUpdateField={(field, val) => update(field, val)}
              onUpdateSignatureField={(sigIndex, field, val) => updateSignature(sigIndex, field, val)}
              onMoveLogo={(x, y) => {
                setSettings((curr) => ({ ...curr, certificateLogoX: x, certificateLogoY: y }));
                setNotice("");
              }}
              onMoveSignature={(sigIndex, x, y) => {
                setSettings((curr) => {
                  const signatures = [...curr.signatures];
                  signatures[sigIndex] = { ...signatures[sigIndex], x, y };
                  return { ...curr, signatures };
                });
                setNotice("");
              }}
              onMoveText={(key, x, y) => {
                setSettings((curr) => ({
                  ...curr,
                  certificateTextStyles: {
                    ...curr.certificateTextStyles,
                    [key]: { ...curr.certificateTextStyles?.[key], x, y },
                  },
                }));
                setNotice("");
              }}
            />
            <CertificatePlacementDock
              event={event}
              settings={settings}
              selectedItem={selectedCanvasItem}
              onSelectItem={setSelectedCanvasItem}
              onUpdateField={(field, val) => update(field, val)}
              onUpdateSignature={(sigIndex, patch) => {
                setSettings((curr) => {
                  const signatures = [...curr.signatures];
                  signatures[sigIndex] = { ...signatures[sigIndex], ...patch };
                  return { ...curr, signatures };
                });
                setNotice("");
              }}
              onUpdateLogo={(patch) => {
                setSettings((curr) => ({ ...curr, ...patch }));
                setNotice("");
              }}
              onUpdateTextStyle={(key, patch) => {
                setSettings((curr) => {
                  const next = {
                    ...curr,
                    certificateTextStyles: {
                      ...curr.certificateTextStyles,
                      [key]: { ...curr.certificateTextStyles?.[key], ...patch },
                    },
                  };
                  if (key === "organization" && patch.align) {
                    next.certificateOrganizationAlign = patch.align;
                  }
                  return next;
                });
                setNotice("");
              }}
            />
            <p className="preview-caption">Tip: Click any text, logo, or signature on the certificate to drag, resize, change font/alignment, or double-click any text on the certificate to edit it directly.</p>
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
                    {working ? "Working…" : signature.imageUrl ? "Crop / replace" : "Upload & crop"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
                      disabled={!storageAvailable || working}
                      onChange={(change) => {
                        const picked = change.target.files?.[0];
                        change.target.value = "";
                        openCropper("signature", picked, index);
                      }}
                    />
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
                        {(person.totalEventDays > 1 || (person.attendedSessions || []).length > 0) && (
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>
                            Days: {(person.attendedDays || []).length}/{person.totalEventDays || 1}
                            {(person.attendedSessions || []).length > 0 ? ` · ${(person.attendedSessions || []).length} ses.` : ""}
                          </div>
                        )}
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
                            title="Attendee met attendance criteria, but has not completed the feedback survey yet."
                          >
                            ⏳ Feedback Pending
                          </span>
                        )}
                        {!isEligible && !isPending && (
                          <span style={{ color: "#94a3b8", fontSize: "0.78rem" }} title={person.eligibilityReason || ""}>
                            {person.eligibilityReason || "Ineligible (Absent)"}
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
      {cropQueue && (
        <CertificateImageCropper
          file={cropQueue.file}
          kind={cropQueue.kind}
          onCancel={() => setCropQueue(null)}
          onConfirm={(croppedFile) => {
            const target = cropQueue;
            setCropQueue(null);
            uploadImage(target.kind, croppedFile, target.index);
          }}
        />
      )}
    </main>
  );
}

const PLACEMENT_PRESETS = [
  { id: "tl", label: "Top-Left", x: 14, y: 14 },
  { id: "tc", label: "Top-Mid", x: 50, y: 12 },
  { id: "tr", label: "Top-Right", x: 86, y: 14 },
  { id: "ml", label: "Left", x: 14, y: 50 },
  { id: "mc", label: "Middle", x: 50, y: 50 },
  { id: "mr", label: "Right", x: 86, y: 50 },
  { id: "bl", label: "Down-Left", x: 18, y: 80 },
  { id: "bc", label: "Down-Mid", x: 50, y: 80 },
  { id: "br", label: "Down-Right", x: 82, y: 80 },
];

function InlineTextStyleRow({ elementKey, styleObj, onChange }) {
  const cfg = TEXT_ELEMENT_CONFIG[elementKey];
  if (!cfg) return null;
  const activeFont = styleObj?.font || "theme";
  const activeSize = styleObj?.fontSize ?? cfg.defaultSize;
  const activeAlign = styleObj?.align || "";

  return (
    <div className="certificate-header-style-controls" style={{ marginTop: -4, marginBottom: 14 }}>
      <div className="certificate-style-group">
        <span>{cfg.label} size ({Math.round(activeSize)}pt)</span>
        <div className="certificate-pill-group" role="group" aria-label={`${cfg.label} font size`}>
          {[
            { id: "sm", label: "Small" },
            { id: "md", label: "Medium" },
            { id: "lg", label: "Large" },
            { id: "xl", label: "XL" },
          ].map((item) => {
            const pt = cfg.presets[item.id];
            return (
              <button
                key={item.id}
                type="button"
                className={`certificate-pill-btn${activeSize === pt ? " is-active" : ""}`}
                onClick={() => onChange({ fontSize: pt })}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="certificate-style-group">
        <span>Font</span>
        <select
          className="certificate-inline-select"
          value={activeFont}
          onChange={(e) => onChange({ font: e.target.value })}
        >
          {CERTIFICATE_FONTS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>
      <div className="certificate-style-group">
        <span>Align</span>
        <div className="certificate-pill-group" role="group" aria-label={`${cfg.label} alignment`}>
          {[
            { id: "left", label: "Left" },
            { id: "center", label: "Middle" },
            { id: "right", label: "Right" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`certificate-pill-btn${activeAlign === item.id ? " is-active" : ""}`}
              onClick={() => onChange({ align: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CertificatePlacementDock({
  event,
  settings,
  selectedItem,
  onSelectItem,
  onUpdateField,
  onUpdateLogo,
  onUpdateSignature,
  onUpdateTextStyle,
}) {
  const dockItems = [
    { type: "text", key: "organization", label: "Header" },
    { type: "text", key: "title", label: "Headline" },
    { type: "text", key: "recipient", label: "Name" },
    { type: "text", key: "description", label: "Description" },
    { type: "text", key: "eventName", label: "Event Name" },
  ];
  if (settings.certificateLogoUrl) {
    dockItems.push({ type: "logo", label: "Logo" });
  }
  (settings.signatures || []).forEach((sig, index) => {
    if (sig.name || sig.imageUrl) {
      dockItems.push({
        type: "signature",
        index,
        label: sig.name || `Signatory ${index + 1}`,
      });
    }
  });

  const active =
    dockItems.find(
      (item) =>
        selectedItem &&
        item.type === selectedItem.type &&
        (item.type !== "text" || item.key === selectedItem.key) &&
        (item.type !== "signature" || item.index === selectedItem.index)
    ) || dockItems[1];

  const isText = active.type === "text";
  const isLogo = active.type === "logo";
  const isSignature = active.type === "signature";

  const textCfg = isText ? TEXT_ELEMENT_CONFIG[active.key] : null;
  const textStyle = isText ? (settings.certificateTextStyles?.[active.key] || {}) : null;
  const activeSig = isSignature ? settings.signatures[active.index] : null;

  const isCustomPos = isText
    ? textStyle?.x != null && textStyle?.y != null
    : isLogo
      ? settings.certificateLogoX != null && settings.certificateLogoY != null
      : activeSig?.x != null && activeSig?.y != null;

  const curX = isText ? textStyle?.x : isLogo ? settings.certificateLogoX : activeSig?.x;
  const curY = isText ? textStyle?.y : isLogo ? settings.certificateLogoY : activeSig?.y;

  function applyPreset(preset) {
    if (isText) {
      const presetAlign = preset.id.endsWith("l") ? "left" : preset.id.endsWith("r") ? "right" : "center";
      onUpdateTextStyle(active.key, { x: preset.x, y: preset.y, align: presetAlign });
    } else if (isLogo) {
      onUpdateLogo({ certificateLogoX: preset.x, certificateLogoY: preset.y });
    } else {
      onUpdateSignature(active.index, { x: preset.x, y: preset.y });
    }
  }

  function resetToAuto() {
    if (isText) {
      onUpdateTextStyle(active.key, {
        font: "theme",
        fontSize: active.key === "organization" ? textCfg.presets[settings.certificateOrganizationSize || "md"] : null,
        align: active.key === "organization" ? settings.certificateOrganizationAlign || "center" : null,
        x: null,
        y: null,
      });
    } else if (isLogo) {
      onUpdateLogo({ certificateLogoX: null, certificateLogoY: null, certificateLogoSize: 8 });
    } else {
      onUpdateSignature(active.index, { x: null, y: null, scale: 1 });
    }
  }

  const currentTextValue =
    active.key === "eventName"
      ? (settings.certificateEventTitle || event?.title || "")
      : textCfg?.editableKey
        ? (settings[textCfg.editableKey] || "")
        : "";

  return (
    <div className="certificate-placement-dock">
      <div className="placement-dock-top">
        <div className="placement-item-tabs" role="group" aria-label="Select item to edit or position">
          {dockItems.map((item) => {
            const isActive =
              item.type === active.type &&
              item.key === active.key &&
              item.index === active.index;
            const icon = item.type === "logo" ? "🖼 " : item.type === "signature" ? "✍ " : "𝐓 ";
            return (
              <button
                key={item.type === "text" ? `text-${item.key}` : item.type === "logo" ? "logo" : `sig-${item.index}`}
                type="button"
                className={`certificate-pill-btn${isActive ? " is-active" : ""}`}
                onClick={() =>
                  onSelectItem(
                    item.type === "text"
                      ? { type: "text", key: item.key }
                      : item.type === "logo"
                        ? { type: "logo" }
                        : { type: "signature", index: item.index }
                  )
                }
              >
                {icon}
                {item.label}
              </button>
            );
          })}
        </div>
        <span className="placement-coords-badge">
          {isCustomPos ? `${Math.round(curX)}% × ${Math.round(curY)}%` : "Auto Layout"}
        </span>
      </div>

      <div className="placement-dock-controls">
        {isText && textCfg?.editableKey && (
          <label className="placement-inline-editor">
            <span>Edit {textCfg.label} Text</span>
            {textCfg.multiline ? (
              <textarea
                rows={2}
                maxLength={500}
                value={currentTextValue}
                onChange={(e) => onUpdateField(textCfg.editableKey, e.target.value)}
              />
            ) : (
              <input
                type="text"
                maxLength={150}
                value={currentTextValue}
                onChange={(e) => onUpdateField(textCfg.editableKey, e.target.value)}
                placeholder={active.key === "eventName" ? event?.title || "Event Name" : ""}
              />
            )}
          </label>
        )}

        {isText && (
          <div className="placement-text-toolbar">
            <label className="placement-mini-field">
              <span>Font</span>
              <select
                value={textStyle?.font || "theme"}
                onChange={(e) => onUpdateTextStyle(active.key, { font: e.target.value })}
              >
                {CERTIFICATE_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>

            <div className="placement-mini-field">
              <span>Size ({Math.round(textStyle?.fontSize ?? textCfg.defaultSize)}pt)</span>
              <div className="certificate-pill-group">
                {["sm", "md", "lg", "xl"].map((sz) => {
                  const pt = textCfg.presets[sz];
                  return (
                    <button
                      key={sz}
                      type="button"
                      className={`certificate-pill-btn${(textStyle?.fontSize ?? textCfg.defaultSize) === pt ? " is-active" : ""}`}
                      onClick={() => onUpdateTextStyle(active.key, { fontSize: pt })}
                    >
                      {sz.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="placement-mini-field">
              <span>Align</span>
              <div className="certificate-pill-group">
                {[
                  { id: "left", label: "Left" },
                  { id: "center", label: "Mid" },
                  { id: "right", label: "Right" },
                ].map((al) => (
                  <button
                    key={al.id}
                    type="button"
                    className={`certificate-pill-btn${(textStyle?.align || "center") === al.id ? " is-active" : ""}`}
                    onClick={() => onUpdateTextStyle(active.key, { align: al.id })}
                  >
                    {al.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <label className="placement-size-slider">
          <span>
            {isText
              ? `${textCfg.label} Font Size (${Math.round(textStyle?.fontSize ?? textCfg.defaultSize)}pt)`
              : isLogo
                ? `Logo Size (${Math.round(settings.certificateLogoSize || 8)}%)`
                : `Signature Size (${Math.round(((activeSig?.scale ?? 1) || 1) * 100)}%)`}
          </span>
          {isText ? (
            <input
              type="range"
              min={textCfg.minSize}
              max={textCfg.maxSize}
              step="1"
              value={textStyle?.fontSize ?? textCfg.defaultSize}
              onChange={(e) => onUpdateTextStyle(active.key, { fontSize: Number(e.target.value) })}
            />
          ) : isLogo ? (
            <input
              type="range"
              min="4"
              max="24"
              step="0.5"
              value={settings.certificateLogoSize ?? 8}
              onChange={(e) => onUpdateLogo({ certificateLogoSize: Number(e.target.value) })}
            />
          ) : (
            <input
              type="range"
              min="0.65"
              max="1.8"
              step="0.05"
              value={activeSig?.scale ?? 1}
              onChange={(e) => onUpdateSignature(active.index, { scale: Number(e.target.value) })}
            />
          )}
        </label>

        <div className="placement-preset-grid" role="group" aria-label="Quick placement presets">
          {PLACEMENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="placement-preset-btn"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className="placement-preset-btn is-reset"
            onClick={resetToAuto}
          >
            ↺ Auto
          </button>
        </div>
      </div>
    </div>
  );
}

function CertificatePreview({
  event,
  organizer,
  settings,
  participant,
  selectedItem,
  onSelectItem,
  onUpdateField,
  onMoveLogo,
  onMoveSignature,
  onMoveText,
}) {
  const artRef = useRef(null);
  const dragRef = useRef(null);
  const [snapGuides, setSnapGuides] = useState({ x: false, y: false });
  const [draggingKey, setDraggingKey] = useState("");
  const [editingKey, setEditingKey] = useState("");

  useEffect(() => {
    function handleMove(ev) {
      const drag = dragRef.current;
      const art = artRef.current;
      if (!drag || !art) return;
      const rect = art.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const minX = drag.kind === "logo" ? 4 : 8;
      const maxX = drag.kind === "logo" ? 96 : 92;
      const minY = drag.kind === "logo" ? 4 : 8;
      const maxY = drag.kind === "logo" ? 96 : 92;

      let xPct = ((ev.clientX + drag.offsetX - rect.left) / rect.width) * 100;
      let yPct = ((ev.clientY + drag.offsetY - rect.top) / rect.height) * 100;
      xPct = Math.min(maxX, Math.max(minX, xPct));
      yPct = Math.min(maxY, Math.max(minY, yPct));

      const snapX = Math.abs(xPct - 50) < 1.6;
      const snapY = Math.abs(yPct - 50) < 1.6;
      if (snapX) xPct = 50;
      if (snapY) yPct = 50;

      const roundedX = Math.round(xPct * 100) / 100;
      const roundedY = Math.round(yPct * 100) / 100;
      setSnapGuides({ x: snapX, y: snapY });

      if (drag.kind === "logo") {
        onMoveLogo?.(roundedX, roundedY);
      } else if (drag.kind === "signature") {
        onMoveSignature?.(drag.index, roundedX, roundedY);
      } else if (drag.kind === "text") {
        onMoveText?.(drag.key, roundedX, roundedY);
      }
    }

    function handleUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDraggingKey("");
      setSnapGuides({ x: false, y: false });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [onMoveLogo, onMoveSignature, onMoveText]);

  function startCanvasDrag(kind, meta, e) {
    if (editingKey) return;
    e.preventDefault();
    e.stopPropagation();
    const elRect = e.currentTarget.getBoundingClientRect();
    const centerX = elRect.left + elRect.width / 2;
    const centerY = elRect.top + elRect.height / 2;
    dragRef.current = {
      kind,
      index: kind === "signature" ? meta : -1,
      key: kind === "text" ? meta : "",
      offsetX: centerX - e.clientX,
      offsetY: centerY - e.clientY,
    };
    setDraggingKey(kind === "logo" ? "logo" : kind === "signature" ? `sig-${meta}` : `text-${meta}`);
    onSelectItem?.(
      kind === "logo"
        ? { type: "logo" }
        : kind === "signature"
          ? { type: "signature", index: meta }
          : { type: "text", key: meta }
    );
  }

  const participantName = formatParticipantName(participant?.name, "Participant Name");
  const eventDisplayTitle = (settings.certificateEventTitle || "").trim() || event.title || "Event Name";
  const date = event.eventDurationType === "multi_day"
    ? formatEventDateDisplay(event)
    : event.date
    ? new Date(event.date).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    : "Event date";
  const description = (settings.certificateDescription || DEFAULT_DESCRIPTION)
    .replaceAll("{name}", participantName)
    .replaceAll("{participantName}", participantName)
    .replaceAll("{event}", eventDisplayTitle)
    .replaceAll("{eventName}", eventDisplayTitle)
    .replaceAll("{date}", date)
    .replaceAll("{eventDate}", date)
    .replace(/\{[^{}]+\}/g, "");
  const indexedSignatures = (settings.signatures || [])
    .map((signature, index) => ({ signature, index }))
    .filter(({ signature }) => signature.name || signature.imageUrl)
    .slice(0, 4);
  const flowSignatures = indexedSignatures.filter(({ signature }) => signature.x == null || signature.y == null);
  const pinnedSignatures = indexedSignatures.filter(({ signature }) => signature.x != null && signature.y != null);
  const hasCustomLogoPos = settings.certificateLogoX != null && settings.certificateLogoY != null;
  const organizationDisplay = (settings.certificateOrganization || "EVENTRA").trim();
  const organizationTaglineDisplay = (settings.certificateOrganizationTagline || "").trim();
  const orgSize = settings.certificateOrganizationSize || "md";
  const orgAlign = settings.certificateOrganizationAlign || "center";
  const orgUppercase = settings.certificateOrganizationUppercase === true;
  const hasTopHeader = Boolean(organizationDisplay || organizationTaglineDisplay || (settings.certificateLogoUrl && !hasCustomLogoPos));

  const textStyles = settings.certificateTextStyles || {};
  const isTextSelected = (key) => selectedItem?.type === "text" && selectedItem.key === key;
  const isFloatingText = (key) => textStyles[key]?.x != null && textStyles[key]?.y != null;

  function renderEditableText(key, displayText, className, Tag = "div") {
    const styleObj = textStyles[key] || {};
    const cfg = TEXT_ELEMENT_CONFIG[key];
    const floating = styleObj.x != null && styleObj.y != null;
    const inlineCss = resolveCssFontStyle(styleObj);
    const isSelected = isTextSelected(key);
    const isEditing = editingKey === key;

    const floatingStyle = floating
      ? {
          left: `${styleObj.x}%`,
          top: `${styleObj.y}%`,
          maxWidth: key === "description" ? "78%" : "86%",
          textAlign: styleObj.align || "center",
        }
      : {};

    if (isEditing && cfg?.editableKey) {
      const editVal =
        key === "eventName"
          ? (settings.certificateEventTitle || event.title || "")
          : (settings[cfg.editableKey] || "");
      return (
        <div
          className={`certificate-inline-edit-wrap${floating ? " certificate-floating-text" : ""}`}
          style={floatingStyle}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {cfg.multiline ? (
            <textarea
              autoFocus
              rows={3}
              value={editVal}
              onChange={(e) => onUpdateField?.(cfg.editableKey, e.target.value)}
              onBlur={() => setEditingKey("")}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingKey("");
              }}
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={editVal}
              onChange={(e) => onUpdateField?.(cfg.editableKey, e.target.value)}
              onBlur={() => setEditingKey("")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") setEditingKey("");
              }}
            />
          )}
        </div>
      );
    }

    return (
      <Tag
        className={`${className} is-draggable-item${floating ? " certificate-floating-text" : ""}${isSelected ? " is-selected" : ""}${draggingKey === `text-${key}` ? " is-dragging" : ""}`}
        style={{ ...inlineCss, ...floatingStyle }}
        title={`Click to select & drag ${cfg.label}${cfg.editableKey ? " · Double-click to edit text directly" : ""}`}
        onPointerDown={(e) => startCanvasDrag("text", key, e)}
        onClick={(e) => {
          e.stopPropagation();
          onSelectItem?.({ type: "text", key });
        }}
        onDoubleClick={(e) => {
          if (!cfg.editableKey) return;
          e.stopPropagation();
          setEditingKey(key);
        }}
      >
        {displayText}
      </Tag>
    );
  }

  return (
    <div
      ref={artRef}
      className={`certificate-art certificate-art-${settings.certificateTemplate}${hasTopHeader ? " has-org-header" : ""}`}
      onClick={() => {
        setEditingKey("");
        onSelectItem?.(null);
      }}
    >
      <div className="certificate-art-inner">
        <header
          className={`certificate-art-header is-align-${textStyles.organization?.align || orgAlign} is-size-${orgSize}${orgUppercase ? " is-uppercase" : ""}`}
        >
          {settings.certificateLogoUrl && !hasCustomLogoPos && (
            <img
              className={`certificate-organization-logo is-draggable-item${selectedItem?.type === "logo" ? " is-selected" : ""}`}
              src={settings.certificateLogoUrl}
              alt="Organization logo"
              draggable={false}
              title="Drag logo anywhere on certificate"
              onPointerDown={(e) => startCanvasDrag("logo", -1, e)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectItem?.({ type: "logo" });
              }}
            />
          )}
          {(organizationDisplay || organizationTaglineDisplay) && !isFloatingText("organization") && (
            <div className="certificate-org-stack">
              {organizationDisplay && renderEditableText(
                "organization",
                organizationDisplay,
                "certificate-organization-name",
                "span"
              )}
              {organizationTaglineDisplay && (
                <span className="certificate-organization-tagline">
                  {organizationTaglineDisplay}
                </span>
              )}
            </div>
          )}
        </header>
        <div className="certificate-art-main">
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
          {!isFloatingText("title") && renderEditableText(
            "title",
            settings.certificateTitle || "Certificate of Participation",
            "certificate-headline-el",
            "h3"
          )}
          <p className="certificate-presented">This certificate is proudly presented to</p>
          {!isFloatingText("recipient") && renderEditableText(
            "recipient",
            participantName,
            "certificate-recipient",
            "strong"
          )}
          {!isFloatingText("description") && renderEditableText(
            "description",
            description,
            "certificate-art-description",
            "p"
          )}
          {!isFloatingText("eventName") && (
            <>
              {renderEditableText("eventName", eventDisplayTitle, "certificate-event-name", "strong")}
              <span
                className="certificate-art-date"
                style={
                  textStyles.eventName?.align
                    ? {
                        textAlign: textStyles.eventName.align,
                        alignSelf:
                          textStyles.eventName.align === "left"
                            ? "flex-start"
                            : textStyles.eventName.align === "right"
                              ? "flex-end"
                              : "center",
                      }
                    : {}
                }
              >
                {date}
              </span>
            </>
          )}
        </div>
        <div className="certificate-art-signatories">
          {flowSignatures.map(({ signature, index }) => {
            const isSelected = selectedItem?.type === "signature" && selectedItem.index === index;
            const scale = signature.scale ?? 1;
            return (
              <div
                key={`${signature.name}-${index}`}
                className={`is-draggable-item${isSelected ? " is-selected" : ""}`}
                title="Drag signatory anywhere on certificate"
                onPointerDown={(e) => startCanvasDrag("signature", index, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem?.({ type: "signature", index });
                }}
              >
                {signature.imageUrl && (
                  <img
                    src={signature.imageUrl}
                    alt={`${signature.name || "Signatory"} signature`}
                    style={{ height: `${Math.round(24 * scale)}px` }}
                    draggable={false}
                  />
                )}
                <i />
                <strong>{signature.name || "Authorized signatory"}</strong>
                <span>{signature.designation || signature.role}</span>
              </div>
            );
          })}
        </div>
        <span className="certificate-organizer">EVENTRA · EVENT CERTIFICATE</span>
      </div>

      {/* Floating custom-positioned text elements */}
      {organizationDisplay && isFloatingText("organization") && renderEditableText(
        "organization",
        organizationTaglineDisplay ? (
          <>
            <span>{orgUppercase ? organizationDisplay.toUpperCase() : organizationDisplay}</span>
            <span className="certificate-organization-tagline">{organizationTaglineDisplay}</span>
          </>
        ) : (
          orgUppercase ? organizationDisplay.toUpperCase() : organizationDisplay
        ),
        "certificate-organization-name",
        "div"
      )}
      {isFloatingText("title") && renderEditableText(
        "title",
        settings.certificateTitle || "Certificate of Participation",
        "certificate-headline-el",
        "h3"
      )}
      {isFloatingText("recipient") && renderEditableText(
        "recipient",
        participantName,
        "certificate-recipient",
        "strong"
      )}
      {isFloatingText("description") && renderEditableText(
        "description",
        description,
        "certificate-art-description",
        "p"
      )}
      {isFloatingText("eventName") && renderEditableText(
        "eventName",
        `${eventDisplayTitle}\n${date}`,
        "certificate-event-name certificate-event-floating-group",
        "div"
      )}

      {settings.certificateLogoUrl && hasCustomLogoPos && (
        <div
          className={`certificate-floating-logo is-draggable-item${selectedItem?.type === "logo" ? " is-selected" : ""}${draggingKey === "logo" ? " is-dragging" : ""}`}
          style={{
            left: `${settings.certificateLogoX}%`,
            top: `${settings.certificateLogoY}%`,
            width: `${settings.certificateLogoSize || 8}%`,
          }}
          title="Drag logo anywhere"
          onPointerDown={(e) => startCanvasDrag("logo", -1, e)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectItem?.({ type: "logo" });
          }}
        >
          <img src={settings.certificateLogoUrl} alt="Organization logo" draggable={false} />
        </div>
      )}

      {pinnedSignatures.map(({ signature, index }) => {
        const scale = signature.scale ?? 1;
        const isSelected = selectedItem?.type === "signature" && selectedItem.index === index;
        return (
          <div
            key={`pinned-${index}`}
            className={`certificate-floating-signatory is-draggable-item${isSelected ? " is-selected" : ""}${draggingKey === `sig-${index}` ? " is-dragging" : ""}`}
            style={{
              left: `${signature.x}%`,
              top: `${signature.y}%`,
              width: `${Math.round(16.6 * scale * 100) / 100}%`,
            }}
            title="Drag signatory anywhere"
            onPointerDown={(e) => startCanvasDrag("signature", index, e)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem?.({ type: "signature", index });
            }}
          >
            {signature.imageUrl && (
              <img
                src={signature.imageUrl}
                alt={`${signature.name || "Signatory"} signature`}
                style={{ height: `${Math.round(24 * scale)}px` }}
                draggable={false}
              />
            )}
            <i />
            <strong>{signature.name || "Authorized signatory"}</strong>
            <span>{signature.designation || signature.role}</span>
          </div>
        );
      })}

      {snapGuides.x && <div className="certificate-snap-guide-x" />}
      {snapGuides.y && <div className="certificate-snap-guide-y" />}
    </div>
  );
}
