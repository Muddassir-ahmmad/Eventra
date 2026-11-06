import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminParticipants() {
  const [participants, setParticipants] = useState([]);
  const [summary, setSummary] = useState({ total: 0, checkedIn: 0, attendanceRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [checkedInFilter, setCheckedInFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchParticipants();
  }, [page, checkedInFilter]);

  async function fetchParticipants() {
    setLoading(true);
    try {
      let url = `/admin/participants?page=${page}&limit=20`;
      if (checkedInFilter !== "all") {
        url += `&checkedIn=${checkedInFilter}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const { data } = await api.get(url);
      setParticipants(data.participants || []);
      setSummary(data.summary || { total: 0, checkedIn: 0, attendanceRate: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load participants.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    fetchParticipants();
  }

  function handleExportCsv() {
    const token = localStorage.getItem("eventra_token");
    const baseUrl = api.defaults.baseURL || "http://localhost:5000/api";
    window.open(`${baseUrl}/admin/participants?format=csv&token=${token}`, "_blank");
  }

  return (
    <AdminLayout title="Global Platform Participants">
      <div>
        {/* KPI Summary Cards */}
        <div className="admin-kpi-grid" style={{ marginBottom: 24 }}>
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Total Registered Attendees</span>
              <span className="admin-kpi-icon">🎓</span>
            </div>
            <div className="admin-kpi-value">{summary.total}</div>
            <div className="admin-kpi-sub">Across all platform events</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Checked-In Attendees</span>
              <span className="admin-kpi-icon">✅</span>
            </div>
            <div className="admin-kpi-value">{summary.checkedIn}</div>
            <div className="admin-kpi-sub">Verified via QR Scanner</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Overall Attendance Rate</span>
              <span className="admin-kpi-icon">📊</span>
            </div>
            <div className="admin-kpi-value">{summary.attendanceRate}%</div>
            <div className="admin-kpi-sub">Check-in vs Total Confirmed</div>
          </div>
        </div>

        {/* Search, Filter & CSV Export Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "9px 14px",
                background: "rgba(18, 24, 40, 0.8)",
                border: "1px solid var(--admin-border)",
                borderRadius: 8,
                color: "#FFF",
                fontSize: "0.85rem",
                width: 260,
                outline: "none",
              }}
            />
            <button type="submit" className="admin-btn admin-btn-secondary" style={{ padding: "8px 16px" }}>
              Search
            </button>
          </form>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={checkedInFilter}
              onChange={(e) => {
                setCheckedInFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "9px 14px",
                background: "rgba(18, 24, 40, 0.8)",
                border: "1px solid var(--admin-border)",
                borderRadius: 8,
                color: "#FFF",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              <option value="all">All Check-in Statuses</option>
              <option value="true">Checked In Only</option>
              <option value="false">Pending Check-in</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="admin-btn admin-btn-secondary"
              style={{ padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span>📥</span> Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="admin-card" style={{ borderColor: "#EF4444", color: "#EF4444", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Participants Table */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Contact</th>
                <th>Registered Event</th>
                <th>Check-in Status</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    Loading attendees...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 40, color: "var(--admin-text-muted)" }}>
                    No participants found.
                  </td>
                </tr>
              ) : (
                participants.map((p) => {
                  const ev = p.event || {};
                  return (
                    <tr key={p._id}>
                      <td>
                        <strong style={{ color: "#FFF" }}>{p.name}</strong>
                        <div style={{ fontSize: "0.76rem", color: "var(--admin-text-sub)" }}>ID: {p._id}</div>
                      </td>
                      <td>
                        <div>{p.email}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--admin-text-sub)" }}>{p.phone || "—"}</div>
                      </td>
                      <td>
                        <strong style={{ color: "var(--admin-primary)" }}>{ev.title || "Untitled Event"}</strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--admin-text-sub)" }}>
                          {ev.date ? new Date(ev.date).toLocaleDateString() : ""}
                        </div>
                      </td>
                      <td>
                        {p.checkedIn ? (
                          <span className="admin-badge admin-badge-success">
                            ✓ CHECKED IN ({p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Yes"})
                          </span>
                        ) : (
                          <span className="admin-badge" style={{ background: "rgba(100, 116, 139, 0.2)", color: "#94A3B8" }}>
                            NOT CHECKED IN
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--admin-text-muted)" }}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="admin-btn admin-btn-secondary"
            >
              Previous
            </button>
            <span style={{ alignSelf: "center", fontSize: "0.85rem", color: "var(--admin-text-muted)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="admin-btn admin-btn-secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

