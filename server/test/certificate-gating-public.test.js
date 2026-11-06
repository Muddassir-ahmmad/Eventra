import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "eventra-test-jwt-secret-long-random-phase4";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eventra";

import User from "../src/models/User.js";
import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import Certificate from "../src/models/Certificate.js";
import certificateRoutes from "../src/routes/certificates.js";
import {
  normalizeCertificateSettings,
  resolveCertificateDescription,
  isAttendedRegistration,
} from "../src/utils/certificateDesign.js";

// Unit tests: run unconditionally without live DB
test("Phase 4 Unit: normalizeCertificateSettings preserves feedback gating and cleans properties", () => {
  const normalized = normalizeCertificateSettings({
    certificateEnabled: true,
    requireFeedbackForCertificate: true,
    certificateTemplate: "academic",
    certificateTitle: "Excellence in AI",
    certificateDescription: "Awarded to {participantName} for {eventName}.",
    certificateShowOrganization: true,
    certificateOrganization: "National AI Society",
  });

  assert.equal(normalized.certificateEnabled, true);
  assert.equal(normalized.requireFeedbackForCertificate, true);
  assert.equal(normalized.certificateTemplate, "academic");
  assert.equal(normalized.certificateTitle, "Excellence in AI");
  assert.equal(normalized.certificateOrganization, "National AI Society");
});

test("Phase 4 Unit: resolveCertificateDescription supports all placeholder variants", () => {
  const template = "Presented to {participantName} ({name}) for attending {eventName} on {eventDate}.";
  const resolved = resolveCertificateDescription(
    template,
    "Sophia Patel",
    "Robotics Expo",
    "December 15, 2026"
  );

  assert.equal(
    resolved,
    "Presented to Sophia Patel (Sophia Patel) for attending Robotics Expo on December 15, 2026."
  );
});

test("Phase 4 Integration: Certificate Studio & Feedback Gating API Suite", async (t) => {
  let server;
  let baseUrl;
  let organizer;
  let authToken;
  let headers;
  let eventGated;
  let regAttendedPendingFeedback;
  let regAttendedFeedbackDone;
  let regAbsent;

  t.after(async () => {
    if (eventGated) {
      try {
        await Certificate.deleteMany({ eventId: eventGated._id });
        await Registration.deleteMany({ eventId: eventGated._id });
        await Event.deleteOne({ _id: eventGated._id });
      } catch {}
    }
    if (organizer) {
      try {
        await User.deleteOne({ _id: organizer._id });
      } catch {}
    }
    if (server) {
      try {
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
      } catch {}
    }
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch {}
    }
  });

  let dbConnected = false;
  try {
    if (mongoose.connection.readyState !== 1) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 1500 });
    }
    dbConnected = true;
  } catch (err) {
    t.skip(`Could not establish connection to local MongoDB test database (${err.message}).`);
    return;
  }

  await t.test("setup test fixtures and test server", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/certificates", certificateRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    server.unref();
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api/certificates`;

    organizer = await User.create({
      name: "Phase 4 Academic Lead",
      email: `academic-lead-${Date.now()}@example.com`,
      password: "password123",
      organization: "Institute of Technology",
    });

    authToken = jwt.sign(
      { userId: organizer._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    headers = {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    };

    // Event with feedback gating enabled
    eventGated = await Event.create({
      organizerId: organizer._id,
      title: "Advanced Quantum Computing Workshop",
      slug: `quantum-workshop-${Date.now()}`,
      category: "Technical",
      mode: "in-person",
      date: new Date(Date.now() - 86400000 * 2),
      venue: "Physics Lab 4",
      capacity: 30,
      status: "completed",
      certificateEnabled: true,
      requireFeedbackForCertificate: true,
      certificateTitle: "Certificate of Mastery",
      certificateTemplate: "academic",
    });

    // Participant 1: Attended, but feedback not submitted (feedback_pending)
    regAttendedPendingFeedback = await Registration.create({
      eventId: eventGated._id,
      registrationId: `EVT-PH4-${Date.now()}-01`,
      name: "Rohan Varma",
      email: `rohan-${Date.now()}@example.com`,
      phone: "+91 9876500001",
      college: "Quantum Tech University",
      status: "confirmed",
      checkedIn: true,
      checkedInAt: new Date(Date.now() - 86400000 * 2),
      feedbackSubmitted: false,
      feedbackToken: `tok-pending-${Date.now()}`,
    });

    // Participant 2: Attended AND feedback submitted (eligible)
    regAttendedFeedbackDone = await Registration.create({
      eventId: eventGated._id,
      registrationId: `EVT-PH4-${Date.now()}-02`,
      name: "Ananya Sen",
      email: `ananya-${Date.now()}@example.com`,
      phone: "+91 9876500002",
      college: "Quantum Tech University",
      status: "confirmed",
      checkedIn: true,
      checkedInAt: new Date(Date.now() - 86400000 * 2),
      feedbackSubmitted: true,
      feedbackToken: `tok-done-${Date.now()}`,
    });

    // Participant 3: Absent (ineligible)
    regAbsent = await Registration.create({
      eventId: eventGated._id,
      registrationId: `EVT-PH4-${Date.now()}-03`,
      name: "Absent Attendee",
      email: `absent-${Date.now()}@example.com`,
      phone: "+91 9876500003",
      college: "State College",
      status: "confirmed",
      checkedIn: false,
      feedbackSubmitted: false,
    });
  });

  // 1. Organizer Studio endpoint correctly categorizes feedback_pending
  await t.test("GET /api/certificates/event/:eventId correctly returns eligibilityStatus breakdown", async () => {
    const res = await fetch(`${baseUrl}/event/${eventGated._id}`, { headers });
    assert.equal(res.status, 200);
    const data = await res.json();

    const pPending = data.participants.find((p) => p._id === regAttendedPendingFeedback._id.toString());
    const pDone = data.participants.find((p) => p._id === regAttendedFeedbackDone._id.toString());
    const pAbsent = data.participants.find((p) => p._id === regAbsent._id.toString());

    assert.equal(pPending.eligibilityStatus, "feedback_pending");
    assert.equal(pDone.eligibilityStatus, "eligible");
    assert.equal(pAbsent.eligibilityStatus, "ineligible_absent");

    assert.equal(data.counts.attended, 2);
    assert.equal(data.counts.eligible, 1); // Only Ananya who submitted feedback
  });

  // 2. Public Certificate Status for pending feedback
  await t.test("GET /public/:registrationId/status returns feedbackRequired for attendee pending feedback", async () => {
    const res = await fetch(`${baseUrl}/public/${regAttendedPendingFeedback.registrationId}/status`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.eligible, false);
    assert.equal(data.requireFeedback, true);
    assert.equal(data.feedbackSubmitted, false);
    assert.ok(data.reason.includes("feedback survey must be submitted"));
  });

  // 3. Public Certificate Status for completed feedback
  await t.test("GET /public/:registrationId/status returns eligible for attendee with feedback submitted", async () => {
    const res = await fetch(`${baseUrl}/public/${regAttendedFeedbackDone.registrationId}/status`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.eligible, true);
    assert.equal(data.attended, true);
    assert.equal(data.feedbackSubmitted, true);
  });

  // 4. Public Certificate Download rejects pending feedback with 403
  await t.test("GET /public/:registrationId/download rejects attendee with pending feedback", async () => {
    const res = await fetch(`${baseUrl}/public/${regAttendedPendingFeedback.registrationId}/download`);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.feedbackRequired, true);
    assert.ok(data.message.includes("feedback survey"));
  });

  // 5. Public Certificate Download succeeds for eligible attendee and returns valid PDF
  await t.test("GET /public/:registrationId/download delivers valid PDF for eligible attendee", async () => {
    const res = await fetch(`${baseUrl}/public/${regAttendedFeedbackDone.registrationId}/download`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    assert.ok(buf.length > 500);
    assert.equal(buf.subarray(0, 5).toString("utf8"), "%PDF-");
  });

  // 6. Bulk Generation ignores feedback_pending registrations
  await t.test("POST /event/:eventId/generate excludes feedback_pending from issued certificates", async () => {
    const res = await fetch(`${baseUrl}/event/${eventGated._id}/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        registrationIds: [regAttendedPendingFeedback._id, regAttendedFeedbackDone._id],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    // Rohan should be listed in ineligible because his feedback is pending
    assert.ok(data.ineligible.includes(regAttendedPendingFeedback._id.toString()));
    // Ananya should be issued
    assert.ok(data.issued.some((i) => i.registrationId === regAttendedFeedbackDone._id.toString()));
  });
});

