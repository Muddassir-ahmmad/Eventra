import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

export default function PublicEvent() {
  const { slug } = useParams();

  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvent() {
      try {
        const { data } = await api.get(
          `/events/public/${slug}`
        );

        setEvent(data.event);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Event not found"
        );
      }
    }

    loadEvent();
  }, [slug]);

  if (error) {
    return (
      <main className="center-page">
        <h1>{error}</h1>

        <Link
          className="primary"
          to="/"
        >
          Back to EVENTRA
        </Link>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="center-page">
        <p>Loading event...</p>
      </main>
    );
  }

  return (
    <main className="public-event">

      {/* EVENT HERO */}

      <section className="event-hero">

        {event.posterUrl && (
          <img
            src={event.posterUrl}
            alt={event.title}
          />
        )}

        <div className="event-hero-overlay">

          <p className="eyebrow">
            EVENTRA EVENT
          </p>

          <h1>
            {event.title}
          </h1>

          <p>
            {event.description ||
              "Join us for this exciting event."}
          </p>

          <div className="event-meta">

            <span>
              📅{" "}
              {new Date(
                event.date
              ).toLocaleString()}
            </span>

            <span>
              📍 {event.venue}
            </span>

            <span>
              👥 Capacity: {event.capacity}
            </span>

          </div>

          <Link
            className="primary"
            to={`/events/${event.slug}/register`}
          >
            Register Now
          </Link>

        </div>

      </section>

      {/* EVENT INFORMATION */}

      <section className="event-content">

        <div>

          <p className="eyebrow">
            ABOUT
          </p>

          <h2>
            About this event
          </h2>

          <p>
            {event.description ||
              "Event details will be added by the organizer."}
          </p>

        </div>

        <aside className="event-info">

          <strong>
            Registration
          </strong>

          <p>
            Open
          </p>

          {event.qrEnabled && (
            <p>
              ✓ QR entry enabled
            </p>
          )}

          {event.volunteerEnabled && (
            <p>
              ✓ Volunteer applications enabled
            </p>
          )}

          {event.certificateEnabled && (
            <p>
              ✓ Certificates enabled
            </p>
          )}

        </aside>

      </section>

    </main>
  );
}