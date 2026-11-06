import mongoose from "mongoose";

const platformNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["ANNOUNCEMENT", "MAINTENANCE", "POLICY_UPDATE", "BILLING_REMINDER", "SECURITY_ALERT"],
      default: "ANNOUNCEMENT",
    },
    targetAudience: {
      type: String,
      enum: ["ALL_ORGANIZERS", "SPECIFIC_PLAN", "SUSPENDED_ACCOUNTS", "CUSTOM"],
      default: "ALL_ORGANIZERS",
    },
    targetPlan: {
      type: String,
      default: "",
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: {
      type: String,
      default: "Super Admin",
    },
    sendEmail: {
      type: Boolean,
      default: false,
    },
    emailDeliveryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformNotification", platformNotificationSchema);

