import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import sahyadriLogo from "../../../assets/sahyadri-logo.svg";

const DEFAULT_DESCRIPTION = "This certificate is presented to {name} for participating in {event}.";
const TEMPLATE_NAMES = ["classic", "modern", "academic"];

export default function CertificateManager() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selected, setSelected] = useState([]);
  const [previewId, setPreviewId] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [storageConfigured, setStorageConfigured] = useState(false);
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
      setParticipants(data.participants || []);
      setStorageConfigured(Boolean(data.storageConfigured));
      setEmailConfigured(Boolean(data.emailConfigured));
      setAiConfigured(Boolean(data.aiConfigured));
      setSettings({
        certificateEnabled: data.event.certificateEnabled ?? false,
        certificateTemplate: data.event.certificateTemplate || "classic",
        certificateTitle: data.event.certificateTitle || "Certificate of Participation",
        certificateDescription: data.event.certificateDescription || DEFAULT_DESCRIPTION,
        eventType: data.event.eventType || "",
        signatures: data.event.signatures || [],
      });
      setSelected((data.participants || [])
        .filter((person) => person.checkedIn && !person.certificate)
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

  function updateSignature(index, key, value) {
    const signatures = [...settings.signatures];
    signatures[index] = { ...signatures[index], [key]: value };
    update("signatures", signatures);
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(`/events/${eventId}`, settings);
      setEvent(data.event);
      setNotice("Certificate settings saved.");
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Could not save certificate settings.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadSignature(index, file) {
    if (!file) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.append("signature", file);
      const { data } = await api.post(`/certificates/event/${eventId}/signatures`, formData);
      const signatures = [...settings.signatures];
      signatures[index] = { ...signatures[index], imagePath: data.imagePath, imageUrl: data.imageUrl };
      update("signatures", signatures);
      setNotice("Signature uploaded. Save settings to use it on issued certificates.");
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || "Could not upload the signature image.");
    } finally {
      setWorking(false);
    }
  }

  async function askForSuggestion() {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/certificates/event/${eventId}/ai-suggestion`, {
        eventType: settings.eventType,
      });
      if (!data.configured) {
        setAiConfigured(false);
        setNotice("No AI provider is configured on the server.");
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
    setNotice("Suggestion applied to the editor. Save settings to keep it.");
  }

  function toggleParticipant(id) {
    setSelected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  function toggleAllEligible() {
    const eligible = participants.filter((person) => person.checkedIn && !person.certificate).map((person) => person._id);
    setSelected((current) => current.length === eligible.length ? [] : eligible);
  }

  async function generate(regenerate = false) {
    if (!settings.certificateEnabled) {
      setError("Enable certificates and save settings before generating.");
      return;
    }
    if (!selected.length) return;
    if (regenerate && !window.confirm(`Regenerate ${selected.length} selected certificate(s)? Existing PDFs will use the current design.`)) return;

    setWorking(true);
    setError("");
    setNotice("");
    try {
      await api.put(`/events/${eventId}`, settings);
      const { data } = await api.post(`/certificates/event/${eventId}/generate`, {
        registrationIds: selected,
        regenerate,
      });
      const parts = [];
      if (data.issued.length) parts.push(`${data.issued.length} generated`);
      if (data.alreadyIssued.length) parts.push(`${data.alreadyIssued.length} already issued`);
      if (data.ineligible.length) parts.push(`${data.ineligible.length} not eligible`);
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

  const eligible = participants.filter((person) => person.checkedIn);
  const selectedWithCertificates = participants.filter((person) => selected.includes(person._id) && person.certificate).length;
  const previewPerson = participants.find((person) => person._id === previewId) || { name: "Jordan Lee" };

  return (
    <main className="certificate-page">
      <div className="certificate-shell">
        <header className="certificate-header">
          <div>
            <Link className="certificate-back" to={`/dashboard/events/${eventId}`}>← Event workspace</Link>
            <p className="certificate-kicker">CERTIFICATE STUDIO</p>
            <h1>{event.title}</h1>
            <p className="certificate-subtitle">Design, preview and issue attendance certificates.</p>
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
                <input type="checkbox" checked={settings.certificateEnabled} onChange={(eventChange) => update("certificateEnabled", eventChange.target.checked)} />
                <span>{settings.certificateEnabled ? "On" : "Off"}</span>
              </label>
            </div>

            <div className="certificate-template-list" role="radiogroup" aria-label="Certificate template">
              {TEMPLATE_NAMES.map((template) => (
                <button
                  key={template}
                  type="button"
                  className={`certificate-template-choice ${settings.certificateTemplate === template ? "is-selected" : ""}`}
                  aria-pressed={settings.certificateTemplate === template}
                  onClick={() => update("certificateTemplate", template)}
                >
                  <span className={`certificate-template-swatch template-${template}`}><i /><b /><em /></span>
                  <span>{template[0].toUpperCase() + template.slice(1)}</span>
                </button>
              ))}
            </div>

            <label className="certificate-field">
              <span>Certificate headline</span>
              <input maxLength="100" value={settings.certificateTitle} onChange={(eventChange) => update("certificateTitle", eventChange.target.value)} />
            </label>
            <label className="certificate-field">
              <span>Event type</span>
              <input maxLength="80" value={settings.eventType} onChange={(eventChange) => update("eventType", eventChange.target.value)} placeholder="Workshop, conference, course…" />
            </label>
            <label className="certificate-field">
              <span>Certificate description</span>
              <textarea rows="4" maxLength="500" value={settings.certificateDescription} onChange={(eventChange) => update("certificateDescription", eventChange.target.value)} />
              <small>Use {"{name}"}, {"{event}"} and {"{date}"} to insert participant and event details.</small>
            </label>

            {aiConfigured && (
              <div className="certificate-ai">
                <div><strong>Theme suggestion</strong><small>Based on your event title, type and description.</small></div>
                <button type="button" className="cert-button" onClick={askForSuggestion} disabled={working}>Suggest</button>
              </div>
            )}
            {suggestion && (
              <div className="certificate-suggestion">
                <div><span className={`suggestion-chip template-${suggestion.template}`}>{suggestion.template}</span><strong>{suggestion.title}</strong><p>{suggestion.description}</p></div>
                <button type="button" className="cert-button cert-button-primary" onClick={applySuggestion}>Apply suggestion</button>
              </div>
            )}
          </div>

          <div className="certificate-preview-panel">
            <div className="certificate-panel-heading">
              <div><p className="certificate-kicker">LIVE PREVIEW</p><h2>{settings.certificateTemplate} certificate</h2></div>
              <label className="preview-participant">
                <span>Participant</span>
                <select value={previewId} onChange={(eventChange) => setPreviewId(eventChange.target.value)}>
                  <option value="">Sample participant</option>
                  {participants.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
                </select>
              </label>
            </div>
            <CertificatePreview event={event} settings={settings} participant={previewPerson} />
            <p className="preview-caption">PDFs are rendered from the current saved design.</p>
          </div>
        </section>

        <section className="certificate-panel signatories-panel">
          <div className="certificate-panel-heading">
            <div><p className="certificate-kicker">02 / AUTHORIZATION</p><h2>Signatories</h2></div>
            <button type="button" className="cert-button" disabled={settings.signatures.length >= 4} onClick={() => update("signatures", [...settings.signatures, { name: "", role: "", imagePath: "", imageUrl: "" }])}>＋ Add signatory</button>
          </div>
          {!storageConfigured && <p className="certificate-inline-warning">Supabase Storage is not configured. Signature upload is unavailable until the server has storage credentials.</p>}
          {settings.signatures.length === 0 && <p className="certificate-empty-line">No signatories added.</p>}
          <div className="signatory-list">
            {settings.signatures.map((signature, index) => (
              <div className="signatory-row" key={`${signature.imagePath || "signer"}-${index}`}>
                <label className="certificate-field"><span>Name</span><input value={signature.name || ""} onChange={(eventChange) => updateSignature(index, "name", eventChange.target.value)} /></label>
                <label className="certificate-field"><span>Role / title</span><input value={signature.role || ""} onChange={(eventChange) => updateSignature(index, "role", eventChange.target.value)} /></label>
                <div className="signature-upload">
                  {signature.imageUrl ? <img src={signature.imageUrl} alt={`${signature.name || "Signatory"} signature preview`} /> : <span className="signature-placeholder">Signature image</span>}
                  <label className="cert-button upload-label">
                    {working ? "Uploading…" : signature.imageUrl ? "Replace image" : "Upload image"}
                    <input type="file" accept="image/png,image/jpeg" disabled={!storageConfigured || working} onChange={(eventChange) => uploadSignature(index, eventChange.target.files?.[0])} />
                  </label>
                </div>
                <button type="button" className="remove-signatory" aria-label={`Remove ${signature.name || "signatory"}`} onClick={() => update("signatures", settings.signatures.filter((_, itemIndex) => itemIndex !== index))}>×</button>
              </div>
            ))}
          </div>
        </section>

        <section className="certificate-panel participant-panel">
          <div className="certificate-panel-heading participants-heading">
            <div><p className="certificate-kicker">03 / ELIGIBILITY</p><h2>Participants</h2><p>{eligible.length} checked in · {participants.length} confirmed registrations</p></div>
            <div className="participant-actions">
              <button type="button" className="cert-button" onClick={toggleAllEligible} disabled={!eligible.some((person) => !person.certificate)}>
                {selected.length ? "Clear selection" : "Select eligible"}
              </button>
              <button type="button" className="cert-button cert-button-primary" onClick={() => generate(false)} disabled={working || !selected.length || !settings.certificateEnabled}>Generate selected</button>
              {selectedWithCertificates > 0 && <button type="button" className="cert-button cert-button-danger" onClick={() => generate(true)} disabled={working}>Regenerate selected</button>}
            </div>
          </div>
          {!settings.certificateEnabled && <p className="certificate-inline-warning">Enable certificates and save settings before issuing certificates.</p>}
          <div className="attendance-note"><span>✓</span> Eligibility requires a confirmed registration marked checked in by QR attendance. QR integration is not active yet, so no certificate is eligible until it records attendance.</div>
          <div className="participant-table-wrap">
            <table className="participant-table">
              <thead><tr><th><span className="sr-only">Select</span></th><th>Participant</th><th>Email</th><th>Attendance</th><th>Certificate</th><th>Delivery</th><th>Actions</th></tr></thead>
              <tbody>
                {participants.map((person) => (
                  <tr key={person._id}>
                    <td><input aria-label={`Select ${person.name}`} type="checkbox" checked={selected.includes(person._id)} disabled={!person.checkedIn} onChange={() => toggleParticipant(person._id)} /></td>
                    <td><strong>{person.name}</strong></td>
                    <td>{person.email}</td>
                    <td><span className={`participant-status ${person.checkedIn ? "is-eligible" : ""}`}>{person.checkedIn ? "Checked in" : "Not checked in"}</span></td>
                    <td>{person.certificate ? <span className="issued-status">Issued · v{person.certificate.generation}</span> : <span className="not-issued">Not issued</span>}</td>
                    <td>{person.certificate?.lastEmailedAt ? `Emailed ${new Date(person.certificate.lastEmailedAt).toLocaleDateString()}` : "—"}</td>
                    <td className="participant-actions-cell">
                      {person.certificate && <>
                        <button type="button" className="text-action" onClick={() => downloadCertificate(person)} disabled={working}>Download PDF</button>
                        <button type="button" className="text-action" onClick={() => emailCertificate(person)} disabled={working || !emailConfigured} title={!emailConfigured ? "Configure SMTP on the server" : "Email certificate"}>Email</button>
                      </>}
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && <tr><td className="empty-participants" colSpan="7">No confirmed registrations yet.</td></tr>}
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

function CertificatePreview({ event, settings, participant }) {
  const date = event.date ? new Date(event.date).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "Event date";
  const description = (settings.certificateDescription || DEFAULT_DESCRIPTION)
    .replaceAll("{name}", participant.name || "Participant Name")
    .replaceAll("{event}", event.title || "Event Name")
    .replaceAll("{date}", date);
  const signatures = (settings.signatures || []).filter((signature) => signature.name || signature.imageUrl);

  return (
    <div className={`certificate-art certificate-art-${settings.certificateTemplate}`}>
      <div className="certificate-art-inner">
        <img className="certificate-college-logo" src={sahyadriLogo} alt="Sahyadri College of Engineering and Management, an autonomous institution" />
        <span className="certificate-art-brand">EVENTRA · RECOGNITION</span>
        <h3>{settings.certificateTitle || "Certificate of Participation"}</h3>
        <p className="certificate-presented">This certificate is proudly presented to</p>
        <strong className="certificate-recipient">{participant.name || "Participant Name"}</strong>
        <p className="certificate-art-description">{description}</p>
        <strong className="certificate-event-name">{event.title || "Event Name"}</strong>
        <span className="certificate-art-date">{date}</span>
        <div className="certificate-art-signatories">
          {signatures.slice(0, 4).map((signature, index) => (
            <div key={`${signature.name}-${index}`}>
              {signature.imageUrl && <img src={signature.imageUrl} alt="" />}
              <i />
              <strong>{signature.name || "Authorized signatory"}</strong>
              <span>{signature.role}</span>
            </div>
          ))}
        </div>
        <span className="certificate-organizer">Sahyadri College of Engineering and Management · Adyar, Mangalore</span>
      </div>
    </div>
  );
}
