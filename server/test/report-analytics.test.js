import assert from "node:assert/strict";
import test from "node:test";
import { getEventEndDateTime, isEventCompleted } from "../src/utils/eventTiming.js";
import { calculateReportAnalytics } from "../src/utils/reportAnalytics.js";
import { generateDefaultReportContent } from "../src/utils/defaultReportContent.js";

test("event completion logic checks date, endTime, and status", () => {
  const futureDate = new Date(Date.now() + 86400000 * 5); // 5 days in future
  const pastDate = new Date(Date.now() - 86400000 * 2); // 2 days in past

  const futureEvent = {
    date: futureDate.toISOString(),
    endTime: "18:00",
    status: "published",
  };

  const pastEvent = {
    date: pastDate.toISOString(),
    endTime: "18:00",
    status: "published",
  };

  const closedFutureEvent = {
    date: futureDate.toISOString(),
    endTime: "18:00",
    status: "closed",
  };

  assert.equal(isEventCompleted(futureEvent), false);
  assert.equal(isEventCompleted(pastEvent), true);
  assert.equal(isEventCompleted(closedFutureEvent), true);

  const endDateTime = getEventEndDateTime(pastEvent);
  assert.ok(endDateTime instanceof Date);
  assert.equal(endDateTime.getUTCHours(), 18);
  assert.equal(endDateTime.getUTCMinutes(), 0);
});

test("report analytics accurately calculates real registration and attendance metrics", () => {
  const registrations = [
    { name: "Alice", status: "confirmed", checkedIn: true, department: "Computer Science", college: "Apex Institute" },
    { name: "Bob", status: "confirmed", checkedIn: true, department: "Computer Science", college: "Apex Institute" },
    { name: "Charlie", status: "confirmed", checkedIn: false, department: "Electronics", college: "Metro University" },
    { name: "Dave", status: "confirmed", checkedIn: false, department: "Computer Science", college: "Apex Institute" },
    { name: "Eve", status: "cancelled", checkedIn: true, department: "Civil", college: "Apex Institute" },
  ];

  const analytics = calculateReportAnalytics(registrations);

  assert.equal(analytics.totalRegistrations, 5);
  assert.equal(analytics.confirmedCount, 4);
  assert.equal(analytics.cancelledCount, 1);
  assert.equal(analytics.attendedCount, 2);
  assert.equal(analytics.absentCount, 2);
  // (2 attended / 4 confirmed) * 100 = 50.0%
  assert.equal(analytics.attendanceRate, 50.0);
  // (2 attended / 5 total) * 100 = 40.0%
  assert.equal(analytics.registrationToAttendanceRate, 40.0);

  // Department counts
  assert.equal(analytics.departmentCounts["Computer Science"].registered, 3);
  assert.equal(analytics.departmentCounts["Computer Science"].attended, 2);
  assert.equal(analytics.departmentCounts["Electronics"].registered, 1);
  assert.equal(analytics.departmentCounts["Electronics"].attended, 0);

  // College counts
  assert.equal(analytics.collegeCounts["Apex Institute"].registered, 3);
  assert.equal(analytics.collegeCounts["Apex Institute"].attended, 2);
  assert.equal(analytics.collegeCounts["Metro University"].registered, 1);
  assert.equal(analytics.collegeCounts["Metro University"].attended, 0);
});

test("report analytics handles zero registrations safely without NaN or errors", () => {
  const analytics = calculateReportAnalytics([]);

  assert.equal(analytics.totalRegistrations, 0);
  assert.equal(analytics.confirmedCount, 0);
  assert.equal(analytics.cancelledCount, 0);
  assert.equal(analytics.attendedCount, 0);
  assert.equal(analytics.absentCount, 0);
  assert.equal(analytics.attendanceRate, 0);
  assert.equal(analytics.registrationToAttendanceRate, 0);
  assert.deepEqual(analytics.departmentCounts, {});
  assert.deepEqual(analytics.collegeCounts, {});
});

test("default report content generates all 12 sections using actual event info", () => {
  const event = {
    title: "AI & Cloud Architecture Summit",
    date: new Date("2026-10-15T10:00:00.000Z"),
    startTime: "09:30 AM",
    endTime: "04:30 PM",
    venue: "Innovation Auditorium",
    capacity: 250,
    eventType: "Technical Conference",
    description: "An intensive summit on scalable cloud infrastructures and agentic workflows.",
    speakers: [
      { name: "Dr. Evelyn Reed", designation: "Distinguished Engineer", organization: "CloudScale", role: "Keynote" },
    ],
    volunteerRoles: [
      { name: "Registration Coordinators", limit: 4 },
    ],
  };

  const organizer = {
    name: "Alex Organizer",
    email: "alex@eventra.internal",
    organization: "Eventra Developer Community",
  };

  const analytics = {
    totalRegistrations: 120,
    confirmedCount: 110,
    cancelledCount: 10,
    attendedCount: 88,
    absentCount: 22,
    attendanceRate: 80.0,
  };

  const report = generateDefaultReportContent(event, organizer, analytics);

  const sections = [
    "executiveSummary",
    "objectives",
    "eventOverview",
    "activities",
    "highlights",
    "speakersSummary",
    "participantEngagement",
    "outcomes",
    "challenges",
    "feedbackSummary",
    "futureImprovements",
    "conclusion",
  ];

  sections.forEach((sec) => {
    assert.ok(typeof report[sec] === "string" && report[sec].length > 0, `Section ${sec} must be generated`);
  });

  assert.ok(report.executiveSummary.includes("AI & Cloud Architecture Summit"));
  assert.ok(report.executiveSummary.includes("88"));
  assert.ok(report.executiveSummary.includes("80%"));
  assert.ok(report.speakersSummary.includes("Dr. Evelyn Reed"));
  assert.ok(report.feedbackSummary.includes("not actively collected"));
});
