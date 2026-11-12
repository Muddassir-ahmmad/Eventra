import {
  evaluateRegistrationCertificateEligibility,
  getAllEventSessions,
  getEventDaysNormalized,
  normalizeCertificateEligibilityRule,
} from "./multiDay.js";

/**
 * Computes all registration, attendance, department-wise, college-wise, multi-day,
 * session, feedback, and certificate eligibility analytics from real MongoDB records.
 *
 * @param {Array<Object>} registrations Array of registration documents
 * @param {Array<Object>} feedbacks Array of feedback documents
 * @param {Array<Object>} [attendanceRecords] Array of Attendance documents
 * @param {Object|null} [event] Event document
 * @param {Array<Object>} [certificates] Array of Certificate documents
 * @returns {Object}
 */
export function calculateReportAnalytics(
  registrations = [],
  feedbacks = [],
  attendanceRecords = [],
  event = null,
  certificates = []
) {
  const totalRegistrations = registrations.length;
  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const cancelled = registrations.filter((r) => r.status === "cancelled");
  const confirmedIds = new Set(confirmed.map((r) => String(r._id)));

  // Group real Attendance records by registrationId for confirmed attendees
  const attendanceByReg = new Map();
  for (const record of attendanceRecords) {
    const regId = String(record.registrationId);
    if (!attendanceByReg.has(regId)) attendanceByReg.set(regId, []);
    attendanceByReg.get(regId).push(record);
  }

  const isRegAttended = (r) => {
    const recs = attendanceByReg.get(String(r._id)) || [];
    return r.checkedIn === true || recs.length > 0;
  };

  const attended = confirmed.filter(isRegAttended);
  const absent = confirmed.filter((r) => !isRegAttended(r));

  const confirmedCount = confirmed.length;
  const cancelledCount = cancelled.length;
  const attendedCount = attended.length;
  const absentCount = absent.length;

  // Attendance rate: (Checked-in participants / Confirmed registrations) * 100
  const attendanceRate = confirmedCount > 0
    ? Math.round((attendedCount / confirmedCount) * 1000) / 10
    : 0;

  // Registration-to-attendance rate
  const registrationToAttendanceRate = totalRegistrations > 0
    ? Math.round((attendedCount / totalRegistrations) * 1000) / 10
    : 0;

  // Department-wise breakdown (confirmed only)
  const departmentCounts = {};
  for (const r of confirmed) {
    const rawDept = (r.department || "General / Unspecified").trim();
    const dept = rawDept || "General / Unspecified";
    if (!departmentCounts[dept]) {
      departmentCounts[dept] = { registered: 0, attended: 0, absent: 0 };
    }
    departmentCounts[dept].registered += 1;
    if (r.checkedIn) {
      departmentCounts[dept].attended += 1;
    } else {
      departmentCounts[dept].absent += 1;
    }
  }

  // College-wise breakdown (confirmed only)
  const collegeCounts = {};
  for (const r of confirmed) {
    const rawCol = (r.college || "General / Unspecified").trim();
    const col = rawCol || "General / Unspecified";
    if (!collegeCounts[col]) {
      collegeCounts[col] = { registered: 0, attended: 0, absent: 0 };
    }
    collegeCounts[col].registered += 1;
    if (r.checkedIn) {
      collegeCounts[col].attended += 1;
    } else {
      collegeCounts[col].absent += 1;
    }
  }

  // Feedback Metrics
  const feedbackSubmissions = feedbacks.length;
  const feedbackResponseRate = confirmedCount > 0
    ? Math.round((feedbackSubmissions / confirmedCount) * 1000) / 10
    : 0;

  let avgRatingOverall = 0;
  let avgRatingOrg = 0;
  let avgRatingSpeakers = 0;
  let avgRatingVenue = 0;
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (feedbackSubmissions > 0) {
    let sumOverall = 0;
    let sumOrg = 0;
    let sumSpeakers = 0;
    let sumVenue = 0;

    for (const f of feedbacks) {
      sumOverall += (f.ratingOverall || 0);
      sumOrg += (f.ratingOrganization || 0);
      sumSpeakers += (f.ratingSpeakers || 0);
      sumVenue += (f.ratingVenue || 0);

      const r = f.ratingOverall;
      if (ratingDistribution[r] !== undefined) {
        ratingDistribution[r]++;
      }
    }

    avgRatingOverall = Math.round((sumOverall / feedbackSubmissions) * 10) / 10;
    avgRatingOrg = Math.round((sumOrg / feedbackSubmissions) * 10) / 10;
    avgRatingSpeakers = Math.round((sumSpeakers / feedbackSubmissions) * 10) / 10;
    avgRatingVenue = Math.round((sumVenue / feedbackSubmissions) * 10) / 10;
  }

  const feedbackLiked = feedbacks.map((f) => f.liked).filter(Boolean).slice(0, 5);
  const feedbackImprovements = feedbacks.map((f) => f.improvements).filter(Boolean).slice(0, 5);
  const feedbackSuggestions = feedbacks.map((f) => f.suggestions).filter(Boolean).slice(0, 5);

  // Multi-day, daily, session & certificate eligibility metrics from real records
  const days = event ? getEventDaysNormalized(event) : [];
  const totalDays = days.length > 0 ? days.length : 1;
  const isMultiDay = Boolean(event?.eventDurationType === "multi_day" && totalDays > 1);

  const dailyBreakdown = days.map((day) => {
    const daySet = new Set();
    for (const r of confirmed) {
      const regId = String(r._id);
      const recs = attendanceByReg.get(regId) || [];
      const hasDailyRec = recs.some(
        (rec) => rec.attendanceType === "daily" && Number(rec.dayNumber) === Number(day.dayNumber)
      );
      const hasLegacySingleDay =
        recs.length === 0 && r.checkedIn === true && Number(day.dayNumber) === 1;
      if (hasDailyRec || hasLegacySingleDay) {
        daySet.add(regId);
      }
    }
    const uniqueAttendees = daySet.size;
    const dayAbsentCount = Math.max(0, confirmedCount - uniqueAttendees);
    const dayRate = confirmedCount > 0 ? Math.round((uniqueAttendees / confirmedCount) * 1000) / 10 : 0;
    return {
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title || `Day ${day.dayNumber}`,
      uniqueAttendees,
      absentCount: dayAbsentCount,
      attendanceRate: dayRate,
    };
  });

  let participantsAttendingAllDays = 0;
  let participantsMissingSomeDays = 0;
  for (const r of confirmed) {
    const regId = String(r._id);
    const recs = attendanceByReg.get(regId) || [];
    const dailyNumbers = new Set(
      recs.filter((rec) => rec.attendanceType === "daily").map((rec) => Number(rec.dayNumber))
    );
    if (dailyNumbers.size === 0 && r.checkedIn === true) {
      dailyNumbers.add(1);
    }
    if (days.length > 0 && days.every((d) => dailyNumbers.has(Number(d.dayNumber)))) {
      participantsAttendingAllDays += 1;
    } else {
      participantsMissingSomeDays += 1;
    }
  }
  const participantsAttendingAllDaysRate = confirmedCount > 0
    ? Math.round((participantsAttendingAllDays / confirmedCount) * 1000) / 10
    : 0;

  const allSessions = event ? getAllEventSessions(event) : [];
  const sessionParticipation = allSessions.map((ses) => {
    const attendeeIds = new Set();
    for (const record of attendanceRecords) {
      if (
        record.attendanceType === "session" &&
        String(record.sessionId) === String(ses.sessionId) &&
        confirmedIds.has(String(record.registrationId))
      ) {
        attendeeIds.add(String(record.registrationId));
      }
    }
    const count = attendeeIds.size;
    return {
      dayNumber: ses.dayNumber,
      dayTitle: ses.dayTitle,
      sessionId: ses.sessionId,
      title: ses.title,
      startTime: ses.startTime,
      endTime: ses.endTime,
      speaker: ses.speaker,
      venue: ses.venue,
      capacity: ses.capacity ?? null,
      attendedCount: count,
      attendanceRate: confirmedCount > 0 ? Math.round((count / confirmedCount) * 1000) / 10 : 0,
    };
  });

  let certEligibleCount = 0;
  let certFeedbackPendingCount = 0;
  let certIneligibleCount = 0;
  if (event) {
    for (const r of confirmed) {
      const evalRes = evaluateRegistrationCertificateEligibility(
        event,
        r,
        attendanceByReg.get(String(r._id)) || []
      );
      if (evalRes.eligibilityStatus === "eligible") certEligibleCount += 1;
      else if (evalRes.eligibilityStatus === "feedback_pending") certFeedbackPendingCount += 1;
      else certIneligibleCount += 1;
    }
  } else {
    certEligibleCount = attendedCount;
    certIneligibleCount = absentCount;
  }

  const normalizedRule = normalizeCertificateEligibilityRule(
    event?.certificateEligibilityRule,
    allSessions.map((s) => s.sessionId)
  );

  return {
    totalRegistrations,
    confirmedCount,
    cancelledCount,
    attendedCount,
    absentCount,
    attendanceRate,
    registrationToAttendanceRate,
    departmentCounts,
    collegeCounts,
    feedbackSubmissions,
    feedbackResponseRate,
    avgRatingOverall,
    avgRatingOrg,
    avgRatingSpeakers,
    avgRatingVenue,
    ratingDistribution,
    feedbackLiked,
    feedbackImprovements,
    feedbackSuggestions,
    multiDay: {
      isMultiDay,
      totalDays,
      participantsAttendingAllDays,
      participantsAttendingAllDaysRate,
      participantsMissingSomeDays,
      dailyBreakdown,
      sessionParticipation,
    },
    certificateStats: {
      enabled: Boolean(event?.certificateEnabled),
      ruleMode: normalizedRule.mode,
      minDays: normalizedRule.minDays,
      requiredSessionsCount: normalizedRule.requiredSessionIds.length,
      eligibleCount: certEligibleCount,
      feedbackPendingCount: certFeedbackPendingCount,
      ineligibleCount: certIneligibleCount,
      issuedCount: Array.isArray(certificates) ? certificates.length : 0,
    },
  };
}
