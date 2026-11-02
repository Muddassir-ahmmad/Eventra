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

Certificate settings belong to the existing MongoDB event and can be edited in the event's Certificate Studio while the event is a draft, published, or closed. The event builder saves the certificate theme and wording with the draft; the dedicated studio manages the live preview, optional organization logo, signatories, attendance eligibility, PDF generation, and email delivery.

Certificate eligibility uses the existing confirmed registration and its `checkedIn` QR attendance flag. Cancelled and absent participants are excluded; the certificate API does not infer attendance or create participant records. Generated PDF data and certificate metadata are stored with MongoDB. In local development, image uploads use Multer and are served from `server/uploads`. Production uploads require Cloudinary so temporary Vercel files are never treated as persistent URLs.

Configure these values in `server/.env` for production image uploads and optional integrations:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

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

Cloudinary credentials, AI keys, and email credentials must never be added to client environment variables. Uploads are limited to PNG/JPEG images of 5 MB or less. AI suggestions are available only when `AI_API_KEY` is configured; SMTP delivery is available only when `SMTP_HOST` and `EMAIL_FROM` are configured. The existing MongoDB event and registration collections remain the source of truth.
