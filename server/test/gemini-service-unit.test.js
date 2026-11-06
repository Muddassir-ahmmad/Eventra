import test from "node:test";
import assert from "node:assert/strict";
import { isGeminiConfigured, getGeminiApiKey, generateGeminiPoster } from "../src/services/geminiService.js";

test("geminiService detects API key correctly from environment", () => {
  const origKey = process.env.AI_API_KEY;
  const origGemini = process.env.GEMINI_API_KEY;

  process.env.AI_API_KEY = "test_key_12345";
  delete process.env.GEMINI_API_KEY;

  assert.equal(isGeminiConfigured(), true);
  assert.equal(getGeminiApiKey(), "test_key_12345");

  delete process.env.AI_API_KEY;
  process.env.GEMINI_API_KEY = "gemini_key_67890";
  assert.equal(isGeminiConfigured(), true);
  assert.equal(getGeminiApiKey(), "gemini_key_67890");

  delete process.env.GEMINI_API_KEY;
  assert.equal(isGeminiConfigured(), false);
  assert.equal(getGeminiApiKey(), "");

  // Restore
  if (origKey !== undefined) process.env.AI_API_KEY = origKey;
  if (origGemini !== undefined) process.env.GEMINI_API_KEY = origGemini;
});

test("generateGeminiPoster throws error when no API key configured", async () => {
  const origKey = process.env.AI_API_KEY;
  const origGemini = process.env.GEMINI_API_KEY;

  delete process.env.AI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  await assert.rejects(
    async () => {
      await generateGeminiPoster({ title: "Hackathon 2026" });
    },
    /Gemini API key is not configured/
  );

  if (origKey !== undefined) process.env.AI_API_KEY = origKey;
  if (origGemini !== undefined) process.env.GEMINI_API_KEY = origGemini;
});

