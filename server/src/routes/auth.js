import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, organization } = req.body;

    if (!name || typeof email !== "string" || !email.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: passwordHash,
      organization: organization || "",
    });

    const token = createToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
      },
    });
  } catch (error) {
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

    const token = createToken(user._id.toString());

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Get current organizer profile
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Organizer account not found." });
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization || "",
        emailNotifications: user.emailNotifications || { notifyOnRegistration: true, notifyOnCapacity: true },
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ message: "Could not load profile settings." });
  }
});

// Update organizer profile details (name, email, organization, notifications)
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { name, email, organization, emailNotifications } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Organizer account not found." });
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

    if (emailNotifications && typeof emailNotifications === "object") {
      user.emailNotifications = {
        notifyOnRegistration: emailNotifications.notifyOnRegistration ?? user.emailNotifications?.notifyOnRegistration ?? true,
        notifyOnCapacity: emailNotifications.notifyOnCapacity ?? user.emailNotifications?.notifyOnCapacity ?? true,
      };
    }

    await user.save();

    // Generate refreshed token with updated identity
    const token = createToken(user._id.toString());

    res.json({
      success: true,
      message: "Profile settings updated successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        emailNotifications: user.emailNotifications,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Could not update profile settings." });
  }
});

// Change organizer account password
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
      return res.status(404).json({ message: "Organizer account not found." });
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

export default router;
