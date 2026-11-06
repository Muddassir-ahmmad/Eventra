import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "ANNOUNCEMENT",
    targetAudience: "ALL_ORGANIZERS",
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await api.get("/admin/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    try {
      setSending(true);
      await api.post("/admin/notifications", form);
      alert("Notification broadcasted successfully!");
      setForm({
        title: "",
        message: "",
        type: "ANNOUNCEMENT",
        targetAudience: "ALL_ORGANIZERS",
      });
      fetchNotifications();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to broadcast notification.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminLayout title="Platform Announcements & Broadcasts">
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
        {/* Composer */}
        <div className="admin-card">
          <div className="admin-card-title">Compose Platform Broadcast</div>
          <div className="admin-card-subtitle">
            Dispatches system announcements directly to organizer dashboards and banner notices
          </div>

          <form onSubmit={handleSend}>
            <div className="admin-form-group">
              <label className="admin-form-label">Broadcast Title</label>
              <input
                type="text"
                required
                className="admin-form-input"
                placeholder="e.g. Scheduled System Maintenance / New AI Features Released"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="admin-form-group">
                <label className="admin-form-label">Notice Type</label>
                <select
                  className="admin-select"
                  style={{ width: "100%" }}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="ANNOUNCEMENT">General Announcement</option>
                  <option value="MAINTENANCE">Maintenance Notice</option>
                  <option value="POLICY_UPDATE">Terms & Policy Update</option>
                  <option value="BILLING_REMINDER">Subscription Billing Reminder</option>
                  <option value="SECURITY_ALERT">Security Alert</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Target Audience</label>
                <select
                  className="admin-select"
                  style={{ width: "100%" }}
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                >
                  <option value="ALL_ORGANIZERS">All Organizers</option>
                  <option value="SUSPENDED_ACCOUNTS">Suspended Accounts Only</option>
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Notification Message</label>
              <textarea
                className="admin-form-textarea"
                rows="4"
                required
                placeholder="Detailed message text displayed across organizer dashboards..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="admin-btn admin-btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {sending ? "Broadcasting..." : "📢 Dispatch Platform Announcement"}
            </button>
          </form>
        </div>

        {/* Sent History */}
        <div className="admin-card">
          <div className="admin-card-title">Dispatched Broadcasts ({notifications.length})</div>
          <div className="admin-card-subtitle">Historical audit of sent notifications</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {loading ? (
              <p style={{ color: "var(--admin-text-sub)", fontSize: "0.85rem" }}>Loading history...</p>
            ) : notifications.length === 0 ? (
              <p style={{ color: "var(--admin-text-sub)", fontSize: "0.85rem" }}>No announcements sent yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--admin-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="admin-badge admin-badge-verified" style={{ fontSize: "0.68rem" }}>
                      {n.type}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--admin-text-sub)" }}>
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 4 }}>{n.title}</div>
                  <p style={{ fontSize: "0.82rem", color: "var(--admin-text-muted)", margin: "0 0 8px", lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <div style={{ fontSize: "0.72rem", color: "var(--admin-text-sub)" }}>
                    Audience: <strong>{n.targetAudience}</strong> • Delivered to {n.recipients?.length || 0} organizers
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

