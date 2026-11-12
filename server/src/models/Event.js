import mongoose from "mongoose";

const certificateTextElementSchema = new mongoose.Schema(
  {
    font: {
      type: String,
      enum: ["theme", "serif", "sans", "italicSerif", "italicSans", "mono"],
      default: "theme",
    },
    fontSize: {
      type: Number,
      default: null,
    },
    align: {
      type: String,
      enum: ["left", "center", "right", null],
      default: null,
    },
    x: {
      type: Number,
      default: null,
    },
    y: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const speakerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "",
    },
    organization: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      trim: true,
      default: "Speaker",
    },
    photoUrl: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const agendaItemSchema = new mongoose.Schema(
  {
    time: {
      type: String,
      trim: true,
      default: "",
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    speaker: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    startTime: {
      type: String,
      trim: true,
      default: "",
    },
    endTime: {
      type: String,
      trim: true,
      default: "",
    },
    speaker: {
      type: String,
      trim: true,
      default: "",
    },
    venue: {
      type: String,
      trim: true,
      default: "",
    },
    capacity: {
      type: Number,
      default: null,
      min: 1,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const eventDaySchema = new mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: Date,
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    startTime: {
      type: String,
      trim: true,
      default: "",
    },
    endTime: {
      type: String,
      trim: true,
      default: "",
    },
    sessions: {
      type: [sessionSchema],
      default: [],
    },
  },
  { _id: false }
);

const faqItemSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      trim: true,
      default: "",
    },
    answer: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const registrationFieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "text",
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const feedbackQuestionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["rating", "text"],
      default: "rating",
    },
    required: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const ticketTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: true }
);

const volunteerRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    limit: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: true }
);

const signatureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    imagePath: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      trim: true,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "",
    },
    x: {
      type: Number,
      default: null,
    },
    y: {
      type: Number,
      default: null,
    },
    scale: {
      type: Number,
      default: null,
    },
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    /*
     * ORGANIZER
     */
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /*
     * BASIC EVENT INFORMATION
     */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "Technical",
    },

    mode: {
      type: String,
      enum: ["offline", "online", "hybrid"],
      default: "offline",
    },

    contactEmail: {
      type: String,
      trim: true,
      default: "",
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      required: true,
    },

    eventDurationType: {
      type: String,
      enum: ["single_day", "multi_day"],
      default: "single_day",
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    startTime: {
      type: String,
      default: "",
    },

    endTime: {
      type: String,
      default: "",
    },

    days: {
      type: [eventDaySchema],
      default: [],
    },

    sessionAttendanceEnabled: {
      type: Boolean,
      default: false,
    },

    venue: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    registrationDeadline: {
      type: Date,
      default: null,
    },

    /*
     * EVENT DESIGN & POSTER
     */
    posterUrl: {
      type: String,
      default: "",
    },

    posterType: {
      type: String,
      enum: ["upload", "template", "ai"],
      default: "template",
    },

    posterTemplateData: {
      templateId: { type: String, default: "technical" },
      themeColor: { type: String, default: "#6366f1" },
      accentColor: { type: String, default: "#8b5cf6" },
      headline: { type: String, default: "" },
      tagline: { type: String, default: "" },
    },

    theme: {
      type: String,
      enum: ["aurora", "minimal", "conference", "creative"],
      default: "aurora",
    },

    eventFont: {
      type: String,
      enum: ["modern", "editorial", "futuristic", "classic", "bold", "mono"],
      default: "modern",
    },

    /*
     * SPEAKERS / JUDGES / GUESTS
     */
    speakers: {
      type: [speakerSchema],
      default: [],
    },

    /*
     * AGENDA / SCHEDULE
     */
    agenda: {
      type: [agendaItemSchema],
      default: [],
    },

    /*
     * FREQUENTLY ASKED QUESTIONS
     */
    faqs: {
      type: [faqItemSchema],
      default: [],
    },

    /*
     * REGISTRATION FORM
     */
    registrationFields: {
      type: [registrationFieldSchema],
      default: [
        {
          key: "name",
          label: "Full Name",
          type: "text",
          required: true,
        },
        {
          key: "email",
          label: "Email",
          type: "email",
          required: true,
        },
        {
          key: "phone",
          label: "Phone",
          type: "tel",
          required: true,
        },
      ],
    },

    /*
     * TICKETS
     */
    ticketMode: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },

    qrEnabled: {
      type: Boolean,
      default: true,
    },

    ticketTypes: {
      type: [ticketTypeSchema],
      default: [],
    },

    /*
     * VOLUNTEERS
     */
    volunteerEnabled: {
      type: Boolean,
      default: false,
    },

    volunteerRoles: {
      type: [volunteerRoleSchema],
      default: [],
    },

    /*
     * CERTIFICATES
     */
    certificateEnabled: {
      type: Boolean,
      default: false,
    },

    certificateTemplate: {
      type: String,
      enum: [
        "classic",
        "modern",
        "academic",
        "royalGold",
        "techAurora",
        "emeraldExecutive",
        "crimsonLuxe",
        "vintageParchment",
      ],
      default: "classic",
    },

    certificateTitle: {
      type: String,
      trim: true,
      default: "Certificate of Participation",
    },

    eventType: {
      type: String,
      trim: true,
      default: "",
    },

    certificateDescription: {
      type: String,
      trim: true,
      default: "This certificate is proudly presented to {name} for participating in {event}.",
    },

    certificateLogoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    certificateLogoPath: {
      type: String,
      trim: true,
      default: "",
    },

    certificateLogoX: {
      type: Number,
      default: null,
    },

    certificateLogoY: {
      type: Number,
      default: null,
    },

    certificateLogoSize: {
      type: Number,
      default: 8,
      min: 4,
      max: 30,
    },

    certificateShowOrganization: {
      type: Boolean,
      default: false,
    },

    certificateOrganization: {
      type: String,
      trim: true,
      default: "",
    },

    certificateOrganizationTagline: {
      type: String,
      trim: true,
      default: "",
    },

    certificateOrganizationSize: {
      type: String,
      enum: ["sm", "md", "lg", "xl"],
      default: "md",
    },

    certificateOrganizationAlign: {
      type: String,
      enum: ["left", "center", "right"],
      default: "center",
    },

    certificateOrganizationUppercase: {
      type: Boolean,
      default: false,
    },

    certificateEventTitle: {
      type: String,
      trim: true,
      default: "",
    },

    certificateTextStyles: {
      organization: { type: certificateTextElementSchema, default: () => ({}) },
      title: { type: certificateTextElementSchema, default: () => ({}) },
      recipient: { type: certificateTextElementSchema, default: () => ({}) },
      description: { type: certificateTextElementSchema, default: () => ({}) },
      eventName: { type: certificateTextElementSchema, default: () => ({}) },
    },

    certificateUpdatedAt: {
      type: Date,
      default: null,
    },

    signatures: {
      type: [signatureSchema],
      default: [],
    },

    certificateEligibilityRule: {
      mode: {
        type: String,
        enum: ["any_day", "all_days", "min_days", "required_sessions"],
        default: "any_day",
      },
      minDays: {
        type: Number,
        default: 1,
        min: 1,
      },
      requiredSessionIds: {
        type: [String],
        default: [],
      },
    },

    /*
     * POST-EVENT CLOSURE & FEEDBACK AUTOMATION
     */
    completedAt: {
      type: Date,
      default: null,
    },

    feedbackDeadline: {
      type: Date,
      default: null,
    },

    requireFeedbackForCertificate: {
      type: Boolean,
      default: false,
    },

    feedbackEnabled: {
      type: Boolean,
      default: true,
    },

    feedbackQuestions: {
      type: [feedbackQuestionSchema],
      default: () => [
        { id: "q_overall", label: "Overall Event Experience", type: "rating", required: true },
        { id: "q_org", label: "Event Organization & Flow", type: "rating", required: true },
        { id: "q_speakers", label: "Speakers & Session Content", type: "rating", required: true },
        { id: "q_venue", label: "Venue & Facilities", type: "rating", required: false },
        { id: "q_liked", label: "What did you enjoy most about the event?", type: "text", required: false },
        { id: "q_improvements", label: "What could be improved for future editions?", type: "text", required: false },
      ],
    },

    /*
     * EVENT STATUS
     */
    status: {
      type: String,
      enum: ["draft", "published", "closed", "completed"],
      default: "draft",
    },

    /*
     * SUPER ADMIN MODERATION
     */
    moderationStatus: {
      type: String,
      enum: ["APPROVED", "PENDING_REVIEW", "FLAGGED", "REJECTED"],
      default: "APPROVED",
      index: true,
    },

    moderationReason: {
      type: String,
      default: "",
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    moderatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Event", eventSchema);
