import express from "express";
import AdminAuditLog from "../../models/AdminAuditLog.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/audit-logs
 * Immutable read-only audit log feed.
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const { action, targetEntity, search } = req.query;
    const query = {};

    if (action && action !== "ALL") query.action = action;
    if (targetEntity && targetEntity !== "ALL") query.targetEntity = targetEntity;

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ actorName: reg }, { targetName: reg }, { reason: reg }, { action: reg }];
    }

    const [total, logs] = await Promise.all([
      AdminAuditLog.countDocuments(query),
      AdminAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    res.status(500).json({ message: "Could not fetch audit logs." });
  }
});

export default router;

