import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      default: "EVENTRA",
      trim: true,
    },
    supportEmail: {
      type: String,
      default: "support@eventra.com",
      trim: true,
    },
    contactPhone: {
      type: String,
      default: "+91 9876543210",
      trim: true,
    },
    eventModerationPolicy: {
      type: String,
      enum: ["AUTO_APPROVE", "MANUAL_REVIEW"],
      default: "AUTO_APPROVE",
    },
    defaultPlanSlug: {
      type: String,
      default: "free",
    },
    subscriptionGracePeriodDays: {
      type: Number,
      default: 7,
      min: 0,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: "EVENTRA is currently undergoing scheduled platform maintenance. We will be back online shortly.",
    },
    paymentGateway: {
      provider: {
        type: String,
        default: "Razorpay",
      },
      isSandbox: {
        type: Boolean,
        default: true,
      },
      keyId: {
        type: String,
        default: "rzp_test_placeholder_key",
      },
      webhookConfigured: {
        type: Boolean,
        default: true,
      },
    },
    termsUrl: {
      type: String,
      default: "/terms",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformSettings", platformSettingsSchema);

