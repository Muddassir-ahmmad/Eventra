import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";

export default function EventRegistration() {
  const { slug } = useParams();

  const [event, setEvent] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    department: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api
      .get(`/events/public/${slug}`)
      .then(({ data }) => {
        setEvent(data.event);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            "Could not load event"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  function update(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function submit(e) {
    e.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      const { data } = await api.post(
        `/registrations/public/${slug}`,
        form
      );

      setSuccess(data.registration);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="center-page">
        <p>Loading registration...</p>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="center-page">
        <h1>{error}</h1>
      </main>
    );
  }

  if (success) {
    return (
      <main className="auth-page">
        <section className="auth-card success-card">
          <p className="eyebrow">REGISTRATION COMPLETE</p>

          <h1>You're registered! 🎉</h1>

          <p className="muted">
            Your registration for{" "}
            <strong>{success.eventName}</strong>{" "}
            has been confirmed.
          </p>

          <div className="registration-result">
            <span>Registration ID</span>
            <strong>{success.registrationId}</strong>
          </div>

          <div className="registration-result">
            <span>Name</span>
            <strong>{success.name}</strong>
          </div>

          <div className="registration-result">
            <span>Email</span>
            <strong>{success.email}</strong>
          </div>

          <p className="muted">
            Keep your registration ID. Ticket and email
            delivery will be added in the next module.
          </p>

          <Link
            className="primary full"
            to={`/events/${slug}`}
          >
            Back to Event
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="form-page">
      <section className="form-shell">
        <p className="eyebrow">EVENT REGISTRATION</p>

        <h1>{event.title}</h1>

        <p className="muted">
          Fill in your details to register for this event.
        </p>

        <form
          onSubmit={submit}
          className="form"
        >
          <label>Full name</label>

          <input
            type="text"
            placeholder="Enter your full name"
            value={form.name}
            onChange={(e) =>
              update("name", e.target.value)
            }
            required
          />

          <label>Email</label>

          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) =>
              update("email", e.target.value)
            }
            required
          />

          <label>Phone number</label>

          <input
            type="tel"
            placeholder="Enter your phone number"
            value={form.phone}
            onChange={(e) =>
              update("phone", e.target.value)
            }
            required
          />

          <label>College / Organization</label>

          <input
            type="text"
            placeholder="Enter your college or organization"
            value={form.college}
            onChange={(e) =>
              update("college", e.target.value)
            }
            required
          />

          <label>Department</label>

          <input
            type="text"
            placeholder="Example: Computer Science"
            value={form.department}
            onChange={(e) =>
              update("department", e.target.value)
            }
          />

          {error && (
            <p className="error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary full"
            disabled={submitting}
          >
            {submitting
              ? "Registering..."
              : "Complete Registration"}
          </button>
        </form>

        <Link
          className="muted"
          to={`/events/${slug}`}
        >
          ← Back to event
        </Link>
      </section>
    </main>
  );
}
