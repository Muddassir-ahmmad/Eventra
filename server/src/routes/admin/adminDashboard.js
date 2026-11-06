import express from "express";
import User from "../../models/User.js";
import Event from "../../models/Event.js";
import Registration from "../../models/Registration.js";
import Certificate from "../../models/Certificate.js";
import SupportTicket from "../../models/SupportTicket.js";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import OrganizerSubscription from "../../models/OrganizerSubscription.js";
import AdminAuditLog from "../../models/AdminAuditLog.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/dashboard/stats
 * Real-time platform KPI statistics and 12-month charts using MongoDB aggregation.
 */
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // 1. Organizer Statistics
    const [
      totalOrganizers,
      activeOrganizers,
      suspendedOrganizers,
      deactivatedOrganizers,
      verifiedOrganizers,
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ["ORGANIZER", "SUPER_ADMIN"] } }),
      User.countDocuments({ role: "ORGANIZER", status: "ACTIVE" }),
      User.countDocuments({ role: "ORGANIZER", status: "SUSPENDED" }),
      User.countDocuments({ role: "ORGANIZER", status: "DEACTIVATED" }),
      User.countDocuments({ role: "ORGANIZER", verificationStatus: "VERIFIED" }),
    ]);

    // 2. Event Statistics
    const [
      totalEvents,
      publishedEvents,
      completedEvents,
      draftEvents,
      flaggedEvents,
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: "published" }),
      Event.countDocuments({ status: "completed" }),
      Event.countDocuments({ status: "draft" }),
      Event.countDocuments({ moderationStatus: "FLAGGED" }),
    ]);

    // 3. Participant Registration & Certificate Statistics
    const [
      totalParticipants,
      checkedInParticipants,
      totalCertificates,
      openComplaints,
      unresolvedComplaints,
    ] = await Promise.all([
      Registration.countDocuments({ status: "confirmed" }),
      Registration.countDocuments({ checkedIn: true }),
      Certificate.countDocuments({ status: "issued" }),
      SupportTicket.countDocuments({ status: "OPEN" }),
      SupportTicket.countDocuments({
        status: { $in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_ORGANIZER", "WAITING_FOR_USER"] },
      }),
    ]);

    // 4. Subscriptions Statistics
    const [
      activeSubscriptions,
      expiredSubscriptions,
      trialSubscriptions,
    ] = await Promise.all([
      OrganizerSubscription.countDocuments({ status: "ACTIVE", expiryDate: { $gte: now } }),
      OrganizerSubscription.countDocuments({
        $or: [{ status: "EXPIRED" }, { expiryDate: { $lt: now } }],
      }),
      OrganizerSubscription.countDocuments({ status: "TRIAL" }),
    ]);

    // 5. Billing & Revenue Statistics
    const revenueAgg = await PaymentTransaction.aggregate([
      {
        $group: {
          _id: "$status",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalCollectedRevenue = 0;
    let pendingPayments = 0;
    let failedPayments = 0;
    let refundedAmount = 0;

    revenueAgg.forEach((item) => {
      if (item._id === "SUCCESS") {
        totalCollectedRevenue += item.totalAmount;
      } else if (item._id === "PENDING" || item._id === "CREATED") {
        pendingPayments += item.totalAmount;
      } else if (item._id === "FAILED") {
        failedPayments += item.totalAmount;
      } else if (item._id === "REFUNDED") {
        refundedAmount += item.totalAmount;
      }
    });

    // Month & Year Revenue
    const [monthRevenueAgg, yearRevenueAgg] = await Promise.all([
      PaymentTransaction.aggregate([
        {
          $match: {
            status: "SUCCESS",
            paidAt: { $gte: startOfCurrentMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      PaymentTransaction.aggregate([
        {
          $match: {
            status: "SUCCESS",
            paidAt: { $gte: startOfCurrentYear },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const revenueThisMonth = monthRevenueAgg[0]?.total || 0;
    const revenueThisYear = yearRevenueAgg[0]?.total || 0;
    const netRevenue = Math.max(0, totalCollectedRevenue - refundedAmount);

    // 6. 12-Month Revenue Growth Chart Aggregation
    const monthlyRevenueData = await PaymentTransaction.aggregate([
      {
        $match: {
          status: "SUCCESS",
          paidAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" },
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 7. 12-Month Organizer Sign-ups Chart Aggregation
    const monthlyOrganizersData = await User.aggregate([
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
          organizers: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 8. 12-Month Event Creation Chart Aggregation
    const monthlyEventsData = await Event.aggregate([
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
          events: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 9. Subscription Plan Distribution Aggregation
    const subscriptionDistribution = await OrganizerSubscription.aggregate([
      {
        $lookup: {
          from: "subscriptionplans",
          localField: "plan",
          foreignField: "_id",
          as: "planDetails",
        },
      },
      { $unwind: { path: "$planDetails", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$planDetails.name",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format 12-month arrays
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedMonths = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const key = `${monthNames[mIdx]} ${y}`;

      const revItem = monthlyRevenueData.find(
        (item) => item._id.year === y && item._id.month === mIdx + 1
      );
      const orgItem = monthlyOrganizersData.find(
        (item) => item._id.year === y && item._id.month === mIdx + 1
      );
      const evtItem = monthlyEventsData.find(
        (item) => item._id.year === y && item._id.month === mIdx + 1
      );

      formattedMonths.push({
        name: key,
        month: monthNames[mIdx],
        year: y,
        revenue: revItem ? revItem.revenue : 0,
        organizers: orgItem ? orgItem.organizers : 0,
        events: evtItem ? evtItem.events : 0,
      });
    }

    // 10. Recent Transactions, Registrations & Admin Activities
    const [recentTransactions, recentRegistrations, recentActivities] = await Promise.all([
      PaymentTransaction.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("organizer", "name email organization")
        .lean(),
      Registration.find({ status: "confirmed" })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("eventId", "title slug date")
        .lean(),
      AdminAuditLog.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    res.json({
      success: true,
      kpis: {
        organizers: {
          total: totalOrganizers,
          active: activeOrganizers,
          suspended: suspendedOrganizers,
          deactivated: deactivatedOrganizers,
          verified: verifiedOrganizers,
        },
        events: {
          total: totalEvents,
          published: publishedEvents,
          completed: completedEvents,
          draft: draftEvents,
          flagged: flaggedEvents,
        },
        participants: {
          total: totalParticipants,
          checkedIn: checkedInParticipants,
          attendanceRate: totalParticipants > 0
            ? Math.round((checkedInParticipants / totalParticipants) * 100)
            : 0,
        },
        certificates: {
          totalGenerated: totalCertificates,
        },
        support: {
          open: openComplaints,
          unresolved: unresolvedComplaints,
        },
        subscriptions: {
          active: activeSubscriptions,
          expired: expiredSubscriptions,
          trial: trialSubscriptions,
          distribution: subscriptionDistribution.map((item) => ({
            name: item._id || "Free",
            count: item.count,
          })),
        },
        revenue: {
          totalCollected: totalCollectedRevenue,
          net: netRevenue,
          thisMonth: revenueThisMonth,
          thisYear: revenueThisYear,
          pending: pendingPayments,
          failed: failedPayments,
          refunded: refundedAmount,
        },
      },
      charts: {
        timeline: formattedMonths,
      },
      recent: {
        transactions: recentTransactions,
        registrations: recentRegistrations.map((r) => ({
          ...r,
          event: r.eventId,
        })),
        activities: recentActivities,
      },
    });
  } catch (error) {
    console.error("Super Admin dashboard error:", error);
    res.status(500).json({ message: "Could not load admin analytics: " + error.message });
  }
});

export default router;

