# NeuroPlay: Think. Play. Adapt. Survive.

AI-powered multi-game platform. **Status: 30 playable games, accounts + cloud progress, leaderboards, friends, real-time multiplayer rooms, NOVA assistant and a Gemini backend with offline fallbacks.** See `PROGRESS.md` for what was tested.

## What is in the complete website

- **32-game catalogue, 30 playable** across Mystery, Survival, Story, Logic, Creative, AI and Arcade.
- **Progress engine**: XP, levels, coins, streaks, personal bests, history, 13 achievements, daily challenge, adaptive difficulty.
- **Accounts**: signup/login with bcrypt + JWT, guest progress imported once on first sign-in, cloud-synced progress, avatar picker, password change, friend codes.
- **Social**: global and per-game leaderboards, friends by code.
- **Multiplayer**: Socket.IO rooms with 6-character codes and invite links; *The Traitor Among Us* and *Caption Battle*; lobby, ready-up, chat, server-authoritative rounds, results and rematch.
- **AI**: server-side Gemini with Zod validation and authored fallbacks, so every game stays playable with no key and no network.
- **NOVA**: chat assistant that receives only real player stats and the current game; never reveals solutions.
- **Platform**: Express API, optional MongoDB Atlas (falls back to a local JSON store), per-IP rate limits, SPA served by the same server in production.

## Run it (development, two terminals)

**Terminal 1: backend**
```
cd server
npm install
copy .env.example .env      (Mac/Linux: cp .env.example .env)
npm run dev
```
Open `server/.env` and optionally paste a Gemini key after `GEMINI_API_KEY=` (free from https://aistudio.google.com). Without a key every AI game uses authored fallback content. Set `MONGODB_URI` to use MongoDB Atlas, or leave it empty to use `server/.data/db.json`.

**Terminal 2: frontend**
```
cd client
npm install
npm run dev
```
Open http://localhost:5173. Vite proxies `/api` and `/socket.io` to the backend on port 3001.

Check the backend: http://localhost:3001/api/health

## Run the complete site from one server (production mode)

```
cd client && npm run build
cd ../server && npm start
```
Open http://localhost:3001 — Express serves the built React app, the API and multiplayer on the same origin.

## Tests

```
cd client && npm test      # engine: XP, levels, streaks, achievements, daily, adaptive difficulty
cd server && npm test      # Gemini client, trivia bank
```

## Structure

```
client/   React 18 + Vite + Tailwind, game modules in src/games, engine in src/engine
server/   Express + Socket.IO + Zod; auth, progress, AI, rooms, store, fallbacks
docs/     ARCHITECTURE.md, GAME_DEV_GUIDE.md, PLAN.md, DEPLOYMENT.md
```
