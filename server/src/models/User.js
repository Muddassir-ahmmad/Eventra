import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    organization: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ORGANIZER", "PARTICIPANT"],
      default: "ORGANIZER",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DEACTIVATED"],
      default: "ACTIVE",
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ["UNVERIFIED", "VERIFIED"],
      default: "UNVERIFIED",
    },
    suspension: {
      isSuspended: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
        default: "",
      },
      notes: {
        type: String,
        default: "",
      },
      suspendedAt: {
        type: Date,
      },
      suspendedUntil: {
        type: Date,
      },
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    reactivatedAt: {
      type: Date,
    },
    reactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reactivationReason: {
      type: String,
      default: "",
    },
    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizerSubscription",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    emailNotifications: {
      notifyOnRegistration: {
        type: Boolean,
        default: true,
      },
      notifyOnCapacity: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
