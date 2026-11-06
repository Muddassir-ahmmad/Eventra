import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = process.env.JWT_SECRET || "eventra-test-jwt-secret-long-random-phase2";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eventra";

import User from "../src/models/User.js";
import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import authRoutes from "../src/routes/auth.js";
import eventRoutes from "../src/routes/events.js";
import registrationRoutes from "../src/routes/registrations.js";
import express from "express";

test("Phase 2: Event creation, poster templates, public event landing, and registration", async (t) => {
  let server;
  let baseUrl;
  let organizer;
  let authToken;
  let headers;
  let createdEvent;
  let registeredParticipant;

  t.after(async () => {
    if (createdEvent) {
      try {
        await Registration.deleteMany({ eventId: createdEvent._id });
        await Event.deleteOne({ _id: createdEvent._id });
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

  await t.test("setup test environment", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/events", eventRoutes);
    app.use("/api/registrations", registrationRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    server.unref();
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api`;

    const email = `organizer-phase2-${Date.now()}@example.com`;
    organizer = await User.create({
      name: "Phase 2 Organizer",
      email,
      password: "password123",
      organization: "Tech Innovation Council",
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
  });

  // 1. Create full-featured event with category, mode, agenda, faqs, posterTemplate
  await t.test("POST /api/events creates event with full metadata, agenda, faqs, and templates", async () => {
    const payload = {
      title: `Global AI Summit ${Date.now()}`,
      shortDescription: "A premier international conference on autonomous AI systems.",
      description: "Join industry architects, researchers, and developers for three days of intense learning, workshops, and keynote demonstrations.",
      category: "Technical",
      mode: "hybrid",
      contactEmail: "contact@aisummit.org",
      contactPhone: "+91 9876543210",
      date: new Date(Date.now() + 86400000 * 10).toISOString(),
      startTime: "09:30",
      endTime: "17:30",
      venue: "Grand Tech Arena",
      location: "Bangalore, India",
      capacity: 100,
      posterType: "template",
      posterUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==",
      speakers: [
        {
          name: "Dr. Alice Turing",
          role: "Keynote Speaker",
          designation: "Chief AI Scientist",
          organization: "Deep Learning Labs",
        },
      ],
      agenda: [
        {
          time: "09:30 AM",
          title: "Opening Keynote: Autonomous Agents",
          description: "An architectural exploration of self-directed AI workflows.",
          speaker: "Dr. Alice Turing",
        },
      ],
      faqs: [
        {
          question: "Can I attend virtually?",
          answer: "Yes, this is a hybrid event with live stream access for remote participants.",
        },
      ],
      ticketMode: "free",
      ticketTypes: [
        { name: "General Admission", price: 0, capacity: 80 },
        { name: "VIP Pass", price: 0, capacity: 20 },
      ],
      status: "published",
    };

    const res = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.event);
    assert.ok(data.event.title.includes("Global AI Summit"));
    assert.equal(data.event.category, "Technical");
    assert.equal(data.event.mode, "hybrid");
    assert.equal(data.event.speakers.length, 1);
    assert.equal(data.event.agenda.length, 1);
    assert.equal(data.event.faqs.length, 1);
    assert.equal(data.event.status, "published");

    createdEvent = data.event;
  });

  // 2. AI Poster Generation Fallback
  await t.test("POST /api/events/generate-poster gracefully handles unconfigured AI API", async () => {
    const res = await fetch(`${baseUrl}/events/generate-poster`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Test Event",
        category: "Hackathon",
      }),
    });

    if (!process.env.AI_API_KEY && !process.env.OPENAI_API_KEY) {
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.configured, false);
      assert.ok(data.message.includes("AI poster generation is currently unavailable"));
    }
  });

  // 3. Public Event Page Endpoint
  await t.test("GET /api/events/public/:slug returns presentation data and organizer profile", async () => {
    const res = await fetch(`${baseUrl}/events/public/${createdEvent.slug}`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.event);
    assert.equal(data.event.title, createdEvent.title);
    assert.equal(data.event.organizer.name, "Phase 2 Organizer");
    assert.equal(data.event.organizer.organization, "Tech Innovation Council");
    assert.equal(data.event.registrationCount, 0);
    assert.equal(data.event.isSoldOut, false);
    assert.equal(data.event.agenda.length, 1);
    assert.equal(data.event.speakers.length, 1);
    assert.equal(data.event.faqs.length, 1);
  });

  // 4. Participant Registration with Custom Questions & Ticket Selection
  await t.test("POST /api/registrations/public/:slug registers participant with ticket pass", async () => {
    const regPayload = {
      name: "Rohit Verma",
      email: "rohit.verma@example.com",
      phone: "+91 9988776655",
      college: "Sahyadri College of Engineering",
      department: "Computer Science",
      ticketType: "VIP Pass",
      customAnswers: {
        tshirtSize: "L",
        githubUrl: "https://github.com/rohitverma",
      },
    };

    const res = await fetch(`${baseUrl}/registrations/public/${createdEvent.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regPayload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.registration);
    assert.ok(data.registration.registrationId);
    assert.equal(data.registration.name, "Rohit Verma");
    assert.equal(data.registration.ticketType, "VIP Pass");

    registeredParticipant = data.registration;
  });

  // 5. Digital Ticket View Endpoint
  await t.test("GET /api/registrations/ticket/:registrationId returns digital ticket pass", async () => {
    const res = await fetch(`${baseUrl}/registrations/ticket/${registeredParticipant.registrationId}`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.registration);
    assert.ok(data.event);
    assert.equal(data.registration.registrationId, registeredParticipant.registrationId);
    assert.equal(data.registration.name, "Rohit Verma");
    assert.equal(data.event.title, createdEvent.title);
    assert.equal(data.event.venue, "Grand Tech Arena");
    assert.equal(data.registration.checkedIn, false);
  });

  // 6. Duplicate Registration Prevention
  await t.test("POST /api/registrations/public/:slug rejects duplicate registration", async () => {
    const dupPayload = {
      name: "Rohit Verma Duplicate",
      email: "rohit.verma@example.com",
      phone: "+91 9988776655",
      college: "Sahyadri College of Engineering",
    };

    const res = await fetch(`${baseUrl}/registrations/public/${createdEvent.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dupPayload),
    });

    assert.equal(res.status, 409);
    const data = await res.json();
    assert.ok(data.message.includes("already registered"));
  });
});
