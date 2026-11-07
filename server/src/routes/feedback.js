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
        feedbackQuestions: Array.isArray(event.feedbackQuestions) && event.feedbackQuestions.length > 0
          ? event.feedbackQuestions
          : [
              { id: "q_overall", label: "Overall Event Experience", type: "rating", required: true },
              { id: "q_org", label: "Event Organization & Flow", type: "rating", required: true },
              { id: "q_speakers", label: "Speakers & Session Content", type: "rating", required: true },
              { id: "q_venue", label: "Venue & Facilities", type: "rating", required: false },
              { id: "q_liked", label: "What did you enjoy most about the event?", type: "text", required: false },
              { id: "q_improvements", label: "What could be improved for future editions?", type: "text", required: false },
            ],
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
      ratings = {},
      textAnswers = {},
      answers: rawAnswers,
    } = req.body;

    // Check if legacy direct ratings were provided with invalid values (must be 1-5 if provided)
    const directRatings = [ratingOverall, ratingOrganization, ratingSpeakers, ratingVenue];
    for (const r of directRatings) {
      if (r !== undefined && r !== null) {
        const parsed = parseInt(r, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 5) {
          return res.status(400).json({ message: "Please provide valid ratings between 1 and 5 for all categories." });
        }
      }
    }

    // Dynamic questions evaluation
    const questions = Array.isArray(event.feedbackQuestions) && event.feedbackQuestions.length > 0
      ? event.feedbackQuestions
      : [
          { id: "q_overall", label: "Overall Event Experience", type: "rating", required: true },
          { id: "q_org", label: "Event Organization & Flow", type: "rating", required: true },
          { id: "q_speakers", label: "Speakers & Session Content", type: "rating", required: true },
          { id: "q_venue", label: "Venue & Facilities", type: "rating", required: false },
          { id: "q_liked", label: "What did you enjoy most about the event?", type: "text", required: false },
          { id: "q_improvements", label: "What could be improved for future editions?", type: "text", required: false },
        ];

    const answersList = [];
    const customAnswersMap = {};
    const collectedRatings = [];

    // Fallback dictionary for standard question IDs
    const fallbackVals = {
      q_overall: ratingOverall,
      q_org: ratingOrganization,
      q_speakers: ratingSpeakers,
      q_venue: ratingVenue,
      q_liked: liked,
      q_improvements: improvements,
      q_suggestions: suggestions,
    };

    for (const q of questions) {
      let val = ratings[q.id] ?? textAnswers[q.id] ?? fallbackVals[q.id];

      if (q.type === "rating") {
        let numVal = parseInt(val, 10);
        if (isNaN(numVal) && fallbackVals[q.id] !== undefined) {
          numVal = parseInt(fallbackVals[q.id], 10);
        }

        if (q.required && (isNaN(numVal) || numVal < 1 || numVal > 5)) {
          return res.status(400).json({
            message: `"${q.label}" requires a star rating from 1 to 5.`,
          });
        }

        if (!isNaN(numVal) && (numVal < 1 || numVal > 5)) {
          return res.status(400).json({
            message: `Star ratings must be between 1 and 5.`,
          });
        }

        if (!isNaN(numVal)) {
          collectedRatings.push(numVal);
          answersList.push({
            questionId: q.id,
            questionLabel: q.label,
            questionType: "rating",
            value: numVal,
          });
          customAnswersMap[q.id] = numVal;
        }
      } else {
        // Text Question
        const strVal = String(val || "").trim();
        if (q.required && !strVal) {
          return res.status(400).json({
            message: `"${q.label}" is a required field.`,
          });
        }

        answersList.push({
          questionId: q.id,
          questionLabel: q.label,
          questionType: "text",
          value: strVal.slice(0, 3000),
        });
        customAnswersMap[q.id] = strVal;
      }
    }

    // Determine final overall and category scores
    const calculatedAvgRating = collectedRatings.length > 0
      ? Math.round(collectedRatings.reduce((a, b) => a + b, 0) / collectedRatings.length)
      : 5;

    const numOverall = ratingOverall ? parseInt(ratingOverall, 10) : (ratings.q_overall ? parseInt(ratings.q_overall, 10) : calculatedAvgRating);
    const numOrg = ratingOrganization ? parseInt(ratingOrganization, 10) : (ratings.q_org ? parseInt(ratings.q_org, 10) : numOverall);
    const numSpeakers = ratingSpeakers ? parseInt(ratingSpeakers, 10) : (ratings.q_speakers ? parseInt(ratings.q_speakers, 10) : numOverall);
    const numVenue = ratingVenue ? parseInt(ratingVenue, 10) : (ratings.q_venue ? parseInt(ratings.q_venue, 10) : numOverall);

    const resolvedLiked = String(liked || textAnswers.q_liked || "").trim().slice(0, 2000);
    const resolvedImprovements = String(improvements || textAnswers.q_improvements || "").trim().slice(0, 2000);
    const resolvedSuggestions = String(suggestions || textAnswers.q_suggestions || "").trim().slice(0, 2000);

    const feedbackDoc = await Feedback.create({
      eventId: event._id,
      registrationId: registration._id,
      participantName: registration.name,
      participantEmail: registration.email,
      feedbackTokenHash: tokenHash,
      ratingOverall: Math.min(5, Math.max(1, numOverall || 5)),
      ratingOrganization: Math.min(5, Math.max(1, numOrg || 5)),
      ratingSpeakers: Math.min(5, Math.max(1, numSpeakers || 5)),
      ratingVenue: Math.min(5, Math.max(1, numVenue || 5)),
      liked: resolvedLiked,
      improvements: resolvedImprovements,
      suggestions: resolvedSuggestions,
      answers: answersList,
      customAnswers: customAnswersMap,
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
        feedbackQuestions: event.feedbackQuestions || [],
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

