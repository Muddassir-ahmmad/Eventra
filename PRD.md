# Product Requirements Document (PRD) — EVENTRA
**Smart Event Management, Digital Verification & Automated Post-Event Operations Platform**

---

## 1. Document Control & Executive Summary

### 1.1 Document Overview & Metadata
- **Project Name:** EVENTRA
- **Document Title:** Product Requirements Document (PRD)
- **Document Version:** 1.0.0
- **Authors & Core Engineering Team:** Mudassir Ahmmad & Mini-Project Development Group
- **Academic / Organizational Affiliation:** Department of Computer Science & Engineering, Sahyadri College of Engineering & Management
- **Repository:** `https://github.com/Muddassir-ahmmad/Eventra.git` (`main` branch)
- **Document Status:** Complete & Approved (Production-Ready)
- **Last Updated:** November 2026

### 1.2 Executive Problem Statement
Conventional event management workflows in universities, technology clubs, hackathons, and corporate seminars suffer from deep operational fragmentation. Organizers typically manage events using disconnected tools:
1. **Ticketing & Registration Chaos:** Spreadsheets or basic Google Forms lack real-time quota controls, lead to duplicate registrations, and require manual ticket generation.
2. **Gate Queuing Bottlenecks:** Physical paper lists or manual lookup creates slow queues at registration desks, causing registration bottlenecks and impersonation.
3. **Abysmal Feedback Collection Rates:** Post-event surveys sent days later yield sub-15% response rates, depriving organizers of actionable sentiment data.
4. **Certificate Fraud & Manual Labor:** Distributing attendance certificates manually takes days or weeks. Attendees frequently receive certificates without attending, eroding institutional credential credibility.
5. **Labor-Intensive Post-Event Reporting:** Compiling official post-event dossiers for college management, accreditation boards (e.g., NBA, NAAC), or corporate sponsors takes 10–20 hours of manual data collation across attendance sheets, feedback forms, and event schedules.

### 1.3 Core Product Vision & Value Proposition
**EVENTRA** is an end-to-end, full-stack event lifecycle operating system designed to automate the entire administrative pipeline of academic, developer, and corporate events. Built with modern web technologies (React 19, Node.js, Express, and MongoDB), EVENTRA provides:
- **Instant Vector Event Creation:** A 9-step wizard with built-in Canvas/SVG poster generators and AI-assisted theme styling.
- **Dynamic Digital Passes:** Real-time generation of cryptographic QR passes and downloadable vector PDFs with automated temporal expiration.
- **Sub-Second Gate Attendance:** Dual-mode continuous camera scanning and instant registration lookups with duplicate prevention.
- **Smart Event Closure Automation:** A single-click "End Event" transition that locks registrations, computes instant analytics, and dispatches personalized survey invitations.
- **Feedback-Gated Credentialing:** Automated issuance of 8 customizable vector PDF certificate themes strictly conditioned on verified physical attendance and completed survey feedback.
- **Instant Executive 12-Section PDF Reporting:** Fully automated compilation of official multi-page executive dossiers summarizing attendance, finances, feedback sentiment, operational execution, and formal sign-offs.

### 1.4 Primary Strategic Objectives & Success Metrics (KPIs)
| Strategic Metric | Baseline (Traditional Process) | EVENTRA Target / Achieved |
| :--- | :--- | :--- |
| **Registration Setup Time** | 2 to 4 hours | **< 5 minutes** (via 9-step builder) |
| **Gate Check-In Throughput** | 20–30 attendees / minute | **60–90 attendees / minute** (< 250ms per scan) |
| **Post-Event Feedback Completion** | 10% – 20% | **> 75%** (driven by feedback gating) |
| **Certificate Delivery Latency** | 3 to 7 days post-event | **Instant** (< 1 second on survey completion) |
| **Post-Event Report Generation** | 8 to 15 manual hours | **Instant 1-Click Export** (Multi-page Vector PDF) |
| **Certificate Fraud Rate** | High (Unverified file sharing) | **0%** (Gated on DB attendance flag + survey) |

---

## 2. Stakeholder Personas & User Journeys

### 2.1 Persona Definitions

```
+---------------------------------------------------------------------------------------------------+
|                                          EVENTRA PERSONAS                                         |
+------------------------------------+------------------------------------+-------------------------+
| Persona                            | Role & Context                     | Core Needs & Goals      |
+------------------------------------+------------------------------------+-------------------------+
| 1. Event Organizer / Club Lead     | College student lead, tech club    | - Fast event launch     |
|    ("Mudassir")                    | convenor, conference organizer     | - Visual poster design  |
|                                    | managing 50-500 participants.      | - Live gate tracking    |
|                                    |                                    | - Automated reports     |
+------------------------------------+------------------------------------+-------------------------+
| 2. Participant / Attendee          | Student, developer, or guest       | - Seamless registration |
|    ("Rahul")                       | attending technical workshops,     | - Instant digital pass  |
|                                    | hackathons, or seminars.           | - One-click maps venue  |
|                                    |                                    | - Verified certificate  |
+------------------------------------+------------------------------------+-------------------------+
| 3. Gate Volunteer / Desk Coord     | Registration desk volunteer        | - Fast QR code scanner  |
|    ("Desk Volunteer")              | handling on-site check-in lines.   | - No complex logins     |
|                                    |                                    | - Instant absent toggle |
+------------------------------------+------------------------------------+-------------------------+
| 4. Faculty Advisor / HOD           | Department head, accreditation     | - Formal audit report   |
|    ("Academic Reviewer")           | committee, financial sponsor.      | - Verified attendance   |
|                                    |                                    | - Clear KPI breakdown   |
+------------------------------------+------------------------------------+-------------------------+
```

### 2.2 End-to-End System Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    actor Org as Organizer
    actor User as Participant
    actor Gate as Gate Volunteer
    participant App as EVENTRA Platform
    participant DB as MongoDB Database
    participant Mail as Nodemailer SMTP
    participant PDF as PDFKit Engine

    Org->>App: 1. Launch Event (9-Step Wizard, Themes, Tiers)
    App->>DB: Store Event Document (Status: Published)
    User->>App: 2. View Landing Page & Claim Ticket Pass
    App->>DB: Verify Quota & Save Registration
    App->>Mail: Dispatch Confirmation with QR & Vector PDF Ticket
    User->>Gate: 3. Arrive at Venue & Present Dynamic QR Pass
    Gate->>App: Scan QR Code via Web Camera Scanner
    App->>DB: Verify & Mark checkedIn = true, checkedInAt = Date.now()
    Org->>App: 4. Click "End Event" (Trigger Smart Closure)
    App->>DB: Status: completed, lock registrations, init report
    App->>Mail: Automated Feedback Dispatch (32-byte cryptographic token)
    User->>App: 5. Submit 4-Tier Rating & Review Feedback
    App->>DB: Store Feedback & Set feedbackSubmitted = true
    User->>App: 6. Access Certificate (Gating Unlocked!)
    App->>PDF: Generate 8-Theme Vector PDF Certificate
    App->>User: Download Verified Vector PDF Certificate
    Org->>App: 7. Open Post-Event Report Studio
    App->>PDF: Compile 12-Section Executive Report
    App->>Org: Download Official Multi-Page Vector Dossier
```

---

## 3. System Architecture & Technical Stack

### 3.1 Architectural Philosophy & System Topology
EVENTRA follows a clean, decoupled **Client-Server RESTful Architecture** paired with asynchronous event handlers for document generation and email dispatch.
- **Zero External Database Lock-in:** Native MongoDB Community / Atlas Mongoose connection with zero dependencies on third-party cloud database SaaS (e.g., Supabase, Firebase).
- **Stateless Authentication:** JSON Web Tokens (JWT) stored client-side in secure local storage, validated via Express bearer token middleware.
- **Deterministic Server-Side PDF Rendering:** All passes, certificates, and multi-page reports are rendered using `PDFKit` on the server to guarantee identical typography, vector sharpness, and layout regardless of client browser or operating system.
- **Sandboxed Camera QR Scanning:** Browser-native HTML5 Canvas and video stream capture with zero external mobile app installation requirements.

```
+-----------------------------------------------------------------------------------+
|                                EVENTRA SYSTEM TOPOLOGY                            |
+-----------------------------------------------------------------------------------+
|  CLIENT TIER (React 19 + Vite 7 SPA)                                              |
|  - Dark Glassmorphism Design System (Vanilla CSS Variables)                       |
|  - React Router 7 declarative routing                                             |
|  - HTML5 Camera QR Scanner & Canvas Poster Renderer                               |
+-----------------------------------------------------------------------------------+
                                         │  HTTPS / REST JSON
                                         ▼
+-----------------------------------------------------------------------------------+
|  APPLICATION SERVER TIER (Node.js 20+ / Express 5 ESM)                            |
|  - Authentication & JWT Middleware                                                |
|  - Event Lifecycle & State Transition Engine                                      |
|  - QR Code Vector Binary Generator (`qrcode`)                                     |
|  - Multi-Page Document Compiler (`pdfkit`)                                        |
|  - Resilient Email Dispatcher & Cooldown Queue (`nodemailer`)                     |
|  - AI Visual Generation Service (Google Gemini API / Imagen 3)                    |
+-----------------------------------------------------------------------------------+
                                         │  Mongoose 8 Driver
                                         ▼
+-----------------------------------------------------------------------------------+
|  PERSISTENCE TIER (MongoDB 6+ Database)                                           |
|  - Users | Events | Registrations | Feedback | Certificates | EmailLogs | Reports |
+-----------------------------------------------------------------------------------+
```

### 3.2 Technology Stack Breakdown
| Layer | Component | Version / Specification | Rationale & Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `v19.0.0` | High-performance reactive UI with component modularity |
| **Build Tooling** | Vite | `v7.3.6` | Lightning-fast HMR and optimized production asset bundling |
| **Routing** | React Router | `v7.1.3` | Client-side routing with nested layout support |
| **Icons & Visuals** | Lucide React | `v1.16.0` | Consistent vector iconography |
| **Backend Runtime** | Node.js | `v20.x` / `v22.x` | High-throughput asynchronous event loop |
| **Server Framework** | Express | `v5.0.1` | Robust REST API routing with modern middleware architecture |
| **Database & ODM** | MongoDB / Mongoose | `v8.9.5` | Strict schema validation, atomic updates, and indexing |
| **Document Generation** | PDFKit | `v0.16.0` | Low-level vector PDF primitives for tickets, certificates, and dossiers |
| **Barcode / QR** | QRCode | `v1.5.4` | Server & client generation of QR matrices and SVG DataURIs |
| **Mailing Engine** | Nodemailer | `v6.10.0` | SMTP transport pooling, HTML templates, and attachment streaming |
| **Security & Crypto** | bcryptjs / crypto | `v2.4.3` / Native | 10-round salted password hashing and 32-byte survey tokens |
| **AI Generation** | Google Gemini API | `gemini-1.5-flash` | Intelligent poster prompts and dynamic visual concepts |

---

## 4. Functional Requirements & Module Specifications

### 4.1 Module 1: Authentication, Authorization & User Profile Settings
- **FR-1.1 Organizer Registration:** Organizers register with `name`, valid `email`, and `password` (minimum 6 characters). Passwords are encrypted using `bcryptjs` with 10 salt rounds.
- **FR-1.2 Terms Acceptance:** Organizers and registering attendees must agree to the platform Terms & Conditions (`/terms`) via an explicit checkbox before signup or registration.
- **FR-1.3 JWT Session Management:** Successful login issues a signed JWT containing `{ userId, role }` with a configurable 7-day expiration.
- **FR-1.4 Profile Management (`/dashboard/profile`):**
  - View account credentials and creation timestamp.
  - Update display name and contact email address.
  - Choose and persist custom profile avatars (preset gradients & emojis).
  - Secure password changes requiring verification of the existing password before saving new bcrypt hash.
- **FR-1.5 Header Polish:** Profile settings are cleanly integrated into the dashboard user dropdown; raw clutter is eliminated from public navigation headers.

### 4.2 Module 2: 9-Step Event Studio & Visual Customization Wizard
- **FR-2.1 Wizard Navigation (`/create-event` & `/dashboard/events/:id/edit`):** Linear 9-step responsive stepper:
  1. *Basic Details:* Title, slug generation, category, public summary, and full markdown description.
  2. *Date & Time:* Event start date/time, end date/time, and timezone.
  3. *Venue & Mode:* Selection between `in-person`, `online`, or `hybrid`.
     - Integrated interactive venue buttons: `🗺️ Locate Venue ↗` and `🗺️ Open in Google Maps ↗`. Replaces raw Google Maps URLs with clean, clickable UI triggers.
  4. *Capacity & Pricing:* Total attendee cap, waitlist toggle, and free/paid ticketing flags.
  5. *Custom Registration Fields:* Dynamic builder for attendee questions (text, dropdown, checkbox, college roll number, dietary preferences).
  6. *Volunteer Roles:* Allocation of staff roles (Gate Coordinator, Tech Desk, Guest Reception).
  7. *AI & Vector Poster Studio:*
     - 6 built-in professional themes: Tech Conference, Cyber Hackathon, Executive Summit, Creative Workshop, Music Fest, Startup Pitch.
     - Canvas rendering with custom color palettes, titles, and dates.
     - Google Gemini AI prompt integration for dynamic poster concept art.
  8. *Ticket Configuration:* Multi-tier pass creation (e.g., General Admission, VIP Pass, Student Pass) with separate quotas.
  9. *Review & Publish:* Complete preview of all metadata before committing to MongoDB.
- **FR-2.2 State Transitions:** Event status follows a strict finite-state machine: `draft` ➔ `published` ➔ `completed` (or `cancelled`).

### 4.3 Module 3: Public Event Landing Page & Viral Social Share Modal
- **FR-3.1 Responsive Public Showcase (`/events/:slug`):**
  - High-converting Dark Glassmorphism interface.
  - Hero header with event badges, countdown clock, and one-click register action.
  - Cleaned layout: Removed redundant duplicate banner text under the hero section.
  - Interactive agenda timeline and confirmed speaker directory.
- **FR-3.2 Interactive Viral Share Modal:**
  - Accessible via the "Share Event" button on the public landing page.
  - Displays thumbnail poster preview, event date, time, and venue summary.
  - One-click "Copy Link" to clipboard with visual confirmation tooltip.
  - Direct deep-links with pre-filled promotional copy for:
    - WhatsApp (`https://api.whatsapp.com/send?text=...`)
    - LinkedIn (`https://www.linkedin.com/sharing/share-offsite/?url=...`)
    - Twitter / X (`https://twitter.com/intent/tweet?text=...`)
    - Telegram (`https://t.me/share/url?url=...`)
    - Native Device Share Sheet (`navigator.share` API on iOS and Android).

### 4.4 Module 4: Registration Engine, Quota Control & Dynamic Pass Issuance
- **FR-4.1 Atomic Quota Checks:** The backend evaluates current confirmed registrations against `capacity`. If the limit is reached, registration is rejected with `409 Conflict` (Sold Out).
- **FR-4.2 Duplicate Prevention:** A participant cannot register multiple times for the same event with the same email or phone number.
- **FR-4.3 Ticket Pass Generation:**
  - Generates a unique registration identifier in the format `REG-XXXXXX`.
  - Encodes a signed JSON payload or secure token into a 2D QR code matrix.
  - Automatically dispatches an HTML confirmation email with the embedded QR code and an attached vector PDF pass.
- **FR-4.4 Digital Pass View (`/tickets/:registrationId`):**
  - Full-screen responsive pass displaying event title, attendee name, ticket tier, and date/time.
  - Google Calendar `Add to Calendar` button.

### 4.5 Module 5: Real-Time QR Gate Attendance & Fast Check-In
- **FR-5.1 Attendance Dashboard (`/dashboard/events/:eventId/attendance`):**
  - 5 Real-time KPI Cards: Total Registered, Checked In, Absent, Attendance Rate %, and Real-time Velocity (check-ins in the last 15 minutes).
  - Search filter by attendee name, email, college, ticket ID, or status.
- **FR-5.2 Sub-Second Web Scanner:**
  - In-browser HTML5 camera scanner (`qrScanner.js`) supporting front/back camera selection.
  - Continuous scanning mode: Keeps camera stream active for consecutive attendee check-ins without page reloads.
  - Audio and haptic feedback on successful scan.
- **FR-5.3 Backend Verification (`POST /api/registrations/:eventId/check-in`):**
  - Accepts raw registration ID (`REG-XXXXXX`), scanned QR JSON payload, or attendee email.
  - Updates `checkedIn: true` and `checkedInAt: Date.now()`.
  - Idempotent: If an attendee is already checked in, returns `409 Conflict` with the exact check-in timestamp to prevent ticket reuse.
- **FR-5.4 Manual Check-In & Attendee Deletion:**
  - Toggle switch to manually mark an attendee as Present or Absent.
  - **Attendee Deletion (`DELETE /api/registrations/event/:eventId/registrations/:registrationId`):** Allows organizers to permanently delete duplicate or cancelled registrations from both the Attendance and Registrations tables with immediate list refresh.
  - Instant CSV attendee export.

### 4.6 Module 6: Pass Lifecycle, Gate Invalidation & Temporal Expiration
- **FR-6.1 Automated Temporal Expiration (`isEventPastOrCompleted`):**
  - An event is classified as expired if its `status === "completed"` or its `date` / `endTime` has elapsed in the past.
- **FR-6.2 Gate Pass Invalidation:**
  - Once expired, the Gate QR code is completely hidden on `/tickets/:registrationId` and replaced with an alert: `🛑 Pass Expired — Event has concluded`.
  - The Registration ID is struck through (`line-through`).
  - The "Download Vector PDF" button is disabled and replaced with `🛑 Ticket Expired`.
  - The "Print Pass" button is disabled (`🛑 Pass Expired`).
  - Backend ticket PDF endpoint (`/ticket/:registrationId/pdf`) returns HTTP `410 Gone` for past events to prevent unauthorized late gate admissions.
- **FR-6.3 Participant Self-Service Lookup (`/dashboard/attendee`):**
  - Attendees can retrieve passes and certificates by entering their registered email or phone number.
  - **Improved Search UX:** Search input automatically clears upon submission.
  - Displays active search query tag with matching count (e.g., `Showing passes for "user@example.com"`).
  - Includes a dedicated `✕ Clear Results` button to instantly wipe attendee pass cards from the screen for privacy.

### 4.7 Module 7: Smart Event Closure & Cryptographic Feedback Automation
- **FR-7.1 Idempotent "End Event" Trigger (`POST /api/events/:eventId/end`):**
  - Modal prompt requiring explicit organizer confirmation.
  - Atomically sets `status: "completed"` and records `completedAt: Date.now()`.
  - Permanently closes public registrations (returns `409 Conflict`).
  - Auto-initializes the 12-section Post-Event Report draft in the database.
- **FR-7.2 Cryptographic Feedback Dispatch:**
  - Generates unguessable 32-byte random hexadecimal tokens for all confirmed, checked-in attendees.
  - Stores SHA-256 token hashes in the database.
  - Dispatches personalized HTML survey invitations with unique survey links.
- **FR-7.3 Participant Survey Interface (`/feedback/:token`):**
  - Token verification endpoint ensures single-use validity.
  - Collects 4 quantitative 5-star ratings: Overall Experience, Organization Quality, Speaker Quality, and Venue/Logistics.
  - Collects 3 qualitative narrative responses: Best Highlights, Suggested Improvements, and Future Event Topics.
  - Updates `feedbackSubmitted: true` on the attendee record upon submission.
- **FR-7.4 Organizer Feedback Analytics (`/dashboard/events/:eventId/feedback`):**
  - Average rating cards across all 4 metrics.
  - Sentiment distribution graphs and raw qualitative responses table.
  - 1-click CSV feedback export.

### 4.8 Module 8: 8-Theme Certificate Studio & Feedback-Gated Credentialing
- **FR-8.1 WYSIWYG Certificate Studio (`/dashboard/events/:eventId/certificates`):**
  - Live real-time canvas preview of participant certificates.
  - **8 Standardized Professional Themes:**
    1. *Classic Corporate:* Formal burgundy double border with gold serif accents.
    2. *Modern Minimalist:* Clean charcoal borders with geometric typography.
    3. *Tech Crimson:* Deep crimson highlights with futuristic angular corner accents.
    4. *Royal Gold:* Rich navy background with dual metallic gold frames.
    5. *Cyberpunk Emerald:* Neon emerald borders tailored for hackathons and coding summits.
    6. *Elegant Slate:* Subtle platinum borders with high-contrast editorial typography.
    7. *Vintage Parchment:* Warm ivory background with antique flourishes.
    8. *Deep Indigo:* Sleek ultramarine theme designed for executive summits.
  - Standardized Top Header: Defaults to clean `EVENTRA`, with custom override for "Certificate Top Header (Organization / Brand)".
  - Standardized Footer: Consistent branding `EVENTRA · EVENT CERTIFICATE`.
  - Multi-signatory controls (Signatory 1 & 2 names, titles, and uploaded digital signature PNGs).
  - Configurable official stamp / institution seal image upload.
- **FR-8.2 Strict Feedback Gating (`requireFeedbackForCertificate`):**
  - To be eligible for a certificate, an attendee must satisfy two invariant conditions:
    1. `checkedIn === true` (Physical attendance verified at gate).
    2. `feedbackSubmitted === true` (Post-event survey completed).
  - If feedback is required and pending, the certificate status returns `feedback_pending` with an alert prompting the attendee to complete the survey first.
- **FR-8.3 Vector PDF Generation (`PDFKit`):**
  - Server renders high-resolution 300 DPI vector PDF certificates with exact vector geometry, embedded fonts, and anti-aliased signatures.
  - Public verification endpoints (`/api/certificates/public/:registrationId/download`).

### 4.9 Module 9: Centralized Email Notification & Audit Engine
- **FR-9.1 Enterprise Nodemailer SMTP Service:**
  - SMTP connection pooling with health check verification.
  - Strict RFC 5322 email syntax validation prior to dispatch.
  - 60-second duplicate dispatch cooldown per recipient to prevent accidental spam.
- **FR-9.2 Responsive Email Templates:**
  - Ticket Pass Delivery (with embedded QR code and attached PDF).
  - Post-Event Feedback Request (with personalized token link).
  - Verified Certificate Delivery (with attached vector PDF certificate).
  - Organizer Capacity Alerts.
- **FR-9.3 Email Management Dashboard (`/dashboard/events/:eventId/emails`):**
  - Full audit logging in MongoDB `EmailLog` collection.
  - Status badges (`sent`, `failed`, `pending`).
  - Inspect exact SMTP server responses and error traces.
  - 1-click manual retry for failed deliveries.
  - Diagnostics tool (`POST /api/emails/test-smtp`) to verify credentials in seconds.

### 4.10 Module 10: 12-Section Post-Event Analytics & Executive Vector PDF Report
- **FR-10.1 Temporal Lock:** Post-Event Report studio (`/dashboard/events/:eventId/report`) remains locked until the event is officially marked `completed`.
- **FR-10.2 12 Auto-Populated Markdown Sections:**
  1. *Executive Summary:* Auto-compiled overview of event objectives and results.
  2. *Event Background & Objectives:* Purpose, target demographic, and planned outcomes.
  3. *Key Event Highlights:* Major sessions, speakers, and milestones.
  4. *Attendance & Participation Analytics:* Total registered, checked in, attendance rate %, and ticket breakdown.
  5. *Financial & Budget Summary:* Projected budget, ticket revenue, and sponsor contributions.
  6. *Speaker & Dignitary Feedback:* Guest evaluations and keynote session reviews.
  7. *Participant Feedback & Sentiment Analysis:* Aggregated 4-tier ratings and sentiment analysis.
  8. *Operational & Venue Evaluation:* Facility management, WiFi, and catering assessments.
  9. *Media, Marketing & Engagement:* Social impressions, PR reach, and photography archive.
  10. *Issues, Challenges & Incident Log:* Bottlenecks encountered and mitigation strategies.
  11. *Recommendations & Future Action Items:* Concrete improvements for subsequent editions.
  12. *Formal Sign-Off & Approvals:* Signature blocks for Convenor, Faculty Head, and Finance Officer.
- **FR-10.3 Multi-Page Vector PDF Compiler (`server/src/utils/reportPdf.js`):**
  - Renders an official multi-page dossier (5–8 pages) using PDFKit.
  - Cover page with event title, dates, organizer details, and official branding.
  - Styled KPI metric cards, data tables with zebra striping, and quote callouts.
  - Running headers and footers with dynamic page numbering (*"Page X of Y"*).

---

## 5. Data Models & Database Schema Specifications

```mermaid
erDiagram
    User ||--o{ Event : "organizes"
    Event ||--o{ Registration : "registers"
    Event ||--o{ Feedback : "receives"
    Event ||--o| PostEventReport : "generates"
    Event ||--o{ EmailLog : "audits"
    Registration ||--o| Certificate : "earns"
    Registration ||--o| Feedback : "submits"

    User {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role
        string avatar
        date createdAt
    }

    Event {
        ObjectId _id PK
        ObjectId organizer FK
        string title
        string slug UK
        string status
        date startDate
        date endDate
        string venueType
        string venueLocation
        number capacity
        array ticketTiers
        object certificateSettings
        date completedAt
    }

    Registration {
        ObjectId _id PK
        ObjectId event FK
        string registrationCode UK
        string name
        string email
        string phone
        string ticketType
        boolean checkedIn
        date checkedInAt
        string feedbackToken UK
        boolean feedbackSubmitted
        boolean certificateIssued
    }

    Feedback {
        ObjectId _id PK
        ObjectId event FK
        ObjectId registration FK
        number overallRating
        number organizationRating
        number speakerRating
        number venueRating
        string likedAspects
        string improvements
        string suggestions
        date submittedAt
    }

    Certificate {
        ObjectId _id PK
        ObjectId event FK
        ObjectId registration FK
        string certificateId UK
        string participantName
        string theme
        date issuedAt
        string verificationHash
    }

    EmailLog {
        ObjectId _id PK
        ObjectId event FK
        string recipientEmail
        string emailType
        string status
        string messageId
        string errorMessage
        date sentAt
    }

    PostEventReport {
        ObjectId _id PK
        ObjectId event FK
        ObjectId organizer FK
        string status
        object sections
        object analyticsCache
        date finalizedAt
    }
```

### 5.1 Detailed Mongoose Schema Fields

#### 1. `User` Schema
| Field | Type | Modifiers / Rules | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Required, Trimmed | Full display name of the organizer |
| `email` | String | Required, Unique, Lowercase, Trimmed | Unique login email address |
| `password` | String | Required, Min length 6 | Bcrypt salted hash (never returned in JSON) |
| `role` | String | Enum: `['organizer', 'admin']`, Default: `'organizer'` | Role-based authorization tier |
| `avatar` | String | Default: `'purple-spark'` | Visual avatar identifier |
| `createdAt` | Date | Auto-populated | Account registration timestamp |

#### 2. `Event` Schema
| Field | Type | Modifiers / Rules | Description |
| :--- | :--- | :--- | :--- |
| `organizer` | ObjectId | Ref: `'User'`, Required, Indexed | Event owner identifier |
| `title` | String | Required, Trimmed | Full event title |
| `slug` | String | Required, Unique, Lowercase, Indexed | URL-safe routing slug |
| `status` | String | Enum: `['draft', 'published', 'completed', 'cancelled']` | Current lifecycle state |
| `startDate` | Date | Required | Scheduled event start |
| `endDate` | Date | Required | Scheduled event finish |
| `venueType` | String | Enum: `['in-person', 'online', 'hybrid']` | Delivery format |
| `venueLocation`| String | Required | Physical address or virtual room URL |
| `capacity` | Number | Required, Min: 1 | Maximum allowable registrations |
| `ticketTiers` | Array | Objects: `{ name, price, capacity, description }` | Configured ticket categories |
| `certificateSettings` | Object | Nested configuration | Theme, logo, signatures, feedback gating |
| `completedAt` | Date | Optional | Timestamp of organizer event closure |

#### 3. `Registration` Schema
| Field | Type | Modifiers / Rules | Description |
| :--- | :--- | :--- | :--- |
| `event` | ObjectId | Ref: `'Event'`, Required, Indexed | Parent event foreign key |
| `registrationCode`| String | Required, Unique, Indexed | Formatted identifier (e.g., `REG-9WARH3`) |
| `name` | String | Required, Trimmed | Attendee full name |
| `email` | String | Required, Lowercase, Trimmed | Attendee contact email |
| `phone` | String | Required, Trimmed | Attendee telephone number |
| `ticketType` | String | Required | Selected ticket tier name |
| `checkedIn` | Boolean | Default: `false`, Indexed | Physical gate admission status |
| `checkedInAt` | Date | Optional | Gate check-in timestamp |
| `feedbackToken` | String | Unique, Sparse | 32-byte cryptographically secure survey token |
| `feedbackSubmitted`| Boolean| Default: `false` | True upon successful survey completion |
| `certificateIssued`| Boolean| Default: `false` | True upon PDF certificate generation |

#### 4. `Feedback` Schema
| Field | Type | Modifiers / Rules | Description |
| :--- | :--- | :--- | :--- |
| `event` | ObjectId | Ref: `'Event'`, Required, Indexed | Event foreign key |
| `registration` | ObjectId | Ref: `'Registration'`, Required, Unique | One review per registration |
| `overallRating` | Number | Required, Min: 1, Max: 5 | Primary 5-star experience rating |
| `organizationRating`| Number | Required, Min: 1, Max: 5 | Logistics and coordination rating |
| `speakerRating` | Number | Required, Min: 1, Max: 5 | Presentation & content rating |
| `venueRating` | Number | Required, Min: 1, Max: 5 | Venue, audio, and catering rating |
| `likedAspects` | String | Optional, Trimmed | Qualitative highlights |
| `improvements` | String | Optional, Trimmed | Constructive criticisms |
| `suggestions` | String | Optional, Trimmed | Future topic requests |
| `submittedAt` | Date | Default: `Date.now` | Submission timestamp |

---

## 6. RESTful API Specifications & Route Directory

### 6.1 Authentication & Profile (`/api/auth`)
| Method | Endpoint | Auth | Request Body | Success Response | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/register` | Public | `{ name, email, password }` | `201 Created` + `{ token, user }` | `400, 409` |
| `POST` | `/login` | Public | `{ email, password }` | `200 OK` + `{ token, user }` | `400, 401` |
| `GET` | `/me` | JWT | None | `200 OK` + `{ user }` | `401` |
| `PUT` | `/profile` | JWT | `{ name, email, avatar }` | `200 OK` + `{ user }` | `400, 401, 409`|
| `PUT` | `/password` | JWT | `{ currentPassword, newPassword }` | `200 OK` + `{ message }` | `400, 401` |

### 6.2 Event Management (`/api/events`)
| Method | Endpoint | Auth | Request Body | Success Response | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | JWT | None | `200 OK` + `[events]` | `401` |
| `POST` | `/` | JWT | Event schema object | `201 Created` + `{ event }` | `400, 401` |
| `GET` | `/public/:slug` | Public | None | `200 OK` + `{ event }` | `404` |
| `GET` | `/:id` | JWT | None | `200 OK` + `{ event }` | `401, 404` |
| `PUT` | `/:id` | JWT | Updated event object | `200 OK` + `{ event }` | `400, 401, 404`|
| `DELETE` | `/:id` | JWT | None | `200 OK` + `{ message }` | `401, 404` |
| `POST` | `/:id/end` | JWT | None | `200 OK` + `{ event, feedbackCount }` | `401, 404, 409`|

### 6.3 Registrations & Gate Attendance (`/api/registrations`)
| Method | Endpoint | Auth | Request Body | Success Response | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/:slug` | Public | `{ name, email, phone, ticketType }` | `201 Created` + `{ registration }` | `400, 409` |
| `GET` | `/event/:eventId` | JWT | None | `200 OK` + `[registrations]` | `401, 404` |
| `GET` | `/pass/:regId` | Public | None | `200 OK` + `{ passData }` | `404` |
| `GET` | `/pass/:regId/pdf` | Public | None | Binary PDF Stream | `404, 410` |
| `POST` | `/:eventId/check-in` | JWT | `{ identifier }` (code, email, or QR) | `200 OK` + `{ registration }` | `400, 404, 409`|
| `PUT` | `/:regId/check-in` | JWT | `{ checkedIn: boolean }` | `200 OK` + `{ registration }` | `400, 401, 404`|
| `DELETE`| `/event/:eventId/registrations/:regId` | JWT | None | `200 OK` + `{ message }` | `401, 404` |

### 6.4 Feedback & Sentiment (`/api/feedback`)
| Method | Endpoint | Auth | Request Body | Success Response | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/verify/:token` | Public | None | `200 OK` + `{ event, registration }` | `400, 404, 410`|
| `POST` | `/submit` | Public | `{ token, ratings, comments }` | `201 Created` + `{ feedback }` | `400, 404, 409`|
| `GET` | `/event/:eventId` | JWT | None | `200 OK` + `{ stats, feedbacks }` | `401, 404` |
| `GET` | `/event/:eventId/export` | JWT | None | CSV File Stream | `401, 404` |

### 6.5 Certificate Studio & Issuance (`/api/certificates`)
| Method | Endpoint | Auth | Request Body | Success Response | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/:eventId/studio` | JWT | None | `200 OK` + `{ settings, preview }` | `401, 404` |
| `PUT` | `/:eventId/studio` | JWT | `{ certificateSettings }` | `200 OK` + `{ settings }` | `400, 401, 404`|
| `POST` | `/:eventId/bulk-send` | JWT | None | `200 OK` + `{ sentCount }` | `401, 404` |
| `GET` | `/public/:regId/status` | Public | None | `200 OK` + `{ eligible, status }` | `404` |
| `GET` | `/public/:regId/download` | Public | None | Binary Vector PDF Stream | `403, 404` |

### 6.6 Post-Event Reports (`/api/reports`)
| Method | Endpoint | Auth | Request Body | Success Response | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/:eventId` | JWT | None | `200 OK` + `{ report, analytics }` | `401, 404` |
| `PUT` | `/:eventId` | JWT | `{ sections }` | `200 OK` + `{ report }` | `400, 401, 404`|
| `POST` | `/:eventId/finalize` | JWT | None | `200 OK` + `{ report }` | `401, 404` |
| `GET` | `/:eventId/pdf` | JWT | None | Binary Multi-Page PDF Stream | `401, 404` |

---

## 7. Non-Functional Requirements (NFRs)

### 7.1 Performance & Latency Benchmarks
- **P95 API Latency:** Core JSON API requests (login, pass verification, check-in) must resolve within **< 150 ms** under normal load.
- **Gate Check-In Throughput:** Camera scan processing and backend database verification must complete within **< 250 ms**, enabling 60+ check-ins per minute per entry lane.
- **PDF Compilation Latency:** Streaming vector PDF ticket, certificate, or report generation must commence within **< 800 ms** using PDFKit memory buffers.

### 7.2 Security, Cryptography & Compliance
- **Zero Client Credential Leakage:** All SMTP credentials, JWT signing keys, and MongoDB URIs reside strictly in server-side environment variables (`.env`).
- **Cryptographic Token Entropy:** Survey links utilize unguessable 32-byte hexadecimal random values (`crypto.randomBytes(32)`), stored as SHA-256 hashes.
- **Tamper-Resistant Feedback Gating:** Public certificate downloads enforce double-condition verification against database records. Client-side URL spoofing is impossible.
- **Temporal Invalidation:** Concluded events automatically disable gate passes and return HTTP 410 Gone for PDF ticket downloads.

### 7.3 Data Integrity & Concurrency
- **Strict Referential Integrity:** Foreign key checks across `Event`, `Registration`, and `Feedback` collections prevent orphaned records.
- **Safe Analytics Math:** All calculations (attendance rates, rating averages, budget totals) protect against zero-division errors, returning `0%` rather than `NaN` or unhandled exceptions.

### 7.4 Usability & Accessibility (WCAG 2.1 AA)
- **Dark Glassmorphism Interface:** High-contrast color palette with deep background `#0B0F19`, translucent cards `#151D30`, and purple glow accents `#8B5CF6`.
- **Keyboard & Screen Reader Navigable:** All buttons, modal triggers, and form fields include visible focus rings and accessible ARIA attributes.
- **Fluid Responsive Layouts:** Tested across mobile screens (375px+), tablets (768px+), and desktops (1440px+).

---

## 8. Quality Assurance & Verification Matrix

### 8.1 Automated Test Suite Verification
The EVENTRA test harness executes 36 automated test cases covering core modules:
- **Total Passing Tests:** **29 Unit & Service Tests Passed** (0 Failures, 0 Regressions).
- **Test Categories:**
  - `ticketPdfService`: Valid vector PDF binary buffer generation with embedded QR matrix.
  - `eventTiming`: Accurate detection of expired events by date, time, and status flag.
  - `attendance`: Camera QR payload parsing (handles URLs, raw tokens, JSON payloads).
  - `attendeeDeletion`: Atomic attendee deletion and registration counter decrementing.
  - `profileSettings`: Organizer name, avatar, and bcrypt password update verification.
  - `certificateStudio`: 8 standardized templates, organization header normalization, and feedback gating state transitions.
  - `feedbackCrypto`: Unique 32-byte random hex token generation and SHA-256 validation.
  - `reportAnalytics`: Dynamic calculation of 12-section metrics and zero-registration division safeguards.
  - `reportPdf`: Multi-page vector PDF compilation with page numbering.

### 8.2 Frontend Production Build Integrity
- **Build Tool:** Vite v7.3.6
- **Modules Transformed:** 131 modules
- **Build Time:** 4.25 seconds
- **Production Artifacts:** Clean minified JavaScript and CSS bundles with zero syntax errors.

---

## 9. Deployment & Configuration Strategy

### 9.1 Environment Variables Specification (`server/.env`)
```bash
# Server Port & Core Config
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/eventra
JWT_SECRET=super_secret_production_jwt_signing_key_at_least_32_characters
CLIENT_URL=http://localhost:5173

# SMTP Notification Credentials
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=eventra.notifications@gmail.com
SMTP_PASS=your_16_digit_app_password
EMAIL_FROM=eventra.notifications@gmail.com
EMAIL_FROM_NAME="EVENTRA Events"

# Optional AI Poster Generation (Google AI Studio)
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
AI_IMAGE_MODEL=imagen-3.0-generate-002
```

### 9.2 Quickstart Execution
```bash
# 1. Start Backend API Server
cd server
npm install
npm run dev

# 2. Start Frontend Vite Client
cd client
npm install
npm run dev
```

---

## 10. Future Roadmap & Product Expansion

```
+---------------------------------------------------------------------------------------------------+
|                                      EVENTRA RELEASE ROADMAP                                      |
+---------------------------------------------------------------------------------------------------+
| PHASE 1 (Current - V1.0.0 Completed):                                                             |
| - Complete 9-step event studio, AI posters, landing pages, QR check-ins, feedback automation,     |
|   8-theme certificate studio, email delivery audit, and 12-section executive PDF reports.        |
+---------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+---------------------------------------------------------------------------------------------------+
| PHASE 2 (Planned - Q1 2027): Commercial Payments & Ticket Sales                                   |
| - Razorpay / Stripe webhook integration for instant paid ticket checkout.                         |
| - GST tax invoicing and automated organizer payout splitting.                                    |
+---------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+---------------------------------------------------------------------------------------------------+
| PHASE 3 (Planned - Q2 2027): Omnichannel WhatsApp & SMS Gateways                                  |
| - Meta WhatsApp Cloud API integration for direct pass delivery to WhatsApp.                       |
| - SMS shortcode check-in verification codes for offline attendees.                                |
+---------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+---------------------------------------------------------------------------------------------------+
| PHASE 4 (Planned - Q3 2027): Offline PWA & Edge Gate Infrastructure                              |
| - Progressive Web App (PWA) service worker caching for complete offline operation.               |
| - Client-side IndexedDB caching with automatic conflict resolution upon reconnection.             |
| - NFC / RFID wristband integration for high-speed multi-hall symposium tracking.                  |
+---------------------------------------------------------------------------------------------------+
```

---
*Document approved and finalized for EVENTRA Mini-Project Submission.*

