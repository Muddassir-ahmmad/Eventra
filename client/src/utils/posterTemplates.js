/**
 * EVENTRA Poster Template Engine
 * Generates professional vector SVG posters for standard event categories.
 */

export const POSTER_CATEGORIES = [
  {
    id: "technical",
    name: "Technical Events",
    badge: "TECH INNOVATION SUMMIT",
    themeColor: "#6366f1",
    accentColor: "#06b6d4",
    bgFrom: "#090d16",
    bgTo: "#1e1b4b",
    icon: "💻",
    tagline: "Explore cutting-edge tech, systems, and engineering.",
  },
  {
    id: "hackathon",
    name: "Hackathons",
    badge: "24-48H CODE & BUILD CHALLENGE",
    themeColor: "#10b981",
    accentColor: "#84cc16",
    bgFrom: "#051310",
    bgTo: "#064e3b",
    icon: "⚡",
    tagline: "Brainstorm, build fast prototypes, and ship real solutions.",
  },
  {
    id: "workshop",
    name: "Workshops",
    badge: "HANDS-ON SKILL MASTERCLASS",
    themeColor: "#0ea5e9",
    accentColor: "#f59e0b",
    bgFrom: "#082f49",
    bgTo: "#0f172a",
    icon: "🛠️",
    tagline: "Interactive practical learning guided by industry experts.",
  },
  {
    id: "conference",
    name: "Conferences",
    badge: "GLOBAL KEYNOTE & LEADERSHIP SUMMIT",
    themeColor: "#3b82f6",
    accentColor: "#fbbf24",
    bgFrom: "#0f172a",
    bgTo: "#172554",
    icon: "🌐",
    tagline: "Inspiring talks, keynote panels, and transformative discussions.",
  },
  {
    id: "college_fest",
    name: "College Festivals",
    badge: "ANNUAL INTER-COLLEGE FESTIVAL",
    themeColor: "#ec4899",
    accentColor: "#a855f7",
    bgFrom: "#2e1065",
    bgTo: "#701a75",
    icon: "🎉",
    tagline: "A celebration of student creativity, talent, and energy.",
  },
  {
    id: "seminar",
    name: "Seminars",
    badge: "ACADEMIC & RESEARCH SYMPOSIUM",
    themeColor: "#f59e0b",
    accentColor: "#d97706",
    bgFrom: "#18181b",
    bgTo: "#292524",
    icon: "🎓",
    tagline: "Deep domain research, scholarly perspectives, and insights.",
  },
  {
    id: "cultural",
    name: "Cultural Events",
    badge: "CELEBRATION OF ARTS & MUSIC",
    themeColor: "#f43f5e",
    accentColor: "#e11d48",
    bgFrom: "#450a0a",
    bgTo: "#831843",
    icon: "🎭",
    tagline: "Showcasing music, dance, theatre, and artistic expression.",
  },
  {
    id: "competition",
    name: "Competitions",
    badge: "CHAMPIONSHIP & CONTEST ARENA",
    themeColor: "#f97316",
    accentColor: "#ef4444",
    bgFrom: "#09090b",
    bgTo: "#7f1d1d",
    icon: "🏆",
    tagline: "Test your skills, compete with the best, and claim victory.",
  },
];

/**
 * Escapes characters for clean embedding in SVG text nodes.
 */
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates an SVG string for a given template configuration.
 */
export function generatePosterSvg({
  templateId = "technical",
  title = "EVENTRA SUMMIT",
  subtitle = "",
  date = "",
  venue = "",
  organizer = "EVENTRA",
  themeColor,
  accentColor,
}) {
  const tmpl = POSTER_CATEGORIES.find((c) => c.id === templateId) || POSTER_CATEGORIES[0];
  const primary = themeColor || tmpl.themeColor;
  const accent = accentColor || tmpl.accentColor;
  const safeTitle = escapeXml(title || "EVENT TITLE");
  const safeSubtitle = escapeXml(subtitle || tmpl.tagline);
  const safeDate = escapeXml(date || "Upcoming Event");
  const safeVenue = escapeXml(venue || "Main Auditorium / Hybrid");
  const safeOrganizer = escapeXml(organizer || "EVENTRA");
  const badgeText = escapeXml(tmpl.badge);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${tmpl.bgFrom}" />
      <stop offset="100%" stop-color="${tmpl.bgTo}" />
    </linearGradient>

    <!-- Glow Radial Gradients -->
    <radialGradient id="glowTopRight" cx="85%" cy="15%" r="50%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.38" />
      <stop offset="100%" stop-color="${primary}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowBottomLeft" cx="15%" cy="85%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>

    <!-- Grid Pattern Overlay -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>

    <!-- Clip Path for Card Accents -->
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.15" />
    </linearGradient>
  </defs>

  <!-- Base background -->
  <rect width="1200" height="675" fill="url(#bgGrad)" />
  <rect width="1200" height="675" fill="url(#grid)" />
  <rect width="1200" height="675" fill="url(#glowTopRight)" />
  <rect width="1200" height="675" fill="url(#glowBottomLeft)" />

  <!-- Geometric Abstract Line Accents -->
  <circle cx="1050" cy="120" r="180" fill="none" stroke="${primary}" stroke-opacity="0.18" stroke-width="2" />
  <circle cx="1050" cy="120" r="260" fill="none" stroke="${accent}" stroke-opacity="0.1" stroke-width="1.5" stroke-dasharray="8 6" />
  <circle cx="120" cy="560" r="220" fill="none" stroke="${primary}" stroke-opacity="0.12" stroke-width="1.5" />

  <!-- Top Brand Line -->
  <g transform="translate(80, 75)">
    <rect width="130" height="34" rx="6" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" />
    <text x="65" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#ffffff" letter-spacing="2" text-anchor="middle">EVENTRA</text>

    <!-- Category Pill -->
    <rect x="145" y="0" width="360" height="34" rx="6" fill="url(#badgeGrad)" stroke="${primary}" stroke-opacity="0.4" />
    <text x="325" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="${primary}" letter-spacing="1.5" text-anchor="middle">${badgeText}</text>
  </g>

  <!-- Main Hero Titles -->
  <g transform="translate(80, 235)">
    <!-- Event Title (Multi-line friendly via SVG text) -->
    <text x="0" y="50" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-1.5">
      ${safeTitle}
    </text>

    <!-- Subtitle / Tagline -->
    <text x="0" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="400" fill="rgba(255,255,255,0.72)">
      ${safeSubtitle}
    </text>

    <!-- Divider Bar -->
    <rect x="0" y="150" width="120" height="4" rx="2" fill="${accent}" />
  </g>

  <!-- Bottom Event Metadata Cards -->
  <g transform="translate(80, 480)">
    <!-- Date Card -->
    <rect x="0" y="0" width="310" height="96" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
    <text x="24" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="${accent}" letter-spacing="1">EVENT DATE &amp; TIME</text>
    <text x="24" y="68" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff">${safeDate}</text>

    <!-- Venue Card -->
    <rect x="330" y="0" width="350" height="96" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
    <text x="354" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="${primary}" letter-spacing="1">LOCATION &amp; VENUE</text>
    <text x="354" y="68" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff">${safeVenue}</text>

    <!-- Organizer Card -->
    <rect x="700" y="0" width="340" height="96" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
    <text x="724" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="rgba(255,255,255,0.5)" letter-spacing="1">ORGANIZED BY</text>
    <text x="724" y="68" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff">${safeOrganizer}</text>
  </g>

  <!-- Modern Corner Watermark -->
  <text x="1120" y="630" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="rgba(255,255,255,0.25)" text-anchor="end">SMART EVENT MANAGEMENT</text>
</svg>
  `.trim();
}

/**
 * Returns a base64 Data URL of the generated SVG poster for direct use in <img src="..." />.
 */
export function generatePosterDataUrl(config) {
  const svg = generatePosterSvg(config);
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

