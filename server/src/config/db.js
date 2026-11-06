import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ CRITICAL: MONGODB_URI environment variable is not defined!");
    console.error("👉 Please add MONGODB_URI in your Render / hosting environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}
