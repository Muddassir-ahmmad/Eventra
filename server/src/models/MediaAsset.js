import mongoose from "mongoose";

const mediaAssetSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["certificate", "poster"],
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    mimeType: {
      type: String,
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("MediaAsset", mediaAssetSchema);
