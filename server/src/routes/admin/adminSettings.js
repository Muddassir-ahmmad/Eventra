import express from "express";
import PlatformSettings from "../../models/PlatformSettings.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";
import { logAdminAction } from "../../utils/auditLogger.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/settings
 * Fetch platform settings.
 */
router.get("/", async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne().lean();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch platform settings." });
  }
});

/**
 * PUT /api/admin/settings
 * Update platform settings.
 */
router.put("/", async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings();
    }

    const {
      platformName,
      supportEmail,
      contactPhone,
      eventModerationPolicy,
      defaultPlanSlug,
      subscriptionGracePeriodDays,
      maintenanceMode,
      maintenanceMessage,
      paymentGateway,
    } = req.body;

    if (platformName) settings.platformName = platformName.trim();
    if (supportEmail) settings.supportEmail = supportEmail.trim();
    if (contactPhone) settings.contactPhone = contactPhone.trim();
    if (eventModerationPolicy) settings.eventModerationPolicy = eventModerationPolicy;
    if (defaultPlanSlug) settings.defaultPlanSlug = defaultPlanSlug.trim();
    if (subscriptionGracePeriodDays !== undefined) {
      settings.subscriptionGracePeriodDays = Number(subscriptionGracePeriodDays) || 7;
    }
    if (maintenanceMode !== undefined) settings.maintenanceMode = Boolean(maintenanceMode);
    if (maintenanceMessage) settings.maintenanceMessage = maintenanceMessage.trim();

    if (paymentGateway && typeof paymentGateway === "object") {
      settings.paymentGateway = {
        ...settings.paymentGateway.toObject(),
        provider: paymentGateway.provider || settings.paymentGateway.provider,
        isSandbox: paymentGateway.isSandbox !== undefined ? Boolean(paymentGateway.isSandbox) : settings.paymentGateway.isSandbox,
        keyId: paymentGateway.keyId ? String(paymentGateway.keyId).trim() : settings.paymentGateway.keyId,
        webhookConfigured: paymentGateway.webhookConfigured !== undefined ? Boolean(paymentGateway.webhookConfigured) : settings.paymentGateway.webhookConfigured,
      };
    }

    settings.updatedBy = req.user._id;
    await settings.save();

    await logAdminAction({
      actor: req.user,
      action: "SETTINGS_UPDATED",
      targetEntity: "PlatformSettings",
      targetId: String(settings._id),
      targetName: "Platform Settings",
      reason: "Updated system settings and configurations",
      req,
    });

    res.json({
      success: true,
      message: "Platform settings updated successfully.",
      settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: "Failed to update settings: " + error.message });
  }
});

export default router;

