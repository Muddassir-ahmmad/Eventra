import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../api";

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Plan Edit / Create Modal State
  const [planModal, setPlanModal] = useState({
    open: false,
    isEdit: false,
    id: null,
    name: "",
    slug: "",
    description: "",
    monthlyPrice: 0,
    annualPrice: 0,
    maxEvents: 3,
    maxParticipantsPerEvent: 100,
    aiFeaturesEnabled: false,
    reportPdfEnabled: false,
    prioritySupport: false,
    isPopular: false,
  });

  // Assign Plan Modal State
  const [assignModal, setAssignModal] = useState({
    open: false,
    organizerEmail: "",
    planId: "",
    durationDays: 30,
    billingCycle: "monthly",
    adminNotes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [pRes, sRes] = await Promise.all([
        api.get("/admin/subscriptions/plans"),
        api.get("/admin/subscriptions/organizers"),
      ]);
      setPlans(pRes.data.plans || []);
      setSubscriptions(sRes.data.subscriptions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load subscriptions data.");
    } finally {
      setLoading(false);
    }
  }

  function openCreatePlan() {
    setPlanModal({
      open: true,
      isEdit: false,
      id: null,
      name: "",
      slug: "",
      description: "",
      monthlyPrice: 0,
      annualPrice: 0,
      maxEvents: 3,
      maxParticipantsPerEvent: 100,
      aiFeaturesEnabled: false,
      reportPdfEnabled: false,
      prioritySupport: false,
      isPopular: false,
    });
  }

  function openEditPlan(plan) {
    setPlanModal({
      open: true,
      isEdit: true,
      id: plan._id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      monthlyPrice: plan.monthlyPrice || 0,
      annualPrice: plan.annualPrice || 0,
      maxEvents: plan.limits?.maxEvents ?? 3,
      maxParticipantsPerEvent: plan.limits?.maxParticipantsPerEvent ?? 100,
      aiFeaturesEnabled: plan.limits?.aiFeaturesEnabled || false,
      reportPdfEnabled: plan.limits?.reportPdfEnabled || false,
      prioritySupport: plan.limits?.prioritySupport || false,
      isPopular: plan.isPopular || false,
    });
  }

  async function savePlan(e) {
    e.preventDefault();
    try {
      const payload = {
        name: planModal.name,
        slug: planModal.slug,
        description: planModal.description,
        monthlyPrice: Number(planModal.monthlyPrice),
        annualPrice: Number(planModal.annualPrice),
        isPopular: planModal.isPopular,
        limits: {
          maxEvents: Number(planModal.maxEvents),
          maxParticipantsPerEvent: Number(planModal.maxParticipantsPerEvent),
          aiFeaturesEnabled: planModal.aiFeaturesEnabled,
          reportPdfEnabled: planModal.reportPdfEnabled,
          prioritySupport: planModal.prioritySupport,
        },
      };

      if (planModal.isEdit) {
        await api.put(`/admin/subscriptions/plans/${planModal.id}`, payload);
      } else {
        await api.post("/admin/subscriptions/plans", payload);
      }

      setPlanModal({ ...planModal, open: false });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save plan.");
    }
  }

  async function handleAssignSubmit(e) {
    e.preventDefault();
    try {
      // Find organizer by email
      const orgRes = await api.get(`/admin/organizers?search=${encodeURIComponent(assignModal.organizerEmail.trim())}`);
      const found = orgRes.data.organizers?.[0];
      if (!found) {
        alert("No organizer found with that email address.");
        return;
      }

      await api.post("/admin/subscriptions/assign", {
        organizerId: found._id,
        planId: assignModal.planId,
        billingCycle: assignModal.billingCycle,
        durationDays: Number(assignModal.durationDays),
        adminNotes: assignModal.adminNotes,
      });

      alert(`Successfully assigned plan to ${found.name}`);
      setAssignModal({ open: false, organizerEmail: "", planId: "", durationDays: 30, billingCycle: "monthly", adminNotes: "" });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign subscription.");
    }
  }

  async function extendSubscription(subId) {
    const days = prompt("How many days would you like to extend this subscription?", "30");
    if (!days || isNaN(days)) return;

    try {
      await api.put(`/admin/subscriptions/${subId}/extend`, { days: Number(days) });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to extend subscription.");
    }
  }

  async function cancelSubscription(subId) {
    if (!window.confirm("Are you sure you want to cancel this active subscription?")) return;
    try {
      await api.put(`/admin/subscriptions/${subId}/cancel`, { reason: "Cancelled by Super Admin" });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel subscription.");
    }
  }

  return (
    <AdminLayout title="Subscription & Plan Architecture">
      {/* Plans Section Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Subscription Plans ({plans.length})</h3>
          <p style={{ color: "var(--admin-text-sub)", fontSize: "0.82rem", margin: "4px 0 0" }}>
            Configurable tiers stored in MongoDB. Limits dynamically enforce event quotas across the platform.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setAssignModal({ ...assignModal, open: true, planId: plans[0]?._id || "" })}
            className="admin-btn admin-btn-secondary"
          >
            🎁 Assign Complimentary Plan
          </button>
          <button onClick={openCreatePlan} className="admin-btn admin-btn-primary">
            ＋ Create New Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ borderColor: "var(--admin-accent-rose)", marginBottom: 20 }}>
          <p style={{ color: "var(--admin-accent-rose)", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 36 }}>
        {plans.map((p) => (
          <div
            key={p._id}
            className="admin-card"
            style={{
              position: "relative",
              border: p.isPopular ? "2px solid var(--admin-primary)" : "1px solid var(--admin-border)",
            }}
          >
            {p.isPopular && (
              <span
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "var(--admin-primary)",
                  color: "#FFF",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 12,
                  textTransform: "uppercase",
                }}
              >
                POPULAR
              </span>
            )}

            <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>{p.name}</div>
            <div style={{ color: "var(--admin-text-sub)", fontSize: "0.8rem", marginTop: 4 }}>
              {p.description || "Platform access tier"}
            </div>

            <div style={{ margin: "18px 0" }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--admin-accent-emerald)" }}>
                ₹{p.monthlyPrice}
              </span>
              <span style={{ color: "var(--admin-text-sub)", fontSize: "0.82rem" }}> / month</span>
              {p.annualPrice > 0 && (
                <div style={{ fontSize: "0.78rem", color: "var(--admin-text-sub)" }}>
                  or ₹{p.annualPrice} / year
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--admin-border)", paddingTop: 14, fontSize: "0.82rem" }}>
              <div style={{ marginBottom: 6 }}>
                <strong>Events:</strong> {p.limits?.maxEvents === -1 ? "Unlimited" : p.limits?.maxEvents}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Max Attendees/Event:</strong>{" "}
                {p.limits?.maxParticipantsPerEvent === -1 ? "Unlimited" : p.limits?.maxParticipantsPerEvent}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>AI Poster Generator:</strong> {p.limits?.aiFeaturesEnabled ? "✓ Enabled" : "✕ Disabled"}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>12-Section PDF Report:</strong> {p.limits?.reportPdfEnabled ? "✓ Enabled" : "✕ Disabled"}
              </div>
            </div>

            <div style={{ marginTop: 18, borderTop: "1px solid var(--admin-border)", paddingTop: 12 }}>
              <button
                onClick={() => openEditPlan(p)}
                className="admin-btn admin-btn-secondary"
                style={{ width: "100%", justifyContent: "center", fontSize: "0.82rem" }}
              >
                ✏️ Edit Plan Limits
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Active Subscriptions Table */}
      <div className="admin-card">
        <div className="admin-card-title">Active Organizer Subscriptions ({subscriptions.length})</div>
        <div className="admin-card-subtitle">Live subscription records with expiry dates and administrative override tools</div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Organizer</th>
                <th>Plan Name</th>
                <th>Cycle</th>
                <th>Start Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: 24, color: "var(--admin-text-sub)" }}>
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.organizer?.name || "N/A"}</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>{s.organizer?.email}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.plan?.name || "Free"}</td>
                    <td style={{ textTransform: "capitalize" }}>{s.billingCycle}</td>
                    <td>{new Date(s.startDate).toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(s.expiryDate).toLocaleDateString()}</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--admin-text-sub)" }}>
                        {new Date(s.expiryDate).getTime() < Date.now() ? "⚠️ Expired" : "Active"}
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${s.status === "ACTIVE" ? "admin-badge-active" : "admin-badge-warning"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => extendSubscription(s._id)}
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          title="Extend Expiry Date"
                        >
                          ⏳ Extend
                        </button>
                        {s.status === "ACTIVE" && (
                          <button
                            onClick={() => cancelSubscription(s._id)}
                            className="admin-btn admin-btn-danger"
                            style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          >
                            ✕ Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Edit / Create Modal */}
      {planModal.open && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                {planModal.isEdit ? `✏️ Edit Plan: ${planModal.name}` : "＋ Create New Plan"}
              </h3>
              <button
                onClick={() => setPlanModal({ ...planModal, open: false })}
                style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={savePlan}>
              <div className="admin-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Plan Name</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      required
                      value={planModal.name}
                      onChange={(e) => setPlanModal({ ...planModal, name: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Plan Slug (lowercase)</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      required
                      disabled={planModal.isEdit}
                      value={planModal.slug}
                      onChange={(e) => setPlanModal({ ...planModal, slug: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Monthly Price (₹ INR)</label>
                    <input
                      type="number"
                      min="0"
                      className="admin-form-input"
                      required
                      value={planModal.monthlyPrice}
                      onChange={(e) => setPlanModal({ ...planModal, monthlyPrice: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Annual Price (₹ INR)</label>
                    <input
                      type="number"
                      min="0"
                      className="admin-form-input"
                      value={planModal.annualPrice}
                      onChange={(e) => setPlanModal({ ...planModal, annualPrice: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Max Events (-1 for Unlimited)</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={planModal.maxEvents}
                      onChange={(e) => setPlanModal({ ...planModal, maxEvents: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Max Attendees/Event (-1 for Unlimited)</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={planModal.maxParticipantsPerEvent}
                      onChange={(e) => setPlanModal({ ...planModal, maxParticipantsPerEvent: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Description</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={planModal.description}
                    onChange={(e) => setPlanModal({ ...planModal, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={planModal.aiFeaturesEnabled}
                      onChange={(e) => setPlanModal({ ...planModal, aiFeaturesEnabled: e.target.checked })}
                    />
                    Enable AI Features
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={planModal.reportPdfEnabled}
                      onChange={(e) => setPlanModal({ ...planModal, reportPdfEnabled: e.target.checked })}
                    />
                    Enable 12-Section PDF Report
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setPlanModal({ ...planModal, open: false })}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {assignModal.open && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>🎁 Assign Complimentary Subscription</h3>
              <button
                onClick={() => setAssignModal({ ...assignModal, open: false })}
                style={{ background: "transparent", border: "none", color: "#FFF", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Organizer Email</label>
                  <input
                    type="email"
                    required
                    placeholder="organizer@sahyadri.edu.in"
                    className="admin-form-input"
                    value={assignModal.organizerEmail}
                    onChange={(e) => setAssignModal({ ...assignModal, organizerEmail: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Select Plan to Grant</label>
                  <select
                    className="admin-select"
                    style={{ width: "100%" }}
                    value={assignModal.planId}
                    onChange={(e) => setAssignModal({ ...assignModal, planId: e.target.value })}
                  >
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (₹{p.monthlyPrice}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Duration</label>
                  <select
                    className="admin-select"
                    style={{ width: "100%" }}
                    value={assignModal.durationDays}
                    onChange={(e) => setAssignModal({ ...assignModal, durationDays: e.target.value })}
                  >
                    <option value="30">30 Days (1 Month)</option>
                    <option value="90">90 Days (Quarterly)</option>
                    <option value="180">180 Days (Half-Year)</option>
                    <option value="365">365 Days (1 Full Year)</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Admin Reason / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Approved for IEEE College Student Branch"
                    className="admin-form-input"
                    value={assignModal.adminNotes}
                    onChange={(e) => setAssignModal({ ...assignModal, adminNotes: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setAssignModal({ ...assignModal, open: false })}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Grant Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

