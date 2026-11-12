import { formatParticipantName } from "./participantName.js";
import { normalizeCertificateEligibilityRule } from "./multiDay.js";

export const DEFAULT_CERTIFICATE_TITLE = "Certificate of Participation";
export const DEFAULT_CERTIFICATE_DESCRIPTION =
  "This certificate is proudly presented to {name} for participating in {event}.";
export const CERTIFICATE_TEMPLATES = [
  "classic",
  "modern",
  "academic",
  "royalGold",
  "techAurora",
  "emeraldExecutive",
  "crimsonLuxe",
  "vintageParchment",
];
export const CERTIFICATE_ORG_SIZES = ["sm", "md", "lg", "xl"];
export const CERTIFICATE_ORG_ALIGNS = ["left", "center", "right"];
export const CERTIFICATE_FONT_KEYS = ["theme", "serif", "sans", "italicSerif", "italicSans", "mono"];
export const CERTIFICATE_TEXT_ELEMENTS = ["organization", "title", "recipient", "description", "eventName"];

export const CERTIFICATE_TEXT_DEFAULTS = {
  organization: { defaultSize: 14, minSize: 8, maxSize: 30, presets: { sm: 10, md: 14, lg: 18, xl: 22 } },
  title: { defaultSize: 28, minSize: 14, maxSize: 44, presets: { sm: 20, md: 28, lg: 34, xl: 40 } },
  recipient: { defaultSize: 34, minSize: 16, maxSize: 48, presets: { sm: 24, md: 34, lg: 40, xl: 46 } },
  description: { defaultSize: 13, minSize: 8, maxSize: 24, presets: { sm: 10, md: 13, lg: 16, xl: 19 } },
  eventName: { defaultSize: 16, minSize: 9, maxSize: 32, presets: { sm: 12, md: 16, lg: 20, xl: 26 } },
};

export function normalizeCertificateTextStyles(rawStyles = {}, legacyOrg = {}) {
  const input = rawStyles && typeof rawStyles === "object" ? rawStyles : {};
  const result = {};
  const orgSizePresets = CERTIFICATE_TEXT_DEFAULTS.organization.presets;

  for (const key of CERTIFICATE_TEXT_ELEMENTS) {
    const spec = CERTIFICATE_TEXT_DEFAULTS[key];
    const entry = input[key] && typeof input[key] === "object" ? input[key] : {};

    const font = CERTIFICATE_FONT_KEYS.includes(entry.font) ? entry.font : "theme";
    let fontSize = parseOptionalNumber(entry.fontSize, spec.minSize, spec.maxSize);
    if (fontSize === null && key === "organization" && legacyOrg.size && orgSizePresets[legacyOrg.size]) {
      fontSize = orgSizePresets[legacyOrg.size];
    }

    let align = CERTIFICATE_ORG_ALIGNS.includes(entry.align) ? entry.align : null;
    if (align === null && key === "organization" && CERTIFICATE_ORG_ALIGNS.includes(legacyOrg.align)) {
      align = legacyOrg.align;
    }

    const x = parseOptionalNumber(entry.x, 6, 94);
    const y = parseOptionalNumber(entry.y, 6, 94);
    const hasPos = x !== null && y !== null;

    result[key] = {
      font,
      fontSize,
      align,
      x: hasPos ? x : null,
      y: hasPos ? y : null,
    };
  }

  return result;
}

export function resolveCertificateDescription(description, participant, event, date) {
  const pName = formatParticipantName(participant, "Participant");
  const eName = event || "Event";
  const dStr = date || "Event date";

  return (description || DEFAULT_CERTIFICATE_DESCRIPTION)
    .replaceAll("{participantName}", pName)
    .replaceAll("{name}", pName)
    .replaceAll("{eventName}", eName)
    .replaceAll("{event}", eName)
    .replaceAll("{eventDate}", dStr)
    .replaceAll("{date}", dStr)
    .replace(/\{[^{}]+\}/g, "")
    .trim();
}

export function isAttendedRegistration(registration) {
  return registration.status === "confirmed" && registration.checkedIn === true;
}

export function getCertificateDesignTimestamp(event) {
  return event?.certificateUpdatedAt || event?.updatedAt || null;
}

export function isCertificatePdfStale(event, certificate, registration = null) {
  if (!certificate || !certificate.pdfData?.length) return true;
  if (registration?.name && certificate.issuedTo) {
    const formattedName = formatParticipantName(registration.name, "Participant");
    if (certificate.issuedTo !== formattedName) return true;
  }
  const designTimestamp = getCertificateDesignTimestamp(event);
  if (!designTimestamp || !certificate.generatedAt) return false;
  return new Date(certificate.generatedAt).getTime() < new Date(designTimestamp).getTime();
}

function parseOptionalNumber(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(Math.min(max, Math.max(min, num)) * 100) / 100;
}

export function normalizeCertificateSettings(settings) {
  const logoX = parseOptionalNumber(settings.certificateLogoX, 2, 98);
  const logoY = parseOptionalNumber(settings.certificateLogoY, 2, 98);
  const hasLogoPos = logoX !== null && logoY !== null;

  const orgSize = CERTIFICATE_ORG_SIZES.includes(settings.certificateOrganizationSize)
    ? settings.certificateOrganizationSize
    : "md";
  const orgAlign = CERTIFICATE_ORG_ALIGNS.includes(settings.certificateOrganizationAlign)
    ? settings.certificateOrganizationAlign
    : "center";
  const certificateTextStyles = normalizeCertificateTextStyles(settings.certificateTextStyles, {
    size: orgSize,
    align: orgAlign,
  });

  const cleanOrg = String(settings.certificateOrganization || "").trim().slice(0, 100);

  return {
    certificateEnabled: settings.certificateEnabled === true,
    requireFeedbackForCertificate: settings.requireFeedbackForCertificate === true,
    certificateTemplate: CERTIFICATE_TEMPLATES.includes(settings.certificateTemplate)
      ? settings.certificateTemplate
      : "classic",
    certificateTitle: String(settings.certificateTitle || DEFAULT_CERTIFICATE_TITLE).trim().slice(0, 100),
    certificateDescription: String(
      settings.certificateDescription || DEFAULT_CERTIFICATE_DESCRIPTION
    ).trim().slice(0, 500),
    certificateEventTitle: String(settings.certificateEventTitle || "").trim().slice(0, 150),
    certificateShowOrganization: settings.certificateShowOrganization === true || Boolean(cleanOrg),
    certificateOrganization: cleanOrg,
    certificateOrganizationTagline: String(settings.certificateOrganizationTagline || "").trim().slice(0, 200),
    certificateOrganizationSize: orgSize,
    certificateOrganizationAlign: orgAlign,
    certificateOrganizationUppercase: settings.certificateOrganizationUppercase === true,
    certificateTextStyles,
    certificateLogoUrl: String(settings.certificateLogoUrl || "").trim(),
    certificateLogoPath: String(settings.certificateLogoPath || "").trim(),
    certificateLogoX: hasLogoPos ? logoX : null,
    certificateLogoY: hasLogoPos ? logoY : null,
    certificateLogoSize: parseOptionalNumber(settings.certificateLogoSize, 4, 30) ?? 8,
    eventType: String(settings.eventType || "").trim().slice(0, 80),
    signatures: Array.isArray(settings.signatures)
      ? settings.signatures.slice(0, 4).map((signature) => {
          const item = {
            name: String(signature.name || "").trim().slice(0, 100),
            role: String(signature.role || signature.designation || "").trim().slice(0, 100),
            designation: String(signature.role || signature.designation || "").trim().slice(0, 100),
            imageUrl: String(signature.imageUrl || "").trim(),
            imagePath: String(signature.imagePath || "").trim(),
          };
          const sigX = parseOptionalNumber(signature.x, 6, 94);
          const sigY = parseOptionalNumber(signature.y, 6, 94);
          const sigScale = parseOptionalNumber(signature.scale, 0.5, 2.2);
          if (sigX !== null && sigY !== null) {
            item.x = sigX;
            item.y = sigY;
          }
          if (sigScale !== null) {
            item.scale = sigScale;
          }
          return item;
        })
      : [],
    certificateEligibilityRule: normalizeCertificateEligibilityRule(settings.certificateEligibilityRule),
  };
}
