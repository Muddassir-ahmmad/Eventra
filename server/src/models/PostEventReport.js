import mongoose from "mongoose";

const postEventReportSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    executiveSummary: {
      type: String,
      trim: true,
      default: "",
    },
    objectives: {
      type: String,
      trim: true,
      default: "",
    },
    eventOverview: {
      type: String,
      trim: true,
      default: "",
    },
    activities: {
      type: String,
      trim: true,
      default: "",
    },
    highlights: {
      type: String,
      trim: true,
      default: "",
    },
    speakersSummary: {
      type: String,
      trim: true,
      default: "",
    },
    participantEngagement: {
      type: String,
      trim: true,
      default: "",
    },
    outcomes: {
      type: String,
      trim: true,
      default: "",
    },
    challenges: {
      type: String,
      trim: true,
      default: "",
    },
    feedbackSummary: {
      type: String,
      trim: true,
      default: "",
    },
    futureImprovements: {
      type: String,
      trim: true,
      default: "",
    },
    conclusion: {
      type: String,
      trim: true,
      default: "",
    },
    reportStatus: {
      type: String,
      enum: ["not_started", "collecting_feedback", "draft", "completed", "finalized"],
      default: "draft",
    },
    generatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PostEventReport", postEventReportSchema);
