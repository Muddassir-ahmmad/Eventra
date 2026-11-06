import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setToken } from "../../api";
import "../../admin.css";

export default function AdminBootstrap() {
  const navigate = useNavigate();
  const [bootstrapKey, setBootstrapKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleBootstrap(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Master password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/bootstrap-super-admin", {
        bootstrapKey: bootstrapKey.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setSuccess(true);
      if (data.token) {
        setToken(data.token);
        localStorage.setItem("eventra_user_name", data.user?.name || name);
        localStorage.setItem("eventra_user_role", "SUPER_ADMIN");
      }

      setTimeout(() => {
        navigate("/admin");
      }, 2000);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Bootstrap failed. Please verify your bootstrap secret key.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#F8FAFC",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "rgba(18, 24, 40, 0.9)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(129, 140, 248, 0.25)",
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 50px rgba(99, 102, 241, 0.2)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem",
              boxShadow: "0 8px 24px rgba(124, 58, 237, 0.4)",
              marginBottom: 14,
            }}
          >
            ⚡
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Super Admin Provisioning
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#94A3B8", marginTop: 6 }}>
            Controlled master account initialization for platform deployment
          </p>
        </div>

        {success ? (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 12,
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#34D399", margin: "0 0 8px" }}>
              Bootstrap Complete!
            </h3>
            <p style={{ fontSize: "0.88rem", color: "#CBD5E1", margin: 0 }}>
              Your Super Admin account has been securely created. Seeding platform subscription tiers and configurations...
            </p>
            <p style={{ fontSize: "0.82rem", color: "#94A3B8", marginTop: 12 }}>
              Redirecting to Executive Dashboard in 2 seconds...
            </p>
          </div>
        ) : (
          <form onSubmit={handleBootstrap}>
            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: "0.82rem",
                  color: "#FCA5A5",
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#CBD5E1",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Platform Bootstrap Secret Key
              </label>
              <input
                type="password"
                required
                value={bootstrapKey}
                onChange={(e) => setBootstrapKey(e.target.value)}
                placeholder="Enter ADMIN_BOOTSTRAP_SECRET"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(9, 13, 22, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  color: "#F8FAFC",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 4, display: "block" }}>
                Configured in server environment or default platform secret
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#CBD5E1",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Super Admin Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Master Administrator"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(9, 13, 22, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  color: "#F8FAFC",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#CBD5E1",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Executive Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eventra.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(9, 13, 22, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 8,
                  color: "#F8FAFC",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#CBD5E1",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(9, 13, 22, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 8,
                    color: "#F8FAFC",
                    fontSize: "0.9rem",
                    outline: "none",
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
                    color: "#CBD5E1",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(9, 13, 22, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 8,
                    color: "#F8FAFC",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 18px",
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                border: "none",
                borderRadius: 8,
                color: "#FFF",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Provisioning Master Account..." : "⚡ Bootstrap Super Admin Account"}
            </button>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link
                to="/admin/login"
                style={{ fontSize: "0.8rem", color: "#94A3B8", textDecoration: "none" }}
              >
                Already initialized? Go to Admin Login →
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

