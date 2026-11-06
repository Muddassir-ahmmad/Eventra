import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Certificate from "../models/Certificate.js";
import SupportTicket from "../models/SupportTicket.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import SubscriptionPlan from "../models/SubscriptionPlan.js";
import OrganizerSubscription from "../models/OrganizerSubscription.js";
import { requireAuth } from "../middleware/auth.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { seedDefaultPlansAndSettings } from "../utils/seedDefaults.js";

const router = express.Router();

function createToken(userId, role = "ORGANIZER") {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, organization, phone } = req.body;

    if (!name || typeof email !== "string" || !email.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Ensure role is ALWAYS ORGANIZER on public registration - Never SUPER_ADMIN
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      organization: organization || "",
      phone: phone ? String(phone).trim() : "",
      role: "ORGANIZER",
      status: "ACTIVE",
      verificationStatus: "UNVERIFIED",
    });

    // Auto-assign default Free subscription plan if available
    try {
      const freePlan = await SubscriptionPlan.findOne({ slug: "free", isActive: true });
      if (freePlan) {
        const sub = await OrganizerSubscription.create({
          organizer: user._id,
          plan: freePlan._id,
          billingCycle: "monthly",
          startDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year free
          status: "ACTIVE",
        });
        user.currentSubscription = sub._id;
        await user.save();
      }
    } catch (subErr) {
      console.warn("Could not auto-bind free subscription:", subErr.message);
    }

    const token = createToken(user._id.toString(), "ORGANIZER");

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        role: "ORGANIZER",
        status: "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Role-based status check: block suspended or deactivated organizers
    if (user.status === "SUSPENDED" && user.role !== "SUPER_ADMIN") {
      const untilStr = user.suspension?.suspendedUntil
        ? ` until ${new Date(user.suspension.suspendedUntil).toLocaleDateString()}`
        : "";
      return res.status(403).json({
        message: `Your organizer account has been suspended${untilStr}. Reason: ${user.suspension?.reason || "Terms of service review"}. Please contact support@eventra.com.`,
        isSuspended: true,
        suspensionReason: user.suspension?.reason,
      });
    }

    if (user.status === "DEACTIVATED" && user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Your organizer account has been permanently deactivated. Please contact support@eventra.com.",
        isDeactivated: true,
      });
    }

    const userRole = user.role || "ORGANIZER";
    const token = createToken(user._id.toString(), userRole);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        role: userRole,
        status: user.status || "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Controlled Super Admin Bootstrap Endpoint
router.post("/bootstrap-super-admin", async (req, res) => {
  try {
    const { name, email, password, bootstrapKey } = req.body;

    // 1. Check if SUPER_ADMIN already exists in database
    const existingAdmin = await User.findOne({ role: "SUPER_ADMIN" });
    if (existingAdmin) {
      return res.status(403).json({
        message: "Super Admin already initialized on this platform. Bootstrap is permanently locked.",
      });
    }

    // 2. Validate bootstrap secret key
    const expectedKey = process.env.ADMIN_BOOTSTRAP_SECRET || "eventra_super_admin_init_key_2026";
    if (bootstrapKey !== expectedKey) {
      return res.status(401).json({
        message: "Invalid bootstrap authorization secret.",
      });
    }

    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        message: "Name, email and password (minimum 6 characters) are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      user.role = "SUPER_ADMIN";
      user.status = "ACTIVE";
      user.password = await bcrypt.hash(password, 12);
      user.verificationStatus = "VERIFIED";
      await user.save();
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        organization: "EVENTRA Executive Administration",
        verificationStatus: "VERIFIED",
      });
    }

    // Ensure default subscription plans and settings exist
    await seedDefaultPlansAndSettings();

    // Log the sensitive bootstrap event
    await logAdminAction({
      actor: user,
      action: "SUPER_ADMIN_BOOTSTRAPPED",
      targetEntity: "User",
      targetId: user._id,
      targetName: user.name,
      reason: "Initial platform bootstrap",
      req,
    });

    const token = createToken(user._id.toString(), "SUPER_ADMIN");

    res.status(201).json({
      success: true,
      message: "Super Admin bootstrap completed successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
  } catch (error) {
    console.error("Super Admin bootstrap error:", error);
    res.status(500).json({ message: "Bootstrap failed: " + error.message });
  }
});

// Get current profile
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization || "",
        phone: user.phone || "",
        role: user.role || "ORGANIZER",
        status: user.status || "ACTIVE",
        verificationStatus: user.verificationStatus || "UNVERIFIED",
        emailNotifications: user.emailNotifications || { notifyOnRegistration: true, notifyOnCapacity: true },
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ message: "Could not load profile settings." });
  }
});

// Update profile details (name, email, organization, phone, notifications)
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { name, email, organization, phone, emailNotifications } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (email && typeof email === "string" && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
        if (existing) {
          return res.status(409).json({ message: "That email address is already in use by another account." });
        }
        user.email = normalizedEmail;
      }
    }

    if (name && typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (typeof organization === "string") {
      user.organization = organization.trim();
    }

    if (typeof phone === "string") {
      user.phone = phone.trim();
    }

    if (emailNotifications && typeof emailNotifications === "object") {
      user.emailNotifications = {
        notifyOnRegistration: emailNotifications.notifyOnRegistration ?? user.emailNotifications?.notifyOnRegistration ?? true,
        notifyOnCapacity: emailNotifications.notifyOnCapacity ?? user.emailNotifications?.notifyOnCapacity ?? true,
      };
    }

    await user.save();

    const token = createToken(user._id.toString(), user.role || "ORGANIZER");

    res.json({
      success: true,
      message: "Profile settings updated successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        phone: user.phone,
        role: user.role || "ORGANIZER",
        status: user.status || "ACTIVE",
        emailNotifications: user.emailNotifications,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Could not update profile settings." });
  }
});

// Change password
router.put("/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect. Please try again." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Could not update password." });
  }
});

/**
 * DELETE /api/auth/account
 * Organizer self-service account deletion.
 * Requires current password verification.
 * Cascade deletes all hosted events, attendee registrations, tickets, certificates, and subscriptions.
 */
router.delete("/account", requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Current password is required to confirm account deletion." });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Super Admin accounts cannot be deleted via organizer self-service." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: "Incorrect password. Account deletion cancelled." });
    }

    // 1. Find all events hosted by this organizer
    const events = await Event.find({ organizerId: user._id }).select("_id").lean();
    const eventIds = events.map((e) => e._id);

    // 2. Cascade delete all registrations and certificates for these events
    if (eventIds.length > 0) {
      await Registration.deleteMany({ eventId: { $in: eventIds } });
      await Certificate.deleteMany({ eventId: { $in: eventIds } });
      await Event.deleteMany({ organizerId: user._id });
    }

    // 3. Remove organizer support tickets, subscriptions, and payment records
    await SupportTicket.deleteMany({ organizer: user._id });
    await OrganizerSubscription.deleteMany({ organizer: user._id });
    await PaymentTransaction.deleteMany({ organizer: user._id });

    // 4. Delete organizer account record
    await User.findByIdAndDelete(user._id);

    res.json({
      success: true,
      message: "Your organizer account and all associated events have been permanently deleted.",
    });
  } catch (err) {
    console.error("Account self-deletion error:", err);
    res.status(500).json({ message: "Could not delete account: " + err.message });
  }
});

export default router;
