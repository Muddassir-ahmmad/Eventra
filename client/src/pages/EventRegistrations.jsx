import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { setToken } from "../api";

function getCustomAnswerEntries(customAnswers) {
  if (!customAnswers || typeof customAnswers !== "object") return [];
  return Object.entries(customAnswers).filter(
    ([key, value]) => key && value !== undefined && value !== null && String(value).trim() !== ""
  );
}

function formatCsvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function matchesSearchQuery(reg, query) {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const customText = getCustomAnswerEntries(reg.customAnswers)
    .map(([k, v]) => `${k} ${v}`)
    .join(" ");

  return [
    reg.registrationId,
    reg.name,
    reg.email,
    reg.phone,
    reg.college,
    reg.department,
    reg.ticketType,
    customText,
  ].some((field) => String(field || "").toLowerCase().includes(normalized));
}

export default function EventRegistrations() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    loadRegistrations();
  }, [eventId]);

  async function loadRegistrations() {
    try {
      setError("");
      const response = await api.get(`/registrations/event/${eventId}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load registrations.");

      if (err.response?.status === 401) {
        setToken(null);
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(reg) {
    if (!reg) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the registration for "${reg.name}" (${reg.registrationId})?\n\nThis will remove the attendee, revoke their ticket pass, and release 1 seat back to event capacity.`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(reg._id);
      setNotice("");
      await api.delete(`/registrations/event/${eventId}/registrations/${reg._id}`);
      setNotice(`Removed registration for ${reg.name} (${reg.registrationId}).`);
      await loadRegistrations();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete registration.");
    } finally {
      setDeletingId("");
    }
  }

  function exportCsv() {
    const registrations = data?.registrations || [];
    if (registrations.length === 0) return;

    const headers = [
      "Registration ID",
      "Name",
      "Email",
      "Phone",
      "College / Organization",
      "Department / Role",
      "Ticket Tier",
      "Registration Status",
      "Checked In",
      "Registered At",
      "Custom Responses",
    ];

    const rows = registrations.map((reg) => {
      const customSummary = getCustomAnswerEntries(reg.customAnswers)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      return [
        formatCsvCell(reg.registrationId),
        formatCsvCell(reg.name),
        formatCsvCell(reg.email),
        formatCsvCell(reg.phone),
        formatCsvCell(reg.college),
        formatCsvCell(reg.department),
        formatCsvCell(reg.ticketType || "General"),
        formatCsvCell(reg.status),
        formatCsvCell(reg.checkedIn ? "Yes" : "No"),
        formatCsvCell(reg.createdAt ? new Date(reg.createdAt).toISOString() : ""),
        formatCsvCell(customSummary),
      ].join(",");
    });

    const csv = [headers.map(formatCsvCell).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eventra-registrations-${eventId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="center-page">
        <div className="spinner" />
        <p>Loading event registrations...</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="center-page">
        <h1>{error}</h1>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="button button-primary" to={`/dashboard/events/${eventId}`}>
            ← Back to Event Workspace
          </Link>
          <Link className="button button-ghost" to="/dashboard">
            Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const eventInfo = data?.event || {};
  const registrations = data?.registrations || [];
  const confirmedCount = data?.stats?.confirmedRegistrations ?? data?.count ?? 0;
  const attendedCount = data?.stats?.attendedParticipants ?? data?.attendedCount ?? 0;
  const cancelledCount = data?.stats?.cancelledRegistrations ?? 0;
  const capacity = Number(eventInfo.capacity || 0);
  const remainingSeats = Math.max(0, capacity - confirmedCount);
  const capacityFillPercent = capacity > 0 ? Math.min(100, Math.round((confirmedCount / capacity) * 100)) : 0;

  const filteredRegistrations = registrations.filter((reg) => {
    if (filterMode === "confirmed" && reg.status !== "confirmed") return false;
    if (filterMode === "checkedIn" && !reg.checkedIn) return false;
    if (filterMode === "pending" && (reg.checkedIn || reg.status === "cancelled")) return false;
    if (filterMode === "cancelled" && reg.status !== "cancelled") return false;
    return matchesSearchQuery(reg, searchTerm);
  });

  return (
    <main className="dashboard-page">
      <section className="dashboard-container">
        <div className="registrations-topbar">
          <div className="registrations-breadcrumbs">
            <Link className="back-link" to={`/dashboard/events/${eventId}`}>
              ← Event Workspace
            </Link>
            <span className="registrations-meta-dot">•</span>
            <Link className="back-link" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>

        <header className="registrations-header">
          <div>
            <p className="section-kicker">EVENT REGISTRATIONS</p>
            <h1>{eventInfo.title || "Registrations"}</h1>
            <div className="registrations-meta">
              {eventInfo.date && (
                <span>
                  {new Date(eventInfo.date).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {eventInfo.venue && (
                <>
                  <span className="registrations-meta-dot">·</span>
                  <span>{eventInfo.venue}</span>
                </>
              )}
              <span className="registrations-meta-dot">·</span>
              <span>
                {confirmedCount} / {capacity} confirmed
              </span>
            </div>
          </div>

          <div className="registrations-actions">
            <Link
              className="button button-primary small"
              to={`/dashboard/events/${eventId}/attendance`}
            >
              ✓ Attendance &amp; QR Gate
            </Link>
            <button
              type="button"
              className="button button-ghost small"
              onClick={exportCsv}
              disabled={registrations.length === 0}
            >
              ⬇ Export CSV
            </button>
            <button
              type="button"
              className="button button-ghost small"
              onClick={loadRegistrations}
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {notice && (
          <div className="reg-notice" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="stats-row" style={{ margin: "0 0 28px" }}>
          <div className="stat-card">
            <div className="stat-icon">◈</div>
            <div>
              <span>Confirmed Seats</span>
              <strong>{confirmedCount}</strong>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">◎</div>
            <div>
              <span>Remaining Seats</span>
              <strong>{remainingSeats}</strong>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div>
              <span>Checked In</span>
              <strong>{attendedCount}</strong>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">★</div>
            <div>
              <span>Capacity Filled</span>
              <strong>{capacityFillPercent}%</strong>
            </div>
          </div>
        </div>

        <section className="registration-table-card">
          {registrations.length === 0 ? (
            <div className="empty-card" style={{ border: "none", borderRadius: 0 }}>
              <div className="empty-icon">◎</div>
              <h2>No registrations yet</h2>
              <p>
                Share your public event landing page to start receiving participant registrations and digital passes.
              </p>
              <Link className="button button-primary small" to={`/dashboard/events/${eventId}`}>
                Back to Event Workspace
              </Link>
            </div>
          ) : (
            <>
              <div className="registrations-toolbar">
                <input
                  type="text"
                  className="registrations-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, ticket ID, phone, college..."
                />

                <div className="registrations-filters">
                  <button
                    type="button"
                    className={`reg-filter-pill ${filterMode === "all" ? "active" : ""}`}
                    onClick={() => setFilterMode("all")}
                  >
                    All ({registrations.length})
                  </button>
                  <button
                    type="button"
                    className={`reg-filter-pill ${filterMode === "confirmed" ? "active" : ""}`}
                    onClick={() => setFilterMode("confirmed")}
                  >
                    Confirmed ({confirmedCount})
                  </button>
                  <button
                    type="button"
                    className={`reg-filter-pill ${filterMode === "checkedIn" ? "active" : ""}`}
                    onClick={() => setFilterMode("checkedIn")}
                  >
                    Checked In ({attendedCount})
                  </button>
                  <button
                    type="button"
                    className={`reg-filter-pill ${filterMode === "pending" ? "active" : ""}`}
                    onClick={() => setFilterMode("pending")}
                  >
                    Pending Check-In ({Math.max(0, confirmedCount - attendedCount)})
                  </button>
                  {cancelledCount > 0 && (
                    <button
                      type="button"
                      className={`reg-filter-pill ${filterMode === "cancelled" ? "active" : ""}`}
                      onClick={() => setFilterMode("cancelled")}
                    >
                      Cancelled ({cancelledCount})
                    </button>
                  )}
                </div>
              </div>

              <div className="table-wrap">
                <table className="registration-table">
                  <thead>
                    <tr>
                      <th>Ticket &amp; Reg ID</th>
                      <th>Participant</th>
                      <th>Contact</th>
                      <th>Affiliation &amp; Details</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="reg-empty-filter">
                          No registrations match your current search or filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((reg) => {
                        const customEntries = getCustomAnswerEntries(reg.customAnswers);
                        const affiliationPrimary = reg.college || reg.department || "";
                        const affiliationSecondary = reg.college && reg.department ? reg.department : "";

                        return (
                          <tr key={reg._id}>
                            <td>
                              <span className="reg-code-badge">{reg.registrationId}</span>
                              <span className="reg-tier-label">{reg.ticketType || "General"}</span>
                            </td>

                            <td>
                              <span className="reg-primary-text">{reg.name}</span>
                              <span className="reg-sub-text">
                                {reg.createdAt
                                  ? `Registered ${new Date(reg.createdAt).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    })}`
                                  : "Verified attendee"}
                              </span>
                            </td>

                            <td>
                              <span>{reg.email}</span>
                              {reg.phone && <span className="reg-sub-text">{reg.phone}</span>}
                            </td>

                            <td>
                              <span>{affiliationPrimary || "—"}</span>
                              {affiliationSecondary && (
                                <span className="reg-sub-text">{affiliationSecondary}</span>
                              )}
                              {customEntries.length > 0 && (
                                <div className="reg-custom-list">
                                  {customEntries.slice(0, 3).map(([fieldKey, fieldValue]) => (
                                    <span key={fieldKey} className="reg-custom-chip">
                                      <strong>{fieldKey}:</strong> {fieldValue}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td>
                              <div className="reg-status-stack">
                                <span
                                  className={`reg-badge ${
                                    reg.status === "cancelled" ? "cancelled" : "confirmed"
                                  }`}
                                >
                                  {reg.status || "confirmed"}
                                </span>
                                <span
                                  className={`reg-badge ${reg.checkedIn ? "checked-in" : "pending"}`}
                                >
                                  {reg.checkedIn ? "✓ Checked In" : "● Not Checked In"}
                                </span>
                              </div>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <div className="reg-row-actions">
                                <Link
                                  className="button button-ghost small"
                                  to={`/tickets/${reg.registrationId}`}
                                  title={`View digital ticket pass for ${reg.name}`}
                                >
                                  Pass ↗
                                </Link>
                                <button
                                  type="button"
                                  className="reg-delete-btn"
                                  disabled={deletingId === reg._id}
                                  onClick={() => handleDelete(reg)}
                                  title={`Delete registration for ${reg.name}`}
                                >
                                  {deletingId === reg._id ? "Removing..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
