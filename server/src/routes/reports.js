import express from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";
import PostEventReport from "../models/PostEventReport.js";
import Feedback from "../models/Feedback.js";
import { requireAuth } from "../middleware/auth.js";
import { getEventEndDateTime, isEventCompleted } from "../utils/eventTiming.js";
import { calculateReportAnalytics } from "../utils/reportAnalytics.js";
import { generateDefaultReportContent } from "../utils/defaultReportContent.js";
import { generateReportPdf } from "../utils/reportPdf.js";

const router = express.Router();

function isValidEventId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

async function findOwnedEvent(eventId, userId) {
  if (!isValidEventId(eventId)) return null;
  return Event.findOne({ _id: eventId, organizerId: userId });
}

/**
 * GET /api/reports/event/:eventId
 * Loads event info, completion status, analytics, and existing report.
 */
router.get("/event/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const organizer = await User.findById(event.organizerId).select("name email organization").lean();
    const endDateTime = getEventEndDateTime(event);
    const completed = isEventCompleted(event);

    if (!completed) {
      return res.json({
        isEventEnded: false,
        message: "This event is currently upcoming or ongoing. Post-event reports become available once the event concludes.",
        eventEndDateTime: endDateTime,
        event,
        organizer: {
          name: organizer?.name || "",
          email: organizer?.email || "",
          organization: organizer?.organization || "",
        },
      });
    }

    const [registrations, feedbacks, existingReport] = await Promise.all([
      Registration.find({ eventId: event._id }).lean(),
      Feedback.find({ eventId: event._id }).lean(),
      PostEventReport.findOne({ eventId: event._id }).lean(),
    ]);

    const analytics = calculateReportAnalytics(registrations, feedbacks);
    const defaultContent = generateDefaultReportContent(event, organizer, analytics);

    const reportData = existingReport
      ? { ...defaultContent, ...existingReport }
      : { ...defaultContent, reportStatus: "not_started" };

    res.json({
      isEventEnded: true,
      event,
      organizer: {
        name: organizer?.name || "",
        email: organizer?.email || "",
        organization: organizer?.organization || "",
      },
      analytics,
      report: reportData,
      reportStatus: existingReport?.reportStatus || "not_started",
      lastUpdated: existingReport?.updatedAt || null,
      aiConfigured: Boolean(process.env.AI_API_KEY),
    });
  } catch (err) {
    console.error("Load report error:", err);
    res.status(500).json({ message: "Could not load post-event report." });
  }
});

/**
 * Helper to save or update report
 */
async function saveOrUpdateReport(req, res) {
  const event = await findOwnedEvent(req.params.eventId, req.userId);
  if (!event) return res.status(404).json({ message: "Event not found." });

  if (!isEventCompleted(event)) {
    return res.status(400).json({
      message: "Post-event report cannot be created or updated before the event has completed.",
    });
  }

  const {
    executiveSummary,
    objectives,
    eventOverview,
    activities,
    highlights,
    speakersSummary,
    participantEngagement,
    outcomes,
    challenges,
    feedbackSummary,
    futureImprovements,
    conclusion,
    reportStatus,
  } = req.body;

  const validStatus = ["draft", "completed"].includes(reportStatus)
    ? reportStatus
    : "draft";

  const updateFields = {
    organizerId: req.userId,
    executiveSummary: String(executiveSummary || "").trim(),
    objectives: String(objectives || "").trim(),
    eventOverview: String(eventOverview || "").trim(),
    activities: String(activities || "").trim(),
    highlights: String(highlights || "").trim(),
    speakersSummary: String(speakersSummary || "").trim(),
    participantEngagement: String(participantEngagement || "").trim(),
    outcomes: String(outcomes || "").trim(),
    challenges: String(challenges || "").trim(),
    feedbackSummary: String(feedbackSummary || "").trim(),
    futureImprovements: String(futureImprovements || "").trim(),
    conclusion: String(conclusion || "").trim(),
    reportStatus: validStatus,
    updatedAt: new Date(),
  };

  if (validStatus === "completed") {
    updateFields.generatedAt = new Date();
  }

  const report = await PostEventReport.findOneAndUpdate(
    { eventId: event._id },
    { $set: updateFields, $setOnInsert: { eventId: event._id } },
    { new: true, upsert: true, runValidators: true }
  );

  res.json({
    message: validStatus === "completed" ? "Report marked as completed." : "Report draft saved.",
    report,
  });
}

/**
 * POST /api/reports/event/:eventId
 */
router.post("/event/:eventId", requireAuth, async (req, res) => {
  try {
    await saveOrUpdateReport(req, res);
  } catch (err) {
    console.error("Create report error:", err);
    res.status(500).json({ message: "Could not save post-event report." });
  }
});

/**
 * PUT /api/reports/event/:eventId
 */
router.put("/event/:eventId", requireAuth, async (req, res) => {
  try {
    await saveOrUpdateReport(req, res);
  } catch (err) {
    console.error("Update report error:", err);
    res.status(500).json({ message: "Could not update post-event report." });
  }
});

/**
 * GET /api/reports/event/:eventId/pdf
 * Generates and streams the formal multi-page PDF.
 */
router.get("/event/:eventId/pdf", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    if (!isEventCompleted(event)) {
      return res.status(400).json({
        message: "Cannot download report PDF before the event has concluded.",
      });
    }

    const [organizer, registrations, feedbacks, savedReport] = await Promise.all([
      User.findById(event.organizerId).select("name email organization").lean(),
      Registration.find({ eventId: event._id }).lean(),
      Feedback.find({ eventId: event._id }).lean(),
      PostEventReport.findOne({ eventId: event._id }).lean(),
    ]);

    const analytics = calculateReportAnalytics(registrations, feedbacks);
    const defaultContent = generateDefaultReportContent(event, organizer, analytics);
    const reportData = savedReport
      ? { ...defaultContent, ...savedReport }
      : { ...defaultContent, reportStatus: "completed" };

    const pdfBuffer = await generateReportPdf(event, organizer, reportData, analytics);

    const safeSlug = (event.slug || event.title || "event")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .slice(0, 40);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="eventra-post-event-report-${safeSlug}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Generate report PDF error:", err);
    res.status(500).json({ message: "Could not generate report PDF." });
  }
});

/**
 * POST /api/reports/event/:eventId/ai-assist
 * Provides optional AI text enhancement for specific report sections.
 */
router.post("/event/:eventId/ai-assist", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    if (!process.env.AI_API_KEY) {
      return res.json({
        configured: false,
        message: "AI assistant is not configured. Configure AI_API_KEY on the server to enable AI text assistance.",
      });
    }

    const { section, text, instruction } = req.body;
    if (!section || !text) {
      return res.status(400).json({ message: "Section title and draft text are required." });
    }

    const userPrompt = {
      eventTitle: event.title,
      eventType: event.eventType || "General Event",
      section: String(section).slice(0, 100),
      currentDraftText: String(text).slice(0, 3000),
      customInstruction: instruction ? String(instruction).slice(0, 300) : "Improve tone, clarity, and professionalism",
    };

    const response = await fetch(process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert executive reporting assistant for EVENTRA. " +
              "Your task is to refine and professionally write post-event report sections based on the actual provided draft text and event context. " +
              "STRICT RULES:\n" +
              "1. NEVER invent attendance counts, percentages, or participant metrics.\n" +
              "2. NEVER invent fake speakers, activities, feedback, or sponsor names.\n" +
              "3. Improve grammar, sentence flow, vocabulary, and executive structure.\n" +
              "4. Return a JSON object with a single key 'improvedText' containing the polished text.",
          },
          {
            role: "user",
            content: JSON.stringify(userPrompt),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service returned status ${response.status}`);
    }

    const data = await response.json();
    const resultObj = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    res.json({
      configured: true,
      suggestion: String(resultObj.improvedText || text).trim(),
    });
  } catch (err) {
    console.error("Report AI assist error:", err);
    res.status(502).json({
      message: "Could not generate AI suggestion from configured provider.",
    });
  }
});

export default router;
