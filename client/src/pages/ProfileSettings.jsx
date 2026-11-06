import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setToken } from "../api";
import "../profile-settings.css";

export default function ProfileSettings() {
  const navigate = useNavigate();

  // Profile Form State
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    organization: "",
  });

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = useState({
    notifyOnRegistration: true,
    notifyOnCapacity: true,
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Status Alerts
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data } = await api.get("/auth/me");
      if (data?.user) {
        setProfile({
          name: data.user.name || "",
          email: data.user.email || "",
          organization: data.user.organization || "",
        });
        if (data.user.emailNotifications) {
          setEmailNotifications({
            notifyOnRegistration: data.user.emailNotifications.notifyOnRegistration !== false,
            notifyOnCapacity: data.user.emailNotifications.notifyOnCapacity !== false,
          });
        }
        if (data.user.name) {
          localStorage.setItem("eventra_user_name", data.user.name);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setToken(null);
        navigate("/login");
      } else {
        setProfileMsg({
          type: "error",
          text: err.response?.data?.message || "Could not load profile settings.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });

    if (!profile.name.trim()) {
      setProfileMsg({ type: "error", text: "Organizer name cannot be empty." });
      return;
    }

    if (!profile.email.trim() || !profile.email.includes("@")) {
      setProfileMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setSavingProfile(true);

    try {
      const { data } = await api.put("/auth/profile", {
        name: profile.name.trim(),
        email: profile.email.trim(),
        organization: profile.organization.trim(),
        emailNotifications,
      });

      if (data.token) {
        localStorage.setItem("eventra_token", data.token);
      }
      if (data.user?.name) {
        localStorage.setItem("eventra_user_name", data.user.name);
      }

      setProfileMsg({
        type: "success",
        text: data.message || "Profile information updated successfully.",
      });
      setTimeout(() => setProfileMsg({ type: "", text: "" }), 4000);
    } catch (err) {
      setProfileMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to update profile settings.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordMsg({ type: "", text: "" });

    if (!passwordForm.currentPassword) {
      setPasswordMsg({ type: "error", text: "Please enter your current password." });
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setSavingPassword(true);

    try {
      const { data } = await api.put("/auth/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordMsg({
        type: "success",
        text: data.message || "Password changed successfully.",
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => setPasswordMsg({ type: "", text: "" }), 4000);
    } catch (err) {
      setPasswordMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to update password.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError("");

    if (!deletePassword) {
      setDeleteError("Please enter your current password to confirm deletion.");
      return;
    }

    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Please type 'DELETE' in all caps to confirm.");
      return;
    }

    try {
      setDeleteLoading(true);
      const res = await api.delete("/auth/account", {
        data: { password: deletePassword },
      });
      alert(res.data.message || "Your organizer account has been permanently deleted.");
      setToken(null);
      localStorage.removeItem("eventra_token");
      localStorage.removeItem("eventra_user_name");
      navigate("/login");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="settings-page-root" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#94a3b8" }}>Loading account settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="settings-page-root">
      <div className="settings-container">
        {/* Navigation Breadcrumb & Header */}
        <div className="settings-head">
          <div>
            <Link
              to="/dashboard"
              style={{
                fontSize: "0.85rem",
                color: "#a5b4fc",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              ← Back to Organizer Dashboard
            </Link>
            <h1>Profile &amp; Account Settings</h1>
            <p>Update your organizer credentials, contact information, and security preferences.</p>
          </div>
          <Link to="/dashboard" className="button button-ghost" style={{ fontSize: "0.85rem" }}>
            My Events
          </Link>
        </div>

        {/* 1. Profile Information Card */}
        <section className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-icon">👤</div>
            <div>
              <h2>Organizer Profile</h2>
              <p>Your primary name and organization displayed to attendees on public event pages.</p>
            </div>
          </div>

          {profileMsg.text && (
            <div className={`settings-alert ${profileMsg.type}`}>
              {profileMsg.type === "success" ? "✓" : "⚠️"} {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="settings-form-grid">
            <div className="settings-two-cols">
              <div className="settings-field">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div className="settings-field">
                <label>Organization / College / Company</label>
                <input
                  type="text"
                  value={profile.organization}
                  onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                  placeholder="e.g. Sahyadri College of Engineering"
                />
              </div>
            </div>

            <div className="settings-field">
              <label>Login &amp; Alert Email Address *</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="organizer@university.edu"
                required
              />
              <small>
                This email is used to log in to EVENTRA and receive automated attendee alerts.
              </small>
            </div>

            {/* Email Notification Toggles */}
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 10 }}>
                Email Notifications
              </span>
              <div style={{ display: "grid", gap: 10 }}>
                <label className="settings-toggle-row">
                  <input
                    type="checkbox"
                    checked={emailNotifications.notifyOnRegistration}
                    onChange={(e) => setEmailNotifications({ ...emailNotifications, notifyOnRegistration: e.target.checked })}
                  />
                  <div className="settings-toggle-text">
                    <strong>New Attendee Registration Alert</strong>
                    <span>Receive instant email notification whenever a participant secures a pass.</span>
                  </div>
                </label>

                <label className="settings-toggle-row">
                  <input
                    type="checkbox"
                    checked={emailNotifications.notifyOnCapacity}
                    onChange={(e) => setEmailNotifications({ ...emailNotifications, notifyOnCapacity: e.target.checked })}
                  />
                  <div className="settings-toggle-text">
                    <strong>Event Capacity Reached Alert</strong>
                    <span>Receive warning email when ticket passes hit 100% capacity limit.</span>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <button
                type="submit"
                className="button button-primary"
                disabled={savingProfile}
                style={{ padding: "10px 24px", fontSize: "0.9rem" }}
              >
                {savingProfile ? "Saving Profile…" : "Save Profile Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* 2. Security & Password Card */}
        <section className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-icon" style={{ background: "rgba(244, 63, 94, 0.14)", borderColor: "rgba(244, 63, 94, 0.35)", color: "#fca5a5" }}>
              🔒
            </div>
            <div>
              <h2>Change Password</h2>
              <p>Keep your organizer account secure by using a strong password.</p>
            </div>
          </div>

          {passwordMsg.text && (
            <div className={`settings-alert ${passwordMsg.type}`}>
              {passwordMsg.type === "success" ? "✓" : "⚠️"} {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="settings-form-grid">
            <div className="settings-field">
              <label>Current Password *</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter your current password"
                required
              />
            </div>

            <div className="settings-two-cols">
              <div className="settings-field">
                <label>New Password *</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div className="settings-field">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <button
                type="submit"
                className="button"
                disabled={savingPassword}
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  padding: "10px 24px",
                  fontSize: "0.9rem",
                  border: 0,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {savingPassword ? "Updating Password…" : "Update Password"}
              </button>
            </div>
          </form>
        </section>

        {/* 3. Danger Zone: Delete Organizer Account */}
        <section
          className="settings-card"
          style={{
            borderColor: "rgba(239, 68, 68, 0.35)",
            background: "rgba(239, 68, 68, 0.04)",
          }}
        >
          <div className="settings-card-head">
            <div
              className="settings-card-icon"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                borderColor: "rgba(239, 68, 68, 0.35)",
                color: "#f87171",
              }}
            >
              ⚠️
            </div>
            <div>
              <h2 style={{ color: "#f87171" }}>Danger Zone: Delete Organizer Account</h2>
              <p>Permanently remove your organizer account and all associated events and records.</p>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "16px",
              borderRadius: 8,
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <p style={{ margin: "0 0 12px 0", fontSize: "0.88rem", color: "#fca5a5", lineHeight: 1.5 }}>
              Once you delete your account, <strong>all of your events, attendee registrations, QR ticket passes, and issued certificates will be permanently purged from the database</strong>. This action is irreversible.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteError("");
                setDeletePassword("");
                setDeleteConfirmText("");
              }}
              style={{
                background: "#dc2626",
                color: "#ffffff",
                padding: "10px 20px",
                fontSize: "0.88rem",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🗑️ Delete My Organizer Account
            </button>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#1e2235",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 12,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚠️</span> Permanently Delete Account?
              </h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6, marginBottom: 16 }}>
              This will <strong>permanently delete</strong> your organizer profile, all events you have published, participant registration records, tickets, and certificates.
            </p>

            {deleteError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#fca5a5",
                  padding: "10px 14px",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  marginBottom: 16,
                }}
              >
                ⚠️ {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  1. Enter your current password to authenticate:
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  2. Type <strong>DELETE</strong> below to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#cbd5e1",
                    padding: "9px 16px",
                    borderRadius: 6,
                    fontSize: "0.86rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                  style={{
                    background: deleteConfirmText.trim().toUpperCase() === "DELETE" ? "#dc2626" : "#64748b",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 18px",
                    borderRadius: 6,
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    cursor: deleteConfirmText.trim().toUpperCase() === "DELETE" ? "pointer" : "not-allowed",
                  }}
                >
                  {deleteLoading ? "Deleting Account…" : "Confirm Permanent Deletion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

