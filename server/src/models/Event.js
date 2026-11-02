import mongoose from "mongoose";

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

    date: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      default: "",
    },

    endTime: {
      type: String,
      default: "",
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
     * EVENT DESIGN
     */
    posterUrl: {
      type: String,
      default: "",
    },

    theme: {
      type: String,
      enum: [
        "aurora",
        "minimal",
        "conference",
        "creative",
      ],
      default: "aurora",
    },


    /*
     * SPEAKERS / JUDGES / GUESTS
     */
    speakers: {
      type: [speakerSchema],
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

    certificateShowOrganization: {
      type: Boolean,
      default: true,
    },

    signatures: {
      type: [signatureSchema],
      default: [],
    },


    /*
     * EVENT STATUS
     */
    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "closed",
      ],
      default: "draft",
    },
  },

  {
    timestamps: true,
  }
);


export default mongoose.model("Event", eventSchema);