# NeuroPlay Deployment Guide

## Recommended setup: one Render web service

The Express server already serves the built client, so the simplest production deployment is a single service:

| Part | Host | Why |
|---|---|---|
| Frontend + API + Socket.IO | Render or Railway (Node web service) | One origin means no CORS or proxy issues; WebSockets need a persistent process |
| Database | MongoDB Atlas M0 (free) | Persistent progress; without it Render's disk is ephemeral |
| AI | Gemini API | Key lives only in backend environment variables |

Free-tier note: Render's free web service sleeps after inactivity, so the first request can take 30–60s. Ping it before a demo.

## Steps

### 1. MongoDB Atlas (required in production)
1. Create a free M0 cluster.
2. Database Access: create a user with a strong password.
3. Network Access: allow `0.0.0.0/0` (hosts use dynamic IPs; password + TLS protect it).
4. Copy the connection string into `MONGODB_URI`.

### 2. Gemini API key
Create a key in Google AI Studio. It goes **only** into backend environment variables, never into the client or git.

### 3. Deploy the service
- New Web Service → connect the repo.
- Root directory: repository root (the build needs both `client` and `server`).
- Build command:
  ```
  cd client && npm install && npm run build && cd ../server && npm install
  ```
- Start command:
  ```
  cd server && npm start
  ```
- Health check path: `/api/health`
- Environment variables:
  ```
  NODE_ENV=production
  PORT=10000
  MONGODB_URI=<atlas string>
  JWT_SECRET=<long random string, 48+ chars>
  CLIENT_ORIGIN=https://<your-service-domain>
  GEMINI_API_KEY=<key>
  ```
  `CLIENT_ORIGIN` may be omitted when the UI and API share one domain (the default allows same-origin requests).

Generate a secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 4. Alternative: split frontend and backend
- **Backend (Render)**: root `server`, build `npm install`, start `npm start`, health `/api/health`, set `CLIENT_ORIGIN=https://<frontend-domain>`.
- **Frontend (Vercel/Netlify)**: root `client`, build `npm run build`, output `dist`.
  - Set `VITE_API_URL=https://<backend-domain>` (no `/api` suffix).
  - Add a SPA rewrite: all paths → `/index.html`.
- Socket.IO connects to `VITE_API_URL` automatically (`src/api.js`); verify the backend CORS allows the frontend origin.

## Production checklist

- [ ] `.env` files are git-ignored; `.env.example` committed with no real values
- [ ] `JWT_SECRET` is unique to production
- [ ] Atlas user has least privilege (readWrite on the NeuroPlay database only)
- [ ] `/api/health` returns OK (`store: mongo`, `gemini: configured`)
- [ ] Register, finish a game, and confirm XP/history persist after a restart
- [ ] Two browsers join the same room by code/invite link
- [ ] Gemini failure mode tested (remove the key temporarily and confirm fallback content)
- [ ] Rate limits are appropriate for the expected demo traffic

## Scaling note
A single backend instance keeps room state in memory. If you run more than one instance, add the Socket.IO Redis adapter and move room state to Redis. Out of scope for this project's demo.
