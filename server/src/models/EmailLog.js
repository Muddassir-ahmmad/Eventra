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
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    emailType: {
      type: String,
      enum: [
        "registration_confirmation",
        "ticket_delivery",
        "certificate_delivery",
        "organizer_alert",
        "custom_notification",
        "test_email",
      ],
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: String,
      required: true,
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
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

emailLogSchema.index({ eventId: 1, emailType: 1 });
emailLogSchema.index({ eventId: 1, deliveryStatus: 1 });
emailLogSchema.index({ registrationId: 1, emailType: 1 });

export default mongoose.model("EmailLog", emailLogSchema);
