import assert from "node:assert/strict";
import test from "node:test";
import { generateFeedbackToken, buildFeedbackEmailHtml } from "../src/utils/feedbackEmail.js";

test("Phase 6 Unit: feedback token generator creates unique random token and sha256 hash", () => {
  const t1 = generateFeedbackToken();
  const t2 = generateFeedbackToken();

  assert.ok(t1.token.length >= 32, "Token should be at least 32 characters long");
  assert.equal(t1.hash.length, 64, "SHA-256 hash should be exactly 64 hex characters");
  assert.notEqual(t1.token, t2.token, "Consecutive tokens must be distinct");
  assert.notEqual(t1.hash, t2.hash, "Consecutive hashes must be distinct");
});

test("Phase 6 Unit: buildFeedbackEmailHtml renders responsive email with participant and event name", () => {
  const html = buildFeedbackEmailHtml({
    eventTitle: "Annual AI Conclave",
    participantName: "Dev Attendee",
    feedbackUrl: "http://localhost:5173/feedback/sample-tok-123",
    requireCertificateFeedback: true,
  });

  assert.ok(html.includes("Annual AI Conclave"), "Should include event title");
  assert.ok(html.includes("Dev Attendee"), "Should include participant name");
  assert.ok(html.includes("http://localhost:5173/feedback/sample-tok-123"), "Should include personalized feedback link");
  assert.ok(html.includes("Certificate of Participation"), "Should mention certificate unlock when feedback is required");
});

test("Phase 6 Unit: buildFeedbackEmailHtml omits certificate requirement banner when not configured", () => {
  const html = buildFeedbackEmailHtml({
    eventTitle: "Community Open Meetup",
    participantName: "Guest Attendee",
    feedbackUrl: "http://localhost:5173/feedback/sample-tok-456",
    requireCertificateFeedback: false,
  });

  assert.ok(html.includes("Community Open Meetup"), "Should include event title");
  assert.ok(html.includes("Guest Attendee"), "Should include participant name");
  assert.ok(!html.includes("Important Notice: As configured by the event organizer"), "Should omit certificate warning");
});

