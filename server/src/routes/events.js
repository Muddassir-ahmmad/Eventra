import express from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import multer from "multer";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Attendance from "../models/Attendance.js";
import Feedback from "../models/Feedback.js";
import EmailLog from "../models/EmailLog.js";
import PostEventReport from "../models/PostEventReport.js";
import Certificate from "../models/Certificate.js";
import MediaAsset from "../models/MediaAsset.js";
import { requireAuth } from "../middleware/auth.js";
import { makeSlug } from "../utils/slug.js";
import {
  CERTIFICATE_ORG_ALIGNS,
  CERTIFICATE_ORG_SIZES,
  DEFAULT_CERTIFICATE_DESCRIPTION,
} from "../utils/certificateDesign.js";
import { sendFeedbackEmailsForEvent } from "../utils/feedbackEmail.js";
import { calculateReportAnalytics } from "../utils/reportAnalytics.js";
import { isEventCompleted, getEventEndDateTime } from "../utils/eventTiming.js";
import {
  evaluateRegistrationCertificateEligibility,
  getAllEventSessions,
  normalizeCertificateEligibilityRule,
  validateAndNormalizeMultiDaySchedule,
} from "../utils/multiDay.js";
import { generateGeminiPoster, generateGeminiEventCopy, isGeminiConfigured } from "../services/geminiService.js";

const router = express.Router();
const ALLOWED_EVENT_FONTS = ["modern", "editorial", "futuristic", "classic", "bold", "mono"];

const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
const maxImageSize = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSize },
  fileFilter: (_req, file, callback) => {
    const validMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const validExts = /\.(png|jpe?g|webp)$/i;
    if (validMimes.includes(file.mimetype) && (validExts.test(file.originalname) || !file.originalname.includes("."))) {
      callback(null, true);
      return;
    }
    callback(new Error("Choose a PNG, JPEG, or WebP image under 5 MB."));
  },
});

function cloudinaryConfiguration() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

function cloudinarySignature(params, apiSecret) {
  const content = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${content}${apiSecret}`).digest("hex");
}

function posterBaseUrl(req) {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim();
  return `${proto}://${req.get("host")}`;
}

async function savePosterImage(req, file) {
  if (process.env.NODE_ENV === "production") {
    const config = cloudinaryConfiguration();
    if (!config) {
      const asset = await MediaAsset.create({
        scope: "poster",
        mimeType: file.mimetype || "image/png",
        data: file.buffer,
      });
      return {
        posterUrl: `${posterBaseUrl(req)}/api/events/assets/${asset._id}`,
        posterPath: `db:${asset._id}`,
      };
    }

    const folder = "eventra/posters";
    const publicId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder, public_id: publicId, timestamp };
    const form = new FormData();
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    form.append("api_key", config.apiKey);
    form.append("folder", folder);
    form.append("public_id", publicId);
    form.append("timestamp", String(timestamp));
    form.append("signature", cloudinarySignature(params, config.apiSecret));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || "Cloudinary image upload failed.");
    }
    return { posterUrl: result.secure_url };
  }

  // Local development storage
  await fs.mkdir(uploadDirectory, { recursive: true });
  const extension = path.extname(file.originalname || "").toLowerCase() || ".png";
  const filename = `poster-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
  const filePath = path.join(uploadDirectory, filename);
  await fs.writeFile(filePath, file.buffer);

  const baseUrl = posterBaseUrl(req);
  return {
    posterUrl: `${baseUrl}/uploads/${filename}`,
    posterPath: `/uploads/${filename}`,
  };
}

router.get("/assets/:assetId", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.assetId)) return res.status(404).end();
    const asset = await MediaAsset.findOne({ _id: req.params.assetId, scope: "poster" }).lean();
    if (!asset?.data) return res.status(404).end();
    res.set({
      "Content-Type": asset.mimeType || "image/png",
      "Cache-Control": "public, max-age=86400",
    });
    res.send(Buffer.from(asset.data.buffer || asset.data));
  } catch (error) {
    console.error("Load poster asset error:", error);
    res.status(500).end();
  }
});

/*
  POST /api/events/upload-poster
  Uploads an event poster image (JPG, PNG, WebP up to 5MB).
*/
router.post("/upload-poster", requireAuth, (req, res, next) => {
  upload.single("poster")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Poster image must be 5 MB or smaller."
      : error.message;
    res.status(400).json({ message });
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Select a JPG, PNG, or WebP image to upload." });
    }
    const result = await savePosterImage(req, req.file);
    res.status(201).json({
      message: "Poster uploaded successfully",
      posterUrl: result.posterUrl,
    });
  } catch (error) {
    console.error("Poster upload error:", error);
    res.status(error.status || 500).json({
      message: error.message || "Could not upload poster image.",
    });
  }
});

/*
  POST /api/events/generate-poster
  Gemini AI event poster generation endpoint.
*/
router.post("/generate-poster", requireAuth, async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({
      configured: false,
      message: "Gemini AI poster generation is currently unavailable. Configure AI_API_KEY or GEMINI_API_KEY in the server environment, or choose from our pre-designed standard templates.",
    });
  }

  const {
    title,
    category,
    description,
    date,
    time,
    venue,
    location,
    mode,
    visualStyle,
    colorPreference,
  } = req.body;
  if (!title) {
    return res.status(400).json({ message: "Event title is required for poster generation." });
  }

  try {
    const posterUrl = await generateGeminiPoster({
      title,
      category,
      description,
      date,
      time,
      venue: venue || location,
      location,
      mode,
      visualStyle,
      colorPreference,
    });

    res.json({
      message: "Poster generated successfully via Gemini AI.",
      posterUrl,
    });
  } catch (err) {
    console.error("Gemini poster generation error:", err);
    res.status(500).json({ message: err.message || "Could not generate Gemini AI poster." });
  }
});

/*
  POST /api/events/ai-description
  Gemini AI event copywriting assistance endpoint (tagline, shortDescription, description).
*/
router.post("/ai-description", requireAuth, async (req, res) => {
  if (!isGeminiConfigured()) {
    return res.status(503).json({
      configured: false,
      message: "Gemini AI is not configured on the server. Configure GEMINI_API_KEY or AI_API_KEY.",
    });
  }

  const { title, category, venue, existingDescription } = req.body;
  if (!title) {
    return res.status(400).json({ message: "Event title is required for AI copy generation." });
  }

  try {
    const copy = await generateGeminiEventCopy({
      title,
      category,
      venue,
      existingDescription,
    });

    res.json({
      message: "Event copy generated successfully via Gemini AI.",
      ...copy,
    });
  } catch (err) {
    console.error("Gemini AI copy generation error:", err);
    res.status(500).json({ message: err.message || "Could not generate copy via Gemini AI." });
  }
});

/*
  CREATE EVENT
*/
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      mode,
      contactEmail,
      contactPhone,
      date,
      eventDurationType,
      startDate,
      endDate,
      startTime,
      endTime,
      days,
      sessionAttendanceEnabled,
      certificateEligibilityRule,
      venue,
      location,
      capacity,
      registrationDeadline,
      posterUrl,
      posterType,
      posterTemplateData,
      theme,
      eventFont,
      speakers,
      agenda,
      faqs,
      registrationFields,
      ticketMode,
      qrEnabled,
      ticketTypes,
      volunteerEnabled,
      volunteerRoles,
      certificateEnabled,
      certificateTemplate,
      certificateTitle,
      certificateDescription,
      eventType,
      signatures,
      certificateShowOrganization,
      certificateOrganization,
      certificateOrganizationTagline,
      certificateOrganizationSize,
      certificateOrganizationAlign,
      certificateOrganizationUppercase,
      certificateLogoUrl,
      certificateLogoPath,
      requireFeedbackForCertificate,
      feedbackDeadline,
      feedbackEnabled,
      feedbackQuestions,
      status,
    } = req.body;

    const effectiveDateInput = date || startDate;
    if (!title || !effectiveDateInput || !venue || !capacity) {
      return res.status(400).json({
        message: "Title, date, venue and capacity are required",
      });
    }

    const scheduleCheck = validateAndNormalizeMultiDaySchedule({
      eventDurationType,
      date: effectiveDateInput,
      startDate,
      endDate,
      startTime,
      endTime,
      days,
      agenda,
      sessionAttendanceEnabled,
    });
    if (scheduleCheck.error) {
      return res.status(400).json({ message: scheduleCheck.error });
    }
    const schedule = scheduleCheck.value;
    const validSessionIds = getAllEventSessions(schedule).map((s) => s.sessionId);

    if (ticketMode === "paid") {
      return res.status(400).json({
        message: "Paid events are coming soon! Only free events are supported at this time.",
        comingSoon: true,
      });
    }

    if (status !== undefined && !["draft", "published"].includes(status)) {
      return res.status(400).json({ message: "Event status must be draft or published" });
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
      shortDescription: shortDescription || "",
      description: description || "",
      category: category || "Technical",
      mode: mode || "offline",
      contactEmail: contactEmail || "",
      contactPhone: contactPhone || "",
      date: schedule.date,
      eventDurationType: schedule.eventDurationType,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      days: schedule.days,
      sessionAttendanceEnabled: schedule.sessionAttendanceEnabled,
      venue,
      location: location || "",
      capacity,
      registrationDeadline: registrationDeadline || null,
      posterUrl: posterUrl || "",
      posterType: posterType || "template",
      posterTemplateData: posterTemplateData || {},
      theme: theme || "aurora",
      eventFont: ALLOWED_EVENT_FONTS.includes(eventFont) ? eventFont : "modern",
      speakers: Array.isArray(speakers) ? speakers : [],
      agenda: schedule.agenda,
      faqs: Array.isArray(faqs) ? faqs : [],
      registrationFields: Array.isArray(registrationFields) && registrationFields.length > 0
        ? registrationFields
        : undefined,
      ticketMode: ticketMode || "free",
      qrEnabled: qrEnabled ?? true,
      ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : [],
      volunteerEnabled: volunteerEnabled ?? false,
      volunteerRoles: Array.isArray(volunteerRoles) ? volunteerRoles : [],
      certificateEnabled: certificateEnabled ?? false,
      certificateTemplate: certificateTemplate ?? "classic",
      certificateTitle: certificateTitle || "Certificate of Participation",
      certificateDescription: certificateDescription || DEFAULT_CERTIFICATE_DESCRIPTION,
      eventType: eventType || "",
      signatures: Array.isArray(signatures) ? signatures : [],
      certificateEligibilityRule: normalizeCertificateEligibilityRule(
        certificateEligibilityRule,
        validSessionIds
      ),
      certificateShowOrganization: certificateShowOrganization === true,
      certificateOrganization: certificateOrganization || "",
      certificateOrganizationTagline: String(certificateOrganizationTagline || "").trim().slice(0, 200),
      certificateOrganizationSize: CERTIFICATE_ORG_SIZES.includes(certificateOrganizationSize)
        ? certificateOrganizationSize
        : "md",
      certificateOrganizationAlign: CERTIFICATE_ORG_ALIGNS.includes(certificateOrganizationAlign)
        ? certificateOrganizationAlign
        : "center",
      certificateOrganizationUppercase: certificateOrganizationUppercase === true,
      certificateLogoUrl: certificateLogoUrl || "",
      certificateLogoPath: certificateLogoPath || "",
      requireFeedbackForCertificate: requireFeedbackForCertificate === true,
      feedbackDeadline: feedbackDeadline || null,
      feedbackEnabled: feedbackEnabled ?? true,
      feedbackQuestions: Array.isArray(feedbackQuestions) && feedbackQuestions.length > 0
        ? feedbackQuestions.map((q, idx) => ({
            id: q.id || `q_${idx}_${Date.now()}`,
            label: String(q.label || "").trim() || `Question ${idx + 1}`,
            type: q.type === "text" ? "text" : "rating",
            required: q.required ?? true,
          }))
        : undefined,
      status: status || "published",
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

    // Automatically complete events whose dates have passed
    for (const evt of events) {
      if (evt.status === "published" && isEventCompleted(evt)) {
        evt.status = "completed";
        evt.completedAt = evt.completedAt || getEventEndDateTime(evt) || new Date();
        await evt.save();
      }
    }

    res.json({ events });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      message: "Could not load events",
    });
  }
});

/*
  GET SINGLE EVENT BY ID
*/
router.get("/:eventId", requireAuth, async (req, res) => {
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

    // Automatically complete event if dates have passed
    if (event.status === "published" && isEventCompleted(event)) {
      event.status = "completed";
      event.completedAt = event.completedAt || getEventEndDateTime(event) || new Date();
      await event.save();
    }

    res.json({ event });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      message: "Could not load event",
    });
  }
});

/*
  UPDATE EVENT
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

    // Enforce Requirement 7: When event dates have passed, organizers can only manage the event, NOT edit
    if (event.status === "completed" || isEventCompleted(event)) {
      if (event.status !== "completed") {
        event.status = "completed";
        event.completedAt = event.completedAt || getEventEndDateTime(event) || new Date();
        await event.save();
      }
      return res.status(403).json({
        message: "This event has concluded and can no longer be edited. You can continue to manage attendance, certificates, feedback, and post-event reports.",
      });
    }

    const {
      title,
      description,
      shortDescription,
      category,
      mode,
      contactEmail,
      contactPhone,
      date,
      eventDurationType,
      startDate,
      endDate,
      startTime,
      endTime,
      days,
      sessionAttendanceEnabled,
      certificateEligibilityRule,
      venue,
      location,
      capacity,
      registrationDeadline,
      posterUrl,
      posterType,
      posterTemplateData,
      theme,
      eventFont,
      speakers,
      agenda,
      faqs,
      registrationFields,
      ticketMode,
      qrEnabled,
      ticketTypes,
      volunteerEnabled,
      volunteerRoles,
      certificateEnabled,
      certificateTemplate,
      certificateTitle,
      certificateDescription,
      eventType,
      signatures,
      certificateShowOrganization,
      certificateOrganization,
      certificateOrganizationTagline,
      certificateOrganizationSize,
      certificateOrganizationAlign,
      certificateOrganizationUppercase,
      certificateLogoUrl,
      certificateLogoPath,
      completedAt,
      feedbackDeadline,
      requireFeedbackForCertificate,
      feedbackEnabled,
      feedbackQuestions,
      status,
    } = req.body;

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (shortDescription !== undefined) event.shortDescription = shortDescription;
    if (category !== undefined) event.category = category;
    if (mode !== undefined) event.mode = mode;
    if (contactEmail !== undefined) event.contactEmail = contactEmail;
    if (contactPhone !== undefined) event.contactPhone = contactPhone;

    const hasScheduleUpdate = [
      eventDurationType,
      date,
      startDate,
      endDate,
      startTime,
      endTime,
      days,
      agenda,
      sessionAttendanceEnabled,
    ].some((val) => val !== undefined);

    if (hasScheduleUpdate) {
      const scheduleCheck = validateAndNormalizeMultiDaySchedule({
        eventDurationType: eventDurationType !== undefined ? eventDurationType : event.eventDurationType,
        date: date !== undefined ? date : event.date,
        startDate: startDate !== undefined ? startDate : event.startDate,
        endDate: endDate !== undefined ? endDate : event.endDate,
        startTime: startTime !== undefined ? startTime : event.startTime,
        endTime: endTime !== undefined ? endTime : event.endTime,
        days: days !== undefined ? days : event.days,
        agenda: agenda !== undefined ? agenda : event.agenda,
        sessionAttendanceEnabled:
          sessionAttendanceEnabled !== undefined ? sessionAttendanceEnabled : event.sessionAttendanceEnabled,
      });
      if (scheduleCheck.error) {
        return res.status(400).json({ message: scheduleCheck.error });
      }
      const schedule = scheduleCheck.value;
      event.eventDurationType = schedule.eventDurationType;
      event.date = schedule.date;
      event.startDate = schedule.startDate;
      event.endDate = schedule.endDate;
      event.startTime = schedule.startTime;
      event.endTime = schedule.endTime;
      event.days = schedule.days;
      event.agenda = schedule.agenda;
      event.sessionAttendanceEnabled = schedule.sessionAttendanceEnabled;
    }

    if (venue !== undefined) event.venue = venue;
    if (location !== undefined) event.location = location;
    if (capacity !== undefined) event.capacity = capacity;
    if (registrationDeadline !== undefined) event.registrationDeadline = registrationDeadline || null;
    if (posterUrl !== undefined) event.posterUrl = posterUrl;
    if (posterType !== undefined) event.posterType = posterType;
    if (posterTemplateData !== undefined) event.posterTemplateData = posterTemplateData;
    if (theme !== undefined) event.theme = theme;
    if (eventFont !== undefined && ALLOWED_EVENT_FONTS.includes(eventFont)) {
      event.eventFont = eventFont;
    }
    if (speakers !== undefined) event.speakers = Array.isArray(speakers) ? speakers : [];
    if (faqs !== undefined) event.faqs = Array.isArray(faqs) ? faqs : [];
    if (registrationFields !== undefined) event.registrationFields = registrationFields;
    if (ticketMode === "paid") {
      return res.status(400).json({
        message: "Paid events are coming soon! Only free events are supported at this time.",
        comingSoon: true,
      });
    }
    if (ticketMode !== undefined) event.ticketMode = ticketMode;
    if (qrEnabled !== undefined) event.qrEnabled = qrEnabled;
    if (ticketTypes !== undefined) event.ticketTypes = Array.isArray(ticketTypes) ? ticketTypes : [];
    if (volunteerEnabled !== undefined) event.volunteerEnabled = volunteerEnabled;
    if (volunteerRoles !== undefined) event.volunteerRoles = Array.isArray(volunteerRoles) ? volunteerRoles : [];
    const hasCertificateSettingsChange = [
      certificateEnabled,
      certificateTemplate,
      certificateTitle,
      certificateDescription,
      eventType,
      signatures,
      certificateShowOrganization,
      certificateOrganization,
      certificateOrganizationTagline,
      certificateOrganizationSize,
      certificateOrganizationAlign,
      certificateOrganizationUppercase,
      certificateLogoUrl,
      certificateLogoPath,
    ].some((value) => value !== undefined);

    if (certificateEnabled !== undefined) event.certificateEnabled = certificateEnabled;
    if (certificateTemplate !== undefined) event.certificateTemplate = certificateTemplate;
    if (certificateTitle !== undefined) event.certificateTitle = certificateTitle;
    if (certificateDescription !== undefined) event.certificateDescription = certificateDescription;
    if (eventType !== undefined) event.eventType = eventType;
    if (signatures !== undefined) event.signatures = Array.isArray(signatures) ? signatures : [];
    if (certificateEligibilityRule !== undefined) {
      const validSessionIds = getAllEventSessions(event).map((s) => s.sessionId);
      event.certificateEligibilityRule = normalizeCertificateEligibilityRule(
        certificateEligibilityRule,
        validSessionIds
      );
    }
    if (certificateShowOrganization !== undefined) event.certificateShowOrganization = certificateShowOrganization;
    if (certificateOrganization !== undefined) event.certificateOrganization = certificateOrganization;
    if (certificateOrganizationTagline !== undefined) {
      event.certificateOrganizationTagline = String(certificateOrganizationTagline || "").trim().slice(0, 200);
    }
    if (
      certificateOrganizationSize !== undefined &&
      CERTIFICATE_ORG_SIZES.includes(certificateOrganizationSize)
    ) {
      event.certificateOrganizationSize = certificateOrganizationSize;
    }
    if (
      certificateOrganizationAlign !== undefined &&
      CERTIFICATE_ORG_ALIGNS.includes(certificateOrganizationAlign)
    ) {
      event.certificateOrganizationAlign = certificateOrganizationAlign;
    }
    if (certificateOrganizationUppercase !== undefined) {
      event.certificateOrganizationUppercase = Boolean(certificateOrganizationUppercase);
    }
    if (certificateLogoUrl !== undefined) event.certificateLogoUrl = certificateLogoUrl;
    if (certificateLogoPath !== undefined) event.certificateLogoPath = certificateLogoPath;
    if (hasCertificateSettingsChange) {
      event.certificateUpdatedAt = new Date();
    }
    if (completedAt !== undefined) event.completedAt = completedAt;
    if (feedbackDeadline !== undefined) event.feedbackDeadline = feedbackDeadline ? new Date(feedbackDeadline) : null;
    if (requireFeedbackForCertificate !== undefined) event.requireFeedbackForCertificate = Boolean(requireFeedbackForCertificate);
    if (feedbackEnabled !== undefined) event.feedbackEnabled = Boolean(feedbackEnabled);
    if (feedbackQuestions !== undefined) {
      event.feedbackQuestions = Array.isArray(feedbackQuestions)
        ? feedbackQuestions.map((q, idx) => ({
            id: q.id || `q_${idx}_${Date.now()}`,
            label: String(q.label || "").trim() || `Question ${idx + 1}`,
            type: q.type === "text" ? "text" : "rating",
            required: q.required ?? true,
          }))
        : [];
    }

    if (status !== undefined) {
      if (!["draft", "published", "closed", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid event status" });
      }
      event.status = status;
    }

    await event.save();
    if (hasCertificateSettingsChange) {
      await Certificate.updateMany({ eventId: event._id }, { $unset: { pdfData: 1 } });
    }

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
      status: { $in: ["published", "closed", "completed"] },
    }).populate("organizerId", "name organization email");

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // Automatically complete event if dates have passed
    if (event.status === "published" && isEventCompleted(event)) {
      event.status = "completed";
      event.completedAt = event.completedAt || getEventEndDateTime(event) || new Date();
      await event.save();
    }

    const registrationCount = await Registration.countDocuments({
      eventId: event._id,
      status: "confirmed",
    });

    const organizerInfo = event.organizerId
      ? {
          name: event.organizerId.name,
          organization: event.organizerId.organization || "",
        }
      : null;

    const eventData = event.toObject();
    delete eventData.organizerId;

    res.json({
      event: {
        ...eventData,
        organizer: organizerInfo,
        registrationCount,
        isSoldOut: registrationCount >= event.capacity,
      },
    });
  } catch (error) {
    console.error("Public event error:", error);
    res.status(500).json({
      message: "Could not load event",
    });
  }
});

/*
  POST /api/events/:eventId/end
  Concludes the event, marks it completed, stops new registrations, and triggers feedback emails.
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

    // Trigger feedback email requests in background
    let emailResult = { sent: 0, failed: 0, skipped: 0 };
    try {
      emailResult = await sendFeedbackEmailsForEvent(event._id);
    } catch (emailErr) {
      console.error("Background feedback email trigger error:", emailErr.message);
    }

    // Ensure initial PostEventReport stub is created with 'collecting_feedback' or 'draft'
    await PostEventReport.findOneAndUpdate(
      { eventId: event._id },
      {
        $setOnInsert: {
          eventId: event._id,
          organizerId: req.userId,
          reportStatus: "collecting_feedback",
        },
      },
      { upsert: true }
    );

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

    const [registrations, attendanceRecords, feedbacks, emailLogs, report, certificates] = await Promise.all([
      Registration.find({ eventId: event._id }).lean(),
      Attendance.find({ eventId: event._id }).lean(),
      Feedback.find({ eventId: event._id }).lean(),
      EmailLog.find({ eventId: event._id, emailType: "feedback_request" }).lean(),
      PostEventReport.findOne({ eventId: event._id }).lean(),
      Certificate.find({ eventId: event._id }).lean(),
    ]);

    const attendanceByReg = new Map();
    for (const rec of attendanceRecords) {
      const key = String(rec.registrationId);
      if (!attendanceByReg.has(key)) attendanceByReg.set(key, []);
      attendanceByReg.get(key).push(rec);
    }

    const analytics = calculateReportAnalytics(registrations, feedbacks, attendanceRecords, event, certificates);
    const confirmedCount = analytics.confirmedCount;
    const sentEmailsCount = emailLogs.filter((l) => l.deliveryStatus === "sent").length;
    const failedEmailsCount = emailLogs.filter((l) => l.deliveryStatus === "failed").length;
    const feedbackCount = feedbacks.length;
    const pendingFeedback = Math.max(0, confirmedCount - feedbackCount);
    const avgRating = feedbackCount > 0
      ? Math.round((feedbacks.reduce((acc, f) => acc + f.ratingOverall, 0) / feedbackCount) * 10) / 10
      : 0;

    const eligibleForCert = registrations
      .filter((r) => r.status === "confirmed")
      .filter((r) => {
        const evalRes = evaluateRegistrationCertificateEligibility(
          event,
          r,
          attendanceByReg.get(String(r._id)) || []
        );
        return evalRes.eligibilityStatus === "eligible";
      }).length;

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
