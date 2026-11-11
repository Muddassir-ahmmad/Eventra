import assert from "node:assert/strict";
import test from "node:test";
import { CERTIFICATE_TEMPLATES } from "../src/utils/certificateDesign.js";
import {
  getGeminiApiKey,
  isGeminiConfigured,
  CANDIDATE_GEMINI_MODELS,
  generateGeminiPoster,
  generateGeminiEventCopy,
  generateGeminiCertificateDesign,
} from "../src/services/geminiService.js";

test("geminiService exports valid candidate model priority list", () => {
  assert.ok(Array.isArray(CANDIDATE_GEMINI_MODELS));
  assert.ok(CANDIDATE_GEMINI_MODELS.includes("gemini-3.1-flash-lite"));
  assert.ok(CANDIDATE_GEMINI_MODELS.includes("gemini-3-flash-preview"));
});

test("geminiService detects API key correctly from environment", () => {
  const configured = isGeminiConfigured();
  assert.equal(typeof configured, "boolean");
  if (configured) {
    const key = getGeminiApiKey();
    assert.ok(key.length > 5);
  }
});

test("generateGeminiPoster requires API key to proceed", async () => {
  const oldKey = process.env.AI_API_KEY;
  const oldGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.AI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  await assert.rejects(
    async () => {
      await generateGeminiPoster({ title: "Test Event" });
    },
    { message: /Gemini API key is not configured/ }
  );

  if (oldKey) process.env.AI_API_KEY = oldKey;
  if (oldGeminiKey) process.env.GEMINI_API_KEY = oldGeminiKey;
});

test("generateGeminiCertificateDesign requires API key to proceed", async () => {
  const oldKey = process.env.AI_API_KEY;
  const oldGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.AI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  await assert.rejects(
    async () => {
      await generateGeminiCertificateDesign({ eventTitle: "DevHack 2026" });
    },
    { message: /Gemini API key is not configured/ }
  );

  if (oldKey) process.env.AI_API_KEY = oldKey;
  if (oldGeminiKey) process.env.GEMINI_API_KEY = oldGeminiKey;
});

test("generateGeminiCertificateDesign returns 4 distinct valid templates and respects excludeTemplates", async () => {
  const oldKey = process.env.AI_API_KEY;
  const oldGeminiKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  process.env.AI_API_KEY = "test-fake-gemini-key";
  delete process.env.GEMINI_API_KEY;

  try {
    let mockPayload = {
      suggestions: [
        {
          template: "techAurora",
          styleTag: "Cyber Aurora",
          title: "Certificate of Innovation",
          description: "Awarded to {name} for building at {event} on {date}.",
          reason: "Electric aurora styling matches a developer hackathon.",
          suggestedSignatories: ["Lead Architect", "Hackathon Director"],
        },
        {
          template: "royalGold",
          styleTag: "Grand Obsidian Gold",
          title: "Certificate of Distinction",
          description: "Presented to {name} for top achievement in {event} on {date}.",
          reason: "Prestigious championship contrast for finalist awards.",
          suggestedSignatories: ["Chief Patron"],
        },
        {
          template: "royalGold",
          styleTag: "Duplicate Should Be Deduplicated",
          title: "Duplicate Entry",
        },
        {
          template: "nonExistentTheme",
          title: "Invalid Should Be Ignored",
        },
      ],
    };

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockPayload) }],
            },
          },
        ],
      }),
    });

    const firstBatch = await generateGeminiCertificateDesign({
      eventTitle: "DevHack 2026",
      eventType: "Hackathon",
      description: "24-hour AI engineering hackathon",
    });

    assert.equal(firstBatch.suggestions.length, 4);
    const firstTemplates = firstBatch.suggestions.map((item) => item.template);
    assert.equal(new Set(firstTemplates).size, 4);
    for (const templateId of firstTemplates) {
      assert.ok(CERTIFICATE_TEMPLATES.includes(templateId));
    }
    assert.equal(firstBatch.template, firstBatch.suggestions[0].template);
    assert.equal(firstBatch.styleTag, firstBatch.suggestions[0].styleTag);
    assert.equal(firstBatch.title, firstBatch.suggestions[0].title);
    assert.equal(firstBatch.description, firstBatch.suggestions[0].description);
    assert.equal(firstBatch.reason, firstBatch.suggestions[0].reason);
    assert.deepEqual(
      firstBatch.suggestedSignatories,
      firstBatch.suggestions[0].suggestedSignatories
    );
    assert.equal(firstBatch.template, "techAurora");

    // Simulate "More Themes" request excluding 4 already-shown templates,
    // even if the upstream AI model still includes some excluded templates.
    mockPayload = {
      suggestions: [
        { template: "royalGold", title: "Should Be Skipped" },
        { template: "academic", styleTag: "Symposium Honors", title: "Certificate of Merit" },
        { template: "classic", title: "Should Also Be Skipped" },
      ],
    };

    const excluded = ["royalGold", "techAurora", "classic", "modern"];
    const nextBatch = await generateGeminiCertificateDesign({
      eventTitle: "DevHack 2026",
      excludeTemplates: excluded,
    });

    assert.equal(nextBatch.suggestions.length, 4);
    const nextTemplates = nextBatch.suggestions.map((item) => item.template);
    assert.equal(new Set(nextTemplates).size, 4);
    for (const templateId of excluded) {
      assert.equal(nextTemplates.includes(templateId), false);
    }
    assert.deepEqual(
      new Set(nextTemplates),
      new Set(["academic", "emeraldExecutive", "crimsonLuxe", "vintageParchment"])
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = oldKey;
    if (oldGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldGeminiKey;
  }
});

