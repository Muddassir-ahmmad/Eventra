import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    registrationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ticketType: {
      type: String,
      default: "General",
    },
    customAnswers: {
      type: Map,
      of: String,
      default: {},
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    confirmationEmailedAt: {
      type: Date,
      default: null,
    },
    ticketEmailedAt: {
      type: Date,
      default: null,
    },
    feedbackToken: {
      type: String,
      default: null,
    },
    feedbackTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    feedbackSubmitted: {
      type: Boolean,
      default: false,
    },
    feedbackSubmittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

registrationSchema.index(
  { eventId: 1, email: 1 },
  { unique: true }
);

export default mongoose.model("Registration", registrationSchema);
