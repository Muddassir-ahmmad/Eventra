import express from "express";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import { requireAuth } from "../middleware/auth.js";
import { makeSlug } from "../utils/slug.js";

const router = express.Router();
const EVENT_STATUSES = ["draft", "published", "closed"];
const EVENT_FIELDS = [
  "title",
  "shortDescription",
  "description",
  "date",
  "startTime",
  "endTime",
  "venue",
  "location",
  "capacity",
  "registrationDeadline",
  "posterUrl",
  "theme",
  "speakers",
  "registrationFields",
  "ticketMode",
  "qrEnabled",
  "ticketTypes",
  "volunteerEnabled",
  "volunteerRoles",
  "certificateEnabled",
  "certificateTemplate",
  "certificateDescription",
  "signatures",
  "status",
];

function pickEventFields(body) {
  return Object.fromEntries(
    EVENT_FIELDS
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]])
  );
}

function isValidEventId(eventId) {
  return mongoose.isObjectIdOrHexString(eventId);
}

/*
  CREATE EVENT
*/
router.post("/", requireAuth, async (req, res) => {
  try {
    const fields = pickEventFields(req.body);
    const { title, date, venue, capacity } = fields;

    if (
      !title?.trim() ||
      !date ||
      Number.isNaN(new Date(date).getTime()) ||
      !venue?.trim() ||
      !Number.isFinite(Number(capacity)) ||
      Number(capacity) < 1
    ) {
      return res.status(400).json({
        message: "A title, valid date, venue and positive capacity are required",
      });
    }

    if (fields.status !== undefined && !EVENT_STATUSES.includes(fields.status)) {
      return res.status(400).json({
        message: "Status must be draft, published or closed",
      });
    }

    let slug = makeSlug(title);

    const existing = await Event.findOne({ slug });

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    const event = await Event.create({
      ...fields,
      organizerId: req.userId,
      title: title.trim(),
      slug,
      venue: venue.trim(),
      capacity: Number(capacity),
      status: fields.status ?? "draft",
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error("Create event error:", error);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: "An event with this slug already exists" });
    }

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
  GET ONE OF THE ORGANIZER'S EVENTS
*/
router.get("/:eventId", requireAuth, async (req, res) => {
  if (!isValidEventId(req.params.eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ event });
  } catch (error) {
    console.error("Load event error:", error);
    res.status(500).json({ message: "Could not load event" });
  }
});


/*
  UPDATE EVENT
  Organizer can edit ONLY their own event.
*/
router.put("/:eventId", requireAuth, async (req, res) => {
  if (!isValidEventId(req.params.eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

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

    const fields = pickEventFields(req.body);

    if (fields.status !== undefined && !EVENT_STATUSES.includes(fields.status)) {
      return res.status(400).json({
        message: "Status must be draft, published or closed",
      });
    }

    Object.assign(event, fields);
    await event.save();

    res.json({
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("Update event error:", error);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }

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
  if (!isValidEventId(req.params.eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

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