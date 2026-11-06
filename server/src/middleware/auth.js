import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;

    // Fetch user role & status to ensure real-time suspension enforcement
    const user = await User.findById(decoded.userId).select("role status suspension name email");
    if (!user) {
      return res.status(401).json({ message: "Account no longer exists." });
    }

    req.user = user;
    req.userRole = user.role || decoded.role || "ORGANIZER";
    req.userStatus = user.status || "ACTIVE";

    // If user is suspended, block access unless it's a super admin
    if (user.status === "SUSPENDED" && req.userRole !== "SUPER_ADMIN") {
      const reason = user.suspension?.reason || "Terms of service violation";
      const notes = user.suspension?.notes || "";
      const until = user.suspension?.suspendedUntil
        ? ` until ${new Date(user.suspension.suspendedUntil).toLocaleDateString()}`
        : "";
      return res.status(403).json({
        message: `Your organizer account has been suspended${until}. Reason: ${reason}. ${notes ? `Notes: ${notes}. ` : ""}Please contact support@eventra.com for review.`,
        isSuspended: true,
        suspensionReason: reason,
      });
    }

    if (user.status === "DEACTIVATED" && req.userRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact support@eventra.com.",
        isDeactivated: true,
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const role = req.userRole || req.user?.role || "ORGANIZER";
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: "Access denied. Insufficient privileges for this resource.",
      });
    }
    next();
  };
}

export const requireSuperAdmin = requireRole(["SUPER_ADMIN"]);
