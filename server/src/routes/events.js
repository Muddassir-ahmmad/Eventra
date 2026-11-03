import Registration from "../models/Registration.js";
import Feedback from "../models/Feedback.js";
import EmailLog from "../models/EmailLog.js";
import PostEventReport from "../models/PostEventReport.js";
import Certificate from "../models/Certificate.js";
import { sendFeedbackEmailsForEvent } from "../utils/feedbackEmail.js";
import { calculateReportAnalytics } from "../utils/reportAnalytics.js";
import express from "express";
import Event from "../models/Event.js";
import { requireAuth } from "../middleware/auth.js";
import { makeSlug } from "../utils/slug.js";

const router = express.Router();

/*
  CREATE EVENT
*/
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      venue,
      capacity,
      registrationDeadline,
      posterUrl,
      qrEnabled,
      volunteerEnabled,
      certificateEnabled,
      certificateTemplate,
      certificateTitle,
      certificateDescription,
      eventType,
      signatures,
    } = req.body;

    if (!title || !date || !venue || !capacity) {
      return res.status(400).json({
        message: "Title, date, venue and capacity are required",
      });
    }

    let slug = makeSlug(title);

    const existing = await Event.findOne({ slug });

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    const event = await Event.create({
      organizerId: req.userId,
      title,
      slug,
      description: description || "",
      date,
      venue,
      capacity,
      registrationDeadline: registrationDeadline || null,
      posterUrl: posterUrl || "",
      qrEnabled: qrEnabled ?? true,
      volunteerEnabled: volunteerEnabled ?? false,
      certificateEnabled: certificateEnabled ?? false,
      certificateTemplate: certificateTemplate ?? "classic",
      certificateTitle: certificateTitle || "Certificate of Participation",
      certificateDescription: certificateDescription || "",
      eventType: eventType || "",
      signatures: Array.isArray(signatures) ? signatures : [],
      status: "published",
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error("Create event error:", error);

    res.status(500).json({
      message: "Could not create event",
    });
  }
});


/*
  GET ORGANIZER'S EVENTS
*/
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const events = await Event.find({
      organizerId: req.userId,
    }).sort({
      createdAt: -1,
    });

    res.json({ events });
  } catch (error) {
    console.error("Load events error:", error);

    res.status(500).json({
      message: "Could not load events",
    });
  }
});


/*
  UPDATE EVENT
  Organizer can edit ONLY their own event.
*/
router.put("/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found or you do not have permission",
      });
    }

    const {
      title,
      description,
      date,
      venue,
      capacity,
      registrationDeadline,
      posterUrl,
      qrEnabled,
      volunteerEnabled,
      certificateEnabled,
      certificateTemplate,
      certificateTitle,
      certificateDescription,
      eventType,
      signatures,
      status,
    } = req.body;

    if (title !== undefined) {
      event.title = title;
    }

    if (description !== undefined) {
      event.description = description;
    }

    if (date !== undefined) {
      event.date = date;
    }

    if (venue !== undefined) {
      event.venue = venue;
    }

    if (capacity !== undefined) {
      event.capacity = capacity;
    }

    if (registrationDeadline !== undefined) {
      event.registrationDeadline = registrationDeadline || null;
    }

    if (posterUrl !== undefined) {
      event.posterUrl = posterUrl;
    }

    if (qrEnabled !== undefined) {
      event.qrEnabled = qrEnabled;
    }

    if (volunteerEnabled !== undefined) {
      event.volunteerEnabled = volunteerEnabled;
    }

    if (certificateEnabled !== undefined) {
      event.certificateEnabled = certificateEnabled;
    }

    if (certificateTemplate !== undefined) {
      event.certificateTemplate = certificateTemplate;
    }

    if (certificateTitle !== undefined) {
      event.certificateTitle = certificateTitle;
    }

    if (req.body.feedbackDeadline !== undefined) {
      event.feedbackDeadline = req.body.feedbackDeadline ? new Date(req.body.feedbackDeadline) : null;
    }
    if (req.body.requireFeedbackForCertificate !== undefined) {
      event.requireFeedbackForCertificate = Boolean(req.body.requireFeedbackForCertificate);
    }

    if (certificateDescription !== undefined) {
      event.certificateDescription = certificateDescription;
    }

    if (eventType !== undefined) {
      event.eventType = eventType;
    }

    if (signatures !== undefined) {
      event.signatures = Array.isArray(signatures) ? signatures : [];
    }

    if (status !== undefined) {
      event.status = status;
    }

    await event.save();

    res.json({
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("Update event error:", error);

    res.status(500).json({
      message: "Could not update event",
    });
  }
});


/*
  DELETE EVENT
  Organizer can delete ONLY their own event.
*/
router.delete("/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found or you do not have permission",
      });
    }

    await Event.deleteOne({
      _id: event._id,
    });

    res.json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);

    res.status(500).json({
      message: "Could not delete event",
    });
  }
});


/*
  PUBLIC EVENT
*/
router.get("/public/:slug", async (req, res) => {
  try {
    const event = await Event.findOne({
      slug: req.params.slug,
      status: "published",
    }).select("-organizerId");

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.json({ event });
  } catch (error) {
    console.error("Public event error:", error);

    res.status(500).json({
      message: "Could not load event",
    });
  }
});



/*
  POST /api/events/:eventId/end
  Ends the event, marks it completed, blocks registrations, initiates feedback emails.
*/
router.post("/:eventId/end", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found or unauthorized." });
    }

    if (event.status === "completed") {
      return res.status(409).json({
        message: "This event has already been marked as completed.",
        event,
        alreadyCompleted: true,
      });
    }

    event.status = "completed";
    event.completedAt = new Date();

    if (req.body.feedbackDeadline) {
      event.feedbackDeadline = new Date(req.body.feedbackDeadline);
    }
    if (req.body.requireFeedbackForCertificate !== undefined) {
      event.requireFeedbackForCertificate = Boolean(req.body.requireFeedbackForCertificate);
    }

    await event.save();

    // Set post event report status to collecting_feedback
    await PostEventReport.findOneAndUpdate(
      { eventId: event._id },
      {
        $setOnInsert: { eventId: event._id, organizerId: req.userId },
        $set: { reportStatus: "collecting_feedback", updatedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // Trigger feedback email requests in background
    let emailResult = { sent: 0, failed: 0, skipped: 0 };
    try {
      emailResult = await sendFeedbackEmailsForEvent(event._id);
    } catch (emailErr) {
      console.error("Background feedback email trigger error:", emailErr.message);
    }

    res.json({
      message: "Event marked as completed. Feedback requests and post-event automation initiated.",
      event,
      emailResult,
    });
  } catch (err) {
    console.error("End event error:", err);
    res.status(500).json({ message: "Could not end event." });
  }
});

/*
  GET /api/events/:eventId/post-event
  Returns a consolidated post-event dashboard status.
*/
router.get("/:eventId/post-event", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const [registrations, feedbacks, emailLogs, report, certificates] = await Promise.all([
      Registration.find({ eventId: event._id }).lean(),
      Feedback.find({ eventId: event._id }).lean(),
      EmailLog.find({ eventId: event._id, emailType: "feedback_request" }).lean(),
      PostEventReport.findOne({ eventId: event._id }).lean(),
      Certificate.find({ eventId: event._id }).lean(),
    ]);

    const analytics = calculateReportAnalytics(registrations, feedbacks);
    const confirmedCount = analytics.confirmedCount;
    const sentEmailsCount = emailLogs.filter((l) => l.deliveryStatus === "sent").length;
    const failedEmailsCount = emailLogs.filter((l) => l.deliveryStatus === "failed").length;
    const feedbackCount = feedbacks.length;
    const pendingFeedback = Math.max(0, confirmedCount - feedbackCount);
    const avgRating = feedbackCount > 0
      ? Math.round((feedbacks.reduce((acc, f) => acc + f.ratingOverall, 0) / feedbackCount) * 10) / 10
      : 0;

    const attendedRegs = registrations.filter((r) => r.status === "confirmed" && r.checkedIn === true);
    const eligibleForCert = event.requireFeedbackForCertificate
      ? attendedRegs.filter((r) => r.feedbackSubmitted === true).length
      : attendedRegs.length;

    res.json({
      event: {
        _id: event._id,
        title: event.title,
        status: event.status,
        date: event.date,
        venue: event.venue,
        completedAt: event.completedAt,
        feedbackDeadline: event.feedbackDeadline,
        requireFeedbackForCertificate: event.requireFeedbackForCertificate === true,
        certificateEnabled: event.certificateEnabled === true,
      },
      attendance: {
        totalRegistrations: analytics.totalRegistrations,
        confirmedCount: analytics.confirmedCount,
        attendedCount: analytics.attendedCount,
        absentCount: analytics.absentCount,
        attendanceRate: analytics.attendanceRate,
      },
      feedback: {
        totalInvited: confirmedCount,
        emailsSent: sentEmailsCount,
        emailsFailed: failedEmailsCount,
        submissionsReceived: feedbackCount,
        pendingFeedback,
        responseRate: confirmedCount > 0 ? Math.round((feedbackCount / confirmedCount) * 1000) / 10 : 0,
        averageOverallRating: avgRating,
      },
      certificates: {
        enabled: event.certificateEnabled === true,
        requireFeedback: event.requireFeedbackForCertificate === true,
        eligibleCount: eligibleForCert,
        issuedCount: certificates.length,
      },
      report: {
        status: report?.reportStatus || "not_started",
        updatedAt: report?.updatedAt || null,
        generatedAt: report?.generatedAt || null,
      },
    });
  } catch (err) {
    console.error("Post-event status error:", err);
    res.status(500).json({ message: "Could not load post-event dashboard." });
  }
});

/*
  POST /api/events/:eventId/finalize-report
  Finalizes the post-event report.
*/
router.post("/:eventId/finalize-report", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const report = await PostEventReport.findOneAndUpdate(
      { eventId: event._id },
      {
        $set: {
          reportStatus: "finalized",
          generatedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    res.json({
      message: "Post-event report finalized.",
      report,
    });
  } catch (err) {
    console.error("Finalize report error:", err);
    res.status(500).json({ message: "Could not finalize post-event report." });
  }
});


export default router;