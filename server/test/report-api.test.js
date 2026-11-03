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
import User from "../src/models/User.js";
import PostEventReport from "../src/models/PostEventReport.js";
import reportRoutes from "../src/routes/reports.js";
import eventRoutes from "../src/routes/events.js";

test("post-event report generation module API suite", async (t) => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    t.skip("MONGODB_URI and JWT_SECRET are required for report API integration tests.");
    return;
  }

  const databaseName = `eventra_report_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const app = express();
  app.use(express.json());
  app.use("/api/events", eventRoutes);
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

    await User.create([
      {
        _id: organizerId,
        name: "Test Report Lead",
        email: `lead_${databaseName}@example.test`,
        password: "secure_test_password",
        organization: "Apex Engineering Society",
      },
      {
        _id: otherOrganizerId,
        name: "Unauthorized Organizer",
        email: `unauthorized_${databaseName}@example.test`,
        password: "secure_test_password",
        organization: "Other Society",
      },
    ]);

    // 1. Create an Upcoming Event (10 days in the future)
    const futureDate = new Date(Date.now() + 86400000 * 10);
    const upcomingEvent = await Event.create({
      organizerId,
      title: "Upcoming Tech Expo 2027",
      slug: `upcoming-expo-${crypto.randomUUID().slice(0, 8)}`,
      date: futureDate,
      startTime: "10:00",
      endTime: "17:00",
      venue: "Grand Hall A",
      capacity: 500,
      status: "published",
    });

    // Verify report is unavailable before completion
    let res = await fetch(`${baseUrl}/reports/event/${upcomingEvent._id}`, { headers });
    assert.equal(res.status, 200);
    let data = await res.json();
    assert.equal(data.isEventEnded, false);
    assert.ok(data.message.includes("upcoming or ongoing"));

    // Attempting to POST report for upcoming event must fail
    res = await fetch(`${baseUrl}/reports/event/${upcomingEvent._id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ executiveSummary: "Premature report attempt" }),
    });
    assert.equal(res.status, 400);

    // Attempting to download PDF for upcoming event must fail
    res = await fetch(`${baseUrl}/reports/event/${upcomingEvent._id}/pdf`, { headers });
    assert.equal(res.status, 400);

    // 2. Create a Completed Event (concluded in the past)
    const pastDate = new Date(Date.now() - 86400000 * 3);
    const completedEvent = await Event.create({
      organizerId,
      title: "Advanced AI Symposium 2026",
      slug: `ai-symposium-${crypto.randomUUID().slice(0, 8)}`,
      date: pastDate,
      startTime: "09:00",
      endTime: "16:00",
      venue: "Auditorium 2",
      capacity: 200,
      status: "published",
      speakers: [
        { name: "Dr. Sarah Connor", designation: "AI Director", organization: "TechCorp", role: "Keynote" },
      ],
    });

    // Populate Real Registrations & Attendance records
    await Registration.create([
      {
        eventId: completedEvent._id,
        name: "Attendee One",
        email: "att1@test.org",
        phone: "1111111111",
        college: "Engineering College A",
        department: "Computer Science",
        registrationId: `${databaseName}-reg1`,
        status: "confirmed",
        checkedIn: true,
        checkedInAt: new Date(pastDate.getTime() + 3600000),
      },
      {
        eventId: completedEvent._id,
        name: "Attendee Two",
        email: "att2@test.org",
        phone: "2222222222",
        college: "Engineering College A",
        department: "Computer Science",
        registrationId: `${databaseName}-reg2`,
        status: "confirmed",
        checkedIn: true,
        checkedInAt: new Date(pastDate.getTime() + 3700000),
      },
      {
        eventId: completedEvent._id,
        name: "Absentee Three",
        email: "att3@test.org",
        phone: "3333333333",
        college: "Engineering College B",
        department: "Electronics",
        registrationId: `${databaseName}-reg3`,
        status: "confirmed",
        checkedIn: false,
      },
      {
        eventId: completedEvent._id,
        name: "Cancelled Four",
        email: "att4@test.org",
        phone: "4444444444",
        college: "Engineering College A",
        department: "Computer Science",
        registrationId: `${databaseName}-reg4`,
        status: "cancelled",
        checkedIn: false,
      },
    ]);

    // 3. Verify Completed Event Report is Available
    res = await fetch(`${baseUrl}/reports/event/${completedEvent._id}`, { headers });
    assert.equal(res.status, 200);
    data = await res.json();
    assert.equal(data.isEventEnded, true);
    assert.equal(data.event.title, "Advanced AI Symposium 2026");
    assert.equal(data.organizer.organization, "Apex Engineering Society");

    // Verify Real Analytics
    assert.equal(data.analytics.totalRegistrations, 4);
    assert.equal(data.analytics.confirmedCount, 3);
    assert.equal(data.analytics.cancelledCount, 1);
    assert.equal(data.analytics.attendedCount, 2);
    assert.equal(data.analytics.absentCount, 1);
    // 2 attended / 3 confirmed = 66.7%
    assert.equal(data.analytics.attendanceRate, 66.7);

    // Verify 12 default sections populated
    assert.ok(data.report.executiveSummary.includes("Advanced AI Symposium 2026"));
    assert.ok(data.report.objectives.length > 20);
    assert.ok(data.report.activities.length > 20);
    assert.ok(data.report.speakersSummary.includes("Dr. Sarah Connor"));
    assert.ok(data.report.feedbackSummary.includes("not actively collected"));

    // 4. Save Report Draft
    res = await fetch(`${baseUrl}/reports/event/${completedEvent._id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        executiveSummary: "Updated executive summary for symposium.",
        objectives: "Updated objectives.",
        reportStatus: "draft",
      }),
    });
    assert.equal(res.status, 200);
    data = await res.json();
    assert.equal(data.report.executiveSummary, "Updated executive summary for symposium.");
    assert.equal(data.report.reportStatus, "draft");

    // 5. Update Report to Completed
    res = await fetch(`${baseUrl}/reports/event/${completedEvent._id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        executiveSummary: "Finalized executive summary.",
        objectives: "Finalized objectives.",
        conclusion: "Finalized conclusion.",
        reportStatus: "completed",
      }),
    });
    assert.equal(res.status, 200);
    data = await res.json();
    assert.equal(data.report.reportStatus, "completed");

    // 6. Download Multi-Page PDF Report
    res = await fetch(`${baseUrl}/reports/event/${completedEvent._id}/pdf`, { headers });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");
    const pdfBytes = Buffer.from(await res.arrayBuffer());
    assert.ok(pdfBytes.length > 1000, "PDF size must be substantial");
    // Verify PDF header magic bytes %PDF
    assert.ok(pdfBytes.subarray(0, 4).equals(Buffer.from("%PDF")));

    // 7. Test Zero-Registration Event Handling
    const zeroEvent = await Event.create({
      organizerId,
      title: "Zero Registration Seminar",
      slug: `zero-reg-${crypto.randomUUID().slice(0, 8)}`,
      date: pastDate,
      venue: "Room 101",
      capacity: 50,
      status: "closed",
    });

    res = await fetch(`${baseUrl}/reports/event/${zeroEvent._id}`, { headers });
    assert.equal(res.status, 200);
    data = await res.json();
    assert.equal(data.isEventEnded, true);
    assert.equal(data.analytics.totalRegistrations, 0);
    assert.equal(data.analytics.attendedCount, 0);
    assert.equal(data.analytics.attendanceRate, 0);

    // PDF for zero-registration event should also render cleanly
    res = await fetch(`${baseUrl}/reports/event/${zeroEvent._id}/pdf`, { headers });
    assert.equal(res.status, 200);

    // 8. Test AI Assistant Guard (when unconfigured)
    const prevKey = process.env.AI_API_KEY;
    delete process.env.AI_API_KEY;
    res = await fetch(`${baseUrl}/reports/event/${completedEvent._id}/ai-assist`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        section: "Executive Summary",
        text: "Draft text to improve",
      }),
    });
    assert.equal(res.status, 200);
    data = await res.json();
    assert.equal(data.configured, false);
    assert.ok(data.message.includes("Configure AI_API_KEY"));
    if (prevKey) process.env.AI_API_KEY = prevKey;

    // 9. Unauthorized Access Prevention
    res = await fetch(`${baseUrl}/reports/event/${completedEvent._id}`, { headers: otherHeaders });
    assert.equal(res.status, 404); // Ownership check returns 404 for unowned events

    res = await fetch(`${baseUrl}/reports/event/${completedEvent._id}/pdf`, { headers: otherHeaders });
    assert.equal(res.status, 404);
  } catch (err) {
    if (
      err.code === "ECONNREFUSED" ||
      err.code === "EACCES" ||
      err.name === "MongoServerSelectionError" ||
      err.name === "MongooseServerSelectionError"
    ) {
      t.skip("The configured MongoDB instance is unavailable for integration tests.");
      return;
    }
    throw err;
  }
});
