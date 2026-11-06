import nodemailer from "nodemailer";
import QRCode from "qrcode";
import EmailLog from "../models/EmailLog.js";
import Registration from "../models/Registration.js";
import Certificate from "../models/Certificate.js";
import User from "../models/User.js";
import { generateTicketPdf } from "./ticketPdfService.js";
import {
  renderRegistrationConfirmationEmail,
  renderTicketEmail,
  renderCertificateEmail,
  renderOrganizerNewRegistrationAlert,
  renderOrganizerCapacityAlert,
  renderTestEmail,
} from "./emailTemplates.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EmailService {
  /**
   * Checks if email credentials (Resend API or SMTP) are configured on the server.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(
      process.env.RESEND_API_KEY ||
      (process.env.SMTP_HOST && process.env.EMAIL_FROM)
    );
  }

  /**
   * Returns sanitized SMTP/HTTP configuration status (never exposing password/secret).
   * @returns {Object}
   */
  getSmtpStatus() {
    if (process.env.RESEND_API_KEY) {
      return {
        configured: true,
        provider: "Resend HTTP API (Port 443 — Cloud Friendly)",
        host: "api.resend.com",
        port: 443,
        secure: true,
        authConfigured: true,
        user: "api",
        emailFrom: process.env.EMAIL_FROM || "onboarding@resend.dev",
        emailFromName: process.env.EMAIL_FROM_NAME || "EVENTRA Notifications",
      };
    }

    return {
      configured: this.isConfigured(),
      provider: "SMTP (Nodemailer)",
      host: process.env.SMTP_HOST || null,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      authConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      user: process.env.SMTP_USER || null,
      emailFrom: process.env.EMAIL_FROM || null,
      emailFromName: process.env.EMAIL_FROM_NAME || "EVENTRA",
    };
  }

  /**
   * Creates or retrieves a nodemailer transport instance with robust timeout settings.
   * @returns {nodemailer.Transporter|null}
   */
  getTransport() {
    if (!this.isConfigured() || process.env.RESEND_API_KEY) return null;

    const rawPass = process.env.SMTP_PASS || "";
    const cleanPass = rawPass.replace(/\s+/g, "");

    const auth =
      process.env.SMTP_USER && rawPass
        ? { user: process.env.SMTP_USER, pass: cleanPass }
        : undefined;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }

  /**
   * Validates recipient email syntax.
   * @param {string} email
   * @returns {boolean}
   */
  validateEmail(email) {
    if (!email || typeof email !== "string") return false;
    return EMAIL_REGEX.test(email.trim().toLowerCase());
  }

  /**
   * Verifies connection to the configured SMTP server or Resend API.
   * @returns {Promise<Object>}
   */
  async verifySmtpConnection() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        ok: false,
        error: "Email provider is not configured. Set RESEND_API_KEY or SMTP credentials in server environment.",
      };
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const resp = await fetch("https://api.resend.com/api-keys", {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        });
        if (resp.ok) {
          return { configured: true, ok: true, provider: "Resend HTTP API (Port 443)" };
        }
        const data = await resp.json().catch(() => ({}));
        return {
          configured: true,
          ok: false,
          error: `Resend authentication failed: ${data.message || resp.statusText}`,
        };
      } catch (err) {
        return { configured: true, ok: false, error: err.message };
      }
    }

    try {
      const transport = this.getTransport();
      if (!transport) throw new Error("Could not initialize SMTP transport.");
      await transport.verify();
      return { configured: true, ok: true, provider: "SMTP (Nodemailer)" };
    } catch (err) {
      console.error("SMTP verification error:", err.message);
      return {
        configured: true,
        ok: false,
        error: `SMTP connection failed: ${err.message}`,
      };
    }
  }

  /**
   * Core mail dispatch method that enforces validation, error logging, duplicate prevention,
   * and dispatches via Resend HTTPS (Port 443) or Nodemailer SMTP.
   */
  async sendMail({
    to,
    recipientName = "",
    subject,
    html,
    text,
    attachments = [],
    eventId,
    registrationId = null,
    organizerId = null,
    emailType,
    metadata = {},
    skipDuplicateCheck = false,
  }) {
    // 1. Validate recipient email syntax
    if (!this.validateEmail(to)) {
      const log = await EmailLog.create({
        eventId,
        registrationId,
        organizerId,
        emailType,
        recipient: String(to || "invalid-email").trim(),
        recipientName,
        subject,
        deliveryStatus: "failed",
        errorMessage: "Invalid recipient email address syntax.",
        metadata,
      });
      return { success: false, error: "Invalid recipient email address syntax.", logId: log._id };
    }

    const cleanTo = to.trim().toLowerCase();

    // 2. Prevent duplicate emails within a cooldown window (60s) for identical type & registration
    if (!skipDuplicateCheck && registrationId && emailType) {
      const recentLog = await EmailLog.findOne({
        registrationId,
        emailType,
        deliveryStatus: "sent",
        sentAt: { $gte: new Date(Date.now() - 60000) },
      });

      if (recentLog) {
        return {
          success: false,
          skipped: true,
          message: "Duplicate email prevented: an identical email was recently sent.",
          logId: recentLog._id,
        };
      }
    }

    // 3. Create a pending EmailLog document
    const log = await EmailLog.create({
      eventId,
      registrationId,
      organizerId,
      emailType,
      recipient: cleanTo,
      recipientName,
      subject,
      deliveryStatus: "pending",
      metadata,
    });

    // 4. Dispatch via Resend HTTP API (Port 443 — Cloud Friendly for Render)
    if (process.env.RESEND_API_KEY) {
      try {
        const fromName = process.env.EMAIL_FROM_NAME || "EVENTRA Notifications";
        const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
        const fromHeader = `${fromName} <${fromEmail}>`;

        const resendAttachments = attachments.map((a) => ({
          filename: a.filename || "document.pdf",
          content: Buffer.isBuffer(a.content)
            ? a.content.toString("base64")
            : typeof a.content === "string"
            ? Buffer.from(a.content).toString("base64")
            : a.content,
        }));

        const resendPayload = {
          from: fromHeader,
          to: [cleanTo],
          subject,
          html,
          text: text || undefined,
        };
        if (resendAttachments.length > 0) {
          resendPayload.attachments = resendAttachments;
        }

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resendPayload),
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          throw new Error(data.message || `Resend error: ${resp.status} ${resp.statusText}`);
        }

        log.deliveryStatus = "sent";
        log.sentAt = new Date();
        log.errorMessage = "";
        await log.save();

        return { success: true, messageId: data.id, logId: log._id };
      } catch (err) {
        console.error(`Resend email delivery failure [${emailType}] to ${cleanTo}:`, err.message);
        log.deliveryStatus = "failed";
        log.errorMessage = err.message || "Resend API delivery error.";
        await log.save();
        return { success: false, error: log.errorMessage, logId: log._id };
      }
    }

    // 5. Fallback: Dispatch via Nodemailer SMTP Transport
    const transport = this.getTransport();
    if (!transport) {
      const errorMsg =
        "Email delivery is not configured on the server. Set RESEND_API_KEY or SMTP credentials in environment.";
      log.deliveryStatus = "failed";
      log.errorMessage = errorMsg;
      await log.save();
      return { success: false, error: errorMsg, logId: log._id };
    }

    try {
      const fromName = process.env.EMAIL_FROM_NAME || "EVENTRA";
      const fromHeader = `"${fromName}" <${process.env.EMAIL_FROM}>`;

      const info = await transport.sendMail({
        from: fromHeader,
        to: cleanTo,
        subject,
        html,
        text,
        attachments,
      });

      log.deliveryStatus = "sent";
      log.sentAt = new Date();
      log.errorMessage = "";
      await log.save();

      return { success: true, messageId: info.messageId, logId: log._id };
    } catch (err) {
      console.error(`SMTP delivery failure [${emailType}] to ${cleanTo}:`, err.message);
      log.deliveryStatus = "failed";
      log.errorMessage = err.message || "Unknown SMTP provider error.";
      await log.save();
      return { success: false, error: log.errorMessage, logId: log._id };
    }
  }

  /**
   * Sends registration confirmation email to an attendee.
   */
  async sendRegistrationConfirmation(event, registration) {
    try {
      const { subject, html, text } = renderRegistrationConfirmationEmail({
        event,
        registration,
        clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
      });

      const result = await this.sendMail({
        to: registration.email,
        recipientName: registration.name,
        subject,
        html,
        text,
        eventId: event._id,
        registrationId: registration._id,
        organizerId: event.organizerId,
        emailType: "registration_confirmation",
      });

      if (result.success) {
        await Registration.findByIdAndUpdate(registration._id, { confirmationEmailedAt: new Date() });
      }

      return result;
    } catch (err) {
      console.error("sendRegistrationConfirmation error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generates a digital ticket PDF with QR code and emails it to the participant.
   */
  async sendTicketEmail(event, registration) {
    try {
      // Generate QR Code data URL for HTML body
      const qrPayload = JSON.stringify({
        regId: registration.registrationId,
        eventId: String(event._id),
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 180, margin: 1 });

      // Generate downloadable PDF ticket attachment
      const pdfBuffer = await generateTicketPdf(event, registration);

      const { subject, html, text } = renderTicketEmail({
        event,
        registration,
        qrDataUrl,
        clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
      });

      const attachments = [
        {
          filename: `eventra-ticket-${registration.registrationId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];

      const result = await this.sendMail({
        to: registration.email,
        recipientName: registration.name,
        subject,
        html,
        text,
        attachments,
        eventId: event._id,
        registrationId: registration._id,
        organizerId: event.organizerId,
        emailType: "ticket_delivery",
      });

      if (result.success) {
        await Registration.findByIdAndUpdate(registration._id, { ticketEmailedAt: new Date() });
      }

      return result;
    } catch (err) {
      console.error("sendTicketEmail error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends certificate of recognition PDF to an attended participant.
   */
  async sendCertificateEmail(event, registration, pdfBuffer) {
    try {
      const { subject, html, text } = renderCertificateEmail({
        event,
        registration,
      });

      const attachments = [
        {
          filename: `eventra-certificate.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];

      const result = await this.sendMail({
        to: registration.email,
        recipientName: registration.name,
        subject,
        html,
        text,
        attachments,
        eventId: event._id,
        registrationId: registration._id,
        organizerId: event.organizerId,
        emailType: "certificate_delivery",
      });

      if (result.success) {
        await Certificate.findOneAndUpdate(
          { eventId: event._id, registrationId: registration._id },
          { lastEmailedAt: new Date() }
        );
      }

      return result;
    } catch (err) {
      console.error("sendCertificateEmail error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends new participant alert to organizer if enabled in preferences.
   */
  async sendOrganizerRegistrationAlert(event, registration, currentCount) {
    try {
      const organizer = await User.findById(event.organizerId).select("email emailNotifications").lean();
      if (!organizer?.email) return { success: false, error: "Organizer email not found" };

      // Check organizer preference (default true)
      if (organizer.emailNotifications?.notifyOnRegistration === false) {
        return { success: true, skipped: true, message: "Organizer disabled registration notifications." };
      }

      const { subject, html, text } = renderOrganizerNewRegistrationAlert({
        event,
        registration,
        currentCount,
        capacity: event.capacity,
      });

      return await this.sendMail({
        to: organizer.email,
        recipientName: "Organizer",
        subject,
        html,
        text,
        eventId: event._id,
        registrationId: registration._id,
        organizerId: organizer._id,
        emailType: "organizer_alert",
        metadata: { alertType: "new_registration", currentCount, capacity: event.capacity },
      });
    } catch (err) {
      console.error("sendOrganizerRegistrationAlert error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends capacity alert to organizer when capacity is reached.
   */
  async sendOrganizerCapacityAlert(event, currentCount) {
    try {
      const organizer = await User.findById(event.organizerId).select("email emailNotifications").lean();
      if (!organizer?.email) return { success: false, error: "Organizer email not found" };

      if (organizer.emailNotifications?.notifyOnCapacity === false) {
        return { success: true, skipped: true, message: "Organizer disabled capacity notifications." };
      }

      const { subject, html, text } = renderOrganizerCapacityAlert({
        event,
        currentCount,
        capacity: event.capacity,
      });

      return await this.sendMail({
        to: organizer.email,
        recipientName: "Organizer",
        subject,
        html,
        text,
        eventId: event._id,
        organizerId: organizer._id,
        emailType: "organizer_alert",
        metadata: { alertType: "capacity_reached", currentCount, capacity: event.capacity },
      });
    } catch (err) {
      console.error("sendOrganizerCapacityAlert error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Retries delivering a failed email log record.
   */
  async retryEmail(emailLogId) {
    const log = await EmailLog.findById(emailLogId);
    if (!log) throw new Error("Email log record not found.");

    if (!this.validateEmail(log.recipient)) {
      log.deliveryStatus = "failed";
      log.errorMessage = "Cannot retry: invalid recipient email address syntax.";
      await log.save();
      return { success: false, error: log.errorMessage, log };
    }

    const transport = this.getTransport();
    if (!transport) {
      log.deliveryStatus = "failed";
      log.errorMessage = "SMTP server is not configured.";
      await log.save();
      return { success: false, error: log.errorMessage, log };
    }

    try {
      const fromName = process.env.EMAIL_FROM_NAME || "EVENTRA";
      const fromHeader = `"${fromName}" <${process.env.EMAIL_FROM}>`;

      await transport.sendMail({
        from: fromHeader,
        to: log.recipient,
        subject: log.subject,
        text: `EVENTRA Notification: ${log.subject}`,
      });

      log.deliveryStatus = "sent";
      log.sentAt = new Date();
      log.errorMessage = "";
      await log.save();

      return { success: true, log };
    } catch (err) {
      log.deliveryStatus = "failed";
      log.errorMessage = `Retry failed: ${err.message}`;
      await log.save();
      return { success: false, error: log.errorMessage, log };
    }
  }
}

export const emailService = new EmailService();
export default emailService;

