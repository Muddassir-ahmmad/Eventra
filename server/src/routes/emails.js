import express from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";
import EmailLog from "../models/EmailLog.js";
import { requireAuth } from "../middleware/auth.js";
import emailService from "../services/emailService.js";
import { renderTestEmail } from "../services/emailTemplates.js";

const router = express.Router();

function isValidId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

async function findOwnedEvent(eventId, userId) {
  if (!isValidId(eventId)) return null;
  return Event.findOne({ _id: eventId, organizerId: userId });
}

/**
 * GET /api/emails/status
 * Public or organizer check for email provider status.
 */
router.get("/status", (req, res) => {
  res.json(emailService.getSmtpStatus());
});

/**
 * GET /api/emails/preferences
 * Returns organizer notification preferences.
 */
router.get("/preferences", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("emailNotifications").lean();
    res.json({
      emailNotifications: user?.emailNotifications || {
        notifyOnRegistration: true,
        notifyOnCapacity: true,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Could not load notification preferences." });
  }
});

/**
 * PUT /api/emails/preferences
 * Updates organizer notification preferences.
 */
router.put("/preferences", requireAuth, async (req, res) => {
  try {
    const { notifyOnRegistration, notifyOnCapacity } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          "emailNotifications.notifyOnRegistration": notifyOnRegistration !== false,
          "emailNotifications.notifyOnCapacity": notifyOnCapacity !== false,
        },
      },
      { new: true }
    );

    res.json({
      message: "Notification preferences updated.",
      emailNotifications: user.emailNotifications,
    });
  } catch (err) {
    res.status(500).json({ message: "Could not update preferences." });
  }
});

/**
 * POST /api/emails/test
 * Sends a test email to the authenticated organizer's email.
 */
router.post("/test", requireAuth, async (req, res) => {
  try {
    if (!emailService.isConfigured()) {
      return res.status(503).json({
        message: "Email provider is not configured. Set SMTP_HOST and EMAIL_FROM in server environment.",
      });
    }

    const organizer = await User.findById(req.userId).select("email name").lean();
    if (!organizer?.email) {
      return res.status(400).json({ message: "Organizer account email is unavailable." });
    }

    // First verify connection
    const verifyResult = await emailService.verifySmtpConnection();
    if (!verifyResult.ok) {
      return res.status(502).json({
        message: verifyResult.error || "SMTP connection verification failed.",
      });
    }

    const { subject, html, text } = renderTestEmail({
      host: process.env.SMTP_HOST,
      from: process.env.EMAIL_FROM,
    });

    // Use dummy or first event ID for tracking
    const sampleEvent = await Event.findOne({ organizerId: req.userId }).select("_id").lean();
    const eventId = sampleEvent?._id || req.userId;

    const result = await emailService.sendMail({
      to: organizer.email,
      recipientName: organizer.name || "Organizer",
      subject,
      html,
      text,
      eventId,
      organizerId: req.userId,
      emailType: "test_email",
      skipDuplicateCheck: true,
    });

    if (!result.success) {
      return res.status(502).json({
        message: result.error || "Could not deliver test email. Check SMTP settings.",
      });
    }

    res.json({
      message: `Test email successfully dispatched to ${organizer.email}`,
      result,
    });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(502).json({ message: `Test email failed: ${err.message}` });
  }
});

/**
 * GET /api/emails/event/:eventId
 * Retrieves delivery logs and statistics for a specific event.
 */
router.get("/event/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) {
      return res.status(404).json({ message: "Event not found or you do not have permission." });
    }

    const { search, status, type, limit = 100 } = req.query;

    const query = { eventId: event._id };
    if (status && status !== "all") {
      query.deliveryStatus = status;
    }
    if (type && type !== "all") {
      query.emailType = type;
    }
    if (search) {
      query.$or = [
        { recipient: { $regex: search, $options: "i" } },
        { recipientName: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const [logs, allEventLogs] = await Promise.all([
      EmailLog.find(query).sort({ createdAt: -1 }).limit(Number(limit)).lean(),
      EmailLog.find({ eventId: event._id }).select("deliveryStatus emailType").lean(),
    ]);

    const totalDispatched = allEventLogs.length;
    const totalSent = allEventLogs.filter((l) => l.deliveryStatus === "sent").length;
    const totalFailed = allEventLogs.filter((l) => l.deliveryStatus === "failed").length;
    const totalPending = allEventLogs.filter((l) => l.deliveryStatus === "pending").length;

    const breakdown = {
      registration_confirmation: allEventLogs.filter((l) => l.emailType === "registration_confirmation").length,
      ticket_delivery: allEventLogs.filter((l) => l.emailType === "ticket_delivery").length,
      certificate_delivery: allEventLogs.filter((l) => l.emailType === "certificate_delivery").length,
      feedback_request: allEventLogs.filter((l) => l.emailType === "feedback_request").length,
      organizer_alert: allEventLogs.filter((l) => l.emailType === "organizer_alert").length,
    };

    res.json({
      event: {
        _id: event._id,
        title: event.title,
        status: event.status,
      },
      provider: emailService.getSmtpStatus(),
      stats: {
        totalDispatched,
        totalSent,
        totalFailed,
        totalPending,
        successRate: totalDispatched > 0 ? Math.round((totalSent / totalDispatched) * 1000) / 10 : 0,
        breakdown,
      },
      logs,
    });
  } catch (err) {
    console.error("Load email logs error:", err);
    res.status(500).json({ message: "Could not load email delivery logs." });
  }
});

/**
 * POST /api/emails/:emailLogId/retry
 * Retries a failed email log record.
 */
router.post("/:emailLogId/retry", requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.emailLogId)) {
      return res.status(400).json({ message: "Invalid email log ID." });
    }

    const log = await EmailLog.findById(req.params.emailLogId);
    if (!log) {
      return res.status(404).json({ message: "Email log record not found." });
    }

    // Verify ownership of the event associated with this log
    const event = await findOwnedEvent(log.eventId, req.userId);
    if (!event) {
      return res.status(403).json({ message: "Unauthorized to retry emails for this event." });
    }

    const result = await emailService.retryEmail(log._id);
    if (!result.success) {
      return res.status(502).json({
        message: result.error || "Retry delivery attempt failed.",
        log: result.log,
      });
    }

    res.json({
      message: `Email successfully re-delivered to ${log.recipient}.`,
      log: result.log,
    });
  } catch (err) {
    console.error("Retry email error:", err);
    res.status(500).json({ message: `Could not retry email: ${err.message}` });
  }
});

/**
 * POST /api/emails/event/:eventId/registrations/:registrationId/ticket
 * Sends digital ticket with QR code and PDF to attendee.
 */
router.post("/event/:eventId/registrations/:registrationId/ticket", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      eventId: event._id,
      status: "confirmed",
    });

    if (!registration) {
      return res.status(404).json({ message: "Confirmed participant registration not found." });
    }

    const result = await emailService.sendTicketEmail(event, registration);
    if (!result.success) {
      return res.status(502).json({
        message: result.error || "Could not deliver ticket email. Check SMTP configuration.",
      });
    }

    res.json({
      message: `Digital ticket email dispatched to ${registration.email}.`,
      result,
    });
  } catch (err) {
    console.error("Send ticket email error:", err);
    res.status(500).json({ message: "Could not send ticket email." });
  }
});

/**
 * POST /api/emails/event/:eventId/registrations/:registrationId/confirmation
 * Resends registration confirmation email.
 */
router.post("/event/:eventId/registrations/:registrationId/confirmation", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      eventId: event._id,
      status: "confirmed",
    });

    if (!registration) {
      return res.status(404).json({ message: "Confirmed participant registration not found." });
    }

    const result = await emailService.sendRegistrationConfirmation(event, registration);
    if (!result.success) {
      return res.status(502).json({
        message: result.error || "Could not deliver confirmation email.",
      });
    }

    res.json({
      message: `Registration confirmation emailed to ${registration.email}.`,
      result,
    });
  } catch (err) {
    console.error("Resend confirmation email error:", err);
    res.status(500).json({ message: "Could not send confirmation email." });
  }
});

export default router;

