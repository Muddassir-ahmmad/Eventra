import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setToken } from "../api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [events,setEvents] = useState([]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);

  useEffect(()=>{ loadEvents(); },[]);

  async function loadEvents() {
    try {
      const {data}=await api.get("/events/mine");
      setEvents(data.events);
    } catch(err) {
      setError(err.response?.data?.message || "Could not load your events.");
      if(err.response?.status===401){ setToken(null); navigate("/login"); }
    } finally { setLoading(false); }
  }

  return <main className="dashboard-page"><section className="dashboard-container">
    <div className="dashboard-welcome">
      <div><p className="section-kicker">ORGANIZER DASHBOARD</p><h1>Good to see you again 👋</h1><p>Manage your events, registrations and everything happening around them.</p></div>
      <Link className="button button-primary" to="/create-event">＋ Create Event</Link>
    </div>

    {error && <div className="alert-error">{error}</div>}

    <div className="stats-row">
      <Stat label="Total Events" value={events.length} icon="◈"/>
      <Stat label="Published" value={events.filter(e=>e.status==="published").length} icon="✓"/>
      <Stat label="Drafts" value={events.filter(e=>e.status==="draft").length} icon="◌"/>
      <Stat label="Closed" value={events.filter(e=>e.status==="closed").length} icon="—"/>
    </div>

    <div className="events-section-head"><div><h2>Your Events</h2><p>All events created from your organizer account.</p></div></div>

    {loading ? <div className="dashboard-empty"><div className="spinner"/><p>Loading your events...</p></div> :
    events.length===0 ? <div className="dashboard-empty"><div className="empty-icon">✦</div><h3>Your first event starts here</h3><p>Create an event and EVENTRA will give you a public event page.</p><Link className="button button-primary" to="/create-event">Create First Event</Link></div> :
    <div className="event-dashboard-grid">{events.map(event=><EventCard key={event._id} event={event}/>)}</div>}
  </section></main>;
}

function Stat({label,value,icon}) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function EventCard({event}) {
  return <article className="dashboard-event-card">
    <div className="event-cover">
      {event.posterUrl ? <img src={event.posterUrl} alt={event.title}/> : <div className="event-cover-default"><span>EVENTRA</span><strong>{event.title}</strong></div>}
      <span className={`event-status ${event.status}`}>{event.status}</span>
    </div>
    <div className="dashboard-event-body">
      <div className="event-date-line">◷ {new Date(event.date).toLocaleString()}</div>
      <h3>{event.title}</h3>
      <p className="event-venue">⌖ {event.venue}</p>
      <div className="capacity-line"><div><span>Registration capacity</span><strong>{event.capacity}</strong></div><div className="capacity-track"><span/></div></div>
      <div className="event-card-actions">
        <Link className="button button-primary small" to={`/dashboard/events/${event._id}`}>Manage Event</Link>
        {event.status === "published" ? (
          <Link className="button button-ghost small" to={`/events/${event.slug}`}>View Page</Link>
        ) : (
          <Link className="button button-ghost small" to={`/dashboard/events/${event._id}/edit`}>Edit Event</Link>
        )}
      </div>
    </div>
  </article>;
}
