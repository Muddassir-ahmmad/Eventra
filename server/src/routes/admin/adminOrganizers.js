import express from "express";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Event from "../../models/Event.js";
import Registration from "../../models/Registration.js";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import OrganizerSubscription from "../../models/OrganizerSubscription.js";
import AdminAuditLog from "../../models/AdminAuditLog.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";
import { logAdminAction } from "../../utils/auditLogger.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/organizers
 * List organizers with search, filter, sorting, pagination, and real aggregated event counts.
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const { search, status, verificationStatus, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const query = { role: { $in: ["ORGANIZER", "SUPER_ADMIN"] } };

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ name: reg }, { email: reg }, { organization: reg }, { phone: reg }];
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (verificationStatus && verificationStatus !== "ALL") {
      query.verificationStatus = verificationStatus;
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [total, organizers] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select("-password")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate({
          path: "currentSubscription",
          populate: { path: "plan", select: "name slug monthlyPrice limits" },
        })
        .lean(),
    ]);

    // Aggregate event counts and registration counts for these organizers
    const organizerIds = organizers.map((o) => o._id);

    const [eventCountsAgg, regCountsAgg] = await Promise.all([
      Event.aggregate([
        { $match: { organizerId: { $in: organizerIds } } },
        {
          $group: {
            _id: "$organizerId",
            totalEvents: { $sum: 1 },
            publishedEvents: {
              $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
            },
            completedEvents: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
          },
        },
      ]),
      Registration.aggregate([
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "eventInfo",
          },
        },
        { $unwind: "$eventInfo" },
        { $match: { "eventInfo.organizerId": { $in: organizerIds } } },
        {
          $group: {
            _id: "$eventInfo.organizerId",
            totalRegistrations: { $sum: 1 },
            checkedInCount: {
              $sum: { $cond: [{ $eq: ["$checkedIn", true] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const eventCountMap = new Map();
    eventCountsAgg.forEach((item) => eventCountMap.set(String(item._id), item));

    const regCountMap = new Map();
    regCountsAgg.forEach((item) => regCountMap.set(String(item._id), item));

    const enrichedOrganizers = organizers.map((org) => {
      const eStats = eventCountMap.get(String(org._id)) || {
        totalEvents: 0,
        publishedEvents: 0,
        completedEvents: 0,
      };
      const rStats = regCountMap.get(String(org._id)) || {
        totalRegistrations: 0,
        checkedInCount: 0,
      };

      return {
        ...org,
        stats: {
          totalEvents: eStats.totalEvents,
          publishedEvents: eStats.publishedEvents,
          completedEvents: eStats.completedEvents,
          totalRegistrations: rStats.totalRegistrations,
          checkedInCount: rStats.checkedInCount,
        },
      };
    });

    res.json({
      success: true,
      organizers: enrichedOrganizers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List organizers error:", error);
    res.status(500).json({ message: "Could not fetch organizers: " + error.message });
  }
});

/**
 * GET /api/admin/organizers/:id
 * In-depth 360-degree organizer detail page data.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid organizer ID format." });
    }

    const organizer = await User.findById(id)
      .select("-password")
      .populate({
        path: "currentSubscription",
        populate: { path: "plan" },
      })
      .lean();

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    // Hosted events with stats
    const events = await Event.find({ organizerId: id })
      .sort({ createdAt: -1 })
      .lean();

    const eventIds = events.map((e) => e._id);

    // Event registration counts
    const regAgg = await Registration.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $group: {
          _id: "$eventId",
          total: { $sum: 1 },
          checkedIn: { $sum: { $cond: [{ $eq: ["$checkedIn", true] }, 1, 0] } },
        },
      },
    ]);

    const regMap = new Map();
    regAgg.forEach((r) => regMap.set(String(r._id), r));

    const enrichedEvents = events.map((e) => {
      const stats = regMap.get(String(e._id)) || { total: 0, checkedIn: 0 };
      return {
        ...e,
        registrationStats: stats,
      };
    });

    // Transactions
    const transactions = await PaymentTransaction.find({ organizer: id })
      .sort({ createdAt: -1 })
      .lean();

    // Audit logs for this organizer
    const auditLogs = await AdminAuditLog.find({ targetId: String(id) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Subscription history
    const subscriptionHistory = await OrganizerSubscription.find({ organizer: id })
      .populate("plan")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      organizer,
      events: enrichedEvents,
      transactions,
      auditLogs,
      subscriptionHistory,
    });
  } catch (error) {
    console.error("Organizer detail error:", error);
    res.status(500).json({ message: "Could not fetch organizer details." });
  }
});

/**
 * POST /api/admin/organizers/:id/suspend
 * Suspend organizer with reason, optional notes, and expiry date.
 */
router.post("/:id/suspend", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes = "", suspendedUntil = null } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A valid suspension reason is required." });
    }

    const organizer = await User.findById(id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    if (organizer.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Super Admin accounts cannot be suspended." });
    }

    organizer.status = "SUSPENDED";
    organizer.suspension = {
      isSuspended: true,
      reason: reason.trim(),
      notes: notes.trim(),
      suspendedAt: new Date(),
      suspendedUntil: suspendedUntil ? new Date(suspendedUntil) : null,
      suspendedBy: req.user._id,
    };

    await organizer.save();

    await logAdminAction({
      actor: req.user,
      action: "ORGANIZER_SUSPENDED",
      targetEntity: "User",
      targetId: organizer._id,
      targetName: organizer.name,
      reason: reason.trim(),
      metadata: {
        notes: notes.trim(),
        suspendedUntil,
      },
      req,
    });

    res.json({
      success: true,
      message: `Organizer ${organizer.name} has been suspended.`,
      organizer: {
        id: organizer._id,
        name: organizer.name,
        status: organizer.status,
        suspension: organizer.suspension,
      },
    });
  } catch (error) {
    console.error("Suspend organizer error:", error);
    res.status(500).json({ message: "Failed to suspend organizer." });
  }
});

/**
 * POST /api/admin/organizers/:id/reactivate
 * Reactivate a suspended organizer account.
 */
router.post("/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Administrative clearance" } = req.body;

    const organizer = await User.findById(id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    organizer.status = "ACTIVE";
    organizer.suspension = {
      isSuspended: false,
      reason: "",
      notes: "",
      suspendedAt: null,
      suspendedUntil: null,
      suspendedBy: null,
    };
    organizer.reactivatedAt = new Date();
    organizer.reactivatedBy = req.user._id;
    organizer.reactivationReason = reason.trim();

    await organizer.save();

    await logAdminAction({
      actor: req.user,
      action: "ORGANIZER_REACTIVATED",
      targetEntity: "User",
      targetId: organizer._id,
      targetName: organizer.name,
      reason: reason.trim(),
      req,
    });

    res.json({
      success: true,
      message: `Organizer ${organizer.name} has been reactivated.`,
      organizer: {
        id: organizer._id,
        name: organizer.name,
        status: organizer.status,
      },
    });
  } catch (error) {
    console.error("Reactivate organizer error:", error);
    res.status(500).json({ message: "Failed to reactivate organizer." });
  }
});

/**
 * POST /api/admin/organizers/:id/verify
 * Toggle verified badge for an organizer.
 */
router.post("/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const organizer = await User.findById(id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    organizer.verificationStatus =
      organizer.verificationStatus === "VERIFIED" ? "UNVERIFIED" : "VERIFIED";

    await organizer.save();

    await logAdminAction({
      actor: req.user,
      action: organizer.verificationStatus === "VERIFIED" ? "ORGANIZER_VERIFIED" : "ORGANIZER_UNVERIFIED",
      targetEntity: "User",
      targetId: organizer._id,
      targetName: organizer.name,
      reason: "Manual verification toggle by Super Admin",
      req,
    });

    res.json({
      success: true,
      message: `Organizer verification status changed to ${organizer.verificationStatus}.`,
      verificationStatus: organizer.verificationStatus,
    });
  } catch (error) {
    console.error("Toggle verify error:", error);
    res.status(500).json({ message: "Failed to update verification status." });
  }
});

/**
 * PUT /api/admin/organizers/:id/notes
 * Update internal admin notes for an organizer.
 */
router.put("/:id/notes", async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = "" } = req.body;

    const organizer = await User.findById(id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    organizer.adminNotes = String(notes).trim();
    await organizer.save();

    res.json({
      success: true,
      message: "Internal admin notes updated.",
      adminNotes: organizer.adminNotes,
    });
  } catch (error) {
    console.error("Update notes error:", error);
    res.status(500).json({ message: "Failed to update notes." });
  }
});

export default router;

