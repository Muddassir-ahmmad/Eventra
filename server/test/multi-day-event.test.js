import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAndNormalizeMultiDaySchedule,
  getEventDaysNormalized,
  getAllEventSessions,
  resolveCheckInTarget,
  normalizeCertificateEligibilityRule,
  evaluateRegistrationCertificateEligibility,
  calculateSessionRegistrationAnalytics,
  formatEventDateRangeLabel,
} from "../src/utils/multiDay.js";
import { calculateReportAnalytics } from "../src/utils/reportAnalytics.js";
import { generateDefaultReportContent } from "../src/utils/defaultReportContent.js";
import { generateReportPdf } from "../src/utils/reportPdf.js";
import { generateTicketPdf } from "../src/services/ticketPdfService.js";
import { getEventEndDateTime, isAttendanceEntryLocked, isEventCompleted } from "../src/utils/eventTiming.js";

// =========================================================================
// UNIT TESTS: MULTI-DAY SCHEDULE, SESSIONS, ELIGIBILITY & REPORTS
// =========================================================================

test("Multi-day schedule normalization creates valid 3-day schedule", () => {
  const input = {
    eventDurationType: "multi_day",
    startDate: "2026-11-20",
    endDate: "2026-11-22",
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    days: [
      {
        dayNumber: 1,
        date: "2026-11-20",
        title: "Day 1: Inception & Keynotes",
        sessions: [
          {
            title: "Opening Keynote",
            startTime: "09:30 AM",
            endTime: "10:30 AM",
            speaker: "Dr. Tech Lead",
            venue: "Auditorium A",
            capacity: 200,
          },
        ],
      },
      {
        dayNumber: 2,
        date: "2026-11-21",
        title: "Day 2: Technical Workshops",
        sessions: [
          {
            title: "Hands-on AI Lab",
            startTime: "10:00 AM",
            endTime: "01:00 PM",
            speaker: "Prof. Engineer",
            venue: "Lab 3",
            capacity: 50,
          },
        ],
      },
      {
        dayNumber: 3,
        date: "2026-11-22",
        title: "Day 3: Project Demos & Closing",
        sessions: [
          {
            title: "Grand Hackathon Finale",
            startTime: "02:00 PM",
            endTime: "04:30 PM",
            speaker: "Panel of Judges",
            venue: "Main Hall",
          },
        ],
      },
    ],
    sessionAttendanceEnabled: true,
  };

  const res = validateAndNormalizeMultiDaySchedule(input);
  assert.ok(!res.error, `Expected no error, got: ${res.error}`);
  assert.equal(res.value.eventDurationType, "multi_day");
  assert.equal(res.value.days.length, 3);
  assert.equal(res.value.days[0].dayNumber, 1);
  assert.equal(res.value.days[1].dayNumber, 2);
  assert.equal(res.value.days[2].dayNumber, 3);
  assert.equal(res.value.days[0].sessions[0].capacity, 200);
  assert.equal(res.value.days[1].sessions[0].capacity, 50);
  assert.ok(res.value.days[0].sessions[0].sessionId, "Expected generated sessionId");
  assert.equal(res.value.sessionAttendanceEnabled, true);

  // Flat agenda projection is derived for backward compatibility
  assert.equal(res.value.agenda.length, 3);
  assert.ok(res.value.agenda[0].time.includes("Day 1"));
});

test("Schedule normalization auto-generates days when only startDate and endDate are provided", () => {
  const res = validateAndNormalizeMultiDaySchedule({
    eventDurationType: "multi_day",
    startDate: "2026-12-01",
    endDate: "2026-12-03",
    startTime: "10:00 AM",
    endTime: "04:00 PM",
  });
  assert.ok(!res.error);
  assert.equal(res.value.days.length, 3);
  assert.equal(res.value.days[0].title, "Day 1");
  assert.equal(res.value.days[1].title, "Day 2");
  assert.equal(res.value.days[2].title, "Day 3");
});

test("Schedule validation rejects invalid date ranges and session times", () => {
  const inverted = validateAndNormalizeMultiDaySchedule({
    eventDurationType: "multi_day",
    startDate: "2026-11-25",
    endDate: "2026-11-20",
  });
  assert.ok(inverted.error, "Should reject endDate before startDate");

  const outOfRangeDay = validateAndNormalizeMultiDaySchedule({
    eventDurationType: "multi_day",
    startDate: "2026-11-20",
    endDate: "2026-11-22",
    days: [
      { date: "2026-11-20", title: "Day 1" },
      { date: "2026-11-30", title: "Day 2" }, // Out of range!
    ],
  });
  assert.ok(outOfRangeDay.error, "Should reject day date outside event duration");

  const badSessionTime = validateAndNormalizeMultiDaySchedule({
    eventDurationType: "multi_day",
    startDate: "2026-11-20",
    endDate: "2026-11-20",
    days: [
      {
        date: "2026-11-20",
        title: "Day 1",
        sessions: [
          {
            title: "Intro",
            startTime: "05:00 PM",
            endTime: "02:00 PM", // End before start!
          },
        ],
      },
    ],
  });
  assert.ok(badSessionTime.error, "Should reject session where end time is before start time");
});

test("Single-day events normalize cleanly without multi-day requirements", () => {
  const single = validateAndNormalizeMultiDaySchedule({
    eventDurationType: "single_day",
    date: "2026-11-15",
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    agenda: [
      { time: "09:30 AM", title: "Keynote", speaker: "Dr. A" },
    ],
  });
  assert.ok(!single.error);
  assert.equal(single.value.eventDurationType, "single_day");
  const normalizedDays = getEventDaysNormalized(single.value);
  assert.equal(normalizedDays.length, 1);
  assert.equal(normalizedDays[0].dayNumber, 1);
  assert.equal(normalizedDays[0].sessions.length, 1);
});

test("resolveCheckInTarget correctly resolves daily and session check-in targets", () => {
  const event = {
    _id: "67323b7e7c81d8031e6e0001",
    status: "published",
    eventDurationType: "multi_day",
    startDate: new Date("2026-11-20T00:00:00Z"),
    endDate: new Date("2026-11-22T00:00:00Z"),
    sessionAttendanceEnabled: true,
    days: [
      {
        dayNumber: 1,
        date: new Date("2026-11-20T00:00:00Z"),
        title: "Day 1",
        sessions: [{ sessionId: "ses_001", title: "Keynote", capacity: 100 }],
      },
      {
        dayNumber: 2,
        date: new Date("2026-11-21T00:00:00Z"),
        title: "Day 2",
        sessions: [{ sessionId: "ses_002", title: "Deep Dive Workshop", capacity: 30 }],
      },
      {
        dayNumber: 3,
        date: new Date("2026-11-22T00:00:00Z"),
        title: "Day 3",
        sessions: [],
      },
    ],
  };

  // Day 2 Daily check-in
  const dailyTarget = resolveCheckInTarget(event, { attendanceType: "daily", dayNumber: 2 });
  assert.ok(!dailyTarget.error);
  assert.equal(dailyTarget.attendanceType, "daily");
  assert.equal(dailyTarget.day.dayNumber, 2);

  // Session check-in for Workshop on Day 2
  const sessionTarget = resolveCheckInTarget(event, { attendanceType: "session", sessionId: "ses_002" });
  assert.ok(!sessionTarget.error);
  assert.equal(sessionTarget.attendanceType, "session");
  assert.equal(sessionTarget.session.sessionId, "ses_002");
  assert.equal(sessionTarget.day.dayNumber, 2);

  // Reject non-existent day
  const badDay = resolveCheckInTarget(event, { attendanceType: "daily", dayNumber: 99 });
  assert.ok(badDay.error);
  assert.equal(badDay.statusCode, 400);

  // Reject session check-in if session attendance is disabled
  const disabledEvent = { ...event, sessionAttendanceEnabled: false };
  const allSessions = getAllEventSessions(disabledEvent);
  assert.equal(allSessions.length, 2);
});

test("Certificate eligibility rules accurately evaluate actual attendance", () => {
  const event = {
    _id: "67323b7e7c81d8031e6e0002",
    eventDurationType: "multi_day",
    startDate: new Date("2026-11-20T00:00:00Z"),
    endDate: new Date("2026-11-22T00:00:00Z"),
    days: [
      { dayNumber: 1, date: new Date("2026-11-20T00:00:00Z"), title: "Day 1", sessions: [{ sessionId: "s1" }] },
      { dayNumber: 2, date: new Date("2026-11-21T00:00:00Z"), title: "Day 2", sessions: [{ sessionId: "s2" }] },
      { dayNumber: 3, date: new Date("2026-11-22T00:00:00Z"), title: "Day 3", sessions: [{ sessionId: "s3" }] },
    ],
    requireFeedbackForCertificate: true,
  };

  const reg = {
    _id: "67323b7e7c81d8031e6e0099",
    name: "rahul sharma",
    status: "confirmed",
    feedbackSubmitted: true,
  };

  // 1. Rule: any_day (Attended Day 1 only)
  const ruleAnyDay = { ...event, certificateEligibilityRule: { mode: "any_day" } };
  const attDay1Only = [
    { attendanceType: "daily", dayNumber: 1 },
  ];
  const eval1 = evaluateRegistrationCertificateEligibility(ruleAnyDay, reg, attDay1Only);
  assert.equal(eval1.eligibilityStatus, "eligible");
  assert.equal(eval1.attendedDayNumbers.length, 1);

  // 2. Rule: all_days (Attended Day 1 & 2 only -> Ineligible)
  const ruleAllDays = { ...event, certificateEligibilityRule: { mode: "all_days" } };
  const attDays1And2 = [
    { attendanceType: "daily", dayNumber: 1 },
    { attendanceType: "daily", dayNumber: 2 },
  ];
  const eval2 = evaluateRegistrationCertificateEligibility(ruleAllDays, reg, attDays1And2);
  assert.equal(eval2.eligibilityStatus, "ineligible_criteria");
  assert.ok(eval2.reason.includes("Attended 2 of 3 required days"), `Got reason: ${eval2.reason}`);

  // 3. Rule: all_days (Attended Days 1, 2, and 3 -> Eligible)
  const attAllThree = [
    { attendanceType: "daily", dayNumber: 1 },
    { attendanceType: "daily", dayNumber: 2 },
    { attendanceType: "daily", dayNumber: 3 },
  ];
  const eval3 = evaluateRegistrationCertificateEligibility(ruleAllDays, reg, attAllThree);
  assert.equal(eval3.eligibilityStatus, "eligible");

  // 4. Rule: min_days (Requires 2 days -> 2 days attended is eligible)
  const ruleMinDays = { ...event, certificateEligibilityRule: { mode: "min_days", minDays: 2 } };
  const eval4 = evaluateRegistrationCertificateEligibility(ruleMinDays, reg, attDays1And2);
  assert.equal(eval4.eligibilityStatus, "eligible");

  // 5. Rule: required_sessions (Requires s1 & s2)
  const ruleReqSessions = {
    ...event,
    certificateEligibilityRule: { mode: "required_sessions", requiredSessionIds: ["s1", "s2"] },
  };
  const attSession1Only = [{ attendanceType: "session", sessionId: "s1" }];
  const eval5 = evaluateRegistrationCertificateEligibility(ruleReqSessions, reg, attSession1Only);
  assert.equal(eval5.eligibilityStatus, "ineligible_criteria");

  const attSessionBoth = [
    { attendanceType: "session", sessionId: "s1" },
    { attendanceType: "session", sessionId: "s2" },
  ];
  const eval6 = evaluateRegistrationCertificateEligibility(ruleReqSessions, reg, attSessionBoth);
  assert.equal(eval6.eligibilityStatus, "eligible");

  // 6. Feedback pending gating
  const regNoFeedback = { ...reg, feedbackSubmitted: false };
  const evalFeedback = evaluateRegistrationCertificateEligibility(ruleAnyDay, regNoFeedback, attDay1Only);
  assert.equal(evalFeedback.eligibilityStatus, "feedback_pending");
});

test("calculateReportAnalytics computes exact multi-day and session statistics from real records", () => {
  const event = {
    _id: "67323b7e7c81d8031e6e0003",
    eventDurationType: "multi_day",
    startDate: new Date("2026-11-20T00:00:00Z"),
    endDate: new Date("2026-11-22T00:00:00Z"),
    days: [
      { dayNumber: 1, date: new Date("2026-11-20T00:00:00Z"), title: "Day 1", sessions: [{ sessionId: "ses_a", title: "Track A" }] },
      { dayNumber: 2, date: new Date("2026-11-21T00:00:00Z"), title: "Day 2", sessions: [{ sessionId: "ses_b", title: "Track B" }] },
      { dayNumber: 3, date: new Date("2026-11-22T00:00:00Z"), title: "Day 3", sessions: [] },
    ],
    certificateEnabled: true,
    certificateEligibilityRule: { mode: "all_days" },
  };

  const reg1 = { _id: "reg_1", name: "Alice", status: "confirmed", department: "CS", feedbackSubmitted: true };
  const reg2 = { _id: "reg_2", name: "Bob", status: "confirmed", department: "CS", feedbackSubmitted: false };
  const reg3 = { _id: "reg_3", name: "Charlie", status: "confirmed", department: "EC", feedbackSubmitted: true };
  const reg4 = { _id: "reg_4", name: "David", status: "confirmed", department: "ME", feedbackSubmitted: false };
  const registrations = [reg1, reg2, reg3, reg4];

  // Reg1 attended all 3 days and Track A
  // Reg2 attended Day 1 only
  // Reg3 attended Day 1 and Day 2 and Track B
  // Reg4 attended zero days
  const attendanceRecords = [
    { registrationId: "reg_1", attendanceType: "daily", dayNumber: 1 },
    { registrationId: "reg_1", attendanceType: "daily", dayNumber: 2 },
    { registrationId: "reg_1", attendanceType: "daily", dayNumber: 3 },
    { registrationId: "reg_1", attendanceType: "session", sessionId: "ses_a" },

    { registrationId: "reg_2", attendanceType: "daily", dayNumber: 1 },

    { registrationId: "reg_3", attendanceType: "daily", dayNumber: 1 },
    { registrationId: "reg_3", attendanceType: "daily", dayNumber: 2 },
    { registrationId: "reg_3", attendanceType: "session", sessionId: "ses_b" },
  ];

  const feedbacks = [
    { ratingOverall: 5, ratingOrganization: 5, ratingSpeakers: 4, ratingVenue: 5, liked: "Sessions" },
  ];

  const analytics = calculateReportAnalytics(registrations, feedbacks, attendanceRecords, event, []);

  assert.equal(analytics.confirmedCount, 4);
  assert.equal(analytics.attendedCount, 3); // reg1, reg2, reg3 attended at least once
  assert.equal(analytics.absentCount, 1);   // reg4
  assert.equal(analytics.attendanceRate, 75);

  // Multi-day breakdown
  assert.equal(analytics.multiDay.isMultiDay, true);
  assert.equal(analytics.multiDay.totalDays, 3);
  assert.equal(analytics.multiDay.participantsAttendingAllDays, 1); // reg1 only
  assert.equal(analytics.multiDay.participantsAttendingAllDaysRate, 25);
  assert.equal(analytics.multiDay.participantsMissingSomeDays, 3);

  // Day 1: reg1, reg2, reg3 = 3 attendees (75%)
  assert.equal(analytics.multiDay.dailyBreakdown[0].uniqueAttendees, 3);
  assert.equal(analytics.multiDay.dailyBreakdown[0].attendanceRate, 75);

  // Day 2: reg1, reg3 = 2 attendees (50%)
  assert.equal(analytics.multiDay.dailyBreakdown[1].uniqueAttendees, 2);
  assert.equal(analytics.multiDay.dailyBreakdown[1].attendanceRate, 50);

  // Day 3: reg1 = 1 attendee (25%)
  assert.equal(analytics.multiDay.dailyBreakdown[2].uniqueAttendees, 1);
  assert.equal(analytics.multiDay.dailyBreakdown[2].attendanceRate, 25);

  // Session stats
  const sesA = analytics.multiDay.sessionParticipation.find((s) => s.sessionId === "ses_a");
  assert.equal(sesA.attendedCount, 1);
  const sesB = analytics.multiDay.sessionParticipation.find((s) => s.sessionId === "ses_b");
  assert.equal(sesB.attendedCount, 1);

  // Certificate eligibility with "all_days" rule
  // Reg1 attended all days + feedback submitted = Eligible (1)
  // Others did not attend all days = Ineligible (3)
  assert.equal(analytics.certificateStats.eligibleCount, 1);
  assert.equal(analytics.certificateStats.ineligibleCount, 3);
});

test("formatEventDateRangeLabel outputs clear single-day and multi-day formatted text", () => {
  const single = {
    eventDurationType: "single_day",
    date: new Date("2026-11-15T00:00:00Z"),
  };
  const singleLabel = formatEventDateRangeLabel(single);
  assert.ok(singleLabel.includes("15, 2026") || singleLabel.includes("Nov"), `Got: ${singleLabel}`);

  const multi = {
    eventDurationType: "multi_day",
    startDate: new Date("2026-11-20T00:00:00Z"),
    endDate: new Date("2026-11-22T00:00:00Z"),
  };
  const label = formatEventDateRangeLabel(multi);
  assert.ok(label.includes("Nov 20"), `Expected start in label, got: ${label}`);
  assert.ok(label.includes("Nov 22"), `Expected end in label, got: ${label}`);
});

test("getEventEndDateTime evaluates multi-day end date and last day end time", () => {
  const multi = {
    eventDurationType: "multi_day",
    startDate: new Date("2026-11-20T00:00:00Z"),
    endDate: new Date("2026-11-22T00:00:00Z"),
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    days: [
      { dayNumber: 1, date: new Date("2026-11-20T00:00:00Z"), endTime: "04:00 PM" },
      { dayNumber: 2, date: new Date("2026-11-21T00:00:00Z"), endTime: "04:00 PM" },
      { dayNumber: 3, date: new Date("2026-11-22T00:00:00Z"), endTime: "06:30 PM" },
    ],
  };

  const endDt = getEventEndDateTime(multi);
  assert.ok(endDt instanceof Date);
  assert.equal(endDt.getUTCDate(), 22);
  assert.equal(endDt.getUTCHours(), 18);
  assert.equal(endDt.getUTCMinutes(), 30);
});

test("Multi-day digital ticket PDF and post-event report PDF generate successfully without blank pages", async () => {
  const multiEvent = {
    _id: "67323b7e7c81d8031e6e0004",
    title: "AI & Autonomous Systems Summit",
    eventDurationType: "multi_day",
    startDate: new Date("2026-11-20T00:00:00Z"),
    endDate: new Date("2026-11-22T00:00:00Z"),
    date: new Date("2026-11-20T00:00:00Z"),
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    venue: "Sahyadri Campus",
    location: "Mangaluru, Karnataka",
    mode: "offline",
    days: [
      { dayNumber: 1, date: new Date("2026-11-20T00:00:00Z"), title: "Day 1", sessions: [] },
      { dayNumber: 2, date: new Date("2026-11-21T00:00:00Z"), title: "Day 2", sessions: [] },
      { dayNumber: 3, date: new Date("2026-11-22T00:00:00Z"), title: "Day 3", sessions: [] },
    ],
  };

  const reg = {
    _id: "67323b7e7c81d8031e6e0005",
    registrationId: "EVT-2026-TEST",
    name: "arun kumar",
    email: "arun@example.com",
    college: "Sahyadri College",
    ticketType: "All-Days Pass",
  };

  const ticketPdf = await generateTicketPdf(multiEvent, reg);
  assert.ok(ticketPdf instanceof Buffer);
  assert.ok(ticketPdf.length > 1000);

  const organizer = { name: "Organizer Lead", organization: "Tech Forum" };
  const analytics = calculateReportAnalytics([reg], [], [], multiEvent, []);
  const reportData = generateDefaultReportContent(multiEvent, organizer, analytics);
  const reportPdf = await generateReportPdf(multiEvent, organizer, reportData, analytics);
  assert.ok(reportPdf instanceof Buffer);
  assert.ok(reportPdf.length > 5000);
});

// =========================================================================
// UNIT TESTS: SESSION-BASED REGISTRATION, ATTENDANCE & CERTIFICATES
// =========================================================================

test("Session normalization validates status, availability, and venue collision", () => {
  const overlappingInput = {
    eventDurationType: "multi_day",
    startDate: "2026-11-20",
    endDate: "2026-11-21",
    days: [
      {
        dayNumber: 1,
        date: "2026-11-20",
        title: "Day 1",
        sessions: [
          {
            title: "Session A",
            startTime: "10:00 AM",
            endTime: "11:30 AM",
            venue: "Seminar Hall 1",
            status: "UPCOMING",
            registrationAvailable: true,
          },
          {
            title: "Session B (Collision)",
            startTime: "11:00 AM",
            endTime: "12:00 PM",
            venue: "Seminar Hall 1", // Same venue, overlapping time
          },
        ],
      },
    ],
  };

  const collisionRes = validateAndNormalizeMultiDaySchedule(overlappingInput);
  assert.ok(collisionRes.error, "Expected venue collision error");
  assert.ok(collisionRes.error.includes("overlapping time slots"));

  const validSessions = {
    ...overlappingInput,
    days: [
      {
        ...overlappingInput.days[0],
        sessions: [
          overlappingInput.days[0].sessions[0],
          {
            ...overlappingInput.days[0].sessions[1],
            venue: "Seminar Hall 2", // Different venue
            status: "CANCELLED",
            registrationAvailable: false,
          },
        ],
      },
    ],
  };

  const validRes = validateAndNormalizeMultiDaySchedule(validSessions);
  assert.ok(!validRes.error);
  assert.equal(validRes.value.days[0].sessions[1].status, "CANCELLED");
  assert.equal(validRes.value.days[0].sessions[1].registrationAvailable, false);
});

test("Session-based certificate eligibility rules evaluate actual attendance correctly", () => {
  const event = {
    _id: "67323b7e7c81d8031e6e0010",
    requireFeedbackForCertificate: false,
    certificateEligibilityRule: {
      mode: "at_least_one_session",
    },
  };

  // 1. at_least_one_session
  const regNoAtt = { _id: "reg1", status: "confirmed", selectedSessions: ["s1", "s2"], attendedSessions: [] };
  const eval1 = evaluateRegistrationCertificateEligibility(event, regNoAtt, []);
  assert.equal(eval1.eligibleByAttendance, false);

  const regAttOne = { _id: "reg2", status: "confirmed", selectedSessions: ["s1", "s2"], attendedSessions: ["s1"] };
  const eval2 = evaluateRegistrationCertificateEligibility(event, regAttOne, []);
  assert.equal(eval2.eligibleByAttendance, true);

  // 2. all_selected_sessions
  event.certificateEligibilityRule = { mode: "all_selected_sessions" };
  const eval3 = evaluateRegistrationCertificateEligibility(event, regAttOne, []);
  assert.equal(eval3.eligibleByAttendance, false); // attended only 1 of 2

  const regAttAll = { _id: "reg3", status: "confirmed", selectedSessions: ["s1", "s2"], attendedSessions: ["s1", "s2"] };
  const eval4 = evaluateRegistrationCertificateEligibility(event, regAttAll, []);
  assert.equal(eval4.eligibleByAttendance, true); // attended both

  // 3. min_sessions
  event.certificateEligibilityRule = { mode: "min_sessions", minSessions: 2 };
  const eval5 = evaluateRegistrationCertificateEligibility(event, regAttOne, []);
  assert.equal(eval5.eligibleByAttendance, false); // attended 1, minimum required is 2

  const eval6 = evaluateRegistrationCertificateEligibility(event, regAttAll, []);
  assert.equal(eval6.eligibleByAttendance, true); // attended 2 >= 2
});

test("calculateReportAnalytics computes session-level attendance analytics and limits", async () => {
  const event = {
    _id: "67323b7e7c81d8031e6e0020",
    eventDurationType: "multi_day",
    startDate: new Date("2026-11-20T00:00:00Z"),
    endDate: new Date("2026-11-21T00:00:00Z"),
    days: [
      {
        dayNumber: 1,
        date: new Date("2026-11-20T00:00:00Z"),
        sessions: [
          { sessionId: "ses_workshop", title: "AI Workshop", capacity: 10, status: "UPCOMING" },
          { sessionId: "ses_demo", title: "Project Demo", capacity: 50, status: "UPCOMING" },
        ],
      },
    ],
  };

  const registrations = [
    {
      _id: "reg101",
      registrationId: "EVT-REG-101",
      name: "Alice",
      status: "confirmed",
      selectedSessions: ["ses_workshop", "ses_demo"],
      attendedSessions: ["ses_workshop"],
      checkedIn: true,
    },
    {
      _id: "reg102",
      registrationId: "EVT-REG-102",
      name: "Bob",
      status: "confirmed",
      selectedSessions: ["ses_workshop"],
      attendedSessions: [],
      checkedIn: false,
    },
  ];

  const attendanceRecords = [
    { registrationId: "reg101", attendanceType: "session", sessionId: "ses_workshop" },
  ];

  const sessionAnalytics = calculateSessionRegistrationAnalytics(event, registrations, attendanceRecords);
  assert.equal(sessionAnalytics.totalSessions, 2);

  const workshopStat = sessionAnalytics.sessions.find((s) => s.sessionId === "ses_workshop");
  assert.ok(workshopStat);
  assert.equal(workshopStat.registeredCount, 2);
  assert.equal(workshopStat.attendedCount, 1);
  assert.equal(workshopStat.absentCount, 1);
  assert.equal(workshopStat.attendancePercentage, 50);
  assert.equal(workshopStat.remainingCapacity, 8); // 10 - 2

  const demoStat = sessionAnalytics.sessions.find((s) => s.sessionId === "ses_demo");
  assert.ok(demoStat);
  assert.equal(demoStat.registeredCount, 1);
  assert.equal(demoStat.attendedCount, 0);
  assert.equal(demoStat.attendancePercentage, 0);

  const analytics = calculateReportAnalytics(registrations, [], attendanceRecords, event, []);
  assert.ok(analytics.multiDay?.sessionParticipation);
  assert.equal(analytics.multiDay.sessionParticipation.length, 2);
});
