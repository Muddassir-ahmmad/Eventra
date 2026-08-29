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

  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    try {
      const { data } = await api.post("/auth/register", form);

      setToken(data.token);

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