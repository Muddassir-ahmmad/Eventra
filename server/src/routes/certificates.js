import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import Certificate from "../models/Certificate.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import emailService from "../services/emailService.js";
import {
  CERTIFICATE_TEMPLATES,
  DEFAULT_CERTIFICATE_DESCRIPTION,
  DEFAULT_CERTIFICATE_TITLE,
  isAttendedRegistration,
  normalizeCertificateSettings,
  resolveCertificateDescription,
} from "../utils/certificateDesign.js";

const router = express.Router();
const uploadRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
const maxImageSize = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSize },
  fileFilter: (_req, file, callback) => {
    const validMimes = ["image/png", "image/jpeg", "image/jpg", "image/pjpeg"];
    const validExts = /\.(png|jpe?g)$/i;
    if (validMimes.includes(file.mimetype) && (validExts.test(file.originalname) || !file.originalname.includes("."))) {
      callback(null, true);
      return;
    }
    callback(new Error("Choose a PNG or JPEG image."));
  },
});

function isValidEventId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

async function findOwnedEvent(eventId, userId) {
  if (!isValidEventId(eventId)) return null;
  return Event.findOne({ _id: eventId, organizerId: userId });
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(value))
    : "Event date";
}

function imageUrlForRequest(req, imagePath) {
  return `${req.protocol}://${req.get("host")}${imagePath}`;
}

function cloudinaryConfiguration() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

function cloudinarySignature(params, apiSecret) {
  const content = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${content}${apiSecret}`).digest("hex");
}

async function saveImage(req, eventId, file) {
  if (process.env.NODE_ENV === "production") {
    const config = cloudinaryConfiguration();
    if (!config) {
      const error = new Error("Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to upload images in production.");
      error.status = 503;
      throw error;
    }

    const folder = `eventra/certificates/${eventId}`;
    const publicId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder, public_id: publicId, timestamp };
    const form = new FormData();
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    form.append("api_key", config.apiKey);
    form.append("folder", folder);
    form.append("public_id", publicId);
    form.append("timestamp", String(timestamp));
    form.append("signature", cloudinarySignature(params, config.apiSecret));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || !result.secure_url || !result.public_id) {
      console.error("Cloudinary image upload failed:", result.error?.message || response.status);
      const error = new Error("Could not save the image to Cloudinary.");
      error.status = 502;
      throw error;
    }
    return { imageUrl: result.secure_url, imagePath: result.public_id };
  }

  const relativeDirectory = path.join("certificates", String(eventId));
  const destination = path.join(uploadRoot, relativeDirectory);
  await fs.mkdir(destination, { recursive: true });
  const extension = file.mimetype === "image/png" ? ".png" : ".jpg";
  const filename = `${randomUUID()}${extension}`;
  await fs.writeFile(path.join(destination, filename), file.buffer, { flag: "wx" });
  const imagePath = `/uploads/${relativeDirectory.replaceAll(path.sep, "/")}/${filename}`;
  return { imageUrl: imageUrlForRequest(req, imagePath), imagePath };
}

async function deleteImage(imagePath, eventId) {
  if (!imagePath) return;
  const normalizedEventId = String(eventId);
  if (process.env.NODE_ENV === "production") {
    const config = cloudinaryConfiguration();
    if (!config) return;
    const prefix = `eventra/certificates/${normalizedEventId}/`;
    if (!imagePath.startsWith(prefix)) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const params = { public_id: imagePath, timestamp };
    const form = new FormData();
    form.append("api_key", config.apiKey);
    form.append("public_id", imagePath);
    form.append("timestamp", String(timestamp));
    form.append("signature", cloudinarySignature(params, config.apiSecret));
    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Cloudinary could not remove the image.");
    return;
  }

  const prefix = `/uploads/certificates/${normalizedEventId}/`;
  if (!imagePath.startsWith(prefix)) return;
  const filename = path.basename(imagePath);
  if (!/^[\da-f-]+\.(png|jpe?g)$/i.test(filename)) return;
  await fs.rm(path.join(uploadRoot, "certificates", normalizedEventId, filename), { force: true });
}

function localImagePath(imagePath) {
  if (!imagePath?.startsWith("/uploads/certificates/")) return null;
  const requestedPath = path.resolve(uploadRoot, `.${imagePath.slice("/uploads".length)}`);
  if (!requestedPath.startsWith(`${uploadRoot}${path.sep}`)) return null;
  return requestedPath;
}

async function loadImage(imagePath, imageUrl) {
  const localPath = localImagePath(imagePath);
  if (localPath) {
    try {
      return await fs.readFile(localPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return null;
    }
  }
  if (!imageUrl || !/^https:\/\/res\.cloudinary\.com\//i.test(imageUrl)) return null;
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.length <= maxImageSize ? bytes : null;
}

function fitFontSize(doc, text, font, maxWidth, maximum, minimum = 10) {
  let size = maximum;
  doc.font(font);
  while (size > minimum && doc.widthOfString(text, { size }) > maxWidth) size -= 1;
  return size;
}

function renderCertificate(event, registration, organization, images) {
  return new Promise((resolve, reject) => {
    import("pdfkit").then(({ default: PDFDocument }) => {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 0,
        compress: true,
        info: { Title: `${event.certificateTitle || DEFAULT_CERTIFICATE_TITLE} - ${event.title}` },
      });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const width = doc.page.width;
      const height = doc.page.height;
      const themes = {
        classic: {
          paper: "#fbf8ef",
          ink: "#233549",
          accent: "#a47b36",
          edge: "#ded0ad",
          font: "Times-Roman",
          titleFont: "Times-Bold",
          layout: "center",
        },
        modern: {
          paper: "#f4f7f5",
          ink: "#173a35",
          accent: "#267467",
          edge: "#bad2c9",
          font: "Helvetica",
          titleFont: "Helvetica-Bold",
          layout: "left",
        },
        academic: {
          paper: "#f4f0e5",
          ink: "#283b31",
          accent: "#9b343b",
          edge: "#cbbd9e",
          font: "Times-Roman",
          titleFont: "Times-Bold",
          layout: "academic",
        },
      };
      const style = themes[event.certificateTemplate] || themes.classic;
      const left = style.layout === "left" ? 114 : 82;
      const contentWidth = width - left - 82;
      const align = style.layout === "left" ? "left" : "center";
      const title = event.certificateTitle || DEFAULT_CERTIFICATE_TITLE;
      const eventTitle = event.title || "Event";
      const date = formatDate(event.date);
      const description = resolveCertificateDescription(
        event.certificateDescription,
        registration.name,
        eventTitle,
        date
      );
      const visibleOrganization = event.certificateShowOrganization ? organization : "";

      doc.rect(0, 0, width, height).fill(style.paper);
      if (style.layout === "classic") {
        doc.lineWidth(2).strokeColor(style.accent).rect(22, 22, width - 44, height - 44).stroke();
        doc.lineWidth(0.8).strokeColor(style.edge).rect(34, 34, width - 68, height - 68).stroke();
      } else if (style.layout === "left") {
        doc.rect(0, 0, 25, height).fill(style.ink);
        doc.rect(25, 0, 7, height).fill(style.accent);
        doc.rect(58, 42, width - 94, height - 84).lineWidth(1).strokeColor(style.edge).stroke();
        doc.circle(68, 72, 5).fill(style.accent);
        doc.circle(width - 55, height - 62, 5).fill(style.accent);
      } else {
        doc.lineWidth(5).strokeColor(style.accent).rect(25, 25, width - 50, height - 50).stroke();
        doc.lineWidth(1).strokeColor(style.edge).rect(37, 37, width - 74, height - 74).stroke();
        doc.circle(width / 2, 73, 21).lineWidth(1.5).strokeColor(style.accent).stroke();
        doc.moveTo(width / 2 - 9, 73).lineTo(width / 2 + 9, 73).lineWidth(1).strokeColor(style.accent).stroke();
        doc.moveTo(width / 2, 64).lineTo(width / 2, 82).stroke();
      }

      if (images.logo) {
        try {
          doc.image(images.logo, style.layout === "left" ? 54 : width / 2 - 24, 46, { fit: [48, 36], align: "center", valign: "center" });
        } catch (error) {
          console.error("Certificate logo could not be rendered:", error.message);
        }
      }

      const headerY = images.logo ? 93 : style.layout === "academic" ? 108 : 82;
      if (visibleOrganization) {
        doc.font("Helvetica").fontSize(9).fillColor(style.ink)
          .text(visibleOrganization, left, headerY, { width: contentWidth, align, lineBreak: false, ellipsis: true });
      }
      const titleY = style.layout === "academic" ? 139 : 139;
      doc.font(style.titleFont).fontSize(fitFontSize(doc, title, style.titleFont, contentWidth, 29, 17))
        .fillColor(style.ink)
        .text(title, left, titleY, { width: contentWidth, align, lineBreak: false, ellipsis: true });
      doc.font(style.font).fontSize(13).fillColor(style.ink)
        .text("This certificate is proudly presented to", left, 194, { width: contentWidth, align });

      const participantName = registration.name || "Participant";
      doc.font(style.titleFont)
        .fontSize(fitFontSize(doc, participantName, style.titleFont, contentWidth, 35, 18))
        .fillColor(style.accent)
        .text(participantName, left, 222, { width: contentWidth, align, lineBreak: false, ellipsis: true });

      doc.moveTo(left + contentWidth * 0.18, 270)
        .lineTo(left + contentWidth * 0.82, 270)
        .lineWidth(style.layout === "academic" ? 1.8 : 0.8)
        .strokeColor(style.edge)
        .stroke();
      let descriptionFont = 13;
      while (
        descriptionFont > 9 &&
        doc.heightOfString(description, { width: contentWidth * 0.86, font: style.font, size: descriptionFont, lineGap: 2 }) > 58
      ) descriptionFont -= 1;
      doc.font(style.font).fontSize(descriptionFont).fillColor(style.ink)
        .text(description, left + contentWidth * 0.07, 284, {
          width: contentWidth * 0.86,
          height: 58,
          align,
          lineGap: 2,
          ellipsis: true,
        });

      doc.font(style.titleFont)
        .fontSize(fitFontSize(doc, eventTitle, style.titleFont, contentWidth, 16, 11))
        .fillColor(style.ink)
        .text(eventTitle, left, 359, { width: contentWidth, align, lineBreak: false, ellipsis: true });
      doc.font("Helvetica").fontSize(9).fillColor(style.ink)
        .text(date, left, 382, { width: contentWidth, align });

      const signatures = (event.signatures || []).filter((signature) => signature.name || signature.imageUrl).slice(0, 4);
      const signatureTop = 432;
      const signatureWidth = Math.min(150, (contentWidth - 24) / Math.max(signatures.length, 1));
      const signatureGap = signatures.length > 1
        ? (contentWidth - signatureWidth * signatures.length) / (signatures.length - 1)
        : 0;
      for (let index = 0; index < signatures.length; index += 1) {
        const signature = signatures[index];
        const x = left + index * (signatureWidth + signatureGap);
        const image = images.signatures[index];
        if (image) {
          try {
            doc.image(image, x + signatureWidth * 0.2, signatureTop - 25, {
              fit: [signatureWidth * 0.6, 27],
              align: "center",
              valign: "center",
            });
          } catch (error) {
            console.error("Certificate signature could not be rendered:", error.message);
          }
        }
        doc.moveTo(x + 8, signatureTop + 8)
          .lineTo(x + signatureWidth - 8, signatureTop + 8)
          .lineWidth(0.8)
          .strokeColor(style.edge)
          .stroke();
        doc.font("Helvetica-Bold").fontSize(9).fillColor(style.ink)
          .text(signature.name || "Authorized signatory", x, signatureTop + 14, {
            width: signatureWidth,
            align: "center",
            lineBreak: false,
            ellipsis: true,
          });
        doc.font("Helvetica").fontSize(8).fillColor(style.ink)
          .text(signature.designation || signature.role || "", x, signatureTop + 27, {
            width: signatureWidth,
            align: "center",
            lineBreak: false,
            ellipsis: true,
          });
      }
      if (visibleOrganization) {
        doc.font("Helvetica").fontSize(8).fillColor(style.ink)
          .text(visibleOrganization, left, height - 43, { width: contentWidth, align, lineBreak: false, ellipsis: true });
      }
      doc.end();
    }).catch(reject);
  });
}

async function certificateImages(event) {
  const logo = await loadImage(event.certificateLogoPath, event.certificateLogoUrl);
  const signatures = await Promise.all(
    (event.signatures || []).slice(0, 4).map((signature) => loadImage(signature.imagePath, signature.imageUrl))
  );
  return { logo, signatures };
}

async function generatePdf(event, registration, organization) {
  const images = await certificateImages(event);
  return renderCertificate(event, registration, organization, images);
}

async function organizerOrganization(event) {
  if (!event.certificateShowOrganization) return "";
  const customOrg = String(event.certificateOrganization || "").trim();
  if (customOrg) return /^sahyadri/i.test(customOrg) ? "" : customOrg;
  const organizer = await User.findById(event.organizerId).select("organization").lean();
  const org = String(organizer?.organization || "").trim();
  return /^sahyadri/i.test(org) ? "" : org;
}

function certificatePayload(certificate) {
  if (!certificate) return null;
  const { pdfData: _pdfData, ...metadata } = certificate;
  return metadata;
}

router.get("/event/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const [registrations, certificates, organizer, emailConfigured] = await Promise.all([
      Registration.find({ eventId: event._id }).sort({ name: 1 }).lean(),
      Certificate.find({ eventId: event._id }).select("-pdfData").lean(),
      User.findById(event.organizerId).select("name organization").lean(),
      Promise.resolve(Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM)),
    ]);
    const issuedByRegistration = new Map(
      certificates.map((certificate) => [String(certificate.registrationId), certificatePayload(certificate)])
    );
    const participants = registrations.map((registration) => ({
      _id: registration._id,
      name: registration.name,
      email: registration.email,
      status: registration.status,
      checkedIn: isAttendedRegistration(registration),
      checkedInAt: registration.checkedInAt,
      certificate: issuedByRegistration.get(String(registration._id)) || null,
    }));
    const confirmedCount = registrations.filter((item) => item.status === "confirmed").length;
    const attendedCount = participants.filter((item) => item.checkedIn).length;
    const generatedCount = participants.filter((item) => item.certificate).length;

    res.json({
      event,
      organizer: {
        name: organizer?.name || "",
        organization: organizer?.organization || "",
      },
      counts: {
        registered: confirmedCount,
        attended: attendedCount,
        eligible: attendedCount,
        generated: generatedCount,
        cancelled: registrations.filter((item) => item.status === "cancelled").length,
      },
      participants,
      imageStorage: process.env.NODE_ENV === "production"
        ? (cloudinaryConfiguration() ? "cloudinary" : "unconfigured")
        : "local",
      emailConfigured,
      aiConfigured: Boolean(process.env.AI_API_KEY),
    });
  } catch (error) {
    console.error("Load certificates error:", error);
    res.status(500).json({ message: "Could not load certificate settings." });
  }
});

router.put("/event/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const settings = normalizeCertificateSettings({
      ...event.toObject(),
      ...req.body,
    });
    Object.assign(event, settings);
    await event.save();
    res.json({ message: "Certificate settings saved.", event });
  } catch (error) {
    console.error("Save certificate settings error:", error);
    res.status(400).json({ message: "Could not save certificate settings." });
  }
});

async function verifyEventOwner(req, res, next) {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    req.certificateEvent = event;
    next();
  } catch (error) {
    console.error("Verify certificate upload ownership error:", error);
    res.status(500).json({ message: "Could not verify event ownership." });
  }
}

router.post("/event/:eventId/assets/:kind", requireAuth, verifyEventOwner, (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Image files must be 5 MB or smaller."
      : error.message;
    res.status(400).json({ message });
  });
}, async (req, res) => {
  try {
    if (!["logo", "signature"].includes(req.params.kind)) {
      return res.status(400).json({ message: "Choose a logo or signature image." });
    }
    if (!req.file) return res.status(400).json({ message: "Choose a PNG or JPEG image." });
    const asset = await saveImage(req, req.certificateEvent._id, req.file);
    res.status(201).json(asset);
  } catch (error) {
    console.error("Certificate image upload error:", error);
    res.status(error.status || 500).json({ message: error.message || "Could not upload the image." });
  }
});

router.delete("/event/:eventId/assets", requireAuth, verifyEventOwner, async (req, res) => {
  try {
    await deleteImage(String(req.body.imagePath || ""), req.certificateEvent._id);
    res.json({ message: "Certificate image removed." });
  } catch (error) {
    console.error("Certificate image removal error:", error);
    res.status(502).json({ message: "Could not remove the stored image." });
  }
});

router.post("/event/:eventId/generate", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!event.certificateEnabled) {
      return res.status(409).json({ message: "Enable and save certificates before generating them." });
    }
    if (!Array.isArray(req.body.registrationIds) || req.body.registrationIds.length === 0) {
      return res.status(400).json({ message: "Select at least one participant." });
    }

    const ids = [...new Set(req.body.registrationIds.map(String))];
    if (ids.length > 500 || ids.some((id) => !isValidEventId(id))) {
      return res.status(400).json({ message: "Select up to 500 valid participants at a time." });
    }
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
    const organization = await organizerOrganization(event);
    const images = await certificateImages(event);

    for (const registration of registrations) {
      const existing = await Certificate.findOne({
        eventId: event._id,
        registrationId: registration._id,
      });
      if (existing && req.body.regenerate !== true) {
        alreadyIssued.push({ registrationId: registration._id, name: registration.name });
        continue;
      }

      const generation = (existing?.generation || 0) + 1;
      const pdfData = await renderCertificate(event, registration, organization, images);
      const certificate = await Certificate.findOneAndUpdate(
        { eventId: event._id, registrationId: registration._id },
        {
          $set: {
            issuedTo: registration.name,
            email: registration.email,
            generatedAt: new Date(),
            generation,
            pdfData,
            storagePath: "",
          },
          $setOnInsert: { eventId: event._id, registrationId: registration._id },
        },
        { upsert: true, new: true, runValidators: true }
      );
      issued.push({ registrationId: registration._id, name: registration.name, generation: certificate.generation });
    }

    res.json({ issued, alreadyIssued, ineligible });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A certificate was generated concurrently. Refresh the participant list and try again." });
    }
    console.error("Generate certificates error:", error);
    res.status(500).json({ message: "Could not generate certificates." });
  }
});

async function getCertificatePdf(event, registration, certificate) {
  if (certificate.pdfData?.length) return certificate.pdfData;
  const organization = await organizerOrganization(event);
  return generatePdf(event, registration, organization);
}

router.get("/event/:eventId/:registrationId/download", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const [certificate, registration] = await Promise.all([
      Certificate.findOne({
        eventId: event._id,
        registrationId: req.params.registrationId,
      }).select("+pdfData"),
      Registration.findOne({
        _id: req.params.registrationId,
        eventId: event._id,
        status: "confirmed",
        checkedIn: true,
      }),
    ]);
    if (!certificate || !registration) {
      return res.status(404).json({ message: "Eligible generated certificate not found." });
    }
    const pdf = await getCertificatePdf(event, registration, certificate);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="eventra-certificate-${registration._id}.pdf"`,
    });
    res.send(pdf);
  } catch (error) {
    console.error("Download certificate error:", error);
    res.status(500).json({ message: "Could not download the certificate PDF." });
  }
});

router.post("/event/:eventId/:registrationId/email", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const [certificate, registration] = await Promise.all([
      Certificate.findOne({ eventId: event._id, registrationId: req.params.registrationId }).select("+pdfData"),
      Registration.findOne({
        _id: req.params.registrationId,
        eventId: event._id,
        status: "confirmed",
        checkedIn: true,
      }),
    ]);

    if (!certificate || !registration) {
      return res.status(404).json({ message: "Eligible generated certificate not found." });
    }

    const pdf = await getCertificatePdf(event, registration, certificate);
    const result = await emailService.sendCertificateEmail(event, registration, pdf);

    if (!result.success) {
      const statusCode = !emailService.isConfigured() ? 503 : 502;
      return res.status(statusCode).json({
        message: result.error || "Could not send certificate email. Check SMTP settings and try again.",
      });
    }

    certificate.lastEmailedAt = new Date();
    await certificate.save();

    res.json({
      message: `Certificate emailed to ${registration.email}`,
      lastEmailedAt: certificate.lastEmailedAt,
    });
  } catch (error) {
    console.error("Email certificate error:", error);
    res.status(502).json({ message: "Could not send certificate email. Check SMTP settings and try again." });
  }
});

router.post("/event/:eventId/email-bulk", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!emailService.isConfigured()) {
      return res.status(503).json({ message: "Email delivery is not configured on the server." });
    }

    const requestedIds = Array.isArray(req.body.registrationIds) && req.body.registrationIds.length > 0
      ? req.body.registrationIds
      : null;

    const certQuery = { eventId: event._id };
    if (requestedIds) {
      certQuery.registrationId = { $in: requestedIds };
    }

    const certificates = await Certificate.find(certQuery).select("+pdfData");
    if (certificates.length === 0) {
      return res.status(400).json({ message: "No certificates found to deliver." });
    }

    const registrationIds = certificates.map((c) => c.registrationId);
    const registrations = await Registration.find({
      _id: { $in: registrationIds },
      eventId: event._id,
      status: "confirmed",
      checkedIn: true,
    });
    const regMap = new Map(registrations.map((r) => [String(r._id), r]));

    const sent = [];
    const failed = [];
    const skipped = [];

    for (const cert of certificates) {
      const reg = regMap.get(String(cert.registrationId));
      if (!reg) {
        skipped.push({ registrationId: cert.registrationId, reason: "Ineligible or absent" });
        continue;
      }

      // Prevent duplicate emails within 5 minutes unless force is set
      if (cert.lastEmailedAt && req.body.force !== true && (Date.now() - new Date(cert.lastEmailedAt).getTime() < 300000)) {
        skipped.push({ registrationId: reg._id, name: reg.name, reason: "Recently emailed" });
        continue;
      }

      try {
        const pdf = await getCertificatePdf(event, reg, cert);
        const result = await emailService.sendCertificateEmail(event, reg, pdf);
        if (result.success) {
          sent.push({ registrationId: reg._id, name: reg.name, email: reg.email });
        } else {
          failed.push({ registrationId: reg._id, name: reg.name, email: reg.email, error: result.error });
        }
      } catch (err) {
        failed.push({ registrationId: reg._id, name: reg.name, email: reg.email, error: err.message });
      }
    }

    res.json({
      message: `Bulk delivery finished: ${sent.length} sent, ${failed.length} failed, ${skipped.length} skipped.`,
      sent,
      failed,
      skipped,
    });
  } catch (error) {
    console.error("Bulk certificate email error:", error);
    res.status(500).json({ message: "Could not deliver certificates in bulk." });
  }
});

router.post("/event/:eventId/email/test", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!emailService.isConfigured()) {
      return res.status(503).json({ message: "Email delivery is not configured on the server." });
    }

    const organizer = await User.findById(event.organizerId).select("email name").lean();
    if (!organizer?.email) return res.status(400).json({ message: "Organizer account email is unavailable." });

    const verifyResult = await emailService.verifySmtpConnection();
    if (!verifyResult.ok) {
      return res.status(502).json({ message: verifyResult.error || "Email configuration test failed." });
    }

    res.json({ message: `SMTP provider verified operational for ${organizer.email}` });
  } catch (error) {
    console.error("Email configuration test failed:", error);
    res.status(502).json({ message: "Email configuration test failed. Check the server SMTP settings." });
  }
});

router.post("/event/:eventId/ai-suggestion", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!process.env.AI_API_KEY) {
      return res.json({
        configured: false,
        message: "Configure AI_API_KEY on the server to enable certificate suggestions.",
      });
    }

    const response = await fetch(process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Design a professional event certificate. Return JSON with template (classic, modern, or academic), title, description, and reason. Explain why the theme fits the event. Use {name}, {event}, and {date} as placeholders in the description.",
          },
          {
            role: "user",
            content: JSON.stringify({
              title: event.title,
              eventType: String(req.body.eventType || event.eventType || "").slice(0, 80),
              description: String(event.description || "").slice(0, 1500),
            }),
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload = await response.json();
    const suggestion = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    const templates = CERTIFICATE_TEMPLATES;
    res.json({
      configured: true,
      suggestion: {
        template: templates.includes(suggestion.template) ? suggestion.template : "classic",
        title: String(suggestion.title || DEFAULT_CERTIFICATE_TITLE).slice(0, 100),
        description: String(suggestion.description || DEFAULT_CERTIFICATE_DESCRIPTION).slice(0, 500),
        reason: String(suggestion.reason || "").slice(0, 500),
      },
    });
  } catch (error) {
    console.error("Certificate AI suggestion error:", error);
    res.status(502).json({ message: "Could not retrieve a certificate suggestion from the configured AI provider." });
  }
});

export default router;
