import express from "express";
import User from "../models/User.js";
import Event from "../models/Event.js";
import SubscriptionPlan from "../models/SubscriptionPlan.js";
import OrganizerSubscription from "../models/OrganizerSubscription.js";
import Invoice from "../models/Invoice.js";
import SupportTicket from "../models/SupportTicket.js";
import PlatformNotification from "../models/PlatformNotification.js";
import { requireAuth } from "../middleware/auth.js";
import { generateInvoicePdf } from "../utils/invoicePdf.js";

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/organizer/subscription
 * Get organizer's current subscription, usage against limits, and days remaining.
 */
router.get("/subscription", async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: "currentSubscription",
      populate: { path: "plan" },
    });

    if (!user) return res.status(404).json({ message: "Organizer not found." });

    let subscription = user.currentSubscription;

    // Fallback if no subscription attached: assign or create free tier
    if (!subscription) {
      let freePlan = await SubscriptionPlan.findOne({ slug: "free", isActive: true });
      if (!freePlan) {
        freePlan = await SubscriptionPlan.create({
          name: "Free",
          slug: "free",
          monthlyPrice: 0,
          annualPrice: 0,
          limits: { maxEvents: 3, maxParticipantsPerEvent: 100 },
        });
      }

      subscription = await OrganizerSubscription.create({
        organizer: user._id,
        plan: freePlan._id,
        billingCycle: "monthly",
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
      });

      user.currentSubscription = subscription._id;
      await user.save();
      await subscription.populate("plan");
    }

    // Calculate usage
    const eventsCount = await Event.countDocuments({ organizer: user._id });

    const now = Date.now();
    const expiry = new Date(subscription.expiryDate).getTime();
    const daysRemaining = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      subscription: {
        id: subscription._id,
        planName: subscription.plan?.name || "Free",
        planSlug: subscription.plan?.slug || "free",
        billingCycle: subscription.billingCycle,
        status: subscription.status,
        startDate: subscription.startDate,
        expiryDate: subscription.expiryDate,
        daysRemaining,
        limits: subscription.plan?.limits || {
          maxEvents: 3,
          maxParticipantsPerEvent: 100,
          aiFeaturesEnabled: false,
          customBrandingEnabled: false,
          reportPdfEnabled: false,
        },
      },
      usage: {
        eventsCount,
        maxEvents: subscription.plan?.limits?.maxEvents ?? 3,
      },
    });
  } catch (error) {
    console.error("Fetch organizer subscription error:", error);
    res.status(500).json({ message: "Could not fetch subscription." });
  }
});

/**
 * GET /api/organizer/plans
 * List available subscription plans for upgrade.
 */
router.get("/plans", async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch subscription plans." });
  }
});

/**
 * GET /api/organizer/invoices
 * List organizer's own invoices.
 */
router.get("/invoices", async (req, res) => {
  try {
    const invoices = await Invoice.find({ organizer: req.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch invoices." });
  }
});

/**
 * GET /api/organizer/invoices/:id/pdf
 * Download organizer's own invoice vector PDF.
 */
router.get("/invoices/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, organizer: req.userId });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or access denied." });
    }

    const pdfBuffer = await generateInvoicePdf(invoice);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="EVENTRA-Invoice-${invoice.invoiceNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Organizer invoice PDF error:", error);
    res.status(500).json({ message: "Could not render invoice." });
  }
});

/**
 * POST /api/organizer/support
 * Open a new support ticket / complaint.
 */
router.post("/support", async (req, res) => {
  try {
    const {
      category = "General Complaint",
      subject,
      description,
      priority = "MEDIUM",
      attachments = [],
    } = req.body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return res.status(400).json({ message: "Subject and detailed description are required." });
    }

    // Generate safe sequential ticket ID (e.g. EVT-SUP-2026-0001)
    const year = new Date().getFullYear();
    const count = await SupportTicket.countDocuments();
    const ticketNumber = `EVT-SUP-${year}-${String(count + 1).padStart(4, "0")}`;

    // Clean and validate attachments (max 5 attachments, validate structure)
    const validAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 5).map((att) => ({
          name: String(att.name || "attachment").slice(0, 100),
          url: String(att.url || ""),
          fileType: String(att.fileType || "image/png"),
          size: Number(att.size || 0),
        })).filter((att) => att.url.length > 0)
      : [];

    const ticket = await SupportTicket.create({
      ticketNumber,
      organizer: req.userId,
      category,
      subject: subject.trim(),
      description: description.trim(),
      priority: ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority) ? priority : "MEDIUM",
      status: "OPEN",
      attachments: validAttachments,
      unreadByAdmin: true,
      unreadByOrganizer: false,
      replies: [
        {
          sender: req.userId,
          senderName: req.user?.name || "Organizer",
          senderRole: "ORGANIZER",
          message: description.trim(),
          attachments: validAttachments,
        },
      ],
      history: [
        {
          action: "TICKET_CREATED",
          actor: req.userId,
          actorName: req.user?.name || "Organizer",
          newValue: "OPEN",
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: `Support ticket ${ticketNumber} registered successfully. Super Admin has been notified.`,
      ticket,
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ message: "Failed to create support ticket." });
  }
});

/**
 * GET /api/organizer/support
 * List organizer's own support tickets with unread counters.
 */
router.get("/support", async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ organizer: req.userId })
      .select("-internalNotes") // Strictly hide private admin notes
      .sort({ updatedAt: -1 })
      .lean();

    const openCount = tickets.filter((t) => t.status === "OPEN").length;
    const inProgressCount = tickets.filter((t) => ["IN_PROGRESS", "WAITING_FOR_ORGANIZER", "WAITING_FOR_USER"].includes(t.status)).length;
    const resolvedCount = tickets.filter((t) => ["RESOLVED", "CLOSED"].includes(t.status)).length;

    res.json({
      success: true,
      tickets,
      counts: {
        total: tickets.length,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch support tickets." });
  }
});

/**
 * GET /api/organizer/support/:id
 * Get single ticket conversation. Strictly excludes internal admin notes.
 */
router.get("/support/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({ _id: id, organizer: req.userId })
      .select("-internalNotes") // Strictly exclude internalNotes
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found or access denied." });
    }

    // Mark as read by organizer
    if (ticket.unreadByOrganizer) {
      await SupportTicket.updateOne({ _id: id }, { unreadByOrganizer: false });
      ticket.unreadByOrganizer = false;
    }

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch ticket details." });
  }
});

/**
 * POST /api/organizer/support/:id/reply
 * Reply to organizer's own ticket with optional attachments.
 */
router.post("/support/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const ticket = await SupportTicket.findOne({ _id: id, organizer: req.userId });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found or access denied." });
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
      sender: req.userId,
      senderName: req.user?.name || "Organizer",
      senderRole: "ORGANIZER",
      message: message.trim(),
      attachments: validAttachments,
      createdAt: new Date(),
    });

    const previousStatus = ticket.status;
    if (["WAITING_FOR_ORGANIZER", "WAITING_FOR_USER", "RESOLVED"].includes(ticket.status)) {
      ticket.status = "IN_PROGRESS";
      ticket.history.push({
        action: "STATUS_CHANGED",
        actor: req.userId,
        actorName: req.user?.name || "Organizer",
        previousValue: previousStatus,
        newValue: "IN_PROGRESS",
      });
    }

    ticket.unreadByAdmin = true;
    ticket.unreadByOrganizer = false;

    await ticket.save();

    res.json({
      success: true,
      message: "Reply sent to Super Admin.",
      replies: ticket.replies,
      status: ticket.status,
    });
  } catch (error) {
    console.error("Organizer reply error:", error);
    res.status(500).json({ message: "Failed to send reply." });
  }
});

/**
 * GET /api/organizer/notifications
 * Get platform announcements for this organizer.
 */
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await PlatformNotification.find({
      $or: [
        { targetAudience: "ALL_ORGANIZERS" },
        { recipients: req.userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch announcements." });
  }
});

export default router;

