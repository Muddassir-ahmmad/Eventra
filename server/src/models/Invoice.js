import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizerBilling: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      organization: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      gstin: { type: String, default: "" },
    },
    platformDetails: {
      name: { type: String, default: "EVENTRA Platform Inc." },
      email: { type: String, default: "billing@eventra.com" },
      phone: { type: String, default: "+91 9876543210" },
      address: { type: String, default: "Mangalore, Karnataka, India" },
      taxId: { type: String, default: "GSTIN29AAACE1234F1Z5" },
    },
    planName: {
      type: String,
      required: true,
    },
    billingCycle: {
      type: String,
      default: "monthly",
    },
    subtotal: {
      type: Number,
      required: true,
    },
    taxRate: {
      type: Number,
      default: 0, // e.g. 18 for 18% GST
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["ISSUED", "PAID", "VOID", "REFUNDED"],
      default: "PAID",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);

