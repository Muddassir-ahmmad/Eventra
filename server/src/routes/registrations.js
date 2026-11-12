import express from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Attendance from "../models/Attendance.js";
import { requireAuth } from "../middleware/auth.js";
import { makeRegistrationId } from "../utils/registrationId.js";
import emailService from "../services/emailService.js";
import { generateTicketPdf } from "../services/ticketPdfService.js";
import { isAttendanceEntryLocked, isEventCompleted } from "../utils/eventTiming.js";
import { formatParticipantName } from "../utils/participantName.js";
import { getEventDaysNormalized, resolveCheckInTarget } from "../utils/multiDay.js";

const router = express.Router();

function extractCleanTicketIdentifier(identifier) {
  let cleanId = String(identifier || "").trim();
  if (cleanId.includes("/tickets/")) {
    try {
      const parts = cleanId.split("/tickets/")[1].split(/[?#/]/);
      if (parts[0]) cleanId = decodeURIComponent(parts[0]).trim();
    } catch {}
  }
  if (cleanId.startsWith("{") && cleanId.endsWith("}")) {
    try {
      const parsed = JSON.parse(cleanId);
      cleanId = parsed.regId || parsed.registrationId || parsed.id || cleanId;
    } catch {}
  }
  return cleanId;
}

async function syncRegistrationAttendanceSummary(eventId, registrationId) {
  const records = await Attendance.find({ eventId, registrationId }).sort({ checkedInAt: 1 }).lean();
  const attendedDays = [
    ...new Set(
      records
        .filter((r) => r.attendanceType === "daily")
        .map((r) => Number(r.dayNumber))
        .filter((n) => n >= 1)
    ),
  ].sort((a, b) => a - b);
  const attendedSessions = [
    ...new Set(
      records
        .filter((r) => r.attendanceType === "session" && r.sessionId)
        .map((r) => String(r.sessionId))
    ),
  ];

  const anyAttended = records.length > 0;
  const firstAt = records[0]?.checkedInAt || null;
  const lastAt = records[records.length - 1]?.checkedInAt || null;

  return Registration.findByIdAndUpdate(
    registrationId,
    {
      $set: {
        checkedIn: anyAttended,
        checkedInAt: firstAt,
        lastCheckedInAt: lastAt,
        attendedDays,
        attendedSessions,
      },
    },
    { new: true }
  );
}

function rejectIfAttendanceLocked(event, res) {
  if (!isAttendanceEntryLocked(event)) return false;
  res.status(403).json({
    locked: true,
    message: "Attendance entry & QR scanning are locked because this event has already ended.",
  });
  return true;
}

// Public registration for an event
router.post("/public/:slug", async (req, res) => {
  try {
    const { name, email, phone, college, department, customAnswers, ticketType } = req.body;

    // 1. Mandatory pass holder identity validation
    if (!name || typeof name !== "string" || !name.trim() ||
        !email || typeof email !== "string" || !email.trim() ||
        !phone || typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({
        message: "Full Name, Email Address, and Phone Number are required to issue your ticket pass.",
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

    // 2. Dynamic Field Validation based on organizer's custom registration form configuration
    const configuredFields = Array.isArray(event.registrationFields) ? event.registrationFields : [];
    for (const field of configuredFields) {
      if (!field.required) continue;

      let val = "";
      if (field.key === "name") val = name;
      else if (field.key === "email") val = email;
      else if (field.key === "phone") val = phone;
      else if (field.key === "college") val = college;
      else if (field.key === "department") val = department;
      else {
        val = customAnswers?.[field.key];
      }

      if (val === undefined || val === null || String(val).trim() === "") {
        return res.status(400).json({
          message: `${field.label || "This field"} is required.`,
        });
      }
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
      name: formatParticipantName(name),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      college: (college || "").trim(),
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
        name: formatParticipantName(registration.name),
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

    const [registrations, attendanceRecords] = await Promise.all([
      Registration.find({ eventId: event._id }).sort({ createdAt: -1 }),
      Attendance.find({ eventId: event._id }).sort({ checkedInAt: 1 }).lean(),
    ]);

    const days = getEventDaysNormalized(event);
    const totalDays = Math.max(1, days.length);
    const isMultiDay = event.eventDurationType === "multi_day";

    const recordsByRegId = new Map();
    for (const rec of attendanceRecords) {
      const key = String(rec.registrationId);
      if (!recordsByRegId.has(key)) recordsByRegId.set(key, []);
      recordsByRegId.get(key).push(rec);
    }

    const total = registrations.length;
    const confirmed = registrations.filter((item) => item.status === "confirmed");
    const confirmedCount = confirmed.length;

    const enrichedRegistrations = registrations.map((item) => {
      const doc = item.toObject();
      doc.name = formatParticipantName(doc.name);
      const regRecords = recordsByRegId.get(String(item._id)) || [];
      const dailyRecs = regRecords.filter((r) => r.attendanceType === "daily");
      const sessionRecs = regRecords.filter((r) => r.attendanceType === "session" && r.sessionId);

      const daySet = new Set(dailyRecs.map((r) => Number(r.dayNumber)).filter((n) => n >= 1));
      if (daySet.size === 0 && Array.isArray(doc.attendedDays)) {
        doc.attendedDays.forEach((d) => {
          if (Number(d) >= 1) daySet.add(Number(d));
        });
      }
      if (daySet.size === 0 && doc.checkedIn === true) {
        daySet.add(1);
      }

      const attendedDays = [...daySet].sort((a, b) => a - b);
      const attendedSessions = [...new Set([
        ...sessionRecs.map((r) => String(r.sessionId)),
        ...(Array.isArray(doc.attendedSessions) ? doc.attendedSessions : []),
      ])];

      const attendanceByDay = {};
      for (const rec of dailyRecs) {
        attendanceByDay[rec.dayNumber] = {
          checkedIn: true,
          checkedInAt: rec.checkedInAt,
        };
      }
      if (Object.keys(attendanceByDay).length === 0 && doc.checkedIn) {
        attendanceByDay[1] = {
          checkedIn: true,
          checkedInAt: doc.checkedInAt,
        };
      }

      const attendedAllDays = attendedDays.length >= totalDays;
      const missedDaysCount = Math.max(0, totalDays - attendedDays.length);

      return {
        ...doc,
        attendedDays,
        attendedSessions,
        attendedAllDays,
        missedDaysCount,
        attendanceByDay,
      };
    });

    const confirmedEnriched = enrichedRegistrations.filter((item) => item.status === "confirmed");
    const attended = confirmedEnriched.filter((item) => item.checkedIn === true || item.attendedDays.length > 0);
    const absent = confirmedEnriched.filter((item) => !(item.checkedIn === true || item.attendedDays.length > 0));
    const cancelled = enrichedRegistrations.filter((item) => item.status === "cancelled");
    const attendancePercentage = confirmedCount > 0
      ? Math.round((attended.length / confirmedCount) * 1000) / 10
      : 0;

    // Day-wise and session-wise real analytics
    const daysAnalytics = days.map((day) => {
      const dayAttendedCount = confirmedEnriched.filter((reg) => reg.attendedDays.includes(day.dayNumber)).length;
      const dayAbsentCount = Math.max(0, confirmedCount - dayAttendedCount);
      const dayPct = confirmedCount > 0 ? Math.round((dayAttendedCount / confirmedCount) * 1000) / 10 : 0;

      const sessionStats = (day.sessions || []).map((ses) => {
        const sesAttendedCount = confirmedEnriched.filter((reg) =>
          reg.attendedSessions.includes(String(ses.sessionId))
        ).length;
        const sesPct = confirmedCount > 0 ? Math.round((sesAttendedCount / confirmedCount) * 1000) / 10 : 0;
        return {
          sessionId: ses.sessionId,
          title: ses.title,
          startTime: ses.startTime,
          endTime: ses.endTime,
          speaker: ses.speaker,
          venue: ses.venue,
          capacity: ses.capacity ?? null,
          attendedCount: sesAttendedCount,
          attendancePercentage: sesPct,
        };
      });

      return {
        dayNumber: day.dayNumber,
        date: day.date,
        title: day.title,
        startTime: day.startTime,
        endTime: day.endTime,
        attendedCount: dayAttendedCount,
        absentCount: dayAbsentCount,
        attendancePercentage: dayPct,
        sessions: sessionStats,
      };
    });

    const participantsAttendingAllDaysCount = confirmedEnriched.filter((r) => r.attendedAllDays).length;
    const participantsMissingSomeDaysCount = confirmedEnriched.filter(
      (r) => !r.attendedAllDays
    ).length;

    // Optional server-side filtering via query params
    const filterDay = req.query.dayNumber ? Number(req.query.dayNumber) : null;
    const filterSession = req.query.sessionId ? String(req.query.sessionId).trim() : null;
    const attendanceFilter = String(req.query.attendanceFilter || "").trim();

    let returnedRegistrations = enrichedRegistrations;
    if (attendanceFilter === "attended_all") {
      returnedRegistrations = returnedRegistrations.filter((r) => r.status === "confirmed" && r.attendedAllDays);
    } else if (attendanceFilter === "missed_some") {
      returnedRegistrations = returnedRegistrations.filter((r) => r.status === "confirmed" && !r.attendedAllDays);
    } else if (attendanceFilter === "attended_day" && filterDay) {
      returnedRegistrations = returnedRegistrations.filter((r) => r.attendedDays.includes(filterDay));
    } else if (attendanceFilter === "absent_day" && filterDay) {
      returnedRegistrations = returnedRegistrations.filter(
        (r) => r.status === "confirmed" && !r.attendedDays.includes(filterDay)
      );
    } else if (filterSession) {
      returnedRegistrations = returnedRegistrations.filter((r) =>
        r.attendedSessions.includes(filterSession)
      );
    }

    const attendanceLocked = isAttendanceEntryLocked(event);

    res.json({
      event: {
        id: event._id,
        title: event.title,
        capacity: event.capacity,
        date: event.date,
        eventDurationType: event.eventDurationType || "single_day",
        startDate: event.startDate || event.date,
        endDate: event.endDate || event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        days,
        sessionAttendanceEnabled: event.sessionAttendanceEnabled === true,
        venue: event.venue,
        status: event.status,
        completedAt: event.completedAt,
      },
      attendanceLocked,
      stats: {
        totalRegistrations: total,
        confirmedRegistrations: confirmed.length,
        attendedParticipants: attended.length,
        absentParticipants: absent.length,
        cancelledRegistrations: cancelled.length,
        attendancePercentage,
      },
      multiDayAnalytics: {
        isMultiDay,
        totalDays,
        participantsAttendingAllDaysCount,
        participantsMissingSomeDaysCount,
        days: daysAnalytics,
      },
      count: confirmed.length,
      attendedCount: attended.length,
      registrations: returnedRegistrations,
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
    if (rejectIfAttendanceLocked(event, res)) return;

    const {
      identifier,
      attendanceType,
      dayNumber,
      sessionId,
      checkInDate,
      checkInMethod,
    } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: "Participant Registration ID or QR payload is required." });
    }

    const cleanId = extractCleanTicketIdentifier(identifier);
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

    const target = resolveCheckInTarget(event, {
      attendanceType,
      dayNumber,
      sessionId,
      checkInDate,
    });
    if (target.error) {
      return res.status(target.statusCode || 400).json({ message: target.error });
    }

    if (target.attendanceType === "session" && event.sessionAttendanceEnabled === false) {
      return res.status(400).json({
        message: "Session-level attendance is disabled for this event. Enable it in Event Builder or switch to Daily Attendance.",
      });
    }

    // Legacy compatibility: if a single-day registration was manually reset via DB update without touching Attendance
    if (
      event.eventDurationType !== "multi_day" &&
      target.attendanceType === "daily" &&
      !registration.checkedIn
    ) {
      await Attendance.deleteMany({
        eventId: event._id,
        registrationId: registration._id,
        attendanceType: "daily",
      });
    }

    const dupFilter =
      target.attendanceType === "session"
        ? {
            eventId: event._id,
            registrationId: registration._id,
            attendanceType: "session",
            sessionId: target.session.sessionId,
          }
        : {
            eventId: event._id,
            registrationId: registration._id,
            attendanceType: "daily",
            dayNumber: target.day.dayNumber,
          };

    const existingRecord = await Attendance.findOne(dupFilter).lean();
    if (existingRecord) {
      const synced = await syncRegistrationAttendanceSummary(event._id, registration._id);
      const timeLabel = new Date(existingRecord.checkedInAt || registration.checkedInAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const scopeLabel =
        target.attendanceType === "session"
          ? `for session "${target.session.title}"`
          : event.eventDurationType === "multi_day"
          ? `for ${target.day.title}`
          : "";
      return res.status(200).json({
        alreadyCheckedIn: true,
        attendanceType: target.attendanceType,
        dayNumber: target.day.dayNumber,
        sessionId: target.session?.sessionId || null,
        attendanceRecord: existingRecord,
        message: `Already checked in ${scopeLabel} at ${timeLabel}`.replace(/\s+/g, " ").trim(),
        registration: synced || registration,
      });
    }

    if (target.attendanceType === "session" && target.session?.capacity > 0) {
      const currentSessionCount = await Attendance.countDocuments({
        eventId: event._id,
        attendanceType: "session",
        sessionId: target.session.sessionId,
      });
      if (currentSessionCount >= target.session.capacity) {
        return res.status(400).json({
          message: `Session capacity reached (${target.session.capacity}/${target.session.capacity}) for "${target.session.title}".`,
          registration,
        });
      }
    }

    let createdRecord = null;
    try {
      createdRecord = await Attendance.create({
        eventId: event._id,
        registrationId: registration._id,
        ticketCode: registration.registrationId,
        attendanceType: target.attendanceType,
        dayNumber: target.day.dayNumber,
        attendanceDate: target.day.date,
        sessionId: target.attendanceType === "session" ? target.session.sessionId : null,
        sessionTitle: target.attendanceType === "session" ? target.session.title : "",
        checkInMethod: checkInMethod === "manual" ? "manual" : "qr",
        checkedInBy: req.userId || null,
        checkedInAt: new Date(),
      });
    } catch (createErr) {
      if (createErr?.code === 11000) {
        const racedRecord = await Attendance.findOne(dupFilter).lean();
        const synced = await syncRegistrationAttendanceSummary(event._id, registration._id);
        const scopeLabel =
          target.attendanceType === "session"
            ? `for session "${target.session.title}"`
            : event.eventDurationType === "multi_day"
            ? `for ${target.day.title}`
            : "";
        return res.status(200).json({
          alreadyCheckedIn: true,
          attendanceType: target.attendanceType,
          dayNumber: target.day.dayNumber,
          sessionId: target.session?.sessionId || null,
          attendanceRecord: racedRecord,
          message: `Already checked in ${scopeLabel}`.trim(),
          registration: synced || registration,
        });
      }
      throw createErr;
    }

    const updatedRegistration = await syncRegistrationAttendanceSummary(event._id, registration._id);
    const participantName = formatParticipantName(registration.name, "Participant");
    const targetBadge =
      target.attendanceType === "session"
        ? ` — ${target.day.title}: ${target.session.title}`
        : event.eventDurationType === "multi_day"
        ? ` — ${target.day.title}`
        : "";

    res.json({
      success: true,
      alreadyCheckedIn: false,
      attendanceType: target.attendanceType,
      dayNumber: target.day.dayNumber,
      sessionId: target.session?.sessionId || null,
      attendanceRecord: createdRecord,
      message: `Verified! Welcome, ${participantName}${targetBadge}.`,
      registration: updatedRegistration || registration,
    });
  } catch (error) {
    console.error("Attendance check-in error:", error);
    res.status(500).json({ message: "Could not mark attendance." });
  }
});

// Organizer: toggle attendee attendance status manually (supports daily & session modes)
router.post("/event/:eventId/registrations/:registrationId/toggle-attendance", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (rejectIfAttendanceLocked(event, res)) return;

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      eventId: event._id,
    });
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    if (registration.status === "cancelled") {
      return res.status(400).json({ message: "Cannot modify attendance for a cancelled registration." });
    }

    const { attendanceType, dayNumber, sessionId, present } = req.body || {};

    // Legacy single-day behavior when no specific day/session parameters were sent
    if (
      event.eventDurationType !== "multi_day" &&
      !sessionId &&
      dayNumber === undefined &&
      attendanceType !== "session"
    ) {
      const nextCheckedIn = typeof present === "boolean" ? present : !registration.checkedIn;
      const days = getEventDaysNormalized(event);
      const day1 = days[0];
      if (nextCheckedIn) {
        await Attendance.findOneAndUpdate(
          {
            eventId: event._id,
            registrationId: registration._id,
            attendanceType: "daily",
            dayNumber: day1.dayNumber,
          },
          {
            $setOnInsert: {
              ticketCode: registration.registrationId,
              attendanceDate: day1.date,
              checkInMethod: "manual",
              checkedInBy: req.userId || null,
              checkedInAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
      } else {
        await Attendance.deleteMany({
          eventId: event._id,
          registrationId: registration._id,
          attendanceType: "daily",
        });
      }

      const updatedRegistration = await syncRegistrationAttendanceSummary(event._id, registration._id);
      return res.json({
        message: `Attendance updated to ${updatedRegistration.checkedIn ? "Checked In" : "Absent"}.`,
        registration: updatedRegistration,
      });
    }

    const target = resolveCheckInTarget(event, { attendanceType, dayNumber, sessionId });
    if (target.error) {
      return res.status(target.statusCode || 400).json({ message: target.error });
    }
    if (target.attendanceType === "session" && event.sessionAttendanceEnabled === false) {
      return res.status(400).json({ message: "Session-level attendance is disabled for this event." });
    }

    const filter =
      target.attendanceType === "session"
        ? {
            eventId: event._id,
            registrationId: registration._id,
            attendanceType: "session",
            sessionId: target.session.sessionId,
          }
        : {
            eventId: event._id,
            registrationId: registration._id,
            attendanceType: "daily",
            dayNumber: target.day.dayNumber,
          };

    const existing = await Attendance.findOne(filter);
    const shouldCheckIn = typeof present === "boolean" ? present : !existing;

    if (shouldCheckIn && !existing) {
      if (target.attendanceType === "session" && target.session?.capacity > 0) {
        const currentCount = await Attendance.countDocuments({
          eventId: event._id,
          attendanceType: "session",
          sessionId: target.session.sessionId,
        });
        if (currentCount >= target.session.capacity) {
          return res.status(400).json({
            message: `Session capacity reached (${target.session.capacity}/${target.session.capacity}).`,
          });
        }
      }
      await Attendance.create({
        eventId: event._id,
        registrationId: registration._id,
        ticketCode: registration.registrationId,
        attendanceType: target.attendanceType,
        dayNumber: target.day.dayNumber,
        attendanceDate: target.day.date,
        sessionId: target.attendanceType === "session" ? target.session.sessionId : null,
        sessionTitle: target.attendanceType === "session" ? target.session.title : "",
        checkInMethod: "manual",
        checkedInBy: req.userId || null,
        checkedInAt: new Date(),
      }).catch((err) => {
        if (err?.code !== 11000) throw err;
      });
    } else if (!shouldCheckIn && existing) {
      await Attendance.deleteOne({ _id: existing._id });
    }

    const updatedRegistration = await syncRegistrationAttendanceSummary(event._id, registration._id);
    const targetName =
      target.attendanceType === "session" ? `session "${target.session.title}"` : target.day.title;
    return res.json({
      message: `${targetName} attendance updated to ${shouldCheckIn ? "Checked In" : "Absent"}.`,
      registration: updatedRegistration,
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
    await Attendance.deleteMany({ eventId: event._id, registrationId: registration._id });

    res.json({
      success: true,
      message: `Registration for ${formatParticipantName(registration.name, "Participant")} (${registration.registrationId}) has been deleted.`,
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
      "title date startDate endDate eventDurationType days sessionAttendanceEnabled startTime endTime venue location posterUrl status mode contactEmail organizerId"
    ).populate("organizerId", "name organization");

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const attendanceRecords = await Attendance.find({
      eventId: event._id,
      registrationId: registration._id,
    })
      .sort({ dayNumber: 1, checkedInAt: 1 })
      .lean();

    res.json({
      registration: {
        id: registration._id,
        registrationId: registration.registrationId,
        name: formatParticipantName(registration.name),
        email: registration.email,
        phone: registration.phone,
        college: registration.college,
        department: registration.department,
        ticketType: registration.ticketType || "General Admission",
        checkedIn: registration.checkedIn,
        checkedInAt: registration.checkedInAt,
        attendedDays: registration.attendedDays || [],
        attendedSessions: registration.attendedSessions || [],
        attendanceRecords,
      },
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        startDate: event.startDate || event.date,
        endDate: event.endDate || event.date,
        eventDurationType: event.eventDurationType || "single_day",
        days: getEventDaysNormalized(event),
        sessionAttendanceEnabled: Boolean(event.sessionAttendanceEnabled),
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        location: event.location,
        mode: event.mode,
        posterUrl: event.posterUrl,
        status: event.status,
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
        select: "title slug date startDate endDate eventDurationType days sessionAttendanceEnabled startTime endTime venue location mode status posterUrl certificateSettings requireFeedbackForCertificate certificateEligibilityRule",
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      registrations: registrations
        .filter((r) => r.eventId != null)
        .map((r) => ({ ...r, name: formatParticipantName(r.name) })),
    });
  } catch (err) {
    console.error("Participant registrations lookup error:", err);
    res.status(500).json({ message: "Could not retrieve participant registrations." });
  }
});

export default router;
