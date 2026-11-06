import assert from "node:assert/strict";
import test from "node:test";
import {
  CERTIFICATE_TEMPLATES,
  DEFAULT_CERTIFICATE_DESCRIPTION,
  isAttendedRegistration,
  normalizeCertificateSettings,
  resolveCertificateDescription,
} from "../src/utils/certificateDesign.js";

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
