import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import registrationRoutes from "./routes/registrations.js";
import certificateRoutes from "./routes/certificates.js";
import emailRoutes from "./routes/emails.js";
import feedbackRoutes from "./routes/feedback.js";
import reportRoutes from "./routes/reports.js";

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

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reports", reportRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `EVENTRA server running on port ${PORT}`
    );
  });
});
