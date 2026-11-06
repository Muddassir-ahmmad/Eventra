import mongoose from "mongoose";

const subscriptionHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    previousPlan: {
      type: String,
      default: "",
    },
    newPlan: {
      type: String,
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    changedByName: {
      type: String,
      default: "System",
    },
    notes: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const organizerSubscriptionSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual", "complimentary", "lifetime"],
      default: "monthly",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "TRIAL", "GRACE_PERIOD", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    history: {
      type: [subscriptionHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("OrganizerSubscription", organizerSubscriptionSchema);

