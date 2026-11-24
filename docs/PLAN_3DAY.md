# NeuroPlay: 3-Day Plan (demo-first)

**Rule for the 3 days:** every hour should end with something a judge can click. Shared engine first, then games, then AI, then persistence. No system gets built before a game uses it.

## Hard requirement before Day 1 starts
I can only build and test if the workspace can run `npm install`. Right now it cannot. Pick one:
- **A (recommended):** turn on package installs / network access in your Claude settings and start a new chat. I run, test and fix everything myself.
- **B:** you run each day's code locally and paste back errors. Expect roughly 2x slower; budget extra time.

You will also need: a **Gemini API key** (Google AI Studio, free) and, for Day 3, a free **MongoDB Atlas** cluster.

## Architecture shortcuts that make 3 days possible
1. **One engine, six mechanic families.** Each game is a small module (`meta`, `generate`, `view`, `validate`, `score`) plugged into one shared shell: instructions → play → results (score, XP, level-up, NOVA analysis, replay).
2. **Thin Express server from Day 1** (no DB yet): holds the Gemini key, validates AI JSON with Zod, **keeps solutions server-side**, and computes scores for AI games. Sessions live in memory + a JSON file.
3. **Progress behind one interface** (`progressService`): Day 1-2 backed by the server's JSON file, Day 3 swapped to MongoDB without touching game code.
4. **Fallback content for every AI game** (hand-written set of 3-5 items) so the demo never dies if Gemini is slow or the venue Wi-Fi fails.
5. **Procedural games need no AI** (Memory Matrix, Code Breaker, Stair Jump, One Minute, Two Doors): they validate by code and are the safest demo games.

## Mechanic families (this is how 20 games share code)
| Family | Games | Shared parts |
|---|---|---|
| Procedural logic/reflex | Memory Matrix, Code Breaker, Stair Jump, One Minute Challenge, Two Doors, Mind Games | generator + validator, timer, streak |
| Clue chain / room | Escape Room, Treasure Hunt AI, Dream Maze | node graph, locks, gradual hints |
| Deduction | Detective Mode, Interrogation Master, Who Am I?, The Traitor Among Us | suspects/evidence, fixed secret, question budget, accusation |
| Branching state | Story Quest, Survival Simulator, Time Loop | state machine, resources, memory of choices |
| Combine/decode | Potion Master, Alien Language Decoder, Surprise Box | rule table + validator |
| Judged creative | Caption Battle | fixed rubric scored by code, AI only explains |

## Day 1: Foundation + first playable games
| Block | Output | Done when |
|---|---|---|
| 1 | Verify Phase 1 with the real install, fix issues (this task) | `npm run dev` and `npm run build` pass |
| 2 | App shell: AppLayout, Dashboard (level ring, XP bar, streak, recent, recommended), Profile, Settings (sound/accessibility), Notifications (simple) | Navigable with real local data |
| 3 | Engine core: `useGameSession`, `useTimer`, score formula, XP/level curve, results screen, history | A dummy game can be played and scores |
| 4 | Express skeleton, `/api/health`, Gemini client, Zod schema helper, fallback loader | Health + one AI call work |
| 5 | **6 procedural games playable** (Memory Matrix, Code Breaker, Stair Jump, One Minute, Two Doors, Mind Games) | Each awards XP; dashboard updates |

## Day 2: AI games + NOVA + progression
| Block | Output |
|---|---|
| 1 | Deduction family: Detective Mode, Interrogation Master, Who Am I?, Traitor (single-player vs AI suspects) |
| 2 | Clue-chain family: Escape Room, Treasure Hunt AI, Dream Maze |
| 3 | Branching family: Story Quest, Survival Simulator, Time Loop |
| 4 | Combine/decode + creative: Potion Master, Alien Decoder, Surprise Box, Caption Battle |
| 5 | **NOVA chat** (server-side, knows the current game and the player's real stats; hints never contain the solution) |
| 6 | Achievements (10-15), daily challenge (date-seeded), daily quests, game history, adaptive difficulty from real results |

## Day 3: Persistence, multiplayer, polish, deploy
| Block | Output |
|---|---|
| 1 | Auth: register/login/logout, JWT + bcrypt, protected routes |
| 2 | MongoDB: users, sessions, reward ledger (idempotent), real leaderboards (global/game) |
| 3 | **One multiplayer game** (Caption Battle or Who Am I?): Socket.IO room, code, invite link, QR, ready, start, results |
| 4 | Friends (minimal) only if time remains |
| 5 | QA pass on every game, mobile check, loading/empty/error states, README + deployment (Vercel + Render + Atlas) |

## What gets cut first if time runs out (in this order)
1. Friends system and notifications depth
2. Multiplayer (keep the single-player Traitor version)
3. MongoDB (keep JSON-file persistence, labelled honestly as demo storage)
4. Reward shop and cosmetics
5. Light theme, seasonal events, easter eggs

## Never cut
Playable games, Gemini integration with fallbacks, server-validated answers, NOVA, XP/levels/history, a working demo on a public URL.

## Honest risks
- 20 genuinely different games in ~1.5 days is tight: budget about 35-45 min per game, so family reuse is essential. If behind, ship 14-16 polished games and mark the rest "Coming soon" instead of shipping weak ones.
- Gemini latency and rate limits: mitigated by fallbacks and by pre-generating and caching content.
- Without Day 1 network access, every day slips.
