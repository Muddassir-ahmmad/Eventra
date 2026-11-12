import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "eventra-test-jwt-secret-long-random-phase3";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eventra";

import User from "../src/models/User.js";
import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import registrationRoutes from "../src/routes/registrations.js";
import { generateTicketPdf } from "../src/services/ticketPdfService.js";

// Unit test: executes unconditionally without requiring live MongoDB connection
test("Phase 3 unit: generateTicketPdf generates valid vector PDF binary with embedded QR", async () => {
  const dummyEvent = {
    _id: "64f1a2b3c4d5e6f7a8b9c0d1",
    title: "Global Tech Symposium 2026",
    date: new Date().toISOString(),
    startTime: "10:00",
    endTime: "17:00",
    venue: "Main Auditorium",
    location: "Tech Campus",
  };

  const dummyRegistration = {
    registrationId: "EVT-UNIT-2026-001",
    name: "Alex Rivera",
    college: "Institute of Computing",
    department: "Data Science",
    ticketType: "VIP Delegate",
  };

  const pdfBuffer = await generateTicketPdf(dummyEvent, dummyRegistration);
  assert.ok(Buffer.isBuffer(pdfBuffer), "Result should be a Node Buffer");
  assert.ok(pdfBuffer.length > 500, "PDF buffer should contain vector graphics and text");
  const header = pdfBuffer.subarray(0, 5).toString("utf8");
  assert.equal(header, "%PDF-", "Generated file should have valid PDF signature header");
});

test("Phase 3 integration: Digital Tickets, Attendance Dashboard & Fast Check-In Suite", async (t) => {
  let server;
  let baseUrl;
  let organizer;
  let authToken;
  let headers;
  let event;
  let reg1;
  let reg2;
  let reg3;

  t.after(async () => {
    if (event) {
      try {
        await Registration.deleteMany({ eventId: event._id });
        await Event.deleteOne({ _id: event._id });
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
    app.use("/api/registrations", registrationRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    server.unref();
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api/registrations`;

    organizer = await User.create({
      name: "Phase 3 Gate Desk Organizer",
      email: `gate-organizer-${Date.now()}@example.com`,
      password: "password123",
      organization: "National Tech Forum",
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

    event = await Event.create({
      organizerId: organizer._id,
      title: "DevOps & Cloud Summit 2026",
      slug: `devops-cloud-summit-${Date.now()}`,
      category: "Technical",
      mode: "in-person",
      date: new Date(Date.now() + 86400000 * 2),
      venue: "Convention Center Hall A",
      capacity: 50,
      status: "published",
      qrEnabled: true,
    });

    // Participant 1: Confirmed, not checked in
    reg1 = await Registration.create({
      eventId: event._id,
      registrationId: `EVT-TEST-${Date.now()}-01`,
      name: "Aarav Sharma",
      email: `aarav-${Date.now()}@example.com`,
      phone: "+91 9123456789",
      college: "Tech University",
      status: "confirmed",
      checkedIn: false,
    });

    // Participant 2: Confirmed, not checked in
    reg2 = await Registration.create({
      eventId: event._id,
      registrationId: `EVT-TEST-${Date.now()}-02`,
      name: "Priya Nair",
      email: `priya-${Date.now()}@example.com`,
      phone: "+91 9234567890",
      college: "Global Institute",
      status: "confirmed",
      checkedIn: false,
    });

    // Participant 3: Cancelled
    reg3 = await Registration.create({
      eventId: event._id,
      registrationId: `EVT-TEST-${Date.now()}-03`,
      name: "Cancelled Attendee",
      email: `cancelled-${Date.now()}@example.com`,
      phone: "+91 9345678901",
      college: "City College",
      status: "cancelled",
      checkedIn: false,
    });
  });

  // 1. Vector PDF ticket generation unit test
  await t.test("generateTicketPdf generates valid vector PDF binary with embedded QR", async () => {
    const pdfBuffer = await generateTicketPdf(event, reg1);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 500, "PDF buffer should contain vector drawing and text");
    const header = pdfBuffer.subarray(0, 5).toString("utf8");
    assert.equal(header, "%PDF-", "Generated file should have valid PDF signature header");
  });

  // 2. Public ticket pass metadata API
  await t.test("GET /ticket/:registrationId returns digital ticket pass data", async () => {
    const res = await fetch(`${baseUrl}/ticket/${reg1.registrationId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.registration.registrationId, reg1.registrationId);
    assert.equal(data.registration.name, reg1.name);
    assert.equal(data.event.title, event.title);
    assert.equal(data.event.venue, event.venue);
  });

  // 3. Fast check-in via registrationId
  await t.test("POST /event/:eventId/checkin checks in participant using registrationId", async () => {
    const res = await fetch(`${baseUrl}/event/${event._id}/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier: reg1.registrationId }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.alreadyCheckedIn, false);
    assert.equal(data.registration.checkedIn, true);
    assert.ok(data.registration.checkedInAt);

    // Verify in database
    const refreshed = await Registration.findById(reg1._id);
    assert.equal(refreshed.checkedIn, true);
    assert.ok(refreshed.checkedInAt);
  });

  // 4. Duplicate check-in prevention
  await t.test("POST /event/:eventId/checkin detects duplicate entry attempt and preserves original timestamp", async () => {
    const original = await Registration.findById(reg1._id);
    const originalTime = original.checkedInAt.toISOString();

    const res = await fetch(`${baseUrl}/event/${event._id}/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier: reg1.registrationId }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.alreadyCheckedIn, true);
    assert.ok(data.message.includes("Already checked in"));

    // Ensure timestamp was not changed
    const refreshed = await Registration.findById(reg1._id);
    assert.equal(refreshed.checkedInAt.toISOString(), originalTime);
  });

  // 5. Fast check-in via Attendee Email
  await t.test("POST /event/:eventId/checkin checks in participant using email address", async () => {
    const res = await fetch(`${baseUrl}/event/${event._id}/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier: reg2.email }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.alreadyCheckedIn, false);
    assert.equal(data.registration.checkedIn, true);
    assert.equal(data.registration.email, reg2.email);
  });

  // 6. Fast check-in via parsed QR JSON payload
  await t.test("POST /event/:eventId/checkin parses JSON QR scanner payload seamlessly", async () => {
    // Reset reg2 check-in for this test
    await Registration.updateOne({ _id: reg2._id }, { $set: { checkedIn: false, checkedInAt: null } });

    const qrPayload = JSON.stringify({
      regId: reg2.registrationId,
      eventId: event._id.toString(),
      name: reg2.name,
    });

    const res = await fetch(`${baseUrl}/event/${event._id}/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier: qrPayload }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.alreadyCheckedIn, false);
    assert.equal(data.registration.registrationId, reg2.registrationId);
  });

  // 7. Manual Attendance Toggle (Undo Entry & Re-mark)
  await t.test("POST /event/:eventId/registrations/:registrationId/toggle-attendance toggles gate status", async () => {
    // Current status is checkedIn: true -> should toggle to false
    const toggleOff = await fetch(
      `${baseUrl}/event/${event._id}/registrations/${reg1._id}/toggle-attendance`,
      { method: "POST", headers }
    );
    assert.equal(toggleOff.status, 200);
    const dataOff = await toggleOff.json();
    assert.equal(dataOff.registration.checkedIn, false);
    assert.equal(dataOff.registration.checkedInAt, null);

    // Toggle back on -> should toggle to true
    const toggleOn = await fetch(
      `${baseUrl}/event/${event._id}/registrations/${reg1._id}/toggle-attendance`,
      { method: "POST", headers }
    );
    assert.equal(toggleOn.status, 200);
    const dataOn = await toggleOn.json();
    assert.equal(dataOn.registration.checkedIn, true);
    assert.ok(dataOn.registration.checkedInAt);
  });

  // 8. Attendance Dashboard Analytics
  await t.test("GET /event/:eventId returns real metrics, rates and attendee list", async () => {
    const res = await fetch(`${baseUrl}/event/${event._id}`, {
      headers,
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.stats.totalRegistrations, 3);
    assert.equal(data.stats.confirmedRegistrations, 2);
    assert.equal(data.stats.cancelledRegistrations, 1);
    assert.equal(data.stats.attendedParticipants, 2); // reg1 and reg2 are both present
    assert.equal(data.stats.absentParticipants, 0);
    assert.equal(data.stats.attendancePercentage, 100);

    assert.equal(data.registrations.length, 3);
  });

  // 9. Rejects unknown registration with 404
  await t.test("POST /event/:eventId/checkin returns 404 for unknown registration", async () => {
    const res = await fetch(`${baseUrl}/event/${event._id}/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier: "INVALID-REG-CODE" }),
    });

    assert.equal(res.status, 404);
  });

  // 10. Locks gate scanner check-in and manual toggle after event concludes
  await t.test("Attendance entry locks checkin and manual toggle after event ends", async () => {
    await Event.findByIdAndUpdate(event._id, {
      status: "completed",
      completedAt: new Date(),
    });

    const dashRes = await fetch(`${baseUrl}/event/${event._id}`, { headers });
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.equal(dashData.attendanceLocked, true);

    const checkinRes = await fetch(`${baseUrl}/event/${event._id}/checkin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ identifier: reg1.registrationId }),
    });
    assert.equal(checkinRes.status, 403);
    const checkinBody = await checkinRes.json();
    assert.equal(checkinBody.locked, true);

    const toggleRes = await fetch(
      `${baseUrl}/event/${event._id}/registrations/${reg1._id}/toggle-attendance`,
      { method: "POST", headers }
    );
    assert.equal(toggleRes.status, 403);
    const toggleBody = await toggleRes.json();
    assert.equal(toggleBody.locked, true);
  });
});
