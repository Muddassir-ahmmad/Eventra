import crypto from "node:crypto";
import express from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Feedback from "../models/Feedback.js";
import EmailLog from "../models/EmailLog.js";
import { requireAuth } from "../middleware/auth.js";
import { sendFeedbackEmailsForEvent } from "../utils/feedbackEmail.js";

const router = express.Router();

function isValidEventId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

async function findOwnedEvent(eventId, userId) {
  if (!isValidEventId(eventId)) return null;
  return Event.findOne({ _id: eventId, organizerId: userId });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * GET /api/feedback/:token
 * Public endpoint to load feedback form details.
 */
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) {
      return res.status(400).json({ message: "Invalid feedback token." });
    }

    const tokenHash = hashToken(token);
    const registration = await Registration.findOne({
      $or: [{ feedbackTokenHash: tokenHash }, { feedbackToken: token }],
    });

    if (!registration) {
      return res.status(404).json({ message: "Feedback link not found or invalid." });
    }

    const event = await Event.findById(registration.eventId).lean();
    if (!event) {
      return res.status(404).json({ message: "Associated event not found." });
    }

    if (registration.feedbackSubmitted) {
      return res.json({
        alreadySubmitted: true,
        eventTitle: event.title,
        participantName: registration.name,
        submittedAt: registration.feedbackSubmittedAt,
        certificateEligible: Boolean(event.certificateEnabled && registration.checkedIn),
        eventId: event._id,
        registrationId: registration._id,
      });
    }

    if (event.feedbackDeadline && new Date(event.feedbackDeadline).getTime() < Date.now()) {
      return res.json({
        expired: true,
        message: "The feedback submission deadline for this event has passed.",
        eventTitle: event.title,
      });
    }

    res.json({
      alreadySubmitted: false,
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        requireFeedbackForCertificate: event.requireFeedbackForCertificate === true,
        certificateEnabled: event.certificateEnabled === true,
      },
      participant: {
        name: registration.name,
        email: registration.email,
        checkedIn: registration.checkedIn === true,
      },
    });
  } catch (err) {
    console.error("Get feedback by token error:", err);
    res.status(500).json({ message: "Could not retrieve feedback information." });
  }
});

/**
 * POST /api/feedback/:token
 * Public endpoint to submit participant feedback.
 */
router.post("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) {
      return res.status(400).json({ message: "Invalid feedback token." });
    }

    const tokenHash = hashToken(token);
    const registration = await Registration.findOne({
      $or: [{ feedbackTokenHash: tokenHash }, { feedbackToken: token }],
    });

    if (!registration) {
      return res.status(404).json({ message: "Feedback link not found or invalid." });
    }

    if (registration.feedbackSubmitted) {
      return res.status(409).json({ message: "Feedback has already been submitted for this registration." });
    }

    const event = await Event.findById(registration.eventId);
    if (!event) {
      return res.status(404).json({ message: "Associated event not found." });
    }

    if (event.feedbackDeadline && new Date(event.feedbackDeadline).getTime() < Date.now()) {
      return res.status(403).json({ message: "The feedback submission window for this event has closed." });
    }

    const {
      ratingOverall,
      ratingOrganization,
      ratingSpeakers,
      ratingVenue,
      liked,
      improvements,
      suggestions,
    } = req.body;

    const numOverall = parseInt(ratingOverall, 10);
    const numOrg = parseInt(ratingOrganization, 10);
    const numSpeakers = parseInt(ratingSpeakers, 10);
    const numVenue = parseInt(ratingVenue, 10);

    if (
      isNaN(numOverall) || numOverall < 1 || numOverall > 5 ||
      isNaN(numOrg) || numOrg < 1 || numOrg > 5 ||
      isNaN(numSpeakers) || numSpeakers < 1 || numSpeakers > 5 ||
      isNaN(numVenue) || numVenue < 1 || numVenue > 5
    ) {
      return res.status(400).json({ message: "Please provide valid ratings between 1 and 5 for all categories." });
    }

    const feedbackDoc = await Feedback.create({
      eventId: event._id,
      registrationId: registration._id,
      participantName: registration.name,
      participantEmail: registration.email,
      feedbackTokenHash: tokenHash,
      ratingOverall: numOverall,
      ratingOrganization: numOrg,
      ratingSpeakers: numSpeakers,
      ratingVenue: numVenue,
      liked: String(liked || "").trim().slice(0, 2000),
      improvements: String(improvements || "").trim().slice(0, 2000),
      suggestions: String(suggestions || "").trim().slice(0, 2000),
      submittedAt: new Date(),
    });

    registration.feedbackSubmitted = true;
    registration.feedbackSubmittedAt = feedbackDoc.submittedAt;
    await registration.save();

    res.status(201).json({
      success: true,
      message: "Thank you for sharing your valuable feedback!",
      certificateEligible: Boolean(event.certificateEnabled && registration.checkedIn),
      eventId: event._id,
      registrationId: registration._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Feedback has already been recorded for this registration." });
    }
    console.error("Submit feedback error:", err);
    res.status(500).json({ message: "Could not record feedback. Please try again." });
  }
});

/**
 * GET /api/feedback/event/:eventId
 * Organizer endpoint to view feedback analytics and submissions.
 */
router.get("/event/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const [confirmedRegs, emailLogs, feedbacks] = await Promise.all([
      Registration.find({ eventId: event._id, status: "confirmed" }).lean(),
      EmailLog.find({ eventId: event._id, emailType: "feedback_request" }).lean(),
      Feedback.find({ eventId: event._id }).sort({ submittedAt: -1 }).lean(),
    ]);

    const totalInvited = confirmedRegs.length;
    const sentLogs = emailLogs.filter((l) => l.deliveryStatus === "sent");
    const failedLogs = emailLogs.filter((l) => l.deliveryStatus === "failed");
    const submissionsCount = feedbacks.length;
    const pendingCount = Math.max(0, totalInvited - submissionsCount);
    const responseRate = totalInvited > 0
      ? Math.round((submissionsCount / totalInvited) * 1000) / 10
      : 0;

    let avgOverall = 0;
    let avgOrg = 0;
    let avgSpeakers = 0;
    let avgVenue = 0;
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (submissionsCount > 0) {
      let sumOverall = 0;
      let sumOrg = 0;
      let sumSpeakers = 0;
      let sumVenue = 0;

      for (const fb of feedbacks) {
        sumOverall += fb.ratingOverall;
        sumOrg += fb.ratingOrganization;
        sumSpeakers += fb.ratingSpeakers;
        sumVenue += fb.ratingVenue;
        if (ratingBreakdown[fb.ratingOverall] !== undefined) {
          ratingBreakdown[fb.ratingOverall]++;
        }
      }

      avgOverall = Math.round((sumOverall / submissionsCount) * 10) / 10;
      avgOrg = Math.round((sumOrg / submissionsCount) * 10) / 10;
      avgSpeakers = Math.round((sumSpeakers / submissionsCount) * 10) / 10;
      avgVenue = Math.round((sumVenue / submissionsCount) * 10) / 10;
    }

    res.json({
      event: {
        _id: event._id,
        title: event.title,
        status: event.status,
        completedAt: event.completedAt,
        feedbackDeadline: event.feedbackDeadline,
        requireFeedbackForCertificate: event.requireFeedbackForCertificate === true,
      },
      analytics: {
        totalInvited,
        emailsSent: sentLogs.length,
        emailsFailed: failedLogs.length,
        submissionsReceived: submissionsCount,
        pendingFeedback: pendingCount,
        responseRate,
        averageRatings: {
          overall: avgOverall,
          organization: avgOrg,
          speakers: avgSpeakers,
          venue: avgVenue,
        },
        ratingBreakdown,
      },
      feedbacks,
    });
  } catch (err) {
    console.error("Organizer feedback error:", err);
    res.status(500).json({ message: "Could not load feedback dashboard." });
  }
});

/**
 * POST /api/feedback/event/:eventId/retry-emails
 * Retries sending feedback emails to participants who haven't received them.
 */
router.post("/event/:eventId/retry-emails", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const result = await sendFeedbackEmailsForEvent(event._id);
    res.json({
      message: `Feedback email processing completed. ${result.sent} sent, ${result.failed} failed, ${result.skipped} already sent.`,
      result,
    });
  } catch (err) {
    console.error("Retry feedback emails error:", err);
    res.status(500).json({ message: "Could not retry sending feedback emails." });
  }
});

export default router;
