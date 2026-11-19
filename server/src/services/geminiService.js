/**
 * Google Gemini AI Service for EVENTRA
 * Provides free AI-powered text generation, structured JSON assistance,
 * copywriting, and event poster generation using Google Gemini & Google AI Studio APIs.
 */

export const CANDIDATE_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
];

const RETIRED_MODEL_PATTERN = /^gemini-1\.5-/i;

function buildModelAttemptList(explicitModel) {
  const normalizedExplicit = explicitModel ? String(explicitModel).trim() : "";
  const envPreferred = String(process.env.GEMINI_MODEL || process.env.AI_MODEL || "").trim();

  if (normalizedExplicit) {
    return [normalizedExplicit, ...CANDIDATE_GEMINI_MODELS.filter((m) => m !== normalizedExplicit)];
  }

  // Avoid spending proxy timeout budget on retired gemini-1.5-* defaults from older env configs
  if (envPreferred && !RETIRED_MODEL_PATTERN.test(envPreferred)) {
    return [envPreferred, ...CANDIDATE_GEMINI_MODELS.filter((m) => m !== envPreferred)];
  }

  return [...CANDIDATE_GEMINI_MODELS];
}

function parseGeminiJson(rawText) {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) return {};

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenceMatch ? fenceMatch[1] : trimmed).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch {
        // Fall through to plain text preservation
      }
    }
    return { _rawText: candidate };
  }
}

export function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.AI_API_KEY ||
    ""
  ).trim();
}

export function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

/**
 * Generate text or structured JSON using Google Gemini with automatic model fallback
 *
 * @param {Object} options
 * @param {string} [options.systemPrompt=""] - System-level guidance
 * @param {string} [options.prompt=""] - User prompt text
 * @param {boolean} [options.jsonMode=false] - Enforce JSON response
 * @param {string} [options.model] - Specific model name (or auto fallback)
 * @returns {Promise<string|Object>}
 */
export async function generateGeminiContent({
  systemPrompt = "",
  prompt = "",
  jsonMode = false,
  model = null,
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Set AI_API_KEY or GEMINI_API_KEY in server environment.");
  }

  const modelsToTry = buildModelAttemptList(model);
  const deadline = Date.now() + 20000;
  let lastError = null;

  for (const targetModel of modelsToTry) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 1200) {
      break;
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      };

      if (systemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      if (jsonMode) {
        payload.generationConfig = {
          responseMimeType: "application/json",
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(Math.min(9000, remainingMs)),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMessage = `Gemini API returned HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error?.message) {
            errMessage = `Gemini API (${targetModel}): ${errData.error.message}`;
          }
        } catch (_) {}

        lastError = new Error(errMessage);
        const isFatalAuth =
          response.status === 401 ||
          response.status === 403 ||
          /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(errMessage);
        if (isFatalAuth) {
          lastError.fatalAuth = true;
          throw lastError;
        }

        if ([400, 404, 429, 500, 502, 503, 504].includes(response.status)) {
          console.warn(`[GeminiService] Model '${targetModel}' returned ${response.status}, attempting fallback...`);
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const parts = Array.isArray(data?.candidates?.[0]?.content?.parts)
        ? data.candidates[0].content.parts
        : [];
      const outputParts = parts.filter((p) => !p?.thought && typeof p?.text === "string");
      const rawText = (outputParts.length > 0 ? outputParts : parts)
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .join("")
        .trim();

      if (!rawText) {
        lastError = new Error(`Gemini API (${targetModel}) returned an empty response.`);
        console.warn(`[GeminiService] Empty response from '${targetModel}', trying next model...`);
        continue;
      }

      if (jsonMode) {
        return parseGeminiJson(rawText);
      }

      return rawText;
    } catch (err) {
      if (err?.fatalAuth) {
        throw err;
      }
      lastError = err;
      if (err.name === "TimeoutError" || err.message?.includes("fetch failed")) {
        console.warn(`[GeminiService] Network/timeout on '${targetModel}': ${err.message}`);
        continue;
      }
      console.warn(`[GeminiService] Error with '${targetModel}': ${err.message}, checking next model...`);
    }
  }

  throw lastError || new Error("Failed to generate content with available Gemini models.");
}

function buildFallbackEventCopy({
  title = "Untitled Event",
  category = "Event",
  venue = "Campus Venue",
  existingDescription = "",
}) {
  const cleanTitle = String(title || "Event").trim();
  const cleanCat = String(category || "Featured Event").trim();
  const cleanVenue = String(venue || "Designated Venue").trim();
  const seed = String(existingDescription || "").trim();

  const tagline = `✨ ${cleanTitle} — Experience ${cleanCat} Excellence`;
  const shortDescription = `Join ${cleanTitle} at ${cleanVenue} for curated ${cleanCat.toLowerCase()} sessions, peer learning, and hands-on collaboration.`.slice(0, 160);
  const description = seed
    ? `${seed}\n\nHosted at ${cleanVenue}, ${cleanTitle} brings participants together for structured ${cleanCat.toLowerCase()} sessions, interactive discussions, and verified digital credentialing via EVENTRA.`
    : `${cleanTitle} is a premier ${cleanCat.toLowerCase()} program hosted at ${cleanVenue}, bringing participants together for focused knowledge sharing and collaborative engagement.\n\nAttendees benefit from structured sessions, guided interactions, QR-enabled check-in, and verified digital certification upon completion.`;

  return { tagline, shortDescription, description };
}

/**
 * Generate Event Copy (Title tagline, short description, and full promotional overview)
 *
 * @param {Object} options
 * @param {string} options.title - Event title
 * @param {string} [options.category] - Event category
 * @param {string} [options.venue] - Venue or format
 * @param {string} [options.existingDescription] - Existing draft notes
 * @returns {Promise<Object>} { shortDescription, description, tagline }
 */
export async function generateGeminiEventCopy({
  title,
  category = "Technical",
  venue = "Main Campus",
  existingDescription = "",
}) {
  if (!getGeminiApiKey()) {
    throw new Error("Gemini API key is not configured. Set AI_API_KEY or GEMINI_API_KEY in server environment.");
  }

  const systemPrompt =
    "You are an elite, world-class event copywriter and promoter for EVENTRA. " +
    "Create magnetic, highly engaging, professional, and clear event descriptions that drive registrations. " +
    "Return a valid JSON object with three keys:\n" +
    "- 'tagline': An electric, memorable 1-line hook with an emoji (under 12 words).\n" +
    "- 'shortDescription': A crisp, persuasive overview for social preview cards and badges (under 160 characters).\n" +
    "- 'description': A captivating, well-structured 2-3 paragraph overview highlighting the event's vision, key learning takeaways, who should attend, and why it is unmissable.\n" +
    "Do NOT fabricate misleading fake speakers or false statistics. Keep it inspiring, professional, and authentic.";

  const prompt = JSON.stringify({
    eventTitle: title,
    category,
    venue,
    organizerNotes: existingDescription.slice(0, 500),
  });

  const fallback = buildFallbackEventCopy({ title, category, venue, existingDescription });

  try {
    const result = await generateGeminiContent({
      systemPrompt,
      prompt,
      jsonMode: true,
    });

    return {
      tagline: String(result?.tagline || fallback.tagline).trim(),
      shortDescription: String(result?.shortDescription || fallback.shortDescription).trim(),
      description: String(result?.description || result?._rawText || fallback.description).trim(),
    };
  } catch (err) {
    if (err?.fatalAuth) {
      throw err;
    }
    console.warn("[GeminiService] Event copy generation falling back to structured copy:", err.message);
    return fallback;
  }
}

/**
 * Generate Event Poster using Gemini SVG synthesis or Imagen 3
 *
 * @param {Object} options
 * @param {string} options.title - Event title
 * @param {string} options.category - Event category
 * @param {string} options.description - Event description
 * @param {string} options.visualStyle - Visual theme
 * @param {string} options.colorPreference - Dominant color theme
 * @returns {Promise<string>} Image URL or base64 SVG data URL
 */
export async function generateGeminiPoster({
  title,
  category = "Technology",
  description = "",
  date = "",
  time = "",
  venue = "",
  location = "",
  mode = "offline",
  visualStyle = "futuristic neon glassmorphism",
  colorPreference = "deep violet and electric cyan",
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Set AI_API_KEY or GEMINI_API_KEY in server environment.");
  }

  // 0. Format Date, Time and Venue cleanly
  let formattedDate = "";
  if (date) {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } else {
        formattedDate = String(date).trim();
      }
    } catch {
      formattedDate = String(date).trim();
    }
  }

  if (time && String(time).trim()) {
    formattedDate = formattedDate ? `${formattedDate} · ${String(time).trim()}` : String(time).trim();
  }

  let formattedVenue = (venue || location || "").trim();
  if (!formattedVenue && mode === "online") {
    formattedVenue = "Online Virtual Event";
  }

  // 1. Try Google Imagen 3 if explicitly requested and enabled
  const imageModel = process.env.AI_IMAGE_MODEL;
  if (imageModel && !imageModel.includes("flash")) {
    try {
      const prompt = `Professional, high-impact event promotional poster for '${title}'. Theme category: ${category}. Exact Event Date: ${formattedDate || "Date TBA"}. Exact Venue/Place: ${formattedVenue || "Main Auditorium"}. Description: ${description ? description.slice(0, 180) : ""}. Style: ${visualStyle}. Palette: ${colorPreference}. Modern graphic design, balanced negative space, high contrast, clean typography frame, commercial grade showcase.`;
      const imagenEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:predict?key=${apiKey}`;
      const response = await fetch(imagenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "16:9" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const base64Bytes = data.predictions?.[0]?.bytesBase64Encoded;
        if (base64Bytes) {
          return `data:image/png;base64,${base64Bytes}`;
        }
      }
    } catch (imagenErr) {
      console.info("Imagen generation fallback triggered:", imagenErr.message);
    }
  }

  // 2. High-Performance Gemini SVG Poster Synthesis (Free, Fast, Vector Scalable)
  const dateConstraint = formattedDate
    ? `MANDATORY: You MUST accurately render the exact date text "${formattedDate}" on the poster (e.g. in a date badge or metadata bar). DO NOT invent, hallucinate, or use any other date, month, or year.`
    : `If no date was provided, display "DATE TO BE ANNOUNCED". NEVER invent a random fictional date.`;

  const venueConstraint = formattedVenue
    ? `MANDATORY: You MUST accurately render the exact venue/place text "${formattedVenue}" on the poster (e.g. in a location badge or footer card). DO NOT invent, hallucinate, or use any other venue, city, or hall.`
    : `If no venue was provided, display "VENUE TO BE ANNOUNCED" or "HYBRID / ONLINE". NEVER invent a random fictional location.`;

  const svgPrompt = `You are an elite, world-class graphic designer specializing in high-resolution, vector-crisp promotional posters for EVENTRA.
Generate a stunning, high-resolution SVG event poster for this event:
- Event Title: "${title}"
- Category: "${category}"
- Exact Event Date & Time: "${formattedDate || "Date TBA"}"
- Exact Event Venue / Place: "${formattedVenue || "Venue TBA"}"
- Description / Context: "${description ? description.slice(0, 200) : ""}"
- Visual Style: "${visualStyle}"
- Color Palette: "${colorPreference}"

CRITICAL INSTRUCTIONS FOR DATE & PLACE (MANDATORY):
1. ${dateConstraint}
2. ${venueConstraint}
3. The event title "${title}", the exact date "${formattedDate || "Date TBA"}", and the exact venue "${formattedVenue || "Venue TBA"}" MUST be prominently rendered as legible, high-contrast SVG <text> elements so participants immediately know when and where the event takes place.

Strict SVG Requirements:
1. Return ONLY pure SVG code starting with <svg and ending with </svg>.
2. Dimensions: viewBox="0 0 1200 675" width="100%" height="100%".
3. Aesthetic: Modern dark backdrop (#070b19 or #0b0f19), smooth multi-stop radial & linear gradients, luminous geometric aurora shapes, subtle cyber or organic accents, clean typography badge for EVENTRA and category pill, and the title "${title}" prominently displayed with high contrast and gradient fill.
4. Layout: Include a clear top category badge, prominent center/left title, descriptive subtitle, and a dedicated bottom metadata card or badge showing the exact Date ("${formattedDate || "Date TBA"}") and Venue ("${formattedVenue || "Venue TBA"}").
5. No markdown fences, no backticks, no explanations. Just pure valid SVG.`;

  try {
    const svgText = await generateGeminiContent({
      prompt: svgPrompt,
    });

    const match = svgText.match(/<svg[\s\S]*?<\/svg>/i);
    if (match) {
      let cleanSvg = match[0].trim();

      // Ensure exact date & venue appear in the SVG
      const hasDateInSvg = formattedDate && (cleanSvg.includes(formattedDate) || (date && cleanSvg.includes(date)));
      const hasVenueInSvg = formattedVenue && cleanSvg.toLowerCase().includes(formattedVenue.toLowerCase());

      if ((formattedDate && !hasDateInSvg) || (formattedVenue && !hasVenueInSvg)) {
        const safeD = (formattedDate || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeV = (formattedVenue || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const overlay = `
  <!-- Verified Eventra Date & Venue Badge Overlay -->
  <g transform="translate(60, 560)">
    <rect width="1080" height="60" rx="14" fill="#080c18" fill-opacity="0.92" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" />
    ${safeD ? `<text x="30" y="37" fill="#a5b4fc" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800">📅 ${safeD}</text>` : ""}
    ${safeV ? `<text x="${safeD ? "540" : "30"}" y="37" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800">📍 ${safeV}</text>` : ""}
  </g>
</svg>`;
        cleanSvg = cleanSvg.replace(/<\/svg>\s*$/i, overlay);
      }

      const base64Svg = Buffer.from(cleanSvg).toString("base64");
      return `data:image/svg+xml;base64,${base64Svg}`;
    }
  } catch (svgErr) {
    console.warn("Gemini SVG generation failed, falling back to vector template:", svgErr.message);
  }

  // 3. Failsafe High-End Cinematic Vector Poster
  const rawTitle = String(title || "EVENTRA SHOWCASE").trim();
  const safeCat = (category || "TECH SUMMIT").toUpperCase().slice(0, 24).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeDesc = (description || "Experience keynotes, hands-on masterclasses, and transformative industry innovations.").slice(0, 110).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeDate = (formattedDate || "Date to be announced").slice(0, 36).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeVenue = (formattedVenue || "Venue to be announced").slice(0, 42).replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Dynamic Multi-Line Typography Wrapping
  const words = rawTitle.split(/\s+/);
  const titleLines = [];
  let curLine = "";
  for (const w of words) {
    if (!curLine) curLine = w;
    else if ((curLine + " " + w).length <= 26) curLine += " " + w;
    else {
      titleLines.push(curLine);
      curLine = w;
      if (titleLines.length === 2) break;
    }
  }
  if (curLine && titleLines.length < 3) titleLines.push(curLine);

  const titleFontSize = rawTitle.length > 40 ? 36 : rawTitle.length > 24 ? 44 : 52;
  const titleLineHeight = titleFontSize + 10;

  const fallbackSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060913" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="85%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <radialGradient id="glowTopRight" cx="85%" cy="18%" r="60%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#6366f1" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowBottomLeft" cx="15%" cy="85%" r="55%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.38" />
      <stop offset="60%" stop-color="#06b6d4" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <pattern id="dotGrid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1"/>
      <circle cx="36" cy="36" r="1.2" fill="rgba(255,255,255,0.08)" />
    </pattern>
  </defs>

  <rect width="1200" height="675" fill="url(#bg)" />
  <rect width="1200" height="675" fill="url(#dotGrid)" />
  <circle cx="980" cy="140" r="380" fill="url(#glowTopRight)" />
  <circle cx="180" cy="540" r="320" fill="url(#glowBottomLeft)" />

  <!-- Outer Architectural Frame -->
  <rect x="30" y="25" width="1140" height="625" rx="20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
  <rect x="34" y="29" width="1132" height="617" rx="16" fill="none" stroke="#6366f1" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="8 6"/>

  <!-- Top Header Row -->
  <g transform="translate(65, 60)">
    <!-- Brand Pill -->
    <rect width="135" height="36" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" />
    <circle cx="22" cy="18" r="6" fill="#6366f1" />
    <text x="78" y="23" font-family="'Manrope', system-ui, sans-serif" font-size="12" font-weight="900" fill="#ffffff" letter-spacing="2.5" text-anchor="middle">EVENTRA</text>

    <!-- Category Pill -->
    <rect x="150" y="0" width="320" height="36" rx="8" fill="rgba(99,102,241,0.2)" stroke="rgba(165,180,252,0.4)" stroke-width="1.5" />
    <text x="310" y="23" fill="#c7d2fe" font-family="'Manrope', system-ui, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="2">EVENTRA · ${safeCat}</text>

    <!-- Right Badge -->
    <rect x="940" y="0" width="130" height="36" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" />
    <text x="1005" y="23" fill="#94a3b8" font-family="'Manrope', system-ui, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1.5">OFFICIAL EVENT</text>
  </g>

  <!-- Right Decorative Vector Artwork (Circuit & Nodes) -->
  <g id="art-circuit" opacity="0.85">
    <path d="M 780 180 L 920 180 L 980 240 L 1100 240" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="8 4" opacity="0.6"/>
    <path d="M 820 120 L 960 120 L 1020 180 L 1130 180" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
    <circle cx="920" cy="180" r="5" fill="#06b6d4" />
    <circle cx="980" cy="240" r="7" fill="#6366f1" stroke="#ffffff" stroke-width="1.5"/>
    <g transform="translate(960, 260)">
      <rect x="-65" y="-65" width="130" height="130" rx="26" fill="rgba(255,255,255,0.04)" stroke="#6366f1" stroke-width="2" stroke-opacity="0.5" filter="url(#softGlow)"/>
      <path d="M -22 -22 L -38 0 L -22 22" fill="none" stroke="#06b6d4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 22 -22 L 38 0 L 22 22" fill="none" stroke="#06b6d4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="-8" y1="18" x2="8" y2="-18" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>
    </g>
  </g>

  <!-- Title & Subtitle with Multi-Line Auto-Wrapping -->
  <g transform="translate(65, 170)">
    ${titleLines
      .map(
        (line, idx) => `
      <text x="0" y="${idx * titleLineHeight + 45}" fill="url(#titleGrad)" font-family="'Manrope', system-ui, -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="900" letter-spacing="-1.5" filter="url(#softGlow)">
        ${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
      </text>
    `
      )
      .join("")}
    
    <text x="0" y="${titleLines.length * titleLineHeight + 70}" fill="#cbd5e1" font-family="'Inter', system-ui, sans-serif" font-size="18" font-weight="400">
      ${safeDesc}
    </text>

    <!-- Accent Divider -->
    <line x1="0" y1="${titleLines.length * titleLineHeight + 95}" x2="160" y2="${titleLines.length * titleLineHeight + 95}" stroke="#06b6d4" stroke-width="3.5" stroke-linecap="round" />

    <!-- Highlights Ribbon -->
    <g transform="translate(0, ${titleLines.length * titleLineHeight + 115})">
      <rect width="660" height="34" rx="8" fill="rgba(255,255,255,0.06)" stroke="#6366f1" stroke-opacity="0.35"/>
      <text x="330" y="22" font-family="'Manrope', system-ui, sans-serif" font-size="11.5" font-weight="800" fill="#38bdf8" letter-spacing="1.5" text-anchor="middle">✦ KEYNOTES ✦ LIVE DEMOS ✦ OFFICIAL CERTIFICATE ✦ NETWORKING</text>
    </g>
  </g>

  <!-- Bottom Metadata Cards (Dock) + QR Code -->
  <g transform="translate(65, 515)">
    <!-- Date Card -->
    <rect x="0" y="0" width="310" height="88" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" />
    <rect x="18" y="19" width="48" height="48" rx="10" fill="#6366f1" fill-opacity="0.2" stroke="#6366f1" stroke-opacity="0.4"/>
    <text x="42" y="50" font-size="20" text-anchor="middle">📅</text>
    <text x="78" y="38" fill="#a5b4fc" font-family="system-ui, sans-serif" font-size="11" font-weight="800" letter-spacing="1.2">EVENT DATE</text>
    <text x="78" y="62" fill="#ffffff" font-family="system-ui, sans-serif" font-size="15" font-weight="800">${safeDate}</text>

    <!-- Venue Card -->
    <rect x="325" y="0" width="310" height="88" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" />
    <rect x="341" y="19" width="48" height="48" rx="10" fill="#06b6d4" fill-opacity="0.2" stroke="#06b6d4" stroke-opacity="0.4"/>
    <text x="365" y="50" font-size="20" text-anchor="middle">📍</text>
    <text x="401" y="38" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="800" letter-spacing="1.2">VENUE / PLATFORM</text>
    <text x="401" y="62" fill="#ffffff" font-family="system-ui, sans-serif" font-size="15" font-weight="800">${safeVenue}</text>

    <!-- Host Card -->
    <rect x="650" y="0" width="230" height="88" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" />
    <text x="670" y="38" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.2">HOSTED BY</text>
    <text x="670" y="62" fill="#ffffff" font-family="system-ui, sans-serif" font-size="15" font-weight="800">EVENTRA PRO</text>

    <!-- Scan Pass QR Badge -->
    <g transform="translate(895, 0)">
      <rect width="185" height="88" rx="14" fill="#6366f1" fill-opacity="0.22" stroke="#6366f1" stroke-width="1.8"/>
      <g transform="translate(12, 10)">
        <rect width="68" height="68" rx="8" fill="#ffffff" />
        <rect x="7" y="7" width="18" height="18" fill="#0f172a" rx="3"/>
        <rect x="10" y="10" width="12" height="12" fill="#ffffff" rx="1.5"/>
        <rect x="12" y="12" width="8" height="8" fill="#0f172a" rx="1"/>
        <rect x="43" y="7" width="18" height="18" fill="#0f172a" rx="3"/>
        <rect x="46" y="10" width="12" height="12" fill="#ffffff" rx="1.5"/>
        <rect x="48" y="12" width="8" height="8" fill="#0f172a" rx="1"/>
        <rect x="7" y="43" width="18" height="18" fill="#0f172a" rx="3"/>
        <rect x="10" y="46" width="12" height="12" fill="#ffffff" rx="1.5"/>
        <rect x="12" y="48" width="8" height="8" fill="#0f172a" rx="1"/>
        <rect x="30" y="9" width="4" height="4" fill="#0f172a"/>
        <rect x="36" y="13" width="4" height="4" fill="#0f172a"/>
        <rect x="28" y="28" width="12" height="12" fill="#0f172a" rx="2"/>
        <rect x="32" y="32" width="4" height="4" fill="#ffffff"/>
        <rect x="44" y="30" width="5" height="4" fill="#0f172a"/>
        <rect x="48" y="45" width="4" height="14" fill="#0f172a"/>
        <rect x="36" y="55" width="8" height="4" fill="#0f172a"/>
      </g>
      <text x="90" y="38" font-family="'Manrope', system-ui, sans-serif" font-size="10.5" font-weight="900" fill="#38bdf8" letter-spacing="1.2">SCAN PASS</text>
      <text x="90" y="58" font-family="'Manrope', system-ui, sans-serif" font-size="13" font-weight="900" fill="#ffffff">REGISTER</text>
    </g>
  </g>

  <!-- Footer Watermark -->
  <text x="1135" y="645" fill="rgba(255,255,255,0.35)" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5" text-anchor="end">AI GENERATED · EVENTRA PRO</text>
</svg>`.trim();

  const base64Fallback = Buffer.from(fallbackSvg).toString("base64");
  return `data:image/svg+xml;base64,${base64Fallback}`;
}

const CERTIFICATE_TEMPLATE_CATALOG = [
  {
    id: "classic",
    styleTag: "Heritage Gold & Serif",
    summary: "Traditional cream/gold heritage certificate, double-line filigree, Roman serif elegance.",
    defaultTitle: "Certificate of Excellence",
    defaultSignatories: ["Program Chair", "Managing Director"],
  },
  {
    id: "modern",
    styleTag: "Minimal Swiss Editorial",
    summary: "Clean minimal sage/emerald border, sidebar accent, Swiss sans-serif typography.",
    defaultTitle: "Certificate of Achievement",
    defaultSignatories: ["Event Lead", "Head of Operations"],
  },
  {
    id: "academic",
    styleTag: "University Crest & Symposium",
    summary: "Burgundy/crimson crested borders, formal university diploma / symposium style.",
    defaultTitle: "Certificate of Academic Merit",
    defaultSignatories: ["Dean of Studies", "Symposium Convener"],
  },
  {
    id: "royalGold",
    styleTag: "Obsidian & Royal Gold",
    summary: "Opulent midnight obsidian & rich gold borders, high-stakes championship or luxury VIP award.",
    defaultTitle: "Certificate of Distinction",
    defaultSignatories: ["Chief Patron", "Grand Jury Chair"],
  },
  {
    id: "techAurora",
    styleTag: "Cyber Aurora & Hackathon",
    summary: "Dark cosmic canvas, cyber cyan & electric indigo aurora borders, tech conference/hackathon badge.",
    defaultTitle: "Certificate of Innovation",
    defaultSignatories: ["Lead Architect", "Hackathon Director"],
  },
  {
    id: "emeraldExecutive",
    styleTag: "Executive Forest & Champagne",
    summary: "Forest emerald & champagne gold frame, corporate leadership and executive diploma.",
    defaultTitle: "Executive Recognition Certificate",
    defaultSignatories: ["Executive Director", "Board Chairperson"],
  },
  {
    id: "crimsonLuxe",
    styleTag: "Imperial Ruby & Filigree",
    summary: "Imperial ruby/burgundy borders, gold corner filigree, prestigious honors and distinction.",
    defaultTitle: "Honors & Distinction Award",
    defaultSignatories: ["Chancellor", "Honorary Secretary"],
  },
  {
    id: "vintageParchment",
    styleTag: "Engraved Parchment Guilloche",
    summary: "Aged warm amber parchment, intricate ornamental engraved guilloche borders.",
    defaultTitle: "Certificate of Commendation",
    defaultSignatories: ["Chief Curator", "Event Convener"],
  },
];

const CERTIFICATE_CATALOG_BY_ID = new Map(
  CERTIFICATE_TEMPLATE_CATALOG.map((entry) => [entry.id, entry])
);

function normalizeCertificateSuggestionItem(rawItem, meta, eventTitle) {
  const signatories = Array.isArray(rawItem?.suggestedSignatories)
    ? rawItem.suggestedSignatories
        .map((s) => String(s || "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return {
    template: meta.id,
    styleTag: String(rawItem?.styleTag || meta.styleTag).trim().slice(0, 60) || meta.styleTag,
    title: String(rawItem?.title || meta.defaultTitle).trim().slice(0, 100) || meta.defaultTitle,
    description:
      String(
        rawItem?.description ||
          "This certificate is proudly presented to {name} in recognition of active participation and valued accomplishment in {event} on {date}."
      )
        .trim()
        .slice(0, 500),
    reason:
      String(
        rawItem?.reason ||
          `${meta.styleTag} for ${eventTitle || "this event"}: ${meta.summary}`
      )
        .trim()
        .slice(0, 500),
    suggestedSignatories: signatories.length > 0 ? signatories : [...meta.defaultSignatories],
  };
}

function normalizeCertificateSuggestions(parsed, { eventTitle, currentTemplate, excludeTemplates }) {
  const excludedSet = new Set(
    (Array.isArray(excludeTemplates) ? excludeTemplates : []).filter((id) =>
      CERTIFICATE_CATALOG_BY_ID.has(id)
    )
  );

  const rawList = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
    : Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? [parsed]
        : [];

  const aiByTemplate = new Map();
  for (const item of rawList) {
    const id = String(item?.template || "").trim();
    if (CERTIFICATE_CATALOG_BY_ID.has(id) && !aiByTemplate.has(id)) {
      aiByTemplate.set(id, item);
    }
  }

  const suggestions = [];
  const pickedIds = new Set();
  const addTemplate = (id) => {
    if (suggestions.length >= 4 || pickedIds.has(id)) return;
    const meta = CERTIFICATE_CATALOG_BY_ID.get(id);
    if (!meta) return;
    pickedIds.add(id);
    suggestions.push(normalizeCertificateSuggestionItem(aiByTemplate.get(id), meta, eventTitle));
  };

  for (const id of aiByTemplate.keys()) {
    if (!excludedSet.has(id)) addTemplate(id);
  }
  for (const entry of CERTIFICATE_TEMPLATE_CATALOG) {
    if (!excludedSet.has(entry.id) && entry.id !== currentTemplate) addTemplate(entry.id);
  }
  if (currentTemplate && !excludedSet.has(currentTemplate)) {
    addTemplate(currentTemplate);
  }
  for (const id of aiByTemplate.keys()) {
    addTemplate(id);
  }
  for (const entry of CERTIFICATE_TEMPLATE_CATALOG) {
    addTemplate(entry.id);
  }

  return suggestions;
}

/**
 * Generate diverse, professional certificate styling options, template
 * recommendations, authoritative titles, and descriptions using Gemini AI.
 *
 * @param {Object} options
 * @param {string} options.eventTitle
 * @param {string} [options.eventType]
 * @param {string} [options.description]
 * @param {string} [options.customPrompt]
 * @param {string} [options.currentTemplate]
 * @param {string[]} [options.excludeTemplates]
 * @returns {Promise<{template: string, styleTag: string, title: string, description: string, reason: string, suggestedSignatories: string[], suggestions: Array<{template: string, styleTag: string, title: string, description: string, reason: string, suggestedSignatories: string[]}>}>}
 */
export async function generateGeminiCertificateDesign({
  eventTitle = "Event",
  eventType = "",
  description = "",
  customPrompt = "",
  currentTemplate = "",
  excludeTemplates = [],
}) {
  const cleanExcluded = (Array.isArray(excludeTemplates) ? excludeTemplates : []).filter((id) =>
    CERTIFICATE_CATALOG_BY_ID.has(id)
  );
  const templateListPrompt = CERTIFICATE_TEMPLATE_CATALOG.map(
    (entry) => `- "${entry.id}" (${entry.styleTag}): ${entry.summary}`
  ).join("\n");

  const systemPrompt = `You are a world-class certificate designer and awards curator for EVENTRA.
Analyze the event context and curate 4 visually distinct certificate concepts using 4 DIFFERENT templates from these 8 supported options:
${templateListPrompt}

Rules:
- Return exactly 4 items inside "suggestions", ranked from best overall match (index 0) to fresh creative alternatives.
- Each item MUST use a distinct "template" id from the 8 options above (no duplicates).
- Give each option tailored copy (headline title, wording, and signatories) suited to its aesthetic and the event.
- If "avoidTemplates" lists templates and 4 or more other templates remain available, prefer avoiding templates in "avoidTemplates" so the organizer sees fresh styles.

Return valid JSON with:
{
  "suggestions": [
    {
      "template": "classic" | "modern" | "academic" | "royalGold" | "techAurora" | "emeraldExecutive" | "crimsonLuxe" | "vintageParchment",
      "styleTag": "Short 2-4 word aesthetic vibe label",
      "title": "e.g. Certificate of Excellence, Certificate of Outstanding Achievement, Certificate of Participation",
      "description": "Eloquent 1-2 sentence description using {name}, {event}, and {date} as placeholders",
      "reason": "Clear explanation of why this aesthetic and wording fits this event",
      "suggestedSignatories": ["Title/Role 1", "Title/Role 2"]
    }
  ]
}`;

  const userPrompt = JSON.stringify({
    eventTitle,
    eventType: eventType || "Event",
    description: (description || "").slice(0, 800),
    currentTemplate: CERTIFICATE_CATALOG_BY_ID.has(currentTemplate) ? currentTemplate : undefined,
    avoidTemplates: cleanExcluded,
    customInstructions: customPrompt
      ? customPrompt.slice(0, 300)
      : "Curate 4 distinct certificate templates, headlines, and wording variations suited for this event.",
  });

  if (!getGeminiApiKey()) {
    throw new Error("Gemini API key is not configured. Set AI_API_KEY or GEMINI_API_KEY in server environment.");
  }

  let raw = {};
  try {
    raw = await generateGeminiContent({
      systemPrompt,
      prompt: userPrompt,
      jsonMode: true,
    });
  } catch (err) {
    if (err?.fatalAuth || /not configured/i.test(err?.message || "")) {
      throw err;
    }
    console.warn("[GeminiService] Certificate design generation falling back to curated catalog:", err.message);
  }

  let parsed = {};
  if (typeof raw === "string") {
    parsed = parseGeminiJson(raw);
  } else if (raw && typeof raw === "object") {
    parsed = raw;
  }

  const suggestions = normalizeCertificateSuggestions(parsed, {
    eventTitle,
    currentTemplate,
    excludeTemplates: cleanExcluded,
  });
  const primary = suggestions[0];

  return {
    ...primary,
    suggestions,
  };
}

function extractReportSuggestionText(resultObj) {
  if (!resultObj) return "";
  if (typeof resultObj === "string") return resultObj.trim();
  if (typeof resultObj !== "object") return "";

  const candidateKeys = [
    "improvedText",
    "improved_text",
    "suggestion",
    "text",
    "content",
    "draft",
    "summary",
    "sectionText",
    "_rawText",
  ];
  for (const key of candidateKeys) {
    const val = resultObj[key];
    if (typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }

  for (const val of Object.values(resultObj)) {
    if (typeof val === "string" && val.trim().length > 20) {
      return val.trim();
    }
  }
  return "";
}

function buildFallbackReportSection({
  sectionTitle,
  currentDraft = "",
  fallbackDraft = "",
  instruction = "",
  event = {},
  analytics = null,
}) {
  const cleanDraft = String(currentDraft || "").trim();
  const cleanFallback = String(fallbackDraft || "").trim();
  const baseText = cleanDraft || cleanFallback;
  const instrLower = String(instruction || "").toLowerCase();

  if (baseText) {
    // Normalize whitespace and bullet consistency without inventing facts
    const paragraphs = baseText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (instrLower.includes("concise") || instrLower.includes("short") || instrLower.includes("summary")) {
      const condensed = paragraphs
        .slice(0, 2)
        .map((p) => {
          const sentences = p.split(/(?<=[.!?])\s+/).filter(Boolean);
          return sentences.slice(0, 3).join(" ");
        })
        .join("\n\n");
      if (condensed.trim()) return condensed.trim();
    }

    if (instrLower.includes("bullet") || instrLower.includes("point")) {
      const lines = baseText
        .split(/\r?\n/)
        .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(Boolean);
      if (lines.length > 1) {
        return lines.map((l) => `- ${l}`).join("\n");
      }
    }

    return paragraphs.join("\n\n");
  }

  const title = event?.title || "the event";
  const venue = event?.venue ? ` at ${event.venue}` : "";
  const attendanceNote = analytics
    ? ` Verified records show ${analytics.confirmedCount ?? 0} confirmed registrations and ${analytics.attendedCount ?? 0} checked-in attendees (${analytics.attendanceRate ?? 0}% attendance).`
    : "";

  return `This ${String(sectionTitle || "report").toLowerCase()} section documents the execution of "${title}"${venue}.${attendanceNote} All recorded activities, participant interactions, and evaluation insights contribute to institutional documentation and continual quality improvement.`;
}

/**
 * Draft or refine a single Post-Event Report section using Gemini AI with verified analytics context
 * and deterministic fallback synthesis for transient upstream failures.
 *
 * @param {Object} options
 * @returns {Promise<{suggestion: string, source: "gemini"|"fallback"}>}
 */
export async function generateGeminiReportSection({
  sectionKey = "",
  sectionTitle = "Report Section",
  event = {},
  organizer = {},
  analytics = null,
  currentDraft = "",
  instruction = "",
  fallbackDraft = "",
}) {
  if (!getGeminiApiKey()) {
    throw new Error("Gemini API key is not configured. Set AI_API_KEY or GEMINI_API_KEY in server environment.");
  }

  const cleanDraft = String(currentDraft || "").trim().slice(0, 3000);
  const hasExistingDraft = cleanDraft.length > 0;
  const effectiveInstruction = instruction
    ? String(instruction).trim().slice(0, 300)
    : hasExistingDraft
      ? "Improve tone, clarity, and professionalism"
      : "Draft a comprehensive, executive-ready section for this report based on verified event details";

  const systemPrompt =
    "You are an expert executive reporting assistant for EVENTRA. " +
    "Draft or refine post-event report sections based ONLY on verified context.\n" +
    "STRICT RULES:\n" +
    "1. NEVER invent attendance counts, percentages, feedback scores, or sponsor names not present in verifiedMetrics or currentDraftText.\n" +
    "2. NEVER invent fake speaker names or fabricated quotes.\n" +
    "3. Write with executive professionalism, clear grammar, and structured paragraphs or crisp bullet points.\n" +
    "4. Return a valid JSON object with a single key \"improvedText\" containing the finished section text.";

  const verifiedMetrics = analytics
    ? {
        totalRegistrations: analytics.totalRegistrations ?? 0,
        confirmedCount: analytics.confirmedCount ?? 0,
        attendedCount: analytics.attendedCount ?? 0,
        absentCount: analytics.absentCount ?? 0,
        attendanceRatePercent: analytics.attendanceRate ?? 0,
        feedbackSubmissions: analytics.feedbackSubmissions ?? 0,
        avgRatingOverall: analytics.avgRatingOverall ?? 0,
        avgRatingOrg: analytics.avgRatingOrg ?? 0,
        avgRatingSpeakers: analytics.avgRatingSpeakers ?? 0,
        avgRatingVenue: analytics.avgRatingVenue ?? 0,
        sampleLiked: Array.isArray(analytics.feedbackLiked) ? analytics.feedbackLiked.slice(0, 3) : [],
        sampleImprovements: Array.isArray(analytics.feedbackImprovements)
          ? analytics.feedbackImprovements.slice(0, 3)
          : [],
        sampleSuggestions: Array.isArray(analytics.feedbackSuggestions)
          ? analytics.feedbackSuggestions.slice(0, 3)
          : [],
      }
    : null;

  const userPrompt = JSON.stringify({
    eventTitle: event?.title || "Event",
    eventType: event?.eventType || event?.category || "Academic / Professional Event",
    eventDate: event?.date ? new Date(event.date).toLocaleDateString("en-US") : "Event Date",
    venue: event?.venue || "Venue",
    capacity: event?.capacity ?? null,
    organizerName: organizer?.organization || organizer?.name || "",
    description: String(event?.description || event?.shortDescription || "").slice(0, 800),
    speakers: Array.isArray(event?.speakers)
      ? event.speakers
          .filter((s) => s?.name)
          .slice(0, 8)
          .map((s) => `${s.name}${s.designation ? ` (${s.designation})` : ""}`)
      : [],
    verifiedMetrics,
    sectionKey: String(sectionKey || "").slice(0, 60),
    section: String(sectionTitle || "Section").slice(0, 100),
    currentDraftText: cleanDraft || "(Blank — draft from verified event details and baselineFacts below.)",
    baselineFacts: String(fallbackDraft || "").slice(0, 1200),
    customInstruction: effectiveInstruction,
  });

  try {
    const resultObj = await generateGeminiContent({
      systemPrompt,
      prompt: userPrompt,
      jsonMode: true,
    });

    const extracted = extractReportSuggestionText(resultObj);
    if (extracted) {
      return {
        suggestion: extracted,
        source: "gemini",
      };
    }
  } catch (err) {
    if (err?.fatalAuth) {
      throw err;
    }
    console.warn(`[GeminiService] Report section '${sectionKey || sectionTitle}' falling back:`, err.message);
  }

  return {
    suggestion: buildFallbackReportSection({
      sectionTitle,
      currentDraft: cleanDraft,
      fallbackDraft,
      instruction: effectiveInstruction,
      event,
      analytics,
    }),
    source: "fallback",
  };
}
