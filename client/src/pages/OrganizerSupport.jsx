import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const CATEGORIES = [
  "Account/Login Issues",
  "Event Creation Problems",
  "Event Publishing Issues",
  "Registration Problems",
  "QR Scanner and Attendance",
  "Certificate Generation",
  "Email Notifications",
  "Post-Event Reports",
  "Billing and Payments",
  "Feature Request",
  "General Complaint",
  "Other",
];

const PRIORITIES = [
  { label: "Low", value: "LOW", color: "#64748B" },
  { label: "Medium", value: "MEDIUM", color: "#3B82F6" },
  { label: "High", value: "HIGH", color: "#F59E0B" },
  { label: "Urgent", value: "URGENT", color: "#EF4444" },
];

export default function OrganizerSupport() {
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);

  // New Ticket Form State
  const [formData, setFormData] = useState({
    subject: "",
    category: "General Complaint",
    priority: "MEDIUM",
    description: "",
    attachments: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState("");

  // Reply Form State
  const [replyMessage, setReplyMessage] = useState("");
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/organizer/support");
      setTickets(data.tickets || []);
      setCounts(data.counts || { total: 0, open: 0, inProgress: 0, resolved: 0 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  }

  async function openTicketConversation(ticketId) {
    setTicketDetailLoading(true);
    setReplyError("");
    setReplyMessage("");
    setReplyAttachment(null);
    try {
      const { data } = await api.get(`/organizer/support/${ticketId}`);
      setSelectedTicket(data.ticket);
      // Mark as read in local list
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, unreadByOrganizer: false } : t))
      );
    } catch (err) {
      setError("Could not load ticket conversation.");
    } finally {
      setTicketDetailLoading(false);
    }
  }

  function handleFileSelect(e, isReply = false) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      const attObj = {
        name: file.name,
        url: base64,
        fileType: file.type,
        size: file.size,
      };

      if (isReply) {
        setReplyAttachment(attObj);
      } else {
        setFormData((prev) => ({ ...prev, attachments: [attObj] }));
        setAttachmentPreview(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateTicket(e) {
    e.preventDefault();
    setFormError("");

    if (!formData.subject.trim()) {
      setFormError("Please enter a subject.");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Please provide a detailed description.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/organizer/support", formData);
      setCreateModalOpen(false);
      setFormData({
        subject: "",
        category: "General Complaint",
        priority: "MEDIUM",
        description: "",
        attachments: [],
      });
      setAttachmentPreview("");
      fetchTickets();
      if (data.ticket?._id) {
        openTicketConversation(data.ticket._id);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to submit support complaint.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setReplying(true);
    setReplyError("");
    try {
      const payload = {
        message: replyMessage.trim(),
        attachments: replyAttachment ? [replyAttachment] : [],
      };
      const { data } = await api.post(`/organizer/support/${selectedTicket._id}/reply`, payload);
      setSelectedTicket((prev) => ({
        ...prev,
        replies: data.replies,
        status: data.status,
      }));
      setReplyMessage("");
      setReplyAttachment(null);
      fetchTickets();
    } catch (err) {
      setReplyError(err.response?.data?.message || "Failed to send message.");
    } finally {
      setReplying(false);
    }
  }

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (filterTab === "OPEN" && t.status !== "OPEN") return false;
    if (
      filterTab === "IN_PROGRESS" &&
      !["IN_PROGRESS", "WAITING_FOR_ORGANIZER", "WAITING_FOR_USER"].includes(t.status)
    )
      return false;
    if (filterTab === "RESOLVED" && !["RESOLVED", "CLOSED"].includes(t.status)) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNum = t.ticketNumber?.toLowerCase().includes(term);
      const matchSub = t.subject?.toLowerCase().includes(term);
      const matchCat = t.category?.toLowerCase().includes(term);
      if (!matchNum && !matchSub && !matchCat) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "32px 20px" }}>
      {/* Top Breadcrumb & Return */}
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/dashboard"
          style={{ color: "#6366F1", textDecoration: "none", fontSize: "0.88rem", fontWeight: 600 }}
        >
          ← Return to Dashboard
        </Link>
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          borderRadius: 16,
          padding: "28px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 18,
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.8rem" }}>🎧</span>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "var(--text-color, #1e293b)" }}>
              Talk to Admin &amp; Support Desk
            </h1>
          </div>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: "0.9rem", maxWidth: 640 }}>
            Direct communication channel with EVENTRA Platform Super Administrators. Submit complaints, report issues, request assistance, and track ticket status in real-time.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateModalOpen(true);
            setFormError("");
          }}
          className="button button-primary"
          style={{ padding: "12px 22px", fontSize: "0.95rem", fontWeight: 700 }}
        >
          ＋ Create New Complaint
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
            Total Tickets
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>{counts.total}</div>
        </div>
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "#3B82F6", fontWeight: 600, textTransform: "uppercase" }}>
            Open Tickets
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#3B82F6", marginTop: 4 }}>{counts.open}</div>
        </div>
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "#F59E0B", fontWeight: 600, textTransform: "uppercase" }}>
            In Progress
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#F59E0B", marginTop: 4 }}>{counts.inProgress}</div>
        </div>
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "#10B981", fontWeight: 600, textTransform: "uppercase" }}>
            Resolved
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10B981", marginTop: 4 }}>{counts.resolved}</div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: filterTab === tab ? "#6366F1" : "#E2E8F0",
                background: filterTab === tab ? "rgba(99, 102, 241, 0.1)" : "#FFF",
                color: filterTab === tab ? "#6366F1" : "#475569",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by ticket #, subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #CBD5E1",
            fontSize: "0.85rem",
            width: 240,
            outline: "none",
          }}
        />
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Tickets List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          Loading your support tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📬</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 6px" }}>No Support Complaints Found</h3>
          <p style={{ margin: "0 0 16px", fontSize: "0.88rem" }}>
            {searchTerm ? "No tickets match your search criteria." : "You have not submitted any support complaints."}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="button button-primary"
            style={{ fontSize: "0.88rem" }}
          >
            ＋ Open Support Complaint
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredTickets.map((t) => {
            const isResolved = ["RESOLVED", "CLOSED"].includes(t.status);
            const isUnread = t.unreadByOrganizer;

            return (
              <div
                key={t._id}
                onClick={() => openTicketConversation(t._id)}
                className="card"
                style={{
                  padding: "18px 22px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  borderLeft: isUnread
                    ? "4px solid #6366F1"
                    : isResolved
                    ? "4px solid #10B981"
                    : "4px solid #3B82F6",
                  transition: "box-shadow 0.15s, transform 0.15s",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: "0.95rem", color: "#1E293B" }}>{t.ticketNumber}</strong>
                    {isUnread && (
                      <span
                        style={{
                          background: "#6366F1",
                          color: "#FFF",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        NEW ADMIN REPLY
                      </span>
                    )}
                    <span
                      style={{
                        background: "#F1F5F9",
                        color: "#475569",
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      {t.category}
                    </span>
                  </div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 700, color: "#0F172A" }}>
                    {t.subject}
                  </h4>
                  <div style={{ fontSize: "0.8rem", color: "#64748B" }}>
                    Updated {new Date(t.updatedAt).toLocaleDateString()} at {new Date(t.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 12,
                      background:
                        t.priority === "URGENT"
                          ? "rgba(239, 68, 68, 0.15)"
                          : t.priority === "HIGH"
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(59, 130, 246, 0.15)",
                      color:
                        t.priority === "URGENT"
                          ? "#DC2626"
                          : t.priority === "HIGH"
                          ? "#D97706"
                          : "#2563EB",
                    }}
                  >
                    ● {t.priority}
                  </span>

                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: 12,
                      background: isResolved
                        ? "rgba(16, 185, 129, 0.15)"
                        : t.status === "OPEN"
                        ? "rgba(59, 130, 246, 0.15)"
                        : "rgba(245, 158, 11, 0.15)",
                      color: isResolved
                        ? "#059669"
                        : t.status === "OPEN"
                        ? "#2563EB"
                        : "#D97706",
                    }}
                  >
                    {t.status.replace(/_/g, " ")}
                  </span>

                  <span style={{ color: "#94A3B8", fontSize: "1.2rem" }}>➔</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE COMPLAINT MODAL */}
      {createModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px 24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>Create Support Complaint</h3>
                <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: "0.85rem" }}>
                  Super Admin will review and respond directly to your ticket.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94A3B8" }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTicket}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  COMPLAINT SUBJECT *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Issue generating attendee certificates"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    CATEGORY *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    PRIORITY *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                    }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  DETAILED DESCRIPTION *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Explain what happened, steps to reproduce, or what assistance you need..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Screenshot / File attachment */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  OPTIONAL ATTACHMENT / SCREENSHOT (Max 5MB)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileSelect(e, false)}
                  style={{ fontSize: "0.85rem", color: "#64748B" }}
                />
                {attachmentPreview && (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={attachmentPreview}
                      alt="Attachment preview"
                      style={{ maxHeight: 120, borderRadius: 8, border: "1px solid #CBD5E1" }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="button button-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="button button-primary"
                >
                  {submitting ? "Submitting Ticket..." : "Submit Complaint →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET CONVERSATION DRAWER / MODAL */}
      {selectedTicket && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 680,
              background: "#FFF",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-8px 0 25px rgba(0,0,0,0.2)",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#F8FAFC",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: "1.1rem" }}>{selectedTicket.ticketNumber}</strong>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: "rgba(99, 102, 241, 0.1)",
                      color: "#6366F1",
                    }}
                  >
                    {selectedTicket.category}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: "rgba(245, 158, 11, 0.1)",
                      color: "#D97706",
                    }}
                  >
                    ● {selectedTicket.priority}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1E293B" }}>
                  {selectedTicket.subject}
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => openTicketConversation(selectedTicket._id)}
                  title="Refresh conversation"
                  style={{
                    background: "none",
                    border: "1px solid #CBD5E1",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  🔄
                </button>
                <button
                  onClick={() => setSelectedTicket(null)}
                  style={{ background: "none", border: "none", fontSize: "1.6rem", cursor: "pointer", color: "#64748B" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                background: "#F8FAFC",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Original Complaint Header */}
              <div
                style={{
                  background: "#FFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#64748B", marginBottom: 8 }}>
                  <span>ORIGINAL COMPLAINT</span>
                  <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.6, color: "#1E293B", whiteSpace: "pre-wrap" }}>
                  {selectedTicket.description}
                </p>

                {selectedTicket.attachments?.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedTicket.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#F1F5F9",
                          padding: "6px 10px",
                          borderRadius: 6,
                          fontSize: "0.78rem",
                          color: "#475569",
                          textDecoration: "none",
                        }}
                      >
                        📎 {att.name || `Attachment ${i + 1}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Thread Messages */}
              {(selectedTicket.replies || []).slice(1).map((msg, i) => {
                const isAdmin = msg.senderRole === "SUPER_ADMIN";

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isAdmin ? "flex-start" : "flex-end",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        background: isAdmin ? "#FFF" : "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                        color: isAdmin ? "#1E293B" : "#FFF",
                        border: isAdmin ? "1px solid #E2E8F0" : "none",
                        borderRadius: 12,
                        padding: "14px 16px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          fontSize: "0.75rem",
                          color: isAdmin ? "#6366F1" : "rgba(255,255,255,0.8)",
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                      >
                        <span>{isAdmin ? "🛡️ Super Admin" : "You (Organizer)"}</span>
                        <span style={{ fontWeight: 400, opacity: 0.8 }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {msg.message}
                      </p>

                      {msg.attachments?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {msg.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-block",
                                marginTop: 4,
                                color: isAdmin ? "#6366F1" : "#E0E7FF",
                                fontSize: "0.78rem",
                                textDecoration: "underline",
                              }}
                            >
                              📎 {att.name || "View Attachment"}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Composer Box */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #E2E8F0", background: "#FFF" }}>
              {["RESOLVED", "CLOSED"].includes(selectedTicket.status) ? (
                <div style={{ textAlign: "center", padding: "10px", color: "#10B981", fontSize: "0.85rem", fontWeight: 600 }}>
                  ✅ This support complaint has been marked as {selectedTicket.status}. Send a reply below if you wish to reopen it.
                </div>
              ) : null}

              {replyError && (
                <div style={{ color: "#EF4444", fontSize: "0.82rem", marginBottom: 8 }}>{replyError}</div>
              )}

              <form onSubmit={handleSendReply}>
                <textarea
                  rows={3}
                  required
                  placeholder="Type your reply to Super Admin..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: "0.88rem",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.8rem",
                      color: "#64748B",
                      cursor: "pointer",
                    }}
                  >
                    <span>📎 Attach Screenshot</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileSelect(e, true)}
                      style={{ display: "none" }}
                    />
                  </label>

                  {replyAttachment && (
                    <span style={{ fontSize: "0.75rem", color: "#10B981" }}>
                      ✓ {replyAttachment.name}
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={replying}
                    className="button button-primary"
                    style={{ padding: "8px 18px", fontSize: "0.85rem" }}
                  >
                    {replying ? "Sending..." : "Send Reply →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

