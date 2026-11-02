import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Certificate from "../src/models/Certificate.js";
import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import User from "../src/models/User.js";
import certificateRoutes from "../src/routes/certificates.js";
import eventRoutes from "../src/routes/events.js";

test("certificate studio supports draft designs, persistent images, attendance-only PDFs, and delivery guards", async (t) => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    t.skip("MONGODB_URI and JWT_SECRET are required for certificate API integration tests.");
    return;
  }

  const databaseName = `eventra_certificate_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const app = express();
  const uploadRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads");
  app.use(express.json());
  app.use("/uploads", express.static(uploadRoot));
  app.use("/api/events", eventRoutes);
  app.use("/api/certificates", certificateRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const organizerId = new mongoose.Types.ObjectId();
  const token = jwt.sign({ userId: organizerId.toString() }, process.env.JWT_SECRET, { expiresIn: "5m" });
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  let eventId = "";
  const originalAiKey = process.env.AI_API_KEY;
  const originalSmtpHost = process.env.SMTP_HOST;
  const originalEmailFrom = process.env.EMAIL_FROM;
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  t.after(async () => {
    if (originalAiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = originalAiKey;
    if (originalSmtpHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = originalSmtpHost;
    if (originalEmailFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = originalEmailFrom;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (eventId) await fs.rm(path.join(uploadRoot, "certificates", eventId), { recursive: true, force: true });
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (mongoose.connection.readyState !== 0) {
      try { await mongoose.connection.dropDatabase(); } catch {} ;
      try { await mongoose.disconnect(); } catch {} ;
    }
  });

  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 5000 });
    await User.create({
      _id: organizerId,
      name: "Certificate Test Organizer",
      email: `${databaseName}@example.test`,
      password: "not-a-login-secret",
      organization: "Test Organization",
    });

    const createResponse = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Certificate Studio Test",
        description: "Testing a draft event certificate",
        date: "2026-11-02T10:00:00.000Z",
        venue: "Test venue",
        capacity: 10,
        status: "draft",
      }),
    });
    assert.equal(createResponse.status, 201);
    const { event } = await createResponse.json();
    eventId = event._id;
    assert.equal(event.status, "draft");

    const unauthenticated = await fetch(`${baseUrl}/certificates/event/${eventId}`);
    assert.equal(unauthenticated.status, 401);

    let response = await fetch(`${baseUrl}/certificates/event/${eventId}`, { headers });
    assert.equal(response.status, 200);
    let payload = await response.json();
    assert.equal(payload.event.status, "draft");
    assert.equal(payload.event.certificateDescription, "This certificate is proudly presented to {name} for participating in {event}.");

    response = await fetch(`${baseUrl}/certificates/event/${eventId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        certificateEnabled: true,
        certificateTemplate: "modern",
        certificateTitle: "Certificate of Achievement",
        certificateDescription: "Presented to {name} for attending {event} on {date}.",
        certificateShowOrganization: false,
        signatures: [{ name: "Alex Organizer", role: "Program Lead" }],
      }),
    });
    assert.equal(response.status, 200);

    response = await fetch(`${baseUrl}/certificates/event/${eventId}`, { headers });
    payload = await response.json();
    assert.equal(payload.event.status, "draft");
    assert.equal(payload.event.certificateTemplate, "modern");
    assert.equal(payload.event.certificateTitle, "Certificate of Achievement");
    assert.equal(payload.event.certificateDescription, "Presented to {name} for attending {event} on {date}.");
    assert.equal(payload.organizer.organization, "Test Organization");

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZcAAAAASUVORK5CYII=",
      "base64"
    );
    async function upload(kind, contentType = "image/png", bytes = png) {
      const form = new FormData();
      form.append("image", new Blob([bytes], { type: contentType }), "certificate-image.png");
      return fetch(`${baseUrl}/certificates/event/${eventId}/assets/${kind}`, {
        method: "POST",
        headers: { Authorization: headers.Authorization },
        body: form,
      });
    }

    const logoResponse = await upload("logo");
    assert.equal(logoResponse.status, 201);
    const logo = await logoResponse.json();
    assert.match(logo.imageUrl, /\/uploads\/certificates\//);
    assert.equal((await fetch(logo.imageUrl)).status, 200);

    const firstSignatureResponse = await upload("signature");
    assert.equal(firstSignatureResponse.status, 201);
    const firstSignature = await firstSignatureResponse.json();
    const replacementResponse = await upload("signature");
    assert.equal(replacementResponse.status, 201);
    const replacement = await replacementResponse.json();
    response = await fetch(`${baseUrl}/certificates/event/${eventId}/assets`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ imagePath: firstSignature.imagePath }),
    });
    assert.equal(response.status, 200);
    assert.equal((await fetch(firstSignature.imageUrl)).status, 404);

    const invalidUpload = await upload("signature", "text/plain", Buffer.from("not an image"));
    assert.equal(invalidUpload.status, 400);

    response = await fetch(`${baseUrl}/certificates/event/${eventId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        ...payload.event,
        signatures: [{
          name: "Alex Organizer",
          role: "Program Lead",
          imageUrl: replacement.imageUrl,
          imagePath: replacement.imagePath,
        }],
        certificateLogoUrl: logo.imageUrl,
        certificateLogoPath: logo.imagePath,
      }),
    });
    assert.equal(response.status, 200);

    const registrations = await Registration.create([
      {
        eventId,
        name: "Attended Participant",
        email: "attended@example.test",
        phone: "1111111111",
        college: "Test College",
        registrationId: `${databaseName}-attended`,
        status: "confirmed",
        checkedIn: true,
      },
      {
        eventId,
        name: "Absent Participant",
        email: "absent@example.test",
        phone: "2222222222",
        college: "Test College",
        registrationId: `${databaseName}-absent`,
        status: "confirmed",
        checkedIn: false,
      },
      {
        eventId,
        name: "Cancelled Participant",
        email: "cancelled@example.test",
        phone: "3333333333",
        college: "Test College",
        registrationId: `${databaseName}-cancelled`,
        status: "cancelled",
        checkedIn: true,
      },
    ]);

    response = await fetch(`${baseUrl}/certificates/event/${eventId}`, { headers });
    payload = await response.json();
    assert.deepEqual(payload.counts, { registered: 2, attended: 1, eligible: 1, generated: 0, cancelled: 1 });
    assert.equal(payload.participants.find((person) => person._id === String(registrations[2]._id)).checkedIn, false);

    const generate = (ids, regenerate = false) => fetch(`${baseUrl}/certificates/event/${eventId}/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ registrationIds: ids, regenerate }),
    });
    response = await generate(registrations.map((item) => String(item._id)));
    assert.equal(response.status, 200);
    payload = await response.json();
    assert.equal(payload.issued.length, 1);
    assert.equal(payload.ineligible.length, 2);

    const certificate = await Certificate.findOne({
      eventId,
      registrationId: registrations[0]._id,
    }).select("+pdfData");
    assert.ok(certificate.pdfData.subarray(0, 4).equals(Buffer.from("%PDF")));
    assert.ok(!certificate.pdfData.includes(Buffer.from("{name}")));

    response = await fetch(`${baseUrl}/certificates/event/${eventId}/${registrations[0]._id}/download`, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), certificate.pdfData);

    response = await generate([String(registrations[0]._id)]);
    payload = await response.json();
    assert.equal(payload.issued.length, 0);
    assert.equal(payload.alreadyIssued.length, 1);

    const previousPdf = certificate.pdfData;
    response = await fetch(`${baseUrl}/certificates/event/${eventId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ certificateTemplate: "academic" }),
    });
    assert.equal(response.status, 200);
    response = await generate([String(registrations[0]._id)], true);
    assert.equal(response.status, 200);
    const regenerated = await Certificate.findOne({
      eventId,
      registrationId: registrations[0]._id,
    }).select("+pdfData");
    assert.equal(regenerated.generation, 2);
    assert.notDeepEqual(regenerated.pdfData, previousPdf);

    process.env.AI_API_KEY = "";
    response = await fetch(`${baseUrl}/certificates/event/${eventId}/ai-suggestion`, {
      method: "POST",
      headers,
      body: JSON.stringify({ eventType: "Workshop" }),
    });
    assert.deepEqual(await response.json(), {
      configured: false,
      message: "Configure AI_API_KEY on the server to enable certificate suggestions.",
    });

    delete process.env.SMTP_HOST;
    delete process.env.EMAIL_FROM;
    response = await fetch(`${baseUrl}/certificates/event/${eventId}/${registrations[0]._id}/email`, {
      method: "POST",
      headers,
    });
    assert.equal(response.status, 503);

    const otherOrganizerToken = jwt.sign({ userId: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET);
    response = await fetch(`${baseUrl}/certificates/event/${eventId}`, {
      headers: { Authorization: `Bearer ${otherOrganizerToken}` },
    });
    assert.equal(response.status, 404);
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.code === "EACCES" || error.name === "MongoServerSelectionError" || error.name === "MongooseServerSelectionError") {
      t.skip("The configured MongoDB instance is unavailable for integration tests.");
      return;
    }
    throw error;
  }
});
