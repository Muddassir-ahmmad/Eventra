import mongoose from "mongoose";

const ticketAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: "attachment" },
    url: { type: String, required: true },
    fileType: { type: String, default: "image/png" },
    size: { type: Number, default: 0 },
  },
  { _id: true }
);

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      default: "User",
    },
    senderRole: {
      type: String,
      enum: ["SUPER_ADMIN", "ORGANIZER"],
      default: "ORGANIZER",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [ticketAttachmentSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const internalNoteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    authorName: {
      type: String,
      default: "Admin",
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const ticketHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorName: {
      type: String,
      default: "System",
    },
    previousValue: {
      type: String,
      default: "",
    },
    newValue: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

export const SUPPORT_CATEGORIES = [
  "Account/Login Issues",
  "Event Creation Problems",
  "Event Publishing Issues",
  "Registration Problems",
  "QR Scanner and Attendance",
  "Certificate Generation",
  "Email Notifications",
  "Post-Event Reports",
  "Billing and Payments",
  "Feature Request",
  "General Complaint",
  "Other",
  // Legacy aliases
  "Billing",
  "Payment",
  "Event",
  "Account",
  "Technical",
];

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: SUPPORT_CATEGORIES,
      default: "General Complaint",
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_ORGANIZER",
        "WAITING_FOR_USER",
        "RESOLVED",
        "CLOSED",
      ],
      default: "OPEN",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    attachments: {
      type: [ticketAttachmentSchema],
      default: [],
    },
    replies: {
      type: [ticketMessageSchema],
      default: [],
    },
    internalNotes: {
      type: [internalNoteSchema],
      default: [],
    },
    history: {
      type: [ticketHistorySchema],
      default: [],
    },
    unreadByAdmin: {
      type: Boolean,
      default: true,
      index: true,
    },
    unreadByOrganizer: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", supportTicketSchema);
