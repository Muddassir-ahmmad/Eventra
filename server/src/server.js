import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "./config/db.js";
import { seedDefaultPlansAndSettings } from "./utils/seedDefaults.js";

// Core Routes
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import registrationRoutes from "./routes/registrations.js";
import certificateRoutes from "./routes/certificates.js";
import emailRoutes from "./routes/emails.js";
import feedbackRoutes from "./routes/feedback.js";
import reportRoutes from "./routes/reports.js";
import organizerBillingRoutes from "./routes/organizerBilling.js";

// Super Admin Suite Routes
import adminDashboardRoutes from "./routes/admin/adminDashboard.js";
import adminOrganizersRoutes from "./routes/admin/adminOrganizers.js";
import adminEventsRoutes from "./routes/admin/adminEvents.js";
import adminSubscriptionsRoutes from "./routes/admin/adminSubscriptions.js";
import adminBillingRoutes from "./routes/admin/adminBilling.js";
import adminSupportRoutes from "./routes/admin/adminSupport.js";
import adminNotificationsRoutes from "./routes/admin/adminNotifications.js";
import adminAuditLogsRoutes from "./routes/admin/adminAuditLogs.js";
import adminSettingsRoutes from "./routes/admin/adminSettings.js";
import adminParticipantsRoutes from "./routes/admin/adminParticipants.js";
import adminAnalyticsRoutes from "./routes/admin/adminAnalytics.js";

const app = express();
const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads");

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
if (process.env.NODE_ENV !== "production") {
  app.use("/uploads", express.static(uploadDirectory, { maxAge: "1d" }));
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "EVENTRA API is running",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Organizer & Participant APIs
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/organizer", organizerBillingRoutes);

// Super Admin Platform APIs
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/organizers", adminOrganizersRoutes);
app.use("/api/admin/events", adminEventsRoutes);
app.use("/api/admin/subscriptions", adminSubscriptionsRoutes);
app.use("/api/admin/billing", adminBillingRoutes);
app.use("/api/admin/support", adminSupportRoutes);
app.use("/api/admin/notifications", adminNotificationsRoutes);
app.use("/api/admin/audit-logs", adminAuditLogsRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/admin/participants", adminParticipantsRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedDefaultPlansAndSettings();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EVENTRA server running on port ${PORT}`);
  });
});
