import AdminAuditLog from "../models/AdminAuditLog.js";

/**
 * Safely logs a sensitive admin action into MongoDB.
 * Never throws an uncaught error to prevent breaking the primary transaction.
 */
export async function logAdminAction({
  actor,
  action,
  targetEntity,
  targetId = "",
  targetName = "",
  reason = "",
  metadata = {},
  req = null,
}) {
  try {
    const actorId = actor?._id || actor?.id || (typeof actor === "string" ? actor : null);
    const actorName = actor?.name || "Super Admin";
    const actorEmail = actor?.email || "";
    const actorRole = actor?.role || "SUPER_ADMIN";

    let ipAddress = "";
    let userAgent = "";
    if (req) {
      ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
      userAgent = req.headers["user-agent"] || "";
    }

    // Clean metadata to ensure no passwords or secrets are ever recorded in audit logs
    const sanitizedMetadata = { ...metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.jwt;
    delete sanitizedMetadata.secret;
    delete sanitizedMetadata.currentPassword;
    delete sanitizedMetadata.newPassword;

    await AdminAuditLog.create({
      actor: actorId,
      actorName,
      actorEmail,
      actorRole,
      action,
      targetEntity,
      targetId: String(targetId || ""),
      targetName: String(targetName || ""),
      reason: String(reason || ""),
      metadata: sanitizedMetadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to write admin audit log:", error.message);
  }
}

