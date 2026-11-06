import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  async function fetchLogs(page = 1) {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 25,
        action: actionFilter,
        search,
      });

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchLogs(1);
  }

  return (
    <AdminLayout title="Security & Compliance Audit Trail">
      {/* Search & Filter Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by actor name, target, reason..."
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
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="ALL">All Recorded Actions</option>
            <option value="ORGANIZER_SUSPENDED">Organizer Suspended</option>
            <option value="ORGANIZER_REACTIVATED">Organizer Reactivated</option>
            <option value="ORGANIZER_VERIFIED">Organizer Verified</option>
            <option value="EVENT_APPROVE">Event Approved</option>
            <option value="EVENT_REJECT">Event Rejected</option>
            <option value="EVENT_FLAG">Event Flagged</option>
            <option value="PLAN_CREATED">Plan Created</option>
            <option value="PLAN_UPDATED">Plan Updated</option>
            <option value="SUBSCRIPTION_ASSIGNED">Subscription Assigned</option>
            <option value="TRANSACTION_REFUNDED">Transaction Refunded</option>
            <option value="SETTINGS_UPDATED">Settings Updated</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ borderColor: "var(--admin-accent-rose)", marginBottom: 20 }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target Entity</th>
              <th>Reason / Detail</th>
              <th>Inspector</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  Loading immutable audit records...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  No audit logs recorded matching your filter.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log._id;

                return (
                  <React.Fragment key={log._id}>
                    <tr>
                      <td style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                        <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div style={{ color: "var(--admin-text-sub)" }}>
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            log.action.includes("SUSPENDED") || log.action.includes("REJECT")
                              ? "admin-badge-suspended"
                              : log.action.includes("REACTIVATED") || log.action.includes("APPROVE")
                              ? "admin-badge-active"
                              : "admin-badge-verified"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.actorName || "Admin"}</div>
                        <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>{log.actorRole}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.targetEntity}</div>
                        {log.targetName && (
                          <div style={{ fontSize: "0.75rem", color: "var(--admin-text-sub)" }}>{log.targetName}</div>
                        )}
                      </td>
                      <td style={{ fontSize: "0.85rem", maxWidth: 280 }}>
                        {log.reason || "Administrative procedure executed"}
                      </td>
                      <td>
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                          >
                            {isExpanded ? "Hide JSON" : "Inspect 🔍"}
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: "var(--admin-text-sub)" }}>None</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="6" style={{ background: "rgba(0, 0, 0, 0.4)", padding: 14 }}>
                          <pre
                            style={{
                              margin: 0,
                              fontSize: "0.76rem",
                              color: "var(--admin-accent-cyan)",
                              overflowX: "auto",
                              fontFamily: "monospace",
                            }}
                          >
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="admin-pagination">
          <div style={{ fontSize: "0.82rem", color: "var(--admin-text-sub)" }}>
            Showing {logs.length} of {pagination.total} audit logs
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
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
              onClick={() => fetchLogs(pagination.page + 1)}
              className="admin-btn admin-btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

