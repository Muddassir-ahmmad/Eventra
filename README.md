# EVENTRA — Smart Event Management & Registration Platform

EVENTRA is a production-grade, full-stack event lifecycle platform built with **React 19**, **Vite**, **Node.js**, **Express**, and **MongoDB / Mongoose**. It seamlessly unifies the entire lifecycle of professional events, hackathons, seminars, and conferences — from initial conception, vector poster design, ticket tiers, and public landing pages to QR attendance check-in, automated smart closure, feedback collection, verified certificate issuance, and executive 12-section multi-page vector PDF reporting.

---

## 🚀 Key Modules & Architecture

```
                                      EVENTRA PLATFORM LIFECYCLE
                                      
  [Organizer Studio] ──► [Public Landing Page] ──► [Participant Registration] ──► [Digital QR Pass]
          │                                                                              │
          ▼                                                                              ▼
  [Manage Dashboard] ◄─────────────────────────────────────────────────────── [Live QR Check-In]
          │
          ├──► [End Event Trigger] ──► [Automated Feedback Dispatch] ──► [Participant Feedback]
          │                                                                      │
          ├──► [Feedback-Gated Certificates] ◄───────────────────────────────────┘
          │          (Vector PDF + Email Delivery)
          │
          └──► [Executive Post-Event Report] ──► [Multi-Page Vector PDF Export]
```

### Complete 8-Phase Implementation Summary

1. **Phase 1 — Repository Audit & Architecture Roadmap**:
   - Reconciled and unified branches (`feature/core-event-report` and `feature/certificates-email`).
   - Clean, modular database design maintaining strict MongoDB + Mongoose schema integrity (zero Supabase/PostgreSQL/Firebase dependencies).

2. **Phase 2 — Event Creation & Premium Public Event Page**:
   - Comprehensive **9-step Event Builder** (`/create-event` and `/dashboard/events/:eventId/edit`): Basic Details, Date & Time, Venue & Mode, Capacity & Pricing, Custom Registration Fields, Volunteer Roles, AI/Preset Vector Poster Studio, Ticket Configuration, and Preview.
   - Vector poster generator (`client/src/utils/posterTemplates.js`) with preset themes (Tech Conference, Cyber Hackathon, Executive Summit, Creative Workshop, Music Fest, Startup Pitch) generating crisp SVGs and Canvas artwork.
   - High-converting, responsive Dark Glassmorphism participant landing page (`/events/:slug`) with countdown timer, speaker roster, agenda timeline, ticket pass selection, and embedded registration modal.

3. **Phase 3 — Digital Pass, QR Tickets & Fast Attendance Management**:
   - Participant digital pass page (`/tickets/:registrationId`) with live QR code pass, event schedule, Google Calendar links, and 1-click vector PDF ticket download.
   - Dedicated Attendance Management Dashboard (`/dashboard/events/:eventId/attendance`) with 5 KPI cards (Total, Checked In, Pending, Attendance Rate %, Recent Velocity).
   - Real-time HTML5 camera barcode/QR scanner (`client/src/utils/qrScanner.js`) capable of continuous instant entry scans.
   - Fast Check-In backend (`POST /api/registrations/:eventId/check-in`) supporting raw registration ID, attendee email, or parsed QR JSON payload with duplicate check-in prevention.
   - Manual check-in toggle and instant CSV attendee export.

4. **Phase 4 — Certificate Management with Feedback Gating**:
   - Certificate Studio (`/dashboard/events/:eventId/certificates`) with live WYSIWYG preview, custom organization branding/logo upload, and multi-signatory controls.
   - Support for draft event certificate design saving before publishing.
   - **Feedback Gating (`requireFeedbackForCertificate`)**: Attendees who have checked in but have not completed the post-event feedback survey are gated with a `feedback_pending` state, preventing unearned certificate generation until survey completion.
   - Public certificate verification endpoints (`GET /api/certificates/public/:registrationId/status` and `GET /api/certificates/public/:registrationId/download`).

5. **Phase 5 — Centralized Email Notification Module**:
   - Production-ready backend email engine (`server/src/services/emailService.js`) powered by Nodemailer with SMTP transport health checks, RFC email syntax validation, and 60-second cooldown duplicate prevention.
   - Responsive HTML email templates (`server/src/services/emailTemplates.js`) for:
     - Registration confirmation
     - Digital ticket pass with embedded QR and attached PDF
     - Certificate delivery with attached PDF
     - Post-event feedback invitations with personalized survey tokens
     - Organizer capacity and new registration alerts
     - SMTP diagnostics test dispatch
   - Organizer Email Management Dashboard (`/dashboard/events/:eventId/emails`) with delivery status badges, error inspection, search, and one-click retry for failed deliveries.
   - Full persistence in MongoDB `EmailLog` collection (zero fake delivery logging).

6. **Phase 6 — Smart Event Closure & Feedback Automation**:
   - Organizer "End Event" trigger (`POST /api/events/:eventId/end`) with confirmation modal, immediate status transition to `completed`, recording of `completedAt`, closure of registrations (`409 Conflict`), and automatic initialization of the Post-Event Report draft.
   - Automated post-event feedback email dispatch to confirmed attendees using cryptographically secure 32-byte hexadecimal survey tokens (`server/src/utils/feedbackEmail.js`).
   - Public participant feedback page (`/feedback/:token` or `/events/:eventId/feedback`) collecting 4 star ratings (Overall, Organization, Speakers, Venue) and 3 qualitative narratives (Highlights, Improvements, Suggestions).
   - Real-time Participant Feedback Analytics Dashboard (`/dashboard/events/:eventId/feedback`) displaying net promoter metrics, rating distributions, and CSV export.

7. **Phase 7 — Post-Event Report Generation Module**:
   - Temporal availability gating (`server/src/utils/eventTiming.js`) ensuring post-event reports can only be finalized once an event is officially completed.
   - Auto-population of 12 comprehensive report sections (`server/src/utils/defaultReportContent.js`) using actual event metadata, volunteer roles, speaker agendas, and feedback summaries.
   - Real-time report attendance and feedback analytics calculation (`server/src/utils/reportAnalytics.js`) handling zero registrations gracefully without `NaN`.
   - Dedicated Post-Event Report Studio (`/dashboard/events/:eventId/report`) with tabbed markdown editors, draft persistence, and live analytics previews.
   - Multi-page vector PDF generation engine (`server/src/utils/reportPdf.js`) using PDFKit, complete with cover page, KPI metric cards, agenda tables, feedback breakdown, running headers, and footers (*"Page X of 6"*).

8. **Phase 8 — Production Deployment, UI Polish & Observability**:
   - Modern Dark Glassmorphism UI across the entire application with Inter typography, purple glow accents, mobile-friendly responsive breakpoints, and loading states.
   - Production health check endpoint (`GET /api/health`) reporting system uptime, status, and server timestamps.
   - Automated unit test suite with 100% pass rate (16 passing tests, 0 failures).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router 7, Axios, Lucide Icons, Canvas API |
| **Backend** | Node.js (ES Modules), Express 5, JWT, bcryptjs, Multer |
| **Database** | MongoDB 6+, Mongoose 8 (Strict Schemas & Indexes) |
| **Document Generation** | PDFKit (Vector PDF Tickets, Certificates, and Reports) |
| **Barcodes & QR** | QRCode (Vector & DataURI Generation) |
| **Email Transport** | Nodemailer (SMTP, Gmail, SendGrid, Brevo, AWS SES) |
| **Cloud Storage** | Cloudinary (Optional for persistent production poster & logo uploads) |

---

## 🗄️ MongoDB Database Schemas

The platform maintains strict referential integrity across 7 core Mongoose models:

1. **`User`**: Organizer accounts (`name`, `email`, `password` hashed with bcrypt, `role`, `createdAt`).
2. **`Event`**: Core event entity (`title`, `slug`, `organizer`, `description`, `startDate`, `endDate`, `status: ['draft', 'published', 'completed', 'cancelled']`, `ticketTiers`, `customFields`, `certificateSettings`, `postEventReportSettings`, `completedAt`).
3. **`Registration`**: Participant booking (`event`, `user`, `name`, `email`, `ticketType`, `status`, `qrCode`, `checkedIn`, `checkedInAt`, `feedbackSubmitted`, `feedbackToken`, `certificateIssued`).
4. **`Certificate`**: Issued credentials (`event`, `registration`, `participantName`, `certificateId`, `issuedAt`, `pdfUrl`, `verificationHash`).
5. **`Feedback`**: Participant reviews (`event`, `registration`, `overallRating`, `organizationRating`, `speakerRating`, `venueRating`, `likedAspects`, `improvements`, `suggestions`, `submittedAt`).
6. **`EmailLog`**: Mail audit log (`event`, `recipientEmail`, `recipientName`, `emailType`, `status: ['pending', 'sent', 'failed']`, `messageId`, `errorMessage`, `sentAt`).
7. **`PostEventReport`**: Comprehensive event dossiers (`event`, `organizer`, `status: ['draft', 'finalized']`, `sections`, `analyticsCache`, `finalizedAt`).

---

## 📡 REST API Reference

### Health & Diagnostics
- `GET /api/health` — System status, uptime, and server timestamp.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new organizer account.
- `POST /api/auth/login` — Authenticate organizer and obtain JWT token.
- `GET /api/auth/me` — Retrieve current authenticated organizer profile.

### Events (`/api/events`)
- `GET /api/events` — List events owned by the authenticated organizer.
- `POST /api/events` — Create a new event draft or published event.
- `GET /api/events/public/:slug` — Fetch public event details by URL slug.
- `GET /api/events/:id` — Fetch event details for management.
- `PUT /api/events/:id` — Update event configuration.
- `DELETE /api/events/:id` — Delete event and associated records.
- `POST /api/events/:id/end` — **Smart Event Closure**: transitions status to `completed`, prevents new registrations, initializes report, and triggers feedback emails.

### Registrations & Check-In (`/api/registrations`)
- `POST /api/registrations/:slug` — Register participant for an event.
- `GET /api/registrations/event/:eventId` — List all registrations for an event.
- `GET /api/registrations/pass/:registrationId` — Fetch public digital pass information.
- `GET /api/registrations/pass/:registrationId/pdf` — Download vector PDF ticket pass with QR.
- `POST /api/registrations/:eventId/check-in` — Fast QR and barcode check-in endpoint.
- `PUT /api/registrations/:registrationId/check-in` — Toggle check-in status manually.

### Feedback Automation (`/api/feedback`)
- `GET /api/feedback/verify/:token` — Verify survey link token and fetch participant details.
- `POST /api/feedback/submit` — Submit 4-tier ratings and qualitative reviews.
- `GET /api/feedback/event/:eventId` — Organizer feedback analytics and individual responses.
- `GET /api/feedback/event/:eventId/export` — Export survey feedback as CSV.
- `POST /api/feedback/event/:eventId/send-requests` — Trigger or retry feedback request emails.

### Certificates (`/api/certificates`)
- `GET /api/certificates/:eventId/studio` — Fetch certificate configuration and preview data.
- `PUT /api/certificates/:eventId/studio` — Update certificate design, layout, logo, and signatories.
- `POST /api/certificates/:eventId/generate/:registrationId` — Generate vector PDF certificate for a verified attendee.
- `POST /api/certificates/:eventId/bulk-send` — Bulk generate and deliver certificates via email.
- `GET /api/certificates/public/:registrationId/status` — Public verification of participant certificate eligibility.
- `GET /api/certificates/public/:registrationId/download` — Direct participant download of vector PDF certificate.

### Email Notification Module (`/api/emails`)
- `GET /api/emails/:eventId/logs` — Fetch email delivery audit logs with filtering.
- `POST /api/emails/:eventId/retry/:logId` — Retry failed email dispatch.
- `POST /api/emails/test-smtp` — Verify SMTP credentials with an instant test message.

### Post-Event Reports (`/api/reports`)
- `GET /api/reports/:eventId` — Fetch or auto-populate 12-section post-event report.
- `PUT /api/reports/:eventId` — Save draft changes to report sections.
- `POST /api/reports/:eventId/finalize` — Finalize report and lock contents.
- `GET /api/reports/:eventId/pdf` — Stream multi-page executive vector PDF report.

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: v20 or later
- **MongoDB**: Local Community Server (`mongodb://127.0.0.1:27017/eventra`) or MongoDB Atlas URI

### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Configure your `.env` settings:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/eventra
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
CLIENT_URL=http://localhost:5173

# SMTP Email Configuration (Gmail, Brevo, SendGrid, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME="EVENTRA Events"

# Google Gemini AI (Free via Google AI Studio)
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
AI_IMAGE_MODEL=imagen-3.0-generate-002
```

Start the backend API server:
```bash
npm run dev
# Server running at http://localhost:5000
```

### 2. Frontend Setup

Open a second terminal window:
```bash
cd client
npm install
npm run dev
# Vite dev server running at http://localhost:5173
```

---

## 🧪 Testing & Verification

The backend includes a comprehensive automated test suite verifying ticket PDF generation, certificate feedback gating, closure automation, cryptographic token hashing, report analytics, and vector PDF report generation:

```bash
# Run all unit tests
npm test --prefix server
```

Build the frontend client for production:
```bash
npm run build --prefix client
```

---

## 🔒 Security Best Practices

- **Zero Client Credential Exposure**: SMTP credentials, JWT secrets, AI keys, and database URIs reside strictly on the Node.js backend.
- **Cryptographic Feedback Tokens**: Survey links use unguessable 32-byte hexadecimal random values stored as SHA-256 hashes.
- **Anti-Fraud Certificate Gating**: Participants cannot generate certificates without verified QR attendance and survey completion.
- **Prevent Accidental Double-Closure**: The "End Event" endpoint is idempotent and validates that only the verified event owner can trigger closure.
- **Strict Registration Quotas**: Capacity checks and duplicate prevention run atomically against MongoDB.
