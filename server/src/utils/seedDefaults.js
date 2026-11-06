import SubscriptionPlan from "../models/SubscriptionPlan.js";
import PlatformSettings from "../models/PlatformSettings.js";

export async function seedDefaultPlansAndSettings() {
  try {
    // 1. Seed Initial Subscription Plans if empty
    const planCount = await SubscriptionPlan.countDocuments();
    if (planCount === 0) {
      await SubscriptionPlan.create([
        {
          name: "Free",
          slug: "free",
          description: "Essential event hosting for student clubs, local meetups, and small workshops.",
          monthlyPrice: 0,
          annualPrice: 0,
          currency: "INR",
          isActive: true,
          isPopular: false,
          features: [
            "Up to 3 events total",
            "Up to 100 participants per event",
            "Real-time QR gate attendance scanning",
            "Classic certificate template",
            "Community help desk support",
          ],
          limits: {
            maxEvents: 3,
            maxParticipantsPerEvent: 100,
            aiFeaturesEnabled: false,
            customBrandingEnabled: false,
            feedbackGatingEnabled: true,
            reportPdfEnabled: false,
            prioritySupport: false,
          },
          sortOrder: 1,
        },
        {
          name: "Pro",
          slug: "pro",
          description: "High-volume management for college symposiums, hackathons, and regional conferences.",
          monthlyPrice: 999,
          annualPrice: 9999,
          currency: "INR",
          isActive: true,
          isPopular: true,
          features: [
            "Up to 20 events total",
            "Up to 1,000 participants per event",
            "Dual-mode continuous camera QR gate scanner",
            "8 Standard vector certificate themes",
            "Automated feedback gating before certificate download",
            "Centralized email delivery audit logs & retries",
            "Priority email support within 24h",
          ],
          limits: {
            maxEvents: 20,
            maxParticipantsPerEvent: 1000,
            aiFeaturesEnabled: true,
            customBrandingEnabled: true,
            feedbackGatingEnabled: true,
            reportPdfEnabled: true,
            prioritySupport: true,
          },
          sortOrder: 2,
        },
        {
          name: "Premium",
          slug: "premium",
          description: "Full-scale SaaS operations for universities, institutions, and enterprise tech summits.",
          monthlyPrice: 2499,
          annualPrice: 24999,
          currency: "INR",
          isActive: true,
          isPopular: false,
          features: [
            "Unlimited events & unlimited participants",
            "Google Gemini AI poster & session description generator",
            "12-Section Multi-Page Executive PDF Report Studio",
            "Custom organization branding & seal signatures",
            "Sub-second gate check-in throughput",
            "Dedicated 24/7 technical assistance & SLA",
          ],
          limits: {
            maxEvents: -1,
            maxParticipantsPerEvent: -1,
            aiFeaturesEnabled: true,
            customBrandingEnabled: true,
            feedbackGatingEnabled: true,
            reportPdfEnabled: true,
            prioritySupport: true,
          },
          sortOrder: 3,
        },
      ]);
      console.log("✅ Seeded default subscription plans (Free, Pro, Premium)");
    }

    // 2. Seed Initial Platform Settings if empty
    const settingsCount = await PlatformSettings.countDocuments();
    if (settingsCount === 0) {
      await PlatformSettings.create({
        platformName: "EVENTRA",
        supportEmail: "support@eventra.com",
        contactPhone: "+91 9876543210",
        eventModerationPolicy: "AUTO_APPROVE",
        defaultPlanSlug: "free",
        subscriptionGracePeriodDays: 7,
        maintenanceMode: false,
        maintenanceMessage: "EVENTRA is currently undergoing scheduled platform maintenance. We will be back online shortly.",
        paymentGateway: {
          provider: "Razorpay",
          isSandbox: true,
          keyId: "rzp_test_placeholder_key",
          webhookConfigured: true,
        },
      });
      console.log("✅ Seeded initial platform settings");
    }
  } catch (error) {
    console.error("Error seeding defaults:", error.message);
  }
}

