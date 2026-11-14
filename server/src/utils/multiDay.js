import { randomUUID } from "node:crypto";

export const EVENT_DURATION_TYPES = ["single_day", "multi_day"];
export const CERTIFICATE_ELIGIBILITY_MODES = [
  "any_day",
  "all_days",
  "min_days",
  "at_least_one_session",
  "all_selected_sessions",
  "min_sessions",
  "required_sessions",
];
export const MAX_MULTI_DAY_SPAN = 60;

/**
 * Parses a date string ("YYYY-MM-DD" or ISO string) or Date into UTC midnight.
 *
 * @param {string|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseUtcDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const y = Number(match[1]);
      const m = Number(match[2]) - 1;
      const d = Number(match[3]);
      const parsed = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
      if (
        !Number.isNaN(parsed.getTime()) &&
        parsed.getUTCFullYear() === y &&
        parsed.getUTCMonth() === m &&
        parsed.getUTCDate() === d
      ) {
        return parsed;
      }
      return null;
    }
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Formats a date as a canonical "YYYY-MM-DD" UTC string.
 *
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function toDateKey(value) {
  const dt = parseUtcDateOnly(value);
  if (!dt) return "";
  return dt.toISOString().slice(0, 10);
}

/**
 * Parses "HH:MM" or "hh:mm AM/PM" into minutes since midnight, or null if invalid/empty.
 *
 * @param {string} value
 * @returns {number|null}
 */
export function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (minutes < 0 || minutes > 59) return null;
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  if (!ampm && (hours < 0 || hours > 23)) return null;
  if (ampm && (hours < 0 || hours > 23)) return null;
  return hours * 60 + minutes;
}

/**
 * Generates sequential day objects for every calendar day between startDate and endDate (inclusive).
 *
 * @param {string|Date} startDateInput
 * @param {string|Date} endDateInput
 * @param {{ defaultStartTime?: string, defaultEndTime?: string }} [defaults]
 * @returns {Array<Object>}
 */
export function enumerateDaysInRange(startDateInput, endDateInput, defaults = {}) {
  const start = parseUtcDateOnly(startDateInput);
  const end = parseUtcDateOnly(endDateInput);
  if (!start || !end || end.getTime() < start.getTime()) return [];

  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const count = Math.min(MAX_MULTI_DAY_SPAN, Math.max(1, diffDays));
  const result = [];

  for (let idx = 0; idx < count; idx += 1) {
    const dt = new Date(start.getTime() + idx * 86400000);
    result.push({
      dayNumber: idx + 1,
      date: dt,
      title: `Day ${idx + 1}`,
      startTime: String(defaults.defaultStartTime || "").trim(),
      endTime: String(defaults.defaultEndTime || "").trim(),
      sessions: [],
    });
  }
  return result;
}

/**
 * Formats single-day or multi-day event dates into a concise human-readable label.
 *
 * @param {Object} event
 * @returns {string}
 */
export function formatEventDateRangeLabel(event) {
  if (!event) return "Event Date";
  const isMulti = event.eventDurationType === "multi_day";
  const start = parseUtcDateOnly(event.startDate || event.date);
  const end = isMulti ? parseUtcDateOnly(event.endDate || event.date) : start;
  if (!start) return "Event Date";

  const fmt = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  if (!isMulti || !end || toDateKey(start) === toDateKey(end)) {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(start);
  }

  const daysCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return `${fmt.format(start)} – ${fmt.format(end)} (${daysCount} Days)`;
}

function normalizeSession(rawSession, index) {
  const sessionId = String(rawSession?.sessionId || rawSession?._id || "").trim() || `ses_${randomUUID().slice(0, 12)}`;
  const title = String(rawSession?.title || "").trim().slice(0, 140);
  const description = String(rawSession?.description || "").trim().slice(0, 1000);
  const startTime = String(rawSession?.startTime || "").trim().slice(0, 30);
  const endTime = String(rawSession?.endTime || "").trim().slice(0, 30);
  const speaker = String(rawSession?.speaker || "").trim().slice(0, 120);
  const venue = String(rawSession?.venue || "").trim().slice(0, 120);
  const registrationAvailable = rawSession?.registrationAvailable !== false;
  const rawStatus = String(rawSession?.status || "UPCOMING").toUpperCase().trim();
  const status = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"].includes(rawStatus)
    ? rawStatus
    : "UPCOMING";

  let capacity = null;
  if (rawSession?.capacity !== null && rawSession?.capacity !== undefined && rawSession?.capacity !== "") {
    const parsedCap = Number(rawSession.capacity);
    if (!Number.isFinite(parsedCap) || parsedCap < 1) {
      return { error: `Session "${title || `#${index + 1}`}" capacity must be at least 1.` };
    }
    capacity = Math.floor(parsedCap);
  }

  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  if (startMins !== null && endMins !== null && endMins <= startMins) {
    return { error: `Session "${title || `#${index + 1}`}" end time must be after start time.` };
  }

  return {
    value: {
      sessionId,
      title: title || `Session ${index + 1}`,
      description,
      startTime,
      endTime,
      speaker,
      venue,
      capacity,
      registrationAvailable,
      status,
      order: Number.isFinite(Number(rawSession?.order)) ? Number(rawSession.order) : index,
    },
  };
}

/**
 * Validates and normalizes single-day or multi-day event dates and day-wise sessions.
 * Preserves full backward compatibility with single-day events.
 *
 * @param {Object} input
 * @returns {{ value?: Object, error?: string }}
 */
export function validateAndNormalizeMultiDaySchedule(input = {}) {
  const durationType = input.eventDurationType === "multi_day" ? "multi_day" : "single_day";
  const sessionAttendanceEnabled = input.sessionAttendanceEnabled === true;

  if (durationType === "single_day") {
    const baseDate = parseUtcDateOnly(input.date || input.startDate);
    const normalizedAgenda = Array.isArray(input.agenda) ? input.agenda : [];
    const normalizedDays = Array.isArray(input.days) && input.days.length === 1
      ? input.days.map((d, idx) => ({
          dayNumber: 1,
          date: parseUtcDateOnly(d.date) || baseDate || new Date(),
          title: String(d.title || "Day 1").trim().slice(0, 100) || "Day 1",
          startTime: String(d.startTime || input.startTime || "").trim().slice(0, 30),
          endTime: String(d.endTime || input.endTime || "").trim().slice(0, 30),
          sessions: Array.isArray(d.sessions)
            ? d.sessions.map((s, sIdx) => normalizeSession(s, sIdx).value).filter(Boolean)
            : [],
        }))
      : [];

    return {
      value: {
        eventDurationType: "single_day",
        date: baseDate || input.date,
        startDate: baseDate || null,
        endDate: baseDate || null,
        startTime: String(input.startTime || "").trim(),
        endTime: String(input.endTime || "").trim(),
        days: normalizedDays,
        agenda: normalizedAgenda,
        sessionAttendanceEnabled,
      },
    };
  }

  const startDate = parseUtcDateOnly(input.startDate || input.date);
  const endDate = parseUtcDateOnly(input.endDate);

  if (!startDate) {
    return { error: "Start date is required for multi-day events." };
  }
  if (!endDate) {
    return { error: "End date is required for multi-day events." };
  }
  if (endDate.getTime() < startDate.getTime()) {
    return { error: "End date must be on or after the start date." };
  }

  const daySpan = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  if (daySpan > MAX_MULTI_DAY_SPAN) {
    return { error: `Multi-day events can span at most ${MAX_MULTI_DAY_SPAN} days.` };
  }

  const rawDays = Array.isArray(input.days) && input.days.length > 0
    ? input.days
    : enumerateDaysInRange(startDate, endDate, {
        defaultStartTime: input.startTime,
        defaultEndTime: input.endTime,
      });

  if (rawDays.length > MAX_MULTI_DAY_SPAN) {
    return { error: `An event can configure at most ${MAX_MULTI_DAY_SPAN} days.` };
  }

  const seenDateKeys = new Set();
  const normalizedDays = [];

  for (let i = 0; i < rawDays.length; i += 1) {
    const rawDay = rawDays[i] || {};
    const dayDate = parseUtcDateOnly(rawDay.date);
    if (!dayDate) {
      return { error: `Day ${i + 1} must have a valid date.` };
    }
    if (dayDate.getTime() < startDate.getTime() || dayDate.getTime() > endDate.getTime()) {
      return {
        error: `Day date ${toDateKey(dayDate)} falls outside the event duration (${toDateKey(startDate)} to ${toDateKey(endDate)}).`,
      };
    }

    const dateKey = toDateKey(dayDate);
    if (seenDateKeys.has(dateKey)) {
      return { error: `Duplicate day schedule found for date ${dateKey}. Each event day must have a unique date.` };
    }
    seenDateKeys.add(dateKey);

    const dayStartTime = String(rawDay.startTime || input.startTime || "").trim().slice(0, 30);
    const dayEndTime = String(rawDay.endTime || input.endTime || "").trim().slice(0, 30);
    const dStartMins = parseTimeToMinutes(dayStartTime);
    const dEndMins = parseTimeToMinutes(dayEndTime);
    if (dStartMins !== null && dEndMins !== null && dEndMins <= dStartMins) {
      return { error: `Day ${i + 1} end time must be after start time.` };
    }

    const rawSessions = Array.isArray(rawDay.sessions) ? rawDay.sessions : [];
    const normalizedSessions = [];
    for (let sIdx = 0; sIdx < rawSessions.length; sIdx += 1) {
      const res = normalizeSession(rawSessions[sIdx], sIdx);
      if (res.error) return { error: `Day ${i + 1}: ${res.error}` };
      normalizedSessions.push(res.value);
    }
    normalizedSessions.sort((a, b) => a.order - b.order);
    normalizedSessions.forEach((s, idx) => {
      s.order = idx;
    });

    for (let aIdx = 0; aIdx < normalizedSessions.length; aIdx += 1) {
      const sA = normalizedSessions[aIdx];
      const sAStart = parseTimeToMinutes(sA.startTime);
      const sAEnd = parseTimeToMinutes(sA.endTime);
      if (sAStart === null || sAEnd === null || !sA.venue || sA.status === "CANCELLED") continue;

      for (let bIdx = aIdx + 1; bIdx < normalizedSessions.length; bIdx += 1) {
        const sB = normalizedSessions[bIdx];
        if (sB.status === "CANCELLED") continue;
        if (!sB.venue || sB.venue.toLowerCase().trim() !== sA.venue.toLowerCase().trim()) continue;
        const sBStart = parseTimeToMinutes(sB.startTime);
        const sBEnd = parseTimeToMinutes(sB.endTime);
        if (sBStart === null || sBEnd === null) continue;

        if (sAStart < sBEnd && sBStart < sAEnd) {
          return {
            error: `Day ${i + 1}: Sessions "${sA.title}" and "${sB.title}" have overlapping time slots in "${sA.venue}".`,
          };
        }
      }
    }

    normalizedDays.push({
      dayNumber: Number(rawDay.dayNumber) || i + 1,
      date: dayDate,
      title: String(rawDay.title || `Day ${i + 1}`).trim().slice(0, 100) || `Day ${i + 1}`,
      startTime: dayStartTime,
      endTime: dayEndTime,
      sessions: normalizedSessions,
    });
  }

  // Sort chronologically by date and assign sequential dayNumber 1..N
  normalizedDays.sort((a, b) => a.date.getTime() - b.date.getTime());
  normalizedDays.forEach((day, idx) => {
    day.dayNumber = idx + 1;
    if (/^Day\s+\d+$/i.test(day.title)) {
      day.title = `Day ${idx + 1}`;
    }
  });

  // Derive legacy flat agenda projection so older read-only consumers still get sessions
  const flatAgenda = [];
  for (const day of normalizedDays) {
    for (const ses of day.sessions) {
      const slot = ses.startTime
        ? `${ses.startTime}${ses.endTime ? ` - ${ses.endTime}` : ""}`
        : "Scheduled";
      flatAgenda.push({
        time: `${day.title} · ${slot}`,
        title: ses.title,
        description: ses.description,
        speaker: ses.speaker,
      });
    }
  }

  return {
    value: {
      eventDurationType: "multi_day",
      date: startDate,
      startDate,
      endDate,
      startTime: String(input.startTime || normalizedDays[0]?.startTime || "").trim(),
      endTime: String(input.endTime || normalizedDays[normalizedDays.length - 1]?.endTime || "").trim(),
      days: normalizedDays,
      agenda: flatAgenda.length > 0 ? flatAgenda : (Array.isArray(input.agenda) ? input.agenda : []),
      sessionAttendanceEnabled,
    },
  };
}

/**
 * Returns normalized chronological days for any event (single-day or multi-day).
 *
 * @param {Object} event
 * @returns {Array<Object>}
 */
export function getEventDaysNormalized(event) {
  if (!event) return [];
  const isMulti = event.eventDurationType === "multi_day";

  if (Array.isArray(event.days) && event.days.length > 0) {
    return [...event.days]
      .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))
      .map((day, idx) => ({
        dayNumber: Number(day.dayNumber) || idx + 1,
        date: parseUtcDateOnly(day.date) || parseUtcDateOnly(event.startDate || event.date) || new Date(),
        title: String(day.title || `Day ${idx + 1}`).trim() || `Day ${idx + 1}`,
        startTime: String(day.startTime || event.startTime || "").trim(),
        endTime: String(day.endTime || event.endTime || "").trim(),
        sessions: Array.isArray(day.sessions)
          ? [...day.sessions].sort((a, b) => (a.order || 0) - (b.order || 0))
          : [],
      }));
  }

  if (isMulti && event.startDate && event.endDate) {
    return enumerateDaysInRange(event.startDate, event.endDate, {
      defaultStartTime: event.startTime,
      defaultEndTime: event.endTime,
    });
  }

  const singleDate = parseUtcDateOnly(event.date || event.startDate) || new Date();
  return [
    {
      dayNumber: 1,
      date: singleDate,
      title: "Day 1",
      startTime: String(event.startTime || "").trim(),
      endTime: String(event.endTime || "").trim(),
      sessions: (Array.isArray(event.agenda) ? event.agenda : []).map((item, idx) => ({
        sessionId: item._id ? String(item._id) : `legacy_ses_${idx + 1}`,
        title: item.title || `Session ${idx + 1}`,
        description: item.description || "",
        startTime: item.time || "",
        endTime: "",
        speaker: item.speaker || "",
        venue: event.venue || "",
        capacity: null,
        order: idx,
      })),
    },
  ];
}

/**
 * Finds all sessions across all event days with their parent dayNumber and date.
 *
 * @param {Object} event
 * @returns {Array<Object>}
 */
export function getAllEventSessions(event) {
  const days = getEventDaysNormalized(event);
  const sessions = [];
  for (const day of days) {
    for (const ses of day.sessions || []) {
      sessions.push({
        ...ses,
        dayNumber: day.dayNumber,
        dayTitle: day.title,
        dayDate: day.date,
      });
    }
  }
  return sessions;
}

/**
 * Resolves and validates the target day or session for an attendance check-in operation.
 *
 * @param {Object} event
 * @param {Object} options
 * @returns {{ attendanceType?: "daily"|"session", day?: Object, session?: Object|null, error?: string, statusCode?: number }}
 */
export function resolveCheckInTarget(event, { attendanceType, dayNumber, sessionId, checkInDate } = {}) {
  const days = getEventDaysNormalized(event);
  if (days.length === 0) {
    return { error: "Event schedule does not contain any valid event dates.", statusCode: 400 };
  }

  if (event.status === "draft") {
    return {
      error: "Attendance cannot be marked while this event is in draft status. Publish the event first.",
      statusCode: 400,
    };
  }

  const requestedType = attendanceType === "session" || (sessionId && attendanceType !== "daily")
    ? "session"
    : "daily";

  if (requestedType === "session") {
    if (!sessionId) {
      return { error: "A valid sessionId is required for session-level attendance.", statusCode: 400 };
    }
    const allSessions = getAllEventSessions(event);
    const matchedSession = allSessions.find((s) => String(s.sessionId) === String(sessionId).trim());
    if (!matchedSession) {
      return { error: "Selected session was not found on this event schedule.", statusCode: 404 };
    }
    const parentDay = days.find((d) => d.dayNumber === matchedSession.dayNumber) || days[0];
    return {
      attendanceType: "session",
      day: parentDay,
      session: matchedSession,
    };
  }

  let resolvedDay = null;
  if (dayNumber !== undefined && dayNumber !== null && dayNumber !== "") {
    const parsedNum = Number(dayNumber);
    if (!Number.isInteger(parsedNum) || parsedNum < 1) {
      return { error: "Invalid event day number specified.", statusCode: 400 };
    }
    resolvedDay = days.find((d) => d.dayNumber === parsedNum);
    if (!resolvedDay) {
      return {
        error: `Day ${parsedNum} does not exist on this ${days.length}-day event.`,
        statusCode: 400,
      };
    }
  } else if (checkInDate) {
    const targetKey = toDateKey(checkInDate);
    resolvedDay = days.find((d) => toDateKey(d.date) === targetKey);
    if (!resolvedDay) {
      return {
        error: `Date ${targetKey || checkInDate} is outside this event's configured dates.`,
        statusCode: 400,
      };
    }
  } else {
    // Infer today's matching day for multi-day check-in; fallback to Day 1 cleanly
    const todayKey = toDateKey(new Date());
    resolvedDay = days.find((d) => toDateKey(d.date) === todayKey) || days[0];
  }

  // Validate target day date stays within configured event start/end bounds
  const startBound = parseUtcDateOnly(event.startDate || event.date);
  const endBound = event.eventDurationType === "multi_day"
    ? parseUtcDateOnly(event.endDate || event.date)
    : startBound;
  const resolvedDayDate = parseUtcDateOnly(resolvedDay.date);
  if (
    startBound &&
    endBound &&
    resolvedDayDate &&
    (resolvedDayDate.getTime() < startBound.getTime() || resolvedDayDate.getTime() > endBound.getTime())
  ) {
    return { error: "Selected attendance date is outside the valid event date range.", statusCode: 400 };
  }

  return {
    attendanceType: "daily",
    day: resolvedDay,
    session: null,
  };
}

/**
 * Normalizes organizer-selected certificate eligibility criteria.
 *
 * @param {Object} rawRule
 * @param {Array<string>|null} [validSessionIds]
 * @returns {{ mode: string, minDays: number, requiredSessionIds: Array<string> }}
 */
export function normalizeCertificateEligibilityRule(rawRule = {}, validSessionIds = null) {
  const input = rawRule && typeof rawRule === "object" ? rawRule : {};
  const mode = CERTIFICATE_ELIGIBILITY_MODES.includes(input.mode) ? input.mode : "any_day";
  const parsedMinDays = Number(input.minDays);
  const minDays = Number.isFinite(parsedMinDays) && parsedMinDays >= 1 ? Math.floor(parsedMinDays) : 1;
  const parsedMinSessions = Number(input.minSessions);
  const minSessions = Number.isFinite(parsedMinSessions) && parsedMinSessions >= 1 ? Math.floor(parsedMinSessions) : 1;

  const validSet = validSessionIds ? new Set(validSessionIds.map(String)) : null;
  const requiredSessionIds = Array.isArray(input.requiredSessionIds)
    ? [...new Set(input.requiredSessionIds.map((id) => String(id || "").trim()).filter(Boolean))]
        .filter((id) => !validSet || validSet.has(id))
    : [];

  return {
    mode,
    minDays,
    minSessions,
    requiredSessionIds,
  };
}

/**
 * Evaluates certificate eligibility for a registration using real Attendance records
 * (with seamless fallback for legacy single-day events that only flagged Registration.checkedIn).
 *
 * @param {Object} event
 * @param {Object} registration
 * @param {Array<Object>} [attendanceRecords]
 * @returns {Object}
 */
export function evaluateRegistrationCertificateEligibility(event, registration, attendanceRecords = []) {
  const days = getEventDaysNormalized(event);
  const totalEventDays = Math.max(1, days.length);
  const allSessions = getAllEventSessions(event);
  const rule = normalizeCertificateEligibilityRule(event?.certificateEligibilityRule);

  const dailyRecords = (attendanceRecords || []).filter((a) => a.attendanceType === "daily");
  const sessionRecords = (attendanceRecords || []).filter((a) => a.attendanceType === "session" && a.sessionId);

  const dayNumberSet = new Set(dailyRecords.map((a) => Number(a.dayNumber)).filter((n) => n >= 1));
  if (dayNumberSet.size === 0 && Array.isArray(registration?.attendedDays) && registration.attendedDays.length > 0) {
    registration.attendedDays.forEach((d) => {
      const num = Number(d);
      if (num >= 1) dayNumberSet.add(num);
    });
  }
  // Single-day / legacy fallback when no Attendance documents exist yet
  if (dayNumberSet.size === 0 && registration?.checkedIn === true) {
    dayNumberSet.add(1);
  }

  const sessionIdSet = new Set(sessionRecords.map((a) => String(a.sessionId)));
  if (sessionIdSet.size === 0 && Array.isArray(registration?.attendedSessions)) {
    registration.attendedSessions.forEach((id) => {
      if (id) sessionIdSet.add(String(id));
    });
  }

  const attendedDayNumbers = [...dayNumberSet].sort((a, b) => a - b);
  const attendedSessionIds = [...sessionIdSet];
  const isConfirmed = registration?.status === "confirmed";
  const userSelectedSessions = Array.isArray(registration?.selectedSessions) ? registration.selectedSessions : [];

  let eligibleByAttendance = false;
  let attendanceReason = "";

  if (!isConfirmed) {
    eligibleByAttendance = false;
    attendanceReason = "Registration is not confirmed.";
  } else if (rule.mode === "all_days") {
    const requiredDayNumbers = days.map((d) => d.dayNumber);
    const missingDays = requiredDayNumbers.filter((dn) => !dayNumberSet.has(dn));
    eligibleByAttendance = missingDays.length === 0;
    if (!eligibleByAttendance) {
      attendanceReason = `Attended ${attendedDayNumbers.length} of ${totalEventDays} required days (Missing Day ${missingDays.join(", ")}).`;
    }
  } else if (rule.mode === "min_days") {
    const threshold = Math.min(totalEventDays, Math.max(1, rule.minDays || 1));
    eligibleByAttendance = attendedDayNumbers.length >= threshold;
    if (!eligibleByAttendance) {
      attendanceReason = `Attended ${attendedDayNumbers.length} of ${threshold} minimum required days.`;
    }
  } else if (rule.mode === "at_least_one_session") {
    if (userSelectedSessions.length > 0) {
      const attendedSelected = userSelectedSessions.filter((sid) => sessionIdSet.has(sid));
      eligibleByAttendance = attendedSelected.length >= 1;
      if (!eligibleByAttendance) {
        attendanceReason = "Must attend at least one of your selected event sessions.";
      }
    } else {
      eligibleByAttendance = attendedSessionIds.length >= 1 || attendedDayNumbers.length >= 1;
      if (!eligibleByAttendance) {
        attendanceReason = "Must attend at least one event session.";
      }
    }
  } else if (rule.mode === "all_selected_sessions") {
    const targetSessionIds = userSelectedSessions.length > 0 ? userSelectedSessions : allSessions.map((s) => s.sessionId);
    if (targetSessionIds.length > 0) {
      const missing = targetSessionIds.filter((sid) => !sessionIdSet.has(sid));
      eligibleByAttendance = missing.length === 0;
      if (!eligibleByAttendance) {
        attendanceReason = `Attended ${targetSessionIds.length - missing.length} of ${targetSessionIds.length} required selected sessions.`;
      }
    } else {
      eligibleByAttendance = attendedSessionIds.length >= 1 || attendedDayNumbers.length >= 1;
      if (!eligibleByAttendance) {
        attendanceReason = "No sessions attended.";
      }
    }
  } else if (rule.mode === "min_sessions") {
    const threshold = Math.max(1, rule.minSessions || 1);
    eligibleByAttendance = attendedSessionIds.length >= threshold;
    if (!eligibleByAttendance) {
      attendanceReason = `Attended ${attendedSessionIds.length} of ${threshold} minimum required sessions.`;
    }
  } else if (rule.mode === "required_sessions") {
    if (rule.requiredSessionIds.length > 0) {
      const missingSessions = rule.requiredSessionIds.filter((sid) => !sessionIdSet.has(sid));
      eligibleByAttendance = missingSessions.length === 0;
      if (!eligibleByAttendance) {
        attendanceReason = `Completed ${rule.requiredSessionIds.length - missingSessions.length} of ${rule.requiredSessionIds.length} required sessions.`;
      }
    } else {
      eligibleByAttendance = attendedSessionIds.length >= 1;
      if (!eligibleByAttendance) {
        attendanceReason = "Must attend at least one event session.";
      }
    }
  } else {
    // "any_day"
    eligibleByAttendance = attendedDayNumbers.length >= 1 || registration?.checkedIn === true;
    if (!eligibleByAttendance) {
      attendanceReason = "Attendance was not recorded for any event day.";
    }
  }

  const feedbackSubmitted = registration?.feedbackSubmitted === true;
  const requireFeedback = event?.requireFeedbackForCertificate === true;

  let eligibilityStatus = (attendedDayNumbers.length > 0 || attendedSessionIds.length > 0)
    ? "ineligible_criteria"
    : "ineligible_absent";
  let reason = attendanceReason;

  if (eligibleByAttendance) {
    if (requireFeedback && !feedbackSubmitted) {
      eligibilityStatus = "feedback_pending";
      reason = "Participant feedback survey must be submitted before certificate access.";
    } else {
      eligibilityStatus = "eligible";
      reason = "";
    }
  }

  return {
    eligibleByAttendance,
    feedbackPending: eligibleByAttendance && requireFeedback && !feedbackSubmitted,
    eligibilityStatus,
    reason,
    attendedDayNumbers,
    totalEventDays,
    attendedSessionIds,
    ruleMode: rule.mode,
  };
}

/**
 * Calculates session-level registration and attendance statistics for organizer reports.
 *
 * @param {Object} event
 * @param {Array<Object>} [registrations]
 * @param {Array<Object>} [attendanceRecords]
 * @returns {{ totalSessions: number, sessions: Array<Object> }}
 */
export function calculateSessionRegistrationAnalytics(event, registrations = [], attendanceRecords = []) {
  const confirmed = (registrations || []).filter((r) => r.status === "confirmed");
  const allSessions = getAllEventSessions(event);

  const sessionAttendanceSet = new Map();
  for (const rec of attendanceRecords || []) {
    if (rec.attendanceType === "session" && rec.sessionId) {
      const key = `${rec.registrationId}_${rec.sessionId}`;
      sessionAttendanceSet.set(key, true);
    }
  }

  const sessionStats = allSessions.map((ses) => {
    const sesId = String(ses.sessionId);
    // Count confirmed participants enrolled in this session
    const enrolled = confirmed.filter((r) => {
      if (Array.isArray(r.selectedSessions) && r.selectedSessions.length > 0) {
        return r.selectedSessions.includes(sesId);
      }
      // If legacy event without session-level registration array, consider all general registrations
      return false;
    });

    const registeredCount = enrolled.length;

    // Count participants who attended this session
    const attended = enrolled.filter((r) => {
      const inAttendedArr = Array.isArray(r.attendedSessions) && r.attendedSessions.includes(sesId);
      const inRecMap = sessionAttendanceSet.has(`${r._id}_${sesId}`);
      return inAttendedArr || inRecMap;
    });

    // Also include any attendee who was marked present even if legacy enrolled
    const totalAttendedSession = confirmed.filter((r) => {
      const inAttendedArr = Array.isArray(r.attendedSessions) && r.attendedSessions.includes(sesId);
      const inRecMap = sessionAttendanceSet.has(`${r._id}_${sesId}`);
      return inAttendedArr || inRecMap;
    }).length;

    const effectiveAttended = Math.max(attended.length, totalAttendedSession);
    const effectiveRegistered = Math.max(registeredCount, effectiveAttended);
    const absentCount = Math.max(0, effectiveRegistered - effectiveAttended);
    const attendancePercentage = effectiveRegistered > 0
      ? Math.round((effectiveAttended / effectiveRegistered) * 1000) / 10
      : 0;

    const capacity = ses.capacity ?? null;
    const remainingCapacity = capacity ? Math.max(0, capacity - effectiveRegistered) : null;
    const isFull = capacity ? effectiveRegistered >= capacity : false;

    return {
      sessionId: sesId,
      dayNumber: ses.dayNumber || 1,
      dayTitle: ses.dayTitle || `Day ${ses.dayNumber || 1}`,
      title: ses.title,
      description: ses.description || "",
      startTime: ses.startTime || "",
      endTime: ses.endTime || "",
      speaker: ses.speaker || "",
      venue: ses.venue || "",
      capacity,
      remainingCapacity,
      isFull,
      registrationAvailable: ses.registrationAvailable !== false,
      status: ses.status || "UPCOMING",
      registeredCount: effectiveRegistered,
      attendedCount: effectiveAttended,
      absentCount,
      attendancePercentage,
    };
  });

  return {
    totalSessions: allSessions.length,
    sessions: sessionStats,
  };
}
