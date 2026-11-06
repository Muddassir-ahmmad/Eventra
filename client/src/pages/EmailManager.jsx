import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import "../email-manager.css";

export default function EmailManager() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [testing, setTesting] = useState(false);
  const [retryingId, setRetryingId] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  useEffect(() => {
    loadEmailData();
  }, [eventId, status, type]);

  async function loadEmailData() {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search) query.append("search", search);
      if (status !== "all") query.append("status", status);
      if (type !== "all") query.append("type", type);

      const res = await api.get(`/emails/event/${eventId}?${query.toString()}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load email delivery logs.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadEmailData();
  }

  async function handleTestEmail() {
    setTesting(true);
    setError("");
    setNotice("");
    try {
      const res = await api.post("/emails/test");
      setNotice(res.data.message || "Test email dispatched successfully.");
      await loadEmailData();
    } catch (err) {
      setError(err.response?.data?.message || "Test email delivery failed.");
    } finally {
      setTesting(false);
    }
  }

  async function handleRetry(logId) {
    setRetryingId(logId);
    setError("");
    setNotice("");
    try {
      const res = await api.post(`/emails/${logId}/retry`);
      setNotice(res.data.message || "Email re-delivered successfully.");
      await loadEmailData();
    } catch (err) {
      setError(err.response?.data?.message || "Email retry attempt failed.");
    } finally {
      setRetryingId(null);
    }
  }

  if (loading && !data) {
    return (
      <main className="center-page">
        <div className="spinner" />
        <p>Loading email delivery logs...</p>
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

  const { event, provider, stats, logs = [] } = data;

  return (
    <main className="email-manager-page">
      <div style={{ marginBottom: "1rem" }}>
        <Link className="back-link" to={`/dashboard/events/${eventId}`}>
          ← Event Workspace
        </Link>
      </div>

      <header className="email-dash-header">
        <div>
          <span className="brand-pill">
            EMAIL NOTIFICATION MODULE
          </span>
          <h1>{event.title} — Email Delivery</h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            Audit, inspect delivery records, and retry participant notifications and tickets.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="button button-ghost"
            onClick={loadEmailData}
            disabled={loading}
          >
            ↻ Refresh Logs
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

      {/* Provider Status Banner */}
      <section className="email-provider-card">
        <div className="provider-info">
          <h4>
            SMTP Provider Status:{" "}
            <span
              className={`provider-badge ${
                provider.configured ? "is-connected" : "is-disconnected"
              }`}
            >
              {provider.configured ? "Configured & Active" : "Missing Credentials"}
            </span>
          </h4>
          <p>
            {provider.configured
              ? `Host: ${provider.host} (Port: ${provider.port}) · From: ${provider.emailFrom}`
              : "Email delivery requires SMTP configuration. Set SMTP_HOST and EMAIL_FROM in the server .env file."}
          </p>
        </div>

        <div>
          <button
            type="button"
            className="button button-primary"
            onClick={handleTestEmail}
            disabled={testing || !provider.configured}
          >
            {testing ? "Testing..." : "✉ Send Test Email"}
          </button>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <section className="email-kpi-grid">
        <div className="email-kpi-card">
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Total Dispatched
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0" }}>
            {stats.totalDispatched}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>All event emails logged</div>
        </div>

        <div className="email-kpi-card">
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>
            Delivered Successfully
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#047857", margin: "0.25rem 0" }}>
            {stats.totalSent}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
            {stats.successRate}% delivery rate
          </div>
        </div>

        <div className="email-kpi-card">
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#b91c1c", textTransform: "uppercase" }}>
            Failed Deliveries
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#b91c1c", margin: "0.25rem 0" }}>
            {stats.totalFailed}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
            {stats.totalFailed > 0 ? "Eligible for retry" : "Zero errors"}
          </div>
        </div>

        <div className="email-kpi-card">
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Type Breakdown
          </div>
          <div style={{ fontSize: "0.825rem", color: "#334155", marginTop: "0.5rem", lineHeight: 1.6 }}>
            <div>Confirmations: <strong>{stats.breakdown?.registration_confirmation || 0}</strong></div>
            <div>Tickets: <strong>{stats.breakdown?.ticket_delivery || 0}</strong></div>
            <div>Certificates: <strong>{stats.breakdown?.certificate_delivery || 0}</strong></div>
            <div>Feedback Surveys: <strong>{stats.breakdown?.feedback_request || 0}</strong></div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section>
        <div className="email-filter-bar">
          <form onSubmit={handleSearchSubmit} className="filter-inputs-group">
            <input
              type="text"
              placeholder="Search by recipient or subject..."
              className="filter-input"
              style={{ width: "260px" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="button button-ghost" style={{ padding: "0.5rem 1rem" }}>
              Search
            </button>
          </form>

          <div className="filter-inputs-group">
            <select
              className="filter-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent only</option>
              <option value="failed">Failed only</option>
              <option value="pending">Pending only</option>
            </select>

            <select
              className="filter-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="registration_confirmation">Registration Confirmation</option>
              <option value="ticket_delivery">Ticket Delivery</option>
              <option value="certificate_delivery">Certificate Delivery</option>
              <option value="feedback_request">Feedback Survey</option>
              <option value="organizer_alert">Organizer Alert</option>
            </select>
          </div>
        </div>

        {/* Email Logs Table */}
        <div className="email-table-container">
          <table className="email-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Dispatched At</th>
                <th>Details / Error</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const typeClass = log.emailType.includes("registration")
                  ? "type-registration"
                  : log.emailType.includes("ticket")
                  ? "type-ticket"
                  : log.emailType.includes("certificate")
                  ? "type-certificate"
                  : log.emailType.includes("feedback")
                  ? "type-feedback"
                  : log.emailType.includes("test")
                  ? "type-test"
                  : "type-alert";

                const isFailed = log.deliveryStatus === "failed";

                return (
                  <tr key={log._id}>
                    <td>
                      <strong>{log.recipientName || "Recipient"}</strong>
                      <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{log.recipient}</div>
                    </td>

                    <td>
                      <span className={`email-type-pill ${typeClass}`}>
                        {log.emailType.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.subject}
                    </td>

                    <td>
                      <span className={`status-pill status-${log.deliveryStatus}`}>
                        ● {log.deliveryStatus.toUpperCase()}
                      </span>
                    </td>

                    <td style={{ whiteSpace: "nowrap", color: "#64748b", fontSize: "0.8rem" }}>
                      {log.sentAt
                        ? new Date(log.sentAt).toLocaleString()
                        : log.createdAt
                        ? new Date(log.createdAt).toLocaleString()
                        : "—"}
                    </td>

                    <td style={{ maxWidth: "240px", fontSize: "0.8rem" }}>
                      {isFailed ? (
                        <span style={{ color: "#b91c1c" }} title={log.errorMessage}>
                          {log.errorMessage || "Delivery error"}
                        </span>
                      ) : (
                        <span style={{ color: "#059669" }}>Dispatched cleanly</span>
                      )}
                    </td>

                    <td>
                      {isFailed && (
                        <button
                          type="button"
                          className="retry-action-btn"
                          onClick={() => handleRetry(log._id)}
                          disabled={retryingId === log._id}
                        >
                          {retryingId === log._id ? "Retrying..." : "Retry"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "3rem 1.5rem", color: "#64748b" }}>
                    <p style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
                      No email delivery logs found matching the filter criteria.
                    </p>
                    <small>
                      Emails sent for registrations, digital tickets, and certificates will appear here automatically.
                    </small>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

