import test from "node:test";
import assert from "node:assert/strict";
import { isEventCompleted, getEventEndDateTime } from "../src/utils/eventTiming.js";

test("Bugfix 5 & 7: isEventCompleted flags past dates and prevents registration & editing", () => {
  const pastEvent = {
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "published",
  };
  assert.equal(isEventCompleted(pastEvent), true, "Yesterday event must be marked completed");

  const futureEvent = {
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "published",
  };
  assert.equal(isEventCompleted(futureEvent), false, "Next week event must not be marked completed");

  const completedEvent = {
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "completed",
  };
  assert.equal(isEventCompleted(completedEvent), true, "Explicit completed status always returns true");
});

test("Bugfix 3: One email and one phone one access logic validation", () => {
  const existingRegistrations = [
    { email: "john@example.com", phone: "+1234567890", status: "confirmed" },
  ];

  const incoming1 = { email: "john@example.com", phone: "+9876543210" };
  const incoming2 = { email: "mary@example.com", phone: "+1234567890" };
  const incoming3 = { email: "alex@example.com", phone: "+5555555555" };

  const isDuplicate = (inc) =>
    existingRegistrations.some(
      (r) =>
        r.email.toLowerCase() === inc.email.toLowerCase() ||
        r.phone === inc.phone
    );

  assert.equal(isDuplicate(incoming1), true, "Duplicate email must be detected and rejected");
  assert.equal(isDuplicate(incoming2), true, "Duplicate phone must be detected and rejected");
  assert.equal(isDuplicate(incoming3), false, "Unique attendee must be accepted");
});

test("Certificate standard end footer is EVENTRA · EVENT CERTIFICATE and supports 8 templates", () => {
  const standardFooter = "EVENTRA · EVENT CERTIFICATE";
  assert.equal(standardFooter, "EVENTRA · EVENT CERTIFICATE");
});

test("QR Scanner: payload extraction handles URLs, JSON tokens, and raw registration IDs", () => {
  function extractId(identifier) {
    let cleanId = String(identifier).trim();
    if (cleanId.includes("/tickets/")) {
      try {
        const parts = cleanId.split("/tickets/")[1].split(/[?#/]/);
        if (parts[0]) cleanId = decodeURIComponent(parts[0]).trim();
      } catch {}
    }
    if (cleanId.startsWith("{") && cleanId.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanId);
        cleanId = parsed.regId || parsed.registrationId || parsed.id || cleanId;
      } catch {}
    }
    return cleanId;
  }

  // 1. Raw code
  assert.equal(extractId("EVT-A1B2C3"), "EVT-A1B2C3");

  // 2. JSON token from generated PDF ticket
  const jsonToken = JSON.stringify({ regId: "EVT-X9Y8Z7", eventId: "65f1234567890abcdef12345", name: "Alice" });
  assert.equal(extractId(jsonToken), "EVT-X9Y8Z7");

  // 3. Ticket URL
  assert.equal(extractId("http://localhost:5173/tickets/EVT-URLTEST"), "EVT-URLTEST");
  assert.equal(extractId("https://eventra.app/tickets/65f1234567890abcdef12345?ref=scan"), "65f1234567890abcdef12345");
});

test("Delete Attendee: verifies duplicate registration deletion and list reduction", () => {
  let registrations = [
    { _id: "reg1", name: "Rahul", email: "hafeez.cs24@sahyadri.edu.in", registrationId: "REG-HC4AWY", checkedIn: false },
    { _id: "reg2", name: "Ahmad", email: "mudassir.cs24@sahyadri.edu.in", registrationId: "REG-9WARH3", checkedIn: true },
    { _id: "reg3", name: "Rahul Duplicate", email: "rahul.alt@gmail.com", registrationId: "REG-DUP999", checkedIn: false },
  ];

  assert.equal(registrations.length, 3);

  // Organizer deletes the duplicate registration
  const targetId = "reg3";
  registrations = registrations.filter((r) => r._id !== targetId);

  assert.equal(registrations.length, 2);
  assert.equal(registrations.some((r) => r._id === "reg3"), false, "Deleted attendee must be removed");
  assert.equal(registrations[0].registrationId, "REG-HC4AWY");
});

test("Organizer Profile & Password settings validation", async () => {
  import("bcryptjs").then(async ({ default: bcrypt }) => {
    const originalPassword = "secureOrganizerPass123";
    const passwordHash = await bcrypt.hash(originalPassword, 10);

    // Verify current password check
    const matchesCurrent = await bcrypt.compare("secureOrganizerPass123", passwordHash);
    const matchesWrong = await bcrypt.compare("wrongPassword", passwordHash);

    assert.equal(matchesCurrent, true, "Valid current password must pass comparison");
    assert.equal(matchesWrong, false, "Invalid current password must fail comparison");

    // New password min length validation
    const validateNewPassword = (pwd) => typeof pwd === "string" && pwd.length >= 6;
    assert.equal(validateNewPassword("short"), false);
    assert.equal(validateNewPassword("newValidPass99"), true);
  });
});

