import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { setToken } from "../api";

export default function EventRegistrations() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRegistrations();
  }, [eventId]);

  async function loadRegistrations() {
    try {
      const response = await api.get(
        `/registrations/event/${eventId}`
      );

      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load registrations"
      );

      if (err.response?.status === 401) {
        setToken(null);
        navigate("/login");
      }
    }
  }

  async function handleDelete(reg) {
    if (!reg) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the registration for "${reg.name}" (${reg.registrationId})?\n\nThis will remove the attendee, revoke their ticket pass, and release 1 seat back to event capacity.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/registrations/event/${eventId}/registrations/${reg._id}`);
      loadRegistrations();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete registration.");
    }
  }

  return (
    <main className="dashboard">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">
            EVENT REGISTRATIONS
          </p>

          <h1>
            {data?.event?.title || "Registrations"}
          </h1>

          {data?.event && (
            <p className="muted">
              {data.count} / {data.event.capacity} confirmed
            </p>
          )}
        </div>

        <Link
          className="secondary"
          to="/dashboard"
        >
          ← Dashboard
        </Link>
      </div>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {data && (
        <section className="registration-table-card">
          {data.registrations.length === 0 ? (
            <div className="empty-card">
              <h2>No registrations yet</h2>
              <p>
                Share your public event link to start
                receiving registrations.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="registration-table">
                <thead>
                  <tr>
                    <th>Registration ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>College</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {data.registrations.map((registration) => (
                    <tr key={registration._id}>
                      <td>{registration.registrationId}</td>
                      <td>{registration.name}</td>
                      <td>{registration.email}</td>
                      <td>{registration.phone}</td>
                      <td>{registration.college}</td>
                      <td>
                        {registration.department || "—"}
                      </td>
                      <td>
                        <span className="status">
                          {registration.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="button button-ghost small"
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.78rem",
                            color: "#fb7185",
                            borderColor: "rgba(244, 63, 94, 0.35)",
                            background: "rgba(244, 63, 94, 0.1)",
                            cursor: "pointer",
                          }}
                          onClick={() => handleDelete(registration)}
                          title={`Delete registration for ${registration.name}`}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
