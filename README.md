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
