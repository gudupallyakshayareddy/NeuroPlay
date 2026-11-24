# NeuroPlay Game Development Guide (internal)

This guide is the contract for building game components. Follow it exactly so every
game integrates with the platform without changes to shared code.

## Game component contract

Each game is a default-exported React component in `client/src/games/<Name>.jsx`.
It receives props from `GameShell` (`client/src/components/game/GameShell.jsx`):

```jsx
export default function MyGame({ level, onFinish }) { ... }
```

- `level`: adaptive difficulty `0` (easier), `1` (normal), `2` (harder). Use it to
  scale timers, grid sizes, enemy counts, puzzle complexity, etc.
- `onFinish(result)` — call EXACTLY ONCE when the game ends:

```js
onFinish({
  score: 720,            // integer >= 0, the game's own points
  rating: 0.72,          // 0..1 performance fraction (score / realistic max)
  won: true,             // boolean win condition
  summary: 'Escaped with 1:24 left.',   // one sentence shown on results
  stats: [{ label: 'Locks opened', value: '4/4' }],  // 2-6 small stat tiles
})
```

The shell renders instructions/start screen and results/replay itself.
DO NOT build your own start screen, results screen, replay button, or XP logic.
The game component is only the PLAY phase. It mounts fresh on every run.

## Shared imports (use these, do not reinvent)

```js
import Button from '../components/ui/Button.jsx'        // variants: primary|secondary|ghost, sizes sm|md|lg
import { Frame, Stat, Lives, rand, pick, shuffle, clamp } from './ui.jsx'
import { api } from '../api.js'                          // server calls, see below
```

- `Frame` wraps content: `<Frame>...</Frame>` (max-w-2xl centered). For wide
  games (city grid, canvas) use `<div className="mx-auto w-full max-w-4xl">`.
- `Stat` renders a glass stat tile: `<Stat label="Score" value={score} />`.
- `Lives` renders life dots: `<Lives n={lives} max={3} />`.
- `rand(a,b)` inclusive int, `pick(arr)`, `shuffle(arr)` (pure), `clamp(n,a,b)`.

## Styling (Tailwind + design tokens — no inline hex colors except game art)

- Backgrounds: `bg-void` (page), `bg-navy`, `bg-panel`. Cards: class `glass`
  (glassmorphism) with `rounded-2xl`/`rounded-3xl`, hover class `glass-hover`.
- Text: `text-ink` (primary), `text-dim` (secondary). Headings use `font-display`.
- Accents: `text-violet`, `text-violet-soft`, `text-cyan`, `text-success`,
  `text-warn`, `text-danger`, with opacity modifiers like `bg-violet/20`,
  `border-success/50`. Gradient text: class `text-gradient`.
- Buttons: ALWAYS the shared `Button`. Small inline choice chips may be plain
  `<button className="glass rounded-xl px-4 py-2.5 text-sm hover:border-violet/60">`.
- Keep spacing consistent: `p-5 sm:p-8` for main cards, `gap-3`/`gap-4`, `mt-4`/`mt-6`.
- Icons: `lucide-react` only. Animations: `framer-motion` allowed (already a dep).
- NO new npm dependencies. NO external images/URLs. Inline SVG for game visuals.
- Mobile: everything must work at 390px width. Touch controls where keyboard is
  used (on-screen buttons). `touch-action: none` on drag/canvas surfaces.
- Accessibility: buttons are real `<button>`s, keyboard operable, `aria-label`
  on icon-only controls and canvas.

## Real-time games (canvas / rAF)

- Use a single `requestAnimationFrame` loop inside `useEffect`, cancel on unmount.
- Keep mutable game state in refs, React state only for HUD (throttle updates).
- Canvas: fixed internal resolution (e.g. 480x640), CSS `w-full h-auto max-h-[70vh]`,
  `className="rounded-2xl border border-white/10"`. Scale pointer coords by
  `canvas.width / rect.width`.
- Clean up ALL timers/intervals/listeners on unmount. Never call `onFinish`
  after unmount. Guard with a `finishedRef` so it fires exactly once.

## Server AI API (via `api(path, body)` from `../api.js`)

`api()` returns parsed JSON or throws `Error` with a human-readable message.
Every AI endpoint also returns `source: 'gemini' | 'fallback'`.
The server may be DOWN: every game MUST remain fully playable offline.
Catch errors and switch to the local fallback content bank built into the game.
Show loading states while waiting (spinner/skeleton, disable inputs).
Never block gameplay on the network for more than the api timeout.

Endpoints (all POST unless noted):

1. `/ai/story` `{ theme, history: [{role:'player'|'dm', text}], action }`
   → `{ text, choices: [3 strings], ending: bool, source }`
2. `/ai/fusion` `{ a, b }` → `{ result, emoji, description, source }`
3. `/ai/caption` `{ prompt, caption }` → `{ score: 0..100, verdict, source }`
4. `/ai/human-or-ai/start` `{ difficulty }` → `{ roundId, text, source }`
   `/ai/human-or-ai/answer` `{ roundId, guess: 'human'|'ai' }`
   → `{ correct, wasAI, explanation, source }`
5. `/ai/riddle` `{ theme?, difficulty }` → `{ id, riddle, hint, source }`
   `/ai/riddle/answer` `{ id, answer }` → `{ correct, answer, source }`
6. `/ai/npc` `{ name, personality, context, history: [{role:'player'|'npc', text}], message }`
   → `{ reply, source }`
7. `/ai/interrogate/start` `{ difficulty }`
   → `{ sessionId, suspect: { name, role, bio }, intro, source }`
   `/ai/interrogate/ask` `{ sessionId, question }` → `{ answer, source }`
   `/ai/interrogate/accuse` `{ sessionId, guess }` → `{ correct, truth, source }`

For 4, 5, 7 the answer lives on the server. If the server is unreachable at
game start, fall back to a LOCAL content bank (>= 6 authored items) with the
same flow implemented client-side. Label the mode honestly in the UI
(e.g. a small chip "Offline mode").

## Content quality bar

- Authored content banks: >= 6 varied items (cases, riddles, identities...),
  well-written, no placeholders, no lorem ipsum.
- Deterministic logic where possible: puzzle answers computed from hidden
  state, never hardcoded mismatched keys.
- Scoring must be earnable and reflect skill; `rating` = score / realistic max.
- Every game must be genuinely playable start→finish with clear win/lose.

## Files

- One file per game: `client/src/games/<PascalName>.jsx`. Large content banks
  may live in `client/src/games/content/<name>.js` (plain JS, no JSX).
- Do NOT edit `registry.js`, `games.js`, `GameShell.jsx`, or any shared file.
  The integrator wires the registry.
- Do NOT run npm install or add dependencies.