import express from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import { requireAuth } from "../middleware/auth.js";
import { makeRegistrationId } from "../utils/registrationId.js";
import emailService from "../services/emailService.js";
import { generateTicketPdf } from "../services/ticketPdfService.js";
import { isEventCompleted } from "../utils/eventTiming.js";

const router = express.Router();

// Public registration for an event
router.post("/public/:slug", async (req, res) => {
  try {
    const { name, email, phone, college, department, customAnswers, ticketType } = req.body;

    if (!name || !email || !phone || !college) {
      return res.status(400).json({
        message: "Name, email, phone and college are required",
      });
    }

    const event = await Event.findOne({
      slug: req.params.slug,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (event.status === "completed" || isEventCompleted(event)) {
      if (event.status !== "completed") {
        event.status = "completed";
        event.completedAt = event.completedAt || new Date();
        await event.save();
      }
      return res.status(409).json({
        message: "This event has already concluded and registration is closed.",
      });
    }

    if (event.status === "closed") {
      return res.status(409).json({
        message: "Registration is closed for this event.",
      });
    }

    if (event.status !== "published") {
      return res.status(403).json({
        message: "This event is currently a draft and not open for public registrations.",
      });
    }

    if (
      event.registrationDeadline &&
      new Date() > new Date(event.registrationDeadline)
    ) {
      return res.status(400).json({
        message: "Registration deadline has passed",
      });
    }

    const registrationCount = await Registration.countDocuments({
      eventId: event._id,
      status: "confirmed",
    });

    if (registrationCount >= event.capacity) {
      return res.status(409).json({
        message: "This event is sold out",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    // Enforce one email and one phone per registration
    const existingEmail = await Registration.findOne({
      eventId: event._id,
      email: cleanEmail,
      status: "confirmed",
    });

    if (existingEmail) {
      return res.status(409).json({
        message: "This email is already registered for this event. One email allows one access.",
      });
    }

    const existingPhone = await Registration.findOne({
      eventId: event._id,
      phone: cleanPhone,
      status: "confirmed",
    });

    if (existingPhone) {
      return res.status(409).json({
        message: "This phone number is already registered for this event. One phone allows one access.",
      });
    }

    let registrationId = makeRegistrationId();

    while (await Registration.exists({ registrationId })) {
      registrationId = makeRegistrationId();
    }

    const registration = await Registration.create({
      eventId: event._id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      college: college.trim(),
      department: (department || "").trim(),
      ticketType: ticketType || "General Admission",
      customAnswers: customAnswers || {},
      registrationId,
    });

    // Asynchronously dispatch confirmation & ticket emails in background
    const newCount = registrationCount + 1;
    emailService.sendRegistrationConfirmation(event, registration).catch((err) => {
      console.error("Background registration confirmation email error:", err.message);
    });

    emailService.sendTicketEmail(event, registration).catch((err) => {
      console.error("Background ticket email error:", err.message);
    });

    // Notify organizer in background
    emailService.sendOrganizerRegistrationAlert(event, registration, newCount).catch((err) => {
      console.error("Background organizer alert error:", err.message);
    });

    if (newCount >= event.capacity) {
      emailService.sendOrganizerCapacityAlert(event, newCount).catch((err) => {
        console.error("Background organizer capacity alert error:", err.message);
      });
    }

    res.status(201).json({
      message: "Registration successful",
      registration: {
        id: registration._id,
        registrationId: registration.registrationId,
        name: registration.name,
        email: registration.email,
        phone: registration.phone,
        college: registration.college,
        department: registration.department,
        ticketType: registration.ticketType,
        eventName: event.title,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered for this event",
      });
    }

    console.error(error);
    res.status(500).json({
      message: "Could not complete registration",
    });
  }
});

// Organizer: view registrations and attendance stats for one of their events
router.get("/event/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const registrations = await Registration.find({
      eventId: event._id,
    }).sort({ createdAt: -1 });

    const total = registrations.length;
    const confirmed = registrations.filter((item) => item.status === "confirmed");
    const attended = confirmed.filter((item) => item.checkedIn === true);
    const absent = confirmed.filter((item) => item.checkedIn !== true);
    const cancelled = registrations.filter((item) => item.status === "cancelled");
    const attendancePercentage = confirmed.length > 0
      ? Math.round((attended.length / confirmed.length) * 1000) / 10
      : 0;

    res.json({
      event: {
        id: event._id,
        title: event.title,
        capacity: event.capacity,
        date: event.date,
        venue: event.venue,
        status: event.status,
      },
      stats: {
        totalRegistrations: total,
        confirmedRegistrations: confirmed.length,
        attendedParticipants: attended.length,
        absentParticipants: absent.length,
        cancelledRegistrations: cancelled.length,
        attendancePercentage,
      },
      count: confirmed.length,
      attendedCount: attended.length,
      registrations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not load registrations",
    });
  }
});

// Organizer: mark participant attendance (QR scan or manual check-in)
router.post("/event/:eventId/checkin", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found or unauthorized." });
    }

    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: "Participant Registration ID or QR payload is required." });
    }

    let cleanId = String(identifier).trim();

    // Check if identifier is a ticket URL e.g. http://.../tickets/EVT-XXXX
    if (cleanId.includes("/tickets/")) {
      try {
        const parts = cleanId.split("/tickets/")[1].split(/[?#/]/);
        if (parts[0]) cleanId = decodeURIComponent(parts[0]).trim();
      } catch {}
    }

    // Check if identifier is embedded JSON payload from camera QR scanner
    if (cleanId.startsWith("{") && cleanId.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanId);
        cleanId = parsed.regId || parsed.registrationId || parsed.id || cleanId;
      } catch {}
    }

    const isObjectId = /^[a-f\d]{24}$/i.test(cleanId);

    const query = {
      eventId: event._id,
      $or: [
        { registrationId: cleanId },
        { email: cleanId.toLowerCase() },
      ],
    };
    if (isObjectId) {
      query.$or.push({ _id: cleanId });
    }

    const registration = await Registration.findOne(query);

    if (!registration) {
      return res.status(404).json({ message: "Participant registration not found for this event." });
    }

    if (registration.status === "cancelled") {
      return res.status(400).json({
        message: "Cannot check in: this registration was cancelled.",
        registration,
      });
    }

    if (registration.checkedIn) {
      return res.status(200).json({
        alreadyCheckedIn: true,
        message: `Already checked in at ${new Date(registration.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        registration,
      });
    }

    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    await registration.save();

    res.json({
      success: true,
      alreadyCheckedIn: false,
      message: `Verified! Welcome, ${registration.name}.`,
      registration,
    });
  } catch (error) {
    console.error("Attendance check-in error:", error);
    res.status(500).json({ message: "Could not mark attendance." });
  }
});

// Organizer: toggle attendee attendance status manually
router.post("/event/:eventId/registrations/:registrationId/toggle-attendance", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      eventId: event._id,
    });
    if (!registration) return res.status(404).json({ message: "Registration not found" });

    registration.checkedIn = !registration.checkedIn;
    registration.checkedInAt = registration.checkedIn ? new Date() : null;
    await registration.save();

    res.json({
      message: `Attendance updated to ${registration.checkedIn ? "Checked In" : "Absent"}.`,
      registration,
    });
  } catch (err) {
    console.error("Toggle attendance error:", err);
    res.status(500).json({ message: "Could not update attendance status." });
  }
});

// Organizer: delete an attendee registration (e.g. duplicate booking, revoked attendee)
router.delete("/event/:eventId/registrations/:registrationId", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found or unauthorized." });
    }

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      eventId: event._id,
    });
    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }

    await Registration.deleteOne({ _id: registration._id });

    res.json({
      success: true,
      message: `Registration for ${registration.name} (${registration.registrationId}) has been deleted.`,
    });
  } catch (err) {
    console.error("Delete registration error:", err);
    res.status(500).json({ message: "Could not delete registration." });
  }
});

// Public: fetch digital ticket details by registration ID
router.get("/ticket/:registrationId", async (req, res) => {
  try {
    const registration = await Registration.findOne({
      registrationId: req.params.registrationId,
      status: "confirmed",
    });

    if (!registration) {
      return res.status(404).json({ message: "Digital ticket not found or inactive." });
    }

    const event = await Event.findById(registration.eventId).select(
      "title date startTime endTime venue location posterUrl status mode contactEmail organizerId"
    ).populate("organizerId", "name organization");

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    res.json({
      registration: {
        id: registration._id,
        registrationId: registration.registrationId,
        name: registration.name,
        email: registration.email,
        phone: registration.phone,
        college: registration.college,
        department: registration.department,
        ticketType: registration.ticketType || "General Admission",
        checkedIn: registration.checkedIn,
        checkedInAt: registration.checkedInAt,
      },
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        location: event.location,
        mode: event.mode,
        posterUrl: event.posterUrl,
        organizer: event.organizerId
          ? { name: event.organizerId.name, organization: event.organizerId.organization }
          : null,
      },
    });
  } catch (err) {
    console.error("Public ticket view error:", err);
    res.status(500).json({ message: "Could not load ticket." });
  }
});

// Public: download official PDF ticket pass with embedded QR code
router.get("/ticket/:registrationId/pdf", async (req, res) => {
  try {
    const registration = await Registration.findOne({
      registrationId: req.params.registrationId,
      status: "confirmed",
    });

    if (!registration) {
      return res.status(404).json({ message: "Ticket registration not found or inactive." });
    }

    const event = await Event.findById(registration.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (event.status === "completed" || isEventCompleted(event)) {
      return res.status(410).json({ message: "This ticket pass has expired because the event date has passed." });
    }

    const pdfBuffer = await generateTicketPdf(event, registration);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="eventra-ticket-${registration.registrationId}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Generate ticket PDF error:", err);
    res.status(500).json({ message: "Could not download ticket PDF." });
  }
});

// Public participant lookup for Participant Dashboard & Event Pages
router.get("/participant/lookup", async (req, res) => {
  try {
    const email = req.query.email ? String(req.query.email).trim().toLowerCase() : "";
    const phone = req.query.phone ? String(req.query.phone).trim() : "";
    const slug = req.query.slug ? String(req.query.slug).trim() : "";
    const eventId = req.query.eventId ? String(req.query.eventId).trim() : "";

    if (!email && !phone) {
      return res.status(400).json({ message: "Please provide an email or phone number to look up registrations." });
    }

    let targetEventId = null;
    if (eventId) {
      targetEventId = eventId;
    } else if (slug) {
      const matchedEvent = await Event.findOne({ slug }).select("_id").lean();
      if (matchedEvent) {
        targetEventId = matchedEvent._id;
      }
    }

    const query = { status: "confirmed", $or: [] };
    if (targetEventId) {
      query.eventId = targetEventId;
    }
    if (email) query.$or.push({ email });
    if (phone) query.$or.push({ phone });

    const registrations = await Registration.find(query)
      .populate({
        path: "eventId",
        select: "title slug date startTime endTime venue location mode status posterUrl certificateSettings requireFeedbackForCertificate",
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      registrations: registrations.filter((r) => r.eventId != null),
    });
  } catch (err) {
    console.error("Participant registrations lookup error:", err);
    res.status(500).json({ message: "Could not retrieve participant registrations." });
  }
});

export default router;
