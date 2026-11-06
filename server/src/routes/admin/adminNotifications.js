import express from "express";
import PlatformNotification from "../../models/PlatformNotification.js";
import User from "../../models/User.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";
import { logAdminAction } from "../../utils/auditLogger.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/notifications
 * List platform announcements.
 */
router.get("/", async (req, res) => {
  try {
    const notifications = await PlatformNotification.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .limit(50)
      .lean();

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch notifications: " + error.message });
  }
});

/**
 * POST /api/admin/notifications
 * Create & broadcast platform announcement.
 */
router.post("/", async (req, res) => {
  try {
    const { title, message, type = "ANNOUNCEMENT", targetAudience = "ALL_ORGANIZERS", targetPlan = "" } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Notification title and message are required." });
    }

    // Determine recipients
    let recipientQuery = { role: "ORGANIZER" };
    if (targetAudience === "SUSPENDED_ACCOUNTS") {
      recipientQuery.status = "SUSPENDED";
    }

    const recipients = await User.find(recipientQuery).select("_id").lean();
    const recipientIds = recipients.map((r) => r._id);

    const notification = await PlatformNotification.create({
      title: title.trim(),
      message: message.trim(),
      type,
      targetAudience,
      targetPlan,
      recipients: recipientIds,
      createdBy: req.user._id,
      createdByName: req.user.name || "Super Admin",
      sendEmail: false,
      emailDeliveryCount: 0,
    });

    await logAdminAction({
      actor: req.user,
      action: "NOTIFICATION_DISPATCHED",
      targetEntity: "PlatformNotification",
      targetId: notification._id,
      targetName: notification.title,
      reason: `Broadcasted '${notification.title}' to ${targetAudience} (${recipientIds.length} organizers)`,
      req,
    });

    res.status(201).json({
      success: true,
      message: `Notification broadcasted to ${recipientIds.length} organizers.`,
      notification,
    });
  } catch (error) {
    console.error("Broadcast notification error:", error);
    res.status(500).json({ message: "Could not send notification: " + error.message });
  }
});

export default router;

