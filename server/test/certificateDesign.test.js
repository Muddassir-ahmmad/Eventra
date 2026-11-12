import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";
import { renderCertificate } from "../src/routes/certificates.js";
import {
  CERTIFICATE_TEMPLATES,
  DEFAULT_CERTIFICATE_DESCRIPTION,
  isAttendedRegistration,
  isCertificatePdfStale,
  normalizeCertificateSettings,
  resolveCertificateDescription,
} from "../src/utils/certificateDesign.js";
import { formatParticipantName } from "../src/utils/participantName.js";

test("CERTIFICATE_TEMPLATES contains 8 standard templates", () => {
  const expected = [
    "classic",
    "modern",
    "academic",
    "royalGold",
    "techAurora",
    "emeraldExecutive",
    "crimsonLuxe",
    "vintageParchment",
  ];
  for (const tmpl of expected) {
    assert.ok(CERTIFICATE_TEMPLATES.includes(tmpl), `Missing template: ${tmpl}`);
  }
});

test("certificate descriptions replace participant, event, and date placeholders", () => {
  assert.equal(
    resolveCertificateDescription(
      DEFAULT_CERTIFICATE_DESCRIPTION,
      "Jordan Lee",
      "Design Summit",
      "November 2, 2026"
    ),
    "This certificate is proudly presented to Jordan Lee for participating in Design Summit."
  );
  assert.equal(
    resolveCertificateDescription(
      "Certifies that {participantName} attended {eventName} on {eventDate}.",
      "Jordan Lee",
      "Design Summit",
      "November 2, 2026"
    ),
    "Certifies that Jordan Lee attended Design Summit on November 2, 2026."
  );
  assert.equal(
    resolveCertificateDescription("Attended {unknown} on {date}", "Jordan", "Summit", "Nov 2"),
    "Attended  on Nov 2"
  );
});

test("only confirmed registrations marked checked in are eligible", () => {
  assert.equal(isAttendedRegistration({ status: "confirmed", checkedIn: true }), true);
  assert.equal(isAttendedRegistration({ status: "confirmed", checkedIn: false }), false);
  assert.equal(isAttendedRegistration({ status: "cancelled", checkedIn: true }), false);
});

test("certificate settings normalize optional values and signatures", () => {
  const settings = normalizeCertificateSettings({
    certificateTemplate: "not-a-template",
    certificateTitle: "  Completion  ",
    certificateShowOrganization: false,
    signatures: [{ name: "  Alex ", designation: "Lead", role: "Legacy role" }],
  });

  assert.equal(settings.certificateTemplate, "classic");
  assert.equal(settings.certificateTitle, "Completion");
  assert.equal(settings.certificateShowOrganization, false);
  assert.deepEqual(settings.signatures[0], {
    name: "Alex",
    role: "Legacy role",
    designation: "Legacy role",
    imageUrl: "",
    imagePath: "",
  });
});

test("certificate organization header size, alignment, and case normalize with safe defaults", () => {
  const defaults = normalizeCertificateSettings({});
  assert.equal(defaults.certificateOrganizationSize, "md");
  assert.equal(defaults.certificateOrganizationAlign, "center");
  assert.equal(defaults.certificateOrganizationUppercase, false);

  const custom = normalizeCertificateSettings({
    certificateOrganizationSize: "xl",
    certificateOrganizationAlign: "right",
    certificateOrganizationUppercase: true,
  });
  assert.equal(custom.certificateOrganizationSize, "xl");
  assert.equal(custom.certificateOrganizationAlign, "right");
  assert.equal(custom.certificateOrganizationUppercase, true);

  const invalid = normalizeCertificateSettings({
    certificateOrganizationSize: "huge",
    certificateOrganizationAlign: "justified",
    certificateOrganizationUppercase: "yes",
  });
  assert.equal(invalid.certificateOrganizationSize, "md");
  assert.equal(invalid.certificateOrganizationAlign, "center");
  assert.equal(invalid.certificateOrganizationUppercase, false);
});

test("certificate logo and signature custom coordinates normalize and clamp safely", () => {
  const defaults = normalizeCertificateSettings({});
  assert.equal(defaults.certificateLogoX, null);
  assert.equal(defaults.certificateLogoY, null);
  assert.equal(defaults.certificateLogoSize, 8);

  const placed = normalizeCertificateSettings({
    certificateLogoX: -5,
    certificateLogoY: 105,
    certificateLogoSize: 40,
    signatures: [
      { name: "Dr. Rao", role: "Principal", x: 15.256, y: 82.5, scale: 1.4 },
      { name: "Dean", role: "Coordinator", x: null, y: null, scale: null },
    ],
  });
  assert.equal(placed.certificateLogoX, 2);
  assert.equal(placed.certificateLogoY, 98);
  assert.equal(placed.certificateLogoSize, 30);
  assert.equal(placed.signatures[0].x, 15.26);
  assert.equal(placed.signatures[0].y, 82.5);
  assert.equal(placed.signatures[0].scale, 1.4);
  assert.equal("x" in placed.signatures[1], false);
  assert.equal("scale" in placed.signatures[1], false);
});

test("isCertificatePdfStale detects missing PDFs and design edits saved after generation", () => {
  const t1 = new Date("2026-11-11T10:00:00.000Z");
  const t2 = new Date("2026-11-11T10:05:00.000Z");
  const buf = Buffer.from("%PDF-1.4");

  assert.equal(isCertificatePdfStale({ certificateUpdatedAt: t1 }, null), true);
  assert.equal(isCertificatePdfStale({ certificateUpdatedAt: t1 }, { pdfData: Buffer.alloc(0), generatedAt: t2 }), true);
  assert.equal(
    isCertificatePdfStale({ certificateUpdatedAt: t2, updatedAt: t2 }, { pdfData: buf, generatedAt: t1 }),
    true
  );
  assert.equal(
    isCertificatePdfStale({ certificateUpdatedAt: null, updatedAt: t2 }, { pdfData: buf, generatedAt: t1 }),
    true
  );
  assert.equal(
    isCertificatePdfStale({ certificateUpdatedAt: t1, updatedAt: t2 }, { pdfData: buf, generatedAt: t2 }),
    false
  );
  assert.equal(
    isCertificatePdfStale(
      { certificateUpdatedAt: t1, updatedAt: t2 },
      { pdfData: buf, generatedAt: t2, issuedTo: "mudassir ahmmad" },
      { name: "mudassir ahmmad" }
    ),
    true
  );
  assert.equal(
    isCertificatePdfStale(
      { certificateUpdatedAt: t1, updatedAt: t2 },
      { pdfData: buf, generatedAt: t2, issuedTo: "Mudassir Ahmmad" },
      { name: "mudassir ahmmad" }
    ),
    false
  );
});

test("formatParticipantName capitalizes first letters of lowercase words while preserving mixed case", () => {
  assert.equal(formatParticipantName("mudassir ahmmad"), "Mudassir Ahmmad");
  assert.equal(formatParticipantName("  john   doe "), "John Doe");
  assert.equal(formatParticipantName("sara"), "Sara");
  assert.equal(formatParticipantName("jean-luc picard"), "Jean-Luc Picard");
  assert.equal(formatParticipantName("a.k. sharma"), "A.K. Sharma");
  assert.equal(formatParticipantName("Dr. McDonald"), "Dr. McDonald");
  assert.equal(formatParticipantName("", "Participant"), "Participant");
});

test("resolveCertificateDescription capitalizes participant names inside certificate text", () => {
  const rendered = resolveCertificateDescription(
    "Awarded to {name} ({participantName}) for {event}.",
    "mudassir ahmmad",
    "Tech Fest",
    "November 12, 2026"
  );
  assert.equal(rendered, "Awarded to Mudassir Ahmmad (Mudassir Ahmmad) for Tech Fest.");
});

test("normalizeCertificateSettings normalizes per-element typography, size, alignment, position, and event title override", () => {
  const normalized = normalizeCertificateSettings({
    certificateEventTitle: "  Annual Tech Symposium 2026  ",
    certificateTextStyles: {
      title: { font: "serif", fontSize: 36, align: "left", x: 18, y: 20 },
      description: { font: "italicSerif", fontSize: 99, align: "right", x: 120, y: 2 },
      eventName: { font: "mono", fontSize: 22, align: "center", x: 50, y: 80 },
      organization: { font: "unknown-font", fontSize: 4, align: "middle-invalid" },
    },
  });

  assert.equal(normalized.certificateEventTitle, "Annual Tech Symposium 2026");
  assert.deepEqual(normalized.certificateTextStyles.title, {
    font: "serif",
    fontSize: 36,
    align: "left",
    x: 18,
    y: 20,
  });
  assert.deepEqual(normalized.certificateTextStyles.description, {
    font: "italicSerif",
    fontSize: 24,
    align: "right",
    x: 94,
    y: 6,
  });
  assert.deepEqual(normalized.certificateTextStyles.eventName, {
    font: "mono",
    fontSize: 22,
    align: "center",
    x: 50,
    y: 80,
  });
  assert.equal(normalized.certificateTextStyles.organization.font, "theme");
  assert.equal(normalized.certificateTextStyles.organization.fontSize, 8);
  assert.equal(normalized.certificateTextStyles.organization.align, "center");
});

test("renderCertificate renders long AI theme custom heading and top header cleanly into PDF without ellipsis truncation", async () => {
  const customHeading = "Certificate of Extraordinary Technical Mastery";
  const customTopHeader = "SAHYADRI COLLEGE OF ENGINEERING";
  const customTagline = "Adyar, Mangaluru - 575007 | Ph: 0824-2277222";
  const pdfBuffer = await renderCertificate(
    {
      title: "AI Innovation Challenge 2026",
      date: new Date("2026-11-12T00:00:00.000Z"),
      certificateTemplate: "techAurora",
      certificateTitle: customHeading,
      certificateDescription: "Awarded to {name} for completing {event}.",
      certificateShowOrganization: false,
      certificateOrganization: customTopHeader,
      certificateOrganizationTagline: customTagline,
      certificateTextStyles: {
        title: { fontSize: 40 },
      },
      signatures: [],
    },
    { name: "mudassir ahmmad" },
    customTopHeader,
    { logo: null, signatures: [] }
  );

  assert.ok(Buffer.isBuffer(pdfBuffer));
  const rawPdf = pdfBuffer.toString("latin1");
  const streams = [];
  const regex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = regex.exec(rawPdf)) !== null) {
    try {
      streams.push(zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"));
    } catch {
      streams.push(m[1]);
    }
  }
  const text = streams
    .join("\n")
    .replace(/>\s*-?\d+(?:\.\d+)?\s*</g, "")
    .replace(/<([0-9a-fA-F]+)>/g, (_, hex) => Buffer.from(hex, "hex").toString("latin1"));

  assert.ok(text.includes(customHeading), "Downloaded certificate PDF must print the full custom heading");
  assert.ok(text.includes(customTopHeader), "Downloaded certificate PDF must print the custom top header");
  assert.ok(text.includes(customTagline), "Downloaded certificate PDF must print the optional header tagline");
  assert.ok(text.includes("Mudassir Ahmmad"), "Participant name should be properly capitalized in PDF");
});

test("normalizeCertificateSettings trims and clamps certificateOrganizationTagline to 200 characters", () => {
  const longTagline = `  ${"A".repeat(250)}  `;
  const normalized = normalizeCertificateSettings({
    certificateOrganizationTagline: longTagline,
  });
  assert.equal(normalized.certificateOrganizationTagline.length, 200);
});
