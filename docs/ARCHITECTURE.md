# NeuroPlay Architecture and Roadmap

## 1. Requirements analysis (summary)

NeuroPlay = 20 distinct games + accounts + progression + social + multiplayer + an AI companion (NOVA). Five non-negotiables run through every prompt:

1. **The server is the referee.** AI writes content (stories, clues, puzzles). Backend code owns scores, XP, coins, timers, answers, rewards, leaderboards.
2. **AI output is untrusted input.** Always parsed, schema-validated, consistency-checked, with a fallback.
3. **No fake features, no fake data.** Demo data must be labelled.
4. **Premium dark gaming UI**, responsive, with loading/empty/error/success states.
5. **Phased delivery**, each phase tested before the next.

## 2. Roadmap

| Phase | Name | Delivers |
|---|---|---|
| **1** | Setup + UI foundation (current) | Client project, design system, landing page, navigation, 20-game library (static catalogue) |
| 2 | Auth + backend base | Express, MongoDB, JWT, bcrypt, Zod, register/login/logout/profile, protected routes |
| 3 | App shell pages | Dashboard, Profile, Settings, Notifications, Achievements shells reading real data |
| 4 | Game engine core | Sessions, timers, scoring, XP/levels/coins, reward ledger, idempotency |
| 5 | AI layer | Gemini client, schemas, services, fallbacks, rate limits |
| 6 | First 5 games | Mind Games, Code Breaker, Memory Matrix, Escape Room, Detective Mode |
| 7 | Remaining 15 games | Batches of 3-4 |
| 8 | Social | Friends, search, leaderboards (global/weekly/friends/per-game) |
| 9 | Multiplayer | Socket.IO rooms, codes, invite links, QR, ready/start/rematch, reconnect |
| 10 | NOVA + adaptivity | Chat, hints, skill profile, recommendations, daily challenges, events |
| 11 | Audit + deploy | Full QA, security review, performance, docs, deployment |

## 3. Folder structure

```
neuroplay/
  README.md  PROGRESS.md
  docs/                    PLAN.md  ARCHITECTURE.md  DEPLOYMENT.md
  client/                  React + Vite + Tailwind   (Phase 1: built)
    src/
      app/                 router, providers (Toast; later Auth, Socket)
      layouts/             MainLayout (later AppLayout, GameLayout)
      pages/               Landing, GameLibrary, GameDetail, ComingSoon, NotFound
      components/
        ui/                Button, Badge, Toast, EmptyState, Chip
        brand/             Logo, NeuralBackground, NovaOrb
        layout/            Navbar, Footer
        game/              GameCard, GameArt
      data/                games.js (catalogue), categories
      hooks/               useFavorites (later useAuth, useApi, useSocket)
      services/            (Phase 2: api client)
      utils/               cn.js
  server/                  Express API                (Phase 2+)
    src/
      config/ models/ controllers/ routes/ middleware/
      engine/              session, timer, scoring, rewards, difficulty
      games/<slug>/        rules + validators + AI prompt per game
      ai/                  geminiClient, schemas/, services/, fallbacks/
      sockets/             rooms, presence
      utils/
```

Tech decisions: **Tailwind v3** (stable, widely documented), **React Router v6**, plain JavaScript (simpler for a student project; Zod gives runtime validation on the server), npm workspaces not used (two separate folders are easier to deploy).

## 4. Dependencies

**Software you need:** Node.js 20 or newer (includes npm), Git, VS Code (recommended), a modern browser. Later: a MongoDB Atlas account and a Google AI Studio (Gemini) API key.

**Client (Phase 1):** react, react-dom, react-router-dom, framer-motion, lucide-react, @fontsource-variable/{inter,space-grotesk,jetbrains-mono}; dev: vite, @vitejs/plugin-react, tailwindcss@3, postcss, autoprefixer.
**Later client:** recharts, socket.io-client, zod (forms).
**Server (Phase 2+):** express, mongoose, jsonwebtoken, bcryptjs, zod, cors, helmet, express-rate-limit, express-mongo-sanitize (or equivalent), dotenv, @google/generative-ai, socket.io, qrcode (QR is generated server-side or client-side with `qrcode`).

## 5. Database models and API

**Models:** User (username, email, passwordHash, avatar, xp, level, coins, streak, lastLoginDate, settings, favorites) · GameSession (user, game, difficulty, seed/contentId, state, startedAt, deadline, actions[], score, status, rewardGranted) · GeneratedContent (game, difficulty, payload, **solution (server-only)**, source: ai|fallback, hash) · RewardLedger (user, type, amount, reason, sessionId, **unique idempotency key**) · Achievement + UserAchievement · Quest + UserQuest · Friendship (requester, recipient, status) · Room (code, host, game, players[{user, ready, connected}], status, state) · Notification · ShopItem + Inventory · NovaConversation · SkillSnapshot (logic, memory, creativity, strategy, speed - computed from sessions) · Event.

**API (all under `/api`, JSON):**
- `auth`: POST register, login, logout, forgot-password, reset-password; GET me
- `users`: GET :username, PATCH me, GET search?q=
- `games`: GET / (catalogue), GET :slug
- `sessions`: POST start `{game, difficulty}` → sessionId + sanitized content; POST :id/action; POST :id/hint; POST :id/submit; GET :id; GET history
- `progress`: GET summary, POST daily-reward/claim, GET ledger
- `quests`, `achievements`: GET list, GET mine
- `friends`: GET, POST request, POST :id/accept, DELETE :id
- `leaderboards`: GET global|weekly|friends|game/:slug
- `rooms`: POST create, POST join `{code}`, GET :code; realtime events via Socket.IO (`room:join`, `room:ready`, `room:start`, `game:action`, `room:rematch`)
- `nova`: POST chat, POST hint, POST challenge, GET recommendations, GET analysis/:sessionId
- `notifications`: GET, POST read

## 6. Building 20 games without duplicating code

Every game is a **module** with the same contract, and shared systems do the heavy lifting.

Server contract (`server/src/games/<slug>/index.js`):
```
meta, difficultyConfig,
generate(ctx)        -> asks the AI service for content, validated by a Zod schema + consistency check
publicView(content)  -> content with the solution stripped
applyAction(state, action) -> pure function, returns new state or a rejection
isComplete(state), computeRawResult(state) -> {correct, timeUsed, hintsUsed, ...}
```
Shared engine (written once): session lifecycle, timers, hint ledger, score formula (base x difficulty x speed x hint penalty), XP/coin conversion, reward idempotency, history.

Client contract (`client/src/games/<slug>/`): one `Game.jsx` receiving `{view, send(action), state}` and rendering only. Shared client pieces: `TimerBar`, `HintButton`, `InstructionsPanel`, `ResultsScreen`, `useGameSession`.

Reuse by **mechanic families** (shared primitives, different content/rules):
- *Deduction* (Detective, Interrogation, Traitor): suspects, evidence, statements, accusation check.
- *Spatial/puzzle chain* (Escape Room, Treasure Hunt, Dream Maze, Two Doors): nodes + locks + clue graph.
- *Branching state* (Story Quest, Survival, Time Loop): state machine with resource and memory tracking.
- *Pattern/logic* (Mind Games, Code Breaker, Memory Matrix, Who Am I, Alien Decoder): generator + deterministic validator.
- *Judged creativity* (Caption Battle, Surprise Box, Potion Master): fixed rubric scored by code where possible, AI only explains.
- *Arcade/quick* (Stair Jump, One Minute Challenge): client-timed input streams validated server-side by plausibility rules.

## 7. How the systems connect

```
Player action ──► Game page (client) ──► POST /sessions/:id/action
                                              │
          requireAuth + rateLimit + Zod ◄─────┘
                                              ▼
                              Game module applyAction (pure)
                                              ▼
              Engine: timer check, score, hint penalty ──► GameSession (DB)
                                              ▼ on submit
        Rewards service: compute XP/coins from score & difficulty & active Event
           ──► RewardLedger (unique key = sessionId) ──► User.xp/coins/level
           ──► Achievement + Quest evaluators ──► Notifications
           ──► SkillSnapshot updater (from real session data)
```
- **Authentication** issues a JWT; every API call and every socket connection verifies it. User identity always comes from the token, never the request body.
- **NOVA** is a server service: it receives the user's id, the current session (if any), and the player's SkillSnapshot, builds a prompt that *excludes* the solution when giving hints, and returns validated text. NOVA can *suggest*, never *grant*.
- **Progression** reads only the RewardLedger; the client can display but never write XP, coins, or levels.
- **Multiplayer**: a Room owns a shared GameSession. The Socket.IO server validates membership from the JWT, applies actions through the same game module, and broadcasts the resulting public state. Reconnects restore state from the DB session. Rewards use the same idempotent ledger per player.
- **Leaderboards** are aggregations over finished sessions (never client-reported numbers).
