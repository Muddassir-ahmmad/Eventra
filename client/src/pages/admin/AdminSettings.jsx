import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    platformName: "EVENTRA",
    supportEmail: "support@eventra.com",
    contactPhone: "+91 9876543210",
    eventModerationPolicy: "AUTO_APPROVE",
    defaultPlanSlug: "free",
    subscriptionGracePeriodDays: 7,
    maintenanceMode: false,
    maintenanceMessage:
      "EVENTRA is currently undergoing scheduled platform maintenance. We will be back online shortly.",
    paymentGateway: {
      provider: "Razorpay",
      isSandbox: true,
      keyId: "rzp_test_placeholder_key",
      webhookConfigured: true,
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/settings");
      if (data.settings) {
        setForm((prev) => ({
          ...prev,
          ...data.settings,
          paymentGateway: {
            ...prev.paymentGateway,
            ...(data.settings.paymentGateway || {}),
          },
        }));
      }
    } catch (err) {
      setErrorMsg("Failed to load platform settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const { data } = await api.put("/admin/settings", form);
      setSuccessMsg("Platform settings and policies updated successfully!");
      if (data.settings) {
        setForm((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update platform settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Platform Settings & Policies">
      <div style={{ maxWidth: 900 }}>
        {/* Header summary */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
            Platform Configuration &amp; Governance
          </h2>
          <p style={{ color: "var(--admin-text-muted)", fontSize: "0.88rem", marginTop: 4 }}>
            Control global operational parameters, moderation rules, billing policies, and maintenance state.
          </p>
        </div>

        {successMsg && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34D399",
              padding: "12px 18px",
              borderRadius: 8,
              fontSize: "0.88rem",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>✅</span> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#F87171",
              padding: "12px 18px",
              borderRadius: 8,
              fontSize: "0.88rem",
              marginBottom: 20,
            }}
          >
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--admin-text-muted)" }}>
            Loading platform parameters...
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* 1. General Platform Identity */}
            <div className="admin-card" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: "1.3rem" }}>🏢</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                  General Platform Identity
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--admin-text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    PLATFORM BRAND NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={form.platformName}
                    onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(9, 13, 22, 0.6)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: 8,
                      color: "#FFF",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--admin-text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    OFFICIAL SUPPORT EMAIL
                  </label>
                  <input
                    type="email"
                    required
                    value={form.supportEmail}
                    onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(9, 13, 22, 0.6)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: 8,
                      color: "#FFF",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--admin-text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    SUPPORT CONTACT PHONE
                  </label>
                  <input
                    type="text"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(9, 13, 22, 0.6)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: 8,
                      color: "#FFF",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--admin-text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    DEFAULT ORGANIZER PLAN
                  </label>
                  <select
                    value={form.defaultPlanSlug}
                    onChange={(e) => setForm({ ...form, defaultPlanSlug: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(9, 13, 22, 0.6)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: 8,
                      color: "#FFF",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="free">Free Starter Plan</option>
                    <option value="pro">Pro Organizer Plan</option>
                    <option value="premium">Enterprise / Premium Plan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Moderation & Compliance */}
            <div className="admin-card" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: "1.3rem" }}>🛡️</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                  Event Moderation &amp; Governance Policy
                </h3>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--admin-text-muted)",
                    marginBottom: 8,
                  }}
                >
                  EVENT PUBLISHING WORKFLOW
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <label
                    style={{
                      padding: "14px",
                      borderRadius: 10,
                      border:
                        form.eventModerationPolicy === "AUTO_APPROVE"
                          ? "2px solid var(--admin-primary)"
                          : "1px solid var(--admin-border)",
                      background:
                        form.eventModerationPolicy === "AUTO_APPROVE"
                          ? "rgba(99, 102, 241, 0.1)"
                          : "rgba(9, 13, 22, 0.5)",
                      cursor: "pointer",
                      display: "block",
                    }}
                  >
                    <input
                      type="radio"
                      name="moderationPolicy"
                      value="AUTO_APPROVE"
                      checked={form.eventModerationPolicy === "AUTO_APPROVE"}
                      onChange={(e) => setForm({ ...form, eventModerationPolicy: e.target.value })}
                      style={{ marginRight: 8 }}
                    />
                    <strong style={{ color: "#FFF" }}>Automatic Approval (Default)</strong>
                    <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
                      Events published by verified organizers go live instantly. Admin can flag or unpublish post-launch.
                    </p>
                  </label>

                  <label
                    style={{
                      padding: "14px",
                      borderRadius: 10,
                      border:
                        form.eventModerationPolicy === "MANUAL_REVIEW"
                          ? "2px solid var(--admin-primary)"
                          : "1px solid var(--admin-border)",
                      background:
                        form.eventModerationPolicy === "MANUAL_REVIEW"
                          ? "rgba(99, 102, 241, 0.1)"
                          : "rgba(9, 13, 22, 0.5)",
                      cursor: "pointer",
                      display: "block",
                    }}
                  >
                    <input
                      type="radio"
                      name="moderationPolicy"
                      value="MANUAL_REVIEW"
                      checked={form.eventModerationPolicy === "MANUAL_REVIEW"}
                      onChange={(e) => setForm({ ...form, eventModerationPolicy: e.target.value })}
                      style={{ marginRight: 8 }}
                    />
                    <strong style={{ color: "#FFF" }}>Mandatory Admin Review</strong>
                    <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
                      Every new event requires Super Admin approval in the moderation queue before becoming visible to participants.
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--admin-text-muted)",
                    marginBottom: 6,
                  }}
                >
                  SUBSCRIPTION EXPIRY GRACE PERIOD (DAYS)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={form.subscriptionGracePeriodDays}
                  onChange={(e) =>
                    setForm({ ...form, subscriptionGracePeriodDays: Number(e.target.value) })
                  }
                  style={{
                    width: 200,
                    padding: "10px 12px",
                    background: "rgba(9, 13, 22, 0.6)",
                    border: "1px solid var(--admin-border)",
                    borderRadius: 8,
                    color: "#FFF",
                  }}
                />
                <span style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", marginLeft: 12 }}>
                  Organizers retain event access during grace period before restrictions apply.
                </span>
              </div>
            </div>

            {/* 3. Maintenance Mode Control */}
            <div
              className="admin-card"
              style={{
                marginBottom: 24,
                border: form.maintenanceMode
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : "1px solid var(--admin-border)",
                background: form.maintenanceMode
                  ? "rgba(239, 68, 68, 0.05)"
                  : "var(--admin-card-bg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.3rem" }}>🚨</span>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                      Emergency Maintenance Mode
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
                      Temporarily block public registration and show platform maintenance banner.
                    </p>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.maintenanceMode}
                    onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                  <strong style={{ color: form.maintenanceMode ? "#F87171" : "#94A3B8" }}>
                    {form.maintenanceMode ? "ENABLED (ACTIVE)" : "DISABLED"}
                  </strong>
                </label>
              </div>

              {form.maintenanceMode && (
                <div style={{ marginTop: 12 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#F87171",
                      marginBottom: 6,
                    }}
                  >
                    PUBLIC MAINTENANCE NOTICE BROADCAST
                  </label>
                  <textarea
                    rows={2}
                    value={form.maintenanceMessage}
                    onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(9, 13, 22, 0.8)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: 8,
                      color: "#FFF",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}
            </div>

            {/* 4. Payment Gateway Status */}
            <div className="admin-card" style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: "1.3rem" }}>💳</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                  Payment Gateway Integration
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--admin-text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    PAYMENT PROVIDER
                  </label>
                  <input
                    type="text"
                    disabled
                    value={form.paymentGateway.provider}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(9, 13, 22, 0.4)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: 8,
                      color: "#94A3B8",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--admin-text-muted)",
                      marginBottom: 6,
                    }}
                  >
                    ENVIRONMENT MODE
                  </label>
                  <select
                    value={form.paymentGateway.isSandbox ? "sandbox" : "live"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentGateway: {
                          ...form.paymentGateway,
                          isSandbox: e.target.value === "sandbox",
                        },
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(9, 13, 22, 0.6)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: 8,
                      color: "#FFF",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="sandbox">Sandbox / Test Mode (Simulated)</option>
                    <option value="live">Production / Live Mode</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="submit"
                disabled={saving}
                className="admin-btn admin-btn-primary"
                style={{ padding: "12px 28px", fontSize: "0.95rem" }}
              >
                {saving ? "Saving Changes..." : "💾 Save Platform Settings"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
