import PDFDocument from "pdfkit";

/**
 * Generates an executive vector PDF invoice using PDFKit.
 * Returns a Buffer containing the compiled PDF binary.
 */
export async function generateInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 45,
        info: {
          Title: `EVENTRA Invoice - ${invoice.invoiceNumber}`,
          Author: "EVENTRA Billing Platform",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const primaryColor = "#6366F1";
      const darkColor = "#0F172A";
      const textMuted = "#64748B";
      const cardBg = "#F8FAFC";

      // Header Banner
      doc.rect(45, 45, 505, 5).fill(primaryColor);

      // Logo and Title
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text("EVENTRA", 45, 65);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(textMuted)
        .text("Smart Event Lifecycle & Subscription Operations", 45, 93);

      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text("INVOICE", 400, 65, { align: "right" });

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(invoice.invoiceNumber, 400, 90, { align: "right" });

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(textMuted)
        .text(`Date: ${new Date(invoice.issuedAt || Date.now()).toLocaleDateString()}`, 400, 105, { align: "right" })
        .text(`Status: ${(invoice.status || "PAID").toUpperCase()}`, 400, 120, { align: "right" });

      doc.moveDown(2);

      // Divider Line
      doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(45, 145).lineTo(550, 145).stroke();

      // Billed To & Platform Info
      const startY = 160;

      // Platform Details (Left)
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(textMuted)
        .text("ISSUED BY", 45, startY);

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(invoice.platformDetails?.name || "EVENTRA Platform Inc.", 45, startY + 15);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(textMuted)
        .text(invoice.platformDetails?.address || "Mangalore, Karnataka, India", 45, startY + 30)
        .text(`Email: ${invoice.platformDetails?.email || "billing@eventra.com"}`, 45, startY + 45)
        .text(`Tax/GSTIN: ${invoice.platformDetails?.taxId || "GSTIN29AAACE1234F1Z5"}`, 45, startY + 60);

      // Organizer Details (Right)
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(textMuted)
        .text("BILLED TO", 320, startY);

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(invoice.organizerBilling?.name || "Organizer", 320, startY + 15);

      if (invoice.organizerBilling?.organization) {
        doc.fontSize(9).font("Helvetica").fillColor(textMuted).text(invoice.organizerBilling.organization, 320, startY + 30);
      }

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(textMuted)
        .text(`Email: ${invoice.organizerBilling?.email || "N/A"}`, 320, startY + 45)
        .text(`Phone: ${invoice.organizerBilling?.phone || "N/A"}`, 320, startY + 60);

      // Line Items Table
      const tableY = startY + 95;

      // Table Header
      doc.rect(45, tableY, 505, 24).fill(cardBg);

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text("DESCRIPTION", 60, tableY + 7)
        .text("CYCLE", 280, tableY + 7)
        .text("RATE", 380, tableY + 7)
        .text("AMOUNT", 480, tableY + 7, { align: "right" });

      // Table Row
      const rowY = tableY + 32;
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(`EVENTRA ${invoice.planName || "Pro"} Subscription Plan`, 60, rowY);

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(textMuted)
        .text("Full platform organizer features, QR verification, AI poster studio", 60, rowY + 14);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(darkColor)
        .text((invoice.billingCycle || "Monthly").toUpperCase(), 280, rowY)
        .text(`₹${Number(invoice.subtotal).toLocaleString()}`, 380, rowY)
        .text(`₹${Number(invoice.subtotal).toLocaleString()}`, 480, rowY, { align: "right" });

      // Table Bottom Border
      doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(45, rowY + 35).lineTo(550, rowY + 35).stroke();

      // Calculation Totals Block (Right aligned)
      const totalBlockY = rowY + 50;

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(textMuted)
        .text("Subtotal:", 340, totalBlockY)
        .text(`₹${Number(invoice.subtotal).toLocaleString()}`, 480, totalBlockY, { align: "right" });

      if (invoice.taxRate > 0) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(textMuted)
          .text(`GST / Tax (${invoice.taxRate}%):`, 340, totalBlockY + 18)
          .text(`₹${Number(invoice.taxAmount).toLocaleString()}`, 480, totalBlockY + 18, { align: "right" });
      }

      // Final Total
      doc.rect(330, totalBlockY + 38, 220, 30).fill(cardBg);

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text("Total Paid:", 345, totalBlockY + 47)
        .text(`₹${Number(invoice.total).toLocaleString()} ${invoice.currency || "INR"}`, 480, totalBlockY + 47, {
          align: "right",
        });

      // Payment Confirmation Notice
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#16A34A")
        .text("✓ Payment Confirmed via Online Gateway", 45, totalBlockY + 47);

      // Terms & Footer
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(textMuted)
        .text(
          "Thank you for choosing EVENTRA. This is a computer-generated tax invoice and requires no physical signature.",
          45,
          720,
          { align: "center", width: 505 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

