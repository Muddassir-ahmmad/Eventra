import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { formatParticipantName } from "../utils/participantName.js";
import { formatEventDateRangeLabel, getEventDaysNormalized } from "../utils/multiDay.js";

function formatTicketDate(date) {
  if (!date) return "Event Date";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

/**
 * Generates an official digital admission pass ticket PDF.
 *
 * @param {Object} event Event document
 * @param {Object} registration Registration document
 * @returns {Promise<Buffer>}
 */
export async function generateTicketPdf(event, registration) {
  return new Promise(async (resolve, reject) => {
    try {
      const attendeeName = formatParticipantName(registration.name, "Attendee");
      const qrPayload = JSON.stringify({
        regId: registration.registrationId,
        eventId: String(event._id),
        name: attendeeName,
      });

      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 150,
      });

      // Ticket size: 600 x 280 pt (Landscape ticket format)
      const doc = new PDFDocument({
        size: [620, 300],
        margin: 0,
        compress: true,
        info: {
          Title: `Digital Ticket - ${event.title}`,
          Author: "EVENTRA Ticketing",
          Subject: `Admission Pass for ${attendeeName}`,
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const width = doc.page.width;
      const height = doc.page.height;

      // Outer background
      doc.rect(0, 0, width, height).fill("#f8fafc");

      // Ticket main container with card border
      doc.roundedRect(16, 16, width - 32, height - 32, 10).fillAndStroke("#ffffff", "#e2e8f0");

      // Left Brand Sidebar Ribbon
      doc.roundedRect(16, 16, 16, height - 32, 10).fill("#0f766e");
      doc.rect(26, 16, 6, height - 32).fill("#0f766e");

      // Header Kicker
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f766e")
        .text("EVENTRA  ·  OFFICIAL ADMISSION TICKET", 42, 30, { characterSpacing: 1.5 });

      // Event Title
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a")
        .text(event.title || "Event Name", 42, 46, { width: 380, ellipsis: true, lineBreak: false });

      // Event Metadata Grid
      const isMultiDay = event.eventDurationType === "multi_day";
      const daysList = isMultiDay ? getEventDaysNormalized(event) : [];
      const dateStr = isMultiDay ? formatEventDateRangeLabel(event) : formatTicketDate(event.date);
      const timeStr = isMultiDay
        ? `Valid All ${daysList.length || 1} Days (${event.startTime || "Multi-Day Pass"}${event.endTime ? ` - ${event.endTime}` : ""})`
        : event.startTime
          ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}`
          : "Standard Entry Timing";
      const cleanLocation = event.location && !/^https?:\/\//i.test(event.location.trim()) ? event.location.trim() : "";
      const venueStr = [event.venue, cleanLocation].filter(Boolean).join(", ") || "Designated Venue";

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text("DATE & TIME", 42, 80);
      doc.font("Helvetica").fontSize(9.5).fillColor("#1e293b").text(`${dateStr}  ·  ${timeStr}`, 42, 92, { width: 380 });

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text("VENUE & LOCATION", 42, 116);
      doc.font("Helvetica").fontSize(9.5).fillColor("#1e293b").text(venueStr, 42, 128, { width: 380, ellipsis: true });

      // Participant Details Card
      doc.roundedRect(42, 154, 380, 84, 6).fillAndStroke("#f8fafc", "#e2e8f0");

      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b").text("ATTENDEE NAME", 54, 164);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text(attendeeName, 54, 175, { width: 230, ellipsis: true });

      const deptDetails = [registration.department, registration.college].filter(Boolean).join(" · ");
      if (deptDetails) {
        doc.font("Helvetica").fontSize(8).fillColor("#64748b").text(deptDetails, 54, 194, { width: 230, ellipsis: true });
      }

      // Registration ID Pill
      doc.roundedRect(290, 164, 122, 28, 4).fill("#f0fdfa");
      doc.rect(290, 164, 122, 28).lineWidth(1).strokeColor("#99f6e4").stroke();
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f766e").text("REGISTRATION ID", 298, 170);
      doc.font("Courier-Bold").fontSize(10).fillColor("#0f766e").text(registration.registrationId, 298, 180);

      // Status Indicator
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#15803d").text("● STATUS: CONFIRMED", 298, 202);
      const selectedSessionsCount = Array.isArray(registration.selectedSessions) ? registration.selectedSessions.length : 0;
      if (selectedSessionsCount > 0) {
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0284c7").text(`● ${selectedSessionsCount} SESSIONS ENROLLED`, 298, 214);
      }

      // Security / Gate Instructions
      doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8")
        .text("Please present this pass or the QR code at admission counters. Non-transferable.", 42, 252);

      // Dotted Ticket Perforation Divider Line
      doc.save();
      doc.lineWidth(1).strokeColor("#cbd5e1").dash(4, { space: 4 });
      doc.moveTo(444, 16).lineTo(444, height - 16).stroke();
      doc.restore();

      // Right Section: QR Code & Verification
      doc.roundedRect(460, 40, 130, 130, 6).fillAndStroke("#ffffff", "#e2e8f0");
      doc.image(qrBuffer, 465, 45, { width: 120, height: 120 });

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a")
        .text("SCAN FOR ENTRY", 460, 182, { width: 130, align: "center" });

      doc.font("Courier-Bold").fontSize(9).fillColor("#64748b")
        .text(registration.registrationId, 460, 196, { width: 130, align: "center" });

      doc.font("Helvetica").fontSize(7).fillColor("#94a3b8")
        .text("QR Attendance Check-in", 460, 212, { width: 130, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

