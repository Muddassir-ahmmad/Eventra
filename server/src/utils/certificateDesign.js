export const DEFAULT_CERTIFICATE_TITLE = "Certificate of Participation";
export const DEFAULT_CERTIFICATE_DESCRIPTION =
  "This certificate is proudly presented to {name} for participating in {event}.";
export const CERTIFICATE_TEMPLATES = ["classic", "modern", "academic"];

export function resolveCertificateDescription(description, participant, event, date) {
  return (description || DEFAULT_CERTIFICATE_DESCRIPTION)
    .replaceAll("{name}", participant || "Participant")
    .replaceAll("{event}", event || "Event")
    .replaceAll("{date}", date || "Event date")
    .replace(/\{[^{}]+\}/g, "")
    .trim();
}

export function isAttendedRegistration(registration) {
  return registration.status === "confirmed" && registration.checkedIn === true;
}

export function normalizeCertificateSettings(settings) {
  return {
    certificateEnabled: settings.certificateEnabled === true,
    certificateTemplate: CERTIFICATE_TEMPLATES.includes(settings.certificateTemplate)
      ? settings.certificateTemplate
      : "classic",
    certificateTitle: String(settings.certificateTitle || DEFAULT_CERTIFICATE_TITLE).trim().slice(0, 100),
    certificateDescription: String(
      settings.certificateDescription || DEFAULT_CERTIFICATE_DESCRIPTION
    ).trim().slice(0, 500),
    certificateShowOrganization: settings.certificateShowOrganization !== false,
    certificateLogoUrl: String(settings.certificateLogoUrl || "").trim(),
    certificateLogoPath: String(settings.certificateLogoPath || "").trim(),
    eventType: String(settings.eventType || "").trim().slice(0, 80),
    signatures: Array.isArray(settings.signatures)
      ? settings.signatures.slice(0, 4).map((signature) => ({
          name: String(signature.name || "").trim().slice(0, 100),
          role: String(signature.role || signature.designation || "").trim().slice(0, 100),
          designation: String(signature.role || signature.designation || "").trim().slice(0, 100),
          imageUrl: String(signature.imageUrl || "").trim(),
          imagePath: String(signature.imagePath || "").trim(),
        }))
      : [],
  };
}
