import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setToken } from "../api";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organization: "",
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!agreeTerms) {
      setError("Please accept the Terms and Conditions to create your account.");
      return;
    }

    try {
      const { data } = await api.post("/auth/register", form);

      setToken(data.token);
      if (data.user?.name) {
        localStorage.setItem("eventra_user_name", data.user.name);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed"
      );
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">EVENTRA ORGANIZER</p>

        <h1>Create your organizer account</h1>

        <p className="muted">
          Start building your first event.
        </p>

        <form onSubmit={submit} className="form">

          <input
            placeholder="Your name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            required
          />

          <input
            placeholder="Organization / College"
            value={form.organization}
            onChange={(e) =>
              setForm({
                ...form,
                organization: e.target.value,
              })
            }
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            required
          />

          <input
            type="password"
            placeholder="Password (minimum 6 characters)"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
            minLength={6}
            required
          />

          {error && (
            <p className="error">
              {error}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "14px 0 6px", textAlign: "left" }}>
            <input
              type="checkbox"
              id="termsAgreement"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              required
              style={{ width: 18, height: 18, marginTop: 2, accentColor: "#6366f1", cursor: "pointer", flexShrink: 0 }}
            />
            <label htmlFor="termsAgreement" style={{ fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer", lineHeight: 1.45 }}>
              I agree to the{" "}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", fontWeight: 700, textDecoration: "underline" }}>
                Terms and Conditions
              </Link>
            </label>
          </div>

          <button
            type="submit"
            className="primary full"
          >
            Create Account
          </button>

        </form>

        <p className="muted">
          Already registered?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>

      </section>
    </main>
  );
}