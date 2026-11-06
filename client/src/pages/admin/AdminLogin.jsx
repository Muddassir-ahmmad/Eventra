import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setToken } from "../../api";
import "../../admin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      // Role check: Only SUPER_ADMIN allowed
      if (data.user?.role !== "SUPER_ADMIN") {
        setError(
          "Access Denied: This administrative portal is strictly restricted to SUPER_ADMIN personnel. Organizers should sign in via the standard Organizer portal."
        );
        setLoading(false);
        return;
      }

      // Persist auth tokens
      setToken(data.token);
      localStorage.setItem("eventra_user_name", data.user.name || "Super Admin");
      localStorage.setItem("eventra_user_role", "SUPER_ADMIN");

      // Navigate to admin command center
      navigate("/admin");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Authentication failed. Please verify your administrator credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #131a33 0%, #090d16 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#F8FAFC",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(18, 24, 40, 0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.15)",
        }}
      >
        {/* Brand Crest */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #6366F1 0%, #4338CA 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
              marginBottom: 16,
            }}
          >
            🛡️
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            EVENTRA <span style={{ color: "#818cf8" }}>ADMIN</span>
          </h1>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#94A3B8",
              marginTop: 6,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Executive Command Center
          </p>
        </div>

        {/* Security Warning Notice */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.78rem",
            color: "#FCD34D",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🔒</span>
          <span>
            Restricted access. All access attempts, session tokens, and IP addresses are audited for platform security.
          </span>
        </div>

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

        {/* Authentication Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#CBD5E1",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Administrator Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@eventra.com"
              style={{
                width: "100%",
                padding: "11px 14px",
                background: "rgba(9, 13, 22, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                color: "#F8FAFC",
                fontSize: "0.92rem",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366F1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.12)")}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
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
                padding: "11px 14px",
                background: "rgba(9, 13, 22, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                color: "#F8FAFC",
                fontSize: "0.92rem",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366F1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.12)")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 18px",
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              border: "none",
              borderRadius: 8,
              color: "#FFF",
              fontWeight: 700,
              fontSize: "0.92rem",
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
              transition: "transform 0.15s, opacity 0.15s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Authenticating..." : "Authorize & Enter Console →"}
          </button>
        </form>

        {/* Discreet Sub-Footer Options */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.78rem",
            color: "#64748B",
          }}
        >
          <Link
            to="/"
            style={{
              color: "#94A3B8",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#F8FAFC")}
            onMouseLeave={(e) => (e.target.style.color = "#94A3B8")}
          >
            ← Public Homepage
          </Link>

          <Link
            to="/admin/bootstrap"
            style={{
              color: "#818CF8",
              textDecoration: "none",
              fontWeight: 600,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
          >
            Initial Setup / Bootstrap ⚡
          </Link>
        </div>
      </div>
    </div>
  );
}
