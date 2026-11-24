# NeuroPlay server

Express API, Socket.IO multiplayer and (in production) the built React client. Holds the Gemini key and all answer keys.

    cp .env.example .env     # optional: GEMINI_API_KEY, MONGODB_URI, JWT_SECRET
    npm install
    npm run dev              # http://localhost:3001
    npm test                 # unit tests (node:test)
    npm start                # production: serves ../client/dist too

Endpoints:

- `GET /api/health`
- `POST /api/nova`
- `GET /api/trivia/topics`, `POST /api/trivia/quiz`, `POST /api/trivia/answer`
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET/PATCH /api/auth/me`, `POST /api/auth/password`
- `POST /api/sessions/start`, `POST /api/sessions/finish`, `GET /api/progress`, `POST /api/progress/import`
- `POST /api/rewards/daily`, `GET /api/leaderboard`, `GET/POST /api/friends`, `DELETE /api/friends/:code`
- `POST /api/ai/story`, `/api/ai/fusion`, `/api/ai/fusion/legendary` (GET), `/api/ai/caption`,
  `/api/ai/human-or-ai/start|answer`, `/api/ai/riddle`, `/api/ai/riddle/answer`,
  `/api/ai/npc`, `/api/ai/interrogate/start|ask|accuse`
- Socket.IO events: `room:create`, `room:join`, `room:ready`, `room:start`, `room:rematch`,
  `room:chat`, `room:leave`, `game:action`; server emits `room:update`, `game:state`,
  `game:private`, `game:round`, `game:results`, `room:chat`, `room:error`.

Storage uses MongoDB when `MONGODB_URI` is set, otherwise the local JSON file `server/.data/db.json`.
