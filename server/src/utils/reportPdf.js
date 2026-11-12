import PDFDocument from "pdfkit";
import { formatEventDateRangeLabel } from "./multiDay.js";

function formatDate(date) {
  if (!date) return "Event Date";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function withMarginsTemporarilyDisabled(doc, fn) {
  const prevTop = doc.page.margins.top;
  const prevBottom = doc.page.margins.bottom;
  doc.page.margins.top = 0;
  doc.page.margins.bottom = 0;
  try {
    fn();
  } finally {
    doc.page.margins.top = prevTop;
    doc.page.margins.bottom = prevBottom;
  }
}

/**
 * Draws running header on internal report pages (page 2 onward).
 */
function drawHeader(doc, eventTitle) {
  doc.save();
  withMarginsTemporarilyDisabled(doc, () => {
    const width = doc.page.width;
    doc.rect(50, 34, width - 100, 1).fill("#cbd5e1");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f766e")
      .text("POST-EVENT EVALUATION REPORT", 50, 21, { width: 220, lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor("#64748b")
      .text(eventTitle, 270, 21, { width: width - 320, align: "right", lineBreak: false, ellipsis: true });
  });
  doc.restore();
}

/**
 * Draws running footer on all buffered pages with the event name (no platform branding).
 */
function drawFooter(doc, eventTitle, pageNum, totalPages) {
  doc.save();
  withMarginsTemporarilyDisabled(doc, () => {
    const width = doc.page.width;
    const height = doc.page.height;
    doc.rect(50, height - 44, width - 100, 1).fill("#e2e8f0");
    doc.font("Helvetica").fontSize(8).fillColor("#64748b")
      .text(`${eventTitle}  ·  Official Post-Event Summary Report`, 50, height - 34, {
        width: width - 210,
        lineBreak: false,
        ellipsis: true,
      });
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569")
      .text(`Page ${pageNum} of ${totalPages}`, width - 150, height - 34, {
        width: 100,
        align: "right",
        lineBreak: false,
      });
  });
  doc.restore();
}

/**
 * Draws a section heading with a primary accent bar.
 */
function drawSectionHeading(doc, title, y) {
  doc.save();
  doc.rect(50, y, 4, 16).fill("#0f766e");
  doc.font("Helvetica-Bold").fontSize(12.5).fillColor("#0f172a")
    .text(title, 62, y + 2, { width: doc.page.width - 112, lineBreak: false, ellipsis: true });
  doc.restore();
  return y + 24;
}

/**
 * Generates an organized, flowing multi-page Post-Event Report PDF with zero blank pages
 * and dynamic event-branded footers.
 *
 * @param {Object} event Event document
 * @param {Object} organizer Organizer User document
 * @param {Object} report PostEventReport document or report data
 * @param {Object} analytics Calculated analytics
 * @returns {Promise<Buffer>}
 */
export function generateReportPdf(event, organizer, report, analytics) {
  return new Promise((resolve, reject) => {
    try {
      const eventTitle = String(event?.title || "Post-Event Report").trim() || "Post-Event Report";
      const orgName = organizer?.organization || organizer?.name || "The Organizing Committee";
      const dateStr = event?.eventDurationType === "multi_day"
        ? formatEventDateRangeLabel(event)
        : formatDate(event?.date);

      const doc = new PDFDocument({
        size: "A4",
        layout: "portrait",
        margin: 50,
        bufferPages: true,
        compress: true,
        info: {
          Title: `Post-Event Report - ${eventTitle}`,
          Author: orgName,
          Subject: `${eventTitle} - Post-Event Evaluation Report`,
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;   // ~595.28 pt
      const pageHeight = doc.page.height; // ~841.89 pt
      const contentWidth = pageWidth - 100;
      const CONTENT_TOP = 54;
      const PAGE_BOTTOM = pageHeight - 62;

      // =========================================================================
      // PAGE 1: COVER
      // =========================================================================
      doc.rect(0, 0, pageWidth, 18).fill("#0f766e");
      doc.rect(0, 18, pageWidth, 5).fill("#0d9488");

      doc.roundedRect(50, 64, 198, 24, 4).fill("#f0fdfa");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f766e")
        .text("POST-EVENT EVALUATION REPORT", 62, 72, { lineBreak: false });

      doc.font("Helvetica-Bold").fontSize(26);
      const titleHeight = Math.min(
        doc.heightOfString(eventTitle, { width: contentWidth, lineGap: 4 }),
        108
      );
      doc.font("Helvetica-Bold").fontSize(26).fillColor("#0f172a")
        .text(eventTitle, 50, 108, {
          width: contentWidth,
          height: 112,
          lineGap: 4,
          ellipsis: true,
        });

      const subtitleY = Math.max(176, 114 + titleHeight + 6);
      doc.font("Helvetica").fontSize(11.5).fillColor("#475569")
        .text(
          event?.eventType ? `Official Summary  ·  ${event.eventType}` : "Official Post-Event Program Assessment",
          50,
          subtitleY,
          { width: contentWidth, lineBreak: false, ellipsis: true }
        );

      const dividerY = subtitleY + 24;
      doc.rect(50, dividerY, contentWidth, 1.5).fill("#0f766e");

      const cardY = dividerY + 18;
      doc.roundedRect(50, cardY, contentWidth, 224, 8).fillAndStroke("#f8fafc", "#e2e8f0");

      const rawLoc = (event?.location || "").trim();
      const isLocationUrl = /^https?:\/\//i.test(rawLoc) || rawLoc.includes("maps.google") || rawLoc.includes("goo.gl");
      const cleanLocation = (!isLocationUrl && rawLoc) ? rawLoc : (event?.venue || "On-site");

      const metaItems = [
        { label: "EVENT DATE", val: dateStr },
        { label: "TIMING", val: `${event?.startTime || "Not specified"} to ${event?.endTime || "Not specified"}` },
        { label: "VENUE", val: event?.venue || "Venue Unspecified" },
        { label: "LOCATION", val: cleanLocation },
        { label: "ORGANIZATION", val: orgName },
        { label: "ORGANIZER CONTACT", val: `${organizer?.name || "Organizer"} (${organizer?.email || "N/A"})` },
        { label: "REPORT STATUS", val: (report?.reportStatus || "draft").toUpperCase() },
        { label: "REPORT DATE", val: formatDate(new Date()) },
      ];

      metaItems.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 70 + col * 240;
        const y = cardY + 20 + row * 48;
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b")
          .text(item.label, x, y, { lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e293b")
          .text(item.val, x, y + 12, { width: 220, lineBreak: false, ellipsis: true });
      });

      const kpiBannerY = cardY + 244;
      doc.roundedRect(50, kpiBannerY, contentWidth, 80, 8).fill("#0f172a");

      const kpis = [
        { label: "REGISTRATIONS", val: String(analytics?.confirmedCount ?? 0) },
        { label: "CHECKED IN", val: String(analytics?.attendedCount ?? 0) },
        { label: "ABSENT", val: String(analytics?.absentCount ?? 0) },
        { label: "ATTENDANCE RATE", val: `${analytics?.attendanceRate ?? 0}%` },
      ];
      const kpiColWidth = contentWidth / 4;
      kpis.forEach((kpi, idx) => {
        const kpiX = 50 + idx * kpiColWidth;
        doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8")
          .text(kpi.label, kpiX, kpiBannerY + 22, { width: kpiColWidth, align: "center", lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(18).fillColor("#38bdf8")
          .text(kpi.val, kpiX, kpiBannerY + 40, { width: kpiColWidth, align: "center", lineBreak: false });
      });

      const coverNoteY = Math.min(kpiBannerY + 120, pageHeight - 108);
      doc.font("Helvetica").fontSize(9).fillColor("#64748b")
        .text(
          "This document provides verified institutional event documentation including attendance statistics, " +
          "program execution, key highlights, participant feedback analysis, and future recommendations.",
          50,
          coverNoteY,
          { width: contentWidth, align: "center", lineGap: 3 }
        );

      // =========================================================================
      // FLOWING ORGANIZED PAGES (NO BLANK PAGES, ZERO TEXT CLIPPING)
      // =========================================================================
      let cursorY = PAGE_BOTTOM; // Forces clean Page 2 before first content section

      function startNewPage() {
        doc.addPage();
        drawHeader(doc, eventTitle);
        cursorY = CONTENT_TOP;
      }

      function ensureSpace(heightNeeded) {
        if (cursorY === PAGE_BOTTOM || cursorY + heightNeeded > PAGE_BOTTOM) {
          startNewPage();
        }
      }

      function drawTextBlocks(rawText) {
        const blocks = String(rawText || "No details provided.")
          .split(/\n{2,}/)
          .map((b) => b.trim())
          .filter(Boolean);
        const safeBlocks = blocks.length > 0 ? blocks : ["No details provided."];

        for (const block of safeBlocks) {
          const lines = block.split(/\r?\n/);
          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) {
              cursorY += 6;
              continue;
            }
            doc.font("Helvetica").fontSize(9.5);
            const lineHeight = doc.heightOfString(cleanLine, {
              width: contentWidth,
              lineGap: 3,
            });
            ensureSpace(Math.min(lineHeight + 4, 90));
            doc.font("Helvetica").fontSize(9.5).fillColor("#334155")
              .text(cleanLine, 50, cursorY, { width: contentWidth, lineGap: 3 });
            cursorY += lineHeight + 4;
          }
          cursorY += 5;
        }
        cursorY += 7;
      }

      function drawSection(headingTitle, bodyText) {
        ensureSpace(72); // Heading (24) + at least ~2 lines of text
        cursorY = drawSectionHeading(doc, headingTitle, cursorY);
        drawTextBlocks(bodyText);
      }

      function drawAnalyticsSection(sectionNumber, sectionHeading) {
        ensureSpace(190);
        cursorY = drawSectionHeading(doc, `${sectionNumber}. ${sectionHeading}`, cursorY);

        const cardWidth = (contentWidth - 16) / 2;
        const cardHeight = 56;
        const statCards = [
          { label: "Confirmed Registrations", value: analytics?.confirmedCount ?? 0, sub: "Total verified enrollments", color: "#1e293b" },
          { label: "Attended (Checked In)", value: analytics?.attendedCount ?? 0, sub: "Verified at QR entry points", color: "#0f766e" },
          { label: "Absenteeism", value: analytics?.absentCount ?? 0, sub: "Confirmed but not checked in", color: "#b91c1c" },
          { label: "Attendance Turnover", value: `${analytics?.attendanceRate ?? 0}%`, sub: "(Attended / Confirmed) × 100", color: "#0284c7" },
        ];

        statCards.forEach((card, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = 50 + col * (cardWidth + 16);
          const y = cursorY + row * (cardHeight + 10);

          doc.roundedRect(x, y, cardWidth, cardHeight, 6).fillAndStroke("#f8fafc", "#cbd5e1");
          doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#64748b")
            .text(card.label, x + 14, y + 9, { lineBreak: false });
          doc.font("Helvetica-Bold").fontSize(17).fillColor(card.color)
            .text(String(card.value), x + 14, y + 22, { lineBreak: false });
          doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8")
            .text(card.sub, x + 14, y + 43, { lineBreak: false });
        });

        cursorY += cardHeight * 2 + 28;

        ensureSpace(125);
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a")
          .text("Registration & Attendance Breakdown", 50, cursorY, { lineBreak: false });
        cursorY += 16;

        doc.rect(50, cursorY, contentWidth, 20).fill("#0f766e");
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
        doc.text("Metric", 60, cursorY + 6, { width: 220, lineBreak: false });
        doc.text("Count", 280, cursorY + 6, { width: 100, align: "center", lineBreak: false });
        doc.text("Share of Registrations", 390, cursorY + 6, { width: 145, align: "right", lineBreak: false });
        cursorY += 20;

        const confirmedCount = analytics?.confirmedCount ?? 0;
        const totalRegistrations = analytics?.totalRegistrations ?? confirmedCount;
        const cancelledCount = analytics?.cancelledCount ?? 0;

        const breakdownRows = [
          { label: "Confirmed Registrations", count: confirmedCount, share: "100.0%" },
          { label: "Attended Participants (QR Verified)", count: analytics?.attendedCount ?? 0, share: `${analytics?.attendanceRate ?? 0}%` },
          {
            label: "Absent Participants",
            count: analytics?.absentCount ?? 0,
            share: `${confirmedCount > 0 ? (100 - (analytics?.attendanceRate ?? 0)).toFixed(1) : 0}%`,
          },
          {
            label: "Cancelled Registrations",
            count: cancelledCount,
            share: totalRegistrations > 0 ? `${((cancelledCount / totalRegistrations) * 100).toFixed(1)}%` : "0.0%",
          },
        ];

        breakdownRows.forEach((row, rIdx) => {
          const bg = rIdx % 2 === 0 ? "#f8fafc" : "#ffffff";
          doc.rect(50, cursorY, contentWidth, 20).fillAndStroke(bg, "#e2e8f0");
          doc.font("Helvetica").fontSize(8.5).fillColor("#1e293b")
            .text(row.label, 60, cursorY + 6, { width: 220, lineBreak: false });
          doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f766e")
            .text(String(row.count), 280, cursorY + 6, { width: 100, align: "center", lineBreak: false });
          doc.font("Helvetica").fontSize(8.5).fillColor("#334155")
            .text(row.share, 390, cursorY + 6, { width: 145, align: "right", lineBreak: false });
          cursorY += 20;
        });

        cursorY += 18;

        const deptEntries = Object.entries(analytics?.departmentCounts || {}).slice(0, 8);
        if (deptEntries.length > 0) {
          ensureSpace(46 + deptEntries.length * 18);
          doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a")
            .text("Department-Wise Participation", 50, cursorY, { lineBreak: false });
          cursorY += 16;

          doc.rect(50, cursorY, contentWidth, 18).fill("#334155");
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
          doc.text("Department", 60, cursorY + 5, { width: 220, lineBreak: false });
          doc.text("Registered", 280, cursorY + 5, { width: 100, align: "center", lineBreak: false });
          doc.text("Attended", 390, cursorY + 5, { width: 145, align: "right", lineBreak: false });
          cursorY += 18;

          deptEntries.forEach(([dept, counts], dIdx) => {
            const bg = dIdx % 2 === 0 ? "#f8fafc" : "#ffffff";
            doc.rect(50, cursorY, contentWidth, 18).fillAndStroke(bg, "#e2e8f0");
            doc.font("Helvetica").fontSize(8).fillColor("#1e293b")
              .text(dept, 60, cursorY + 5, { width: 220, lineBreak: false, ellipsis: true });
            doc.font("Helvetica").fontSize(8).fillColor("#64748b")
              .text(String(counts.registered), 280, cursorY + 5, { width: 100, align: "center", lineBreak: false });
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f766e")
              .text(String(counts.attended), 390, cursorY + 5, { width: 145, align: "right", lineBreak: false });
            cursorY += 18;
          });
          cursorY += 18;
        }

        // Multi-day attendance table (Day-by-Day unique attendees + Attending All Days)
        const dailyBreakdown = Array.isArray(analytics?.multiDay?.dailyBreakdown)
          ? analytics.multiDay.dailyBreakdown
          : [];
        if (analytics?.multiDay?.isMultiDay && dailyBreakdown.length > 0) {
          ensureSpace(64 + dailyBreakdown.length * 18);
          doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a")
            .text(
              `Daily Attendance Breakdown (${dailyBreakdown.length} Days · Attending All Days: ${analytics.multiDay.participantsAttendingAllDays ?? 0})`,
              50,
              cursorY,
              { lineBreak: false }
            );
          cursorY += 16;

          doc.rect(50, cursorY, contentWidth, 18).fill("#0f766e");
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
          doc.text("Day", 60, cursorY + 5, { width: 120, lineBreak: false });
          doc.text("Date", 180, cursorY + 5, { width: 130, lineBreak: false });
          doc.text("Unique Attendees", 310, cursorY + 5, { width: 100, align: "center", lineBreak: false });
          doc.text("Attendance %", 420, cursorY + 5, { width: 115, align: "right", lineBreak: false });
          cursorY += 18;

          dailyBreakdown.forEach((day, idx) => {
            const bg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
            doc.rect(50, cursorY, contentWidth, 18).fillAndStroke(bg, "#e2e8f0");
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#1e293b")
              .text(day.title || `Day ${day.dayNumber}`, 60, cursorY + 5, { width: 120, lineBreak: false, ellipsis: true });
            doc.font("Helvetica").fontSize(8).fillColor("#475569")
              .text(formatDate(day.date), 180, cursorY + 5, { width: 130, lineBreak: false, ellipsis: true });
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f766e")
              .text(String(day.uniqueAttendees ?? 0), 310, cursorY + 5, { width: 100, align: "center", lineBreak: false });
            doc.font("Helvetica").fontSize(8).fillColor("#334155")
              .text(`${day.attendanceRate ?? 0}%`, 420, cursorY + 5, { width: 115, align: "right", lineBreak: false });
            cursorY += 18;
          });
          cursorY += 18;
        }

        // Session-level attendance breakdown when sessions are configured
        const sessionRows = Array.isArray(analytics?.multiDay?.sessionParticipation)
          ? analytics.multiDay.sessionParticipation.slice(0, 12)
          : [];
        if (sessionRows.length > 0) {
          ensureSpace(46 + sessionRows.length * 18);
          doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a")
            .text("Session Participation Summary", 50, cursorY, { lineBreak: false });
          cursorY += 16;

          doc.rect(50, cursorY, contentWidth, 18).fill("#334155");
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
          doc.text("Day & Session", 60, cursorY + 5, { width: 230, lineBreak: false });
          doc.text("Speaker / Venue", 290, cursorY + 5, { width: 130, lineBreak: false });
          doc.text("Attended", 425, cursorY + 5, { width: 110, align: "right", lineBreak: false });
          cursorY += 18;

          sessionRows.forEach((ses, idx) => {
            const bg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
            doc.rect(50, cursorY, contentWidth, 18).fillAndStroke(bg, "#e2e8f0");
            doc.font("Helvetica").fontSize(8).fillColor("#1e293b")
              .text(`D${ses.dayNumber} · ${ses.title}`, 60, cursorY + 5, { width: 225, lineBreak: false, ellipsis: true });
            doc.font("Helvetica").fontSize(7.5).fillColor("#64748b")
              .text([ses.speaker, ses.venue].filter(Boolean).join(" · ") || "—", 290, cursorY + 5, { width: 130, lineBreak: false, ellipsis: true });
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f766e")
              .text(`${ses.attendedCount ?? 0} (${ses.attendanceRate ?? 0}%)`, 425, cursorY + 5, { width: 110, align: "right", lineBreak: false });
            cursorY += 18;
          });
          cursorY += 18;
        }

        // Certificate Eligibility Summary
        if (analytics?.certificateStats) {
          const cs = analytics.certificateStats;
          ensureSpace(72);
          doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a")
            .text("Certificate Eligibility Statistics", 50, cursorY, { lineBreak: false });
          cursorY += 16;

          doc.rect(50, cursorY, contentWidth, 18).fill("#0f766e");
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
          doc.text("Rule Mode", 60, cursorY + 5, { width: 140, lineBreak: false });
          doc.text("Eligible", 205, cursorY + 5, { width: 80, align: "center", lineBreak: false });
          doc.text("Pending Feedback", 290, cursorY + 5, { width: 100, align: "center", lineBreak: false });
          doc.text("Ineligible", 395, cursorY + 5, { width: 70, align: "center", lineBreak: false });
          doc.text("Issued", 470, cursorY + 5, { width: 65, align: "right", lineBreak: false });
          cursorY += 18;

          doc.rect(50, cursorY, contentWidth, 20).fillAndStroke("#f8fafc", "#e2e8f0");
          doc.font("Helvetica").fontSize(8).fillColor("#1e293b")
            .text(cs.enabled ? String(cs.ruleMode || "any_day").replace(/_/g, " ") : "Disabled", 60, cursorY + 6, { width: 140, lineBreak: false });
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f766e")
            .text(String(cs.eligibleCount ?? 0), 205, cursorY + 6, { width: 80, align: "center", lineBreak: false });
          doc.font("Helvetica").fontSize(8).fillColor("#b45309")
            .text(String(cs.feedbackPendingCount ?? 0), 290, cursorY + 6, { width: 100, align: "center", lineBreak: false });
          doc.font("Helvetica").fontSize(8).fillColor("#64748b")
            .text(String(cs.ineligibleCount ?? 0), 395, cursorY + 6, { width: 70, align: "center", lineBreak: false });
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a")
            .text(String(cs.issuedCount ?? 0), 470, cursorY + 6, { width: 65, align: "right", lineBreak: false });
          cursorY += 32;
        }
      }

      const isIncluded = (key) => report?.includedSections?.[key] !== false;
      const headingFor = (key, defaultHeading) => {
        const custom = String(report?.sectionTitles?.[key] || "").trim();
        return custom || defaultHeading;
      };

      const standardSections = [
        { type: "text", key: "executiveSummary", defaultTitle: "Executive Summary" },
        { type: "text", key: "objectives", defaultTitle: "Event Objectives" },
        { type: "text", key: "eventOverview", defaultTitle: "Event Overview & Context" },
        { type: "analytics", key: "analytics", defaultTitle: "Attendance & Participation Analytics" },
        { type: "text", key: "activities", defaultTitle: "Activities Conducted" },
        { type: "text", key: "speakersSummary", defaultTitle: "Speakers, Guests & Sessions" },
        { type: "text", key: "highlights", defaultTitle: "Key Event Highlights" },
        { type: "text", key: "participantEngagement", defaultTitle: "Participant Engagement" },
        { type: "text", key: "outcomes", defaultTitle: "Event Outcomes" },
        { type: "text", key: "feedbackSummary", defaultTitle: "Feedback Analysis" },
        { type: "text", key: "challenges", defaultTitle: "Challenges Faced & Mitigations" },
        { type: "text", key: "futureImprovements", defaultTitle: "Recommendations & Future Improvements" },
        { type: "text", key: "conclusion", defaultTitle: "Conclusion" },
      ];

      let sectionNumber = 1;
      for (const sec of standardSections) {
        if (!isIncluded(sec.key)) continue;
        const resolvedTitle = headingFor(sec.key, sec.defaultTitle);
        if (sec.type === "analytics") {
          drawAnalyticsSection(sectionNumber, resolvedTitle);
        } else {
          drawSection(`${sectionNumber}. ${resolvedTitle}`, report?.[sec.key]);
        }
        sectionNumber += 1;
      }

      const customSections = Array.isArray(report?.customSections) ? report.customSections : [];
      for (const customSec of customSections) {
        if (!customSec || customSec.included === false) continue;
        const customTitle = String(customSec.title || "Additional Section").trim() || "Additional Section";
        drawSection(`${sectionNumber}. ${customTitle}`, customSec.content);
        sectionNumber += 1;
      }

      // Formal Sign-Off Block kept together
      ensureSpace(126);
      const signoffY = cursorY + 4;
      doc.roundedRect(50, signoffY, contentWidth, 118, 6).fillAndStroke("#f8fafc", "#cbd5e1");

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f766e")
        .text("OFFICIAL REPORT SIGN-OFF & AUTHORIZATION", 65, signoffY + 14, { lineBreak: false });
      doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
        .text("This report has been reviewed and officially archived as part of the post-event records.", 65, signoffY + 32, { lineBreak: false });

      doc.moveTo(65, signoffY + 82).lineTo(250, signoffY + 82).stroke("#94a3b8");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1e293b")
        .text(organizer?.name || "Authorized Event Lead", 65, signoffY + 88, { width: 200, lineBreak: false, ellipsis: true });
      doc.font("Helvetica").fontSize(7.5).fillColor("#64748b")
        .text(orgName, 65, signoffY + 100, { width: 200, lineBreak: false, ellipsis: true });

      doc.moveTo(330, signoffY + 82).lineTo(480, signoffY + 82).stroke("#94a3b8");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1e293b")
        .text(formatDate(new Date()), 330, signoffY + 88, { lineBreak: false });
      doc.font("Helvetica").fontSize(7.5).fillColor("#64748b")
        .text("Date of Document Verification", 330, signoffY + 100, { lineBreak: false });

      // Stamp clean running footer with event name across all actual pages
      const pageRange = doc.bufferedPageRange();
      for (let i = 0; i < pageRange.count; i += 1) {
        doc.switchToPage(pageRange.start + i);
        drawFooter(doc, eventTitle, i + 1, pageRange.count);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
