import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";

const SECTION_DEFINITIONS = [
  { key: "executiveSummary", title: "Executive Summary", desc: "High-level summary of the event execution, attendance turnover, and overarching impact." },
  { key: "objectives", title: "Event Objectives", desc: "Core goals and intended educational or collaborative outcomes established for the program." },
  { key: "eventOverview", title: "Event Overview & Context", desc: "Venue, format, timings, organizers, capacity, and operational parameters." },
  { key: "activities", title: "Activities Conducted", desc: "Chronological or modular breakdown of presentations, workshops, discussions, and program flow." },
  { key: "highlights", title: "Key Highlights", desc: "Milestones, distinguished achievements, standout sessions, and high-impact moments." },
  { key: "speakersSummary", title: "Speakers & Sessions", desc: "Profiles and presentation topics led by featured speakers, guests, and session leaders." },
  { key: "participantEngagement", title: "Participant Engagement", desc: "Analysis of attendee turnout, interactive Q&A rounds, and department/college involvement." },
  { key: "outcomes", title: "Event Outcomes", desc: "Knowledge gained, skill advancements, project collaborations, and tangible participant takeaways." },
  { key: "challenges", title: "Challenges Faced & Mitigations", desc: "Logistical, technical, or timing hurdles encountered and how they were addressed." },
  {
    key: "feedbackSummary",
    title: "Participant Feedback & Satisfaction Analysis",
    desc: "Analysis of attendee evaluations, average scores across categories, and qualitative comments/suggestions.",
  },
  { key: "futureImprovements", title: "Future Improvements & Recommendations", desc: "Strategic recommendations and procedural adjustments for subsequent editions." },
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

  async function requestAiAssist(sectionKey, sectionTitle, overrideInstruction) {
    setAiLoading(true);
    setAiSuggestion(null);
    setError("");
    try {
      const currentDraft = (report[sectionKey] || "").trim();
      const instructionToUse = overrideInstruction || aiInstruction || (currentDraft
        ? "Improve tone, clarity, and professionalism"
        : "Draft a comprehensive, executive-ready section for this report based on event information");

      const { data } = await api.post(`/reports/event/${eventId}/ai-assist`, {
        section: sectionTitle,
        text: currentDraft,
        instruction: instructionToUse,
      });

      if (!data.configured) {
        setAiConfigured(false);
        setNotice(data.message || "AI assistant is not configured on the server.");
        return;
      }

      setAiSuggestion(data.suggestion);
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate AI suggestion.");
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion(sectionKey) {
    if (!aiSuggestion) return;
    updateSection(sectionKey, aiSuggestion);
    setAiSuggestion(null);
    setAiActiveSection(null);
    setNotice("AI suggestion applied. Click Save Draft to persist changes.");
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

            {/* 12 Sections */}
            <section className="report-sections-wrap">
              {SECTION_DEFINITIONS.map((def, idx) => {
                const isAiOpen = aiActiveSection === def.key;

                return (
                  <article className="report-section-card" key={def.key}>
                    <div className="report-section-header">
                      <div className="report-section-title">
                        <span className="report-section-num">{String(idx + 1).padStart(2, "0")}</span>
                        <h3>{def.title}</h3>
                      </div>
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

                    <p className="report-section-desc">{def.desc}</p>

                    {/* AI Assist Drawer */}
                    {isAiOpen && (
                      <div className="ai-assist-box">
                        <p>✨ AI Writing Assistant for {def.title}</p>
                        <div className="ai-preset-chips">
                          {["Draft from Scratch", "Professional Polish", "Executive Tone", "Concise Summary"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className="ai-chip"
                              onClick={() => {
                                setAiInstruction(preset);
                                requestAiAssist(def.key, def.title, preset);
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
                          onClick={() => requestAiAssist(def.key, def.title)}
                        >
                          {aiLoading
                            ? "Generating with Gemini AI..."
                            : (report[def.key]?.trim() ? "✨ Polish / Improve with AI" : "✨ Generate Draft with AI")}
                        </button>

                        {!aiConfigured && (
                          <p style={{ color: "#fcd34d", marginTop: 8, fontSize: "0.72rem" }}>
                            Configure AI_API_KEY on the server to enable AI text assistance.
                          </p>
                        )}

                        {aiSuggestion && (
                          <div className="ai-suggestion-preview">
                            <strong>Proposed Revision:</strong>
                            <p>{aiSuggestion}</p>
                            <div className="ai-suggestion-actions">
                              <button
                                type="button"
                                className="report-btn report-btn-primary"
                                onClick={() => applyAiSuggestion(def.key)}
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
                    )}

                    {/* Editable Section Content */}
                    <textarea
                      className="report-textarea"
                      rows={6}
                      value={report[def.key] || ""}
                      onChange={(e) => updateSection(def.key, e.target.value)}
                      placeholder={`Enter ${def.title}...`}
                    />
                  </article>
                );
              })}
            </section>

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
