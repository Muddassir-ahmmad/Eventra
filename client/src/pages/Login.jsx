// import { useState } from "react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setToken } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    try {
      const { data } = await api.post("/auth/login", form);
      setToken(data.token);
      if (data.user?.name) {
        localStorage.setItem("eventra_user_name", data.user.name);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request
            ? "Could not reach the server. Check that EVENTRA is running and try again."
            : "Login failed")
      );
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your events.">
      <form onSubmit={submit} className="form">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="error">{error}</p>}
        <button className="primary full">Login</button>
      </form>
      <p className="muted">New organizer? <Link to="/register">Create an account</Link></p>
      <p className="muted" style={{ fontSize: "0.76rem", marginTop: 12 }}>
        By signing in, you agree to EVENTRA's{" "}
        <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", textDecoration: "underline" }}>
          Terms &amp; Conditions
        </Link>.
      </p>
    </AuthLayout>
  );
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">EVENTRA ORGANIZER</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
