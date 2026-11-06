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
import CertificateManager from "./pages/CertificateManager";
import EmailManager from "./pages/EmailManager";
import EventFeedback from "./pages/EventFeedback";
import PublicFeedback from "./pages/PublicFeedback";
import PostEventReport from "./pages/PostEventReport";
import TicketPass from "./pages/TicketPass";
import AttendanceDashboard from "./pages/AttendanceDashboard";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import Terms from "./pages/Terms";
import ProfileSettings from "./pages/ProfileSettings";

// Super Admin Console Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminBootstrap from "./pages/admin/AdminBootstrap";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizers from "./pages/admin/AdminOrganizers";
import AdminOrganizerDetail from "./pages/admin/AdminOrganizerDetail";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminSettings from "./pages/admin/AdminSettings";

export default function App() {
  const location = useLocation();

  // Public participant and admin pages should not show standard organizer navigation.
  const publicPage =
    location.pathname.startsWith("/events/") ||
    location.pathname.startsWith("/tickets/") ||
    location.pathname.startsWith("/feedback/") ||
    location.pathname.startsWith("/terms") ||
    location.pathname.startsWith("/participant") ||
    location.pathname.startsWith("/admin");

  return (
    <>
      {!publicPage && <OrganizerHeader />}

      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Participant dashboard & tickets portal */}
        <Route path="/participant/dashboard" element={<ParticipantDashboard />} />
        <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
        <Route path="/my-tickets" element={<ParticipantDashboard />} />

        {/* Organizer authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Legal & Terms */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/terms-and-conditions" element={<Terms />} />

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

        {/* Digital ticket pass view */}
        <Route
          path="/tickets/:registrationId"
          element={<TicketPass />}
        />

        {/* Public participant feedback survey */}
        <Route
          path="/events/:eventId/feedback"
          element={<PublicFeedback />}
        />
        <Route
          path="/feedback/:token"
          element={<PublicFeedback />}
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

        {/* Organizer attendance and fast QR check-in */}
        <Route
          path="/dashboard/events/:eventId/attendance"
          element={<AttendanceDashboard />}
        />

        {/* Organizer certificates */}
        <Route
          path="/dashboard/events/:eventId/certificates"
          element={<CertificateManager />}
        />

        {/* Organizer email delivery management */}
        <Route
          path="/dashboard/events/:eventId/emails"
          element={<EmailManager />}
        />

        {/* Organizer participant feedback analytics */}
        <Route
          path="/dashboard/events/:eventId/feedback"
          element={<EventFeedback />}
        />

        {/* Organizer post-event report studio */}
        <Route
          path="/dashboard/events/:eventId/report"
          element={<PostEventReport />}
        />

        {/* Organizer profile & account settings */}
        <Route
          path="/dashboard/settings"
          element={<ProfileSettings />}
        />
        <Route
          path="/dashboard/profile"
          element={<ProfileSettings />}
        />
        <Route
          path="/settings"
          element={<ProfileSettings />}
        />

        {/* Super Admin Executive Console Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/bootstrap" element={<AdminBootstrap />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/organizers" element={<AdminOrganizers />} />
        <Route path="/admin/organizers/:id" element={<AdminOrganizerDetail />} />
        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/billing" element={<AdminBilling />} />
        <Route path="/admin/invoices" element={<AdminInvoices />} />
        <Route path="/admin/support" element={<AdminSupport />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Routes>
    </>
  );
}

function OrganizerHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem("eventra_token");
  const userName = localStorage.getItem("eventra_user_name") || "Organizer";
  const userInitial = userName[0] ? userName[0].toUpperCase() : "O";

  function logout() {
    localStorage.removeItem("eventra_token");
    localStorage.removeItem("eventra_user_name");
    navigate("/login");
  }

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo */}
        <Link className="brand" to="/">
          EVENT<span>RA</span>
        </Link>

        {token ? (
          <>
            {/* Organizer navigation */}
            <nav className="main-nav">
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/dashboard">My Events</Link>
            </nav>

            {/* Organizer profile */}
            <div className="profile-wrap">
              <button
                className="profile-button"
                onClick={() => setOpen(!open)}
              >
                <span className="avatar">{userInitial}</span>
                <span className="profile-name">{userName}</span>
                <span>⌄</span>
              </button>

              {open && (
                <div className="profile-menu">
                  <div className="profile-menu-head">
                    <strong>{userName}</strong>
                    <span>EVENTRA Organizer</span>
                  </div>
                  <button onClick={() => { setOpen(false); navigate("/dashboard/settings"); }}>
                    👤 Profile Settings
                  </button>
                  <button onClick={() => { setOpen(false); navigate("/dashboard/settings"); }}>
                    🔒 Change Password
                  </button>
                  <button className="danger-item" onClick={logout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <nav className="main-nav">
            <Link to="/login">Organizer Login</Link>
            <Link className="header-cta" to="/register">
              Get Started
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

function Home() {
  const token = typeof window !== "undefined" ? localStorage.getItem("eventra_token") : null;

  const features = [
    {
      step: "01",
      title: "Smart Event Studio",
      desc: "Comprehensive 9-step builder with AI & vector poster generator, custom fields, ticket tiers, and instant slug publishing.",
    },
    {
      step: "02",
      title: "Digital Pass & QR Tickets",
      desc: "Automated vector PDF tickets with encrypted QR tokens delivered directly to participant inboxes and instant print passes.",
    },
    {
      step: "03",
      title: "Fast Attendance Scanner",
      desc: "Live camera barcode scanning, multi-field search, manual check-in toggle, and real-time attendance analytics.",
    },
    {
      step: "04",
      title: "Feedback-Gated Certificates",
      desc: "Anti-fraud certificate generation gated by attendance verification and feedback survey completion with direct PDF export.",
    },
    {
      step: "05",
      title: "Closure & Feedback Automation",
      desc: "One-click event closure triggers automated cryptographic feedback request emails and real-time rating dashboards.",
    },
    {
      step: "06",
      title: "Executive Post-Event Reports",
      desc: "12-section multi-page vector PDF reports with running headers, footers, KPI metrics, and attendance analysis.",
    },
  ];

  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">✦ SMART EVENT MANAGEMENT PLATFORM</div>
          <h1>
            Your event.
            <br />
            <span>One powerful platform.</span>
          </h1>
          <p>
            Create, publish and manage end-to-end events with registration, digital tickets,
            QR entry, feedback surveys, automated certificates, and comprehensive post-event reporting.
          </p>
          <div className="hero-actions">
            {token ? (
              <>
                <Link className="button button-primary" to="/create-event">
                  ✦ Create New Event
                </Link>
                <Link className="button button-ghost" to="/dashboard">
                  Organizer Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link className="button button-primary" to="/register">
                  Get Started Free
                </Link>
                <Link className="button button-ghost" to="/login">
                  Organizer Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="landing-features">
        {features.map((f) => (
          <div key={f.step} className="landing-feature">
            <span>STEP {f.step}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", padding: "28px 24px", textAlign: "center", fontSize: "0.82rem", color: "#94a3b8", background: "rgba(9, 13, 22, 0.9)" }}>
        <p style={{ margin: 0 }}>
          © 2026{" "}
          <Link
            to="/admin/login"
            style={{
              color: "inherit",
              textDecoration: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title=""
          >
            EVENTRA
          </Link>{" "}
          Smart Event Management Platform · <Link to="/terms" style={{ color: "#818cf8", textDecoration: "underline" }}>Terms &amp; Conditions</Link>
        </p>
      </footer>
    </main>
  );
}
