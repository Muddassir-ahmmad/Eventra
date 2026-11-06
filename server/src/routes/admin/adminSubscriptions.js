import express from "express";
import SubscriptionPlan from "../../models/SubscriptionPlan.js";
import OrganizerSubscription from "../../models/OrganizerSubscription.js";
import User from "../../models/User.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";
import { logAdminAction } from "../../utils/auditLogger.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/subscriptions/plans
 * List all subscription plans.
 */
router.get("/plans", async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch plans: " + error.message });
  }
});

/**
 * POST /api/admin/subscriptions/plans
 * Create a new subscription plan.
 */
router.post("/plans", async (req, res) => {
  try {
    const {
      name,
      slug,
      description = "",
      monthlyPrice = 0,
      annualPrice = 0,
      currency = "INR",
      isActive = true,
      isPopular = false,
      features = [],
      limits = {},
      sortOrder = 0,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Plan name and slug are required." });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const existing = await SubscriptionPlan.findOne({
      $or: [{ slug: cleanSlug }, { name: name.trim() }],
    });
    if (existing) {
      return res.status(409).json({ message: "A plan with this name or slug already exists." });
    }

    const plan = await SubscriptionPlan.create({
      name: name.trim(),
      slug: cleanSlug,
      description: description.trim(),
      monthlyPrice: Number(monthlyPrice) || 0,
      annualPrice: Number(annualPrice) || 0,
      currency,
      isActive,
      isPopular,
      features: Array.isArray(features) ? features : [],
      limits: {
        maxEvents: limits.maxEvents ?? 3,
        maxParticipantsPerEvent: limits.maxParticipantsPerEvent ?? 100,
        aiFeaturesEnabled: Boolean(limits.aiFeaturesEnabled),
        customBrandingEnabled: Boolean(limits.customBrandingEnabled),
        feedbackGatingEnabled: limits.feedbackGatingEnabled ?? true,
        reportPdfEnabled: Boolean(limits.reportPdfEnabled),
        prioritySupport: Boolean(limits.prioritySupport),
      },
      sortOrder: Number(sortOrder) || 0,
    });

    await logAdminAction({
      actor: req.user,
      action: "PLAN_CREATED",
      targetEntity: "SubscriptionPlan",
      targetId: plan._id,
      targetName: plan.name,
      reason: `Created plan ${plan.name} at ₹${plan.monthlyPrice}/mo`,
      req,
    });

    res.status(201).json({ success: true, message: "Subscription plan created.", plan });
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(500).json({ message: "Could not create plan: " + error.message });
  }
});

/**
 * PUT /api/admin/subscriptions/plans/:id
 * Update an existing subscription plan.
 */
router.put("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found." });
    }

    const {
      name,
      description,
      monthlyPrice,
      annualPrice,
      currency,
      isActive,
      isPopular,
      features,
      limits,
      sortOrder,
    } = req.body;

    if (name) plan.name = name.trim();
    if (typeof description === "string") plan.description = description.trim();
    if (monthlyPrice !== undefined) plan.monthlyPrice = Number(monthlyPrice);
    if (annualPrice !== undefined) plan.annualPrice = Number(annualPrice);
    if (currency) plan.currency = currency;
    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (isPopular !== undefined) plan.isPopular = Boolean(isPopular);
    if (Array.isArray(features)) plan.features = features;
    if (limits && typeof limits === "object") {
      plan.limits = {
        ...plan.limits.toObject(),
        ...limits,
      };
    }
    if (sortOrder !== undefined) plan.sortOrder = Number(sortOrder);

    await plan.save();

    await logAdminAction({
      actor: req.user,
      action: "PLAN_UPDATED",
      targetEntity: "SubscriptionPlan",
      targetId: plan._id,
      targetName: plan.name,
      reason: `Updated plan configuration for ${plan.name}`,
      req,
    });

    res.json({ success: true, message: "Plan updated successfully.", plan });
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({ message: "Could not update plan: " + error.message });
  }
});

/**
 * GET /api/admin/subscriptions/organizers
 * List all organizer subscriptions with filter and search.
 */
router.get("/organizers", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const { status, plan } = req.query;
    const query = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (plan && plan !== "ALL") {
      query.plan = plan;
    }

    const [total, subscriptions] = await Promise.all([
      OrganizerSubscription.countDocuments(query),
      OrganizerSubscription.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("organizer", "name email organization status")
        .populate("plan")
        .populate("assignedBy", "name email")
        .lean(),
    ]);

    res.json({
      success: true,
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List subscriptions error:", error);
    res.status(500).json({ message: "Could not fetch subscriptions." });
  }
});

/**
 * POST /api/admin/subscriptions/assign
 * Manually assign or upgrade an organizer's subscription plan (e.g. Complimentary).
 */
router.post("/assign", async (req, res) => {
  try {
    const { organizerId, planId, billingCycle = "monthly", durationDays = 30, adminNotes = "" } = req.body;

    const [organizer, plan] = await Promise.all([
      User.findById(organizerId),
      SubscriptionPlan.findById(planId),
    ]);

    if (!organizer) return res.status(404).json({ message: "Organizer not found." });
    if (!plan) return res.status(404).json({ message: "Subscription plan not found." });

    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = await OrganizerSubscription.create({
      organizer: organizer._id,
      plan: plan._id,
      billingCycle,
      startDate,
      expiryDate,
      status: "ACTIVE",
      assignedBy: req.user._id,
      adminNotes: String(adminNotes).trim(),
      history: [
        {
          action: "ASSIGNED_BY_ADMIN",
          newPlan: plan.name,
          changedBy: req.user._id,
          changedByName: req.user.name,
          notes: String(adminNotes).trim() || `Granted ${durationDays} days access`,
          timestamp: new Date(),
        },
      ],
    });

    organizer.currentSubscription = subscription._id;
    await organizer.save();

    await logAdminAction({
      actor: req.user,
      action: "SUBSCRIPTION_ASSIGNED",
      targetEntity: "OrganizerSubscription",
      targetId: subscription._id,
      targetName: `${organizer.name} (${plan.name})`,
      reason: `Assigned plan ${plan.name} for ${durationDays} days. Notes: ${adminNotes}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: `Successfully assigned ${plan.name} plan to ${organizer.name}.`,
      subscription,
    });
  } catch (error) {
    console.error("Assign subscription error:", error);
    res.status(500).json({ message: "Failed to assign subscription: " + error.message });
  }
});

/**
 * PUT /api/admin/subscriptions/:id/extend
 * Extend subscription expiry date by specified days.
 */
router.put("/:id/extend", async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30, notes = "Extended by admin" } = req.body;

    const subscription = await OrganizerSubscription.findById(id).populate("plan organizer");
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    const currentExpiry = new Date(subscription.expiryDate).getTime() > Date.now()
      ? new Date(subscription.expiryDate)
      : new Date();

    subscription.expiryDate = new Date(currentExpiry.getTime() + Number(days) * 24 * 60 * 60 * 1000);
    subscription.status = "ACTIVE";
    subscription.history.push({
      action: "EXTENDED_BY_ADMIN",
      newPlan: subscription.plan?.name || "Active",
      changedBy: req.user._id,
      changedByName: req.user.name,
      notes: `${notes} (+${days} days)`,
      timestamp: new Date(),
    });

    await subscription.save();

    await logAdminAction({
      actor: req.user,
      action: "SUBSCRIPTION_EXTENDED",
      targetEntity: "OrganizerSubscription",
      targetId: subscription._id,
      targetName: subscription.organizer?.name || "Organizer",
      reason: `Extended subscription by ${days} days until ${subscription.expiryDate.toLocaleDateString()}`,
      req,
    });

    res.json({
      success: true,
      message: `Subscription extended by ${days} days until ${subscription.expiryDate.toLocaleDateString()}.`,
      expiryDate: subscription.expiryDate,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Extend subscription error:", error);
    res.status(500).json({ message: "Failed to extend subscription." });
  }
});

/**
 * PUT /api/admin/subscriptions/:id/cancel
 * Cancel an active subscription.
 */
router.put("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Cancelled by admin" } = req.body;

    const subscription = await OrganizerSubscription.findById(id).populate("organizer");
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    subscription.status = "CANCELLED";
    subscription.history.push({
      action: "CANCELLED_BY_ADMIN",
      changedBy: req.user._id,
      changedByName: req.user.name,
      notes: reason,
      timestamp: new Date(),
    });

    await subscription.save();

    await logAdminAction({
      actor: req.user,
      action: "SUBSCRIPTION_CANCELLED",
      targetEntity: "OrganizerSubscription",
      targetId: subscription._id,
      targetName: subscription.organizer?.name || "Organizer",
      reason,
      req,
    });

    res.json({
      success: true,
      message: "Subscription has been cancelled.",
      status: subscription.status,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ message: "Failed to cancel subscription." });
  }
});

export default router;

