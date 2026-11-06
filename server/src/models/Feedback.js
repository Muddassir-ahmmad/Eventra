import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
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
      required: true,
    },
    participantName: {
      type: String,
      trim: true,
      default: "",
    },
    participantEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    feedbackTokenHash: {
      type: String,
      default: null,
    },
    ratingOverall: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    ratingOrganization: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    ratingSpeakers: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    ratingVenue: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    liked: {
      type: String,
      trim: true,
      default: "",
    },
    improvements: {
      type: String,
      trim: true,
      default: "",
    },
    suggestions: {
      type: String,
      trim: true,
      default: "",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ eventId: 1, registrationId: 1 }, { unique: true });
feedbackSchema.index({ eventId: 1, submittedAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);

