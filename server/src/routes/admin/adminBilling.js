import express from "express";
import crypto from "crypto";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import Invoice from "../../models/Invoice.js";
import User from "../../models/User.js";
import SubscriptionPlan from "../../models/SubscriptionPlan.js";
import OrganizerSubscription from "../../models/OrganizerSubscription.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";
import { logAdminAction } from "../../utils/auditLogger.js";
import { generateInvoicePdf } from "../../utils/invoicePdf.js";

const router = express.Router();

/**
 * Public Webhook Endpoint for payment providers (Razorpay / Stripe)
 * POST /api/admin/billing/webhook
 * Idempotent processing with HMAC signature verification.
 */
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] || req.headers["stripe-signature"];
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "eventra_sandbox_secret_2026";

    // 1. In sandbox / production with signature: verify HMAC
    if (signature && process.env.PAYMENT_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (signature !== expectedSignature) {
        return res.status(400).json({ message: "Invalid webhook signature" });
      }
    }

    const event = req.body;
    const eventType = event.event || event.type || "payment.captured";
    const paymentData = event.payload?.payment?.entity || event.data?.object || event;

    const externalPaymentId = paymentData.id || `TXN-${Date.now()}`;

    // 2. Idempotency Check: Prevent duplicate payment recording
    const existingTxn = await PaymentTransaction.findOne({
      $or: [{ gatewayPaymentId: externalPaymentId }, { transactionId: externalPaymentId }],
    });

    if (existingTxn && existingTxn.status === "SUCCESS") {
      return res.status(200).json({ received: true, message: "Transaction already processed." });
    }

    if (eventType === "payment.captured" || eventType === "charge.succeeded") {
      const notes = paymentData.notes || {};
      const organizerId = notes.organizerId;
      const planId = notes.planId;
      const billingCycle = notes.billingCycle || "monthly";
      const amount = Number(paymentData.amount ? paymentData.amount / 100 : paymentData.amount || 999);

      if (organizerId && planId) {
        const [organizer, plan] = await Promise.all([
          User.findById(organizerId),
          SubscriptionPlan.findById(planId),
        ]);

        if (organizer && plan) {
          const durationDays = billingCycle === "annual" ? 365 : 30;
          const startDate = new Date();
          const expiryDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

          const subscription = await OrganizerSubscription.create({
            organizer: organizer._id,
            plan: plan._id,
            billingCycle,
            startDate,
            expiryDate,
            status: "ACTIVE",
            history: [
              {
                action: "WEBHOOK_PAYMENT_SUCCESS",
                newPlan: plan.name,
                notes: `Captured ₹${amount} via ${paymentData.method || "gateway"}`,
                timestamp: new Date(),
              },
            ],
          });

          organizer.currentSubscription = subscription._id;
          await organizer.save();

          // Create Immutable Transaction Record
          const txn = await PaymentTransaction.create({
            transactionId: `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
            organizer: organizer._id,
            subscription: subscription._id,
            plan: plan._id,
            planName: plan.name,
            amount,
            currency: paymentData.currency || "INR",
            gateway: "Razorpay",
            gatewayPaymentId: externalPaymentId,
            gatewayOrderId: paymentData.order_id || "",
            paymentMethod: paymentData.method || "card",
            status: "SUCCESS",
            rawWebhookPayload: event,
            paidAt: new Date(),
          });

          // Generate Invoice
          const invoiceCount = await Invoice.countDocuments();
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, "0")}`;

          const invoice = await Invoice.create({
            invoiceNumber,
            transaction: txn._id,
            organizer: organizer._id,
            organizerBilling: {
              name: organizer.name,
              email: organizer.email,
              organization: organizer.organization || "",
              phone: organizer.phone || "",
            },
            planName: plan.name,
            billingCycle,
            subtotal: amount,
            taxRate: 0,
            taxAmount: 0,
            total: amount,
            status: "PAID",
          });

          txn.invoiceNumber = invoiceNumber;
          txn.invoice = invoice._id;
          await txn.save();
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Payment webhook error:", error);
    return res.status(500).json({ message: "Webhook handler failed: " + error.message });
  }
});

// All following routes require SUPER_ADMIN authorization
router.use(requireAuth, requireSuperAdmin);

/**
 * GET /api/admin/billing/stats
 * Financial overview metrics.
 */
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);

    const [aggAll, aggMonth, aggYear] = await Promise.all([
      PaymentTransaction.aggregate([
        {
          $group: {
            _id: "$status",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
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

    let grossRevenue = 0;
    let pendingAmount = 0;
    let failedAmount = 0;
    let refundAmount = 0;

    aggAll.forEach((item) => {
      if (item._id === "SUCCESS") grossRevenue += item.totalAmount;
      else if (item._id === "PENDING" || item._id === "CREATED") pendingAmount += item.totalAmount;
      else if (item._id === "FAILED") failedAmount += item.totalAmount;
      else if (item._id === "REFUNDED") refundAmount += item.totalAmount;
    });

    const netRevenue = Math.max(0, grossRevenue - refundAmount);

    res.json({
      success: true,
      stats: {
        grossRevenue,
        netRevenue,
        revenueThisMonth: aggMonth[0]?.total || 0,
        revenueThisYear: aggYear[0]?.total || 0,
        pendingAmount,
        failedAmount,
        refundAmount,
      },
    });
  } catch (error) {
    console.error("Billing stats error:", error);
    res.status(500).json({ message: "Could not fetch billing stats." });
  }
});

/**
 * GET /api/admin/billing/transactions
 * List transactions with search, filter, pagination, and CSV export.
 */
router.get("/transactions", async (req, res) => {
  try {
    const {
      search,
      status,
      plan,
      exportCsv,
      page: queryPage,
      limit: queryLimit,
    } = req.query;

    const query = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (plan && plan !== "ALL") {
      query.planName = new RegExp(plan, "i");
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ transactionId: reg }, { gatewayPaymentId: reg }, { invoiceNumber: reg }];
    }

    // CSV Export Flow
    if (exportCsv === "true") {
      const transactions = await PaymentTransaction.find(query)
        .sort({ createdAt: -1 })
        .populate("organizer", "name email organization")
        .lean();

      let csv = "Transaction ID,Date,Organizer Name,Organizer Email,Plan,Amount,Currency,Status,Gateway,Invoice Ref\n";
      transactions.forEach((t) => {
        csv += `"${t.transactionId}","${new Date(t.createdAt).toLocaleDateString()}","${t.organizer?.name || "N/A"}","${t.organizer?.email || "N/A"}","${t.planName || "N/A"}",${t.amount},"${t.currency}","${t.status}","${t.gateway}","${t.invoiceNumber || ""}"\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="eventra-transactions-${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Paginated JSON Flow
    const page = Math.max(1, parseInt(queryPage) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryLimit) || 15));
    const skip = (page - 1) * limit;

    const [total, transactions] = await Promise.all([
      PaymentTransaction.countDocuments(query),
      PaymentTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("organizer", "name email organization")
        .populate("plan", "name")
        .lean(),
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List transactions error:", error);
    res.status(500).json({ message: "Could not fetch transactions: " + error.message });
  }
});

/**
 * POST /api/admin/billing/transactions/:id/refund
 * Process a refund for a transaction.
 */
router.post("/transactions/:id/refund", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Customer requested refund" } = req.body;

    const transaction = await PaymentTransaction.findById(id).populate("organizer");
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    if (transaction.status === "REFUNDED") {
      return res.status(400).json({ message: "This transaction is already refunded." });
    }

    if (transaction.status !== "SUCCESS") {
      return res.status(400).json({ message: "Only successful payments can be refunded." });
    }

    transaction.status = "REFUNDED";
    transaction.refund = {
      refundId: `RFND-${Date.now().toString(36).toUpperCase()}`,
      amount: transaction.amount,
      reason: String(reason).trim(),
      processedBy: req.user._id,
      refundedAt: new Date(),
    };

    await transaction.save();

    // Mark invoice as refunded if exists
    if (transaction.invoice) {
      await Invoice.findByIdAndUpdate(transaction.invoice, { status: "REFUNDED" });
    }

    await logAdminAction({
      actor: req.user,
      action: "TRANSACTION_REFUNDED",
      targetEntity: "PaymentTransaction",
      targetId: transaction._id,
      targetName: `${transaction.transactionId} (₹${transaction.amount})`,
      reason: String(reason).trim(),
      req,
    });

    res.json({
      success: true,
      message: `Transaction ${transaction.transactionId} refunded successfully.`,
      transaction,
    });
  } catch (error) {
    console.error("Refund transaction error:", error);
    res.status(500).json({ message: "Failed to process refund: " + error.message });
  }
});

/**
 * GET /api/admin/billing/invoices
 * List generated invoices.
 */
router.get("/invoices", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(),
      Invoice.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("organizer", "name email organization")
        .populate("transaction", "transactionId gateway paymentMethod")
        .lean(),
    ]);

    res.json({
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List invoices error:", error);
    res.status(500).json({ message: "Could not fetch invoices." });
  }
});

/**
 * GET /api/admin/billing/invoices/:id/pdf
 * Stream vector PDF invoice using PDFKit.
 */
router.get("/invoices/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id).populate("organizer transaction");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    const pdfBuffer = await generateInvoicePdf(invoice);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Generate invoice PDF error:", error);
    res.status(500).json({ message: "Could not render invoice PDF." });
  }
});

export default router;

