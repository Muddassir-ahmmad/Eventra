import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";

const ANALYTICS_SECTION_DEF = {
  key: "analytics",
  title: "Attendance & Participation Analytics",
  desc: "Visual attendance breakdown cards, registration metrics, and department-wise turnout tables.",
};

const SECTION_DEFINITIONS = [
  { key: "executiveSummary", title: "Executive Summary", desc: "High-level summary of the event execution, attendance turnover, and overarching impact." },
  { key: "objectives", title: "Event Objectives", desc: "Core goals and intended educational or collaborative outcomes established for the program." },
  { key: "eventOverview", title: "Event Overview & Context", desc: "Venue, format, timings, organizers, capacity, and operational parameters." },
  { key: "activities", title: "Activities Conducted", desc: "Chronological or modular breakdown of presentations, workshops, discussions, and program flow." },
  { key: "highlights", title: "Key Event Highlights", desc: "Milestones, distinguished achievements, standout sessions, and high-impact moments." },
  { key: "speakersSummary", title: "Speakers, Guests & Sessions", desc: "Profiles and presentation topics led by featured speakers, guests, and session leaders." },
  { key: "participantEngagement", title: "Participant Engagement", desc: "Analysis of attendee turnout, interactive Q&A rounds, and department/college involvement." },
  { key: "outcomes", title: "Event Outcomes", desc: "Knowledge gained, skill advancements, project collaborations, and tangible participant takeaways." },
  { key: "feedbackSummary", title: "Feedback Analysis", desc: "Analysis of attendee evaluations, average scores across categories, and qualitative comments/suggestions." },
  { key: "challenges", title: "Challenges Faced & Mitigations", desc: "Logistical, technical, or timing hurdles encountered and how they were addressed." },
  { key: "futureImprovements", title: "Recommendations & Future Improvements", desc: "Strategic recommendations and procedural adjustments for subsequent editions." },
  { key: "conclusion", title: "Conclusion", desc: "Formal closing remarks, acknowledgments, and institutional sign-off." },
];

export default function PostEventReport() {
  const { eventId } = useParams();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [organizer, setOrganizer] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [isEventEnded, setIsEventEnded] = useState(false);
  const [lockedMessage, setLockedMessage] = useState("");
  const [eventEndDateTime, setEventEndDateTime] = useState(null);

  const [report, setReport] = useState({});
  const [reportStatus, setReportStatus] = useState("draft");
  const [lastSaved, setLastSaved] = useState(null);

  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // AI Assist State
  const [aiActiveSection, setAiActiveSection] = useState(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiSource, setAiSource] = useState("gemini");
  const [aiConfigured, setAiConfigured] = useState(true);

  useEffect(() => {
    loadReport();
  }, [eventId]);

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/reports/event/${eventId}`);
      setEvent(data.event);
      setOrganizer(data.organizer || {});
      setIsEventEnded(Boolean(data.isEventEnded));
      setAiConfigured(Boolean(data.aiConfigured));

      if (!data.isEventEnded) {
        setLockedMessage(data.message || "This event has not completed yet.");
        setEventEndDateTime(data.eventEndDateTime ? new Date(data.eventEndDateTime) : null);
      } else {
        setAnalytics(data.analytics);
        setReport(data.report || {});
        setReportStatus(data.reportStatus || "draft");
        setLastSaved(data.lastUpdated ? new Date(data.lastUpdated) : null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load post-event report.");
    } finally {
      setLoading(false);
    }
  }

  function updateSection(key, value) {
    setReport((prev) => ({ ...prev, [key]: value }));
    setNotice("");
  }

  function toggleStandardSection(key) {
    setReport((prev) => ({
      ...prev,
      includedSections: {
        ...(prev.includedSections || {}),
        [key]: prev.includedSections?.[key] === false,
      },
    }));
    setNotice("");
  }

  function updateSectionHeading(key, value) {
    setReport((prev) => ({
      ...prev,
      sectionTitles: {
        ...(prev.sectionTitles || {}),
        [key]: value,
      },
    }));
    setNotice("");
  }

  function selectAllSections() {
    const nextIncluded = { [ANALYTICS_SECTION_DEF.key]: true };
    SECTION_DEFINITIONS.forEach((d) => {
      nextIncluded[d.key] = true;
    });
    setReport((prev) => ({
      ...prev,
      includedSections: nextIncluded,
      customSections: (prev.customSections || []).map((c) => ({ ...c, included: true })),
    }));
    setNotice("All sections ticked for PDF export.");
  }

  function untickEmptySections() {
    setReport((prev) => {
      const nextIncluded = { ...(prev.includedSections || {}) };
      SECTION_DEFINITIONS.forEach((d) => {
        const txt = String(prev[d.key] || "").trim();
        nextIncluded[d.key] = Boolean(txt);
      });
      const nextCustom = (prev.customSections || []).map((c) => ({
        ...c,
        included: Boolean(String(c.content || "").trim()),
      }));
      return { ...prev, includedSections: nextIncluded, customSections: nextCustom };
    });
    setNotice("Unticked all sections that currently have no details entered.");
  }

  function addCustomSection() {
    const nextIndex = (report.customSections?.length || 0) + 1;
    const newSec = {
      id: `custom_${Date.now()}_${nextIndex}`,
      title: `Additional Section ${nextIndex}`,
      content: "",
      included: true,
    };
    setReport((prev) => ({
      ...prev,
      customSections: [...(prev.customSections || []), newSec],
    }));
    setNotice("Extra section added. Edit its heading and details below.");
  }

  function updateCustomSection(id, patch) {
    setReport((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).map((sec) =>
        sec.id === id ? { ...sec, ...patch } : sec
      ),
    }));
    setNotice("");
  }

  function removeCustomSection(id) {
    setReport((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).filter((sec) => sec.id !== id),
    }));
    if (aiActiveSection === id) {
      setAiActiveSection(null);
      setAiSuggestion(null);
    }
    setNotice("Extra section removed.");
  }

  async function saveReport(statusToSave = reportStatus) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...report,
        reportStatus: statusToSave,
      };
      const { data } = await api.put(`/reports/event/${eventId}`, payload);
      setReport(data.report);
      setReportStatus(data.report.reportStatus);
      setLastSaved(new Date());
      setNotice(statusToSave === "completed" ? "Report marked as completed!" : "Report draft saved successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save report.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    setDownloading(true);
    setError("");
    try {
      // Save latest section ticks, custom headings, edits, and extra sections before building PDF
      const { data: savedData } = await api.put(`/reports/event/${eventId}`, {
        ...report,
        reportStatus,
      });
      if (savedData?.report) {
        setReport(savedData.report);
        setLastSaved(new Date());
      }
      const response = await api.get(`/reports/event/${eventId}/pdf`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      const safeSlug = (event.slug || event.title || "event").toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 30);
      anchor.download = `eventra-report-${safeSlug}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setNotice("PDF report downloaded successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate or download report PDF.");
    } finally {
      setDownloading(false);
    }
  }

  async function requestAiAssist(sectionKey, sectionTitle, overrideInstruction, customDraftOverride) {
    setAiLoading(true);
    setAiSuggestion(null);
    setError("");
    try {
      const currentDraft = String(
        customDraftOverride !== undefined ? customDraftOverride : (report[sectionKey] || "")
      ).trim();
      const instructionToUse = overrideInstruction || aiInstruction || (currentDraft
        ? "Improve tone, clarity, and professionalism"
        : "Draft a comprehensive, executive-ready section for this report based on event information");

      const { data } = await api.post(`/reports/event/${eventId}/ai-assist`, {
        sectionKey,
        section: sectionTitle,
        text: currentDraft,
        instruction: instructionToUse,
      });

      if (!data.configured) {
        setAiConfigured(false);
        setNotice(data.message || "AI assistant is not configured on the server.");
        return;
      }

      const nextSuggestion = String(data.suggestion || "").trim();
      if (!nextSuggestion) {
        setError("AI returned an empty suggestion. Try a different preset or custom instruction.");
        return;
      }

      setAiSource(data.source || "gemini");
      setAiSuggestion(nextSuggestion);
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate AI suggestion.");
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion(sectionKey, isCustomSection = false) {
    if (!aiSuggestion) return;
    if (isCustomSection) {
      updateCustomSection(sectionKey, { content: aiSuggestion });
    } else {
      updateSection(sectionKey, aiSuggestion);
    }
    setAiSuggestion(null);
    setAiActiveSection(null);
    setNotice("AI suggestion applied. Click Save Draft or Download PDF to persist changes.");
  }

  function renderAiAssistDrawer(sectionId, sectionTitle, currentDraft, isCustomSection = false) {
    if (aiActiveSection !== sectionId) return null;
    return (
      <div className="ai-assist-box">
        <p>✨ AI Writing Assistant for {sectionTitle}</p>
        <div className="ai-preset-chips">
          {["Draft from Scratch", "Professional Polish", "Executive Tone", "Concise Summary"].map((preset) => (
            <button
              key={preset}
              type="button"
              className="ai-chip"
              onClick={() => {
                setAiInstruction(preset);
                requestAiAssist(sectionId, sectionTitle, preset, currentDraft);
              }}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          className="ai-custom-input"
          placeholder="Or type custom instruction (e.g., 'Draft from event details', 'Emphasize student engagement')..."
          value={aiInstruction}
          onChange={(e) => setAiInstruction(e.target.value)}
        />
        <button
          type="button"
          className="report-btn report-btn-primary"
          disabled={aiLoading}
          onClick={() => requestAiAssist(sectionId, sectionTitle, undefined, currentDraft)}
        >
          {aiLoading
            ? "Generating with Gemini AI..."
            : (String(currentDraft || "").trim() ? "✨ Polish / Improve with AI" : "✨ Generate Draft with AI")}
        </button>

        {!aiConfigured && (
          <p style={{ color: "#fcd34d", marginTop: 8, fontSize: "0.72rem" }}>
            Configure AI_API_KEY on the server to enable AI text assistance.
          </p>
        )}

        {aiSuggestion && (
          <div className="ai-suggestion-preview">
            <strong>
              Proposed Revision
              {aiSource === "fallback" ? " (Structured Smart Draft)" : " (Gemini AI)"}:
            </strong>
            <p>{aiSuggestion}</p>
            <div className="ai-suggestion-actions">
              <button
                type="button"
                className="report-btn report-btn-primary"
                onClick={() => applyAiSuggestion(sectionId, isCustomSection)}
              >
                Accept & Apply to Section
              </button>
              <button
                type="button"
                className="report-btn"
                onClick={() => setAiSuggestion(null)}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="report-page">
        <div className="report-shell center-page">
          <div className="spinner" />
          <p>Loading post-event report workspace...</p>
        </div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="report-page">
        <div className="report-shell center-page">
          <h1>{error}</h1>
          <Link className="report-btn report-btn-primary" to="/dashboard">Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="report-page">
      <div className="report-shell">
        {/* Top Header */}
        <header className="report-header">
          <div>
            <Link className="report-back" to={`/dashboard/events/${eventId}`}>← Back to Event Workspace</Link>
            <p className="report-kicker">POST-EVENT EVALUATION & REPORTING</p>
            <h1>{event?.title}</h1>
            <p className="report-subtitle">
              {isEventEnded
                ? `Event Concluded  ·  Official assessment & multi-page PDF generation`
                : `Event Upcoming / In Progress  ·  Locked until conclusion`}
            </p>
          </div>

          <div className="report-header-actions">
            {isEventEnded && (
              <span className={`report-status-pill ${reportStatus === "completed" ? "is-completed" : "is-draft"}`}>
                {reportStatus === "completed" ? "Completed" : "Draft"}
              </span>
            )}
            {isEventEnded && (
              <>
                <button
                  type="button"
                  className="report-btn report-btn-secondary"
                  onClick={() => saveReport("draft")}
                  disabled={saving || downloading}
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  className="report-btn report-btn-primary"
                  onClick={() => saveReport("completed")}
                  disabled={saving || downloading}
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  className="report-btn report-btn-secondary"
                  onClick={downloadPdf}
                  disabled={downloading}
                >
                  {downloading ? "Generating PDF..." : "⬇ Download PDF"}
                </button>
              </>
            )}
          </div>
        </header>

        {notice && <div className="report-alert" role="status">✓ {notice}</div>}
        {error && <div className="report-alert is-error" role="alert">⚠ {error}</div>}

        {/* Locked State if Event Has Not Concluded */}
        {!isEventEnded && (
          <section className="report-locked-card">
            <div className="report-locked-icon">⏳</div>
            <h2>Post-Event Report is Locked</h2>
            <p>{lockedMessage}</p>
            <p>
              Per institutional standards, comprehensive post-event evaluation reports and attendance analytics
              are calculated only after the event has formally concluded.
            </p>
            <div className="report-locked-meta">
              <div>
                <span>Scheduled Date</span>
                <strong>{event?.date ? new Date(event.date).toLocaleDateString() : "Unspecified"}</strong>
              </div>
              <div>
                <span>Scheduled End Time</span>
                <strong>{event?.endTime || "End of day"}</strong>
              </div>
              <div>
                <span>Venue</span>
                <strong>{event?.venue || "Venue"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{(event?.status || "published").toUpperCase()}</strong>
              </div>
            </div>
          </section>
        )}

        {/* Completed State: Analytics & 12 Section Editor */}
        {isEventEnded && (
          <>
            {/* Real Statistics Ribbon */}
            <section className="report-analytics-grid">
              <div className="report-metric-card">
                <span>Total Registrations</span>
                <strong>{analytics?.totalRegistrations ?? 0}</strong>
                <small>{analytics?.cancelledCount ?? 0} cancelled</small>
              </div>
              <div className="report-metric-card">
                <span>Confirmed Attendees</span>
                <strong>{analytics?.confirmedCount ?? 0}</strong>
                <small>Verified enrollments</small>
              </div>
              <div className="report-metric-card">
                <span>QR Checked In</span>
                <strong>{analytics?.attendedCount ?? 0}</strong>
                <small>{analytics?.absentCount ?? 0} marked absent</small>
              </div>
              <div className="report-metric-card">
                <span>Attendance Rate</span>
                <strong>{analytics?.attendanceRate ?? 0}%</strong>
                <small>(Attended / Confirmed) × 100</small>
              </div>
            </section>

            {/* Standard + Custom Sections with Tick Toggles & Editable Headings */}
            {(() => {
              const customSections = report.customSections || [];
              const standardIncludedCount =
                (report.includedSections?.[ANALYTICS_SECTION_DEF.key] !== false ? 1 : 0) +
                SECTION_DEFINITIONS.filter((d) => report.includedSections?.[d.key] !== false).length;
              const customIncludedCount = customSections.filter((c) => c.included !== false).length;
              const totalSectionsCount = 1 + SECTION_DEFINITIONS.length + customSections.length;
              const totalIncludedCount = standardIncludedCount + customIncludedCount;
              const analyticsIncluded = report.includedSections?.[ANALYTICS_SECTION_DEF.key] !== false;
              const analyticsHeading = report.sectionTitles?.[ANALYTICS_SECTION_DEF.key] ?? ANALYTICS_SECTION_DEF.title;

              return (
                <section className="report-sections-wrap">
                  <div className="report-sections-toolbar">
                    <div className="report-sections-toolbar-info">
                      <strong>{totalIncludedCount} of {totalSectionsCount}</strong> sections ticked for PDF export · Untick any section to hide it completely from the downloaded PDF.
                    </div>
                    <div className="report-sections-toolbar-actions">
                      <button type="button" className="report-btn report-btn-secondary" onClick={selectAllSections}>
                        ☑ Tick All
                      </button>
                      <button type="button" className="report-btn report-btn-secondary" onClick={untickEmptySections}>
                        Untick Empty Sections
                      </button>
                      <button type="button" className="report-btn report-btn-primary" onClick={addCustomSection}>
                        ＋ Add Extra Section
                      </button>
                    </div>
                  </div>

                  {/* Analytics Section Toggle & Editable Heading */}
                  <article className={`report-section-card${analyticsIncluded ? "" : " is-excluded"}`}>
                    <div className="report-section-header">
                      <div className="report-section-title" style={{ flex: 1 }}>
                        <span className="report-section-num">DATA</span>
                        <div className="report-heading-input-wrap">
                          <input
                            type="text"
                            maxLength={120}
                            className="report-heading-input"
                            value={analyticsHeading}
                            onChange={(e) => updateSectionHeading(ANALYTICS_SECTION_DEF.key, e.target.value)}
                            aria-label="Analytics section heading"
                          />
                        </div>
                      </div>
                      <label className={`report-include-toggle${analyticsIncluded ? "" : " is-off"}`}>
                        <input
                          type="checkbox"
                          checked={analyticsIncluded}
                          onChange={() => toggleStandardSection(ANALYTICS_SECTION_DEF.key)}
                        />
                        <span>{analyticsIncluded ? "Include in PDF" : "Excluded from PDF"}</span>
                      </label>
                    </div>
                    <p className="report-section-desc" style={{ marginBottom: 0 }}>
                      {ANALYTICS_SECTION_DEF.desc}
                    </p>

                    {analytics?.multiDay?.isMultiDay && Array.isArray(analytics?.multiDay?.dailyBreakdown) && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                          <strong style={{ fontSize: "0.85rem", color: "#38bdf8" }}>
                            Multi-Day Daily Breakdown ({analytics.multiDay.totalDays} Days)
                          </strong>
                          <span style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: 700 }}>
                            Attended All Days: {analytics.multiDay.participantsAttendingAllDays} / {analytics.confirmedCount} ({analytics.multiDay.participantsAttendingAllDaysRate}%)
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                          {analytics.multiDay.dailyBreakdown.map((d) => (
                            <div key={d.dayNumber} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              <strong style={{ display: "block", fontSize: "0.8rem", color: "#e2e8f0" }}>{d.title}</strong>
                              <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{d.uniqueAttendees} checked in</span>
                              <div style={{ fontSize: "0.75rem", color: "#06b6d4", fontWeight: 700, marginTop: 2 }}>{d.attendanceRate}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics?.certificateStats && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.78rem", color: "#cbd5e1" }}>
                        <span>Certificate Rule: <strong style={{ color: "#a5b4fc" }}>{analytics.certificateStats.ruleMode?.replace(/_/g, " ")}</strong></span>
                        <span>Eligible: <strong style={{ color: "#34d399" }}>{analytics.certificateStats.eligibleCount}</strong></span>
                        <span>Pending Feedback: <strong style={{ color: "#f59e0b" }}>{analytics.certificateStats.feedbackPendingCount}</strong></span>
                        <span>Issued: <strong style={{ color: "#ffffff" }}>{analytics.certificateStats.issuedCount}</strong></span>
                      </div>
                    )}
                  </article>

                  {SECTION_DEFINITIONS.map((def, idx) => {
                    const isAiOpen = aiActiveSection === def.key;
                    const isIncluded = report.includedSections?.[def.key] !== false;
                    const headingValue = report.sectionTitles?.[def.key] ?? def.title;

                    return (
                      <article className={`report-section-card${isIncluded ? "" : " is-excluded"}`} key={def.key}>
                        <div className="report-section-header">
                          <div className="report-section-title" style={{ flex: 1 }}>
                            <span className="report-section-num">{String(idx + 1).padStart(2, "0")}</span>
                            <div className="report-heading-input-wrap">
                              <input
                                type="text"
                                maxLength={120}
                                className="report-heading-input"
                                value={headingValue}
                                onChange={(e) => updateSectionHeading(def.key, e.target.value)}
                                aria-label={`Heading for ${def.title}`}
                              />
                            </div>
                          </div>
                          <div className="report-section-actions">
                            <label className={`report-include-toggle${isIncluded ? "" : " is-off"}`}>
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => toggleStandardSection(def.key)}
                              />
                              <span>{isIncluded ? "Include in PDF" : "Excluded from PDF"}</span>
                            </label>
                            <button
                              type="button"
                              className="report-btn report-btn-secondary"
                              onClick={() => {
                                setAiActiveSection(isAiOpen ? null : def.key);
                                setAiSuggestion(null);
                              }}
                            >
                              {isAiOpen ? "Close AI Assist" : "✨ AI Assist"}
                            </button>
                          </div>
                        </div>

                        <p className="report-section-desc">{def.desc}</p>
                        {!isIncluded && (
                          <span className="report-badge-inactive">
                            Unticked — This heading and section will NOT print in the downloaded PDF.
                          </span>
                        )}

                        {renderAiAssistDrawer(def.key, headingValue || def.title, report[def.key] || "", false)}

                        {/* Editable Section Content */}
                        <textarea
                          className="report-textarea"
                          rows={6}
                          value={report[def.key] || ""}
                          onChange={(e) => updateSection(def.key, e.target.value)}
                          placeholder={`Enter ${headingValue || def.title}...`}
                        />
                      </article>
                    );
                  })}

                  {/* Extra User-Added Sections */}
                  {customSections.map((customSec, cIdx) => {
                    const isAiOpen = aiActiveSection === customSec.id;
                    const isIncluded = customSec.included !== false;
                    return (
                      <article className={`report-section-card${isIncluded ? "" : " is-excluded"}`} key={customSec.id}>
                        <div className="report-section-header">
                          <div className="report-section-title" style={{ flex: 1 }}>
                            <span className="report-section-num">EXTRA {cIdx + 1}</span>
                            <div className="report-heading-input-wrap">
                              <input
                                type="text"
                                maxLength={120}
                                className="report-heading-input"
                                value={customSec.title || ""}
                                placeholder="Enter custom section heading..."
                                onChange={(e) => updateCustomSection(customSec.id, { title: e.target.value })}
                                aria-label="Custom section heading"
                              />
                            </div>
                          </div>
                          <div className="report-section-actions">
                            <label className={`report-include-toggle${isIncluded ? "" : " is-off"}`}>
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => updateCustomSection(customSec.id, { included: !isIncluded })}
                              />
                              <span>{isIncluded ? "Include in PDF" : "Excluded from PDF"}</span>
                            </label>
                            <button
                              type="button"
                              className="report-btn report-btn-secondary"
                              onClick={() => {
                                setAiActiveSection(isAiOpen ? null : customSec.id);
                                setAiSuggestion(null);
                              }}
                            >
                              {isAiOpen ? "Close AI Assist" : "✨ AI Assist"}
                            </button>
                            <button
                              type="button"
                              className="report-btn report-btn-secondary"
                              style={{ color: "#fb7185", borderColor: "rgba(244, 63, 94, 0.35)" }}
                              onClick={() => removeCustomSection(customSec.id)}
                            >
                              🗑 Remove
                            </button>
                          </div>
                        </div>

                        <p className="report-section-desc">
                          Custom extra section — edit the heading and content, or untick to omit from the downloaded PDF.
                        </p>
                        {!isIncluded && (
                          <span className="report-badge-inactive">
                            Unticked — This custom section will NOT print in the downloaded PDF.
                          </span>
                        )}

                        {renderAiAssistDrawer(customSec.id, customSec.title || "Additional Section", customSec.content || "", true)}

                        <textarea
                          className="report-textarea"
                          rows={5}
                          value={customSec.content || ""}
                          onChange={(e) => updateCustomSection(customSec.id, { content: e.target.value })}
                          placeholder={`Enter details for ${customSec.title || "this section"}...`}
                        />
                      </article>
                    );
                  })}

                  <div className="report-add-section-row">
                    <button type="button" className="report-btn report-btn-primary" onClick={addCustomSection}>
                      ＋ Add Extra Section
                    </button>
                  </div>
                </section>
              );
            })()}

            {/* Bottom Sticky Action Bar */}
            <div className="report-bottom-bar">
              <div className="report-bottom-info">
                {lastSaved ? `Last saved on ${lastSaved.toLocaleTimeString()}` : "Unsaved changes"} · Status: <strong>{reportStatus.toUpperCase()}</strong>
              </div>
              <div className="report-bottom-actions">
                <button
                  type="button"
                  className="report-btn report-btn-secondary"
                  onClick={() => saveReport("draft")}
                  disabled={saving || downloading}
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  className="report-btn report-btn-primary"
                  onClick={() => saveReport("completed")}
                  disabled={saving || downloading}
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  className="report-btn report-btn-secondary"
                  onClick={downloadPdf}
                  disabled={downloading}
                >
                  {downloading ? "Generating PDF..." : "⬇ Download PDF"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
