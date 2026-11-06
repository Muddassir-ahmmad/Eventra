import express from "express";
import SupportTicket from "../../models/SupportTicket.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";
import { logAdminAction } from "../../utils/auditLogger.js";
import emailService from "../../services/emailService.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/support
 * List tickets with search, status/priority filters, and summary metrics.
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const { status, priority, category, search } = req.query;
    const query = {};

    if (status && status !== "ALL") query.status = status;
    if (priority && priority !== "ALL") query.priority = priority;
    if (category && category !== "ALL") query.category = category;

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ ticketNumber: reg }, { subject: reg }, { description: reg }];
    }

    const [
      total,
      tickets,
      totalCount,
      openCount,
      newCount,
      inProgressCount,
      urgentCount,
      resolvedCount,
    ] = await Promise.all([
      SupportTicket.countDocuments(query),
      SupportTicket.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("organizer", "name email organization status")
        .populate("assignedTo", "name email")
        .lean(),
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: "OPEN" }),
      SupportTicket.countDocuments({ unreadByAdmin: true }),
      SupportTicket.countDocuments({ status: { $in: ["IN_PROGRESS", "WAITING_FOR_ORGANIZER", "WAITING_FOR_USER"] } }),
      SupportTicket.countDocuments({ priority: "URGENT", status: { $in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_ORGANIZER"] } }),
      SupportTicket.countDocuments({ status: { $in: ["RESOLVED", "CLOSED"] } }),
    ]);

    res.json({
      success: true,
      tickets,
      summary: {
        total: totalCount,
        open: openCount,
        newComplaints: newCount,
        inProgress: inProgressCount,
        urgent: urgentCount,
        resolved: resolvedCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List tickets error:", error);
    res.status(500).json({ message: "Could not fetch tickets." });
  }
});

/**
 * GET /api/admin/support/:id
 * Single ticket with replies and internal notes.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findById(id)
      .populate("organizer", "name email organization phone status")
      .populate("assignedTo", "name email")
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Mark as read by admin
    if (ticket.unreadByAdmin) {
      await SupportTicket.updateOne({ _id: id }, { unreadByAdmin: false });
      ticket.unreadByAdmin = false;
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error("Ticket detail error:", error);
    res.status(500).json({ message: "Could not fetch ticket details." });
  }
});

/**
 * POST /api/admin/support/:id/reply
 * Admin replies to an organizer ticket.
 */
router.post("/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message cannot be empty." });
    }

    const ticket = await SupportTicket.findById(id).populate("organizer", "name email");
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const validAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 5).map((att) => ({
          name: String(att.name || "attachment").slice(0, 100),
          url: String(att.url || ""),
          fileType: String(att.fileType || "image/png"),
          size: Number(att.size || 0),
        })).filter((att) => att.url.length > 0)
      : [];

    ticket.replies.push({
      sender: req.user._id,
      senderName: req.user.name || "Super Admin",
      senderRole: "SUPER_ADMIN",
      message: message.trim(),
      attachments: validAttachments,
      createdAt: new Date(),
    });

    const previousStatus = ticket.status;
    ticket.status = "WAITING_FOR_ORGANIZER";
    ticket.unreadByOrganizer = true;
    ticket.unreadByAdmin = false;

    ticket.history.push({
      action: "ADMIN_REPLIED",
      actor: req.user._id,
      actorName: req.user.name || "Super Admin",
      previousValue: previousStatus,
      newValue: "WAITING_FOR_ORGANIZER",
    });

    await ticket.save();

    await logAdminAction({
      actor: req.user,
      action: "TICKET_REPLIED",
      targetEntity: "SupportTicket",
      targetId: ticket._id,
      targetName: ticket.ticketNumber,
      reason: `Replied to ticket ${ticket.ticketNumber}`,
      req,
    });

    // Optionally dispatch notification email to organizer
    if (emailService.isConfigured() && ticket.organizer?.email) {
      emailService.sendMail({
        to: ticket.organizer.email,
        recipientName: ticket.organizer.name,
        subject: `[${ticket.ticketNumber}] Support Update: ${ticket.subject}`,
        html: `
          <div style="font-family:sans-serif;padding:20px;color:#333;line-height:1.6;">
            <h2 style="color:#6366f1;">Super Admin Replied to Your Request</h2>
            <p>Hello <strong>${ticket.organizer.name}</strong>,</p>
            <p>Our executive administration team has posted a reply regarding ticket <strong>${ticket.ticketNumber}</strong>:</p>
            <div style="background:#f8fafc;border-left:4px solid #6366f1;padding:14px;border-radius:4px;margin:16px 0;">
              ${message.trim().replace(/\n/g, "<br>")}
            </div>
            <p>You can review this ticket and continue the conversation directly in your Organizer Dashboard under <strong>Talk to Admin</strong>.</p>
            <p style="color:#64748b;font-size:0.85rem;margin-top:24px;">— EVENTRA Platform Administration</p>
          </div>
        `,
        text: `Super Admin replied to your ticket ${ticket.ticketNumber}:\n\n${message.trim()}\n\nLog in to your EVENTRA dashboard to review.`,
        emailType: "support_reply_notification",
      }).catch((e) => console.log("Support email dispatch note:", e.message));
    }

    res.json({
      success: true,
      message: "Reply sent successfully.",
      replies: ticket.replies,
      status: ticket.status,
    });
  } catch (error) {
    console.error("Reply ticket error:", error);
    res.status(500).json({ message: "Failed to send reply." });
  }
});

/**
 * PUT /api/admin/support/:id/status
 * Update status, priority, or add internal notes.
 */
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, internalNote } = req.body;

    const ticket = await SupportTicket.findById(id).populate("organizer", "name email");
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const previousStatus = ticket.status;
    const previousPriority = ticket.priority;

    if (status && status !== ticket.status) {
      ticket.status = status;
      if (status === "RESOLVED") ticket.resolvedAt = new Date();
      if (status === "CLOSED") ticket.closedAt = new Date();
      ticket.unreadByOrganizer = true;

      ticket.history.push({
        action: "STATUS_CHANGED",
        actor: req.user._id,
        actorName: req.user.name || "Super Admin",
        previousValue: previousStatus,
        newValue: status,
      });
    }

    if (priority && priority !== ticket.priority) {
      ticket.priority = priority;
      ticket.history.push({
        action: "PRIORITY_CHANGED",
        actor: req.user._id,
        actorName: req.user.name || "Super Admin",
        previousValue: previousPriority,
        newValue: priority,
      });
    }

    if (internalNote && internalNote.trim()) {
      ticket.internalNotes.push({
        author: req.user._id,
        authorName: req.user.name || "Super Admin",
        note: internalNote.trim(),
        createdAt: new Date(),
      });
    }

    await ticket.save();

    await logAdminAction({
      actor: req.user,
      action: "TICKET_STATUS_UPDATED",
      targetEntity: "SupportTicket",
      targetId: ticket._id,
      targetName: ticket.ticketNumber,
      reason: `Updated status to ${ticket.status}, priority ${ticket.priority}`,
      req,
    });

    res.json({
      success: true,
      message: "Ticket updated successfully.",
      status: ticket.status,
      priority: ticket.priority,
      internalNotes: ticket.internalNotes,
    });
  } catch (error) {
    console.error("Update ticket status error:", error);
    res.status(500).json({ message: "Failed to update ticket status." });
  }
});

export default router;

