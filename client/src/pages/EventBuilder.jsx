import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

const STEPS = [
  ["basics", "Basics"],
  ["design", "Design"],
  ["speakers", "Speakers"],
  ["registration", "Registration"],
  ["tickets", "Tickets"],
  ["volunteers", "Volunteers"],
  ["certificates", "Certificates"],
  ["preview", "Preview"],
];

const defaultForm = {
  title: "",
  shortDescription: "",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  venue: "",
  location: "",
  capacity: 100,
  registrationDeadline: "",
  posterUrl: "",
  theme: "aurora",
  speakers: [],
  registrationFields: [
    { key: "name", label: "Full Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "phone", label: "Phone", type: "tel", required: true },
  ],
  ticketMode: "free",
  qrEnabled: true,
  ticketTypes: [{ name: "General", price: 0, capacity: 100 }],
  volunteerEnabled: false,
  volunteerRoles: [],
  certificateEnabled: false,
  certificateTemplate: "classic",
  certificateDescription: "This certificate is presented to {name} for participating in {event}.",
  signatures: [],
};

export default function EventBuilder() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(eventId);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;

    api.get("/events/mine")
      .then(({ data }) => {
        const event = data.events.find((item) => item._id === eventId);
        if (!event) {
          setError("Event not found.");
          return;
        }

        setForm((old) => ({
          ...old,
          ...event,
          date: event.date ? dateOnly(event.date) : "",
          registrationDeadline: event.registrationDeadline
            ? dateTimeLocal(event.registrationDeadline)
            : "",
          speakers: event.speakers || [],
          registrationFields: event.registrationFields || old.registrationFields,
          ticketTypes: event.ticketTypes || old.ticketTypes,
          volunteerRoles: event.volunteerRoles || [],
          signatures: event.signatures || [],
        }));
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load event.");
      })
      .finally(() => setLoading(false));
  }, [editing, eventId]);

  const update = (key, value) => {
    setForm((old) => ({ ...old, [key]: value }));
    setMessage("");
  };

  async function saveDraft(goNext = false) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = makePayload(form);
      let response;

      if (editing) {
        response = await api.put(`/events/${eventId}`, payload);
      } else {
        response = await api.post("/events", {
          ...payload,
          status: "draft",
        });
      }

      const saved = response.data?.event || response.data;
      const newId = saved?._id || eventId;

      setMessage("Draft saved successfully.");

      if (!editing && newId) {
        navigate(`/dashboard/events/${newId}/edit`, { replace: true });
        return;
      }

      if (goNext) {
        setStep((old) => Math.min(old + 1, STEPS.length - 1));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the event.");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!form.title.trim()) throw new Error("Event name is required.");
      if (!form.date) throw new Error("Event date is required.");
      if (!form.venue.trim()) throw new Error("Venue is required.");

      const payload = makePayload(form);
      let response;

      if (editing) {
        response = await api.put(`/events/${eventId}`, {
          ...payload,
          status: "published",
        });
      } else {
        response = await api.post("/events", {
          ...payload,
          status: "published",
        });
      }

      const saved = response.data?.event || response.data;

      if (saved?.slug) {
        navigate(`/events/${saved.slug}`);
      } else if (saved?._id) {
        navigate(`/dashboard/events/${saved._id}`);
      } else if (eventId) {
        navigate(`/dashboard/events/${eventId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not publish event.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="center-page"><div className="spinner" /><p>Loading event builder...</p></main>;
  }

  return (
    <main className="builder-page">
      <div className="builder-topbar">
        <Link className="brand" to="/dashboard">EVENT<span>RA</span></Link>
        <div className="builder-top-title">
          <span>{editing ? "EDIT EVENT" : "CREATE EVENT"}</span>
          <strong>{form.title || "Untitled Event"}</strong>
        </div>
        <div className="builder-top-actions">
          <Link className="button button-ghost small" to="/dashboard">Exit</Link>
          <button className="button button-ghost small" onClick={() => saveDraft(false)} disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </button>
        </div>
      </div>

      <div className="builder-layout">
        <aside className="builder-sidebar">
          <p className="builder-sidebar-label">EVENT SETUP</p>
          {STEPS.map(([key, label], index) => (
            <button
              key={key}
              className={`builder-step ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}
              onClick={() => setStep(index)}
            >
              <span>{index < step ? "✓" : index + 1}</span>
              {label}
            </button>
          ))}

          <div className="builder-sidebar-tip">
            <span>✦</span>
            <div>
              <strong>Save anytime</strong>
              <p>Your event can remain a draft until you are ready to publish.</p>
            </div>
          </div>
        </aside>

        <section className="builder-content">
          <div className="builder-heading">
            <div>
              <p className="section-kicker">{String(step + 1).padStart(2, "0")} / {STEPS.length}</p>
              <h1>{STEPS[step][1]}</h1>
            </div>
            {message && <span className="builder-saved">✓ {message}</span>}
          </div>

          {error && <div className="alert-error">{error}</div>}

          {step === 0 && <Basics form={form} update={update} />}
          {step === 1 && <Design form={form} update={update} />}
          {step === 2 && <Speakers form={form} update={update} />}
          {step === 3 && <Registration form={form} update={update} />}
          {step === 4 && <Tickets form={form} update={update} />}
          {step === 5 && <Volunteers form={form} update={update} />}
          {step === 6 && <Certificates form={form} update={update} />}
          {step === 7 && <Preview form={form} />}

          <div className="builder-footer">
            <button
              className="button button-ghost"
              disabled={step === 0 || saving}
              onClick={() => setStep((old) => old - 1)}
            >
              ← Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                className="button button-primary"
                onClick={() => saveDraft(true)}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save & Continue →"}
              </button>
            ) : (
              <button
                className="button button-publish"
                onClick={publish}
                disabled={saving}
              >
                {saving ? "Publishing..." : "Publish Event ✦"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Basics({ form, update }) {
  return <div className="builder-card">
    <Field label="Event name" required>
      <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. AI & Robotics Summit 2026" />
    </Field>

    <Field label="Short description">
      <input value={form.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} placeholder="A short line that appears on event cards" />
    </Field>

    <Field label="Full description">
      <textarea rows="7" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Tell participants what the event is about..." />
    </Field>

    <div className="builder-two">
      <Field label="Event date" required>
        <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
      </Field>
      <Field label="Registration deadline">
        <input type="datetime-local" value={form.registrationDeadline} onChange={(e) => update("registrationDeadline", e.target.value)} />
      </Field>
    </div>

    <div className="builder-two">
      <Field label="Start time">
        <input type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} />
      </Field>
      <Field label="End time">
        <input type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} />
      </Field>
    </div>

    <div className="builder-two">
      <Field label="Venue" required>
        <input value={form.venue} onChange={(e) => update("venue", e.target.value)} placeholder="College auditorium, hotel, hall..." />
      </Field>
      <Field label="Location">
        <input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="City / area" />
      </Field>
    </div>

    <Field label="Maximum registrations">
      <input type="number" min="1" value={form.capacity} onChange={(e) => update("capacity", Number(e.target.value))} />
    </Field>
  </div>;
}

function Design({ form, update }) {
  const themes = [
    ["aurora", "Aurora", "Modern gradient"],
    ["minimal", "Minimal", "Clean & professional"],
    ["conference", "Conference", "Corporate event"],
    ["creative", "Creative", "Bold & energetic"],
  ];

  return <div className="builder-card">
    <div className="builder-info">
      <span>✦</span>
      <div><strong>Make your event page look professional.</strong><p>Upload your own poster or leave it empty and we can generate the visual layer later with EVENTRA AI.</p></div>
    </div>

    <Field label="Poster image URL">
      <input value={form.posterUrl} onChange={(e) => update("posterUrl", e.target.value)} placeholder="https://..." />
    </Field>

    <h3 className="subheading">Choose an event theme</h3>
    <div className="theme-grid">
      {themes.map(([key, name, text]) => (
        <button
          type="button"
          key={key}
          className={`theme-choice ${form.theme === key ? "selected" : ""}`}
          onClick={() => update("theme", key)}
        >
          <div className={`theme-preview theme-${key}`}><span>EVENT</span><strong>{form.title || "YOUR EVENT"}</strong></div>
          <strong>{name}</strong>
          <small>{text}</small>
        </button>
      ))}
    </div>
  </div>;
}

function Speakers({ form, update }) {
  function add() {
    update("speakers", [...form.speakers, { name: "", designation: "", organization: "", role: "Speaker", photoUrl: "" }]);
  }

  function change(index, key, value) {
    const next = [...form.speakers];
    next[index] = { ...next[index], [key]: value };
    update("speakers", next);
  }

  function remove(index) {
    update("speakers", form.speakers.filter((_, i) => i !== index));
  }

  return <div className="builder-card">
    <div className="section-row">
      <div><h3 className="subheading">Speakers, judges & guests</h3><p className="muted">Add people only if your event needs them. Empty means the public page won't show a speaker section.</p></div>
      <button className="button button-primary small" onClick={add}>＋ Add Person</button>
    </div>

    {form.speakers.length === 0 ? (
      <div className="builder-empty">No speakers added yet.</div>
    ) : form.speakers.map((person, index) => (
      <div className="repeat-card" key={index}>
        <div className="repeat-card-title"><strong>Person {index + 1}</strong><button className="remove-button" onClick={() => remove(index)}>Remove</button></div>
        <div className="builder-two">
          <Field label="Name"><input value={person.name} onChange={(e) => change(index, "name", e.target.value)} placeholder="Dr. Sarah Khan" /></Field>
          <Field label="Role"><input value={person.role} onChange={(e) => change(index, "role", e.target.value)} placeholder="Keynote Speaker / Judge" /></Field>
        </div>
        <div className="builder-two">
          <Field label="Designation"><input value={person.designation} onChange={(e) => change(index, "designation", e.target.value)} /></Field>
          <Field label="Organization"><input value={person.organization} onChange={(e) => change(index, "organization", e.target.value)} /></Field>
        </div>
        <Field label="Photo URL"><input value={person.photoUrl} onChange={(e) => change(index, "photoUrl", e.target.value)} placeholder="https://..." /></Field>
      </div>
    ))}
  </div>;
}

function Registration({ form, update }) {
  function addField() {
    update("registrationFields", [...form.registrationFields, {
      key: `custom_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
    }]);
  }

  function change(index, key, value) {
    const next = [...form.registrationFields];
    next[index] = { ...next[index], [key]: value };
    update("registrationFields", next);
  }

  function remove(index) {
    const field = form.registrationFields[index];
    if (["name", "email"].includes(field.key)) return;
    update("registrationFields", form.registrationFields.filter((_, i) => i !== index));
  }

  return <div className="builder-card">
    <div className="section-row">
      <div><h3 className="subheading">Participant information</h3><p className="muted">Choose what people must enter when they register.</p></div>
      <button className="button button-primary small" onClick={addField}>＋ Add Field</button>
    </div>

    <div className="field-list">
      {form.registrationFields.map((field, index) => (
        <div className="registration-field" key={field.key}>
          <div className="field-drag">⋮⋮</div>
          <div className="field-main">
            <input value={field.label} onChange={(e) => change(index, "label", e.target.value)} />
            <select value={field.type} onChange={(e) => change(index, "type", e.target.value)}>
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="tel">Phone</option>
              <option value="number">Number</option>
              <option value="college">College</option>
              <option value="department">Department</option>
            </select>
          </div>
          <label className="mini-check"><input type="checkbox" checked={field.required} onChange={(e) => change(index, "required", e.target.checked)} /> Required</label>
          <button className="remove-button" disabled={["name", "email"].includes(field.key)} onClick={() => remove(index)}>×</button>
        </div>
      ))}
    </div>
  </div>;
}

function Tickets({ form, update }) {
  function addTicket() {
    update("ticketTypes", [...form.ticketTypes, { name: "New Ticket", price: 0, capacity: Number(form.capacity || 100) }]);
  }

  function change(index, key, value) {
    const next = [...form.ticketTypes];
    next[index] = { ...next[index], [key]: key === "price" || key === "capacity" ? Number(value) : value };
    update("ticketTypes", next);
  }

  function remove(index) {
    if (form.ticketTypes.length === 1) return;
    update("ticketTypes", form.ticketTypes.filter((_, i) => i !== index));
  }

  return <div className="builder-card">
    <div className="ticket-mode">
      <button className={form.ticketMode === "free" ? "selected" : ""} onClick={() => update("ticketMode", "free")}>Free Event</button>
      <button className={form.ticketMode === "paid" ? "selected" : ""} onClick={() => update("ticketMode", "paid")}>Paid Event</button>
    </div>

    <label className="toggle-row">
      <span><strong>QR entry</strong><small>Generate a unique QR for each participant's entry pass.</small></span>
      <input type="checkbox" checked={form.qrEnabled} onChange={(e) => update("qrEnabled", e.target.checked)} />
    </label>

    <div className="section-row"><div><h3 className="subheading">Ticket types</h3><p className="muted">Ticket payment will be connected in the payment phase.</p></div><button className="button button-primary small" onClick={addTicket}>＋ Add Ticket</button></div>

    {form.ticketTypes.map((ticket, index) => (
      <div className="repeat-card" key={index}>
        <div className="builder-three">
          <Field label="Ticket name"><input value={ticket.name} onChange={(e) => change(index, "name", e.target.value)} /></Field>
          <Field label="Price"><input type="number" min="0" value={form.ticketMode === "free" ? 0 : ticket.price} disabled={form.ticketMode === "free"} onChange={(e) => change(index, "price", e.target.value)} /></Field>
          <Field label="Capacity"><input type="number" min="1" value={ticket.capacity} onChange={(e) => change(index, "capacity", e.target.value)} /></Field>
        </div>
        <button className="remove-button" onClick={() => remove(index)}>Remove ticket</button>
      </div>
    ))}
  </div>;
}

function Volunteers({ form, update }) {
  function add() {
    update("volunteerRoles", [...form.volunteerRoles, { name: "New Role", limit: 5 }]);
  }

  function change(index, key, value) {
    const next = [...form.volunteerRoles];
    next[index] = { ...next[index], [key]: key === "limit" ? Number(value) : value };
    update("volunteerRoles", next);
  }

  return <div className="builder-card">
    <label className="toggle-row">
      <span><strong>Need volunteers?</strong><small>Participants can apply for volunteer roles during registration.</small></span>
      <input type="checkbox" checked={form.volunteerEnabled} onChange={(e) => update("volunteerEnabled", e.target.checked)} />
    </label>

    {form.volunteerEnabled && <>
      <div className="section-row"><div><h3 className="subheading">Volunteer roles</h3></div><button className="button button-primary small" onClick={add}>＋ Add Role</button></div>
      {form.volunteerRoles.map((role, index) => (
        <div className="builder-two repeat-inline" key={index}>
          <Field label="Role"><input value={role.name} onChange={(e) => change(index, "name", e.target.value)} /></Field>
          <Field label="Number needed"><input type="number" min="1" value={role.limit} onChange={(e) => change(index, "limit", e.target.value)} /></Field>
        </div>
      ))}
    </>}
  </div>;
}

function Certificates({ form, update }) {
  function addSignature() {
    update("signatures", [...form.signatures, { name: "", role: "" }]);
  }

  function changeSignature(index, key, value) {
    const next = [...form.signatures];
    next[index] = { ...next[index], [key]: value };
    update("signatures", next);
  }

  return <div className="builder-card">
    <label className="toggle-row">
      <span><strong>Issue certificates</strong><small>Certificates will be generated only for participants marked as attended.</small></span>
      <input type="checkbox" checked={form.certificateEnabled} onChange={(e) => update("certificateEnabled", e.target.checked)} />
    </label>

    {form.certificateEnabled && <>
      <h3 className="subheading">Certificate template</h3>
      <div className="certificate-templates">
        {["classic", "modern", "academic"].map((template) => (
          <button key={template} className={form.certificateTemplate === template ? "selected" : ""} onClick={() => update("certificateTemplate", template)}>
            <div className={`certificate-mini cert-${template}`}>CERTIFICATE</div>
            <strong>{template}</strong>
          </button>
        ))}
      </div>

      <Field label="Certificate description">
        <textarea rows="4" value={form.certificateDescription} onChange={(e) => update("certificateDescription", e.target.value)} />
      </Field>

      <div className="section-row"><div><h3 className="subheading">Signatures</h3><p className="muted">Add the names and roles printed below each signature.</p></div><button className="button button-primary small" onClick={addSignature}>＋ Add Signature</button></div>

      {form.signatures.map((signature, index) => (
        <div className="builder-two repeat-inline" key={index}>
          <Field label="Name"><input value={signature.name} onChange={(e) => changeSignature(index, "name", e.target.value)} /></Field>
          <Field label="Role"><input value={signature.role} onChange={(e) => changeSignature(index, "role", e.target.value)} /></Field>
        </div>
      ))}
    </>}
  </div>;
}

function Preview({ form }) {
  return <div className="builder-card">
    <div className={`event-preview theme-${form.theme}`}>
      <div className="preview-poster">
        {form.posterUrl ? <img src={form.posterUrl} alt="" /> : <div><span>EVENTRA</span><strong>{form.title || "Your Event"}</strong><p>{form.shortDescription || "Your event description will appear here."}</p></div>}
      </div>
      <div className="preview-body">
        <p className="section-kicker">EVENT PREVIEW</p>
        <h2>{form.title || "Untitled Event"}</h2>
        <p>{form.description || "Your event description."}</p>
        <div className="preview-meta">
          <span>📅 {form.date || "Date"}</span>
          <span>📍 {form.venue || "Venue"}</span>
          <span>👥 {form.capacity} seats</span>
        </div>
        {form.speakers.length > 0 && <div><h3>Speakers & Guests</h3><div className="preview-speakers">{form.speakers.map((s, i) => <div key={i}><strong>{s.name || "Speaker"}</strong><span>{s.role}</span></div>)}</div></div>}
        <button className="button button-primary">Register Now</button>
      </div>
    </div>
  </div>;
}

function Field({ label, required, children }) {
  return <label className="builder-field"><span>{label}{required && <b> *</b>}</span>{children}</label>;
}

function makePayload(form) {
  return {
    ...form,
    date: form.date ? new Date(`${form.date}T${form.startTime || "00:00"}`).toISOString() : null,
    registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
  };
}

function dateOnly(value) {
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
}

function dateTimeLocal(value) {
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
