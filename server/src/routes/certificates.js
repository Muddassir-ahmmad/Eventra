import { randomUUID } from "node:crypto";
import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";
import Certificate from "../models/Certificate.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "eventra-assets";
const certificateBucket = process.env.SUPABASE_CERTIFICATE_BUCKET || "eventra-certificates";
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (["image/png", "image/jpeg"].includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("Signature must be a PNG or JPEG image."));
  },
});

function storageClient() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function emailTransport() {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM) return null;
  const auth = process.env.SMTP_USER && process.env.SMTP_PASS
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth,
  });
}

async function findOwnedEvent(eventId, userId) {
  return Event.findOne({ _id: eventId, organizerId: userId });
}

function displayDate(value) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function certificateDescription(event, registration) {
  return (event.certificateDescription || "This certificate is presented to {name} for participating in {event}.")
    .replaceAll("{name}", registration.name)
    .replaceAll("{event}", event.title)
    .replaceAll("{date}", displayDate(event.date));
}

async function signatureBuffer(client, imagePath) {
  if (!client || !imagePath) return null;
  const { data, error } = await client.storage.from(bucket).download(imagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function ensureBucket(client, bucketName, isPublic, options = {}) {
  const { error } = await client.storage.getBucket(bucketName);
  if (!error) return;
  const { error: createError } = await client.storage.createBucket(bucketName, {
    public: isPublic,
    fileSizeLimit: "10MB",
    ...options,
  });
  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw createError;
  }
}

async function storedCertificatePdf(certificate) {
  const client = storageClient();
  if (!client || !certificate.storagePath) return null;
  const { data, error } = await client.storage.from(certificateBucket).download(certificate.storagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function renderCertificate(event, registration, organizer) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const width = doc.page.width;
  const height = doc.page.height;
  const palettes = {
    classic: { paper: "#fbf8ef", ink: "#233549", accent: "#a47b36", edge: "#ded0ad" },
    modern: { paper: "#f6f7f5", ink: "#172b2a", accent: "#267467", edge: "#b9d1c9" },
    academic: { paper: "#f4f0e5", ink: "#213b31", accent: "#9b2f37", edge: "#cbbd9e" },
  };
  const template = palettes[event.certificateTemplate] ? event.certificateTemplate : "classic";
  const colors = palettes[template];

  doc.rect(0, 0, width, height).fill(colors.paper);
  doc.lineWidth(template === "academic" ? 5 : 2).strokeColor(colors.accent).rect(22, 22, width - 44, height - 44).stroke();
  doc.lineWidth(1).strokeColor(colors.edge).rect(34, 34, width - 68, height - 68).stroke();

  if (template === "modern") {
    doc.rect(36, 36, 12, height - 72).fill(colors.accent);
    doc.rect(width - 48, 36, 12, height - 72).fill(colors.accent);
  } else if (template === "academic") {
    doc.circle(width / 2, 84, 23).lineWidth(2).strokeColor(colors.accent).stroke();
    doc.font("Times-Bold").fontSize(13).fillColor(colors.accent).text("E", width / 2 - 5, 76, { width: 10, align: "center" });
  }

  const titleFont = template === "modern" ? "Helvetica-Bold" : "Times-Bold";
  doc.fillColor(colors.accent).font("Helvetica-Bold").fontSize(10).text("EVENTRA  /  RECOGNITION", 55, template === "academic" ? 119 : 76, { width: width - 110, align: "center", characterSpacing: 2 });
  doc.fillColor(colors.ink).font(titleFont).fontSize(31).text(event.certificateTitle || "Certificate of Participation", 72, 145, { width: width - 144, align: "center" });
  doc.fillColor(colors.ink).font("Times-Italic").fontSize(16).text("This certificate is proudly presented to", 80, 207, { width: width - 160, align: "center" });
  doc.fillColor(colors.accent).font("Times-Bold");
  const nameFontSize = Math.min(35, Math.max(19, 35 * (width - 160) / doc.widthOfString(registration.name || "Participant")));
  doc.fontSize(nameFontSize).text(registration.name, 70, 246, { width: width - 140, align: "center" });
  doc.moveTo(width * 0.25, 293).lineTo(width * 0.75, 293).lineWidth(1).strokeColor(colors.edge).stroke();
  doc.fillColor(colors.ink).font("Times-Roman").fontSize(15).text(certificateDescription(event, registration), 110, 311, { width: width - 220, align: "center", lineGap: 4, height: 48 });
  doc.fillColor(colors.ink).font("Helvetica-Bold").fontSize(17).text(event.title, 90, 372, { width: width - 180, align: "center" });
  doc.fillColor(colors.ink).font("Helvetica").fontSize(10).text(displayDate(event.date), 90, 400, { width: width - 180, align: "center" });

  const signatures = (event.signatures || []).filter((item) => item.name || item.imagePath).slice(0, 4);
  const client = storageClient();
  const sectionWidth = (width - 160) / Math.max(signatures.length, 1);
  for (let index = 0; index < signatures.length; index += 1) {
    const signature = signatures[index];
    const center = 60 + sectionWidth * (index + 0.5);
    const image = await signatureBuffer(client, signature.imagePath);
    if (image) {
      try {
        doc.image(image, center - 44, 423, { fit: [88, 34], align: "center", valign: "center" });
      } catch {
        // An unsupported or damaged stored image should not prevent certificate delivery.
      }
    }
    doc.moveTo(center - 62, 461).lineTo(center + 62, 461).lineWidth(0.8).strokeColor(colors.edge).stroke();
    doc.fillColor(colors.ink).font("Helvetica-Bold").fontSize(9).text(signature.name || "Authorized signatory", center - 70, 467, { width: 140, align: "center" });
    doc.fillColor(colors.ink).font("Helvetica").fontSize(8).text(signature.role || "", center - 70, 480, { width: 140, align: "center" });
  }

  doc.fillColor(colors.ink).font("Helvetica").fontSize(9).text(organizer.organization || organizer.name || "Event Organizer", 90, 525, { width: width - 180, align: "center" });
  doc.end();
  return finished;
}

function withUpload(req, res, next) {
  imageUpload.single("signature")(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.message });
    next();
  });
}

router.get("/event/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const [registrations, certificates, organizer] = await Promise.all([
      Registration.find({ eventId: event._id, status: "confirmed" }).sort({ name: 1 }),
      Certificate.find({ eventId: event._id }).lean(),
      User.findById(event.organizerId).select("name email organization").lean(),
    ]);
    const issuedByRegistration = new Map(certificates.map((item) => [String(item.registrationId), item]));

    res.json({
      event,
      organizer: { name: organizer?.name || "", organization: organizer?.organization || "" },
      participants: registrations.map((registration) => ({
        _id: registration._id,
        name: registration.name,
        email: registration.email,
        checkedIn: registration.checkedIn === true,
        checkedInAt: registration.checkedInAt,
        certificate: issuedByRegistration.get(String(registration._id)) || null,
      })),
      storageConfigured: Boolean(storageClient()),
      emailConfigured: Boolean(emailTransport()),
      aiConfigured: Boolean(process.env.AI_API_KEY),
    });
  } catch (error) {
    console.error("Load certificates error:", error);
    res.status(500).json({ message: "Could not load certificates" });
  }
});

router.post("/event/:eventId/signatures", requireAuth, withUpload, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!req.file) return res.status(400).json({ message: "Choose a PNG or JPEG signature image." });

    const client = storageClient();
    if (!client) return res.status(503).json({ message: "Signature storage is not configured on the server." });

    await ensureBucket(client, bucket, true, { allowedMimeTypes: ["image/png", "image/jpeg"] });

    const extension = req.file.mimetype === "image/png" ? "png" : "jpg";
    const imagePath = `${event._id}/signatures/${randomUUID()}.${extension}`;
    const { error } = await client.storage.from(bucket).upload(imagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;

    const { data } = client.storage.from(bucket).getPublicUrl(imagePath);
    res.status(201).json({ imagePath, imageUrl: data.publicUrl });
  } catch (error) {
    console.error("Signature upload error:", error);
    res.status(500).json({ message: "Could not upload signature image" });
  }
});

router.post("/event/:eventId/generate", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.certificateEnabled) return res.status(409).json({ message: "Enable certificates for this event before generating them." });

    const ids = Array.isArray(req.body.registrationIds) ? req.body.registrationIds.map(String) : [];
    if (!ids.length) return res.status(400).json({ message: "Select at least one participant." });

    const registrations = await Registration.find({
      _id: { $in: ids },
      eventId: event._id,
      status: "confirmed",
      checkedIn: true,
    });
    const eligibleIds = new Set(registrations.map((item) => String(item._id)));
    const ineligible = ids.filter((id) => !eligibleIds.has(id));
    const issued = [];
    const alreadyIssued = [];
    const client = storageClient();
    if (!client) return res.status(503).json({ message: "Supabase Storage is not configured on the server." });
    const organizer = await User.findById(event.organizerId).select("name organization").lean();
    await ensureBucket(client, certificateBucket, false, { allowedMimeTypes: ["application/pdf"] });

    for (const registration of registrations) {
      const existing = await Certificate.findOne({ eventId: event._id, registrationId: registration._id });
      if (existing && req.body.regenerate !== true) {
        alreadyIssued.push({ registrationId: registration._id, name: registration.name });
        continue;
      }
      const generation = existing ? existing.generation + 1 : 1;
      const pdf = await renderCertificate(event, registration, organizer || {});
      const storagePath = `${event._id}/${registration._id}/v${generation}.pdf`;
      const { error: uploadError } = await client.storage.from(certificateBucket).upload(storagePath, pdf, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) throw uploadError;

      await Certificate.findOneAndUpdate(
        { eventId: event._id, registrationId: registration._id },
        {
          $set: {
            issuedTo: registration.name,
            email: registration.email,
            generatedAt: new Date(),
            generation,
            storagePath,
          },
          $setOnInsert: { eventId: event._id, registrationId: registration._id },
        },
        { upsert: true, new: true, runValidators: true }
      );
      issued.push({ registrationId: registration._id, name: registration.name });
    }

    res.json({ issued, alreadyIssued, ineligible });
  } catch (error) {
    console.error("Generate certificates error:", error);
    res.status(500).json({ message: "Could not generate certificates" });
  }
});

router.get("/event/:eventId/:registrationId/download", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const [certificate, registration] = await Promise.all([
      Certificate.findOne({ eventId: event._id, registrationId: req.params.registrationId }),
      Registration.findOne({ _id: req.params.registrationId, eventId: event._id, status: "confirmed", checkedIn: true }),
    ]);
    if (!certificate || !registration) return res.status(404).json({ message: "Eligible generated certificate not found" });
    const pdf = await storedCertificatePdf(certificate);
    if (!pdf) return res.status(503).json({ message: "Stored certificate PDF is unavailable. Check Supabase Storage configuration." });
    const filename = `eventra-certificate-${String(registration._id)}.pdf`;
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` });
    res.send(pdf);
  } catch (error) {
    console.error("Download certificate error:", error);
    res.status(500).json({ message: "Could not create certificate PDF" });
  }
});

router.post("/event/:eventId/:registrationId/email", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const transport = emailTransport();
    if (!transport) return res.status(503).json({ message: "Email is not configured. Set SMTP_HOST and EMAIL_FROM on the server." });

    const [certificate, registration] = await Promise.all([
      Certificate.findOne({ eventId: event._id, registrationId: req.params.registrationId }),
      Registration.findOne({ _id: req.params.registrationId, eventId: event._id, status: "confirmed", checkedIn: true }),
    ]);
    if (!certificate || !registration) return res.status(404).json({ message: "Eligible generated certificate not found" });
    const pdf = await storedCertificatePdf(certificate);
    if (!pdf) return res.status(503).json({ message: "Stored certificate PDF is unavailable. Check Supabase Storage configuration." });
    await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: registration.email,
      subject: `${event.certificateTitle || "Certificate of Participation"} - ${event.title}`,
      text: `Hello ${registration.name},\n\nYour certificate for ${event.title} is attached.`,
      attachments: [{ filename: "eventra-certificate.pdf", content: pdf, contentType: "application/pdf" }],
    });
    certificate.lastEmailedAt = new Date();
    await certificate.save();
    res.json({ message: `Certificate emailed to ${registration.email}`, lastEmailedAt: certificate.lastEmailedAt });
  } catch (error) {
    console.error("Email certificate error:", error);
    res.status(502).json({ message: "Could not send certificate email. Check the SMTP provider configuration." });
  }
});

router.post("/event/:eventId/email/test", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const transport = emailTransport();
    if (!transport) return res.status(503).json({ message: "Email is not configured. Set SMTP_HOST and EMAIL_FROM on the server." });
    const organizer = await User.findById(event.organizerId).select("email").lean();
    if (!organizer?.email) return res.status(400).json({ message: "Organizer account email is unavailable." });
    await transport.verify();
    await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: organizer.email,
      subject: "EVENTRA certificate email test",
      text: `Email delivery is configured for ${event.title}.`,
    });
    res.json({ message: `Test email sent to ${organizer.email}` });
  } catch (error) {
    console.error("Email configuration test failed:", error);
    res.status(502).json({ message: "Email configuration test failed. Check the server SMTP settings." });
  }
});

router.post("/event/:eventId/ai-suggestion", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!process.env.AI_API_KEY) return res.json({ configured: false });

    const response = await fetch(process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Suggest a professional event certificate. Return JSON with template (classic, modern, or academic), title, and description. Use {name}, {event}, and {date} as participant/event/date placeholders." },
          { role: "user", content: JSON.stringify({
            title: event.title,
            eventType: String(req.body.eventType || event.eventType || "").slice(0, 80),
            description: event.description,
          }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload = await response.json();
    const suggestion = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    const allowedTemplates = ["classic", "modern", "academic"];
    res.json({
      configured: true,
      suggestion: {
        template: allowedTemplates.includes(suggestion.template) ? suggestion.template : "classic",
        title: String(suggestion.title || "Certificate of Participation").slice(0, 100),
        description: String(suggestion.description || "This certificate is presented to {name} for participating in {event}.").slice(0, 500),
      },
    });
  } catch (error) {
    console.error("Certificate AI suggestion error:", error);
    res.status(502).json({ message: "Could not retrieve a certificate suggestion from the configured AI provider." });
  }
});

export default router;