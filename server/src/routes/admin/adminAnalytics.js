import express from "express";
import User from "../../models/User.js";
import Event from "../../models/Event.js";
import Registration from "../../models/Registration.js";
import SupportTicket from "../../models/SupportTicket.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/analytics
 * Platform analytics dashboard data with aggregations and CSV export.
 */
router.get("/", async (req, res) => {
  try {
    const { format } = req.query;
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // 1. Monthly Organizer Signups (12 Months)
    const organizerGrowthAgg = await User.aggregate([
      {
        $match: {
          role: "ORGANIZER",
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 2. Monthly Event Creations (12 Months)
    const eventCreationAgg = await Event.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 3. Monthly Registration Growth & Check-ins (12 Months)
    const registrationTrendsAgg = await Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalRegistrations: { $sum: 1 },
          checkedInCount: {
            $sum: { $cond: [{ $eq: ["$checkedIn", true] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Format 12-month timeline
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const timeline = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const key = `${monthNames[mIdx]} ${y}`;

      const orgItem = organizerGrowthAgg.find(
        (item) => item._id.year === y && item._id.month === mIdx + 1
      );
      const evtItem = eventCreationAgg.find(
        (item) => item._id.year === y && item._id.month === mIdx + 1
      );
      const regItem = registrationTrendsAgg.find(
        (item) => item._id.year === y && item._id.month === mIdx + 1
      );

      timeline.push({
        label: key,
        month: monthNames[mIdx],
        year: y,
        organizers: orgItem ? orgItem.count : 0,
        events: evtItem ? evtItem.count : 0,
        registrations: regItem ? regItem.totalRegistrations : 0,
        checkedIn: regItem ? regItem.checkedInCount : 0,
      });
    }

    // 4. Event Category Distribution
    const categoryDistributionAgg = await Event.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 5. Most Active Organizers Leaderboard (Top 10)
    const activeOrganizersAgg = await Event.aggregate([
      {
        $group: {
          _id: "$organizerId",
          totalEvents: { $sum: 1 },
          publishedEvents: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
        },
      },
      { $sort: { totalEvents: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "organizerDetails",
        },
      },
      { $unwind: "$organizerDetails" },
      {
        $project: {
          _id: 1,
          totalEvents: 1,
          publishedEvents: 1,
          name: "$organizerDetails.name",
          email: "$organizerDetails.email",
          organization: "$organizerDetails.organization",
          status: "$organizerDetails.status",
        },
      },
    ]);

    // 6. Most Popular Events by Registration (Top 10)
    const popularEventsAgg = await Registration.aggregate([
      { $match: { status: "confirmed" } },
      {
        $group: {
          _id: "$eventId",
          totalRegistrations: { $sum: 1 },
          checkedInCount: {
            $sum: { $cond: [{ $eq: ["$checkedIn", true] }, 1, 0] },
          },
        },
      },
      { $sort: { totalRegistrations: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "_id",
          as: "eventDetails",
        },
      },
      { $unwind: "$eventDetails" },
      {
        $project: {
          _id: 1,
          totalRegistrations: 1,
          checkedInCount: 1,
          title: "$eventDetails.title",
          category: "$eventDetails.category",
          date: "$eventDetails.date",
          status: "$eventDetails.status",
        },
      },
    ]);

    // 7. Support Ticket Resolution Analytics
    const [ticketSummaryAgg, resolvedTickets] = await Promise.all([
      SupportTicket.aggregate([
        {
          $group: {
            _id: "$category",
            total: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] },
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
      SupportTicket.find({
        status: { $in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { $exists: true },
      })
        .select("createdAt resolvedAt")
        .limit(200)
        .lean(),
    ]);

    let avgResolutionHours = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((acc, t) => {
        const diffMs = new Date(t.resolvedAt) - new Date(t.createdAt);
        return acc + Math.max(0, diffMs / (1000 * 60 * 60));
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedTickets.length) * 10) / 10;
    }

    if (format === "csv") {
      let csv = "Month,Organizers,Events,Registrations,CheckedIn\n";
      timeline.forEach((t) => {
        csv += `"${t.label}",${t.organizers},${t.events},${t.registrations},${t.checkedIn}\n`;
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="eventra_platform_analytics.csv"');
      return res.send(csv);
    }

    res.json({
      success: true,
      timeline,
      categories: categoryDistributionAgg.map((c) => ({
        category: c._id || "General",
        count: c.count,
      })),
      activeOrganizers: activeOrganizersAgg,
      popularEvents: popularEventsAgg,
      supportAnalytics: {
        categoryBreakdown: ticketSummaryAgg.map((t) => ({
          category: t._id || "Other",
          total: t.total,
          resolved: t.resolved,
        })),
        avgResolutionHours,
        totalResolvedSample: resolvedTickets.length,
      },
    });
  } catch (error) {
    console.error("Platform analytics error:", error);
    res.status(500).json({ message: "Could not load analytics: " + error.message });
  }
});

export default router;

