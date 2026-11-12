import crypto from "node:crypto";
import nodemailer from "nodemailer";
import Registration from "../models/Registration.js";
import EmailLog from "../models/EmailLog.js";
import Event from "../models/Event.js";
import { formatParticipantName } from "./participantName.js";

/**
 * Creates email transport using configured SMTP credentials.
 */
export function getEmailTransport() {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM) return null;
  const auth =
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth,
  });
}

/**
 * Generates an unguessable token and SHA-256 hash.
 */
export function generateFeedbackToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

/**
 * Builds the professional responsive HTML email template for feedback requests.
 */
export function buildFeedbackEmailHtml({ eventTitle, participantName, feedbackUrl, requireCertificateFeedback }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your Feedback for ${eventTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0f766e; padding: 32px 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 28px; font-size: 15px; line-height: 1.6; color: #334155; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background-color: #0f766e; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; }
    .btn:hover { background-color: #115e59; }
    .callout { background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #134e4a; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EVENTRA</h1>
      <p>Post-Event Feedback & Experience Assessment</p>
    </div>
    <div class="content">
      <p>Hello <strong>${participantName}</strong>,</p>
      <p>Thank you for participating in <strong>${eventTitle}</strong>. We hope you found the sessions valuable and engaging.</p>
      <p>Your feedback is vital in helping us evaluate event outcomes and continuously elevate the standard of future events.</p>
      
      ${
        requireCertificateFeedback
          ? `<div class="callout">
               <strong>Important Notice:</strong> As configured by the event organizer, submitting your feedback will automatically unlock your official <strong>Certificate of Participation</strong>.
             </div>`
          : ""
      }

      <div class="btn-container">
        <a href="${feedbackUrl}" class="btn" target="_blank">Share Your Feedback →</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${feedbackUrl}" style="color: #0f766e; word-break: break-all;">${feedbackUrl}</a></p>
    </div>
    <div class="footer">
      <p>Sent via EVENTRA Smart Event Management Platform.</p>
      <p>This is an automated message intended solely for registered attendees of ${eventTitle}.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends feedback emails to all confirmed, non-cancelled registrations for an event.
 * Idempotent: Skips registrations that already have an EmailLog with deliveryStatus: "sent".
 *
 * @param {string|ObjectId} eventId
 * @returns {Promise<Object>} Summary { totalEligible, sent, failed, skipped }
 */
export async function sendFeedbackEmailsForEvent(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  const registrations = await Registration.find({
    eventId: event._id,
    status: "confirmed",
  });

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const transport = getEmailTransport();

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const reg of registrations) {
    // Check if email was already successfully sent
    const existingLog = await EmailLog.findOne({
      eventId: event._id,
      registrationId: reg._id,
      emailType: "feedback_request",
      deliveryStatus: "sent",
    });

    if (existingLog) {
      skippedCount++;
      continue;
    }

    // Ensure registration has a feedback token
    let token = reg.feedbackToken;
    if (!token) {
      const generated = generateFeedbackToken();
      token = generated.token;
      reg.feedbackToken = token;
      reg.feedbackTokenHash = generated.hash;
      await reg.save();
    }

    const feedbackUrl = `${clientUrl}/events/${event._id}/feedback?token=${token}`;
    const html = buildFeedbackEmailHtml({
      eventTitle: event.title,
      participantName: formatParticipantName(reg.name, "Participant"),
      feedbackUrl,
      requireCertificateFeedback: event.requireFeedbackForCertificate === true,
    });

    if (!transport) {
      await EmailLog.findOneAndUpdate(
        { eventId: event._id, registrationId: reg._id, emailType: "feedback_request" },
        {
          $set: {
            recipient: reg.email,
            deliveryStatus: "failed",
            errorMessage: "SMTP credentials not configured on the server.",
          },
        },
        { upsert: true }
      );
      failedCount++;
      continue;
    }

    try {
      await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to: reg.email,
        subject: `Feedback Request: ${event.title}`,
        html,
        text: `Hello ${reg.name},\n\nPlease share your feedback for ${event.title} by visiting:\n${feedbackUrl}`,
      });

      await EmailLog.findOneAndUpdate(
        { eventId: event._id, registrationId: reg._id, emailType: "feedback_request" },
        {
          $set: {
            recipient: reg.email,
            deliveryStatus: "sent",
            sentAt: new Date(),
            errorMessage: "",
          },
        },
        { upsert: true }
      );
      sentCount++;
    } catch (sendErr) {
      console.error(`Feedback email failed for ${reg.email}:`, sendErr.message);
      await EmailLog.findOneAndUpdate(
        { eventId: event._id, registrationId: reg._id, emailType: "feedback_request" },
        {
          $set: {
            recipient: reg.email,
            deliveryStatus: "failed",
            errorMessage: sendErr.message || "Email delivery failed",
          },
        },
        { upsert: true }
      );
      failedCount++;
    }
  }

  return {
    totalEligible: registrations.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
  };
}

