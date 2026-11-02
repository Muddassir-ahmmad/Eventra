# EVENTRA

Smart Event Management and Registration Platform.

## Phase 1
- Organizer registration/login
- JWT authentication
- Create events
- Generate event slug
- Publish event
- Public event page

## Requirements
- Node.js 20+
- MongoDB (local or MongoDB Atlas)

## Setup

### 1. Backend
```bash
cd server
npm install
copy .env.example .env
npm run dev
```

For macOS/Linux:
```bash
cp .env.example .env
```

Set your MongoDB connection string and JWT secret in `.env`.

### 2. Frontend
Open another terminal:
```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Default API
Backend: http://localhost:5000
Frontend: http://localhost:5173

## Certificates

Certificate eligibility uses the existing confirmed registration and its `checkedIn` attendance flag. The certificate API does not infer attendance or create participant records. Organizers can manage certificates from an event workspace; generated PDFs are stored in a private Supabase Storage bucket and signatures are uploaded from PNG/JPEG files to a public asset bucket for previews.

Configure these values in `server/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
SUPABASE_STORAGE_BUCKET=eventra-assets
SUPABASE_CERTIFICATE_BUCKET=eventra-certificates

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

AI_API_KEY=
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o-mini
```

The service-role key and email credentials must never be added to client environment variables. Storage buckets are created by the server when first needed. AI theme suggestions are shown only when `AI_API_KEY` is configured; SMTP delivery and the test-email action are enabled only when `SMTP_HOST` and `EMAIL_FROM` are configured. The existing MongoDB event and registration store remains the shared source of truth for this branch.
