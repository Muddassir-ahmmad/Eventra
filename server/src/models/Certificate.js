import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
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
    issuedTo: {
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
    storagePath: {
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    generation: {
      type: Number,
      min: 1,
      default: 1,
    },
    lastEmailedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

certificateSchema.index(
  { eventId: 1, registrationId: 1 },
  { unique: true }
);

export default mongoose.model("Certificate", certificateSchema);