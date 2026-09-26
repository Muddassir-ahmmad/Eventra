import React, { useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PublicEvent from "./pages/PublicEvent";
import EventRegistration from "./pages/EventRegistration";
import EventRegistrations from "./pages/EventRegistrations";
import EventManage from "./pages/EventManage";
import EventBuilder from "./pages/EventBuilder";
import api, { setToken } from "./api";

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
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />

        {/* Create new event */}
        <Route
          path="/create-event"
          element={<RequireAuth><EventBuilder /></RequireAuth>}
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
          element={<RequireAuth><EventManage /></RequireAuth>}
        />

        {/* Edit existing event using SAME event builder */}
        <Route
          path="/dashboard/events/:eventId/edit"
          element={<RequireAuth><EventBuilder /></RequireAuth>}
        />

        {/* Organizer registrations */}
        <Route
          path="/dashboard/events/:eventId/registrations"
          element={<RequireAuth><EventRegistrations /></RequireAuth>}
        />
        <Route
          path="/dashboard/events/:eventId/attendance"
          element={<RequireAuth><ModuleIntegration name="Attendance" /></RequireAuth>}
        />
        <Route
          path="/dashboard/events/:eventId/report"
          element={<RequireAuth><ModuleIntegration name="Post-event report" /></RequireAuth>}
        />
        <Route
          path="/dashboard/events/:eventId/certificates"
          element={<RequireAuth><ModuleIntegration name="Certificates" /></RequireAuth>}
        />
      </Routes>
    </>
  );
}

function RequireAuth({ children }) {
  return localStorage.getItem("eventra_token")
    ? children
    : <Navigate to="/login" replace />;
}

function ModuleIntegration({ name }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  React.useEffect(() => {
    api.get(`/events/${eventId}`)
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load event.");
        if (err.response?.status === 401) {
          setToken(null);
          navigate("/login", { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [eventId, navigate]);

  return (
    <main className="center-page">
      {loading ? <p>Loading event...</p> : error ? <h1>{error}</h1> : <>
        <h1>{name}</h1>
        <p>This module is not connected yet.</p>
      </>}
      <Link className="button button-primary" to={`/dashboard/events/${eventId}`}>
        Back to Event
      </Link>
    </main>
  );
}


function OrganizerHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem("eventra_token");

  function logout() {
    setToken(null);
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