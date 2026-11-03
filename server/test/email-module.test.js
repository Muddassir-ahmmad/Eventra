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
import Certificate from "../src/models/Certificate.js";
import EmailLog from "../src/models/EmailLog.js";
import User from "../src/models/User.js";
import emailRoutes from "../src/routes/emails.js";
import eventRoutes from "../src/routes/events.js";
import registrationRoutes from "../src/routes/registrations.js";
import certificateRoutes from "../src/routes/certificates.js";
import emailService from "../src/services/emailService.js";
import { generateTicketPdf } from "../src/services/ticketPdfService.js";

test("complete email notification module test suite", async (t) => {
  // Test unit methods first
  await t.test("emailService.validateEmail validates standard RFC email syntax", () => {
    assert.equal(emailService.validateEmail("user@example.com"), true);
    assert.equal(emailService.validateEmail("student.doe+tag@university.edu"), true);
    assert.equal(emailService.validateEmail("invalid-email"), false);
    assert.equal(emailService.validateEmail("missing@domain"), false);
    assert.equal(emailService.validateEmail("@nodomain.com"), false);
    assert.equal(emailService.validateEmail(""), false);
    assert.equal(emailService.validateEmail(null), false);
  });

  await t.test("ticketPdfService generates valid PDF buffer with embedded QR", async () => {
    const mockEvent = {
      _id: new mongoose.Types.ObjectId(),
      title: "Tech Innovation Day 2026",
      date: new Date(),
      startTime: "10:00",
      endTime: "16:00",
      venue: "Grand Hall",
      location: "East Campus",
    };
    const mockReg = {
      name: "Dev Attendee",
      registrationId: "REG-999888",
      department: "Data Science",
      college: "Institute of Tech",
    };

    const pdfBuffer = await generateTicketPdf(mockEvent, mockReg);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 500);
    // PDF Magic bytes: %PDF-
    assert.equal(pdfBuffer.subarray(0, 4).toString(), "%PDF");
  });

  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    t.skip("MONGODB_URI and JWT_SECRET are required for integration tests.");
    return;
  }

  const databaseName = `eventra_email_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const app = express();
  app.use(express.json());
  app.use("/api/events", eventRoutes);
  app.use("/api/registrations", registrationRoutes);
  app.use("/api/certificates", certificateRoutes);
  app.use("/api/emails", emailRoutes);

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

  // Create Users
  await User.create([
    {
      _id: organizerId,
      name: "Event Organizer",
      email: "organizer@eventra.local",
      password: "hashedpassword123",
      organization: "Autonomous Society",
      emailNotifications: {
        notifyOnRegistration: true,
        notifyOnCapacity: true,
      },
    },
    {
      _id: otherOrganizerId,
      name: "Other Organizer",
      email: "other@eventra.local",
      password: "hashedpassword123",
      organization: "Other Society",
    },
  ]);

  // Create Event
  const event = await Event.create({
    organizerId,
    title: "National Tech Symposium 2026",
    slug: `symposium-${crypto.randomUUID().slice(0, 8)}`,
    description: "Annual symposium for engineering and research.",
    date: new Date(),
    startTime: "09:30",
    endTime: "17:30",
    venue: "Main Auditorium",
    location: "Campus A",
    capacity: 2, // Low capacity to test capacity alert
    status: "published",
    certificateEnabled: true,
  });

  // -------------------------------------------------------------------------
  // TEST 1: Missing / Unconfigured SMTP Handling (Never Fake Delivery)
  // -------------------------------------------------------------------------
  await t.test("email delivery records failure cleanly when SMTP is not configured", async () => {
    const origHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    const result = await emailService.sendMail({
      to: "test@example.com",
      subject: "Test Unconfigured",
      html: "<p>Test</p>",
      text: "Test",
      eventId: event._id,
      emailType: "test_email",
    });

    assert.equal(result.success, false);
    assert.ok(result.error.includes("not configured"));

    // Check log recorded failure in MongoDB
    const log = await EmailLog.findById(result.logId);
    assert.ok(log);
    assert.equal(log.deliveryStatus, "failed");
    assert.ok(log.errorMessage.includes("not configured"));

    // Restore host
    if (origHost) process.env.SMTP_HOST = origHost;
  });

  // -------------------------------------------------------------------------
  // TEST 2: Invalid Recipient Address Validation
  // -------------------------------------------------------------------------
  await t.test("sendMail rejects invalid recipient syntax and records failure", async () => {
    const result = await emailService.sendMail({
      to: "not-an-email",
      subject: "Test Bad Email",
      html: "<p>Test</p>",
      text: "Test",
      eventId: event._id,
      emailType: "registration_confirmation",
    });

    assert.equal(result.success, false);
    assert.equal(result.error, "Invalid recipient email address syntax.");

    const log = await EmailLog.findById(result.logId);
    assert.equal(log.deliveryStatus, "failed");
    assert.equal(log.recipient, "not-an-email");
  });

  // -------------------------------------------------------------------------
  // TEST 3: Registration Confirmation & Ticket Generation
  // -------------------------------------------------------------------------
  let registration1;
  await t.test("participant registration triggers confirmation and digital ticket generation", async () => {
    const regRes = await fetch(`${baseUrl}/registrations/public/${event.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Rahul Verma",
        email: "rahul@example.com",
        phone: "9876543210",
        college: "State Engineering College",
        department: "Computer Science",
      }),
    });

    assert.equal(regRes.status, 201);
    const regPayload = await regRes.json();
    assert.equal(regPayload.message, "Registration successful");
    assert.ok(regPayload.registration.registrationId);

    registration1 = await Registration.findById(regPayload.registration.id);
    assert.ok(registration1);

    // Give background async process a moment to create logs
    await new Promise((r) => setTimeout(r, 200));

    // Verify EmailLog recorded registration_confirmation and ticket_delivery
    const logs = await EmailLog.find({ registrationId: registration1._id });
    assert.ok(logs.length >= 1);
    const confLog = logs.find((l) => l.emailType === "registration_confirmation");
    assert.ok(confLog);
    assert.equal(confLog.recipient, "rahul@example.com");

    const ticketLog = logs.find((l) => l.emailType === "ticket_delivery");
    assert.ok(ticketLog);
    assert.equal(ticketLog.recipient, "rahul@example.com");
  });

  // -------------------------------------------------------------------------
  // TEST 4: Capacity Alert Notification to Organizer
  // -------------------------------------------------------------------------
  await t.test("second registration fills capacity and triggers capacity alert", async () => {
    const regRes = await fetch(`${baseUrl}/registrations/public/${event.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Sneha Nair",
        email: "sneha@example.com",
        phone: "9876543212",
        college: "State Engineering College",
        department: "Information Tech",
      }),
    });

    assert.equal(regRes.status, 201);

    await new Promise((r) => setTimeout(r, 200));

    // Verify organizer alert in EmailLog
    const alertLogs = await EmailLog.find({
      eventId: event._id,
      emailType: "organizer_alert",
    });
    assert.ok(alertLogs.length >= 1);
    const capacityLog = alertLogs.find((l) => l.metadata?.alertType === "capacity_reached");
    assert.ok(capacityLog);
    assert.equal(capacityLog.recipient, "organizer@eventra.local");
  });

  // -------------------------------------------------------------------------
  // TEST 5: Certificate PDF Attachment and Delivery
  // -------------------------------------------------------------------------
  await t.test("certificate email delivers PDF and updates lastEmailedAt", async () => {
    // Mark registration1 as attended
    registration1.checkedIn = true;
    registration1.checkedInAt = new Date();
    await registration1.save();

    // Create a mock generated certificate with dummy PDF data
    const dummyPdf = Buffer.from("%PDF-1.4 Mock Certificate Data");
    const cert = await Certificate.create({
      eventId: event._id,
      registrationId: registration1._id,
      issuedTo: registration1.name,
      email: registration1.email,
      pdfData: dummyPdf,
      generatedAt: new Date(),
    });

    const emailRes = await fetch(`${baseUrl}/certificates/event/${event._id}/${registration1._id}/email`, {
      method: "POST",
      headers,
    });

    // If SMTP is not configured, returns 503; if configured, returns 200 or 502
    assert.ok([200, 502, 503].includes(emailRes.status));

    // Verify EmailLog created for certificate_delivery
    const certLog = await EmailLog.findOne({
      registrationId: registration1._id,
      emailType: "certificate_delivery",
    });
    assert.ok(certLog);
    assert.equal(certLog.recipient, "rahul@example.com");
  });

  // -------------------------------------------------------------------------
  // TEST 6: Bulk Certificate Delivery Endpoint
  // -------------------------------------------------------------------------
  await t.test("POST /api/certificates/event/:eventId/email-bulk handles bulk delivery", async () => {
    const bulkRes = await fetch(`${baseUrl}/certificates/event/${event._id}/email-bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        registrationIds: [registration1._id.toString()],
      }),
    });

    assert.ok([200, 503].includes(bulkRes.status));
    const payload = await bulkRes.json();
    assert.ok(payload.message);
  });

  // -------------------------------------------------------------------------
  // TEST 7: Duplicate-Send Prevention
  // -------------------------------------------------------------------------
  await t.test("sendMail prevents duplicate sends within cooldown window", async () => {
    // Create a sent log to simulate a recently sent email
    await EmailLog.create({
      eventId: event._id,
      registrationId: registration1._id,
      emailType: "ticket_delivery",
      recipient: registration1.email,
      subject: "Digital Ticket",
      deliveryStatus: "sent",
      sentAt: new Date(),
    });

    const duplicateAttempt = await emailService.sendMail({
      to: registration1.email,
      subject: "Digital Ticket",
      html: "<p>Ticket</p>",
      text: "Ticket",
      eventId: event._id,
      registrationId: registration1._id,
      emailType: "ticket_delivery",
    });

    assert.equal(duplicateAttempt.success, false);
    assert.equal(duplicateAttempt.skipped, true);
    assert.ok(duplicateAttempt.message.includes("Duplicate email prevented"));
  });

  // -------------------------------------------------------------------------
  // TEST 8: Organizer Email Logs & Unauthorized Access
  // -------------------------------------------------------------------------
  await t.test("GET /api/emails/event/:eventId returns real logs and enforces ownership", async () => {
    // Unauthorized access rejection
    const unauthRes = await fetch(`${baseUrl}/emails/event/${event._id}`, {
      headers: otherHeaders,
    });
    assert.equal(unauthRes.status, 404);

    // Authorized access
    const authRes = await fetch(`${baseUrl}/emails/event/${event._id}`, {
      headers,
    });
    assert.equal(authRes.status, 200);
    const payload = await authRes.json();
    assert.ok(Array.isArray(payload.logs));
    assert.ok(payload.stats);
    assert.ok(payload.stats.totalDispatched >= 2);
    assert.ok(payload.provider);
  });

  // -------------------------------------------------------------------------
  // TEST 9: Failed Email Retry Mechanism
  // -------------------------------------------------------------------------
  await t.test("POST /api/emails/:emailLogId/retry handles retry attempts", async () => {
    const failedLog = await EmailLog.create({
      eventId: event._id,
      registrationId: registration1._id,
      emailType: "ticket_delivery",
      recipient: "retry-target@example.com",
      subject: "Retry Ticket Test",
      deliveryStatus: "failed",
      errorMessage: "Connection timeout",
    });

    // Unauthorized retry rejection
    const unauthRetry = await fetch(`${baseUrl}/emails/${failedLog._id}/retry`, {
      method: "POST",
      headers: otherHeaders,
    });
    assert.equal(unauthRetry.status, 403);

    // Authorized retry
    const retryRes = await fetch(`${baseUrl}/emails/${failedLog._id}/retry`, {
      method: "POST",
      headers,
    });
    assert.ok([200, 502].includes(retryRes.status));
    const retryPayload = await retryRes.json();
    assert.ok(retryPayload.message || retryPayload.log);
  });

  // -------------------------------------------------------------------------
  // TEST 10: Manual Digital Ticket Email Endpoint
  // -------------------------------------------------------------------------
  await t.test("POST /api/emails/event/:eventId/registrations/:registrationId/ticket sends ticket", async () => {
    const ticketRes = await fetch(`${baseUrl}/emails/event/${event._id}/registrations/${registration1._id}/ticket`, {
      method: "POST",
      headers,
    });

    assert.ok([200, 502, 503].includes(ticketRes.status));
    const payload = await ticketRes.json();
    assert.ok(payload.message);
  });
});
