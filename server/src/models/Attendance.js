import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
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
      index: true,
    },
    ticketCode: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    attendanceType: {
      type: String,
      enum: ["daily", "session"],
      required: true,
      default: "daily",
    },
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    attendanceDate: {
      type: Date,
      required: true,
    },
    sessionId: {
      type: String,
      default: null,
    },
    sessionTitle: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT"],
      default: "PRESENT",
    },
    checkInMethod: {
      type: String,
      enum: ["qr", "manual"],
      default: "qr",
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Atomic uniqueness: at most ONE daily attendance record per participant per event day
attendanceSchema.index(
  { eventId: 1, registrationId: 1, attendanceType: 1, dayNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { attendanceType: "daily" },
  }
);

// Atomic uniqueness: at most ONE session attendance record per participant per session
attendanceSchema.index(
  { eventId: 1, registrationId: 1, attendanceType: 1, sessionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      attendanceType: "session",
      sessionId: { $type: "string" },
    },
  }
);

attendanceSchema.index({ eventId: 1, dayNumber: 1, attendanceType: 1 });
attendanceSchema.index({ eventId: 1, sessionId: 1 });

export default mongoose.model("Attendance", attendanceSchema);
