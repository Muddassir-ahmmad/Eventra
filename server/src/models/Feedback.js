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
      default: 5,
    },
    ratingOrganization: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    ratingSpeakers: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    ratingVenue: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
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
    answers: [
      {
        questionId: { type: String, default: "" },
        questionLabel: { type: String, default: "" },
        questionType: { type: String, enum: ["rating", "text"], default: "rating" },
        value: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    customAnswers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
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

