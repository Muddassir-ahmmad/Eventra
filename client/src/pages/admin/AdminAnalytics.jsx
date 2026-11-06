import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await api.get("/admin/analytics");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load platform analytics.");
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    const token = localStorage.getItem("eventra_token");
    const baseUrl = api.defaults.baseURL || "http://localhost:5000/api";
    window.open(`${baseUrl}/admin/analytics?format=csv&token=${token}`, "_blank");
  }

  const { timeline = [], categories = [], activeOrganizers = [], popularEvents = [], supportAnalytics = {} } =
    data || {};

  const maxRegistrations = Math.max(...timeline.map((t) => t.registrations), 10);

  return (
    <AdminLayout title="Platform Deep Analytics">
      <div>
        {/* Top Header & CSV Export */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
              Platform Growth &amp; Engagement Intelligence
            </h2>
            <p style={{ color: "var(--admin-text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
              Real-time MongoDB aggregation metrics across organizers, events, attendee check-ins, and support triage.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="admin-btn admin-btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>📥</span> Export Analytics CSV
          </button>
        </div>

        {error && (
          <div className="admin-card" style={{ borderColor: "#EF4444", color: "#EF4444", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--admin-text-muted)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📈</div>
            Running analytics aggregation pipelines...
          </div>
        ) : (
          <>
            {/* 12-Month Growth Trends Chart */}
            <div className="admin-card" style={{ marginBottom: 24 }}>
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-title">12-Month Attendee Registration Velocity</div>
                  <div className="admin-card-subtitle">Monthly registration counts and attendance verification</div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 12,
                  height: 220,
                  padding: "20px 0 10px",
                  borderBottom: "1px solid var(--admin-border)",
                  overflowX: "auto",
                }}
              >
                {timeline.map((item, idx) => {
                  const barHeight = Math.max(12, Math.round((item.registrations / maxRegistrations) * 160));
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        minWidth: 48,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: "0.72rem", color: "var(--admin-text-sub)" }}>
                        {item.registrations}
                      </span>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 32,
                          height: barHeight,
                          background: "linear-gradient(180deg, #6366F1 0%, rgba(99, 102, 241, 0.3) 100%)",
                          borderRadius: "6px 6px 0 0",
                          transition: "height 0.3s ease",
                        }}
                        title={`${item.label}: ${item.registrations} registered, ${item.checkedIn} checked in`}
                      />
                      <span style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)", whiteSpace: "nowrap" }}>
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two-Column Grid: Popular Events & Active Organizers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20, marginBottom: 24 }}>
              {/* Popular Events Leaderboard */}
              <div className="admin-card">
                <div className="admin-card-title" style={{ marginBottom: 14 }}>
                  🏆 Top Events by Registrations
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {popularEvents.map((ev, i) => (
                    <div
                      key={ev._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 800, color: i < 3 ? "#F59E0B" : "var(--admin-text-sub)", fontSize: "0.95rem" }}>
                          #{i + 1}
                        </span>
                        <div>
                          <strong style={{ fontSize: "0.9rem", color: "#FFF", display: "block" }}>{ev.title}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--admin-text-sub)" }}>{ev.category}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ color: "var(--admin-primary)", fontSize: "0.95rem" }}>
                          {ev.totalRegistrations}
                        </strong>
                        <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)" }}>
                          {ev.checkedInCount} checked in
                        </div>
                      </div>
                    </div>
                  ))}
                  {popularEvents.length === 0 && (
                    <div style={{ color: "var(--admin-text-sub)", padding: 20, textAlign: "center" }}>
                      No event registrations recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Active Organizers Leaderboard */}
              <div className="admin-card">
                <div className="admin-card-title" style={{ marginBottom: 14 }}>
                  👑 Most Active Organizers
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {activeOrganizers.map((org, i) => (
                    <div
                      key={org._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 800, color: i < 3 ? "#10B981" : "var(--admin-text-sub)", fontSize: "0.95rem" }}>
                          #{i + 1}
                        </span>
                        <div>
                          <strong style={{ fontSize: "0.9rem", color: "#FFF", display: "block" }}>{org.name}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--admin-text-sub)" }}>
                            {org.organization || org.email}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ color: "#10B981", fontSize: "0.95rem" }}>{org.totalEvents} Events</strong>
                        <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)" }}>
                          {org.publishedEvents} published
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeOrganizers.length === 0 && (
                    <div style={{ color: "var(--admin-text-sub)", padding: 20, textAlign: "center" }}>
                      No organizer events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Support Metrics & Category Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
              {/* Support Performance Card */}
              <div className="admin-card">
                <div className="admin-card-title" style={{ marginBottom: 14 }}>
                  🎧 Support &amp; Complaint Resolution Efficiency
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--admin-text-sub)" }}>AVERAGE RESOLUTION TIME</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#6366F1", marginTop: 4 }}>
                      {supportAnalytics.avgResolutionHours || 0}h
                    </div>
                  </div>
                  <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--admin-text-sub)" }}>RESOLVED COMPLAINTS</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10B981", marginTop: 4 }}>
                      {supportAnalytics.totalResolvedSample || 0}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
                  Resolution time is calculated from the exact timestamp of organizer submission to resolution by Super Admin.
                </div>
              </div>

              {/* Event Categories Breakdown */}
              <div className="admin-card">
                <div className="admin-card-title" style={{ marginBottom: 14 }}>
                  🏷️ Event Categories Distribution
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.map((c) => (
                    <div
                      key={c.category}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 20,
                        background: "rgba(99, 102, 241, 0.12)",
                        border: "1px solid rgba(99, 102, 241, 0.25)",
                        fontSize: "0.85rem",
                        color: "#F8FAFC",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>{c.category}</span>
                      <strong style={{ color: "var(--admin-primary)" }}>{c.count}</strong>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div style={{ color: "var(--admin-text-sub)", padding: 20 }}>No categories recorded.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
