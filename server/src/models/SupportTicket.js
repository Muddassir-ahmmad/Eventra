import mongoose from "mongoose";

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    senderName: {
      type: String,
      default: "",
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const internalNoteSchema = new mongoose.Schema(
  {
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
      enum: ["Billing", "Payment", "Event", "Account", "Technical", "Other"],
      default: "Technical",
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
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    replies: {
      type: [ticketMessageSchema],
      default: [],
    },
    internalNotes: {
      type: [internalNoteSchema],
      default: [],
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

