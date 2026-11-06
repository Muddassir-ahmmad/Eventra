import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminOrganizers() {
  const [organizers, setOrganizers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [verificationFilter, setVerificationFilter] = useState("ALL");

  // Suspend Modal State
  const [suspendModal, setSuspendModal] = useState({
    open: false,
    organizer: null,
    reason: "Terms of service violation",
    notes: "",
    durationDays: "indefinite",
  });

  useEffect(() => {
    fetchOrganizers(1);
  }, [statusFilter, verificationFilter]);

  async function fetchOrganizers(page = 1) {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        status: statusFilter,
        verificationStatus: verificationFilter,
        search,
      });

      const res = await api.get(`/admin/organizers?${params.toString()}`);
      setOrganizers(res.data.organizers || []);
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load organizers.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchOrganizers(1);
  }

  // Open Suspend Modal
  function openSuspendModal(org) {
    setSuspendModal({
      open: true,
      organizer: org,
      reason: "Terms of service violation",
      notes: "",
      durationDays: "indefinite",
    });
  }

  // Submit Suspension
  async function submitSuspension() {
    if (!suspendModal.organizer) return;
    try {
      let suspendedUntil = null;
      if (suspendModal.durationDays !== "indefinite") {
        const days = parseInt(suspendModal.durationDays, 10);
        suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      await api.post(`/admin/organizers/${suspendModal.organizer._id}/suspend`, {
        reason: suspendModal.reason,
        notes: suspendModal.notes,
        suspendedUntil,
      });

      setSuspendModal({ open: false, organizer: null, reason: "", notes: "", durationDays: "" });
      fetchOrganizers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to suspend organizer.");
    }
  }

  // Reactivate
  async function reactivateOrganizer(org) {
    if (!window.confirm(`Are you sure you want to reactivate ${org.name}'s account?`)) return;
    try {
      await api.post(`/admin/organizers/${org._id}/reactivate`, {
        reason: "Administrative clearance and review complete.",
      });
      fetchOrganizers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reactivate organizer.");
    }
  }

  // Toggle Verification
  async function toggleVerification(org) {
    try {
      await api.post(`/admin/organizers/${org._id}/verify`);
      fetchOrganizers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle verification.");
    }
  }

  return (
    <AdminLayout title="Organizer Management">
      {/* Search & Filter Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name, email, college, phone..."
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
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="SUSPENDED">Suspended Accounts</option>
            <option value="DEACTIVATED">Deactivated Accounts</option>
          </select>

          <select
            className="admin-select"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
          >
            <option value="ALL">All Verification</option>
            <option value="VERIFIED">Verified Organizers</option>
            <option value="UNVERIFIED">Unverified Organizers</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ borderColor: "var(--admin-accent-rose)", marginBottom: 20 }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Organizers Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Organizer</th>
              <th>Organization</th>
              <th>Events (Pub / Comp)</th>
              <th>Registrations</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  Loading organizers directory...
                </td>
              </tr>
            ) : organizers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                  No organizers matched your query.
                </td>
              </tr>
            ) : (
              organizers.map((org) => {
                const isSuspended = org.status === "SUSPENDED";
                const isSuperAdmin = org.role === "SUPER_ADMIN";

                return (
                  <tr key={org._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="admin-user-avatar" style={{ width: 34, height: 34, fontSize: "0.8rem" }}>
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                            <Link to={`/admin/organizers/${org._id}`} style={{ color: "inherit", textDecoration: "none" }}>
                              {org.name}
                            </Link>
                            {org.verificationStatus === "VERIFIED" && (
                              <span title="Verified Organizer" style={{ cursor: "pointer" }}>
                                💎
                              </span>
                            )}
                            {isSuperAdmin && (
                              <span className="admin-brand-badge" style={{ fontSize: "0.6rem" }}>
                                Admin
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--admin-text-sub)" }}>{org.email}</div>
                          {org.phone && (
                            <div style={{ fontSize: "0.72rem", color: "var(--admin-text-sub)" }}>📞 {org.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{org.organization || "Independent"}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{org.stats?.totalEvents || 0} Events</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>
                        {org.stats?.publishedEvents || 0} Pub • {org.stats?.completedEvents || 0} Comp
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{org.stats?.totalRegistrations || 0} Attendees</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--admin-accent-emerald)" }}>
                        {org.stats?.checkedInCount || 0} Checked In
                      </div>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-verified">
                        {org.currentSubscription?.plan?.name || "Free"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          org.status === "ACTIVE"
                            ? "admin-badge-active"
                            : org.status === "SUSPENDED"
                            ? "admin-badge-suspended"
                            : "admin-badge-deactivated"
                        }`}
                      >
                        {org.status}
                      </span>
                      {isSuspended && org.suspension?.reason && (
                        <div style={{ fontSize: "0.7rem", color: "var(--admin-accent-rose)", marginTop: 4 }}>
                          {org.suspension.reason}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link
                          to={`/admin/organizers/${org._id}`}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          title="View 360 Profile Dossier"
                        >
                          👁️ View
                        </Link>

                        {!isSuperAdmin && (
                          <>
                            {isSuspended ? (
                              <button
                                onClick={() => reactivateOrganizer(org)}
                                className="admin-btn admin-btn-success"
                                style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                              >
                                ✓ Unsuspend
                              </button>
                            ) : (
                              <button
                                onClick={() => openSuspendModal(org)}
                                className="admin-btn admin-btn-danger"
                                style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                              >
                                ⛔ Suspend
                              </button>
                            )}

                            <button
                              onClick={() => toggleVerification(org)}
                              className="admin-btn admin-btn-secondary"
                              style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                              title="Toggle Verification Badge"
                            >
                              {org.verificationStatus === "VERIFIED" ? "Revoke 💎" : "Verify 💎"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="admin-pagination">
          <div style={{ fontSize: "0.82rem", color: "var(--admin-text-sub)" }}>
            Showing {organizers.length} of {pagination.total} organizers
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchOrganizers(pagination.page - 1)}
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
              onClick={() => fetchOrganizers(pagination.page + 1)}
              className="admin-btn admin-btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Suspend Confirmation Modal */}
      {suspendModal.open && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                ⛔ Suspend Organizer: {suspendModal.organizer?.name}
              </h3>
              <button
                onClick={() => setSuspendModal({ open: false, organizer: null, reason: "", notes: "", durationDays: "" })}
                style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ color: "var(--admin-text-muted)", fontSize: "0.86rem", marginBottom: 16 }}>
                Suspending will immediately block the organizer from logging in and accessing management endpoints.
                Historical registrations, passes, and events will remain preserved.
              </p>

              <div className="admin-form-group">
                <label className="admin-form-label">Suspension Reason (Required)</label>
                <select
                  className="admin-select"
                  style={{ width: "100%" }}
                  value={suspendModal.reason}
                  onChange={(e) => setSuspendModal({ ...suspendModal, reason: e.target.value })}
                >
                  <option value="Non-payment">Non-payment / Unpaid Subscription</option>
                  <option value="Fraudulent activity">Fraudulent activity / Fake Tickets</option>
                  <option value="Fake events">Fake or Impersonation Events</option>
                  <option value="Terms of service violation">Terms of service violation</option>
                  <option value="Abusive behavior">Abusive behavior</option>
                  <option value="Suspicious activity">Suspicious activity</option>
                  <option value="Admin investigation">Admin investigation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Suspension Duration</label>
                <select
                  className="admin-select"
                  style={{ width: "100%" }}
                  value={suspendModal.durationDays}
                  onChange={(e) => setSuspendModal({ ...suspendModal, durationDays: e.target.value })}
                >
                  <option value="indefinite">Indefinite (Until manually un-suspended)</option>
                  <option value="7">7 Days (Temporary Warning)</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Internal Admin Notes (Optional)</label>
                <textarea
                  className="admin-form-textarea"
                  rows="3"
                  placeholder="Private internal notes regarding the violation or incident report..."
                  value={suspendModal.notes}
                  onChange={(e) => setSuspendModal({ ...suspendModal, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setSuspendModal({ open: false, organizer: null, reason: "", notes: "", durationDays: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={submitSuspension}
              >
                Confirm Account Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

