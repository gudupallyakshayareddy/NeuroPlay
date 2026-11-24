# NeuroPlay Progress Checklist

Legend: [x] done and tested · [~] done, partly tested · [ ] not started

## Phase 3 (current session): complete website
### Delivered and wired
- [x] App integration: `AuthProvider` mounted; routes `/auth`, `/online`, `/online/:code`, `/friends`, `/leaderboard`
- [x] 30 of 32 games registered and lazy-loaded (City Architect and Bounce Lab remain "Coming soon")
- [x] Accounts UI: signup/login, avatar picker, password change, sign out, guest-to-account progress import
- [x] Friends page (friend code, add/remove) and leaderboards (global XP + per-game best)
- [x] Online rooms page: create/join by code, lobby, ready-up, room chat, invite link, host start, results, rematch
- [x] In-room games: The Traitor Among Us (roles, tasks/sabotage, discussion, vote, ejection) and Caption Battle (3 rounds, AI/fallback judging)
- [x] Profile now tells the truth: guest mode vs signed-in cloud sync; account settings
- [x] Production mode: Express serves `client/dist`, the API and Socket.IO on one origin; Vite proxies `/socket.io` in dev
- [x] Copy updated across Landing, Library, Footer, README, server README, DEPLOYMENT

### Verified for real (this session)
- [x] `client npm run build` passes; `client npm test` 11/11; `server npm test` 4/4
- [x] API smoke: health, signup, `/auth/me`, `/sessions/start` + `/sessions/finish`, duplicate claim blocked (404), leaderboard, friends, wrong password (401)
- [x] Browser signup through the UI; navbar reflects the account; no console errors
- [x] All 30 playable games opened, started and rendered without a crash (automated browser pass)
- [x] Memory Matrix loss: server-validated reward (+17 XP, First Steps), results screen and dashboard sync
- [x] Caption Battle with two browser tabs: 3 rounds judged, results, rematch back to lobby
- [x] Traitor Among Us with three socket clients: one traitor assigned, tasks/sabotage, discussion, vote, results
- [x] All AI endpoints return 200 with authored fallbacks (story, fusion, caption, human-or-ai, riddle, npc, interrogate)
- [x] Complete production site loads from http://localhost:3001 with `/api/health` OK

### Bugs found and fixed in Phase 3
1. App crashed at runtime because `AuthProvider` was never mounted; `Navbar` called `useAuth()` outside a provider.
2. `App.jsx` had no routes for the pages the navbar linked to.
3. `registry.js` still exposed only the original 7 games, so 23 finished games were unreachable.
4. Interrogation Master and Treasure Hunt AI sent numeric `difficulty` (0–2); Zod expects Easy/Medium/Hard → 400 and offline fallback every time.
5. Treasure Hunt animated SVG `r` with framer-motion, producing an undefined `r` console error; now animates opacity/scale.
6. Server achievements returned an empty description on the results screen; the mirror now carries the same text as the client.
7. A 0-point run was labelled "new personal best" (previous best −1); now requires score > 0.
8. Socket.IO had no Vite proxy, so multiplayer failed in dev.
9. Stale marketing copy claimed accounts/cloud saving were "coming" and 20 games; updated everywhere.

### Not tested / limitations
- **Live Gemini** (no API key here): all AI paths were exercised through fallbacks only.
- **MongoDB Atlas** (no cluster here): the Mongo store code path is unexercised; the JSON-file store is tested.
- Real touch devices, Safari/Firefox; mobile layout checked only at code level in this session.
- 29 of the 30 games were smoke-tested to their start screen; only Memory Matrix, Caption Battle and Traitor Among Us were played through a complete loop here.
- Multiplayer was driven by automation, not two human players on two devices.

## Phase 0-1: Planning + UI foundation
- [x] Landing, Game Library (search/filters/favorites), Game Detail, 404, design system (unchanged)
- [x] `npm install`, `npm run build` now run with the real libraries: PASS (build 5s)

## Phase 2 (this session): engine, playable games, dashboard, backend, NOVA
### Platform
- [x] Progress engine (`client/src/engine/`): XP, levels (L needs 50*L*(L-1) XP), coins, daily streak, history (last 200), personal bests, 13 achievements, daily challenge (date-seeded, 2x XP bonus), recommendations from real history, adaptive difficulty (last 3 results of each game → Easier/Normal/Harder)
- [x] GameShell: instructions → play → results (score, stars, XP/coins, level-up, achievements, replay, quit with no reward). Double-award guarded.
- [x] Dashboard: level ring, XP bar, coins, streak, games played, achievements, daily challenge, recent games, recommended games
- [x] Profile: overview/personal bests, full history, achievements, settings (name, reset progress)
- [x] Navbar shows live level/coins/streak; login/register placeholders removed (no fake buttons)
- [x] Game Detail: "Play now" for playable games, honest "Coming soon" for the rest

### Playable games (7 of 21 catalogue entries)
- [x] Memory Matrix · [x] Code Breaker · [x] Stair Jump · [x] One Minute Challenge · [x] Two Doors · [x] Mind Games · [x] Trivia Party (AI)

### Backend (`server/`, Express)
- [x] `/api/health`, `/api/nova`, `/api/trivia/{topics,quiz,answer}`; Zod validation; per-IP rate limit
- [x] Gemini client with 12s timeout; key only in `server/.env` (never in frontend)
- [x] Fallbacks: offline trivia bank (30 questions) + rule-based NOVA tips. Quiz answers stay on the server.
- [x] NOVA chat widget: sends only real stats + game slug; system prompt forbids revealing solutions

## Phase 2 test results from the previous session (NOT re-run in the audit below)
- Memory Matrix: cleared rounds by reading lit tiles, then lost all lives → results + XP saved. PASS
- Code Breaker: independent solver cracked the code (3-5 guesses) → win screen. PASS
- Stair Jump: auto-player climbed 14-15 stairs in 12 s; manual misses ended the game. PASS
- Two Doors: indirect-question strategy won 3/3 rounds, score 300. PASS
- Mind Games: independent solver answered 60/60 puzzles across 6 runs and all difficulty tiers with 0 wrong answer keys. PASS
- One Minute: real 60 s run, 6 answers, timer end → results, replay works. PASS
- Trivia Party: 8 questions via server fallback, answers checked server-side. PASS
- Dashboard, Profile (4 tabs, rename), history, achievements unlocked correctly. PASS
- NOVA: chat → server → fallback reply. PASS. Gemini failure (fake key) → fallback in 0.05 s. PASS
- Library (21 cards, Logic filter 6), detail pages, 404, unplayable route. PASS
- Mobile 390px: no horizontal overflow on dashboard, profile, 4 games. PASS
- Browser console errors during all of the above: 0

### NOT tested
- **Live Gemini responses** (no API key in my workspace; Google is blocked here). Request/response code and fallbacks are tested, the real call needs your key.
- Real touch devices, Safari/Firefox, sound (no sound exists yet)

## Phase 2 audit session (this one): what was and was not verified

**Environment limit:** package installs were blocked (no network for npm), so `npm install`, `npm run build`, the Express server, the real Vite app, Tailwind styling and Gemini could NOT be run. Everything below was run for real, but through substitutes, listed per line.

### How it was tested
- `client`: `npm test` (node:test, 11 tests) runs the real engine code with React/icons stubbed
- `server`: `npm test` (node:test, 4 tests) runs the real Gemini client and trivia bank
- Compile check of the whole client with esbuild (syntax + every import resolves): PASS
- Browser tests (not in the repo): the real game/page code bundled with esbuild, React 19 (project pins 18), stub router/animation/icon libraries, no Tailwind CSS, driven in real headless Chromium. Trivia used a mocked `/api`.

### Passed (all re-run at the end)
- Engine: level thresholds, XP formula, streak bonus once per day, coins, personal bests, daily 2x bonus once, level-up, achievements, adaptive difficulty, recommendations labels, corrupted storage, Code Breaker feedback (11/11)
- Server: Gemini key only in header, never URL/body; no key → disabled and throws (fallback path); HTTP 429 / empty response throw; trivia bank valid (4/4)
- Memory Matrix, Code Breaker (win + lose), Stair Jump (win-climb + 3 misses), Two Doors (3/3 and 2-question limit), Mind Games (solver 10/10 at 3 difficulty levels, 30 s timeout, hint), One Minute (real 60.3 s run, 40 correct/2 wrong counted, score hand-verified = 718, replay), Trivia client (server error, unreachable server, loading, 5/8 scoring, results) : 48/48 browser checks
- Dashboard / Profile: values equal saved progress (XP, level, coins, games, achievements, streak, recent games, personal bests, history, achievements tab), rename, reset progress, corrupted storage: 23/23

### Bugs found and fixed
1. **Quitting during a game's end-of-game delay still awarded rewards** (Code Breaker 0.9–1.8 s, Stair Jump 0.9 s) and jumped to results. Reproduced on the original build (history=1, +98 XP after quit), fixed in `GameShell` with a run id; fixed build: 0 history, 0 XP.
2. **Stale streak displayed**: a streak not played yesterday/today kept showing (e.g. 5 after 3 idle days) in navbar, dashboard, profile, NOVA context. New `currentStreak()`; playing after a lapse restarts at 1.
3. **Recommendations**: just-played games came back labelled "Popular pick"; reasons now derive from real data (untried / last result % / rematch) and the 2 latest games are excluded.
4. **Memory Matrix** "rounds cleared" used the round number, so harder starting levels over-reported. Now counts real cleared rounds.
5. **Mind Games** difficulty label could change after answering (it followed the streak, not the puzzle). Now stored with the puzzle.
6. **Trivia fallback** silently mixed topics (a "Science" quiz got History questions; a custom topic like "Space" got random questions labelled as such). Now: known topic → only that topic (may be fewer than 8, player is told); unknown topic → general mix with a visible note.
7. Trivia: a stale error message stayed on the next question. Cleared.
8. **Server never started on Windows / paths with spaces** (entry check built `file://` + argv path by hand). Now uses `pathToFileURL`.
9. Server rate-limit map grew without bound. Pruned.
10. Stair Jump button was not keyboard-activatable (only pointer). Added.
11. Corrupted `localStorage` (wrong types) could crash the app. Loader now sanitises.
12. `server/README.md` said "Backend arrives in Phase 2". Rewritten.

### Not tested / blocked
- `npm install` / `npm run build` / backend start / real Express routes (zod, express not installable here). Frontend→backend through the Vite proxy untested
- **Live Gemini** (no key, no network): NOVA and Trivia generation with Gemini remain unverified; only fallback behaviour and request construction are tested
- Desktop/mobile layout, hover effects, text overflow, footer: Tailwind was not available, so no visual check was possible. Only code review. Landing, Game Library (search/filters), Game Detail and routing were compiled but not rendered
- Real touch devices, Safari/Firefox, React 18 specifically (tested on 19)
- NOVA chat widget UI (only its server-side fallback logic was reviewed)

### Remaining limitations
- Progress lives in browser localStorage; scores of client-side games can be edited by the player
- Catalogue has 21 entries, 7 playable (the 32-game list is Phase 3). `pages/ComingSoon.jsx` is unused
- Trivia offline bank has only 30 questions (6 per topic)

## Known limitations
- Progress is stored in this browser (localStorage), not an account. Procedural games run client-side, so a determined user could tamper with their local score. AI games keep answers on the server.
- Favorites + progress are per browser. Light theme and sound settings not built.

## Next (priority order)
0. Run the production build once more after Phase 3 fixes: `cd client && npm run build`, then `cd ../server && npm start` and open http://localhost:3001
1. Add your Gemini key and test Trivia Party / NOVA / all AI games live
2. Build the last two catalogue games: City Architect and Bounce Lab
3. Real-device QA: touch controls, 390px layout, Safari/Firefox
4. MongoDB Atlas + deployment (Render single service, see `docs/DEPLOYMENT.md`)
5. Optional: friends challenges, weekly leaderboards, more online game variants
