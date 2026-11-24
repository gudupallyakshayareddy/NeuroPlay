# NeuroPlay: Phase 0 Plan (Design + Architecture)

*Think. Play. Adapt. Survive.*

## 1. UI design direction

**Concept: "The Neural Arcade."** The platform is a dark observatory floating in a deep-space neural network. Every game is a "node" in that network, and NOVA is the glowing core that connects them. The product should feel like a game launcher (think Steam Deck UI meets Linear), not a SaaS dashboard.

Principles:
- **Depth over decoration.** Layers: void background → faint animated constellation/grid → navy panels → glass cards → glowing focus states. Glow is reserved for *interactive or important* things (primary CTA, active nav, level-up, NOVA). Nothing glows just for style.
- **One hero per screen.** Each page has one dominant focal element (hero visual, XP ring, game artwork, NOVA orb). Everything else is quiet.
- **Each game has its own identity.** Cards use a per-game generated SVG artwork and a per-category accent (see color system), so the library never reads as 20 identical tiles.
- **Motion with purpose.** Page transitions (fade + 8px rise, 250ms), card hover (lift 4px + border glow), XP bar fill, number count-ups, NOVA "thinking" pulse. All motion honours `prefers-reduced-motion`.
- **Honest data.** No fake leaderboards or stats. Empty states are designed ("No games played yet: start with Mind Games"). Any demo data is badged **DEMO**.

## 2. Page structure (16 pages)

| # | Page | Route | Auth | Hero element |
|---|------|-------|------|--------------|
| 1 | Landing | `/` | public | Animated neural-node hero + 3D-ish floating game cards |
| 2 | Login | `/login` | public | Split layout, glass form, NOVA orb |
| 3 | Register | `/register` | public | Same shell, avatar picker step |
| 4 | Dashboard | `/app` | yes | Level ring + XP bar, "Continue playing" |
| 5 | Game Library | `/app/games` | yes | Filterable grid with artwork cards |
| 6 | Game Page | `/app/games/:slug` | yes | Instructions → play surface → results |
| 7 | Profile | `/app/profile/:username` | yes | Skill radar (Recharts) from real history |
| 8 | Leaderboards | `/app/leaderboards` | yes | Tabs: global / weekly / friends / per-game |
| 9 | Achievements | `/app/achievements` | yes | Badge grid, locked/unlocked states |
| 10 | Friends | `/app/friends` | yes | Friends, requests, player search |
| 11 | Challenges | `/app/challenges` | yes | Daily / weekly / AI-generated / friend challenges |
| 12 | Multiplayer Lobby | `/app/lobby` | yes | Create room / join by code / scan QR |
| 13 | Game Room | `/app/room/:code` | yes | Players, ready states, invite link + QR, host controls |
| 14 | NOVA | `/app/nova` | yes | Chat + side panel (modes, context, history) |
| 15 | Settings | `/app/settings` | yes | Theme, sound, accessibility, account |
| 16 | Notifications | `/app/notifications` | yes | Grouped, mark read, deep links |

Extra utility screens: 404, session-expired, forgot-password.

## 3. Component structure

```
client/src/
  app/            router.jsx, providers (Auth, Theme, Socket, Toast)
  layouts/        PublicLayout, AppLayout (sidebar + topbar + mobile bottom nav), AuthLayout, GameLayout
  pages/          one folder per page above
  components/
    ui/           Button, IconButton, Card (glass), Badge, Chip, Input, Select, Tabs, Modal, Drawer,
                  Tooltip, ProgressBar, Ring, Skeleton, Spinner, Toast, EmptyState, ErrorState, Avatar
    brand/        Logo, NovaOrb, NeuralBackground (canvas, throttled), GlowBorder
    game/         GameCard, GameArt (per-game SVG), GameFilters, InstructionsPanel, TimerBar, ScoreBoard,
                  HintButton, ResultsScreen
    dashboard/    LevelRing, XpBar, StreakFlame, QuestList, EventBanner, QuickInvite
    social/       FriendRow, RequestCard, PlayerSearch, LeaderboardTable, InviteQR, RoomPlayerList
    nova/         ChatThread, MessageBubble, SuggestionChips, ModeSwitch, HistoryList, ThinkingIndicator
  games/          one module per game: index.js (meta), Game.jsx, reducer/rules view, art.jsx
  hooks/          useAuth, useApi, useGameSession, useTimer, useSocket, useDebounce, useReducedMotion
  services/       api client (fetch wrapper, token handling, error normalisation), socket client
  styles/         tokens.css, tailwind.css
  utils/          format, a11y helpers
```

Rule: pages compose; components never fetch directly (hooks/services do); every async component supports loading, empty, error and success states.

## 4. Color system

Defined as CSS variables, mapped into the Tailwind theme (so dark/light themes swap by variable only).

**Dark (default)**
| Token | Value | Use |
|---|---|---|
| `--bg-void` | `#05060F` | page background |
| `--bg-navy` | `#0A0E1F` | app shell |
| `--panel` | `#0F1530` | panels |
| `--glass` | `rgba(20,27,58,0.55)` + 12px blur | cards |
| `--border` | `rgba(139,148,255,0.14)` | hairlines |
| `--border-glow` | `rgba(124,92,255,0.55)` | hover/focus |
| `--violet` | `#7C5CFF` | primary |
| `--violet-soft` | `#A68BFF` | primary text on dark |
| `--cyan` | `#22D3EE` | secondary / NOVA |
| `--text` | `#E8EAFF` | body |
| `--text-dim` | `#9AA3C7` | secondary text |
| `--success` | `#34D399` | success |
| `--warn` | `#FBBF24` | coins, streaks, warnings |
| `--danger` | `#F87171` | errors |

**Category accents** (used on card artwork and chips only, to avoid neon overload):
Mystery `#8B5CF6` · Survival `#F59E0B` · Story `#EC4899` · Logic `#22D3EE` · Creative `#34D399` · Quick `#60A5FA`

**Light theme:** `--bg-void #F4F5FF`, `--panel #FFFFFF`, text `#12163A`, same accents, darkened one step for 4.5:1 contrast.

Contrast target: WCAG AA for all text; focus ring always visible (2px cyan + offset).

## 5. Typography

- **Display:** *Space Grotesk* (headings, numbers, logo wordmark), geometric, techy, distinctive.
- **Body/UI:** *Inter* (variable).
- **Mono:** *JetBrains Mono* (timers, room codes, scores, code-breaker).
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 72 px; display tracking −0.02em; body line-height 1.55.
- Fonts self-hosted (via `@fontsource`) to avoid layout shift and third-party requests.

## 6. Navigation flow

- **Public:** Landing → (Explore Games → Library preview, read-only) or (Create Account → Register → onboarding avatar → Dashboard). Login → Dashboard (or the originally requested page).
- **App shell:** desktop left sidebar (Dashboard, Games, Challenges, Multiplayer, Leaderboards, Friends, Achievements, NOVA); top bar (search, notifications bell, coins/XP chip, avatar menu → Profile / Settings / Logout). Mobile: bottom tab bar (Home, Games, Play-room, NOVA, Me) + drawer for the rest.
- **Play loop:** Library/Dashboard/Challenge → Game page (instructions + difficulty) → Start (server creates session) → Play → Submit (server validates) → Results (score, XP, coins, achievements, NOVA analysis) → Replay / Rematch / Back.
- **Multiplayer loop:** Lobby → Create room (code + link + QR) or Join (code / link / QR scan) → Room (ready up) → Host starts → Live game → Results → Rematch.
- **NOVA** is reachable from the sidebar and as a floating contextual button inside every game (receives the current game + session as context).

---

## Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| 1 | Repo setup, tokens, UI kit, layouts, Landing/Login/Register shells | Builds, responsive, keyboard-accessible |
| 2 | Auth backend (JWT, bcrypt, Zod), user model, protected routes | Register/login/logout tested with real DB |
| 3 | Dashboard, Library, Game page shell, Profile, Settings, Notifications | All states (loading/empty/error) |
| 4 | Core engine: sessions, timers, scoring, XP/coins/levels, rewards ledger | Duplicate/fake submissions rejected (tests) |
| 5 | AI layer (Gemini): services, Zod-validated output, fallbacks, rate limits | Malformed AI output never crashes a game |
| 6 | First game modules: Mind Games, Escape Room, Detective, Code Breaker, Memory Matrix | Playable end-to-end |
| 7 | Remaining games (in batches of 3–4) | Each distinct and tested |
| 8 | Social: friends, search, leaderboards (real DB) | |
| 9 | Multiplayer: Socket.IO rooms, QR, reconnect, rematch | Two-browser test |
| 10 | NOVA chat, skill profile, adaptive difficulty, daily challenges, events | |
| 11 | Full QA/security/performance audit, fixes, deployment docs | Final report |

## Backend architecture (preview)

`server/src/` → `config/`, `models/`, `controllers/`, `routes/`, `middleware/` (auth, validate, rateLimit, error), `engine/` (session, timer, scoring, rewards, difficulty), `games/<slug>/` (rules + validators), `ai/` (gemini client, schemas, services, fallbacks), `sockets/` (rooms, presence), `utils/`.

Models: User, GameSession, RewardLedger (idempotency key per session), Achievement/UserAchievement, Quest/UserQuest, Friendship, Room, Notification, ShopItem/Inventory, NovaConversation, GeneratedContent (cached, validated AI content with solution stored server-side only), SkillSnapshot, Event.

Integrity rule: correct answers and solutions live only on the server; the client receives the puzzle without the solution, and only submits actions.

## AI data flow (preview)

Client → `POST /api/ai/...` → auth + rate limit → service (puzzle/story/…) → prompt builder → Gemini (timeout + retry) → JSON parse → Zod schema + game-specific consistency validator → store with session (solution server-side) → return sanitized content. On any failure → curated fallback pool. AI output never touches score/XP/coin fields; the engine computes those from validated player actions.
