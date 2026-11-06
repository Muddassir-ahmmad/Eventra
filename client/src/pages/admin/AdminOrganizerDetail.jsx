import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminOrganizerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchDetail() {
    try {
      setLoading(true);
      const res = await api.get(`/admin/organizers/${id}`);
      setData(res.data);
      setNotes(res.data.organizer?.adminNotes || "");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load organizer details.");
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes(e) {
    e.preventDefault();
    try {
      setNotesSaving(true);
      await api.put(`/admin/organizers/${id}/notes`, { notes });
      alert("Admin notes saved.");
    } catch (err) {
      alert("Failed to save notes.");
    } finally {
      setNotesSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Organizer Dossier">
        <div style={{ textAlign: "center", padding: 60, color: "var(--admin-text-muted)" }}>
          Loading organizer 360 dossier...
        </div>
      </AdminLayout>
    );
  }

  if (error || !data?.organizer) {
    return (
      <AdminLayout title="Organizer Dossier">
        <div className="admin-card" style={{ borderColor: "var(--admin-accent-rose)" }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error || "Organizer not found."}</p>
          <Link to="/admin/organizers" className="admin-btn admin-btn-secondary" style={{ marginTop: 14 }}>
            ← Back to Organizers Directory
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { organizer, events = [], transactions = [], auditLogs = [] } = data;

  return (
    <AdminLayout title={`Organizer: ${organizer.name}`}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/admin/organizers" className="admin-btn admin-btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
          ← Back to Organizers Directory
        </Link>
      </div>

      {/* Top Profile Card */}
      <div className="admin-card" style={{ marginBottom: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div className="admin-user-avatar" style={{ width: 64, height: 64, fontSize: "1.6rem" }}>
          {organizer.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>{organizer.name}</h2>
            {organizer.verificationStatus === "VERIFIED" && (
              <span className="admin-badge admin-badge-verified">Verified 💎</span>
            )}
            <span
              className={`admin-badge ${
                organizer.status === "ACTIVE"
                  ? "admin-badge-active"
                  : organizer.status === "SUSPENDED"
                  ? "admin-badge-suspended"
                  : "admin-badge-deactivated"
              }`}
            >
              {organizer.status}
            </span>
          </div>

          <div style={{ color: "var(--admin-text-muted)", fontSize: "0.88rem", marginTop: 6 }}>
            <span>📧 {organizer.email}</span>
            {organizer.phone && <span style={{ marginLeft: 16 }}>📞 {organizer.phone}</span>}
            <span style={{ marginLeft: 16 }}>🏢 {organizer.organization || "Independent Organizer"}</span>
          </div>
          <div style={{ color: "var(--admin-text-sub)", fontSize: "0.78rem", marginTop: 4 }}>
            Member since: {new Date(organizer.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Current Subscription Card */}
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--admin-border)",
            minWidth: 220,
          }}
        >
          <div style={{ fontSize: "0.74rem", textTransform: "uppercase", color: "var(--admin-text-sub)", fontWeight: 700 }}>
            CURRENT SUBSCRIPTION
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--admin-primary)", marginTop: 4 }}>
            {organizer.currentSubscription?.plan?.name || "Free Tier"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", marginTop: 2 }}>
            Status: {organizer.currentSubscription?.status || "ACTIVE"}
          </div>
          {organizer.currentSubscription?.expiryDate && (
            <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)", marginTop: 2 }}>
              Expires: {new Date(organizer.currentSubscription.expiryDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Events Hosted Table */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-title">Events Hosted ({events.length})</div>
        <div className="admin-card-subtitle">Real registration and attendance figures across this organizer's portfolio</div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event Title</th>
                <th>Date & Venue</th>
                <th>Status</th>
                <th>Registrations</th>
                <th>Checked In</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 24, color: "var(--admin-text-sub)" }}>
                    No events hosted by this organizer yet.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{e.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--admin-text-sub)" }}>/{e.slug}</div>
                    </td>
                    <td>
                      <div>{new Date(e.date).toLocaleDateString()}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--admin-text-sub)" }}>{e.venue}</div>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-active">{e.status}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{e.registrationStats?.total || 0}</td>
                    <td style={{ fontWeight: 700, color: "var(--admin-accent-emerald)" }}>
                      {e.registrationStats?.checkedIn || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Admin Notes */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-title">Internal Admin Notes</div>
        <div className="admin-card-subtitle">Private compliance and operational notes visible only to Super Admins</div>
        <form onSubmit={saveNotes}>
          <textarea
            className="admin-form-textarea"
            rows="3"
            placeholder="Add internal compliance notes, verified college credentials, or exception records..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            type="submit"
            disabled={notesSaving}
            className="admin-btn admin-btn-primary"
            style={{ marginTop: 10, fontSize: "0.82rem" }}
          >
            {notesSaving ? "Saving..." : "Save Internal Notes"}
          </button>
        </form>
      </div>

      {/* Billing & Audit History */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="admin-card">
          <div className="admin-card-title">Payment Transactions ({transactions.length})</div>
          <div className="admin-table-container" style={{ marginTop: 12 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Txn ID</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: 20, color: "var(--admin-text-sub)" }}>
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t._id}>
                      <td style={{ fontSize: "0.78rem" }}>{t.transactionId}</td>
                      <td>{t.planName}</td>
                      <td style={{ fontWeight: 700 }}>₹{t.amount}</td>
                      <td>
                        <span className={`admin-badge ${t.status === "SUCCESS" ? "admin-badge-active" : "admin-badge-warning"}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-title">Audit History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {auditLogs.length === 0 ? (
              <p style={{ color: "var(--admin-text-sub)", fontSize: "0.84rem", padding: 10 }}>No audit logs for this user.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log._id}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--admin-primary)" }}>{log.action}</div>
                  <div style={{ color: "var(--admin-text-sub)", fontSize: "0.74rem" }}>
                    {log.reason || "Administrative action"} • {new Date(log.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

