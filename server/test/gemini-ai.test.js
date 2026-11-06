import assert from "node:assert/strict";
import test from "node:test";
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

