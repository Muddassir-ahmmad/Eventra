import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

export default function EventEdit() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    capacity: 100,
    venue: "",
    registrationDeadline: "",
    posterUrl: "",
    qrEnabled: true,
    volunteerEnabled: false,
    certificateEnabled: false,
  });

  useEffect(() => {
    api.get("/events/mine")
      .then(({ data }) => {
        const event = data.events.find((item) => item._id === eventId);
        if (!event) {
          setError("Event not found.");
          return;
        }
        setForm({
          title: event.title || "",
          description: event.description || "",
          date: toInputDateTime(event.date),
          capacity: event.capacity || 100,
          venue: event.venue || "",
          registrationDeadline: toInputDateTime(event.registrationDeadline),
          posterUrl: event.posterUrl || "",
          qrEnabled: event.qrEnabled ?? true,
          volunteerEnabled: event.volunteerEnabled ?? false,
          certificateEnabled: event.certificateEnabled ?? false,
        });
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load event."))
      .finally(() => setLoading(false));
  }, [eventId]);

  function change(e) {
    const { name, value, type, checked } = e.target;
    setForm((old) => ({ ...old, [name]: type === "checkbox" ? checked : value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.put(`/events/${eventId}`, {
        ...form,
        capacity: Number(form.capacity),
        date: form.date ? new Date(form.date).toISOString() : null,
        registrationDeadline: form.registrationDeadline
          ? new Date(form.registrationDeadline).toISOString()
          : null,
      });
      navigate(`/dashboard/events/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="center-page"><div className="spinner" /><p>Loading event...</p></main>;

  return (
    <main className="form-page">
      <section className="form-shell edit-event-shell">
        <Link className="back-link" to={`/dashboard/events/${eventId}`}>← Back to Event</Link>

        <p className="section-kicker" style={{marginTop:24}}>EDIT EVENT</p>
        <h1>Update your event</h1>
        <p className="muted">Change any event information and publish the updated details immediately.</p>

        {error && <div className="alert-error">{error}</div>}

        <form className="form" onSubmit={save}>
          <label>Event name</label>
          <input name="title" value={form.title} onChange={change} required />

          <label>Description</label>
          <textarea name="description" rows="6" value={form.description} onChange={change} />

          <div className="two-col">
            <div>
              <label>Date and time</label>
              <input type="datetime-local" name="date" value={form.date} onChange={change} required />
            </div>
            <div>
              <label>Maximum registrations</label>
              <input type="number" min="1" name="capacity" value={form.capacity} onChange={change} required />
            </div>
          </div>

          <label>Venue</label>
          <input name="venue" value={form.venue} onChange={change} />

          <label>Registration deadline</label>
          <input type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={change} />

          <label>Event poster URL</label>
          <input name="posterUrl" value={form.posterUrl} onChange={change} placeholder="https://..." />

          <div className="edit-options">
            <label className="check"><input type="checkbox" name="qrEnabled" checked={form.qrEnabled} onChange={change} /> Enable QR entry</label>
            <label className="check"><input type="checkbox" name="volunteerEnabled" checked={form.volunteerEnabled} onChange={change} /> Allow volunteer applications</label>
            <label className="check"><input type="checkbox" name="certificateEnabled" checked={form.certificateEnabled} onChange={change} /> Issue certificates</label>
          </div>

          <div className="edit-actions">
            <Link className="button button-ghost" to={`/dashboard/events/${eventId}`}>Cancel</Link>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
