import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";
import { generateReportPdf } from "../src/utils/reportPdf.js";
import { generateDefaultReportContent } from "../src/utils/defaultReportContent.js";

function extractPdfStreamsText(pdfBuffer) {
  const rawPdf = pdfBuffer.toString("latin1");
  const pageMatches = rawPdf.match(/\/Type\s*\/Page\b(?!s)/g) || [];
  const streamTexts = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(rawPdf)) !== null) {
    try {
      streamTexts.push(zlib.inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"));
    } catch {
      streamTexts.push(match[1]);
    }
  }
  const decodePdfStream = (s) =>
    s
      .replace(/>\s*-?\d+(?:\.\d+)?\s*</g, "")
      .replace(/<([0-9a-fA-F]+)>/g, (_, hex) => Buffer.from(hex, "hex").toString("latin1"));
  return {
    pageCount: pageMatches.length,
    streamCount: streamTexts.length,
    combinedText: streamTexts.map(decodePdfStream).join("\n"),
  };
}

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

  const { pageCount, streamCount, combinedText: combinedStreams } = extractPdfStreamsText(pdfBuffer);
  assert.ok(pageCount >= 2 && pageCount <= 7, `Expected compact 2-7 pages without blank page inflation, got ${pageCount}`);
  assert.equal(streamCount, pageCount, "Every PDF page should have non-empty drawn content");
  assert.ok(!combinedStreams.includes("Official Eventra Event Summary Report"), "Footer should not contain platform name");
  assert.ok(combinedStreams.includes("Global AI & Autonomous Systems Summit 2026"), "Footer/header should contain event title");
  assert.ok(combinedStreams.includes("Official Post-Event Summary Report"), "Footer should contain official post-event report label");
  assert.ok(combinedStreams.includes(`Page 1 of ${pageCount}`), "Footer should report dynamic page total");
});

test("Report PDF omits unticked sections, uses edited headings, and renders extra custom sections", async () => {
  const dummyEvent = {
    title: "Modular Custom Report Event",
    date: new Date("2026-11-10T09:00:00.000Z"),
    startTime: "10:00 AM",
    endTime: "04:00 PM",
    venue: "Auditorium B",
  };
  const dummyOrganizer = {
    name: "Organizer One",
    email: "org@eventra.local",
    organization: "Sahyadri Tech Club",
  };
  const dummyAnalytics = {
    totalRegistrations: 50,
    confirmedCount: 45,
    cancelledCount: 5,
    attendedCount: 40,
    absentCount: 5,
    attendanceRate: 88.9,
    departmentCounts: {},
  };
  const customReport = {
    ...generateDefaultReportContent(dummyEvent, dummyOrganizer, dummyAnalytics),
    highlights: "",
    challenges: "",
    feedbackSummary: "",
    includedSections: {
      executiveSummary: true,
      objectives: false,
      eventOverview: false,
      analytics: true,
      activities: false,
      speakersSummary: false,
      highlights: false,
      participantEngagement: false,
      outcomes: false,
      feedbackSummary: false,
      challenges: false,
      futureImprovements: false,
      conclusion: true,
    },
    sectionTitles: {
      executiveSummary: "Program Executive Brief",
      conclusion: "Closing Remarks & Sign-Off",
    },
    customSections: [
      {
        id: "extra_sponsors",
        title: "Sponsor & Partner Credits",
        content: "Sponsored by Sahyadri Innovation Lab.",
        included: true,
      },
      {
        id: "extra_hidden",
        title: "Hidden Budget Scratchpad",
        content: "Internal only notes",
        included: false,
      },
    ],
  };

  const pdfBuffer = await generateReportPdf(dummyEvent, dummyOrganizer, customReport, dummyAnalytics);
  const { combinedText } = extractPdfStreamsText(pdfBuffer);

  assert.ok(combinedText.includes("1. Program Executive Brief"), "Custom edited heading must print with sequential index 1");
  assert.ok(combinedText.includes("2. Attendance & Participation Analytics"), "Ticked analytics section must renumber cleanly to 2");
  assert.ok(combinedText.includes("3. Closing Remarks & Sign-Off"), "Edited conclusion heading must renumber cleanly to 3");
  assert.ok(combinedText.includes("4. Sponsor & Partner Credits"), "Included extra section must render with its heading");
  assert.ok(combinedText.includes("Sponsored by Sahyadri Innovation Lab."), "Included extra section body must render");

  assert.ok(!combinedText.includes("Key Event Highlights"), "Unticked highlights heading must be excluded");
  assert.ok(!combinedText.includes("Challenges Faced"), "Unticked challenges heading must be excluded");
  assert.ok(!combinedText.includes("Feedback Analysis"), "Unticked feedback heading must be excluded");
  assert.ok(!combinedText.includes("Hidden Budget Scratchpad"), "Unticked custom section must be excluded");
});

