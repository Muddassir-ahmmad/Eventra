import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      default: "Super Admin",
    },
    actorEmail: {
      type: String,
      default: "",
    },
    actorRole: {
      type: String,
      default: "SUPER_ADMIN",
    },
    action: {
      type: String,
      required: true,
      index: true,
      // Examples: ORGANIZER_SUSPENDED, ORGANIZER_REACTIVATED, ORGANIZER_VERIFIED,
      // EVENT_APPROVED, EVENT_REJECTED, EVENT_FLAGGED, EVENT_UNPUBLISHED,
      // PLAN_CREATED, PLAN_UPDATED, PLAN_DEACTIVATED,
      // SUBSCRIPTION_ASSIGNED, SUBSCRIPTION_CANCELLED,
      // TRANSACTION_REFUNDED, SETTINGS_UPDATED, NOTIFICATION_SENT, TICKET_REPLIED
    },
    targetEntity: {
      type: String,
      required: true,
      index: true,
      // User, Event, SubscriptionPlan, OrganizerSubscription, PaymentTransaction, SupportTicket, PlatformSettings
    },
    targetId: {
      type: String,
      default: "",
    },
    targetName: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// High-performance indexing for audit review
adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("AdminAuditLog", adminAuditLogSchema);

