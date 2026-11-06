import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import Feedback from "../src/models/Feedback.js";
import User from "../src/models/User.js";
import Certificate from "../src/models/Certificate.js";
import EmailLog from "../src/models/EmailLog.js";
import PostEventReport from "../src/models/PostEventReport.js";
import eventRoutes from "../src/routes/events.js";
import feedbackRoutes from "../src/routes/feedback.js";
import registrationRoutes from "../src/routes/registrations.js";
import certificateRoutes from "../src/routes/certificates.js";
import reportRoutes from "../src/routes/reports.js";
import { generateFeedbackToken } from "../src/utils/feedbackEmail.js";

test("smart event closure, feedback automation & certificate eligibility suite", async (t) => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    t.skip("MONGODB_URI and JWT_SECRET are required for integration tests.");
    return;
  }

  const databaseName = `eventra_closure_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const app = express();
  app.use(express.json());
  app.use("/api/events", eventRoutes);
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/registrations", registrationRoutes);
  app.use("/api/certificates", certificateRoutes);
  app.use("/api/reports", reportRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  const organizerId = new mongoose.Types.ObjectId();
  const otherOrganizerId = new mongoose.Types.ObjectId();
  const token = jwt.sign({ userId: organizerId.toString() }, process.env.JWT_SECRET, { expiresIn: "10m" });
  const otherToken = jwt.sign({ userId: otherOrganizerId.toString() }, process.env.JWT_SECRET, { expiresIn: "10m" });

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const otherHeaders = {
    Authorization: `Bearer ${otherToken}`,
    "Content-Type": "application/json",
  };

  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.dropDatabase();
      } catch {}
      try {
        await mongoose.disconnect();
      } catch {}
    }
  });

  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 });
  } catch {
    t.skip("Could not establish connection to local MongoDB test database.");
    return;
  }

  await User.create([
    {
      _id: organizerId,
      name: "Lead Organizer",
      email: "lead@eventra.local",
      password: "hashedpassword123",
      organization: "Tech Innovators Society",
    },
    {
      _id: otherOrganizerId,
      name: "Other Organizer",
      email: "other@eventra.local",
      password: "hashedpassword123",
      organization: "Other Guild",
    },
  ]);

  const ongoingEvent = await Event.create({
    organizerId,
    title: "AI & Cloud Summit 2026",
    slug: `ai-cloud-summit-${crypto.randomUUID().slice(0, 8)}`,
    description: "Annual summit exploring agentic workflows and distributed systems.",
    date: new Date(),
    startTime: "09:00",
    endTime: "17:00",
    venue: "Innovation Auditorium",
    location: "Main Campus",
    capacity: 200,
    status: "published",
    certificateEnabled: true,
    requireFeedbackForCertificate: true,
  });

  // Create registrations: 1 checked in, 1 absent
  const { token: fbToken1, hash: tokenHash1 } = generateFeedbackToken();
  const { token: fbToken2, hash: tokenHash2 } = generateFeedbackToken();

  const regAttended = await Registration.create({
    eventId: ongoingEvent._id,
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "9876543210",
    college: "Apex Engineering",
    department: "Computer Science",
    registrationId: `REG-${crypto.randomUUID().slice(0, 8)}`,
    status: "confirmed",
    checkedIn: true,
    checkedInAt: new Date(),
    feedbackToken: fbToken1,
    feedbackTokenHash: tokenHash1,
    feedbackSubmitted: false,
  });

  const regAbsent = await Registration.create({
    eventId: ongoingEvent._id,
    name: "Bhavna Patel",
    email: "bhavna@example.com",
    phone: "9876543211",
    college: "Apex Engineering",
    department: "Electronics",
    registrationId: `REG-${crypto.randomUUID().slice(0, 8)}`,
    status: "confirmed",
    checkedIn: false,
    feedbackToken: fbToken2,
    feedbackTokenHash: tokenHash2,
    feedbackSubmitted: false,
  });

  // -------------------------------------------------------------------------
  // TEST 1: End Event API
  // -------------------------------------------------------------------------
  await t.test("POST /api/events/:eventId/end concludes event, prevents repeats, and sets report status", async () => {
    // Unauthorized access rejection
    const unauthorizedRes = await fetch(`${baseUrl}/events/${ongoingEvent._id}/end`, {
      method: "POST",
      headers: otherHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(unauthorizedRes.status, 404);

    // Successful event end
    const deadline = new Date(Date.now() + 86400000 * 7).toISOString();
    const endRes = await fetch(`${baseUrl}/events/${ongoingEvent._id}/end`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        feedbackDeadline: deadline,
        requireFeedbackForCertificate: true,
      }),
    });
    assert.equal(endRes.status, 200);
    const endPayload = await endRes.json();
    assert.equal(endPayload.event.status, "completed");
    assert.ok(endPayload.event.completedAt);
    assert.equal(endPayload.event.requireFeedbackForCertificate, true);

    // Verify PostEventReport status is collecting_feedback
    const reportDoc = await PostEventReport.findOne({ eventId: ongoingEvent._id });
    assert.ok(reportDoc);
    assert.equal(reportDoc.reportStatus, "collecting_feedback");

    // Repeated closure rejection
    const repeatRes = await fetch(`${baseUrl}/events/${ongoingEvent._id}/end`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(repeatRes.status, 409);
    const repeatPayload = await repeatRes.json();
    assert.ok(repeatPayload.message.includes("already been marked as completed"));
  });

  // -------------------------------------------------------------------------
  // TEST 2: Registration Blocking on Completed Event
  // -------------------------------------------------------------------------
  await t.test("POST /api/registrations/events/:slug/register blocks registration after event ends", async () => {
    const regRes = await fetch(`${baseUrl}/registrations/public/${ongoingEvent.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Late Participant",
        email: "late@example.com",
        phone: "9998887776",
        college: "Apex College",
        department: "Mechanical",
      }),
    });

    assert.equal(regRes.status, 409);
    const regPayload = await regRes.json();
    assert.ok(regPayload.message.includes("completed") || regPayload.message.includes("concluded"));
  });

  // -------------------------------------------------------------------------
  // TEST 3: Feedback Form Loading via Token
  // -------------------------------------------------------------------------
  await t.test("GET /api/feedback/:token loads event details and validates token", async () => {
    // Short invalid token (< 16 chars)
    const shortRes = await fetch(`${baseUrl}/feedback/short`);
    assert.equal(shortRes.status, 400);

    // Nonexistent 32-char token
    const nonExistentToken = "a".repeat(32);
    const invalidRes = await fetch(`${baseUrl}/feedback/${nonExistentToken}`);
    assert.equal(invalidRes.status, 404);

    // Valid token
    const validRes = await fetch(`${baseUrl}/feedback/${fbToken1}`);
    assert.equal(validRes.status, 200);
    const payload = await validRes.json();
    assert.equal(payload.alreadySubmitted, false);
    assert.equal(payload.event.title, "AI & Cloud Summit 2026");
    assert.equal(payload.participant.name, "Aarav Sharma");
    assert.equal(payload.participant.checkedIn, true);
  });

  // -------------------------------------------------------------------------
  // TEST 4: Certificate Blocking Before Feedback Submitted
  // -------------------------------------------------------------------------
  await t.test("Certificate generation respects requireFeedbackForCertificate", async () => {
    // Attempt generation before feedback is submitted
    const genRes = await fetch(`${baseUrl}/certificates/event/${ongoingEvent._id}/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        registrationIds: [regAttended._id.toString()],
      }),
    });

    assert.equal(genRes.status, 200);
    const genPayload = await genRes.json();
    // Participant was ineligible because feedback was not submitted
    assert.equal(genPayload.issued.length, 0);
    assert.ok(genPayload.ineligible.includes(regAttended._id.toString()));

    // Check certificate manager status endpoint
    const statusRes = await fetch(`${baseUrl}/certificates/event/${ongoingEvent._id}`, { headers });
    assert.equal(statusRes.status, 200);
    const statusPayload = await statusRes.json();
    const p1 = statusPayload.participants.find((p) => p._id === regAttended._id.toString());
    assert.equal(p1.eligibilityStatus, "feedback_pending");
    assert.equal(p1.feedbackSubmitted, false);

    const p2 = statusPayload.participants.find((p) => p._id === regAbsent._id.toString());
    assert.equal(p2.eligibilityStatus, "ineligible_absent");
  });

  // -------------------------------------------------------------------------
  // TEST 5: Feedback Submission & Duplicate Prevention
  // -------------------------------------------------------------------------
  await t.test("POST /api/feedback/:token records ratings and prevents duplicates", async () => {
    // Invalid ratings validation
    const badRatingRes = await fetch(`${baseUrl}/feedback/${fbToken1}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratingOverall: 6, // Invalid > 5
        ratingOrganization: 4,
        ratingSpeakers: 5,
        ratingVenue: 4,
      }),
    });
    assert.equal(badRatingRes.status, 400);

    // Valid submission
    const submitRes = await fetch(`${baseUrl}/feedback/${fbToken1}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratingOverall: 5,
        ratingOrganization: 4,
        ratingSpeakers: 5,
        ratingVenue: 4,
        liked: "The hands-on autonomous agent demos and architectural breakdowns.",
        improvements: "A longer Q&A segment at the end.",
        suggestions: "Organize a follow-up hackathon on the same stack.",
      }),
    });

    assert.equal(submitRes.status, 201);
    const submitPayload = await submitRes.json();
    assert.equal(submitPayload.success, true);
    assert.equal(submitPayload.certificateEligible, true);

    // Verify registration document updated
    const updatedReg = await Registration.findById(regAttended._id);
    assert.equal(updatedReg.feedbackSubmitted, true);
    assert.ok(updatedReg.feedbackSubmittedAt);

    // Verify duplicate submission rejection
    const dupRes = await fetch(`${baseUrl}/feedback/${fbToken1}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratingOverall: 4,
        ratingOrganization: 4,
        ratingSpeakers: 4,
        ratingVenue: 4,
      }),
    });
    assert.equal(dupRes.status, 409);

    // Verify GET /api/feedback/:token now reports alreadySubmitted
    const checkRes = await fetch(`${baseUrl}/feedback/${fbToken1}`);
    const checkPayload = await checkRes.json();
    assert.equal(checkPayload.alreadySubmitted, true);
  });

  // -------------------------------------------------------------------------
  // TEST 6: Certificate Unlocked After Feedback Submission
  // -------------------------------------------------------------------------
  await t.test("Certificate eligibility updates to eligible after feedback submission", async () => {
    const statusRes = await fetch(`${baseUrl}/certificates/event/${ongoingEvent._id}`, { headers });
    assert.equal(statusRes.status, 200);
    const statusPayload = await statusRes.json();
    const p1 = statusPayload.participants.find((p) => p._id === regAttended._id.toString());
    assert.equal(p1.eligibilityStatus, "eligible");
    assert.equal(p1.feedbackSubmitted, true);
  });

  // -------------------------------------------------------------------------
  // TEST 7: Organizer Feedback Analytics Dashboard
  // -------------------------------------------------------------------------
  await t.test("GET /api/feedback/event/:eventId returns real metrics and feedback list", async () => {
    const fbRes = await fetch(`${baseUrl}/feedback/event/${ongoingEvent._id}`, { headers });
    assert.equal(fbRes.status, 200);
    const fbPayload = await fbRes.json();

    assert.equal(fbPayload.analytics.totalInvited, 2);
    assert.equal(fbPayload.analytics.submissionsReceived, 1);
    assert.equal(fbPayload.analytics.pendingFeedback, 1);
    assert.equal(fbPayload.analytics.responseRate, 50);
    assert.equal(fbPayload.analytics.averageRatings.overall, 5);
    assert.equal(fbPayload.analytics.averageRatings.organization, 4);
    assert.equal(fbPayload.analytics.averageRatings.speakers, 5);
    assert.equal(fbPayload.analytics.averageRatings.venue, 4);
    assert.equal(fbPayload.feedbacks.length, 1);
    assert.equal(fbPayload.feedbacks[0].participantName, "Aarav Sharma");
  });

  // -------------------------------------------------------------------------
  // TEST 8: Retry Emails Endpoint
  // -------------------------------------------------------------------------
  await t.test("POST /api/feedback/event/:eventId/retry-emails processes queue", async () => {
    const retryRes = await fetch(`${baseUrl}/feedback/event/${ongoingEvent._id}/retry-emails`, {
      method: "POST",
      headers,
    });
    assert.equal(retryRes.status, 200);
    const retryPayload = await retryRes.json();
    assert.ok(retryPayload.result);
  });

  // -------------------------------------------------------------------------
  // TEST 9: Post-Event Dashboard Summary Endpoint
  // -------------------------------------------------------------------------
  await t.test("GET /api/events/:eventId/post-event returns integrated status", async () => {
    const summaryRes = await fetch(`${baseUrl}/events/${ongoingEvent._id}/post-event`, { headers });
    assert.equal(summaryRes.status, 200);
    const payload = await summaryRes.json();

    assert.equal(payload.event.status, "completed");
    assert.equal(payload.attendance.confirmedCount, 2);
    assert.equal(payload.attendance.attendedCount, 1);
    assert.equal(payload.attendance.attendanceRate, 50);
    assert.equal(payload.feedback.submissionsReceived, 1);
    assert.equal(payload.feedback.responseRate, 50);
    assert.equal(payload.feedback.averageOverallRating, 5);
    assert.equal(payload.report.status, "collecting_feedback");
  });

  // -------------------------------------------------------------------------
  // TEST 10: Finalize Report Endpoint
  // -------------------------------------------------------------------------
  await t.test("POST /api/events/:eventId/finalize-report finalizes post-event report", async () => {
    const finRes = await fetch(`${baseUrl}/events/${ongoingEvent._id}/finalize-report`, {
      method: "POST",
      headers,
    });
    assert.equal(finRes.status, 200);
    const finPayload = await finRes.json();
    assert.equal(finPayload.report.reportStatus, "finalized");
  });
});
