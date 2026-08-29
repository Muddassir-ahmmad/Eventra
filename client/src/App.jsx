import React, { useState } from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PublicEvent from "./pages/PublicEvent";
import EventRegistration from "./pages/EventRegistration";
import EventRegistrations from "./pages/EventRegistrations";
import EventManage from "./pages/EventManage";
import EventBuilder from "./pages/EventBuilder";

export default function App() {
  const location = useLocation();

  // Public participant pages should not show organizer navigation.
  const publicPage =
    location.pathname.startsWith("/events/");

  return (
    <>
      {!publicPage && <OrganizerHeader />}

      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Organizer authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Organizer dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Create new event */}
        <Route
          path="/create-event"
          element={<EventBuilder />}
        />

        {/* Public participant event page */}
        <Route
          path="/events/:slug"
          element={<PublicEvent />}
        />

        {/* Participant registration */}
        <Route
          path="/events/:slug/register"
          element={<EventRegistration />}
        />

        {/* Organizer event management */}
        <Route
          path="/dashboard/events/:eventId"
          element={<EventManage />}
        />

        {/* Edit existing event using SAME event builder */}
        <Route
          path="/dashboard/events/:eventId/edit"
          element={<EventBuilder />}
        />

        {/* Organizer registrations */}
        <Route
          path="/dashboard/events/:eventId/registrations"
          element={<EventRegistrations />}
        />
      </Routes>
    </>
  );
}


function OrganizerHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem("eventra_token");

  function logout() {
    localStorage.removeItem("eventra_token");
    navigate("/login");
  }

  return (
    <header className="app-header">
      <div className="header-inner">

        {/* Logo */}
        <Link
          className="brand"
          to="/"
        >
          EVENT<span>RA</span>
        </Link>

        {token ? (
          <>
            {/* Organizer navigation */}
            <nav className="main-nav">

              <Link to="/dashboard">
                Dashboard
              </Link>

              <Link to="/dashboard">
                My Events
              </Link>

            </nav>

            {/* Organizer profile */}
            <div className="profile-wrap">

              <button
                className="profile-button"
                onClick={() => setOpen(!open)}
              >
                <span className="avatar">
                  M
                </span>

                <span className="profile-name">
                  Organizer
                </span>

                <span>
                  ⌄
                </span>
              </button>

              {open && (
                <div className="profile-menu">

                  <div className="profile-menu-head">
                    <strong>
                      Organizer Account
                    </strong>

                    <span>
                      EVENTRA Organizer
                    </span>
                  </div>

                  <button
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                  >
                    Settings
                  </button>

                  <button
                    className="danger-item"
                    onClick={logout}
                  >
                    Logout
                  </button>

                </div>
              )}

            </div>
          </>
        ) : (

          <nav className="main-nav">

            <Link to="/login">
              Organizer Login
            </Link>

            <Link
              className="header-cta"
              to="/register"
            >
              Get Started
            </Link>

          </nav>

        )}

      </div>
    </header>
  );
}


function Home() {
  return (
    <main className="landing">

      <section className="landing-hero">

        <div className="hero-content">

          <div className="hero-badge">
            ✦ SMART EVENT MANAGEMENT
          </div>

          <h1>
            Your event.
            <br />
            <span>
              One powerful platform.
            </span>
          </h1>

          <p>
            Create, publish and manage events
            with registration, tickets, QR entry,
            volunteers and certificates —
            all from one place.
          </p>

          <div className="hero-actions">

            <Link
              className="button button-primary"
              to="/register"
            >
              Create an Event
            </Link>

            <Link
              className="button button-ghost"
              to="/login"
            >
              Organizer Login
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}