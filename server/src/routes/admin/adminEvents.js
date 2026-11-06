import express from "express";
import mongoose from "mongoose";
import Event from "../../models/Event.js";
import Registration from "../../models/Registration.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";
import { logAdminAction } from "../../utils/auditLogger.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/events
 * List platform events with search, filters, and registration stats.
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const { search, status, moderationStatus, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const query = {};

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ title: reg }, { slug: reg }, { venue: reg }, { category: reg }];
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (moderationStatus && moderationStatus !== "ALL") {
      query.moderationStatus = moderationStatus;
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [total, events] = await Promise.all([
      Event.countDocuments(query),
      Event.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate("organizerId", "name email organization status verificationStatus")
        .populate("moderatedBy", "name email")
        .lean(),
    ]);

    // Aggregate registration counts for these events
    const eventIds = events.map((e) => e._id);
    const regAgg = await Registration.aggregate([
      { $match: { eventId: { $in: eventIds }, status: "confirmed" } },
      {
        $group: {
          _id: "$eventId",
          total: { $sum: 1 },
          checkedIn: { $sum: { $cond: [{ $eq: ["$checkedIn", true] }, 1, 0] } },
        },
      },
    ]);

    const regMap = new Map();
    regAgg.forEach((item) => regMap.set(String(item._id), item));

    const enrichedEvents = events.map((event) => {
      const r = regMap.get(String(event._id)) || { total: 0, checkedIn: 0 };
      return {
        ...event,
        organizer: event.organizerId,
        registrationsCount: r.total,
        checkedInCount: r.checkedIn,
        attendanceRate: r.total > 0 ? Math.round((r.checkedIn / r.total) * 100) : 0,
      };
    });

    res.json({
      success: true,
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List admin events error:", error);
    res.status(500).json({ message: "Could not fetch events: " + error.message });
  }
});

/**
 * GET /api/admin/events/:id
 * Detailed event inspector.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID." });
    }

    const event = await Event.findById(id)
      .populate("organizerId", "name email organization phone status")
      .populate("moderatedBy", "name email")
      .lean();

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    event.organizer = event.organizerId;

    const [registrations, regStats] = await Promise.all([
      Registration.find({ eventId: id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Registration.aggregate([
        { $match: { eventId: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: "$ticketType",
            count: { $sum: 1 },
            checkedIn: { $sum: { $cond: [{ $eq: ["$checkedIn", true] }, 1, 0] } },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      event,
      registrations,
      ticketBreakdown: regStats,
    });
  } catch (error) {
    console.error("Admin event detail error:", error);
    res.status(500).json({ message: "Could not fetch event details." });
  }
});

/**
 * POST /api/admin/events/:id/moderate
 * Super Admin Moderation: APPROVE, REJECT, FLAGGED, UNPUBLISH
 */
router.post("/:id/moderate", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason = "" } = req.body;

    const validActions = ["APPROVE", "REJECT", "FLAG", "UNPUBLISH"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: "Invalid moderation action." });
    }

    if ((action === "REJECT" || action === "FLAG") && !reason.trim()) {
      return res.status(400).json({ message: "A reason is mandatory when rejecting or flagging an event." });
    }

    const event = await Event.findById(id).populate("organizerId", "name email");
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    event.organizer = event.organizerId;

    let statusUpdate = event.status;
    let moderationStatusUpdate = event.moderationStatus;

    if (action === "APPROVE") {
      moderationStatusUpdate = "APPROVED";
    } else if (action === "REJECT") {
      moderationStatusUpdate = "REJECTED";
      statusUpdate = "closed";
    } else if (action === "FLAG") {
      moderationStatusUpdate = "FLAGGED";
    } else if (action === "UNPUBLISH") {
      statusUpdate = "draft";
    }

    event.moderationStatus = moderationStatusUpdate;
    event.moderationReason = reason.trim();
    event.moderatedBy = req.user._id;
    event.moderatedAt = new Date();
    event.status = statusUpdate;

    await event.save();

    await logAdminAction({
      actor: req.user,
      action: `EVENT_${action}`,
      targetEntity: "Event",
      targetId: event._id,
      targetName: event.title,
      reason: reason.trim(),
      metadata: {
        previousStatus: event.status,
        newStatus: statusUpdate,
        moderationStatus: moderationStatusUpdate,
      },
      req,
    });

    res.json({
      success: true,
      message: `Event '${event.title}' successfully marked as ${action}.`,
      event: {
        id: event._id,
        title: event.title,
        status: event.status,
        moderationStatus: event.moderationStatus,
        moderationReason: event.moderationReason,
      },
    });
  } catch (error) {
    console.error("Moderate event error:", error);
    res.status(500).json({ message: "Failed to moderate event." });
  }
});

export default router;

