import PDFDocument from "pdfkit";

function formatDate(date) {
  if (!date) return "Event Date";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

/**
 * Draws running header on internal report pages (pages 2 to 6).
 */
function drawHeader(doc, eventTitle, pageNum) {
  if (pageNum === 1) return; // Cover page does not have running header
  doc.save();
  const width = doc.page.width;
  doc.rect(50, 30, width - 100, 1).fill("#cbd5e1");
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f766e")
    .text("EVENTRA  ·  POST-EVENT REPORT", 50, 18, { lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor("#64748b")
    .text(eventTitle, width - 350, 18, { width: 300, align: "right", lineBreak: false, ellipsis: true });
  doc.restore();
}

/**
 * Draws running footer on all pages.
 */
function drawFooter(doc, pageNum, totalPages = 6) {
  doc.save();
  const width = doc.page.width;
  const height = doc.page.height;
  doc.rect(50, height - 42, width - 100, 1).fill("#e2e8f0");
  doc.font("Helvetica").fontSize(8).fillColor("#94a3b8")
    .text("Official Eventra Event Summary Report  ·  Generated from verified attendance records", 50, height - 34, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b")
    .text(`Page ${pageNum} of ${totalPages}`, width - 150, height - 34, { width: 100, align: "right" });
  doc.restore();
}

/**
 * Draws a section heading with a primary accent bar and clear typography.
 */
function drawSectionHeading(doc, title, y) {
  doc.save();
  doc.rect(50, y, 4, 16).fill("#0f766e");
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a")
    .text(title, 62, y + 2, { lineBreak: false });
  doc.restore();
  return y + 26;
}

/**
 * Draws wrapped narrative paragraphs.
 */
function drawParagraph(doc, text, y, maxHeight = 160) {
  doc.save();
  doc.font("Helvetica").fontSize(9.5).fillColor("#334155")
    .text(text || "No details provided.", 50, y, {
      width: doc.page.width - 100,
      height: maxHeight,
      lineGap: 3,
      ellipsis: true,
    });
  const textHeight = doc.heightOfString(text || "No details provided.", {
    width: doc.page.width - 100,
    font: "Helvetica",
    size: 9.5,
    lineGap: 3,
  });
  doc.restore();
  return y + Math.min(textHeight, maxHeight) + 16;
}

/**
 * Generates the official multi-page Post-Event Report PDF as a Buffer.
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
      const doc = new PDFDocument({
        size: "A4",
        layout: "portrait",
        margin: 50,
        compress: true,
        info: {
          Title: `Post-Event Report - ${event.title}`,
          Author: organizer?.name || "Eventra Organizer",
          Subject: "Post-Event Comprehensive Evaluation Report",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;   // ~595.28 pt
      const pageHeight = doc.page.height; // ~841.89 pt
      const contentWidth = pageWidth - 100;
      const orgName = organizer?.organization || organizer?.name || "The Organizing Committee";
      const dateStr = formatDate(event.date);

      // =========================================================================
      // PAGE 1: COVER
      // =========================================================================
      // Top Brand Banner
      doc.rect(0, 0, pageWidth, 18).fill("#0f766e");
      doc.rect(0, 18, pageWidth, 5).fill("#0d9488");

      // Badge
      doc.roundedRect(50, 70, 190, 24, 4).fill("#f0fdfa");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f766e")
        .text("POST-EVENT EVALUATION REPORT", 62, 78, { lineBreak: false });

      // Event Title
      doc.font("Helvetica-Bold").fontSize(28).fillColor("#0f172a")
        .text(event.title || "Untitled Event", 50, 115, {
          width: contentWidth,
          lineGap: 4,
          ellipsis: true,
        });

      // Subtitle / Event Type
      doc.font("Helvetica").fontSize(12).fillColor("#475569")
        .text(event.eventType ? `Official Summary  ·  ${event.eventType}` : "Official Post-Event Program Assessment", 50, 180);

      // Divider Line
      doc.rect(50, 206, contentWidth, 1.5).fill("#0f766e");

      // Card Container for Metadata
      doc.roundedRect(50, 226, contentWidth, 230, 8).fillAndStroke("#f8fafc", "#e2e8f0");

      const metaItems = [
        { label: "EVENT DATE", val: dateStr },
        { label: "TIMING", val: `${event.startTime || "Not specified"} to ${event.endTime || "Not specified"}` },
        { label: "VENUE", val: event.venue || "Venue Unspecified" },
        { label: "LOCATION", val: event.location || "On-site" },
        { label: "ORGANIZATION", val: orgName },
        { label: "ORGANIZER CONTACT", val: `${organizer?.name || "Organizer"} (${organizer?.email || "N/A"})` },
        { label: "REPORT STATUS", val: (report.reportStatus || "draft").toUpperCase() },
        { label: "REPORT DATE", val: formatDate(new Date()) },
      ];

      metaItems.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 70 + col * 240;
        const y = 246 + row * 48;
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b")
          .text(item.label, x, y, { lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e293b")
          .text(item.val, x, y + 12, { width: 220, lineBreak: false, ellipsis: true });
      });

      // Key Metrics Banner on Cover
      doc.roundedRect(50, 480, contentWidth, 80, 8).fill("#0f172a");

      const kpis = [
        { label: "REGISTRATIONS", val: String(analytics.confirmedCount) },
        { label: "CHECKED IN", val: String(analytics.attendedCount) },
        { label: "ABSENT", val: String(analytics.absentCount) },
        { label: "ATTENDANCE RATE", val: `${analytics.attendanceRate}%` },
      ];
      const kpiColWidth = contentWidth / 4;
      kpis.forEach((kpi, idx) => {
        const kpiX = 50 + idx * kpiColWidth;
        doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8")
          .text(kpi.label, kpiX, 502, { width: kpiColWidth, align: "center", lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(18).fillColor("#38bdf8")
          .text(kpi.val, kpiX, 520, { width: kpiColWidth, align: "center", lineBreak: false });
      });

      // Cover Footer Note
      doc.font("Helvetica").fontSize(9).fillColor("#64748b")
        .text(
          "This document provides verified institutional event documentation including attendance statistics, " +
          "curriculum execution, key highlights, and recommendations for stakeholders.",
          50, 680, { width: contentWidth, align: "center", lineGap: 3 }
        );

      drawFooter(doc, 1);

      // =========================================================================
      // PAGE 2: EXECUTIVE SUMMARY, OBJECTIVES & OVERVIEW
      // =========================================================================
      doc.addPage();
      drawHeader(doc, event.title, 2);

      let currentY = 56;
      currentY = drawSectionHeading(doc, "1. Executive Summary", currentY);
      currentY = drawParagraph(doc, report.executiveSummary, currentY, 190);

      currentY = drawSectionHeading(doc, "2. Event Objectives", currentY);
      currentY = drawParagraph(doc, report.objectives, currentY, 180);

      currentY = drawSectionHeading(doc, "3. Event Overview & Context", currentY);
      drawParagraph(doc, report.eventOverview, currentY, 180);

      drawFooter(doc, 2);

      // =========================================================================
      // PAGE 3: EVENT STATISTICS & ATTENDANCE ANALYTICS
      // =========================================================================
      doc.addPage();
      drawHeader(doc, event.title, 3);

      currentY = 56;
      currentY = drawSectionHeading(doc, "4. Attendance & Participation Analytics", currentY);

      // Metrics 2x2 Grid Cards
      const cardWidth = (contentWidth - 16) / 2;
      const cardHeight = 60;

      const statCards = [
        { label: "Confirmed Registrations", value: analytics.confirmedCount, sub: "Total verified enrollments", color: "#1e293b" },
        { label: "Attended (Checked In)", value: analytics.attendedCount, sub: "Verified at QR entry points", color: "#0f766e" },
        { label: "Absenteeism", value: analytics.absentCount, sub: "Confirmed but not checked in", color: "#b91c1c" },
        { label: "Attendance Turnover", value: `${analytics.attendanceRate}%`, sub: "(Attended / Confirmed) × 100", color: "#0284c7" },
      ];

      statCards.forEach((card, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cardX = 50 + col * (cardWidth + 16);
        const cardY = currentY + row * (cardHeight + 12);

        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 6).fillAndStroke("#f8fafc", "#cbd5e1");
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#64748b")
          .text(card.label, cardX + 14, cardY + 10, { lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(18).fillColor(card.color)
          .text(String(card.value), cardX + 14, cardY + 24, { lineBreak: false });
        doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8")
          .text(card.sub, cardX + 14, cardY + 46, { lineBreak: false });
      });

      currentY += (cardHeight * 2) + 32;

      // Registration Breakdown Table
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a")
        .text("Registration & Attendance Breakdown", 50, currentY);
      currentY += 18;

      // Table Header
      doc.rect(50, currentY, contentWidth, 20).fill("#0f766e");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
      doc.text("Metric", 60, currentY + 6, { width: 220 });
      doc.text("Count", 280, currentY + 6, { width: 100, align: "center" });
      doc.text("Share of Registrations", 400, currentY + 6, { width: 140, align: "right" });
      currentY += 20;

      const breakdownRows = [
        { label: "Confirmed Registrations", count: analytics.confirmedCount, share: "100.0%" },
        { label: "Attended Participants (QR Verified)", count: analytics.attendedCount, share: `${analytics.attendanceRate}%` },
        { label: "Absent Participants", count: analytics.absentCount, share: `${analytics.confirmedCount > 0 ? (100 - analytics.attendanceRate).toFixed(1) : 0}%` },
        { label: "Cancelled Registrations", count: analytics.cancelledCount, share: analytics.totalRegistrations > 0 ? `${((analytics.cancelledCount / analytics.totalRegistrations) * 100).toFixed(1)}%` : "0.0%" },
      ];

      breakdownRows.forEach((row, rIdx) => {
        const bg = rIdx % 2 === 0 ? "#f8fafc" : "#ffffff";
        doc.rect(50, currentY, contentWidth, 20).fillAndStroke(bg, "#e2e8f0");
        doc.font("Helvetica").fontSize(8.5).fillColor("#1e293b")
          .text(row.label, 60, currentY + 6, { width: 220 });
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f766e")
          .text(String(row.count), 280, currentY + 6, { width: 100, align: "center" });
        doc.font("Helvetica").fontSize(8.5).fillColor("#334155")
          .text(row.share, 400, currentY + 6, { width: 140, align: "right" });
        currentY += 20;
      });

      currentY += 24;

      // Department-wise Breakdown Table (up to 5 entries)
      const deptEntries = Object.entries(analytics.departmentCounts || {}).slice(0, 5);
      if (deptEntries.length > 0) {
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a")
          .text("Department-Wise Participation", 50, currentY);
        currentY += 18;

        doc.rect(50, currentY, contentWidth, 18).fill("#334155");
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
        doc.text("Department", 60, currentY + 5, { width: 220 });
        doc.text("Registered", 280, currentY + 5, { width: 100, align: "center" });
        doc.text("Attended", 400, currentY + 5, { width: 140, align: "right" });
        currentY += 18;

        deptEntries.forEach(([dept, counts], dIdx) => {
          const bg = dIdx % 2 === 0 ? "#f8fafc" : "#ffffff";
          doc.rect(50, currentY, contentWidth, 18).fillAndStroke(bg, "#e2e8f0");
          doc.font("Helvetica").fontSize(8).fillColor("#1e293b")
            .text(dept, 60, currentY + 5, { width: 220, ellipsis: true });
          doc.font("Helvetica").fontSize(8).fillColor("#64748b")
            .text(String(counts.registered), 280, currentY + 5, { width: 100, align: "center" });
          doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f766e")
            .text(String(counts.attended), 400, currentY + 5, { width: 140, align: "right" });
          currentY += 18;
        });
      } else {
        doc.font("Helvetica-Oblique").fontSize(9).fillColor("#94a3b8")
          .text("No department details were captured during participant registration.", 50, currentY);
      }

      drawFooter(doc, 3);

      // =========================================================================
      // PAGE 4: ACTIVITIES CONDUCTED & KEY HIGHLIGHTS
      // =========================================================================
      doc.addPage();
      drawHeader(doc, event.title, 4);

      currentY = 56;
      currentY = drawSectionHeading(doc, "5. Activities Conducted", currentY);
      currentY = drawParagraph(doc, report.activities, currentY, 190);

      currentY = drawSectionHeading(doc, "6. Speakers, Guests & Sessions", currentY);
      currentY = drawParagraph(doc, report.speakersSummary, currentY, 180);

      currentY = drawSectionHeading(doc, "7. Key Event Highlights", currentY);
      drawParagraph(doc, report.highlights, currentY, 180);

      drawFooter(doc, 4);

      // =========================================================================
      // PAGE 5: OUTCOMES, ENGAGEMENT & FEEDBACK
      // =========================================================================
      doc.addPage();
      drawHeader(doc, event.title, 5);

      currentY = 56;
      currentY = drawSectionHeading(doc, "8. Participant Engagement & Event Outcomes", currentY);
      currentY = drawParagraph(
        doc,
        `${report.participantEngagement || ""}\n\n${report.outcomes || ""}`.trim(),
        currentY,
        210
      );

      currentY = drawSectionHeading(doc, "9. Feedback Analysis", currentY);
      currentY = drawParagraph(doc, report.feedbackSummary, currentY, 170);

      currentY = drawSectionHeading(doc, "10. Challenges Faced & Mitigations", currentY);
      drawParagraph(doc, report.challenges, currentY, 170);

      drawFooter(doc, 5);

      // =========================================================================
      // PAGE 6: FUTURE RECOMMENDATIONS & CONCLUSION
      // =========================================================================
      doc.addPage();
      drawHeader(doc, event.title, 6);

      currentY = 56;
      currentY = drawSectionHeading(doc, "11. Recommendations & Future Improvements", currentY);
      currentY = drawParagraph(doc, report.futureImprovements, currentY, 210);

      currentY = drawSectionHeading(doc, "12. Conclusion", currentY);
      currentY = drawParagraph(doc, report.conclusion, currentY, 210);

      // Formal Sign-Off Block
      const signoffY = 560;
      doc.roundedRect(50, signoffY, contentWidth, 120, 6).fillAndStroke("#f8fafc", "#cbd5e1");

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f766e")
        .text("OFFICIAL REPORT SIGN-OFF & AUTHORIZATION", 65, signoffY + 16);

      doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
        .text("This report has been reviewed and officially archived as part of the post-event records.", 65, signoffY + 34);

      // Signatory line
      doc.moveTo(65, signoffY + 84).lineTo(250, signoffY + 84).stroke("#94a3b8");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1e293b")
        .text(organizer?.name || "Authorized Event Lead", 65, signoffY + 90);
      doc.font("Helvetica").fontSize(7.5).fillColor("#64748b")
        .text(orgName, 65, signoffY + 102);

      // Date line
      doc.moveTo(330, signoffY + 84).lineTo(480, signoffY + 84).stroke("#94a3b8");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1e293b")
        .text(formatDate(new Date()), 330, signoffY + 90);
      doc.font("Helvetica").fontSize(7.5).fillColor("#64748b")
        .text("Date of Document Verification", 330, signoffY + 102);

      drawFooter(doc, 6);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
