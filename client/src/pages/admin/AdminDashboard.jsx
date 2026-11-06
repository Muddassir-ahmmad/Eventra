import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await api.get("/admin/dashboard/stats");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin dashboard analytics.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Platform Operations Overview">
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📊</div>
          <p style={{ color: "var(--admin-text-muted)" }}>Running MongoDB real-time aggregation queries...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Platform Operations Overview">
        <div className="admin-card" style={{ borderColor: "rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.05)" }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error}</p>
        </div>
      </AdminLayout>
    );
  }

  const { kpis, charts, recent } = data || {};
  const timeline = charts?.timeline || [];

  // Find max revenue for scaling bar chart
  const maxRevenue = Math.max(...timeline.map((t) => t.revenue), 1000);

  return (
    <AdminLayout title="Executive Platform Overview">
      {/* KPI Cards Row 1: Organizers & Platform */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Total Organizers</span>
            <span className="admin-kpi-icon">👥</span>
          </div>
          <div className="admin-kpi-value">{kpis?.organizers?.total || 0}</div>
          <div className="admin-kpi-sub">
            <span className="admin-trend-badge admin-trend-positive">
              {kpis?.organizers?.active || 0} Active
            </span>
            <span>• {kpis?.organizers?.suspended || 0} Suspended</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Total Events</span>
            <span className="admin-kpi-icon">🎟️</span>
          </div>
          <div className="admin-kpi-value">{kpis?.events?.total || 0}</div>
          <div className="admin-kpi-sub">
            <span className="admin-trend-badge admin-trend-positive">
              {kpis?.events?.published || 0} Published
            </span>
            <span>• {kpis?.events?.completed || 0} Completed</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Total Participants</span>
            <span className="admin-kpi-icon">🎓</span>
          </div>
          <div className="admin-kpi-value">{kpis?.participants?.total || 0}</div>
          <div className="admin-kpi-sub">
            <span className="admin-trend-badge admin-trend-positive">
              {kpis?.participants?.checkedIn || 0} Checked In ({kpis?.participants?.attendanceRate || 0}%)
            </span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Active Subscriptions</span>
            <span className="admin-kpi-icon">💳</span>
          </div>
          <div className="admin-kpi-value">{kpis?.subscriptions?.active || 0}</div>
          <div className="admin-kpi-sub">
            <span className="admin-trend-badge admin-trend-neutral">
              {kpis?.subscriptions?.expired || 0} Expired
            </span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Total Gross Revenue</span>
            <span className="admin-kpi-icon">💰</span>
          </div>
          <div className="admin-kpi-value" style={{ color: "var(--admin-accent-emerald)" }}>
            ₹{(kpis?.revenue?.totalCollected || 0).toLocaleString()}
          </div>
          <div className="admin-kpi-sub">
            <span>Net: ₹{(kpis?.revenue?.net || 0).toLocaleString()}</span>
            <span>• This Mo: ₹{(kpis?.revenue?.thisMonth || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="admin-charts-grid">
        {/* Monthly Revenue Bar Chart */}
        <div className="admin-card">
          <div className="admin-card-title">Monthly Platform Revenue Trend</div>
          <div className="admin-card-subtitle">Real aggregation of verified subscription payments across the last 12 months</div>

          <div className="admin-bar-chart">
            {timeline.map((item, idx) => {
              const heightPct = Math.round((item.revenue / maxRevenue) * 100);
              return (
                <div key={idx} className="admin-bar-col" title={`${item.name}: ₹${item.revenue.toLocaleString()}`}>
                  <div className="admin-bar-fill" style={{ height: `${Math.max(6, heightPct)}%` }}></div>
                  <span className="admin-bar-label">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Plan Distribution */}
        <div className="admin-card">
          <div className="admin-card-title">Subscription Distribution</div>
          <div className="admin-card-subtitle">Organizer distribution across tiers</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
            {(kpis?.subscriptions?.distribution || []).map((plan, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{plan.name}</span>
                <span className="admin-badge admin-badge-active" style={{ fontSize: "0.8rem" }}>
                  {plan.count} active
                </span>
              </div>
            ))}
            {(!kpis?.subscriptions?.distribution || kpis.subscriptions.distribution.length === 0) && (
              <p style={{ color: "var(--admin-text-sub)", fontSize: "0.84rem" }}>No active subscriptions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Recent Billing Transactions */}
        <div className="admin-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="admin-card-title">Recent Transactions</div>
            <Link to="/admin/billing" className="admin-btn admin-btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
              View All ➔
            </Link>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Organizer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(recent?.transactions || []).map((t) => (
                  <tr key={t._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.transactionId}</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>{t.planName}</div>
                    </td>
                    <td>{t.organizer?.name || "N/A"}</td>
                    <td style={{ fontWeight: 700 }}>₹{t.amount.toLocaleString()}</td>
                    <td>
                      <span className={`admin-badge ${t.status === "SUCCESS" ? "admin-badge-active" : "admin-badge-warning"}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!recent?.transactions || recent.transactions.length === 0) && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "var(--admin-text-sub)", padding: 20 }}>
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Admin Audit Activity Feed */}
        <div className="admin-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="admin-card-title">Platform Audit Trail</div>
            <Link to="/admin/audit-logs" className="admin-btn admin-btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
              Full Log ➔
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(recent?.activities || []).map((act) => (
              <div
                key={act._id}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: "var(--admin-primary)" }}>{act.action}</span>
                  <span style={{ color: "var(--admin-text-sub)", marginLeft: 6 }}>
                    on {act.targetEntity} {act.targetName ? `(${act.targetName})` : ""}
                  </span>
                  {act.reason && (
                    <div style={{ fontSize: "0.76rem", color: "var(--admin-text-muted)", marginTop: 2 }}>
                      Reason: {act.reason}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--admin-text-sub)", whiteSpace: "nowrap" }}>
                  {new Date(act.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {(!recent?.activities || recent.activities.length === 0) && (
              <p style={{ color: "var(--admin-text-sub)", fontSize: "0.84rem", textAlign: "center", padding: 20 }}>
                No recent admin activity recorded.
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

