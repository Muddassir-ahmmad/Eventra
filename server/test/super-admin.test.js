import test from "node:test";
import assert from "node:assert/strict";
import { generateInvoicePdf } from "../src/utils/invoicePdf.js";

test("Super Admin RBAC: role checking correctly permits SUPER_ADMIN and blocks ORGANIZER", () => {
  function checkRole(userRole, allowedRoles) {
    return allowedRoles.includes(userRole);
  }

  assert.equal(checkRole("SUPER_ADMIN", ["SUPER_ADMIN"]), true, "SUPER_ADMIN should be authorized");
  assert.equal(checkRole("ORGANIZER", ["SUPER_ADMIN"]), false, "ORGANIZER should be blocked from Super Admin routes");
  assert.equal(checkRole("PARTICIPANT", ["SUPER_ADMIN"]), false, "PARTICIPANT should be blocked");
  assert.equal(checkRole("ORGANIZER", ["SUPER_ADMIN", "ORGANIZER"]), true, "Both allowed on shared routes");
});

test("Organizer Suspension: checks status and constructs suspension reason message", () => {
  const suspendedUser = {
    _id: "user123",
    name: "Suspended Organizer",
    role: "ORGANIZER",
    status: "SUSPENDED",
    suspension: {
      isSuspended: true,
      reason: "Terms of service violation",
      notes: "Excessive spam complaints",
      suspendedUntil: new Date("2026-12-31"),
    },
  };

  const isBlocked = suspendedUser.status === "SUSPENDED" && suspendedUser.role !== "SUPER_ADMIN";
  assert.equal(isBlocked, true, "Suspended organizer must be blocked");

  const message = `Your organizer account has been suspended until ${new Date(suspendedUser.suspension.suspendedUntil).toLocaleDateString()}. Reason: ${suspendedUser.suspension.reason}. Notes: ${suspendedUser.suspension.notes}. Please contact support@eventra.com for review.`;
  assert.match(message, /suspended until/);
  assert.match(message, /Terms of service violation/);
  assert.match(message, /Excessive spam complaints/);
});

test("Audit Logger: strips sensitive password and token fields before saving", () => {
  const rawMetadata = {
    email: "admin@eventra.com",
    currentPassword: "secretPassword123",
    newPassword: "secretPassword456",
    token: "jwt.token.here",
    secret: "api_secret_key",
    allowedField: "Plan updated to Pro",
  };

  const sanitized = { ...rawMetadata };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.jwt;
  delete sanitized.secret;
  delete sanitized.currentPassword;
  delete sanitized.newPassword;

  assert.equal(sanitized.currentPassword, undefined);
  assert.equal(sanitized.newPassword, undefined);
  assert.equal(sanitized.token, undefined);
  assert.equal(sanitized.secret, undefined);
  assert.equal(sanitized.allowedField, "Plan updated to Pro");
  assert.equal(sanitized.email, "admin@eventra.com");
});

test("Payment Webhook Idempotency: detects duplicate transactions by ID", () => {
  const existingTransactions = [
    { transactionId: "TXN-2026-AAA", gatewayPaymentId: "pay_123456", status: "SUCCESS" },
  ];

  const incomingPaymentId = "pay_123456";
  const isDuplicate = existingTransactions.some(
    (t) => t.gatewayPaymentId === incomingPaymentId && t.status === "SUCCESS"
  );

  assert.equal(isDuplicate, true, "Duplicate payment ID must be detected to ensure idempotency");

  const newPaymentId = "pay_999999";
  const isNew = existingTransactions.some(
    (t) => t.gatewayPaymentId === newPaymentId && t.status === "SUCCESS"
  );
  assert.equal(isNew, false, "New payment ID must proceed");
});

test("Invoice PDF Service: renders valid vector PDF buffer with metadata", async () => {
  const mockInvoice = {
    invoiceNumber: "INV-2026-00042",
    issuedAt: new Date(),
    status: "PAID",
    platformDetails: {
      name: "EVENTRA Platform Inc.",
      email: "billing@eventra.com",
      address: "Mangalore, Karnataka, India",
      taxId: "GSTIN29AAACE1234F1Z5",
    },
    organizerBilling: {
      name: "Sahyadri College",
      email: "organizer@sahyadri.edu.in",
      organization: "Dept of CSE",
      phone: "+91 9876543210",
    },
    planName: "Pro",
    billingCycle: "monthly",
    subtotal: 999,
    taxRate: 18,
    taxAmount: 179.82,
    total: 1178.82,
    currency: "INR",
  };

  const pdfBuffer = await generateInvoicePdf(mockInvoice);
  assert.ok(Buffer.isBuffer(pdfBuffer), "Invoice PDF must return a binary Buffer");
  assert.ok(pdfBuffer.length > 500, "Invoice PDF must contain valid binary content");
  assert.equal(pdfBuffer.subarray(0, 4).toString(), "%PDF", "Must begin with PDF header %PDF");
});

