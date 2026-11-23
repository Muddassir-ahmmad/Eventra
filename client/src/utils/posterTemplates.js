/**
 * EVENTRA Ultra-HD Poster Template Engine
 * Generates world-class vector SVG posters with category-specific graphic art,
 * intelligent multi-line typography wrapping, glassmorphic styling, event highlights,
 * authentic QR code registration locks, and dual aspect ratio support (Landscape & Portrait).
 */

export const POSTER_CATEGORIES = [
  {
    id: "technical",
    name: "Technical & IT",
    badge: "TECH INNOVATION SUMMIT 2026",
    themeColor: "#6366f1",
    accentColor: "#06b6d4",
    bgFrom: "#060913",
    bgTo: "#0f172a",
    icon: "💻",
    tagline: "Explore cutting-edge architectures, AI systems, and engineering.",
    styleBadge: "CYBER MATRIX",
    defaultHighlights: "✦ AI & Cloud Systems ✦ Tech Keynotes ✦ Verified Pass ✦ Networking",
  },
  {
    id: "hackathon",
    name: "Hackathons",
    badge: "24-48H CODE & BUILD ARENA",
    themeColor: "#10b981",
    accentColor: "#22c55e",
    bgFrom: "#04140e",
    bgTo: "#062e24",
    icon: "⚡",
    tagline: "Brainstorm, build rapid prototypes, and deploy real-world solutions.",
    styleBadge: "BUILDER PULSE",
    defaultHighlights: "✦ $5,000+ Prize Pool ✦ 24H Non-Stop Coding ✦ Mentorship ✦ Free Food & Swag",
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
    tagline: "Interactive practical labs guided directly by leading industry experts.",
    styleBadge: "SWISS BLUEPRINT",
    defaultHighlights: "✦ Hands-on Live Labs ✦ Industry Mentors ✦ Resource Toolkit ✦ Completion Badge",
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
    defaultHighlights: "✦ 20+ Global Keynotes ✦ Executive Panels ✦ Networking Gala ✦ VIP Access",
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
    tagline: "A high-octane celebration of student energy, talent, music, and creativity.",
    styleBadge: "CARNIVAL POP",
    defaultHighlights: "✦ Mega Pro Nights ✦ Live Concert ✦ Battle of Bands ✦ DJ & Games",
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
    defaultHighlights: "✦ Domain Research Papers ✦ Scholarly Panel ✦ Q&A Symposium ✦ Publication",
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
    defaultHighlights: "✦ Dance & Theatre ✦ Art Exhibits ✦ Live Acoustic Bands ✦ Grand Stage",
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
    tagline: "Compete with top contenders, prove your prowess, and claim the championship.",
    styleBadge: "OCTANE ARENA",
    defaultHighlights: "✦ Championship Trophy ✦ Cash Rewards ✦ Leaderboard Finals ✦ Medals",
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
 * Vector QR Code element generator for an authentic commercial flyer finish.
 */
function renderVectorQr(x, y, size = 68) {
  return `
    <g transform="translate(${x}, ${y}) scale(${size / 68})">
      <rect width="68" height="68" rx="10" fill="#ffffff" />
      <!-- Finder 1 (Top Left) -->
      <rect x="7" y="7" width="18" height="18" fill="#0f172a" rx="3"/>
      <rect x="10" y="10" width="12" height="12" fill="#ffffff" rx="1.5"/>
      <rect x="12" y="12" width="8" height="8" fill="#0f172a" rx="1"/>
      <!-- Finder 2 (Top Right) -->
      <rect x="43" y="7" width="18" height="18" fill="#0f172a" rx="3"/>
      <rect x="46" y="10" width="12" height="12" fill="#ffffff" rx="1.5"/>
      <rect x="48" y="12" width="8" height="8" fill="#0f172a" rx="1"/>
      <!-- Finder 3 (Bottom Left) -->
      <rect x="7" y="43" width="18" height="18" fill="#0f172a" rx="3"/>
      <rect x="10" y="46" width="12" height="12" fill="#ffffff" rx="1.5"/>
      <rect x="12" y="48" width="8" height="8" fill="#0f172a" rx="1"/>
      <!-- Data bits -->
      <rect x="30" y="9" width="4" height="4" fill="#0f172a"/>
      <rect x="36" y="13" width="4" height="4" fill="#0f172a"/>
      <rect x="30" y="19" width="4" height="7" fill="#0f172a"/>
      <rect x="9" y="30" width="5" height="4" fill="#0f172a"/>
      <rect x="19" y="30" width="4" height="4" fill="#0f172a"/>
      <rect x="28" y="28" width="12" height="12" fill="#0f172a" rx="2"/>
      <rect x="32" y="32" width="4" height="4" fill="#ffffff"/>
      <rect x="44" y="30" width="5" height="4" fill="#0f172a"/>
      <rect x="54" y="30" width="4" height="4" fill="#0f172a"/>
      <rect x="30" y="45" width="4" height="8" fill="#0f172a"/>
      <rect x="38" y="47" width="6" height="4" fill="#0f172a"/>
      <rect x="48" y="45" width="4" height="14" fill="#0f172a"/>
      <rect x="56" y="49" width="4" height="6" fill="#0f172a"/>
      <rect x="36" y="55" width="8" height="4" fill="#0f172a"/>
    </g>
  `;
}

/**
 * Generates category-specific vector artwork for the poster.
 */
function renderCategoryArtwork(category, primary, accent, isPortrait = false) {
  const artCenter = isPortrait ? { x: 500, y: 260 } : { x: 960, y: 250 };

  switch (category) {
    case "technical":
      return `
        <g id="art-technical" opacity="0.9">
          <!-- Laser circuit network -->
          <path d="${isPortrait ? "M 180 260 L 380 260 L 440 320 L 780 320" : "M 740 180 L 900 180 L 960 250 L 1120 250"}" fill="none" stroke="${primary}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="8 5" opacity="0.6"/>
          <path d="${isPortrait ? "M 280 190 L 460 190 L 520 250 L 820 250" : "M 800 110 L 950 110 L 1010 180 L 1140 180"}" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          <!-- Nodes -->
          <circle cx="${isPortrait ? "380" : "900"}" cy="${isPortrait ? "260" : "180"}" r="5" fill="${accent}" />
          <circle cx="${isPortrait ? "440" : "960"}" cy="${isPortrait ? "320" : "250"}" r="8" fill="${primary}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="${isPortrait ? "520" : "1010"}" cy="${isPortrait ? "250" : "180"}" r="5" fill="${accent}" />
          <!-- Neon 3D Cube / Monolith -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})">
            <!-- Isometric Outer Wireframe Cube -->
            <polygon points="0,-85 75,-42 75,42 0,85 -75,42 -75,-42" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <line x1="0" y1="0" x2="0" y2="85" stroke="${primary}" stroke-width="2" opacity="0.6"/>
            <line x1="0" y1="0" x2="75" y2="-42" stroke="${primary}" stroke-width="2" opacity="0.6"/>
            <line x1="0" y1="0" x2="-75" y2="-42" stroke="${primary}" stroke-width="2" opacity="0.6"/>
            <!-- Neon Laser Brackets Inside -->
            <path d="M -26 -20 L -42 0 L -26 20" fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M 26 -20 L 42 0 L 26 20" fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="-12" y1="16" x2="12" y2="-16" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
          </g>
          <!-- Terminal Tag Badge -->
          <g transform="translate(${artCenter.x}, ${artCenter.y + 115})">
            <rect x="-95" y="-15" width="190" height="30" rx="15" fill="#071226" stroke="${accent}" stroke-width="1.5"/>
            <text x="0" y="5" font-family="'JetBrains Mono', monospace, Consolas" font-size="11" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="2">&lt;AI // SYSTEMS&gt;</text>
          </g>
        </g>
      `;

    case "hackathon":
      return `
        <g id="art-hackathon" opacity="0.95">
          <!-- Pulse wave line -->
          <path d="${isPortrait ? "M 150 280 Q 300 240 450 280 T 750 280" : "M 740 240 L 830 240 L 850 180 L 885 300 L 915 210 L 940 255 L 960 240 L 1120 240"}" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
          <!-- Central Hexagon Shield & Lightning Core -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})">
            <polygon points="0,-82 72,-40 72,40 0,82 -72,40 -72,-40" fill="url(#cardGrad)" stroke="${primary}" stroke-width="3" filter="url(#glowFilter)"/>
            <polygon points="0,-92 82,-46 82,46 0,92 -82,46 -82,-46" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>
            <!-- Radiant Lightning Bolt -->
            <polygon points="8,-38 -26,4 -2,4 -12,42 26,-4 2,-4" fill="${accent}" stroke="#ffffff" stroke-width="2" />
          </g>
          <!-- Terminal Deploy Badge -->
          <g transform="translate(${artCenter.x}, ${artCenter.y + 115})">
            <rect x="-105" y="-15" width="210" height="30" rx="15" fill="#041f17" stroke="${accent}" stroke-width="1.8"/>
            <text x="0" y="5" font-family="'JetBrains Mono', monospace, Consolas" font-size="11" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="1.5">&gt;_ CODE // BUILD // SHIP</text>
          </g>
        </g>
      `;

    case "workshop":
      return `
        <g id="art-workshop" opacity="0.9">
          <!-- Blueprint angle calibrations -->
          <circle cx="${artCenter.x}" cy="${artCenter.y}" r="115" fill="none" stroke="${primary}" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.4"/>
          <circle cx="${artCenter.x}" cy="${artCenter.y}" r="85" fill="none" stroke="${accent}" stroke-width="2" opacity="0.6"/>
          <line x1="${artCenter.x - 90}" y1="${artCenter.y - 90}" x2="${artCenter.x + 90}" y2="${artCenter.y + 90}" stroke="${primary}" stroke-width="1.2" opacity="0.4"/>
          <line x1="${artCenter.x + 90}" y1="${artCenter.y - 90}" x2="${artCenter.x - 90}" y2="${artCenter.y + 90}" stroke="${primary}" stroke-width="1.2" opacity="0.4"/>
          <!-- Central Craft Gear & Caliper Badge -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})">
            <circle cx="0" cy="0" r="56" fill="url(#cardGrad)" stroke="${accent}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <!-- Precision Wrench & Tool Vector -->
            <path d="M -16 -16 L 16 16 M -8 -24 C -20 -20 -20 -8 -16 -4 L 14 26 C 18 30 24 24 20 20 L 2 -14 C 6 -18 -2 -26 -8 -24 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
          </g>
          <!-- Hands-on Lab Badge -->
          <g transform="translate(${artCenter.x}, ${artCenter.y + 115})">
            <rect x="-95" y="-14" width="190" height="28" rx="8" fill="#082236" stroke="${primary}" stroke-width="1.5"/>
            <text x="0" y="5" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">HANDS-ON MASTER LAB</text>
          </g>
        </g>
      `;

    case "conference":
      return `
        <g id="art-conference" opacity="0.95">
          <!-- Globe Latitudes / Longitudes Wireframe -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})" opacity="0.55">
            <circle cx="0" cy="0" r="90" fill="none" stroke="${primary}" stroke-width="2"/>
            <ellipse cx="0" cy="0" rx="90" ry="34" fill="none" stroke="${accent}" stroke-width="1.8"/>
            <ellipse cx="0" cy="0" rx="38" ry="90" fill="none" stroke="${primary}" stroke-width="1.8"/>
            <line x1="-90" y1="0" x2="90" y2="0" stroke="${accent}" stroke-width="1.5" stroke-dasharray="6 4"/>
          </g>
          <!-- Executive Keynote Star Emblem -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})">
            <polygon points="0,-64 54,-32 54,32 0,64 -54,32 -54,-32" fill="url(#cardGrad)" stroke="${accent}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <!-- Keynote Mic Icon -->
            <rect x="-8" y="-22" width="16" height="28" rx="8" fill="${accent}" stroke="#ffffff" stroke-width="1.5"/>
            <path d="M -16 -6 C -16 12 16 12 16 -6" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="0" y1="14" x2="0" y2="25" stroke="#ffffff" stroke-width="2.5"/>
            <line x1="-10" y1="25" x2="10" y2="25" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
          </g>
          <!-- Global Keynote Tag -->
          <g transform="translate(${artCenter.x}, ${artCenter.y + 115})">
            <rect x="-100" y="-14" width="200" height="28" rx="14" fill="#0d1838" stroke="${accent}" stroke-width="1.5"/>
            <text x="0" y="5" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="2">GLOBAL KEYNOTE 2026</text>
          </g>
        </g>
      `;

    case "college_fest":
      return `
        <g id="art-fest" opacity="0.95">
          <!-- Confetti Elements & Party Stardust -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})">
            <!-- Radiant Star Burst -->
            <path d="M 0 -88 L 15 -34 L 68 -48 L 34 -4 L 84 16 L 28 24 L 38 78 L -4 36 L -50 70 L -30 18 L -85 -4 L -32 -18 Z" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <!-- Sparkles & Music -->
            <polygon points="0,-42 6,-14 36,-6 6,0 0,30 -6,0 -36,-6 -6,-14" fill="${accent}"/>
            <circle cx="-62" cy="-62" r="6" fill="${accent}" />
            <circle cx="72" cy="-52" r="6" fill="#facc15" />
            <circle cx="-68" cy="58" r="8" fill="${primary}" />
            <circle cx="62" cy="68" r="9" fill="${accent}" />
            <path d="M -16 -12 L -16 16 A 9 7 0 1 1 -25 9 L -25 -16 L 16 -24 L 16 6 A 9 7 0 1 1 7 -1 L 7 -19 Z" fill="#ffffff" opacity="0.95"/>
          </g>
          <!-- Carnival Tag -->
          <g transform="translate(${artCenter.x}, ${artCenter.y + 115})">
            <rect x="-95" y="-15" width="190" height="30" rx="15" fill="#32093a" stroke="${primary}" stroke-width="2"/>
            <text x="0" y="5" font-family="'Manrope', sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">CARNIVAL EXPLOSION</text>
          </g>
        </g>
      `;

    case "seminar":
      return `
        <g id="art-seminar" opacity="0.92">
          <g transform="translate(${artCenter.x}, ${artCenter.y})">
            <!-- Shield Outline -->
            <path d="M 0 -68 Q 48 -68 55 -22 Q 55 36 0 68 Q -55 36 -55 -22 Q -48 -68 0 -68 Z" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2.8" filter="url(#glowFilter)"/>
            <path d="M 0 -58 Q 40 -58 44 -19 Q 44 30 0 58 Q -44 30 -44 -19 Q -40 -58 0 -58 Z" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.6"/>
            <!-- Mortarboard Cap / Book -->
            <polygon points="0,-24 30,-9 0,6 -30,-9" fill="${primary}" stroke="#ffffff" stroke-width="1.8"/>
            <path d="M -20 -2 L -20 18 Q 0 28 20 18 L 20 -2" fill="none" stroke="#ffffff" stroke-width="2.2"/>
            <line x1="30" y1="-9" x2="36" y2="12" stroke="${accent}" stroke-width="2.5"/>
          </g>
          <!-- Laurel Branches Around Shield -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})" stroke="${accent}" fill="none" stroke-width="2.2" opacity="0.8">
            <path d="M -64 22 C -80 0 -75 -38 -58 -60" stroke-linecap="round"/>
            <path d="M 64 22 C 80 0 75 -38 58 -60" stroke-linecap="round"/>
          </g>
          <!-- Academic Forum Tag -->
          <g transform="translate(${artCenter.x}, ${artCenter.y + 115})">
            <rect x="-100" y="-14" width="200" height="28" rx="6" fill="#241b12" stroke="${primary}" stroke-width="1.8"/>
            <text x="0" y="5" font-family="'Times New Roman', serif, Georgia" font-size="12" font-weight="700" fill="${primary}" text-anchor="middle" letter-spacing="2">ACADEMIC COLLOQUIUM</text>
          </g>
        </g>
      `;

    case "cultural":
      return `
        <g id="art-cultural" opacity="0.95">
          <!-- Dramatic Dual Stage Spotlights -->
          <polygon points="${isPortrait ? "240,40 390,280 460,280 340,40" : "780,20 890,280 960,280 870,20"}" fill="${primary}" opacity="0.18"/>
          <polygon points="${isPortrait ? "760,40 610,280 540,280 660,40" : "1120,20 1030,280 960,280 1030,20"}" fill="${accent}" opacity="0.18"/>
          <!-- Mask & Drama Frame -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})">
            <circle cx="0" cy="0" r="68" fill="url(#cardGrad)" stroke="${primary}" stroke-width="2.5" filter="url(#glowFilter)"/>
            <!-- Theatrical Comedy Mask Glyph -->
            <path d="M -24 -16 Q 0 -24 24 -16 Q 28 16 0 30 Q -28 16 -24 -16 Z" fill="none" stroke="#ffffff" stroke-width="2.8"/>
            <circle cx="-10" cy="-6" r="3.8" fill="${accent}"/>
            <circle cx="10" cy="-6" r="3.8" fill="${accent}"/>
            <path d="M -10 14 Q 0 20 10 14" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
          </g>
          <!-- Arts Tag -->
          <g transform="translate(${artCenter.x}, ${artCenter.y + 115})">
            <rect x="-95" y="-14" width="190" height="28" rx="14" fill="#3a0818" stroke="${primary}" stroke-width="2"/>
            <text x="0" y="5" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">STAGE &amp; MUSIC GALA</text>
          </g>
        </g>
      `;

    case "competition":
    default:
      return `
        <g id="art-competition" opacity="0.95">
          <!-- Speed Chevrons -->
          <g fill="${accent}" opacity="0.3">
            <polygon points="${isPortrait ? "360,220 385,220 405,260 380,260" : "780,200 810,200 835,240 805,240"}"/>
            <polygon points="${isPortrait ? "405,220 430,220 450,260 425,260" : "830,200 860,200 885,240 855,240"}"/>
            <polygon points="${isPortrait ? "450,220 475,220 495,260 470,260" : "880,200 910,200 935,240 905,240"}"/>
          </g>
          <!-- Championship Trophy Shield -->
          <g transform="translate(${artCenter.x}, ${artCenter.y})">
            <polygon points="0,-74 62,-42 48,38 0,74 -48,38 -62,-42" fill="url(#cardGrad)" stroke="${primary}" stroke-width="3" filter="url(#glowFilter)"/>
            <!-- 1st Place Golden Trophy -->
            <path d="M -18 -24 L 18 -24 L 14 5 Q 0 16 -14 5 Z" fill="${accent}" stroke="#ffffff" stroke-width="1.8"/>
            <path d="M -18 -18 C -26 -18 -26 -4 -16 -4" fill="none" stroke="#ffffff" stroke-width="2.2"/>
            <path d="M 18 -18 C 26 -18 26 -4 16 -4" fill="none" stroke="#ffffff" stroke-width="2.2"/>
            <line x1="0" y1="14" x2="0" y2="24" stroke="#ffffff" stroke-width="3.5"/>
            <line x1="-14" y1="24" x2="14" y2="24" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
          </g>
          <!-- Champion Arena Tag -->
          <g transform="translate(${artCenter.x}, ${artCenter.y + 115})">
            <rect x="-95" y="-15" width="190" height="30" rx="8" fill="#360f08" stroke="${accent}" stroke-width="2"/>
            <text x="0" y="5" font-family="'Manrope', sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">CHAMPION ARENA</text>
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
  highlights = "",
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
  const safeHighlights = escapeXml(highlights || tmpl.defaultHighlights);
  const safeVenue = escapeXml(venue || "Main Auditorium / Hybrid");
  const safeOrganizer = escapeXml(organizer || "EVENTRA");
  const badgeText = escapeXml(tmpl.badge);

  // Parse Date into Day, Month, Year
  let dateDay = "";
  let dateMonth = "";
  let dateYear = "";
  let dateDisplay = escapeXml(date || "Upcoming Event");

  if (date) {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        dateDay = String(d.getDate()).padStart(2, "0");
        dateMonth = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
        dateYear = String(d.getFullYear());
        dateDisplay = `${dateMonth} ${dateDay}, ${dateYear}`;
      }
    } catch (_) {}
  }

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
      <stop offset="45%" stop-color="#0a0f1d" />
      <stop offset="100%" stop-color="${tmpl.bgTo}" />
    </linearGradient>

    <!-- Glowing Aurora Gradients -->
    <radialGradient id="glowTop" cx="${isPortrait ? "50%" : "85%"}" cy="${isPortrait ? "22%" : "20%"}" r="${isPortrait ? "55%" : "50%"}">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.45" />
      <stop offset="50%" stop-color="${primary}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="${primary}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowBottom" cx="${isPortrait ? "30%" : "15%"}" cy="${isPortrait ? "80%" : "85%"}" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.38" />
      <stop offset="60%" stop-color="${accent}" stop-opacity="0.08" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>

    <!-- Hero Title Gradient -->
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#f8fafc" />
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
      <circle cx="36" cy="36" r="1.2" fill="rgba(255,255,255,0.06)" />
    </pattern>
  </defs>

  <!-- ================= BASE CANVAS & LIGHTING ================= -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)" />
  <rect width="${W}" height="${H}" fill="url(#microGrid)" />
  <rect width="${W}" height="${H}" fill="url(#glowTop)" />
  <rect width="${W}" height="${H}" fill="url(#glowBottom)" />

  <!-- Outer Architectural Border Line -->
  <rect x="25" y="25" width="${W - 50}" height="${H - 50}" rx="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
  <rect x="29" y="29" width="${W - 58}" height="${H - 58}" rx="14" fill="none" stroke="${primary}" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="8 6"/>

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
  <g transform="translate(60, 52)">
    <!-- Eventra Logo Pill -->
    <rect width="135" height="38" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" />
    <circle cx="22" cy="19" r="6" fill="${primary}" />
    <text x="78" y="24" font-family="'Manrope', -apple-system, sans-serif" font-size="12" font-weight="900" fill="#ffffff" letter-spacing="2.5" text-anchor="middle">EVENTRA</text>

    <!-- Category Badge Pill -->
    <rect x="150" y="0" width="${isPortrait ? "420" : "360"}" height="38" rx="8" fill="url(#pillGrad)" stroke="${primary}" stroke-opacity="0.45" />
    <text x="${isPortrait ? "360" : "330"}" y="24" font-family="'Manrope', -apple-system, sans-serif" font-size="11" font-weight="800" fill="${primary}" letter-spacing="1.8" text-anchor="middle">${badgeText}</text>

    <!-- Right-aligned Verified Badge -->
    <g transform="translate(${W - 250}, 0)">
      <rect width="130" height="38" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
      <text x="65" y="24" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="1.5" text-anchor="middle">OFFICIAL EVENT</text>
    </g>
  </g>

  <!-- ================= HERO TYPOGRAPHY & HIGHLIGHTS ================= -->
  ${
    isPortrait
      ? `
  <!-- PORTRAIT HERO TYPOGRAPHY -->
  <g transform="translate(60, 480)">
    <!-- Category Icon & Micro Tagline -->
    <g transform="translate(0, 0)">
      <rect width="44" height="44" rx="10" fill="url(#pillGrad)" stroke="${primary}" stroke-opacity="0.5"/>
      <text x="22" y="28" font-size="20" text-anchor="middle">${tmpl.icon}</text>
      <text x="58" y="27" font-family="'Manrope', sans-serif" font-size="13" font-weight="800" fill="${accent}" letter-spacing="2">${tmpl.styleBadge} SHOWCASE</text>
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
      <line x1="0" y1="${subtitleLines.length * 28 + 26}" x2="160" y2="${subtitleLines.length * 28 + 26}" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
    </g>

    <!-- Event Highlights Ribbon (Portrait) -->
    <g transform="translate(0, ${titleLines.length * titleLineHeight + subtitleLines.length * 28 + 145})">
      <rect width="880" height="42" rx="10" fill="url(#cardGrad)" stroke="${primary}" stroke-opacity="0.35"/>
      <text x="440" y="26" font-family="'Manrope', sans-serif" font-size="12.5" font-weight="800" fill="${accent}" letter-spacing="1.5" text-anchor="middle">${safeHighlights}</text>
    </g>
  </g>

  <!-- PORTRAIT BOTTOM METADATA CARDS & SCAN BAR -->
  <g transform="translate(60, 890)">
    <!-- Date Card -->
    <g transform="translate(0, 0)">
      <rect width="880" height="92" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
      ${
        dateDay && dateMonth
          ? `
      <!-- Calendar Block Date -->
      <g transform="translate(18, 16)">
        <rect width="60" height="60" rx="10" fill="${primary}" fill-opacity="0.25" stroke="${primary}" stroke-opacity="0.5"/>
        <rect width="60" height="20" rx="10" fill="${primary}" fill-opacity="0.8"/>
        <text x="30" y="14" font-family="'Manrope', sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">${dateMonth}</text>
        <text x="30" y="47" font-family="'Manrope', sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">${dateDay}</text>
      </g>
      <text x="96" y="42" font-family="'Manrope', sans-serif" font-size="12" font-weight="800" fill="${accent}" letter-spacing="1.5">DATE &amp; SCHEDULE</text>
      <text x="96" y="68" font-family="'Manrope', sans-serif" font-size="18" font-weight="800" fill="#ffffff">${dateDisplay}</text>
      `
          : `
      <rect x="20" y="21" width="50" height="50" rx="12" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-opacity="0.4"/>
      <path d="M 37 37 L 53 37 M 37 45 L 47 45 M 40 31 L 40 34 M 50 31 L 50 34 M 34 34 L 56 34 Q 58 34 58 36 L 58 54 Q 58 56 56 56 L 34 56 Q 32 56 32 54 L 32 36 Q 32 34 34 34 Z" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
      <text x="85" y="42" font-family="'Manrope', sans-serif" font-size="12" font-weight="800" fill="${accent}" letter-spacing="1.5">DATE &amp; TIME</text>
      <text x="85" y="68" font-family="'Manrope', sans-serif" font-size="18" font-weight="800" fill="#ffffff">${dateDisplay}</text>
      `
      }
    </g>

    <!-- Venue Card -->
    <g transform="translate(0, 108)">
      <rect width="880" height="92" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
      <rect x="20" y="21" width="50" height="50" rx="12" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-opacity="0.4"/>
      <path d="M 45 33 C 40 33 36 37 36 42 C 36 49 45 57 45 57 C 45 57 54 49 54 42 C 54 37 50 33 45 33 Z M 45 44 C 43.5 44 42 42.5 42 41 C 42 39.5 43.5 38 45 38 C 46.5 38 48 39.5 48 41 C 48 42.5 46.5 44 45 44 Z" fill="none" stroke="#ffffff" stroke-width="2"/>
      <text x="85" y="42" font-family="'Manrope', sans-serif" font-size="12" font-weight="800" fill="${primary}" letter-spacing="1.5">VENUE / PLATFORM</text>
      <text x="85" y="68" font-family="'Manrope', sans-serif" font-size="18" font-weight="800" fill="#ffffff">${safeVenue}</text>
    </g>

    <!-- Organizer & Registration QR Bar -->
    <g transform="translate(0, 216)">
      <!-- Host Card -->
      <rect width="520" height="88" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
      <text x="28" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="1.5">ORGANIZED BY</text>
      <text x="28" y="65" font-family="'Manrope', sans-serif" font-size="18" font-weight="800" fill="#ffffff">${safeOrganizer}</text>

      <!-- Scan To Register QR Pass -->
      <g transform="translate(540, 0)">
        <rect width="340" height="88" rx="16" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-width="1.8"/>
        ${renderVectorQr(12, 10, 68)}
        <text x="94" y="36" font-family="'Manrope', sans-serif" font-size="11" font-weight="900" fill="${accent}" letter-spacing="1.5">SCAN TO REGISTER</text>
        <text x="94" y="58" font-family="'Manrope', sans-serif" font-size="14" font-weight="900" fill="#ffffff">OFFICIAL PASS</text>
      </g>
    </g>
  </g>
      `
      : `
  <!-- LANDSCAPE HERO TYPOGRAPHY -->
  <g transform="translate(60, 150)">
    <!-- Category Mini-Badge -->
    <g transform="translate(0, 0)">
      <rect width="38" height="38" rx="8" fill="url(#pillGrad)" stroke="${primary}" stroke-opacity="0.4"/>
      <text x="19" y="25" font-size="19" text-anchor="middle">${tmpl.icon}</text>
      <text x="50" y="24" font-family="'Manrope', sans-serif" font-size="12" font-weight="800" fill="${accent}" letter-spacing="1.8">${tmpl.styleBadge}</text>
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

    <!-- Event Highlights Ribbon (Landscape) -->
    <g transform="translate(0, ${titleLines.length * titleLineHeight + subtitleLines.length * 24 + 112})">
      <rect width="660" height="34" rx="8" fill="url(#cardGrad)" stroke="${primary}" stroke-opacity="0.35"/>
      <text x="330" y="22" font-family="'Manrope', sans-serif" font-size="11.5" font-weight="800" fill="${accent}" letter-spacing="1.5" text-anchor="middle">${safeHighlights}</text>
    </g>
  </g>

  <!-- LANDSCAPE BOTTOM METADATA CARDS (3-COLUMN DOCK + QR) -->
  <g transform="translate(60, 520)">
    <!-- Date Card -->
    <rect x="0" y="0" width="310" height="88" rx="14" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
    ${
      dateDay && dateMonth
        ? `
    <g transform="translate(14, 14)">
      <rect width="60" height="60" rx="8" fill="${primary}" fill-opacity="0.25" stroke="${primary}" stroke-opacity="0.5"/>
      <rect width="60" height="18" rx="8" fill="${primary}" fill-opacity="0.8"/>
      <text x="30" y="13" font-family="'Manrope', sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">${dateMonth}</text>
      <text x="30" y="46" font-family="'Manrope', sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle">${dateDay}</text>
    </g>
    <text x="86" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="${accent}" letter-spacing="1.2">EVENT DATE</text>
    <text x="86" y="62" font-family="'Manrope', sans-serif" font-size="15" font-weight="800" fill="#ffffff">${dateDisplay}</text>
    `
        : `
    <rect x="16" y="19" width="48" height="48" rx="10" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-opacity="0.4"/>
    <path d="M 33 35 L 49 35 M 33 43 L 43 43 M 36 30 L 36 33 M 46 30 L 46 33 M 30 33 L 52 33 Q 54 33 54 35 L 54 51 Q 54 53 52 53 L 30 53 Q 28 53 28 51 L 28 35 Q 28 33 30 33 Z" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>
    <text x="76" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="${accent}" letter-spacing="1.2">EVENT DATE</text>
    <text x="76" y="62" font-family="'Manrope', sans-serif" font-size="15" font-weight="800" fill="#ffffff">${dateDisplay}</text>
    `
    }

    <!-- Venue Card -->
    <rect x="325" y="0" width="310" height="88" rx="14" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
    <rect x="341" y="19" width="48" height="48" rx="10" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-opacity="0.4"/>
    <path d="M 365 33 C 360 33 356 37 356 42 C 356 49 365 55 365 55 C 365 55 374 49 374 42 C 374 37 370 33 365 33 Z M 365 43.5 C 363.5 43.5 362 42 362 40.5 C 362 39 363.5 37.5 365 37.5 C 366.5 37.5 368 39 368 40.5 C 368 42 366.5 43.5 365 43.5 Z" fill="none" stroke="#ffffff" stroke-width="1.8"/>
    <text x="401" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="800" fill="${primary}" letter-spacing="1.2">LOCATION &amp; VENUE</text>
    <text x="401" y="62" font-family="'Manrope', sans-serif" font-size="15" font-weight="800" fill="#ffffff">${safeVenue}</text>

    <!-- Host Card -->
    <rect x="650" y="0" width="230" height="88" rx="14" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" filter="url(#softShadow)"/>
    <text x="670" y="38" font-family="'Manrope', sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="1.2">HOSTED BY</text>
    <text x="670" y="62" font-family="'Manrope', sans-serif" font-size="15" font-weight="800" fill="#ffffff">${safeOrganizer}</text>

    <!-- QR Code Registration Pill -->
    <g transform="translate(895, 0)">
      <rect width="185" height="88" rx="14" fill="${primary}" fill-opacity="0.22" stroke="${primary}" stroke-width="1.8" filter="url(#softShadow)"/>
      ${renderVectorQr(12, 10, 68)}
      <text x="90" y="38" font-family="'Manrope', sans-serif" font-size="10.5" font-weight="900" fill="${accent}" letter-spacing="1.2">SCAN PASS</text>
      <text x="90" y="58" font-family="'Manrope', sans-serif" font-size="13" font-weight="900" fill="#ffffff">REGISTER</text>
    </g>
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
 * Maps human-readable event categories to the best-matching poster template ID.
 */
export function categoryToTemplateId(category) {
  if (!category) return "technical";
  const cat = String(category).toLowerCase().trim();
  if (cat.includes("hack")) return "hackathon";
  if (cat.includes("work")) return "workshop";
  if (cat.includes("conf")) return "conference";
  if (cat.includes("fest")) return "college_fest";
  if (cat.includes("sem") || cat.includes("acad")) return "seminar";
  if (cat.includes("cult") || cat.includes("art")) return "cultural";
  if (cat.includes("comp") || cat.includes("esport")) return "competition";
  return "technical";
}

/**
 * Returns a base64 Data URL of the generated SVG poster for direct use in <img src="..." />.
 */
export function generatePosterDataUrl(config) {
  try {
    const svg = generatePosterSvg(config);
    let base64 = "";
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(svg, "utf-8").toString("base64");
    } else if (typeof btoa !== "undefined") {
      try {
        base64 = btoa(unescape(encodeURIComponent(svg)));
      } catch (_) {
        try {
          base64 = btoa(svg);
        } catch (_) {}
      }
    }
    if (base64) {
      return `data:image/svg+xml;base64,${base64}`;
    }
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch (err) {
    console.error("Poster generation error:", err);
    return "";
  }
}
