import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import Attendance from "../models/Attendance.js";
import Certificate from "../models/Certificate.js";
import Event from "../models/Event.js";
import MediaAsset from "../models/MediaAsset.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import emailService from "../services/emailService.js";
import {
  evaluateRegistrationCertificateEligibility,
  formatEventDateRangeLabel,
  getAllEventSessions,
  getEventDaysNormalized,
  normalizeCertificateEligibilityRule,
} from "../utils/multiDay.js";
import {
  CERTIFICATE_ORG_ALIGNS,
  CERTIFICATE_ORG_SIZES,
  CERTIFICATE_TEMPLATES,
  DEFAULT_CERTIFICATE_DESCRIPTION,
  DEFAULT_CERTIFICATE_TITLE,
  getCertificateDesignTimestamp,
  isAttendedRegistration,
  isCertificatePdfStale,
  normalizeCertificateSettings,
  normalizeCertificateTextStyles,
  resolveCertificateDescription,
} from "../utils/certificateDesign.js";
import { formatParticipantName } from "../utils/participantName.js";
import {
  generateGeminiContent,
  generateGeminiCertificateDesign,
  isGeminiConfigured,
} from "../services/geminiService.js";

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
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim();
  return `${proto}://${req.get("host")}${imagePath}`;
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
      const asset = await MediaAsset.create({
        scope: "certificate",
        eventId,
        mimeType: file.mimetype || "image/png",
        data: file.buffer,
      });
      const imagePath = `db:${asset._id}`;
      return {
        imageUrl: imageUrlForRequest(req, `/api/certificates/assets/${asset._id}`),
        imagePath,
      };
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
  if (imagePath.startsWith("db:")) {
    const assetId = imagePath.slice(3);
    if (isValidEventId(assetId)) {
      await MediaAsset.deleteOne({ _id: assetId, scope: "certificate", eventId });
    }
    return;
  }
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
  if (imagePath?.startsWith("db:")) {
    const assetId = imagePath.slice(3);
    if (isValidEventId(assetId)) {
      const asset = await MediaAsset.findById(assetId).select("data").lean();
      return asset?.data ? Buffer.from(asset.data.buffer || asset.data) : null;
    }
    return null;
  }
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
  const safeMaxWidth = Math.max(40, maxWidth - 4);
  while (size > minimum) {
    doc.font(font).fontSize(size);
    if (doc.widthOfString(text) <= safeMaxWidth) break;
    size -= 1;
  }
  return size;
}

const PDF_FONT_MAP = {
  serif: { regular: "Times-Roman", bold: "Times-Bold" },
  sans: { regular: "Helvetica", bold: "Helvetica-Bold" },
  italicSerif: { regular: "Times-Italic", bold: "Times-BoldItalic" },
  italicSans: { regular: "Helvetica-Oblique", bold: "Helvetica-BoldOblique" },
  mono: { regular: "Courier", bold: "Courier-Bold" },
};

function resolvePdfFont(fontKey, themeDefaultFont, bold = false) {
  const mapped = PDF_FONT_MAP[fontKey];
  if (!mapped) return themeDefaultFont;
  return bold ? mapped.bold : mapped.regular;
}

function drawCustomPositionedText(doc, {
  text,
  font,
  fontSize,
  color,
  align = "center",
  xPct,
  yPct,
  pageWidth,
  pageHeight,
  maxBoxWidth,
  lineGap = 2,
  multiline = false,
  characterSpacing = 0,
}) {
  doc.font(font).fontSize(fontSize).fillColor(color);
  const measuredSingle = doc.widthOfString(text, { characterSpacing });
  const boxW = multiline
    ? Math.min(maxBoxWidth, Math.max(220, measuredSingle + 24))
    : Math.min(maxBoxWidth, Math.max(80, measuredSingle + 16));
  const boxH = multiline
    ? doc.heightOfString(text, { width: boxW, align, lineGap, characterSpacing })
    : doc.currentLineHeight(true);

  const safeLeft = 48;
  const safeRight = 48;
  const safeTop = 40;
  const safeBottom = 42;

  const centerX = (Math.min(94, Math.max(6, Number(xPct))) / 100) * pageWidth;
  const centerY = (Math.min(94, Math.max(6, Number(yPct))) / 100) * pageHeight;

  const drawX = Math.max(safeLeft, Math.min(pageWidth - safeRight - boxW, centerX - boxW / 2));
  const drawY = Math.max(safeTop, Math.min(pageHeight - safeBottom - boxH, centerY - boxH / 2));

  doc.text(text, drawX, drawY, {
    width: boxW,
    align,
    lineGap,
    characterSpacing,
    ...(multiline ? {} : { lineBreak: false, ellipsis: true }),
  });

  return { drawX, drawY, boxW, boxH };
}

function drawHeaderTagline(doc, tagline, { x, y, width, align, font, fontSize, color }) {
  const clean = String(tagline || "").trim();
  if (!clean || width <= 0) return 0;
  doc.font(font).fontSize(fontSize).fillColor(color);
  const height = doc.heightOfString(clean, { width, align, lineGap: 1.5 });
  doc.text(clean, x, y, { width, align, lineGap: 1.5 });
  return height;
}

export function renderCertificate(event, registration, organization, images = { logo: null, signatures: [] }) {
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
          layout: "classic",
          headerText: "CERTIFICATE OF EXCELLENCE",
        },
        modern: {
          paper: "#f4f7f5",
          ink: "#173a35",
          accent: "#267467",
          edge: "#bad2c9",
          font: "Helvetica",
          titleFont: "Helvetica-Bold",
          layout: "left",
          headerText: "HONORARY RECOGNITION",
        },
        academic: {
          paper: "#f4f0e5",
          ink: "#283b31",
          accent: "#9b343b",
          edge: "#cbbd9e",
          font: "Times-Roman",
          titleFont: "Times-Bold",
          layout: "academic",
          headerText: "ACADEMIC DISTINCTION",
        },
        royalGold: {
          paper: "#090d16",
          ink: "#f8fafc",
          accent: "#f59e0b",
          edge: "#d97706",
          font: "Times-Roman",
          titleFont: "Times-Bold",
          layout: "royalGold",
          headerText: "ROYAL MERIT & DISTINCTION",
        },
        techAurora: {
          paper: "#090e1a",
          ink: "#e2e8f0",
          accent: "#6366f1",
          edge: "#38bdf8",
          font: "Helvetica",
          titleFont: "Helvetica-Bold",
          layout: "techAurora",
          headerText: "TECH INNOVATION & MERIT",
        },
        emeraldExecutive: {
          paper: "#f0fdf4",
          ink: "#064e3b",
          accent: "#059669",
          edge: "#a7f3d0",
          font: "Helvetica",
          titleFont: "Helvetica-Bold",
          layout: "emeraldExecutive",
          headerText: "EXECUTIVE LEADERSHIP DIPLOMA",
        },
        crimsonLuxe: {
          paper: "#fff1f2",
          ink: "#881337",
          accent: "#be123c",
          edge: "#fecdd3",
          font: "Times-Roman",
          titleFont: "Times-Bold",
          layout: "crimsonLuxe",
          headerText: "PRESTIGIOUS HONORS AWARD",
        },
        vintageParchment: {
          paper: "#fefce8",
          ink: "#451a03",
          accent: "#78350f",
          edge: "#fde68a",
          font: "Times-Roman",
          titleFont: "Times-Bold",
          layout: "vintageParchment",
          headerText: "TESTIMONIAL OF MERIT",
        },
      };
      const style = themes[event.certificateTemplate] || themes.classic;
      const left = style.layout === "left" ? 114 : 82;
      const contentWidth = width - left - 82;
      const align = style.layout === "left" ? "left" : "center";
      const title = event.certificateTitle || DEFAULT_CERTIFICATE_TITLE;
      const eventTitle = (event.certificateEventTitle || "").trim() || event.title || "Event";
      const date = event.eventDurationType === "multi_day"
        ? formatEventDateRangeLabel(event)
        : formatDate(event.date);
      const description = resolveCertificateDescription(
        event.certificateDescription,
        registration.name,
        eventTitle,
        date
      );
      const visibleOrganization =
        String(event.certificateOrganization || "").trim() ||
        (event.certificateShowOrganization ? organization : "");
      const headerTagline = String(event.certificateOrganizationTagline || "").trim();
      const textStyles = normalizeCertificateTextStyles(event.certificateTextStyles, {
        size: event.certificateOrganizationSize || "md",
        align: event.certificateOrganizationAlign || "center",
      });

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
      } else if (style.layout === "academic") {
        doc.lineWidth(5).strokeColor(style.accent).rect(25, 25, width - 50, height - 50).stroke();
        doc.lineWidth(1).strokeColor(style.edge).rect(37, 37, width - 74, height - 74).stroke();
        if (!images.logo && !visibleOrganization) {
          doc.circle(width / 2, 73, 21).lineWidth(1.5).strokeColor(style.accent).stroke();
          doc.moveTo(width / 2 - 9, 73).lineTo(width / 2 + 9, 73).lineWidth(1).strokeColor(style.accent).stroke();
          doc.moveTo(width / 2, 64).lineTo(width / 2, 82).stroke();
        }
      } else if (style.layout === "royalGold") {
        doc.lineWidth(3).strokeColor(style.accent).rect(24, 24, width - 48, height - 48).stroke();
        doc.lineWidth(1).strokeColor(style.edge).rect(34, 34, width - 68, height - 68).stroke();
        doc.rect(20, 20, 8, 8).fill(style.accent);
        doc.rect(width - 28, 20, 8, 8).fill(style.accent);
        doc.rect(20, height - 28, 8, 8).fill(style.accent);
        doc.rect(width - 28, height - 28, 8, 8).fill(style.accent);
      } else if (style.layout === "techAurora") {
        doc.lineWidth(2).strokeColor(style.accent).rect(22, 22, width - 44, height - 44).stroke();
        doc.lineWidth(1).strokeColor(style.edge).rect(32, 32, width - 64, height - 64).stroke();
        doc.moveTo(42, 52).lineTo(42, 42).lineTo(52, 42).lineWidth(2).strokeColor(style.edge).stroke();
        doc.moveTo(width - 42, 52).lineTo(width - 42, 42).lineTo(width - 52, 42).lineWidth(2).strokeColor(style.edge).stroke();
        doc.moveTo(42, height - 52).lineTo(42, height - 42).lineTo(52, height - 42).lineWidth(2).strokeColor(style.edge).stroke();
        doc.moveTo(width - 42, height - 52).lineTo(width - 42, height - 42).lineTo(width - 52, height - 42).lineWidth(2).strokeColor(style.edge).stroke();
      } else if (style.layout === "emeraldExecutive") {
        doc.lineWidth(4).strokeColor(style.accent).rect(24, 24, width - 48, height - 48).stroke();
        doc.lineWidth(1).strokeColor(style.edge).rect(34, 34, width - 68, height - 68).stroke();
        doc.rect(width / 2 - 25, 30, 50, 6).fill(style.accent);
      } else if (style.layout === "crimsonLuxe") {
        doc.lineWidth(4.5).strokeColor(style.accent).rect(24, 24, width - 48, height - 48).stroke();
        doc.lineWidth(1).strokeColor(style.edge).rect(36, 36, width - 72, height - 72).stroke();
        if (!images.logo && !visibleOrganization) {
          doc.circle(width / 2, 70, 16).lineWidth(1.5).strokeColor(style.accent).stroke();
        }
      } else {
        doc.lineWidth(3).strokeColor(style.accent).rect(22, 22, width - 44, height - 44).stroke();
        doc.lineWidth(1).strokeColor(style.edge).rect(30, 30, width - 60, height - 60).stroke();
        doc.lineWidth(0.5).strokeColor(style.accent).rect(36, 36, width - 72, height - 72).stroke();
      }

      const orgSizeMap = { sm: 10, md: 14, lg: 18, xl: 22 };
      const orgSizeKey = CERTIFICATE_ORG_SIZES.includes(event.certificateOrganizationSize)
        ? event.certificateOrganizationSize
        : "md";
      const orgAlign = CERTIFICATE_ORG_ALIGNS.includes(event.certificateOrganizationAlign)
        ? event.certificateOrganizationAlign
        : "center";
      const orgStyle = textStyles.organization;
      const orgFont = resolvePdfFont(orgStyle.font, "Helvetica-Bold", true);
      const resolvedOrgAlign = orgStyle.align || orgAlign;
      const topHeadline = visibleOrganization
        ? (event.certificateOrganizationUppercase ? visibleOrganization.toUpperCase() : visibleOrganization)
        : (style.headerText || "CERTIFICATE OF EXCELLENCE").toUpperCase();
      const customOrgSize = orgStyle.fontSize;
      const maxHeaderSize = customOrgSize || (visibleOrganization ? orgSizeMap[orgSizeKey] : 10);
      const minHeaderSize = visibleOrganization || customOrgSize ? Math.max(8, maxHeaderSize - 5) : 9;
      const headerSpacing = visibleOrganization ? 0.6 : 1.5;
      const hasCustomLogoPos = event.certificateLogoX != null && event.certificateLogoY != null;
      const hasCustomOrgPos = orgStyle.x != null && orgStyle.y != null;
      const hasCustomHeader = Boolean(visibleOrganization || headerTagline || (images.logo && !hasCustomLogoPos));
      const headerY = hasCustomHeader ? 58 : style.layout === "academic" ? 108 : 82;
      const taglineFont = resolvePdfFont(orgStyle.font, style.font, false);

      let headerBottomY = headerY;
      if (hasCustomOrgPos) {
        const headerFontSize = fitFontSize(doc, topHeadline, orgFont, contentWidth, maxHeaderSize, minHeaderSize);
        const headlineBox = drawCustomPositionedText(doc, {
          text: topHeadline,
          font: orgFont,
          fontSize: headerFontSize,
          color: style.accent,
          align: resolvedOrgAlign,
          xPct: orgStyle.x,
          yPct: orgStyle.y,
          pageWidth: width,
          pageHeight: height,
          maxBoxWidth: contentWidth,
          characterSpacing: headerSpacing,
        });
        if (headerTagline) {
          const taglineSize = Math.max(7.5, Math.min(10.5, headerFontSize - 3));
          const taglineBoxW = Math.min(contentWidth, Math.max(headlineBox.boxW, 240));
          const taglineX = Math.max(48, Math.min(width - 48 - taglineBoxW, headlineBox.drawX + (headlineBox.boxW - taglineBoxW) / 2));
          drawHeaderTagline(doc, headerTagline, {
            x: taglineX,
            y: headlineBox.drawY + headlineBox.boxH + 3,
            width: taglineBoxW,
            align: resolvedOrgAlign,
            font: taglineFont,
            fontSize: taglineSize,
            color: style.ink,
          });
        }
        if (images.logo && !hasCustomLogoPos) {
          try {
            doc.image(images.logo, left, headerY, { fit: [38, 32], align: "center", valign: "center" });
          } catch (error) {
            console.error("Certificate logo could not be rendered:", error.message);
          }
        }
        headerBottomY = headerY + 28;
      } else if (images.logo && !hasCustomLogoPos) {
        const logoBox = 38;
        const logoHeight = 32;
        const gap = 10;
        const availTextWidth = Math.max(120, contentWidth - logoBox - gap);
        const headerFontSize = fitFontSize(doc, topHeadline, orgFont, availTextWidth, maxHeaderSize, minHeaderSize);
        const taglineSize = Math.max(7.5, Math.min(10.5, headerFontSize - 3));

        doc.font(orgFont).fontSize(headerFontSize).fillColor(style.accent);
        const measuredHeadlineWidth = doc.widthOfString(topHeadline, { characterSpacing: headerSpacing });
        const headlineBlockWidth = Math.min(availTextWidth, measuredHeadlineWidth);

        let measuredTaglineWidth = 0;
        if (headerTagline) {
          doc.font(taglineFont).fontSize(taglineSize);
          measuredTaglineWidth = doc.widthOfString(headerTagline);
        }

        const textBlockWidth = Math.min(availTextWidth, Math.max(headlineBlockWidth, measuredTaglineWidth));
        doc.font(orgFont).fontSize(headerFontSize);
        const textHeight = doc.heightOfString(topHeadline, { width: textBlockWidth, characterSpacing: headerSpacing });

        let taglineHeight = 0;
        if (headerTagline) {
          doc.font(taglineFont).fontSize(taglineSize);
          taglineHeight = doc.heightOfString(headerTagline, { width: textBlockWidth, lineGap: 1.5 });
        }

        const totalTextHeight = headerTagline ? textHeight + 3 + taglineHeight : textHeight;
        const rowHeight = Math.max(logoHeight, totalTextHeight);
        const totalBlockWidth = logoBox + gap + textBlockWidth;
        const blockX = resolvedOrgAlign === "left"
          ? left
          : resolvedOrgAlign === "right"
            ? left + contentWidth - totalBlockWidth
            : left + (contentWidth - totalBlockWidth) / 2;

        try {
          doc.image(images.logo, blockX, headerY + (rowHeight - logoHeight) / 2, {
            fit: [logoBox, logoHeight],
            align: "center",
            valign: "center",
          });
        } catch (error) {
          console.error("Certificate logo could not be rendered:", error.message);
        }

        const textStartX = blockX + logoBox + gap;
        const textStartY = headerY + Math.max(0, (rowHeight - totalTextHeight) / 2);
        const headlineAlign = measuredHeadlineWidth <= textBlockWidth && !headerTagline ? "left" : resolvedOrgAlign;
        doc.font(orgFont).fontSize(headerFontSize).fillColor(style.accent);
        doc.text(topHeadline, textStartX, textStartY, {
          width: textBlockWidth,
          align: headlineAlign,
          characterSpacing: headerSpacing,
        });
        if (headerTagline) {
          drawHeaderTagline(doc, headerTagline, {
            x: textStartX,
            y: textStartY + textHeight + 3,
            width: textBlockWidth,
            align: resolvedOrgAlign,
            font: taglineFont,
            fontSize: taglineSize,
            color: style.ink,
          });
        }
        headerBottomY = headerY + rowHeight;
      } else {
        const headerFontSize = fitFontSize(doc, topHeadline, orgFont, contentWidth, maxHeaderSize, minHeaderSize);
        const taglineSize = Math.max(7.5, Math.min(10.5, headerFontSize - 3));
        doc.font(orgFont).fontSize(headerFontSize).fillColor(style.accent);
        const textHeight = doc.heightOfString(topHeadline, { width: contentWidth, align: resolvedOrgAlign, characterSpacing: headerSpacing });
        doc.text(topHeadline, left, headerY, {
          width: contentWidth,
          align: resolvedOrgAlign,
          characterSpacing: headerSpacing,
        });
        const taglineHeight = drawHeaderTagline(doc, headerTagline, {
          x: left,
          y: headerY + textHeight + 3,
          width: contentWidth,
          align: resolvedOrgAlign,
          font: taglineFont,
          fontSize: taglineSize,
          color: style.ink,
        });
        headerBottomY = headerY + textHeight + (taglineHeight > 0 ? 3 + taglineHeight : 0);
      }

      if (images.logo && hasCustomLogoPos) {
        const logoPct = Number.isFinite(Number(event.certificateLogoSize))
          ? Math.min(30, Math.max(4, Number(event.certificateLogoSize)))
          : 8;
        const logoBoxSize = (logoPct / 100) * width;
        const logoCx = (Math.min(98, Math.max(2, Number(event.certificateLogoX))) / 100) * width;
        const logoCy = (Math.min(98, Math.max(2, Number(event.certificateLogoY))) / 100) * height;
        try {
          doc.image(images.logo, logoCx - logoBoxSize / 2, logoCy - logoBoxSize / 2, {
            fit: [logoBoxSize, logoBoxSize],
            align: "center",
            valign: "center",
          });
        } catch (error) {
          console.error("Certificate custom logo could not be rendered:", error.message);
        }
      }

      const titleStyle = textStyles.title;
      const titleFont = resolvePdfFont(titleStyle.font, style.titleFont, true);
      const titleAlign = titleStyle.align || align;
      const titleMaxSize = titleStyle.fontSize || 29;
      const titleSize = fitFontSize(doc, title, titleFont, contentWidth, titleMaxSize, Math.min(14, titleMaxSize));
      const titleY = Math.max(139, Math.ceil(headerBottomY + 18));

      if (titleStyle.x != null && titleStyle.y != null) {
        drawCustomPositionedText(doc, {
          text: title,
          font: titleFont,
          fontSize: titleSize,
          color: style.ink,
          align: titleAlign,
          xPct: titleStyle.x,
          yPct: titleStyle.y,
          pageWidth: width,
          pageHeight: height,
          maxBoxWidth: contentWidth,
        });
      } else {
        doc.font(titleFont).fontSize(titleSize).fillColor(style.ink)
          .text(title, left, titleY, { width: contentWidth, align: titleAlign, lineBreak: false, ellipsis: true });
      }

      doc.font(style.font).fontSize(13).fillColor(style.ink)
        .text("This certificate is proudly presented to", left, Math.max(194, titleY + 52), { width: contentWidth, align });

      const recipientStyle = textStyles.recipient;
      const recipientFont = resolvePdfFont(recipientStyle.font, style.titleFont, true);
      const recipientAlign = recipientStyle.align || align;
      const recipientMaxSize = recipientStyle.fontSize || 35;
      const participantName = formatParticipantName(registration.name, "Participant");
      const recipientSize = fitFontSize(
        doc,
        participantName,
        recipientFont,
        contentWidth,
        recipientMaxSize,
        Math.min(16, recipientMaxSize)
      );

      if (recipientStyle.x != null && recipientStyle.y != null) {
        drawCustomPositionedText(doc, {
          text: participantName,
          font: recipientFont,
          fontSize: recipientSize,
          color: style.accent,
          align: recipientAlign,
          xPct: recipientStyle.x,
          yPct: recipientStyle.y,
          pageWidth: width,
          pageHeight: height,
          maxBoxWidth: contentWidth,
        });
      } else {
        doc.font(recipientFont).fontSize(recipientSize).fillColor(style.accent)
          .text(participantName, left, 222, { width: contentWidth, align: recipientAlign, lineBreak: false, ellipsis: true });
        doc.moveTo(left + contentWidth * 0.18, 270)
          .lineTo(left + contentWidth * 0.82, 270)
          .lineWidth(style.layout === "academic" ? 1.8 : 0.8)
          .strokeColor(style.edge)
          .stroke();
      }

      const descStyle = textStyles.description;
      const descFont = resolvePdfFont(descStyle.font, style.font, false);
      const descAlign = descStyle.align || align;
      let descriptionFont = descStyle.fontSize || 13;
      const descBoxWidth = contentWidth * 0.84;
      while (descriptionFont > 8) {
        doc.font(descFont).fontSize(descriptionFont);
        if (doc.heightOfString(description, { width: descBoxWidth, lineGap: 2 }) <= 82) break;
        descriptionFont -= 1;
      }

      if (descStyle.x != null && descStyle.y != null) {
        drawCustomPositionedText(doc, {
          text: description,
          font: descFont,
          fontSize: descriptionFont,
          color: style.ink,
          align: descAlign,
          xPct: descStyle.x,
          yPct: descStyle.y,
          pageWidth: width,
          pageHeight: height,
          maxBoxWidth: descBoxWidth,
          multiline: true,
        });
      } else {
        doc.font(descFont).fontSize(descriptionFont).fillColor(style.ink)
          .text(description, left + contentWidth * 0.08, 284, {
            width: descBoxWidth,
            height: 82,
            align: descAlign,
            lineGap: 2,
            ellipsis: true,
          });
      }

      const eventStyle = textStyles.eventName;
      const eventFont = resolvePdfFont(eventStyle.font, style.titleFont, true);
      const eventAlign = eventStyle.align || align;
      const eventMaxSize = eventStyle.fontSize || 16;
      const eventSize = fitFontSize(doc, eventTitle, eventFont, contentWidth, eventMaxSize, Math.min(9, eventMaxSize));

      if (eventStyle.x != null && eventStyle.y != null) {
        const placedEvent = drawCustomPositionedText(doc, {
          text: eventTitle,
          font: eventFont,
          fontSize: eventSize,
          color: style.ink,
          align: eventAlign,
          xPct: eventStyle.x,
          yPct: eventStyle.y,
          pageWidth: width,
          pageHeight: height,
          maxBoxWidth: contentWidth,
        });
        doc.font("Helvetica").fontSize(9).fillColor(style.ink)
          .text(date, placedEvent.drawX, placedEvent.drawY + placedEvent.boxH + 4, {
            width: placedEvent.boxW,
            align: eventAlign,
            lineBreak: false,
          });
      } else {
        doc.font(eventFont).fontSize(eventSize).fillColor(style.ink)
          .text(eventTitle, left, 359, { width: contentWidth, align: eventAlign, lineBreak: false, ellipsis: true });
        doc.font("Helvetica").fontSize(9).fillColor(style.ink)
          .text(date, left, 382, { width: contentWidth, align: eventAlign });
      }

      const signatures = (event.signatures || []).filter((signature) => signature.name || signature.imageUrl).slice(0, 4);
      const drawSignatureBlock = (signature, image, centerX, lineY, blockWidth, scale = 1) => {
        const safeScale = Number.isFinite(scale) ? Math.min(2.2, Math.max(0.5, scale)) : 1;
        const imgBoxWidth = blockWidth * 0.65;
        const imgBoxHeight = Math.round(28 * safeScale);
        if (image) {
          try {
            doc.image(image, centerX - imgBoxWidth / 2, lineY - imgBoxHeight - 5, {
              fit: [imgBoxWidth, imgBoxHeight],
              align: "center",
              valign: "bottom",
            });
          } catch (error) {
            console.error("Certificate signature could not be rendered:", error.message);
          }
        }
        const halfBlock = blockWidth / 2;
        doc.moveTo(centerX - halfBlock + 8, lineY)
          .lineTo(centerX + halfBlock - 8, lineY)
          .lineWidth(0.8)
          .strokeColor(style.edge)
          .stroke();
        const nameSize = Math.round(9 * Math.min(1.25, Math.max(0.85, safeScale)));
        const roleSize = Math.round(8 * Math.min(1.25, Math.max(0.85, safeScale)));
        doc.font("Helvetica-Bold").fontSize(nameSize).fillColor(style.ink)
          .text(signature.name || "Authorized signatory", centerX - halfBlock, lineY + 6, {
            width: blockWidth,
            align: "center",
            lineBreak: false,
            ellipsis: true,
          });
        doc.font("Helvetica").fontSize(roleSize).fillColor(style.ink)
          .text(signature.designation || signature.role || "", centerX - halfBlock, lineY + 6 + nameSize + 4, {
            width: blockWidth,
            align: "center",
            lineBreak: false,
            ellipsis: true,
          });
      };

      const flowSignatures = [];
      const pinnedSignatures = [];
      signatures.forEach((signature, index) => {
        const entry = { signature, image: images.signatures[index] };
        if (signature.x != null && signature.y != null) {
          pinnedSignatures.push(entry);
        } else {
          flowSignatures.push(entry);
        }
      });

      const signatureTop = 432;
      const signatureWidth = Math.min(150, (contentWidth - 24) / Math.max(flowSignatures.length, 1));
      const signatureGap = flowSignatures.length > 1
        ? (contentWidth - signatureWidth * flowSignatures.length) / (flowSignatures.length - 1)
        : 0;
      for (let index = 0; index < flowSignatures.length; index += 1) {
        const { signature, image } = flowSignatures[index];
        const centerX = left + index * (signatureWidth + signatureGap) + signatureWidth / 2;
        const scale = signature.scale != null ? Number(signature.scale) : 1;
        drawSignatureBlock(signature, image, centerX, signatureTop + 8, signatureWidth, scale);
      }

      for (const { signature, image } of pinnedSignatures) {
        const scale = signature.scale != null ? Number(signature.scale) : 1;
        const centerX = (Math.min(94, Math.max(6, Number(signature.x))) / 100) * width;
        const centerY = (Math.min(94, Math.max(6, Number(signature.y))) / 100) * height;
        const blockW = 140 * Math.min(2.2, Math.max(0.5, scale));
        drawSignatureBlock(signature, image, centerX, centerY + 6 * scale, blockW, scale);
      }

      // Standardized footer at the end of every certificate
      doc.font("Helvetica-Bold").fontSize(8).fillColor(style.accent)
        .text("EVENTRA · EVENT CERTIFICATE", left, height - 38, { width: contentWidth, align: "center", characterSpacing: 1.8 });
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
  const customOrg = String(event.certificateOrganization || "").trim();
  if (customOrg) return customOrg;
  if (event.certificateShowOrganization === false) return "";
  const organizer = await User.findById(event.organizerId).select("organization").lean();
  const org = String(organizer?.organization || "").trim();
  if (org) return org;
  return "EVENTRA";
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

    const [registrations, certificates, attendanceRecords, organizer, emailConfigured] = await Promise.all([
      Registration.find({ eventId: event._id }).sort({ name: 1 }).lean(),
      Certificate.find({ eventId: event._id }).select("-pdfData").lean(),
      Attendance.find({ eventId: event._id }).lean(),
      User.findById(event.organizerId).select("name organization").lean(),
      Promise.resolve(emailService.isConfigured()),
    ]);
    const issuedByRegistration = new Map(
      certificates.map((certificate) => [String(certificate.registrationId), certificatePayload(certificate)])
    );
    const attendanceByRegistration = new Map();
    for (const record of attendanceRecords) {
      const key = String(record.registrationId);
      if (!attendanceByRegistration.has(key)) attendanceByRegistration.set(key, []);
      attendanceByRegistration.get(key).push(record);
    }

    const days = getEventDaysNormalized(event);
    const allSessions = getAllEventSessions(event);
    const participants = registrations.map((registration) => {
      const regAttendance = attendanceByRegistration.get(String(registration._id)) || [];
      const evalResult = evaluateRegistrationCertificateEligibility(event, registration, regAttendance);
      const checkedIn = evalResult.attendedDayNumbers.length > 0 || evalResult.attendedSessionIds.length > 0 || isAttendedRegistration(registration);
      const feedbackSubmitted = registration.feedbackSubmitted === true;

      return {
        _id: String(registration._id),
        name: formatParticipantName(registration.name, "Participant"),
        email: registration.email,
        status: registration.status,
        checkedIn,
        checkedInAt: registration.checkedInAt,
        feedbackSubmitted,
        eligibilityStatus: evalResult.eligibilityStatus,
        eligibilityReason: evalResult.reason,
        attendedDays: evalResult.attendedDayNumbers,
        totalEventDays: evalResult.totalEventDays,
        attendedSessions: evalResult.attendedSessionIds,
        certificate: issuedByRegistration.get(String(registration._id)) || null,
      };
    });
    const confirmedCount = registrations.filter((item) => item.status === "confirmed").length;
    const attendedCount = participants.filter((item) => item.checkedIn).length;
    const eligibleCount = participants.filter((item) => item.eligibilityStatus === "eligible").length;
    const generatedCount = participants.filter((item) => item.certificate).length;

    res.json({
      event,
      days,
      allSessions,
      certificateEligibilityRule: normalizeCertificateEligibilityRule(
        event.certificateEligibilityRule,
        allSessions.map((s) => s.sessionId)
      ),
      organizer: {
        name: organizer?.name || "",
        organization: organizer?.organization || "",
      },
      counts: {
        registered: confirmedCount,
        attended: attendedCount,
        eligible: eligibleCount,
        generated: generatedCount,
        cancelled: registrations.filter((item) => item.status === "cancelled").length,
      },
      participants,
      imageStorage: process.env.NODE_ENV === "production"
        ? (cloudinaryConfiguration() ? "cloudinary" : "database")
        : "local",
      emailConfigured,
      aiConfigured: isGeminiConfigured(),
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
    const allSessions = getAllEventSessions(event);
    const settings = normalizeCertificateSettings({
      ...event.toObject(),
      ...req.body,
    });
    settings.certificateEligibilityRule = normalizeCertificateEligibilityRule(
      req.body.certificateEligibilityRule ?? settings.certificateEligibilityRule,
      allSessions.map((s) => s.sessionId)
    );
    Object.assign(event, settings, { certificateUpdatedAt: new Date() });
    await event.save();
    await Certificate.updateMany({ eventId: event._id }, { $unset: { pdfData: 1 } });
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

router.get("/assets/:assetId", async (req, res) => {
  try {
    if (!isValidEventId(req.params.assetId)) return res.status(404).end();
    const asset = await MediaAsset.findOne({ _id: req.params.assetId, scope: "certificate" }).lean();
    if (!asset?.data) return res.status(404).end();
    res.set({
      "Content-Type": asset.mimeType || "image/png",
      "Cache-Control": "public, max-age=86400",
    });
    res.send(Buffer.from(asset.data.buffer || asset.data));
  } catch (error) {
    console.error("Load certificate asset error:", error);
    res.status(500).end();
  }
});

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
    const [candidateRegs, attendanceRecords] = await Promise.all([
      Registration.find({
        _id: { $in: ids },
        eventId: event._id,
        status: "confirmed",
      }),
      Attendance.find({
        eventId: event._id,
        registrationId: { $in: ids },
      }).lean(),
    ]);
    const attByReg = new Map();
    for (const record of attendanceRecords) {
      const key = String(record.registrationId);
      if (!attByReg.has(key)) attByReg.set(key, []);
      attByReg.get(key).push(record);
    }
    const registrations = candidateRegs.filter((reg) => {
      const evalResult = evaluateRegistrationCertificateEligibility(
        event,
        reg,
        attByReg.get(String(reg._id)) || []
      );
      return evalResult.eligibilityStatus === "eligible";
    });
    const eligibleIds = new Set(registrations.map((item) => String(item._id)));
    const ineligible = ids.filter((id) => !eligibleIds.has(id));
    const issued = [];
    const alreadyIssued = [];
    const organization = await organizerOrganization(event);
    const images = await certificateImages(event);

    for (const registration of registrations) {
      const displayName = formatParticipantName(registration.name, "Participant");
      const existing = await Certificate.findOne({
        eventId: event._id,
        registrationId: registration._id,
      });
      if (existing && req.body.regenerate !== true) {
        alreadyIssued.push({ registrationId: registration._id, name: displayName });
        continue;
      }

      const generation = (existing?.generation || 0) + 1;
      const pdfData = await renderCertificate(event, registration, organization, images);
      const certificate = await Certificate.findOneAndUpdate(
        { eventId: event._id, registrationId: registration._id },
        {
          $set: {
            issuedTo: displayName,
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
      issued.push({ registrationId: registration._id, name: displayName, generation: certificate.generation });
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
  if (!isCertificatePdfStale(event, certificate, registration)) return certificate.pdfData;
  const organization = await organizerOrganization(event);
  const freshPdf = await generatePdf(event, registration, organization);
  const issuedName = formatParticipantName(registration.name, "Participant");
  if (certificate?._id) {
    await Certificate.updateOne(
      { _id: certificate._id },
      {
        $set: {
          pdfData: freshPdf,
          issuedTo: issuedName,
          email: registration.email,
          generatedAt: new Date(),
        },
      }
    );
  }
  return freshPdf;
}

router.get("/event/:eventId/:registrationId/download", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const [certificate, registration, attendanceRecords] = await Promise.all([
      Certificate.findOne({
        eventId: event._id,
        registrationId: req.params.registrationId,
      }).select("+pdfData"),
      Registration.findOne({
        _id: req.params.registrationId,
        eventId: event._id,
        status: "confirmed",
      }),
      Attendance.find({
        eventId: event._id,
        registrationId: req.params.registrationId,
      }).lean(),
    ]);
    const evalResult = registration
      ? evaluateRegistrationCertificateEligibility(event, registration, attendanceRecords)
      : null;
    if (!certificate || !registration || evalResult?.eligibilityStatus !== "eligible") {
      return res.status(404).json({ message: evalResult?.reason || "Eligible generated certificate not found." });
    }
    const pdf = await getCertificatePdf(event, registration, certificate);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="eventra-certificate-${registration._id}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    });
    res.send(pdf);
  } catch (error) {
    console.error("Download certificate error:", error);
    res.status(500).json({ message: "Could not download the certificate PDF." });
  }
});

/*
  PUBLIC CERTIFICATE STATUS FOR ATTENDEE (BY REGISTRATION ID)
*/
router.get("/public/:registrationId/status", async (req, res) => {
  try {
    const registration = await Registration.findOne({
      $or: [
        { registrationId: req.params.registrationId },
        { _id: isValidEventId(req.params.registrationId) ? req.params.registrationId : null },
      ],
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }

    const event = await Event.findById(registration.eventId).select(
      "title date startDate endDate eventDurationType days venue requireFeedbackForCertificate certificateEnabled certificateTitle certificateEligibilityRule"
    );

    if (!event) {
      return res.status(404).json({ message: "Associated event not found." });
    }

    const [certificate, attendanceRecords] = await Promise.all([
      Certificate.findOne({
        eventId: event._id,
        registrationId: registration._id,
      }).select("generatedAt generation lastEmailedAt"),
      Attendance.find({
        eventId: event._id,
        registrationId: registration._id,
      }).lean(),
    ]);

    const evalResult = evaluateRegistrationCertificateEligibility(event, registration, attendanceRecords);
    const attended = evalResult.attendedDayNumbers.length > 0 || evalResult.attendedSessionIds.length > 0 || isAttendedRegistration(registration);
    const feedbackSubmitted = registration.feedbackSubmitted === true;
    const requireFeedback = Boolean(event.requireFeedbackForCertificate);

    let eligible = false;
    let reason = "";

    if (!event.certificateEnabled) {
      reason = "Certificates are not enabled for this event.";
    } else if (!evalResult.eligibleByAttendance) {
      reason = evalResult.reason || "Attendance requirements were not met for this event.";
    } else if (evalResult.feedbackPending) {
      reason = "Participant feedback survey must be submitted before certificate access.";
    } else {
      eligible = true;
    }

    res.json({
      eligible,
      reason,
      attended,
      feedbackSubmitted,
      requireFeedback,
      eligibilityDetails: {
        attendedDays: evalResult.attendedDayNumbers,
        totalEventDays: evalResult.totalEventDays,
        attendedSessions: evalResult.attendedSessionIds,
        ruleMode: evalResult.ruleMode,
      },
      feedbackToken: registration.feedbackToken || null,
      certificateAvailable: Boolean(certificate),
      certificate: certificate
        ? {
            generatedAt: certificate.generatedAt,
            generation: certificate.generation,
          }
        : null,
      event: {
        title: event.title,
        date: event.date,
        startDate: event.startDate || event.date,
        endDate: event.endDate || event.date,
        eventDurationType: event.eventDurationType || "single_day",
        venue: event.venue,
        certificateTitle: event.certificateTitle,
      },
    });
  } catch (err) {
    console.error("Public certificate status error:", err);
    res.status(500).json({ message: "Could not retrieve certificate status." });
  }
});

/*
  PUBLIC CERTIFICATE DOWNLOAD FOR ATTENDEE (BY REGISTRATION ID)
*/
router.get("/public/:registrationId/download", async (req, res) => {
  try {
    const registration = await Registration.findOne({
      $or: [
        { registrationId: req.params.registrationId },
        { _id: isValidEventId(req.params.registrationId) ? req.params.registrationId : null },
      ],
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }

    const event = await Event.findById(registration.eventId);
    if (!event) {
      return res.status(404).json({ message: "Associated event not found." });
    }

    if (!event.certificateEnabled) {
      return res.status(403).json({ message: "Certificates are not enabled for this event." });
    }

    const attendanceRecords = await Attendance.find({
      eventId: event._id,
      registrationId: registration._id,
    }).lean();
    const evalResult = evaluateRegistrationCertificateEligibility(event, registration, attendanceRecords);

    if (!evalResult.eligibleByAttendance) {
      return res.status(403).json({
        message: evalResult.reason || "Attendance eligibility requirements for this certificate were not met.",
      });
    }

    if (evalResult.feedbackPending) {
      return res.status(403).json({
        message: "You must complete the event feedback survey before downloading your certificate.",
        feedbackRequired: true,
        feedbackToken: registration.feedbackToken,
      });
    }

    let certificate = await Certificate.findOne({
      eventId: event._id,
      registrationId: registration._id,
    }).select("+pdfData");

    let pdf;
    if (certificate && !isCertificatePdfStale(event, certificate, registration)) {
      pdf = certificate.pdfData;
    } else {
      const organization = await organizerOrganization(event);
      const images = await certificateImages(event);
      pdf = await renderCertificate(event, registration, organization, images);
      // Auto-save generated/refreshed certificate record without resetting generation counter
      certificate = await Certificate.findOneAndUpdate(
        { eventId: event._id, registrationId: registration._id },
        {
          $set: {
            issuedTo: formatParticipantName(registration.name, "Participant"),
            email: registration.email,
            generatedAt: new Date(),
            pdfData: pdf,
            storagePath: "",
          },
          $setOnInsert: {
            eventId: event._id,
            registrationId: registration._id,
            generation: 1,
          },
        },
        { upsert: true, new: true }
      );
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="eventra-certificate-${registration.registrationId || registration._id}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    });
    res.send(pdf);
  } catch (err) {
    console.error("Public certificate download error:", err);
    res.status(500).json({ message: "Could not download certificate." });
  }
});

router.post("/event/:eventId/:registrationId/email", requireAuth, async (req, res) => {
  try {
    const event = await findOwnedEvent(req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const [certificate, registration, attendanceRecords] = await Promise.all([
      Certificate.findOne({ eventId: event._id, registrationId: req.params.registrationId }).select("+pdfData"),
      Registration.findOne({
        _id: req.params.registrationId,
        eventId: event._id,
        status: "confirmed",
      }),
      Attendance.find({ eventId: event._id, registrationId: req.params.registrationId }).lean(),
    ]);

    const evalResult = registration
      ? evaluateRegistrationCertificateEligibility(event, registration, attendanceRecords)
      : null;

    if (!certificate || !registration || evalResult?.eligibilityStatus !== "eligible") {
      return res.status(404).json({ message: evalResult?.reason || "Eligible generated certificate not found." });
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
    const [registrations, attendanceRecords] = await Promise.all([
      Registration.find({
        _id: { $in: registrationIds },
        eventId: event._id,
        status: "confirmed",
      }),
      Attendance.find({
        eventId: event._id,
        registrationId: { $in: registrationIds },
      }).lean(),
    ]);
    const attByReg = new Map();
    for (const record of attendanceRecords) {
      const key = String(record.registrationId);
      if (!attByReg.has(key)) attByReg.set(key, []);
      attByReg.get(key).push(record);
    }
    const eligibleRegs = registrations.filter(
      (r) => evaluateRegistrationCertificateEligibility(event, r, attByReg.get(String(r._id)) || []).eligibilityStatus === "eligible"
    );
    const regMap = new Map(eligibleRegs.map((r) => [String(r._id), r]));

    const sent = [];
    const failed = [];
    const skipped = [];

    for (const cert of certificates) {
      const reg = regMap.get(String(cert.registrationId));
      if (!reg) {
        skipped.push({ registrationId: cert.registrationId, reason: "Ineligible or absent" });
        continue;
      }

      // Prevent duplicate emails within 5 minutes unless force is set or certificate design changed since last email
      const designTimestamp = getCertificateDesignTimestamp(event);
      const designChangedSinceEmail = Boolean(
        cert.lastEmailedAt &&
        designTimestamp &&
        new Date(cert.lastEmailedAt).getTime() < new Date(designTimestamp).getTime()
      );
      if (
        !designChangedSinceEmail &&
        cert.lastEmailedAt &&
        req.body.force !== true &&
        Date.now() - new Date(cert.lastEmailedAt).getTime() < 300000
      ) {
        skipped.push({ registrationId: reg._id, name: formatParticipantName(reg.name, "Participant"), reason: "Recently emailed" });
        continue;
      }

      try {
        const pdf = await getCertificatePdf(event, reg, cert);
        const result = await emailService.sendCertificateEmail(event, reg, pdf);
        if (result.success) {
          sent.push({ registrationId: reg._id, name: formatParticipantName(reg.name, "Participant"), email: reg.email });
        } else {
          failed.push({ registrationId: reg._id, name: formatParticipantName(reg.name, "Participant"), email: reg.email, error: result.error });
        }
      } catch (err) {
        failed.push({ registrationId: reg._id, name: formatParticipantName(reg.name, "Participant"), email: reg.email, error: err.message });
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
    if (!isGeminiConfigured()) {
      return res.json({
        configured: false,
        message: "Configure AI_API_KEY or GEMINI_API_KEY on the server to enable Gemini certificate suggestions.",
      });
    }

    const excludeTemplates = Array.isArray(req.body.excludeTemplates)
      ? req.body.excludeTemplates
          .map((tmpl) => String(tmpl || "").trim())
          .filter((tmpl) => CERTIFICATE_TEMPLATES.includes(tmpl))
      : [];

    const suggestion = await generateGeminiCertificateDesign({
      eventTitle: event.title,
      eventType: String(req.body.eventType || event.eventType || "").slice(0, 80),
      description: String(event.description || "").slice(0, 1500),
      customPrompt: String(req.body.customPrompt || "").slice(0, 300),
      currentTemplate: String(req.body.currentTemplate || event.certificateTemplate || "").slice(0, 40),
      excludeTemplates,
    });

    res.json({
      configured: true,
      suggestion,
      suggestions: suggestion.suggestions || [suggestion],
    });
  } catch (error) {
    console.error("Gemini certificate suggestion error:", error.message);
    res.status(502).json({ message: "Gemini AI certificate suggestion failed. Check your API key or try again." });
  }
});

export default router;
