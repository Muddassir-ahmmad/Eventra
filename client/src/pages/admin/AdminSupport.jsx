import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Active Ticket Drawer State
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTickets(1);
  }, [statusFilter, priorityFilter]);

  // Close active ticket modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveTicket(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function fetchTickets(page = 1) {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        status: statusFilter,
        priority: priorityFilter,
        search,
      });

      const res = await api.get(`/admin/support?${params.toString()}`);
      setTickets(res.data.tickets || []);
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchTickets(1);
  }

  async function openTicketDetail(ticket) {
    try {
      const res = await api.get(`/admin/support/${ticket._id}`);
      setActiveTicket(res.data.ticket);
    } catch (err) {
      alert("Failed to load ticket details.");
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/admin/support/${activeTicket._id}/reply`, {
        message: replyMessage.trim(),
      });
      setActiveTicket({
        ...activeTicket,
        replies: res.data.replies,
        status: res.data.status,
      });
      setReplyMessage("");
      fetchTickets(pagination.page);
    } catch (err) {
      alert("Failed to send reply.");
    } finally {
      setActionLoading(false);
    }
  }

  async function updateTicketStatus(newStatus) {
    if (!activeTicket) return;
    try {
      setActionLoading(true);
      await api.put(`/admin/support/${activeTicket._id}/status`, {
        status: newStatus,
        internalNote: internalNote.trim() || undefined,
      });
      setActiveTicket({
        ...activeTicket,
        status: newStatus,
      });
      setInternalNote("");
      fetchTickets(pagination.page);
      alert(`Ticket status updated to ${newStatus}`);
    } catch (err) {
      alert("Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AdminLayout title="Organizer Support & Help Desk">
      {/* Search & Filter Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search tickets by ticket #, subject, text..."
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
            <option value="ALL">All Ticket Statuses</option>
            <option value="OPEN">Open (Needs Attention)</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_USER">Waiting for Organizer</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            className="admin-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent 🔴</option>
            <option value="HIGH">High 🟠</option>
            <option value="MEDIUM">Medium 🟡</option>
            <option value="LOW">Low 🟢</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ borderColor: "var(--admin-accent-rose)", marginBottom: 20 }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Tickets Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket Ref</th>
              <th>Organizer</th>
              <th>Category & Subject</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  Loading support tickets...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  No tickets found matching your criteria.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t._id}>
                  <td>
                    <div style={{ fontWeight: 800, color: "var(--admin-primary)" }}>{t.ticketNumber}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.organizer?.name || "N/A"}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>{t.organizer?.email}</div>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge-verified" style={{ fontSize: "0.68rem" }}>
                      {t.category}
                    </span>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{t.subject}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.76rem",
                        color:
                          t.priority === "URGENT"
                            ? "var(--admin-accent-rose)"
                            : t.priority === "HIGH"
                            ? "var(--admin-accent-gold)"
                            : "var(--admin-text-main)",
                      }}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        t.status === "OPEN"
                          ? "admin-badge-suspended"
                          : t.status === "RESOLVED" || t.status === "CLOSED"
                          ? "admin-badge-active"
                          : "admin-badge-warning"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => openTicketDetail(t)}
                      className="admin-btn admin-btn-primary"
                      style={{ padding: "4px 10px", fontSize: "0.76rem" }}
                    >
                      💬 Respond
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="admin-pagination">
          <div style={{ fontSize: "0.82rem", color: "var(--admin-text-sub)" }}>
            Showing {tickets.length} of {pagination.total} tickets
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchTickets(pagination.page - 1)}
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
              onClick={() => fetchTickets(pagination.page + 1)}
              className="admin-btn admin-btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Conversation Modal / Drawer */}
      {activeTicket && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setActiveTicket(null)}
        >
          <div
            className="admin-modal"
            style={{ maxWidth: 720, borderRadius: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with 'Back to Support Tickets' & 'Close (✕)' */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px 0",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="admin-modal-back-btn"
                title="Back to support tickets list"
              >
                <span>←</span>
                <span>Back to All Tickets</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="admin-modal-close-btn"
                aria-label="Close ticket dialog"
                title="Close modal (Esc)"
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-header" style={{ paddingTop: 14 }}>
              <div>
                <span className="admin-badge admin-badge-verified">{activeTicket.category}</span>
                <h3 style={{ margin: "6px 0 0", fontSize: "1.25rem", color: "#0F172A", fontWeight: 800 }}>
                  {activeTicket.ticketNumber}: {activeTicket.subject}
                </h3>
                <div style={{ fontSize: "0.82rem", color: "var(--admin-text-muted)", marginTop: 4 }}>
                  From: <strong style={{ color: "#0F172A" }}>{activeTicket.organizer?.name}</strong> ({activeTicket.organizer?.email})
                </div>
              </div>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {/* Conversation Messages */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                {(activeTicket.replies || []).map((msg, i) => {
                  const isAdmin = msg.senderRole === "SUPER_ADMIN";
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: isAdmin ? "#ECFDF5" : "#F8FAFC",
                        border: isAdmin ? "1px solid #A7F3D0" : "1px solid #E2E8F0",
                        marginLeft: isAdmin ? 40 : 0,
                        marginRight: isAdmin ? 0 : 40,
                        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: isAdmin ? "#059669" : "#0F172A" }}>
                          {isAdmin ? "🛡️ Super Admin Support" : `👤 ${msg.senderName || "Organizer"}`}
                        </span>
                        <span style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                        {msg.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Status Actions */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap", padding: "12px 14px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                <span style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 800, letterSpacing: "0.04em" }}>UPDATE STATUS:</span>
                <button
                  type="button"
                  onClick={() => updateTicketStatus("IN_PROGRESS")}
                  className="admin-btn admin-btn-secondary"
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => updateTicketStatus("WAITING_FOR_USER")}
                  className="admin-btn admin-btn-secondary"
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  Wait for Organizer
                </button>
                <button
                  type="button"
                  onClick={() => updateTicketStatus("RESOLVED")}
                  className="admin-btn admin-btn-success"
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  ✓ Mark Resolved
                </button>
                <button
                  type="button"
                  onClick={() => updateTicketStatus("CLOSED")}
                  className="admin-btn admin-btn-danger"
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  ✕ Close Ticket
                </button>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply}>
                <div className="admin-form-group" style={{ marginBottom: 14 }}>
                  <label className="admin-form-label" style={{ fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>
                    Send Official Reply
                  </label>
                  <textarea
                    className="admin-form-textarea"
                    rows="3"
                    required
                    placeholder="Type official response to the organizer..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    style={{
                      background: "#FFFFFF",
                      color: "#0F172A",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "0.88rem",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="admin-btn admin-btn-primary"
                    style={{ flex: 1, justifyContent: "center", padding: "10px 18px", fontSize: "0.9rem" }}
                  >
                    {actionLoading ? "Sending..." : "📤 Send Reply to Organizer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTicket(null)}
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "10px 18px", fontSize: "0.9rem" }}
                  >
                    Close Window
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

