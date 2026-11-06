import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    monthlyPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    annualPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    features: {
      type: [String],
      default: [],
    },
    limits: {
      maxEvents: {
        type: Number,
        default: 3, // -1 for unlimited
      },
      maxParticipantsPerEvent: {
        type: Number,
        default: 100, // -1 for unlimited
      },
      aiFeaturesEnabled: {
        type: Boolean,
        default: false,
      },
      customBrandingEnabled: {
        type: Boolean,
        default: false,
      },
      feedbackGatingEnabled: {
        type: Boolean,
        default: true,
      },
      reportPdfEnabled: {
        type: Boolean,
        default: false,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);

