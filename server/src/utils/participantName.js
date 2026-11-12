/**
 * Formats a participant's display name so lowercase words start with an uppercase letter
 * while preserving intentional mixed casing (e.g. McDonald) and trimming extra spaces.
 */
export function formatParticipantName(name, fallback = "") {
  const normalized = String(name || "").trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.replace(/(^|[\s.-])(\p{Ll})/gu, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
}
