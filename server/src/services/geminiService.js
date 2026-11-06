/**
 * Google Gemini AI Service for EVENTRA
 * Provides free AI-powered text generation, structured JSON assistance,
 * copywriting, and event poster generation using Google Gemini & Google AI Studio APIs.
 */

export const CANDIDATE_GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
];

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

  // Build model priority list
  const preferredModel = model || process.env.GEMINI_MODEL || process.env.AI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...CANDIDATE_GEMINI_MODELS.filter((m) => m !== preferredModel)]
    : CANDIDATE_GEMINI_MODELS;

  let lastError = null;

  for (const targetModel of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

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
        signal: AbortSignal.timeout(25000),
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
        // If model not found (404), rate-limited (429), or overloaded (503), try next candidate
        if ([404, 429, 503].includes(response.status)) {
          console.warn(`[GeminiService] Model '${targetModel}' returned ${response.status}, attempting fallback...`);
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (jsonMode) {
        try {
          // Clean possible markdown code fences (```json ... ```)
          const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
          return JSON.parse(cleanJson);
        } catch (parseErr) {
          console.warn("Failed to parse Gemini JSON output:", parseErr.message, "Raw:", rawText);
          return {};
        }
      }

      return rawText;
    } catch (err) {
      lastError = err;
      if (err.name === "TimeoutError" || err.message?.includes("fetch failed")) {
        console.warn(`[GeminiService] Network/timeout on '${targetModel}': ${err.message}`);
        continue;
      }
      // If we still have more models to try, continue
      console.warn(`[GeminiService] Error with '${targetModel}': ${err.message}, checking next model...`);
    }
  }

  throw lastError || new Error("Failed to generate content with available Gemini models.");
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

  const result = await generateGeminiContent({
    systemPrompt,
    prompt,
    jsonMode: true,
  });

  return {
    tagline: result?.tagline || "",
    shortDescription: result?.shortDescription || "",
    description: result?.description || "",
  };
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
  visualStyle = "futuristic neon glassmorphism",
  colorPreference = "deep violet and electric cyan",
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Set AI_API_KEY or GEMINI_API_KEY in server environment.");
  }

  // 1. Try Google Imagen 3 if explicitly requested and enabled
  const imageModel = process.env.AI_IMAGE_MODEL;
  if (imageModel && !imageModel.includes("flash")) {
    try {
      const prompt = `Professional, high-impact event promotional poster for '${title}'. Theme category: ${category}. Description: ${description.slice(0, 180)}. Style: ${visualStyle}. Palette: ${colorPreference}. Modern graphic design, balanced negative space, high contrast, clean typography frame, commercial grade showcase.`;
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
  const svgPrompt = `You are an award-winning graphic designer. Generate a stunning, high-resolution SVG event poster for this event:
Title: "${title}"
Category: "${category}"
Description/Context: "${description.slice(0, 200)}"
Visual Style: "${visualStyle}"
Color Palette: "${colorPreference}"

Strict Requirements:
1. Return ONLY pure SVG code starting with <svg and ending with </svg>.
2. Dimensions: viewBox="0 0 1200 675" width="100%" height="100%".
3. Aesthetic: Modern dark backdrop (#070b19 or #0b0f19), smooth multi-stop radial & linear gradients, luminous geometric aurora shapes, subtle cyber or organic accents, clean typography badge for EVENTRA and category pill, and the title "${title}" prominently displayed with high contrast and gradient fill.
4. Add decorative accent lines, date/venue indicator badge, and crisp visual hierarchy.
5. No markdown fences, no backticks, no explanations. Just pure valid SVG.`;

  try {
    const svgText = await generateGeminiContent({
      prompt: svgPrompt,
    });

    const match = svgText.match(/<svg[\s\S]*?<\/svg>/i);
    if (match) {
      const cleanSvg = match[0].trim();
      const base64Svg = Buffer.from(cleanSvg).toString("base64");
      return `data:image/svg+xml;base64,${base64Svg}`;
    }
  } catch (svgErr) {
    console.warn("Gemini SVG generation failed, falling back to vector template:", svgErr.message);
  }

  // 3. Failsafe High-End Cinematic Vector Poster
  const safeTitle = (title || "EVENTRA SHOWCASE").slice(0, 42).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeCat = (category || "TECH SUMMIT").toUpperCase().slice(0, 24).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeDesc = (description || "Experience keynotes, hands-on workshops, and transformative tech innovations.").slice(0, 95).replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const fallbackSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c18" />
      <stop offset="40%" stop-color="#140e32" />
      <stop offset="80%" stop-color="#0b1a2e" />
      <stop offset="100%" stop-color="#060912" />
    </linearGradient>
    <radialGradient id="glowViolet" cx="82%" cy="18%" r="65%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.45" />
      <stop offset="60%" stop-color="#6366f1" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowCyan" cx="16%" cy="84%" r="55%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.38" />
      <stop offset="50%" stop-color="#0284c7" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="#e0e7ff" />
      <stop offset="100%" stop-color="#a5b4fc" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)" />
  <circle cx="980" cy="160" r="380" fill="url(#glowViolet)" />
  <circle cx="180" cy="540" r="320" fill="url(#glowCyan)" />
  
  <!-- Outer Frame -->
  <rect x="40" y="35" width="1120" height="605" rx="24" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
  
  <!-- Top Category Pill -->
  <rect x="75" y="70" width="190" height="38" rx="19" fill="rgba(99,102,241,0.2)" stroke="rgba(165,180,252,0.4)" stroke-width="1.5" />
  <text x="170" y="94" fill="#c7d2fe" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="2">EVENTRA · ${safeCat}</text>
  
  <!-- Right Accent Badge -->
  <rect x="990" y="70" width="135" height="36" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" />
  <text x="1057" y="93" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="1">OFFICIAL EVENT</text>

  <!-- Title & Subtitle -->
  <text x="75" y="280" fill="url(#titleGrad)" font-family="system-ui, -apple-system, sans-serif" font-size="54" font-weight="900" letter-spacing="-1.5" filter="url(#softGlow)">${safeTitle}</text>
  <text x="75" y="345" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="21" font-weight="500" max-width="900">${safeDesc}…</text>
  
  <!-- Divider -->
  <line x1="75" y1="390" x2="340" y2="390" stroke="#6366f1" stroke-width="4" stroke-linecap="round" />
  
  <!-- Bottom Feature Tags -->
  <rect x="75" y="440" width="200" height="42" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
  <text x="95" y="466" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">✦ Keynotes &amp; Sessions</text>
  
  <rect x="290" y="440" width="210" height="42" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
  <text x="310" y="466" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">✦ Verified Digital QR Pass</text>
  
  <!-- Footer Brand -->
  <text x="75" y="585" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5">POWERED BY GEMINI AI · EVENTRA</text>
</svg>`.trim();

  const base64Fallback = Buffer.from(fallbackSvg).toString("base64");
  return `data:image/svg+xml;base64,${base64Fallback}`;
}

/**
 * Generate standard, professional certificate styling, template recommendation,
 * authoritative titles, and descriptions using Gemini AI.
 *
 * @param {Object} options
 * @param {string} options.eventTitle
 * @param {string} [options.eventType]
 * @param {string} [options.description]
 * @param {string} [options.customPrompt]
 * @returns {Promise<{template: string, title: string, description: string, reason: string, suggestedSignatories: string[]}>}
 */
export async function generateGeminiCertificateDesign({
  eventTitle = "Event",
  eventType = "",
  description = "",
  customPrompt = "",
}) {
  const systemPrompt = `You are a world-class certificate designer and awards curator for EVENTRA.
Analyze the event context and select the best matching certificate design and copy.
You must choose the single best template from these 8 supported options:
- "classic": Traditional cream/gold heritage certificate, double-line filigree, Roman serif elegance.
- "modern": Clean minimal sage/emerald border, sidebar accent, Swiss sans-serif typography.
- "academic": Burgundy/crimson crested borders, formal university diploma / symposium style.
- "royalGold": Opulent midnight obsidian & rich gold borders, high-stakes championship or luxury VIP award.
- "techAurora": Dark cosmic canvas, cyber cyan & electric indigo aurora borders, tech conference/hackathon badge.
- "emeraldExecutive": Forest emerald & champagne gold frame, corporate leadership and executive diploma.
- "crimsonLuxe": Imperial ruby/burgundy borders, gold corner filigree, prestigious honors and distinction.
- "vintageParchment": Aged warm amber parchment, intricate ornamental engraved guilloche borders.

Return valid JSON with:
{
  "template": "classic" | "modern" | "academic" | "royalGold" | "techAurora" | "emeraldExecutive" | "crimsonLuxe" | "vintageParchment",
  "title": "e.g. Certificate of Excellence, Certificate of Outstanding Achievement, Certificate of Participation",
  "description": "Eloquent 1-2 sentence description using {name}, {event}, and {date} as placeholders",
  "reason": "Clear explanation of why this aesthetic and wording matches the event theme",
  "suggestedSignatories": ["Title/Role 1", "Title/Role 2"]
}`;

  const userPrompt = JSON.stringify({
    eventTitle,
    eventType: eventType || "Event",
    description: (description || "").slice(0, 800),
    customInstructions: customPrompt ? customPrompt.slice(0, 300) : "Generate the most fitting standard certificate design for this event.",
  });

  const raw = await generateGeminiContent({
    systemPrompt,
    prompt: userPrompt,
    jsonMode: true,
  });

  let parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const validTemplates = [
    "classic",
    "modern",
    "academic",
    "royalGold",
    "techAurora",
    "emeraldExecutive",
    "crimsonLuxe",
    "vintageParchment",
  ];

  return {
    template: validTemplates.includes(parsed?.template) ? parsed.template : "royalGold",
    title: String(parsed?.title || "Certificate of Excellence").slice(0, 100),
    description: String(parsed?.description || "This certificate is proudly presented to {name} in recognition of participation and accomplishment in {event}.").slice(0, 500),
    reason: String(parsed?.reason || "Tailored theme and typography generated by Gemini AI.").slice(0, 500),
    suggestedSignatories: Array.isArray(parsed?.suggestedSignatories)
      ? parsed.suggestedSignatories.slice(0, 3).map((s) => String(s).slice(0, 80))
      : ["Convener & Director", "Lead Program Coordinator"],
  };
}
