import express from "express";
import Registration from "../../models/Registration.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/participants
 * List platform participants across all events with search, filters, and CSV export.
 */
router.get("/", async (req, res) => {
  try {
    const { search, checkedIn, status = "confirmed", page = 1, limit = 20, format } = req.query;

    const query = {};
    if (status && status !== "ALL") query.status = status;
    if (checkedIn === "true") query.checkedIn = true;
    if (checkedIn === "false") query.checkedIn = false;

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ name: reg }, { email: reg }, { phone: reg }];
    }

    // CSV Export option
    if (format === "csv") {
      const records = await Registration.find(query)
        .sort({ createdAt: -1 })
        .limit(2000)
        .populate("eventId", "title slug date")
        .lean();

      let csv = "ID,Participant Name,Email,Phone,Event Title,Event Date,Checked In,Checked In At,Registered At\n";
      records.forEach((r) => {
        const ev = r.eventId || {};
        csv += `"${r._id}","${(r.name || "").replace(/"/g, '""')}","${r.email || ""}","${r.phone || ""}","${(ev.title || "").replace(/"/g, '""')}","${ev.date ? new Date(ev.date).toLocaleDateString() : ""}","${r.checkedIn ? "YES" : "NO"}","${r.checkedInAt ? new Date(r.checkedInAt).toISOString() : ""}","${new Date(r.createdAt).toISOString()}"\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="eventra_participants.csv"');
      return res.send(csv);
    }

    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (p - 1) * l;

    const [total, participants, checkedInCount] = await Promise.all([
      Registration.countDocuments(query),
      Registration.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .populate("eventId", "title slug date organizerId")
        .lean(),
      Registration.countDocuments({ ...query, checkedIn: true }),
    ]);

    const mapped = participants.map((p) => ({
      ...p,
      event: p.eventId,
    }));

    res.json({
      success: true,
      participants: mapped,
      summary: {
        total,
        checkedIn: checkedInCount,
        attendanceRate: total > 0 ? Math.round((checkedInCount / total) * 100) : 0,
      },
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error) {
    console.error("List participants error:", error);
    res.status(500).json({ message: "Could not fetch participants: " + error.message });
  }
});

export default router;

