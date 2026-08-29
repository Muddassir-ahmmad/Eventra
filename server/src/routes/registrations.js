import express from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import { requireAuth } from "../middleware/auth.js";
import { makeRegistrationId } from "../utils/registrationId.js";

const router = express.Router();

// Public registration for an event
router.post("/public/:slug", async (req, res) => {
  try {
    const { name, email, phone, college, department } = req.body;

    if (!name || !email || !phone || !college) {
      return res.status(400).json({
        message: "Name, email, phone and college are required",
      });
    }

    const event = await Event.findOne({
      slug: req.params.slug,
      status: "published",
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (
      event.registrationDeadline &&
      new Date() > new Date(event.registrationDeadline)
    ) {
      return res.status(400).json({
        message: "Registration deadline has passed",
      });
    }

    const registrationCount = await Registration.countDocuments({
      eventId: event._id,
      status: "confirmed",
    });

    if (registrationCount >= event.capacity) {
      return res.status(409).json({
        message: "This event is sold out",
      });
    }

    const existing = await Registration.findOne({
      eventId: event._id,
      email: email.toLowerCase().trim(),
      status: "confirmed",
    });

    if (existing) {
      return res.status(409).json({
        message: "This email is already registered for this event",
      });
    }

    let registrationId = makeRegistrationId();

    while (await Registration.exists({ registrationId })) {
      registrationId = makeRegistrationId();
    }

    const registration = await Registration.create({
      eventId: event._id,
      name,
      email,
      phone,
      college,
      department,
      registrationId,
    });

    res.status(201).json({
      message: "Registration successful",
      registration: {
        id: registration._id,
        registrationId: registration.registrationId,
        name: registration.name,
        email: registration.email,
        eventName: event.title,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered for this event",
      });
    }

    console.error(error);
    res.status(500).json({
      message: "Could not complete registration",
    });
  }
});

// Organizer: view registrations for one of their events
router.get("/event/:eventId", requireAuth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizerId: req.userId,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const registrations = await Registration.find({
      eventId: event._id,
    }).sort({ createdAt: -1 });

    res.json({
      event: {
        id: event._id,
        title: event.title,
        capacity: event.capacity,
      },
      count: registrations.filter(
        (item) => item.status === "confirmed"
      ).length,
      registrations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Could not load registrations",
    });
  }
});

export default router;
