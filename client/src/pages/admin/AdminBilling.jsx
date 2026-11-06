import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminBilling() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Refund Modal State
  const [refundModal, setRefundModal] = useState({
    open: false,
    txn: null,
    reason: "Requested by organizer",
  });

  useEffect(() => {
    fetchBillingData(1);
  }, [statusFilter]);

  async function fetchBillingData(page = 1) {
    try {
      setLoading(true);
      const [sRes, tRes] = await Promise.all([
        api.get("/admin/billing/stats"),
        api.get(`/admin/billing/transactions?page=${page}&limit=15&status=${statusFilter}&search=${encodeURIComponent(search)}`),
      ]);
      setStats(sRes.data.stats || {});
      setTransactions(tRes.data.transactions || []);
      setPagination(tRes.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load billing records.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchBillingData(1);
  }

  function exportTransactionsCsv() {
    window.open(`${api.defaults.baseURL}/admin/billing/transactions?exportCsv=true&status=${statusFilter}&search=${encodeURIComponent(search)}`, "_blank");
  }

  function openRefund(txn) {
    setRefundModal({
      open: true,
      txn,
      reason: "Requested by organizer",
    });
  }

  async function submitRefund() {
    if (!refundModal.txn) return;
    try {
      await api.post(`/admin/billing/transactions/${refundModal.txn._id}/refund`, {
        reason: refundModal.reason,
      });
      alert("Refund processed successfully.");
      setRefundModal({ open: false, txn: null, reason: "" });
      fetchBillingData(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to process refund.");
    }
  }

  return (
    <AdminLayout title="Billing & Financial Ledger">
      {/* Revenue KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Gross Revenue</span>
            <span className="admin-kpi-icon">💰</span>
          </div>
          <div className="admin-kpi-value" style={{ color: "var(--admin-accent-emerald)" }}>
            ₹{(stats?.grossRevenue || 0).toLocaleString()}
          </div>
          <div className="admin-kpi-sub">Lifetime collected via payment gateways</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Net Platform Revenue</span>
            <span className="admin-kpi-icon">💎</span>
          </div>
          <div className="admin-kpi-value" style={{ color: "var(--admin-primary)" }}>
            ₹{(stats?.netRevenue || 0).toLocaleString()}
          </div>
          <div className="admin-kpi-sub">Total minus recorded refunds</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Revenue This Month</span>
            <span className="admin-kpi-icon">📅</span>
          </div>
          <div className="admin-kpi-value">₹{(stats?.revenueThisMonth || 0).toLocaleString()}</div>
          <div className="admin-kpi-sub">Year-to-date: ₹{(stats?.revenueThisYear || 0).toLocaleString()}</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Total Refunds</span>
            <span className="admin-kpi-icon">↩️</span>
          </div>
          <div className="admin-kpi-value" style={{ color: "var(--admin-accent-rose)" }}>
            ₹{(stats?.refundAmount || 0).toLocaleString()}
          </div>
          <div className="admin-kpi-sub">Pending: ₹{(stats?.pendingAmount || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by transaction ID, invoice, gateway ID..."
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
            <option value="ALL">All Payment Statuses</option>
            <option value="SUCCESS">Success / Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <button onClick={exportTransactionsCsv} className="admin-btn admin-btn-secondary">
            📥 Export CSV Ledger
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ borderColor: "var(--admin-accent-rose)", marginBottom: 20 }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Transactions Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Txn Reference</th>
              <th>Organizer</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Gateway</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  Loading financial records...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  No transactions recorded matching your filter.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{t.transactionId}</div>
                    {t.invoiceNumber && (
                      <div style={{ fontSize: "0.74rem", color: "var(--admin-primary)" }}>
                        Inv: {t.invoiceNumber}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.organizer?.name || "N/A"}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>{t.organizer?.email}</div>
                  </td>
                  <td>{t.planName || "Subscription"}</td>
                  <td style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                    ₹{t.amount.toLocaleString()} <span style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>{t.currency}</span>
                  </td>
                  <td>
                    <div>{t.gateway}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>{t.paymentMethod}</div>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        t.status === "SUCCESS"
                          ? "admin-badge-active"
                          : t.status === "REFUNDED"
                          ? "admin-badge-suspended"
                          : "admin-badge-warning"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {t.status === "SUCCESS" && (
                        <button
                          onClick={() => openRefund(t)}
                          className="admin-btn admin-btn-danger"
                          style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          title="Process Refund"
                        >
                          ↩ Refund
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
            Showing {transactions.length} of {pagination.total} records
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchBillingData(pagination.page - 1)}
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
              onClick={() => fetchBillingData(pagination.page + 1)}
              className="admin-btn admin-btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {refundModal.open && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                ↩️ Process Refund: ₹{refundModal.txn?.amount}
              </h3>
              <button
                onClick={() => setRefundModal({ open: false, txn: null, reason: "" })}
                style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ color: "var(--admin-text-muted)", fontSize: "0.86rem", marginBottom: 14 }}>
                This will mark transaction <strong>{refundModal.txn?.transactionId}</strong> as REFUNDED,
                update net platform metrics, and create an immutable refund audit record.
              </p>

              <div className="admin-form-group">
                <label className="admin-form-label">Refund Reason (Mandatory)</label>
                <input
                  type="text"
                  required
                  className="admin-form-input"
                  value={refundModal.reason}
                  onChange={(e) => setRefundModal({ ...refundModal, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setRefundModal({ open: false, txn: null, reason: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={submitRefund}
              >
                Confirm Full Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

