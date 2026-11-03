import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      default: null,
      index: true,
    },
    emailType: {
      type: String,
      enum: ["feedback_request", "certificate", "reminder"],
      required: true,
    },
    recipient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    deliveryStatus: {
      type: String,
      enum: ["sent", "failed", "pending"],
      default: "pending",
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

emailLogSchema.index({ eventId: 1, registrationId: 1, emailType: 1 });
emailLogSchema.index({ eventId: 1, deliveryStatus: 1 });

export default mongoose.model("EmailLog", emailLogSchema);

