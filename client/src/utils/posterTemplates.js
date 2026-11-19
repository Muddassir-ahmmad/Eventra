/**
 * EVENTRA Ultra-HD Poster Template Engine
 * Generates world-class vector SVG posters with category-specific graphic art,
 * intelligent multi-line typography wrapping, glassmorphic styling, and dual
 * aspect ratio support (Landscape Banner 16:9 & Portrait Flyer 4:5).
 */

export const POSTER_CATEGORIES = [
  {
    id: "technical",
    name: "Technical & IT",
    badge: "TECH INNOVATION SUMMIT",
    themeColor: "#6366f1",
    accentColor: "#06b6d4",
    bgFrom: "#060913",
    bgTo: "#0f172a",
    icon: "💻",
    tagline: "Explore cutting-edge architectures, AI systems, and engineering.",
    styleBadge: "CYBER MATRIX",
  },
  {
    id: "hackathon",
    name: "Hackathons",
    badge: "BUILD & SHIP CODE CHALLENGE",
    themeColor: "#10b981",
    accentColor: "#22c55e",
    bgFrom: "#04140e",
    bgTo: "#062e24",
    icon: "⚡",
    tagline: "Brainstorm, build rapid prototypes, and deploy real solutions.",
    styleBadge: "BUILDER PULSE",
  },
  {
    id: "workshop",
    name: "Workshops & Labs",
    badge: "HANDS-ON SKILL MASTERCLASS",
    themeColor: "#0ea5e9",
    accentColor: "#f59e0b",
    bgFrom: "#051c2c",
    bgTo: "#0f172a",
    icon: "🛠️",
    tagline: "Interactive practical labs guided directly by industry experts.",
    styleBadge: "SWISS BLUEPRINT",
  },
  {
    id: "conference",
    name: "Conferences & Summits",
    badge: "GLOBAL KEYNOTE & LEADERSHIP",
    themeColor: "#3b82f6",
    accentColor: "#fbbf24",
    bgFrom: "#0b1120",
    bgTo: "#1e1b4b",
    icon: "🌐",
    tagline: "Inspiring talks, high-impact keynotes, and executive panels.",
    styleBadge: "EXECUTIVE LUXE",
  },
  {
    id: "college_fest",
    name: "College Festivals",
    badge: "ANNUAL INTER-COLLEGE FESTIVAL",
    themeColor: "#ec4899",
    accentColor: "#a855f7",
    bgFrom: "#1f0730",
    bgTo: "#4a044e",
    icon: "🎉",
    tagline: "A high-octane celebration of student energy, talent, and creativity.",
    styleBadge: "CARNIVAL POP",
  },
  {
    id: "seminar",
    name: "Academic Seminars",
    badge: "RESEARCH & ACADEMIC SYMPOSIUM",
    themeColor: "#f59e0b",
    accentColor: "#10b981",
    bgFrom: "#181410",
    bgTo: "#292524",
    icon: "🎓",
    tagline: "Scholarly publications, domain research, and intellectual discourse.",
    styleBadge: "SCHOLAR HERITAGE",
  },
  {
    id: "cultural",
    name: "Cultural & Arts",
    badge: "CELEBRATION OF ARTS & MUSIC",
    themeColor: "#f43f5e",
    accentColor: "#fb7185",
    bgFrom: "#2c0613",
    bgTo: "#4c0519",
    icon: "🎭",
    tagline: "Vibrant showcase of music, stage theatre, dance, and fine arts.",
    styleBadge: "THEATRIC NOIR",
  },
  {
    id: "competition",
    name: "Competitions & Esports",
    badge: "CHAMPIONSHIP ARENA CONTEST",
    themeColor: "#f97316",
    accentColor: "#ef4444",
    bgFrom: "#160707",
    bgTo: "#431407",
    icon: "🏆",
    tagline: "Compete with top contenders, prove your prowess, and take the crown.",
    styleBadge: "OCTANE ARENA",
  },
];

export const POSTER_STYLES = [
  { id: "cyber", name: "Cyberpunk Neon", description: "High-tech matrix grid with neon accents and circuit traces" },
  { id: "glass", name: "Modern Glassmorphic", description: "Translucent frosted acrylic cards with vivid aurora glow" },
  { id: "executive", name: "Executive Luxe", description: "Authoritative dark sapphire with 24k gold foil highlights" },
  { id: "minimal", name: "Swiss Architectural", description: "Bold modernist typography, clean rules, and blueprint precision" },
  { id: "vibrant", name: "Festival Pop Energy", description: "Radiant saturated bursts, particle dust, and party wave ribbons" },
];

/**
 * Escapes characters for clean embedding in SVG text nodes.
 */
export function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Intelligent line wrapper that splits text cleanly without breaking words.
 */
export function wrapText(text, maxCharsPerLine = 26, maxLines = 3) {
  if (!text) return [];
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  // If there are still words remaining, append ellipsis to the last line
  const wordCountInLines = lines.join(" ").split(/\s+/).length;
  if (wordCountInLines < words.length && lines.length > 0) {
    const lastIdx = lines.length - 1;
    if (lines[lastIdx].length + 3 <= maxCharsPerLine + 3) {
      lines[lastIdx] += "…";
    }
  }

  return lines;
}

/**
 * Generates category-specific vector artwork for the poster.
 */
function renderCategoryArtwork(category, primary, accent, isPortrait = false) {
  switch (category) {
    case "technical":
      // High-tech circuit board traces, solder dots, and glowing code bracket
      return `
        <g id="art-technical" opacity="0.85">
          <!-- Circuit Board Traces -->
          <path d="${isPortrait ? "M 200 240 L 400 240 L 460 300 L 750 300" : "M 750 180 L 920 180 L 980 240 L 1100 240"}" fill="none" stroke="${primary}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="8 4" opacity="0.6"/>
          <path d="${isPortrait ? "M 300 180 L 480 180 L 540 240 L 800 240" : "M 800 120 L 960 120 L 1020 180 L 1140 180"}" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
          <path d="${isPortrait ? "M 250 340 L 450 340 L 520 400 L 780 400" : "M 780 320 L 900 320 L 960 380 L 1120 380"}" fill="none" stroke="${primary}" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>
          <!-- Terminal / Solder Nodes -->
          <circle cx="${isPortrait ? "400" : "920"}" cy="${isPortrait ? "240" : "180"}" r="5" fill="${accent}" />
          <circle cx="${isPortrait ? "460" : "980"}" cy="${isPortrait ? "300" : "240"}" r="7" fill="${primary}" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="${isPortrait ? "540" : "1020"}" cy="${isPortrait ? "240" : "180"}" r="4" fill="${accent}" />
          <!-- Neon Tech Bracket Glyph -->
          <g transform="translate(${isPortrait ? "500, 270" : "960, 260"})">
            <rect x="-70" y="-70" width="140" height="140" rx="28" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2" stroke-opacity="0.5" filter="url(#glowFilter)"/>
            <path d="M -24 -24 L -40 0 L -24 24" fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M 24 -24 L 40 0 L 24 24" fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="-10" y1="20" x2="10" y2="-20" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
          </g>
        </g>
      `;

    case "hackathon":
      // Lightning bolt, code terminal prompt, pulse wave
      return `
        <g id="art-hackathon" opacity="0.9">
          <!-- Pulse wave -->
          <path d="${isPortrait ? "M 150 280 Q 300 240 450 280 T 750 280" : "M 750 240 L 840 240 L 860 190 L 890 290 L 920 220 L 945 255 L 960 240 L 1120 240"}" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
          <!-- Central Hexagon & Bolt Badge -->
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})">
            <polygon points="0,-75 65,-38 65,38 0,75 -65,38 -65,-38" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <polygon points="0,-85 75,-43 75,43 0,85 -75,43 -75,-43" fill="none" stroke="${accent}" stroke-width="1.2" stroke-dasharray="6 4" opacity="0.6"/>
            <!-- Lightning Bolt -->
            <polygon points="8,-35 -24,4 -2,4 -10,38 24,-2 2,-2" fill="${accent}" stroke="#ffffff" stroke-width="1.5" />
          </g>
          <!-- Terminal Tag Badge -->
          <g transform="translate(${isPortrait ? "500, 370" : "960, 350"})">
            <rect x="-90" y="-15" width="180" height="30" rx="15" fill="#061f18" stroke="${accent}" stroke-width="1.5" opacity="0.95"/>
            <text x="0" y="5" font-family="'JetBrains Mono', monospace, Consolas" font-size="12" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="1.5">&gt;_ BUILD // SHIP</text>
          </g>
        </g>
      `;

    case "workshop":
      // Swiss architectural blueprint, compass rings, skill lab badge
      return `
        <g id="art-workshop" opacity="0.85">
          <circle cx="${isPortrait ? "500" : "960"}" cy="${isPortrait ? "260" : "240"}" r="110" fill="none" stroke="${primary}" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.4"/>
          <circle cx="${isPortrait ? "500" : "960"}" cy="${isPortrait ? "260" : "240"}" r="80" fill="none" stroke="${accent}" stroke-width="2" opacity="0.6"/>
          <!-- Blueprint angle lines -->
          <line x1="${isPortrait ? "420" : "880"}" y1="${isPortrait ? "180" : "160"}" x2="${isPortrait ? "580" : "1040"}" y2="${isPortrait ? "340" : "320"}" stroke="${primary}" stroke-width="1" opacity="0.4"/>
          <line x1="${isPortrait ? "580" : "1040"}" y1="${isPortrait ? "180" : "160"}" x2="${isPortrait ? "420" : "880"}" y2="${isPortrait ? "340" : "320"}" stroke="${primary}" stroke-width="1" opacity="0.4"/>
          <!-- Central Craft Badge -->
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})">
            <circle cx="0" cy="0" r="54" fill="url(#cardGrad)" stroke="${accent}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <!-- Wrench / Tool Vector -->
            <path d="M -14 -14 L 14 14 M -6 -22 C -18 -18 -18 -6 -14 -2 L 14 26 C 18 30 24 24 20 20 L 2 -14 C 6 -18 -2 -26 -6 -22 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          </g>
          <!-- Precision Badge -->
          <g transform="translate(${isPortrait ? "500, 360" : "960, 345"})">
            <rect x="-85" y="-14" width="170" height="28" rx="6" fill="#082236" stroke="${primary}" stroke-width="1.5"/>
            <text x="0" y="5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">HANDS-ON LAB</text>
          </g>
        </g>
      `;

    case "conference":
      // World globe mesh, crystal prism, luxury keynote laurels
      return `
        <g id="art-conference" opacity="0.9">
          <!-- Globe Latitudes / Longitudes -->
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})" opacity="0.5">
            <circle cx="0" cy="0" r="85" fill="none" stroke="${primary}" stroke-width="2"/>
            <ellipse cx="0" cy="0" rx="85" ry="32" fill="none" stroke="${accent}" stroke-width="1.5"/>
            <ellipse cx="0" cy="0" rx="36" ry="85" fill="none" stroke="${primary}" stroke-width="1.5"/>
            <line x1="-85" y1="0" x2="85" y2="0" stroke="${accent}" stroke-width="1.5" stroke-dasharray="6 4"/>
          </g>
          <!-- Central Executive Crest -->
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})">
            <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" fill="url(#cardGrad)" stroke="${accent}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <!-- Microphone / Keynote Icon -->
            <rect x="-8" y="-22" width="16" height="28" rx="8" fill="${accent}" stroke="#ffffff" stroke-width="1.5"/>
            <path d="M -16 -6 C -16 12 16 12 16 -6" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="0" y1="14" x2="0" y2="25" stroke="#ffffff" stroke-width="2.5"/>
            <line x1="-10" y1="25" x2="10" y2="25" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
          </g>
          <!-- Global Keynote Tag -->
          <g transform="translate(${isPortrait ? "500, 360" : "960, 345"})">
            <rect x="-95" y="-14" width="190" height="28" rx="14" fill="#0c1733" stroke="${accent}" stroke-width="1.5"/>
            <text x="0" y="5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="1.5">GLOBAL KEYNOTE</text>
          </g>
        </g>
      `;

    case "college_fest":
      // Confetti burst, radiant wave ribbons, party stars
      return `
        <g id="art-fest" opacity="0.95">
          <!-- Confetti Elements -->
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})">
            <!-- Radiant Star Burst -->
            <path d="M 0 -85 L 14 -32 L 65 -45 L 32 -4 L 80 15 L 26 22 L 35 75 L -4 35 L -48 68 L -28 18 L -82 -4 L -30 -16 Z" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2" filter="url(#glowFilter)"/>
            <!-- Sparkles -->
            <polygon points="0,-40 6,-12 34,-6 6,0 0,28 -6,0 -34,-6 -6,-12" fill="${accent}"/>
            <circle cx="-60" cy="-60" r="6" fill="${accent}" />
            <circle cx="70" cy="-50" r="5" fill="#facc15" />
            <circle cx="-65" cy="55" r="7" fill="${primary}" />
            <circle cx="60" cy="65" r="8" fill="${accent}" />
            <!-- Musical notes -->
            <path d="M -15 -10 L -15 15 A 8 6 0 1 1 -23 9 L -23 -14 L 15 -22 L 15 5 A 8 6 0 1 1 7 -1 L 7 -17 Z" fill="#ffffff" opacity="0.9"/>
          </g>
          <!-- Carnival Tag -->
          <g transform="translate(${isPortrait ? "500, 365" : "960, 350"})">
            <rect x="-85" y="-15" width="170" height="30" rx="15" fill="#300938" stroke="${primary}" stroke-width="2"/>
            <text x="0" y="5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">CARNIVAL VIBE</text>
          </g>
        </g>
      `;

    case "seminar":
      // Distinguished laurel wreath, academic crest shield, classical rules
      return `
        <g id="art-seminar" opacity="0.9">
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})">
            <!-- Shield Outline -->
            <path d="M 0 -65 Q 45 -65 52 -20 Q 52 35 0 65 Q -52 35 -52 -20 Q -45 -65 0 -65 Z" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <path d="M 0 -55 Q 38 -55 42 -18 Q 42 28 0 55 Q -42 28 -42 -18 Q -38 -55 0 -55 Z" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.6"/>
            <!-- Graduation Mortarboard / Book -->
            <polygon points="0,-22 28,-8 0,6 -28,-8" fill="${primary}" stroke="#ffffff" stroke-width="1.5"/>
            <path d="M -18 -2 L -18 16 Q 0 26 18 16 L 18 -2" fill="none" stroke="#ffffff" stroke-width="2"/>
            <line x1="28" y1="-8" x2="34" y2="10" stroke="${accent}" stroke-width="2"/>
          </g>
          <!-- Laurel Branches Around -->
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})" stroke="${accent}" fill="none" stroke-width="2" opacity="0.75">
            <path d="M -60 20 C -75 0 -70 -35 -55 -55" stroke-linecap="round"/>
            <path d="M 60 20 C 75 0 70 -35 55 -55" stroke-linecap="round"/>
          </g>
          <!-- Symposium Tag -->
          <g transform="translate(${isPortrait ? "500, 360" : "960, 345"})">
            <rect x="-95" y="-14" width="190" height="28" rx="6" fill="#241b12" stroke="${primary}" stroke-width="1.5"/>
            <text x="0" y="5" font-family="'Times New Roman', serif, Georgia" font-size="12" font-weight="700" fill="${primary}" text-anchor="middle" letter-spacing="2">ACADEMIC FORUM</text>
          </g>
        </g>
      `;

    case "cultural":
      // Dramatic stage spotlight beams, theatrical mask motifs
      return `
        <g id="art-cultural" opacity="0.9">
          <!-- Spotlight Cones -->
          <polygon points="${isPortrait ? "250,50 400,280 460,280 350,50" : "800,20 900,280 960,280 880,20"}" fill="${primary}" opacity="0.15"/>
          <polygon points="${isPortrait ? "750,50 600,280 540,280 650,50" : "1100,20 1020,280 960,280 1020,20"}" fill="${accent}" opacity="0.15"/>
          <!-- Mask & Drama Frame -->
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})">
            <circle cx="0" cy="0" r="65" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <!-- Theatrical Mask Glyph -->
            <path d="M -22 -15 Q 0 -22 22 -15 Q 26 15 0 28 Q -26 15 -22 -15 Z" fill="none" stroke="#ffffff" stroke-width="2.5"/>
            <circle cx="-9" cy="-5" r="3.5" fill="${accent}"/>
            <circle cx="9" cy="-5" r="3.5" fill="${accent}"/>
            <path d="M -9 12 Q 0 18 9 12" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          </g>
          <!-- Arts Tag -->
          <g transform="translate(${isPortrait ? "500, 360" : "960, 345"})">
            <rect x="-90" y="-14" width="180" height="28" rx="14" fill="#380816" stroke="${primary}" stroke-width="1.8"/>
            <text x="0" y="5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">STAGE &amp; MUSIC</text>
          </g>
        </g>
      `;

    case "competition":
    default:
      // High-octane speed chevrons, championship trophy shield, victory stars
      return `
        <g id="art-competition" opacity="0.95">
          <!-- Speed Chevrons -->
          <g fill="${accent}" opacity="0.25">
            <polygon points="${isPortrait ? "380,220 400,220 420,260 400,260" : "800,200 825,200 850,240 825,240"}"/>
            <polygon points="${isPortrait ? "420,220 440,220 460,260 440,260" : "845,200 870,200 895,240 870,240"}"/>
            <polygon points="${isPortrait ? "460,220 480,220 500,260 480,260" : "890,200 915,200 940,240 915,240"}"/>
          </g>
          <!-- Trophy Shield -->
          <g transform="translate(${isPortrait ? "500, 260" : "960, 240"})">
            <polygon points="0,-70 58,-40 45,35 0,70 -45,35 -58,-40" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <!-- Golden Cup -->
            <path d="M -16 -22 L 16 -22 L 12 4 Q 0 14 -12 4 Z" fill="${accent}" stroke="#ffffff" stroke-width="1.5"/>
            <path d="M -16 -16 C -24 -16 -24 -4 -14 -4" fill="none" stroke="#ffffff" stroke-width="2"/>
            <path d="M 16 -16 C 24 -16 24 -4 14 -4" fill="none" stroke="#ffffff" stroke-width="2"/>
            <line x1="0" y1="12" x2="0" y2="22" stroke="#ffffff" stroke-width="3"/>
            <line x1="-12" y1="22" x2="12" y2="22" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          </g>
          <!-- Arena Tag -->
          <g transform="translate(${isPortrait ? "500, 365" : "960, 350"})">
            <rect x="-90" y="-15" width="180" height="30" rx="8" fill="#300d07" stroke="${accent}" stroke-width="2"/>
            <text x="0" y="5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">CHAMPION ARENA</text>
          </g>
        </g>
      `;
  }
}

/**
 * Generates an SVG string for a given template configuration.
 * Supports both Landscape (1200x675) and Portrait (1000x1250).
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
  aspectRatio = "landscape", // 'landscape' | 'portrait'
  style = "cyber",
}) {
  const tmpl = POSTER_CATEGORIES.find((c) => c.id === templateId) || POSTER_CATEGORIES[0];
  const primary = themeColor || tmpl.themeColor;
  const accent = accentColor || tmpl.accentColor;
  const isPortrait = aspectRatio === "portrait";

  const safeRawTitle = (title || "EVENT TITLE").trim();
  const safeSubtitle = (subtitle || tmpl.tagline).trim();
  const safeDate = escapeXml(date || "Upcoming Event");
  const safeVenue = escapeXml(venue || "Main Auditorium / Hybrid");
  const safeOrganizer = escapeXml(organizer || "EVENTRA");
  const badgeText = escapeXml(tmpl.badge);

  // Dynamic Typography Configuration based on Title Length
  const titleLen = safeRawTitle.length;
  let titleFontSize = 52;
  let titleLineHeight = 60;
  let maxCharsPerLine = 24;

  if (isPortrait) {
    if (titleLen <= 18) {
      titleFontSize = 64;
      titleLineHeight = 74;
      maxCharsPerLine = 18;
    } else if (titleLen <= 35) {
      titleFontSize = 52;
      titleLineHeight = 62;
      maxCharsPerLine = 22;
    } else if (titleLen <= 60) {
      titleFontSize = 42;
      titleLineHeight = 50;
      maxCharsPerLine = 26;
    } else {
      titleFontSize = 34;
      titleLineHeight = 42;
      maxCharsPerLine = 32;
    }
  } else {
    // Landscape
    if (titleLen <= 18) {
      titleFontSize = 56;
      titleLineHeight = 66;
      maxCharsPerLine = 22;
    } else if (titleLen <= 38) {
      titleFontSize = 46;
      titleLineHeight = 54;
      maxCharsPerLine = 28;
    } else if (titleLen <= 65) {
      titleFontSize = 38;
      titleLineHeight = 46;
      maxCharsPerLine = 34;
    } else {
      titleFontSize = 30;
      titleLineHeight = 38;
      maxCharsPerLine = 40;
    }
  }

  const titleLines = wrapText(safeRawTitle, maxCharsPerLine, 3);
  const subtitleLines = wrapText(safeSubtitle, isPortrait ? 44 : 50, 2);

  const categoryArt = renderCategoryArtwork(tmpl.id, primary, accent, isPortrait);

  // Dimensions
  const W = isPortrait ? 1000 : 1200;
  const H = isPortrait ? 1250 : 675;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <!-- Background Multi-Stop Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${tmpl.bgFrom}" />
      <stop offset="50%" stop-color="#0a0f1d" />
      <stop offset="100%" stop-color="${tmpl.bgTo}" />
    </linearGradient>

    <!-- Glowing Aurora Gradients -->
    <radialGradient id="glowTop" cx="${isPortrait ? "50%" : "85%"}" cy="${isPortrait ? "25%" : "20%"}" r="${isPortrait ? "55%" : "50%"}">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.45" />
      <stop offset="50%" stop-color="${primary}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="${primary}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowBottom" cx="${isPortrait ? "30%" : "15%"}" cy="${isPortrait ? "80%" : "85%"}" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35" />
      <stop offset="60%" stop-color="${accent}" stop-opacity="0.08" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>

    <!-- Hero Title Gradient -->
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="${accent}" />
    </linearGradient>

    <!-- Glassmorphic Card Fill -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
    </linearGradient>

    <linearGradient id="pillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.2" />
    </linearGradient>

    <!-- Drop Shadows & Glow Filters -->
    <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.45" />
    </filter>

    <!-- Micro Grid Texture -->
    <pattern id="microGrid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1"/>
      <circle cx="36" cy="36" r="1" fill="rgba(255,255,255,0.06)" />
    </pattern>
  </defs>

  <!-- ================= BASE CANVAS & LIGHTING ================= -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)" />
  <rect width="${W}" height="${H}" fill="url(#microGrid)" />
  <rect width="${W}" height="${H}" fill="url(#glowTop)" />
  <rect width="${W}" height="${H}" fill="url(#glowBottom)" />

  <!-- Outer Architectural Border Line -->
  <rect x="25" y="25" width="${W - 50}" height="${H - 50}" rx="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
  <rect x="29" y="29" width="${W - 58}" height="${H - 58}" rx="14" fill="none" stroke="${primary}" stroke-opacity="0.2" stroke-width="1" stroke-dasharray="8 6"/>

  <!-- Geometric Corner Crosshairs -->
  <g stroke="${primary}" stroke-width="1.5" opacity="0.6">
    <line x1="20" y1="25" x2="35" y2="25" />
    <line x1="25" y1="20" x2="25" y2="35" />
    <line x1="${W - 35}" y1="25" x2="${W - 20}" y2="25" />
    <line x1="${W - 25}" y1="20" x2="${W - 25}" y2="35" />
    <line x1="20" y1="${H - 25}" x2="35" y2="${H - 25}" />
    <line x1="25" y1="${H - 35}" x2="25" y2="${H - 20}" />
    <line x1="${W - 35}" y1="${H - 25}" x2="${W - 20}" y2="${H - 25}" />
    <line x1="${W - 25}" y1="${H - 35}" x2="${W - 25}" y2="${H - 20}" />
  </g>

  <!-- ================= CATEGORY ARTWORK LAYER ================= -->
  ${categoryArt}

  <!-- ================= TOP HEADER BRAND & PILL ================= -->
  <g transform="translate(60, 55)">
    <!-- Eventra Logo Pill -->
    <rect width="135" height="36" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" />
    <circle cx="22" cy="18" r="6" fill="${primary}" />
    <text x="78" y="23" font-family="'Manrope', -apple-system, sans-serif" font-size="12" font-weight="900" fill="#ffffff" letter-spacing="2.5" text-anchor="middle">EVENTRA</text>

    <!-- Category Badge Pill -->
    <rect x="150" y="0" width="${isPortrait ? "420" : "360"}" height="36" rx="8" fill="url(#pillGrad)" stroke="${primary}" stroke-opacity="0.45" />
    <text x="${isPortrait ? "360" : "330"}" y="23" font-family="'Manrope', -apple-system, sans-serif" font-size="11" font-weight="800" fill="${primary}" letter-spacing="1.8" text-anchor="middle">${badgeText}</text>

    <!-- Right-aligned Verified Badge -->
    <g transform="translate(${isPortrait ? W - 250 : W - 250}, 0)">
      <rect width="130" height="36" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
      <text x="65" y="23" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="1.5" text-anchor="middle">OFFICIAL EVENT</text>
    </g>
  </g>

  <!-- ================= HERO TYPOGRAPHY SECTION ================= -->
  ${
    isPortrait
      ? `
  <!-- PORTRAIT HERO TYPOGRAPHY -->
  <g transform="translate(60, 480)">
    <!-- Category Icon & Micro Tagline -->
    <g transform="translate(0, 0)">
      <rect width="42" height="42" rx="10" fill="url(#pillGrad)" stroke="${primary}" stroke-opacity="0.5"/>
      <text x="21" y="27" font-size="20" text-anchor="middle">${tmpl.icon}</text>
      <text x="56" y="26" font-family="'Manrope', sans-serif" font-size="13" font-weight="800" fill="${accent}" letter-spacing="2">${tmpl.styleBadge} SHOWCASE</text>
    </g>

    <!-- Main Title with Multi-line Wrapping -->
    <g transform="translate(0, 60)">
      ${titleLines
        .map(
          (line, idx) => `
        <text x="0" y="${idx * titleLineHeight + 45}" font-family="'Manrope', -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="900" fill="url(#titleGrad)" letter-spacing="-1.5" filter="url(#softShadow)">
          ${escapeXml(line)}
        </text>
      `
        )
        .join("")}
    </g>

    <!-- Subtitle / Tagline -->
    <g transform="translate(0, ${titleLines.length * titleLineHeight + 110})">
      ${subtitleLines
        .map(
          (subLine, subIdx) => `
        <text x="0" y="${subIdx * 28 + 10}" font-family="'Inter', -apple-system, sans-serif" font-size="18" font-weight="400" fill="#cbd5e1" opacity="0.9">
          ${escapeXml(subLine)}
        </text>
      `
        )
        .join("")}
      <line x1="0" y1="${subtitleLines.length * 28 + 25}" x2="160" y2="${subtitleLines.length * 28 + 25}" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
    </g>
  </g>

  <!-- PORTRAIT BOTTOM METADATA CARDS -->
  <g transform="translate(60, 840)">
    <!-- Date Card -->
    <g transform="translate(0, 0)">
      <rect width="880" height="90" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
      <rect x="20" y="20" width="50" height="50" rx="12" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-opacity="0.4"/>
      <!-- Calendar Icon -->
      <path d="M 37 36 L 53 36 M 37 44 L 47 44 M 40 30 L 40 33 M 50 30 L 50 33 M 34 33 L 56 33 Q 58 33 58 35 L 58 53 Q 58 55 56 55 L 34 55 Q 32 55 32 53 L 32 35 Q 32 33 34 33 Z" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
      <text x="85" y="42" font-family="'Manrope', sans-serif" font-size="12" font-weight="800" fill="${accent}" letter-spacing="1.5">DATE &amp; TIME</text>
      <text x="85" y="66" font-family="'Manrope', sans-serif" font-size="18" font-weight="800" fill="#ffffff">${safeDate}</text>
    </g>

    <!-- Venue Card -->
    <g transform="translate(0, 106)">
      <rect width="880" height="90" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
      <rect x="20" y="20" width="50" height="50" rx="12" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-opacity="0.4"/>
      <!-- Map Pin Icon -->
      <path d="M 45 32 C 40 32 36 36 36 41 C 36 48 45 56 45 56 C 45 56 54 48 54 41 C 54 36 50 32 45 32 Z M 45 43 C 43.5 43 42 41.5 42 40 C 42 38.5 43.5 37 45 37 C 46.5 37 48 38.5 48 40 C 48 41.5 46.5 43 45 43 Z" fill="none" stroke="#ffffff" stroke-width="2"/>
      <text x="85" y="42" font-family="'Manrope', sans-serif" font-size="12" font-weight="800" fill="${primary}" letter-spacing="1.5">VENUE / PLATFORM</text>
      <text x="85" y="66" font-family="'Manrope', sans-serif" font-size="18" font-weight="800" fill="#ffffff">${safeVenue}</text>
    </g>

    <!-- Organizer Card & Admission Pass -->
    <g transform="translate(0, 212)">
      <rect width="560" height="85" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
      <text x="28" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="1.5">ORGANIZED BY</text>
      <text x="28" y="64" font-family="'Manrope', sans-serif" font-size="18" font-weight="800" fill="#ffffff">${safeOrganizer}</text>

      <!-- Registration Open Badge -->
      <g transform="translate(580, 0)">
        <rect width="300" height="85" rx="16" fill="${primary}" fill-opacity="0.22" stroke="${primary}" stroke-width="2"/>
        <text x="150" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="${accent}" letter-spacing="2" text-anchor="middle">VERIFIED PASS</text>
        <text x="150" y="64" font-family="'Manrope', sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">REGISTRATION OPEN</text>
      </g>
    </g>
  </g>
      `
      : `
  <!-- LANDSCAPE HERO TYPOGRAPHY -->
  <g transform="translate(60, 160)">
    <!-- Category Mini-Badge -->
    <g transform="translate(0, 0)">
      <rect width="36" height="36" rx="8" fill="url(#pillGrad)" stroke="${primary}" stroke-opacity="0.4"/>
      <text x="18" y="24" font-size="18" text-anchor="middle">${tmpl.icon}</text>
      <text x="48" y="23" font-family="'Manrope', sans-serif" font-size="12" font-weight="800" fill="${accent}" letter-spacing="1.8">${tmpl.styleBadge}</text>
    </g>

    <!-- Multi-Line Event Title -->
    <g transform="translate(0, 48)">
      ${titleLines
        .map(
          (line, idx) => `
        <text x="0" y="${idx * titleLineHeight + 44}" font-family="'Manrope', -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="900" fill="url(#titleGrad)" letter-spacing="-1.5" filter="url(#softShadow)">
          ${escapeXml(line)}
        </text>
      `
        )
        .join("")}
    </g>

    <!-- Subtitle / Tagline -->
    <g transform="translate(0, ${titleLines.length * titleLineHeight + 85})">
      ${subtitleLines
        .map(
          (subLine, subIdx) => `
        <text x="0" y="${subIdx * 24 + 10}" font-family="'Inter', -apple-system, sans-serif" font-size="17" font-weight="400" fill="#cbd5e1" opacity="0.9">
          ${escapeXml(subLine)}
        </text>
      `
        )
        .join("")}
      <line x1="0" y1="${subtitleLines.length * 24 + 22}" x2="140" y2="${subtitleLines.length * 24 + 22}" stroke="${accent}" stroke-width="3.5" stroke-linecap="round"/>
    </g>
  </g>

  <!-- LANDSCAPE BOTTOM METADATA CARDS (3-COLUMN DOCK) -->
  <g transform="translate(60, 520)">
    <!-- Date Card -->
    <rect x="0" y="0" width="345" height="88" rx="14" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
    <rect x="18" y="19" width="48" height="48" rx="10" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-opacity="0.4"/>
    <!-- Calendar Vector -->
    <path d="M 34 35 L 50 35 M 34 43 L 44 43 M 37 30 L 37 33 M 47 30 L 47 33 M 31 33 L 53 33 Q 55 33 55 35 L 55 51 Q 55 53 53 53 L 31 53 Q 29 53 29 51 L 29 35 Q 29 33 31 33 Z" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>
    <text x="78" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="${accent}" letter-spacing="1.2">EVENT DATE &amp; TIME</text>
    <text x="78" y="62" font-family="'Manrope', sans-serif" font-size="16" font-weight="800" fill="#ffffff">${safeDate}</text>

    <!-- Venue Card -->
    <rect x="365" y="0" width="365" height="88" rx="14" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
    <rect x="383" y="19" width="48" height="48" rx="10" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-opacity="0.4"/>
    <!-- Location Pin Vector -->
    <path d="M 407 33 C 402 33 398 37 398 42 C 398 49 407 55 407 55 C 407 55 416 49 416 42 C 416 37 412 33 407 33 Z M 407 43.5 C 405.5 43.5 404 42 404 40.5 C 404 39 405.5 37.5 407 37.5 C 408.5 37.5 410 39 410 40.5 C 410 42 408.5 43.5 407 43.5 Z" fill="none" stroke="#ffffff" stroke-width="1.8"/>
    <text x="443" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="${primary}" letter-spacing="1.2">LOCATION &amp; VENUE</text>
    <text x="443" y="62" font-family="'Manrope', sans-serif" font-size="16" font-weight="800" fill="#ffffff">${safeVenue}</text>

    <!-- Organizer & Verification Pill -->
    <rect x="750" y="0" width="330" height="88" rx="14" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
    <text x="772" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="1.2">HOSTED BY</text>
    <text x="772" y="62" font-family="'Manrope', sans-serif" font-size="16" font-weight="800" fill="#ffffff">${safeOrganizer}</text>
  </g>
      `
  }

  <!-- ================= MODERN CORNER WATERMARK ================= -->
  <g transform="translate(${W - 220}, ${H - 28})">
    <text x="180" y="0" font-family="'Manrope', -apple-system, sans-serif" font-size="11" font-weight="700" fill="rgba(255,255,255,0.35)" letter-spacing="1.5" text-anchor="end">EVENTRA VERIFIED POSTER</text>
  </g>
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
