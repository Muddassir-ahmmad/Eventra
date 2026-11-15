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
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              padding: "12px 18px",
              borderRadius: 10,
              fontSize: "0.88rem",
              fontWeight: 600,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.08)",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>✓</span> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              padding: "12px 18px",
              borderRadius: 10,
              fontSize: "0.88rem",
              fontWeight: 600,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.08)",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>✕</span> {errorMsg}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 6,
                      letterSpacing: "0.03em",
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
                      padding: "10px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: 8,
                      color: "#0F172A",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 6,
                      letterSpacing: "0.03em",
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
                      padding: "10px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: 8,
                      color: "#0F172A",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 6,
                      letterSpacing: "0.03em",
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
                      padding: "10px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: 8,
                      color: "#0F172A",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 6,
                      letterSpacing: "0.03em",
                    }}
                  >
                    DEFAULT ORGANIZER PLAN
                  </label>
                  <select
                    value={form.defaultPlanSlug}
                    onChange={(e) => setForm({ ...form, defaultPlanSlug: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: 8,
                      color: "#0F172A",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
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
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#0F172A" }}>
                  Event Moderation &amp; Governance Policy
                </h3>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: 10,
                    letterSpacing: "0.03em",
                  }}
                >
                  EVENT PUBLISHING WORKFLOW
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <label
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      border:
                        form.eventModerationPolicy === "AUTO_APPROVE"
                          ? "2px solid #059669"
                          : "1px solid #E2E8F0",
                      background:
                        form.eventModerationPolicy === "AUTO_APPROVE"
                          ? "#ECFDF5"
                          : "#FFFFFF",
                      cursor: "pointer",
                      display: "block",
                      boxShadow:
                        form.eventModerationPolicy === "AUTO_APPROVE"
                          ? "0 4px 12px rgba(5, 150, 105, 0.08)"
                          : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="radio"
                        name="moderationPolicy"
                        value="AUTO_APPROVE"
                        checked={form.eventModerationPolicy === "AUTO_APPROVE"}
                        onChange={(e) => setForm({ ...form, eventModerationPolicy: e.target.value })}
                        style={{ accentColor: "#059669", width: 16, height: 16, cursor: "pointer" }}
                      />
                      <strong style={{ color: "#0F172A", fontSize: "0.92rem", fontWeight: 700 }}>
                        Automatic Approval (Default)
                      </strong>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#64748B", lineHeight: 1.5, paddingLeft: 26 }}>
                      Events published by verified organizers go live instantly. Admin can flag or unpublish post-launch.
                    </p>
                  </label>

                  <label
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      border:
                        form.eventModerationPolicy === "MANUAL_REVIEW"
                          ? "2px solid #059669"
                          : "1px solid #E2E8F0",
                      background:
                        form.eventModerationPolicy === "MANUAL_REVIEW"
                          ? "#ECFDF5"
                          : "#FFFFFF",
                      cursor: "pointer",
                      display: "block",
                      boxShadow:
                        form.eventModerationPolicy === "MANUAL_REVIEW"
                          ? "0 4px 12px rgba(5, 150, 105, 0.08)"
                          : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="radio"
                        name="moderationPolicy"
                        value="MANUAL_REVIEW"
                        checked={form.eventModerationPolicy === "MANUAL_REVIEW"}
                        onChange={(e) => setForm({ ...form, eventModerationPolicy: e.target.value })}
                        style={{ accentColor: "#059669", width: 16, height: 16, cursor: "pointer" }}
                      />
                      <strong style={{ color: "#0F172A", fontSize: "0.92rem", fontWeight: 700 }}>
                        Mandatory Admin Review
                      </strong>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#64748B", lineHeight: 1.5, paddingLeft: 26 }}>
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
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: 6,
                    letterSpacing: "0.03em",
                  }}
                >
                  SUBSCRIPTION EXPIRY GRACE PERIOD (DAYS)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={form.subscriptionGracePeriodDays}
                    onChange={(e) =>
                      setForm({ ...form, subscriptionGracePeriodDays: Number(e.target.value) })
                    }
                    style={{
                      width: 160,
                      padding: "10px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: 8,
                      color: "#0F172A",
                      fontSize: "0.88rem",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: "0.82rem", color: "#64748B" }}>
                    Organizers retain event access during grace period before restrictions apply.
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Maintenance Mode Control */}
            <div
              className="admin-card"
              style={{
                marginBottom: 24,
                border: form.maintenanceMode
                  ? "1.5px solid #FECDD3"
                  : "1px solid var(--admin-border)",
                background: form.maintenanceMode
                  ? "#FFF1F2"
                  : "var(--admin-card-bg)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.3rem" }}>🚨</span>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#0F172A" }}>
                      Emergency Maintenance Mode
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748B" }}>
                      Temporarily block public registration and show platform maintenance banner.
                    </p>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.maintenanceMode}
                    onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#E11D48" }}
                  />
                  <strong style={{ color: form.maintenanceMode ? "#E11D48" : "#94A3B8", fontSize: "0.85rem" }}>
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
                      fontWeight: 700,
                      color: "#9F1239",
                      marginBottom: 6,
                      letterSpacing: "0.03em",
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
                      padding: "10px 14px",
                      background: "#FFFFFF",
                      border: "1.5px solid #FDA4AF",
                      borderRadius: 8,
                      color: "#881337",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              )}
            </div>

            {/* 4. Payment Gateway Status */}
            <div className="admin-card" style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: "1.3rem" }}>💳</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#0F172A" }}>
                  Payment Gateway Integration
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 6,
                      letterSpacing: "0.03em",
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
                      padding: "10px 14px",
                      background: "#F1F5F9",
                      border: "1px solid #CBD5E1",
                      borderRadius: 8,
                      color: "#475569",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: 6,
                      letterSpacing: "0.03em",
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
                      padding: "10px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: 8,
                      color: "#0F172A",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
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

