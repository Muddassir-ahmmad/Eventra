import express from "express";
import Event from "../models/Event.js";
import { requireAuth } from "../middleware/auth.js";
import { makeSlug } from "../utils/slug.js";
import { DEFAULT_CERTIFICATE_DESCRIPTION } from "../utils/certificateDesign.js";

const router = express.Router();

/*
  CREATE EVENT
*/
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      venue,
      capacity,
      registrationDeadline,
      posterUrl,
      qrEnabled,
      volunteerEnabled,
      certificateEnabled,
      certificateTemplate,
      certificateTitle,
      certificateDescription,
      eventType,
      signatures,
      certificateShowOrganization,
      certificateOrganization,
      certificateLogoUrl,
      certificateLogoPath,
      status,
    } = req.body;

    if (!title || !date || !venue || !capacity) {
      return res.status(400).json({
        message: "Title, date, venue and capacity are required",
      });
    }

    if (status !== undefined && !["draft", "published"].includes(status)) {
      return res.status(400).json({ message: "Event status must be draft or published" });
    }

    let slug = makeSlug(title);

    const existing = await Event.findOne({ slug });

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    const event = await Event.create({
      organizerId: req.userId,
      title,
      slug,
      description: description || "",
      date,
      venue,
      capacity,
      registrationDeadline: registrationDeadline || null,
      posterUrl: posterUrl || "",
      qrEnabled: qrEnabled ?? true,
      volunteerEnabled: volunteerEnabled ?? false,
      certificateEnabled: certificateEnabled ?? false,
      certificateTemplate: certificateTemplate ?? "classic",
      certificateTitle: certificateTitle || "Certificate of Participation",
      certificateDescription: certificateDescription || DEFAULT_CERTIFICATE_DESCRIPTION,
      eventType: eventType || "",
      signatures: Array.isArray(signatures) ? signatures : [],
      certificateShowOrganization: certificateShowOrganization === true,
      certificateOrganization: certificateOrganization || "",
      certificateLogoUrl: certificateLogoUrl || "",
      certificateLogoPath: certificateLogoPath || "",
      status: status || "published",
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error("Create event error:", error);

    res.status(500).json({
      message: "Could not create event",
    });
  }
});


/*
  GET ORGANIZER'S EVENTS
*/
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const events = await Event.find({
      organizerId: req.userId,
    }).sort({
      createdAt: -1,
    });

    res.json({ events });
  } catch (error) {
    console.error("Load events error:", error);

    res.status(500).json({
      message: "Could not load events",
    });
  }
});


/*
  UPDATE EVENT
  Organizer can edit ONLY their own event.
*/
router.put("/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found or you do not have permission",
      });
    }

    const {
      title,
      description,
      date,
      venue,
      capacity,
      registrationDeadline,
      posterUrl,
      qrEnabled,
      volunteerEnabled,
      certificateEnabled,
      certificateTemplate,
      certificateTitle,
      certificateDescription,
      eventType,
      signatures,
      certificateShowOrganization,
      certificateLogoUrl,
      certificateLogoPath,
      status,
    } = req.body;

    if (title !== undefined) {
      event.title = title;
    }

    if (description !== undefined) {
      event.description = description;
    }

    if (date !== undefined) {
      event.date = date;
    }

    if (venue !== undefined) {
      event.venue = venue;
    }

    if (capacity !== undefined) {
      event.capacity = capacity;
    }

    if (registrationDeadline !== undefined) {
      event.registrationDeadline = registrationDeadline || null;
    }

    if (posterUrl !== undefined) {
      event.posterUrl = posterUrl;
    }

    if (qrEnabled !== undefined) {
      event.qrEnabled = qrEnabled;
    }

    if (volunteerEnabled !== undefined) {
      event.volunteerEnabled = volunteerEnabled;
    }

    if (certificateEnabled !== undefined) {
      event.certificateEnabled = certificateEnabled;
    }

    if (certificateTemplate !== undefined) {
      event.certificateTemplate = certificateTemplate;
    }

    if (certificateTitle !== undefined) {
      event.certificateTitle = certificateTitle;
    }

    if (certificateDescription !== undefined) {
      event.certificateDescription = certificateDescription;
    }

    if (eventType !== undefined) {
      event.eventType = eventType;
    }

    if (signatures !== undefined) {
      event.signatures = Array.isArray(signatures) ? signatures : [];
    }

    if (status !== undefined) {
      if (!["draft", "published", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid event status" });
      }
      event.status = status;
    }

    if (certificateShowOrganization !== undefined) {
      event.certificateShowOrganization = certificateShowOrganization;
    }

    if (certificateOrganization !== undefined) {
      event.certificateOrganization = certificateOrganization;
    }

    if (certificateLogoUrl !== undefined) {
      event.certificateLogoUrl = certificateLogoUrl;
    }

    if (certificateLogoPath !== undefined) {
      event.certificateLogoPath = certificateLogoPath;
    }

    await event.save();

    res.json({
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("Update event error:", error);

    res.status(500).json({
      message: "Could not update event",
    });
  }
});


/*
  DELETE EVENT
  Organizer can delete ONLY their own event.
*/
router.delete("/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found or you do not have permission",
      });
    }

    await Event.deleteOne({
      _id: event._id,
    });

    res.json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);

    res.status(500).json({
      message: "Could not delete event",
    });
  }
});


/*
  PUBLIC EVENT
*/
router.get("/public/:slug", async (req, res) => {
  try {
    const event = await Event.findOne({
      slug: req.params.slug,
      status: "published",
    }).select("-organizerId");

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.json({ event });
  } catch (error) {
    console.error("Public event error:", error);

    res.status(500).json({
      message: "Could not load event",
    });
  }
});


export default router;