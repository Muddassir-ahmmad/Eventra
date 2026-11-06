import assert from "node:assert/strict";
import test from "node:test";
import { generateReportPdf } from "../src/utils/reportPdf.js";
import { generateDefaultReportContent } from "../src/utils/defaultReportContent.js";

test("Phase 7 Unit: generateReportPdf produces valid multi-page executive vector PDF", async () => {
  const dummyEvent = {
    title: "Global AI & Autonomous Systems Summit 2026",
    date: new Date("2026-10-20T09:00:00.000Z"),
    startTime: "09:30 AM",
    endTime: "05:00 PM",
    venue: "Main Convention Center",
    location: "Bangalore, India",
    capacity: 250,
    eventType: "International Tech Conference",
    description: "Three-day premier international summit covering foundational models and agentic computing.",
    speakers: [
      { name: "Dr. Evelyn Reed", designation: "AI Director", organization: "DeepMind", role: "Keynote" },
      { name: "Prof. Alan Smith", designation: "Chair of Computing", organization: "Tech University", role: "Workshop Lead" },
    ],
    volunteerRoles: [
      { name: "Registration Desk", limit: 6 },
      { name: "Technical Support", limit: 4 },
    ],
  };

  const dummyOrganizer = {
    name: "Dr. Marcus Vance",
    email: "marcus.vance@ai-summit.org",
    organization: "Autonomous Intelligence Council",
  };

  const dummyAnalytics = {
    totalRegistrations: 210,
    confirmedCount: 195,
    cancelledCount: 15,
    attendedCount: 172,
    absentCount: 23,
    attendanceRate: 88.2,
    registrationToAttendanceRate: 81.9,
    feedbackCount: 140,
    feedbackResponseRate: 71.8,
    averageRating: 4.8,
    averageRatings: {
      overall: 4.8,
      organization: 4.7,
      speakers: 4.9,
      venue: 4.6,
    },
    departmentCounts: {
      "Computer Science": { registered: 120, attended: 108 },
      "Robotics": { registered: 50, attended: 42 },
      "Information Systems": { registered: 25, attended: 22 },
    },
    collegeCounts: {
      "Apex Institute": { registered: 110, attended: 98 },
      "National University": { registered: 85, attended: 74 },
    },
  };

  const defaultContent = generateDefaultReportContent(dummyEvent, dummyOrganizer, dummyAnalytics);
  const pdfBuffer = await generateReportPdf(dummyEvent, dummyOrganizer, defaultContent, dummyAnalytics);

  assert.ok(Buffer.isBuffer(pdfBuffer), "Report PDF should return a Buffer");
  assert.ok(pdfBuffer.length > 5000, "Executive multi-page report PDF should be substantial");
  assert.equal(pdfBuffer.subarray(0, 5).toString("utf8"), "%PDF-", "Should have valid PDF header");
});

