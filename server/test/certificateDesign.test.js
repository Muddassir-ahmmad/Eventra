import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CERTIFICATE_DESCRIPTION,
  isAttendedRegistration,
  normalizeCertificateSettings,
  resolveCertificateDescription,
} from "../src/utils/certificateDesign.js";

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
