import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [moderationFilter, setModerationFilter] = useState("ALL");

  // Moderate Modal State
  const [modal, setModal] = useState({
    open: false,
    event: null,
    action: "REJECT",
    reason: "",
  });

  useEffect(() => {
    fetchEvents(1);
  }, [statusFilter, moderationFilter]);

  async function fetchEvents(page = 1) {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        status: statusFilter,
        moderationStatus: moderationFilter,
        search,
      });

      const res = await api.get(`/admin/events?${params.toString()}`);
      setEvents(res.data.events || []);
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchEvents(1);
  }

  async function handleApprove(event) {
    try {
      await api.post(`/admin/events/${event._id}/moderate`, {
        action: "APPROVE",
        reason: "Administrative verification approved",
      });
      fetchEvents(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve event.");
    }
  }

  async function handleUnpublish(event) {
    if (!window.confirm(`Unpublish event "${event.title}"? It will be converted back to draft status.`)) return;
    try {
      await api.post(`/admin/events/${event._id}/moderate`, {
        action: "UNPUBLISH",
        reason: "Administrative unpublish to draft",
      });
      fetchEvents(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unpublish event.");
    }
  }

  function openModerateModal(event, action) {
    setModal({
      open: true,
      event,
      action,
      reason: "",
    });
  }

  async function submitModeration() {
    if (!modal.event) return;
    if ((modal.action === "REJECT" || modal.action === "FLAG") && !modal.reason.trim()) {
      alert("A reason is mandatory.");
      return;
    }

    try {
      await api.post(`/admin/events/${modal.event._id}/moderate`, {
        action: modal.action,
        reason: modal.reason.trim(),
      });
      setModal({ open: false, event: null, action: "", reason: "" });
      fetchEvents(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit moderation.");
    }
  }

  return (
    <AdminLayout title="Platform Event Moderation">
      {/* Search & Filter Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search events by title, slug, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="admin-btn admin-btn-primary">
            🔍 Search
          </button>
        </form>

        <div className="admin-filter-group">
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Event Lifecycle Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>

          <select
            className="admin-select"
            value={moderationFilter}
            onChange={(e) => setModerationFilter(e.target.value)}
          >
            <option value="ALL">All Moderation States</option>
            <option value="APPROVED">Approved Events</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="FLAGGED">Flagged / Suspicious</option>
            <option value="REJECTED">Rejected Events</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ borderColor: "var(--admin-accent-rose)", marginBottom: 20 }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Events Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Organizer</th>
              <th>Category & Date</th>
              <th>Registrations</th>
              <th>Lifecycle</th>
              <th>Moderation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  Loading events directory...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  No events found.
                </td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      <a href={`/events/${evt.slug}`} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                        {evt.title} ↗
                      </a>
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--admin-text-sub)" }}>
                      Venue: {evt.venue || "N/A"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{evt.organizer?.name || "N/A"}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>{evt.organizer?.email}</div>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge-verified">{evt.category || "General"}</span>
                    <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)", marginTop: 4 }}>
                      {new Date(evt.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{evt.registrationsCount || 0} Registered</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--admin-accent-emerald)" }}>
                      {evt.checkedInCount || 0} Checked In ({evt.attendanceRate || 0}%)
                    </div>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge-active">{evt.status}</span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        evt.moderationStatus === "APPROVED"
                          ? "admin-badge-active"
                          : evt.moderationStatus === "FLAGGED"
                          ? "admin-badge-warning"
                          : "admin-badge-suspended"
                      }`}
                    >
                      {evt.moderationStatus || "APPROVED"}
                    </span>
                    {evt.moderationReason && (
                      <div style={{ fontSize: "0.7rem", color: "var(--admin-text-sub)", marginTop: 4 }}>
                        {evt.moderationReason}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {evt.moderationStatus !== "APPROVED" && (
                        <button
                          onClick={() => handleApprove(evt)}
                          className="admin-btn admin-btn-success"
                          style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          title="Approve Event"
                        >
                          ✓ Approve
                        </button>
                      )}

                      {evt.status === "published" && (
                        <button
                          onClick={() => handleUnpublish(evt)}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          title="Unpublish to Draft"
                        >
                          ↩ Unpublish
                        </button>
                      )}

                      {evt.moderationStatus !== "FLAGGED" && (
                        <button
                          onClick={() => openModerateModal(evt, "FLAG")}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "0.74rem", color: "var(--admin-accent-gold)" }}
                          title="Flag Suspicious"
                        >
                          🚩 Flag
                        </button>
                      )}

                      {evt.moderationStatus !== "REJECTED" && (
                        <button
                          onClick={() => openModerateModal(evt, "REJECT")}
                          className="admin-btn admin-btn-danger"
                          style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          title="Reject Event"
                        >
                          ✕ Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="admin-pagination">
          <div style={{ fontSize: "0.82rem", color: "var(--admin-text-sub)" }}>
            Showing {events.length} of {pagination.total} events
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchEvents(pagination.page - 1)}
              className="admin-btn admin-btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              ← Previous
            </button>
            <span style={{ display: "flex", alignItems: "center", padding: "0 10px", fontSize: "0.85rem" }}>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchEvents(pagination.page + 1)}
              className="admin-btn admin-btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Moderate Reason Modal */}
      {modal.open && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                {modal.action === "REJECT" ? "✕ Reject Event" : "🚩 Flag Suspicious Event"}: {modal.event?.title}
              </h3>
              <button
                onClick={() => setModal({ open: false, event: null, action: "", reason: "" })}
                style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Reason for {modal.action === "REJECT" ? "Rejection" : "Flagging"} (Required)
                </label>
                <textarea
                  className="admin-form-textarea"
                  rows="3"
                  placeholder="Detail why this event is being moderated (e.g. copyright infringement, fake college event, fee extortion)..."
                  value={modal.reason}
                  onChange={(e) => setModal({ ...modal, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setModal({ open: false, event: null, action: "", reason: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={submitModeration}
              >
                Confirm {modal.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

