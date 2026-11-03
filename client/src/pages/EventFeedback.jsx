import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import "../feedback.css";

export default function EventFeedback() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retrying, setRetrying] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [starFilter, setStarFilter] = useState("all");

  useEffect(() => {
    loadFeedbackData();
  }, [eventId]);

  async function loadFeedbackData() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/feedback/event/${eventId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load feedback dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryEmails() {
    setRetrying(true);
    setError("");
    setNotice("");
    try {
      const res = await api.post(`/feedback/event/${eventId}/retry-emails`);
      setNotice(res.data.message || "Feedback email queue processed.");
      await loadFeedbackData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not trigger email retries.");
    } finally {
      setRetrying(false);
    }
  }

  function downloadCsv() {
    if (!data?.feedbacks || data.feedbacks.length === 0) {
      alert("No feedback submissions to export.");
      return;
    }

    const headers = [
      "Participant Name",
      "Participant Email",
      "Overall Rating",
      "Organization Rating",
      "Speakers Rating",
      "Venue Rating",
      "What Was Liked",
      "Areas for Improvement",
      "Suggestions",
      "Submitted At",
    ];

    const rows = data.feedbacks.map((fb) => [
      `"${(fb.participantName || "").replace(/"/g, '""')}"`,
      `"${(fb.participantEmail || "").replace(/"/g, '""')}"`,
      fb.ratingOverall,
      fb.ratingOrganization,
      fb.ratingSpeakers,
      fb.ratingVenue,
      `"${(fb.liked || "").replace(/"/g, '""')}"`,
      `"${(fb.improvements || "").replace(/"/g, '""')}"`,
      `"${(fb.suggestions || "").replace(/"/g, '""')}"`,
      `"${new Date(fb.submittedAt).toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `eventra-feedback-${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="center-page">
        <div className="spinner" />
        <p>Loading feedback dashboard...</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="center-page">
        <h1>{error}</h1>
        <Link to={`/dashboard/events/${eventId}`} className="button button-primary">
          Back to Event Workspace
        </Link>
      </main>
    );
  }

  const { event, analytics, feedbacks = [] } = data;

  // Filter feedback items
  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchesSearch =
      (fb.participantName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fb.participantEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fb.liked || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStar =
      starFilter === "all" || String(fb.ratingOverall) === starFilter;

    return matchesSearch && matchesStar;
  });

  return (
    <main className="event-feedback-dashboard">
      <div style={{ marginBottom: "1rem" }}>
        <Link className="back-link" to={`/dashboard/events/${eventId}`}>
          ← Event Workspace
        </Link>
      </div>

      <header className="feedback-dash-header">
        <div>
          <span className="brand-pill" style={{ background: "#0f766e", color: "#fff" }}>
            POST-EVENT AUTOMATION & FEEDBACK
          </span>
          <h1>{event.title}</h1>
          <p style={{ color: "var(--fb-muted)", margin: 0 }}>
            Real-time participant evaluations, rating analytics, and individual responses.
          </p>
        </div>

        <div className="feedback-dash-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={downloadCsv}
            disabled={feedbacks.length === 0}
          >
            📥 Export CSV
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleRetryEmails}
            disabled={retrying}
          >
            {retrying ? "Processing Emails..." : "↻ Retry Pending Emails"}
          </button>
        </div>
      </header>

      {notice && (
        <div className="certificate-alert" style={{ marginBottom: "1.5rem" }} role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="certificate-alert is-error" style={{ marginBottom: "1.5rem" }} role="alert">
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <section className="feedback-kpi-grid">
        <div className="feedback-kpi-card">
          <div className="kpi-title">Invited Participants</div>
          <div className="kpi-metric">{analytics.totalInvited}</div>
          <div className="kpi-subtext">Confirmed registrations invited</div>
        </div>

        <div className="feedback-kpi-card">
          <div className="kpi-title">Emails Delivered</div>
          <div className="kpi-metric">{analytics.emailsSent}</div>
          <div className="kpi-subtext">
            {analytics.emailsFailed > 0 ? (
              <span style={{ color: "#dc2626" }}>{analytics.emailsFailed} delivery failures</span>
            ) : (
              "All dispatched cleanly"
            )}
          </div>
        </div>

        <div className="feedback-kpi-card">
          <div className="kpi-title">Submissions Received</div>
          <div className="kpi-metric">{analytics.submissionsReceived}</div>
          <div className="kpi-subtext">{analytics.responseRate}% response rate</div>
        </div>

        <div className="feedback-kpi-card">
          <div className="kpi-title">Pending Feedback</div>
          <div className="kpi-metric">{analytics.pendingFeedback}</div>
          <div className="kpi-subtext">Participants yet to evaluate</div>
        </div>
      </section>

      {/* Ratings Detailed Visuals */}
      <section className="feedback-ratings-container">
        <div className="ratings-main-card">
          <div className="kpi-title">Overall Satisfaction</div>
          <div className="rating-big-number">
            {analytics.averageRatings?.overall > 0 ? analytics.averageRatings.overall : "—"}
          </div>
          <div className="rating-big-stars">
            {"★".repeat(Math.round(analytics.averageRatings?.overall || 0))}
            {"☆".repeat(5 - Math.round(analytics.averageRatings?.overall || 0))}
          </div>
          <small style={{ color: "var(--fb-muted)" }}>
            Based on {analytics.submissionsReceived} verified responses
          </small>
        </div>

        <div className="ratings-breakdown-card">
          <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem", fontWeight: 700 }}>
            Category Score Breakdown
          </h3>

          <div className="subrating-row">
            <span className="subrating-label">Event Organization</span>
            <div className="subrating-bar-container">
              <div
                className="subrating-bar-fill"
                style={{ width: `${((analytics.averageRatings?.organization || 0) / 5) * 100}%` }}
              />
            </div>
            <span className="subrating-score">
              {analytics.averageRatings?.organization || 0} / 5
            </span>
          </div>

          <div className="subrating-row">
            <span className="subrating-label">Speakers & Sessions</span>
            <div className="subrating-bar-container">
              <div
                className="subrating-bar-fill"
                style={{ width: `${((analytics.averageRatings?.speakers || 0) / 5) * 100}%` }}
              />
            </div>
            <span className="subrating-score">
              {analytics.averageRatings?.speakers || 0} / 5
            </span>
          </div>

          <div className="subrating-row">
            <span className="subrating-label">Venue & Facilities</span>
            <div className="subrating-bar-container">
              <div
                className="subrating-bar-fill"
                style={{ width: `${((analytics.averageRatings?.venue || 0) / 5) * 100}%` }}
              />
            </div>
            <span className="subrating-score">
              {analytics.averageRatings?.venue || 0} / 5
            </span>
          </div>
        </div>
      </section>

      {/* Submissions Section */}
      <section className="feedback-list-section">
        <div className="feedback-filter-bar">
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
            Participant Responses ({filteredFeedbacks.length})
          </h2>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search by name, email, or comment..."
              className="filter-input"
              style={{ width: "260px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="filter-input"
              value={starFilter}
              onChange={(e) => setStarFilter(e.target.value)}
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars only</option>
              <option value="4">4 Stars only</option>
              <option value="3">3 Stars only</option>
              <option value="2">2 Stars only</option>
              <option value="1">1 Star only</option>
            </select>
          </div>
        </div>

        {filteredFeedbacks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--fb-muted)" }}>
            <p style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>No feedback submissions found.</p>
            <small>Feedback requests are automatically sent to participants when the event concludes.</small>
          </div>
        ) : (
          filteredFeedbacks.map((fb) => (
            <div key={fb._id} className="feedback-card-item">
              <div className="feedback-item-header">
                <div>
                  <span className="participant-badge">{fb.participantName}</span>
                  <span style={{ color: "var(--fb-muted)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                    ({fb.participantEmail})
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ color: "#d97706", fontWeight: 800, fontSize: "1.1rem" }}>
                    {"★".repeat(fb.ratingOverall)}
                  </span>
                  <span className="submission-date">
                    {new Date(fb.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.825rem", color: "var(--fb-muted)", marginBottom: "0.5rem" }}>
                <span>Org: <strong>{fb.ratingOrganization}/5</strong></span>
                <span>Speakers: <strong>{fb.ratingSpeakers}/5</strong></span>
                <span>Venue: <strong>{fb.ratingVenue}/5</strong></span>
              </div>

              {fb.liked && (
                <div className="feedback-text-quote">
                  <strong>What they liked:</strong>
                  {fb.liked}
                </div>
              )}

              {fb.improvements && (
                <div className="feedback-text-quote" style={{ borderLeftColor: "#d97706" }}>
                  <strong>What could be improved:</strong>
                  {fb.improvements}
                </div>
              )}

              {fb.suggestions && (
                <div className="feedback-text-quote" style={{ borderLeftColor: "#64748b" }}>
                  <strong>Additional suggestions:</strong>
                  {fb.suggestions}
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
