import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInvoices(1);
  }, []);

  async function fetchInvoices(page = 1) {
    try {
      setLoading(true);
      const res = await api.get(`/admin/billing/invoices?page=${page}&limit=15`);
      setInvoices(res.data.invoices || []);
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadInvoicePdf(invoice) {
    try {
      setDownloadingId(invoice._id);
      const response = await api.get(`/admin/billing/invoices/${invoice._id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `EVENTRA-Invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download invoice PDF.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AdminLayout title="Invoice Management">
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Invoices & Tax Documents ({invoices.length})</h3>
        <p style={{ color: "var(--admin-text-sub)", fontSize: "0.82rem", margin: "4px 0 0" }}>
          Official vector PDF invoices generated for all successful subscription and event transactions.
        </p>
      </div>

      {error && (
        <div className="admin-card" style={{ borderColor: "var(--admin-accent-rose)", marginBottom: 20 }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Invoices Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Billed To</th>
              <th>Plan / Service</th>
              <th>Total Amount</th>
              <th>Issued Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  No invoices issued yet.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id}>
                  <td>
                    <div style={{ fontWeight: 800, color: "var(--admin-primary)" }}>{inv.invoiceNumber}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.organizerBilling?.name || inv.organizer?.name || "N/A"}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>
                      {inv.organizerBilling?.email || inv.organizer?.email}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.planName}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)", textTransform: "capitalize" }}>
                      {inv.billingCycle} Cycle
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>₹{inv.total?.toLocaleString()}</span>
                  </td>
                  <td>{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`admin-badge ${
                        inv.status === "PAID"
                          ? "admin-badge-active"
                          : inv.status === "REFUNDED"
                          ? "admin-badge-suspended"
                          : "admin-badge-warning"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => downloadInvoicePdf(inv)}
                      disabled={downloadingId === inv._id}
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                    >
                      {downloadingId === inv._id ? "Rendering PDF..." : "📥 Download PDF"}
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
            Showing {invoices.length} of {pagination.total} invoices
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchInvoices(pagination.page - 1)}
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
              onClick={() => fetchInvoices(pagination.page + 1)}
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

