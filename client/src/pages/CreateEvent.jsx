import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function CreateEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    venue: "",
    capacity: 100,
    registrationDeadline: "",
    posterUrl: "",
    qrEnabled: true,
    volunteerEnabled: false,
    certificateEnabled: false,
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function submit(e) {
    e.preventDefault();

    setError("");
    setSaving(true);

    try {
      const { data } = await api.post("/events", {
        ...form,
        capacity: Number(form.capacity),
        registrationDeadline:
          form.registrationDeadline || null,
      });

      navigate(`/events/${data.event.slug}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not create event"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="form-page">

      <section className="form-shell">

        <p className="eyebrow">
          CREATE EVENT
        </p>

        <h1>
          Build your event
        </h1>

        <p className="muted">
          Add the basic details of your event.
        </p>

        <form
          onSubmit={submit}
          className="form"
        >

          {/* EVENT NAME */}

          <label>
            Event name
          </label>

          <input
            type="text"
            placeholder="Example: AI & Robotics Summit 2026"
            value={form.title}
            onChange={(e) =>
              update("title", e.target.value)
            }
            required
          />

          {/* DESCRIPTION */}

          <label>
            Event description
          </label>

          <textarea
            rows="5"
            placeholder="Tell participants about your event..."
            value={form.description}
            onChange={(e) =>
              update("description", e.target.value)
            }
          />

          {/* DATE + CAPACITY */}

          <div className="two-col">

            <div>

              <label>
                Date and time
              </label>

              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) =>
                  update("date", e.target.value)
                }
                required
              />

            </div>

            <div>

              <label>
                Maximum registrations
              </label>

              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) =>
                  update("capacity", e.target.value)
                }
                required
              />

            </div>

          </div>

          {/* VENUE */}

          <label>
            Venue
          </label>

          <input
            type="text"
            placeholder="Example: Sahyadri College, Mangalore"
            value={form.venue}
            onChange={(e) =>
              update("venue", e.target.value)
            }
            required
          />

          {/* DEADLINE */}

          <label>
            Registration deadline
          </label>

          <input
            type="datetime-local"
            value={form.registrationDeadline}
            onChange={(e) =>
              update(
                "registrationDeadline",
                e.target.value
              )
            }
          />

          {/* POSTER */}

          <label>
            Event poster URL
          </label>

          <input
            type="url"
            placeholder="https://example.com/poster.jpg"
            value={form.posterUrl}
            onChange={(e) =>
              update("posterUrl", e.target.value)
            }
          />

          <p className="muted">
            Poster upload will be added later.
          </p>

          {/* OPTIONS */}

          <div className="option-list">

            <label className="check">

              <input
                type="checkbox"
                checked={form.qrEnabled}
                onChange={(e) =>
                  update(
                    "qrEnabled",
                    e.target.checked
                  )
                }
              />

              Enable QR entry

            </label>

            <label className="check">

              <input
                type="checkbox"
                checked={form.volunteerEnabled}
                onChange={(e) =>
                  update(
                    "volunteerEnabled",
                    e.target.checked
                  )
                }
              />

              Allow volunteer applications

            </label>

            <label className="check">

              <input
                type="checkbox"
                checked={form.certificateEnabled}
                onChange={(e) =>
                  update(
                    "certificateEnabled",
                    e.target.checked
                  )
                }
              />

              Issue certificates

            </label>

          </div>

          {/* ERROR */}

          {error && (
            <p className="error">
              {error}
            </p>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            className="primary full"
            disabled={saving}
          >
            {saving
              ? "Publishing..."
              : "Publish Event"}
          </button>

        </form>

      </section>

    </main>
  );
}