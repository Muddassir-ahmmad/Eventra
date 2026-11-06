import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import api, { setToken } from "../../api";
import "../../admin.css";

export default function AdminLayout({ children, title = "Super Admin Console" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    try {
      const { data } = await api.get("/auth/me");
      if (data.user?.role !== "SUPER_ADMIN") {
        setAccessDenied(true);
      } else {
        setAdminUser(data.user);
      }
    } catch (err) {
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem("eventra_token");
    localStorage.removeItem("eventra_user_name");
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="admin-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>🛡️</div>
          <p style={{ color: "var(--admin-text-muted)" }}>Verifying Super Admin Authorization...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="admin-shell" style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="admin-card" style={{ maxWidth: 500, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>Access Denied</h2>
          <p style={{ color: "var(--admin-text-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 24 }}>
            This platform zone is strictly restricted to authenticated <strong>SUPER_ADMIN</strong> personnel.
            Your account does not possess executive administration credentials.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/dashboard" className="admin-btn admin-btn-secondary">
              ← Return to Organizer Dashboard
            </Link>
            <Link to="/admin/bootstrap" className="admin-btn admin-btn-primary">
              ⚡ Super Admin Bootstrap
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Overview", path: "/admin", icon: "📊" },
    { label: "Organizer Management", path: "/admin/organizers", icon: "👥" },
    { label: "All Events", path: "/admin/events", icon: "🎟️" },
    { label: "Billing & Payments", path: "/admin/billing", icon: "💰", badge: "DEV" },
    { label: "Subscription Plans", path: "/admin/subscriptions", icon: "💳", badge: "DEV" },
    { label: "Analytics", path: "/admin/analytics", icon: "📈" },
    { label: "Support & Complaints", path: "/admin/support", icon: "🎧" },
    { label: "Notifications", path: "/admin/notifications", icon: "📢" },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: "📜" },
    { label: "Platform Settings", path: "/admin/settings", icon: "⚙️" },
  ];

  return (
    <div className="admin-shell">
      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <Link to="/admin" className="admin-brand-logo">
            <span>🛡️</span> EVENTRA
          </Link>
          <span className="admin-brand-badge">Super Admin</span>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "rgba(245, 158, 11, 0.2)",
                    color: "#F59E0B",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-avatar">
            {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="admin-user-meta">
            <div className="admin-user-name">{adminUser?.name || "Super Admin"}</div>
            <div className="admin-user-role">Platform Owner</div>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <h2>{title}</h2>
          </div>

          <div className="admin-topbar-actions">
            <Link to="/dashboard" className="admin-btn admin-btn-secondary" style={{ fontSize: "0.8rem" }}>
              Switch to Organizer View ➔
            </Link>
            <button onClick={handleLogout} className="admin-btn admin-btn-danger" style={{ fontSize: "0.8rem" }}>
              Logout
            </button>
          </div>
        </header>

        {/* Content View */}
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}

