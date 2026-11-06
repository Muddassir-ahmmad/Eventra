import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizerSubscription",
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
    },
    planName: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    gateway: {
      type: String,
      enum: ["Razorpay", "Stripe", "Manual", "System Complimentary"],
      default: "Razorpay",
    },
    gatewayPaymentId: {
      type: String,
      default: "",
    },
    gatewayOrderId: {
      type: String,
      default: "",
    },
    gatewaySignature: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      default: "card",
    },
    status: {
      type: String,
      enum: ["CREATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"],
      default: "PENDING",
      index: true,
    },
    invoiceNumber: {
      type: String,
      default: "",
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    refund: {
      refundId: String,
      amount: Number,
      reason: String,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      refundedAt: Date,
    },
    rawWebhookPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PaymentTransaction", paymentTransactionSchema);

