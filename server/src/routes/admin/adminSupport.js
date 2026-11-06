import express from "express";
import SupportTicket from "../../models/SupportTicket.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";
import { logAdminAction } from "../../utils/auditLogger.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/support
 * List tickets with search and status/priority filters.
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

    const [total, tickets] = await Promise.all([
      SupportTicket.countDocuments(query),
      SupportTicket.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("organizer", "name email organization status")
        .populate("assignedTo", "name email")
        .lean(),
    ]);

    res.json({
      success: true,
      tickets,
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
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message cannot be empty." });
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    ticket.replies.push({
      sender: req.user._id,
      senderName: req.user.name || "Super Admin",
      senderRole: "SUPER_ADMIN",
      message: message.trim(),
      createdAt: new Date(),
    });

    if (ticket.status === "OPEN") {
      ticket.status = "IN_PROGRESS";
    }

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

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (status) {
      ticket.status = status;
      if (status === "RESOLVED") ticket.resolvedAt = new Date();
      if (status === "CLOSED") ticket.closedAt = new Date();
    }

    if (priority) {
      ticket.priority = priority;
    }

    if (internalNote && internalNote.trim()) {
      ticket.internalNotes.push({
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

