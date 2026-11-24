import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Compass, Gem, HelpCircle, Lightbulb, Loader2, Map, Send, Timer, WifiOff, XCircle } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp, pick } from './ui.jsx'
import { api } from '../api.js'

// ---------------------------------------------------------------------------
// Island map: Beach → Palm Grove → Cave → Ruins → X
// ---------------------------------------------------------------------------
const STOPS = [
  { name: 'Beach', x: 42, y: 150 },
  { name: 'Palm Grove', x: 112, y: 88 },
  { name: 'Cave', x: 190, y: 132 },
  { name: 'Ruins', x: 262, y: 68 },
  { name: 'X', x: 322, y: 122 },
]
const PATH_D = 'M42 150 L112 88 L190 132 L262 68 L322 122'

// Offline riddle bank: two riddles per stage, answers fuzzy-matched.
const BANK = [
  [
    { riddle: 'I wear a crown of foam but have no head, I kiss the land each hour then flee my bed. Ships are born on me and old shells come to die. Where am I?', hint: 'Where sand meets the sea — your journey starts here.', answers: ['beach', 'the beach', 'shore', 'the shore', 'sandy shore', 'seashore'] },
    { riddle: 'A thousand grains make my golden floor, the tide writes on me then erases once more. Crabs hold court where my dunes rise slow. Name this place where castaways go.', hint: 'The first stop on any island map: sand, surf and sun.', answers: ['beach', 'the beach', 'shore', 'the shore', 'sandy shore', 'seashore'] },
  ],
  [
    { riddle: 'My soldiers stand in rows with spears of green, they wear rough armor and a feathered sheen. They drop their swords when the sweet wind calls, and monkeys feast in my leafy halls. What place am I?', hint: 'A cluster of tall trees with coconuts — inland from the sand.', answers: ['palm grove', 'grove', 'the palm grove', 'palm trees', 'palms', 'palm', 'coconut grove'] },
    { riddle: 'I am a forest of one kind of tree, my roof is fronds and my fruit feeds three. Sailors carve hearts in my trunks so tall, and shade is the treasure I give to all.', hint: 'Where the palms gather — the second mark on the map.', answers: ['palm grove', 'grove', 'the palm grove', 'palm trees', 'palms', 'palm', 'coconut grove'] },
  ],
  [
    { riddle: 'I have a mouth but never speak, a throat that swallows streams so meek. My teeth hang down and drip with time, and bats are my choir in the dark sublime. What am I?', hint: 'A dark hollow in the cliff — bring a torch.', answers: ['cave', 'the cave', 'cavern', 'the cavern', 'grotto'] },
    { riddle: 'Stone lips that drink the rain and never close, a belly of echoes where no sun goes. Stalactites guard my silent hall; enter me if you dare at all.', hint: 'The third stop: a hole in the mountain where echoes live.', answers: ['cave', 'the cave', 'cavern', 'the cavern', 'grotto'] },
  ],
  [
    { riddle: 'I was a palace, now I am a prayer, my columns wear moss and my throne is bare. The jungle eats what the masons made, and kings are dust in my broken shade. What place am I?', hint: 'Crumbling old temples overtaken by vines.', answers: ['ruins', 'the ruins', 'old ruins', 'ancient ruins', 'temple', 'the temple', 'temple ruins'] },
    { riddle: 'My walls remember a forgotten crown, my stairs lead up though my roof fell down. Carved faces watch with eroded eyes; treasure hunters read my stone disguise.', hint: 'What is left of a great old city — the fourth mark.', answers: ['ruins', 'the ruins', 'old ruins', 'ancient ruins', 'temple', 'the temple', 'temple ruins'] },
  ],
  [
    { riddle: 'I am the letter that ends every hunt, two crossed strokes, no more, no front. Pirates ink me where the spade should bite; I am the spot that ends the night. What am I?', hint: 'The final mark on every pirate map — two crossed lines.', answers: ['x', 'x marks the spot', 'the x', 'treasure', 'the treasure', 'treasure chest', 'chest'] },
    { riddle: 'Gold in a box beneath the sand I sleep, a promise pirates made but could not keep. Solve every riddle, follow every sign — the chest at the journey\'s end is mine. What waits at the end?', hint: 'What the whole hunt is for — the prize under the X.', answers: ['treasure', 'the treasure', 'treasure chest', 'chest', 'x', 'x marks the spot', 'gold'] },
  ],
]

// ---------------------------------------------------------------------------
// Fuzzy answer matching
// ---------------------------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
function lev(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}
function fuzzyMatch(guess, answers) {
  const g = norm(guess)
  if (!g) return false
  return answers.some((a) => {
    const t = norm(a)
    if (g === t) return true
    if (g.length >= 3 && (t.includes(g) || g.includes(t))) return true
    const tol = t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0
    return tol > 0 && lev(g, t) <= tol
  })
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// ---------------------------------------------------------------------------
// Island map with animated progress path
// ---------------------------------------------------------------------------
function IslandMap({ progress }) {
  return (
    <svg viewBox="0 0 360 200" className="w-full" role="img" aria-label={`Island map. Reached: ${STOPS[Math.min(progress, 4)].name}. ${progress} of 5 clues solved.`}>
      <path d="M18 168 Q10 120 44 96 Q60 52 118 44 Q170 18 226 38 Q292 26 330 74 Q352 108 338 142 Q330 176 280 182 Q200 196 120 188 Q50 190 18 168 Z" fill="#152a3d" stroke="#2b4a63" strokeWidth="2" />
      <path d="M60 150 q20 -8 40 0 M240 160 q20 -8 40 0" stroke="#2b4a63" strokeWidth="2" fill="none" />
      <path d={PATH_D} stroke="#3b4a6b" strokeWidth="2" strokeDasharray="5 5" fill="none" />
      <motion.path d={PATH_D} stroke="#8b7cf7" strokeWidth="3" fill="none" strokeLinecap="round"
        initial={false} animate={{ pathLength: clamp(progress / 4, 0, 1) }} transition={{ duration: 0.9, ease: 'easeInOut' }} />
      {STOPS.map((s, i) => {
        const reached = i <= progress
        const current = i === progress
        return (
          <g key={s.name}>
            {current && progress < 5 && (
              <motion.circle cx={s.x} cy={s.y} r="10" fill="none" stroke="#67e8f9" strokeWidth="1.5" style={{ transformOrigin: `${s.x}px ${s.y}px` }}
                animate={{ opacity: [0.8, 0.1, 0.8], scale: [1, 1.4, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
            )}
            <motion.circle cx={s.x} cy={s.y} r="6" initial={false}
              animate={{ fill: reached ? (i === 4 ? '#f87171' : '#67e8f9') : '#26324f', scale: reached ? 1 : 0.8 }} />
            {i === 4 ? (
              <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill={reached ? '#0b1020' : '#8b93b8'}>X</text>
            ) : null}
            <text x={s.x} y={s.y - 14} textAnchor="middle" fontSize="10" fill={reached ? '#e8eaf6' : '#8b93b8'}>{s.name}</text>
          </g>
        )
      })}
      {progress >= 5 && (
        <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
          <circle cx="322" cy="122" r="12" fill="#f87171" opacity="0.3" />
        </motion.g>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
export default function TreasureHuntAI({ level = 1, onFinish }) {
  const [stage, setStage] = useState(0) // 0..4 clues; 5 = reached X
  const [clue, setClue] = useState(null)
  const [input, setInput] = useState('')
  const [tries, setTries] = useState(0)
  const [hintShown, setHintShown] = useState(false)
  const [hints, setHints] = useState(0)
  const [wrongTries, setWrongTries] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const [modeNote, setModeNote] = useState('')
  const [feedback, setFeedback] = useState(null) // {ok, text}
  const finishedRef = useRef(false)
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  // Count-up timer (stops once X is reached)
  useEffect(() => {
    if (stage >= 5) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [stage])

  // Load the clue for the current stage (online first, offline bank on failure)
  useEffect(() => {
    if (stage >= 5) { setClue(null); return }
    let dead = false
    setTries(0); setHintShown(false); setInput(''); setFeedback(null)
    ;(async () => {
      if (offline) { setClue({ ...pick(BANK[stage]), local: true }); return }
      setBusy(true)
      try {
        const r = await api('/ai/riddle', { theme: 'treasure locations', difficulty: ['Easy', 'Medium', 'Hard'][level] ?? 'Medium' })
        if (dead) return
        if (!r.riddle) throw new Error('bad riddle')
        setClue({ id: r.id, riddle: r.riddle, hint: r.hint, local: false })
      } catch {
        if (dead) return
        setOffline(true)
        setClue({ ...pick(BANK[stage]), local: true })
      } finally {
        if (!dead) setBusy(false)
      }
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, offline])

  const previewScore = Math.max(0, 500 - wrongTries * 25 - hints * 30 + (elapsed < 300 ? 100 : 0))

  // Short advance delays are tracked and cleared on unmount; advancingRef blocks double-submits.
  const advanceTimer = useRef(null)
  const advancingRef = useRef(false)
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }, [])
  useEffect(() => { advancingRef.current = false }, [stage])

  const advance = () => {
    advancingRef.current = true
    advanceTimer.current = setTimeout(() => { if (aliveRef.current) setStage((s) => s + 1) }, 900)
  }

  const resolve = (correct) => {
    if (correct) {
      setFeedback({ ok: true, text: stage === 4 ? 'The final riddle cracks — X is revealed!' : `Correct! The path opens to ${STOPS[stage + 1].name}.` })
      advance()
      return
    }
    const t = tries + 1
    setTries(t)
    setWrongTries((w) => w + 1)
    if (t >= 3 && !hintShown) {
      setHintShown(true)
      setHints((h) => h + 1)
      setFeedback({ ok: false, text: 'Three misses — the hint surfaces on its own. (−30)' })
    } else {
      setFeedback({ ok: false, text: `Wrong. ${t < 3 ? `${3 - t} ${3 - t === 1 ? 'try' : 'tries'} before the hint auto-reveals.` : 'The hint is shown — take your time.'}` })
    }
  }

  const submit = async () => {
    const a = input.trim()
    if (!a || busy || !clue || stage >= 5 || advancingRef.current) return
    setBusy(true)
    setFeedback(null)
    try {
      if (clue.local) {
        resolve(fuzzyMatch(a, clue.answers))
      } else {
        try {
          const r = await api('/ai/riddle/answer', { id: clue.id, answer: a })
          if (!aliveRef.current) return
          resolve(!!r.correct)
        } catch {
          if (!aliveRef.current) return
          // Lost the server mid-hunt: continue with an offline riddle for this stage.
          setOffline(true)
          setModeNote('The server vanished mid-hunt — continuing with offline riddles.')
        }
      }
      if (aliveRef.current) setInput('')
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  const useHint = () => {
    if (hintShown || !clue) return
    setHintShown(true)
    setHints((h) => h + 1)
  }

  const revealAnswer = () => {
    if (!clue || advancingRef.current) return
    setHints((h) => h + 2) // −60: buying the answer costs double a hint
    setFeedback({ ok: true, text: clue.local ? `The answer was "${clue.answers[0]}". The map grudgingly moves on. (−60)` : 'You buy the answer from a passing parrot. The map grudgingly moves on. (−60)' })
    advance()
  }

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    const bonus = elapsed < 300 ? 100 : 0
    const score = Math.max(0, 500 - wrongTries * 25 - hints * 30 + bonus)
    onFinish({
      score, rating: clamp(score / 600, 0, 1), won: true,
      summary: `Reached X in ${fmt(elapsed)} with ${wrongTries} wrong guesses and ${hints} hints${bonus ? ' — swift enough for the +100 time bonus' : ''}.`,
      stats: [
        { label: 'Time', value: fmt(elapsed) },
        { label: 'Wrong tries', value: wrongTries },
        { label: 'Hints used', value: hints },
        { label: 'Riddles from', value: offline ? 'Offline bank' : 'AI' },
      ],
    })
  }

  const atX = stage >= 5

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Stat label="Clue" value={`${Math.min(stage + 1, 5)}/5`} />
          <Stat label="Time" value={fmt(elapsed)} tone={elapsed < 300 ? 'text-success' : 'text-dim'} />
          <Stat label="Score" value={previewScore} />
        </div>
        {offline && <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-warn"><WifiOff size={12} /> Offline</span>}
      </div>
      {modeNote && <p className="mb-3 text-center text-[11px] text-warn" role="status">{modeNote}</p>}

      {/* Map */}
      <div className="glass rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><Map size={15} className="text-cyan" /> The island chart</div>
        <IslandMap progress={stage} />
        <p className="text-center text-xs text-dim">{atX ? 'X marks the spot. The spade is yours.' : `Solve the riddle to march on to ${STOPS[Math.min(stage + 1, 4)].name}.`}</p>
      </div>

      {/* Clue card */}
      <div className="glass mt-4 rounded-3xl p-5 sm:p-6">
        {atX ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <Gem size={36} className="mx-auto text-warn" />
            <h2 className="mt-2 font-display text-xl font-bold text-gradient">The chest is yours!</h2>
            <p className="mt-1 text-sm text-dim">Five riddles, one island, {fmt(elapsed)} on the clock. {elapsed < 300 ? 'Under five minutes — the +100 time bonus is locked in.' : 'Over five minutes — no time bonus, but the gold is real.'}</p>
            <Button className="mt-4" onClick={finish}><Gem size={16} /> Claim the treasure</Button>
          </motion.div>
        ) : busy && !clue ? (
          <div className="py-6 text-center">
            <Loader2 size={26} className="mx-auto animate-spin text-violet-soft" />
            <p className="mt-3 text-sm text-dim">The mapkeeper is writing your next riddle…</p>
          </div>
        ) : clue ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold"><Compass size={15} className="text-violet-soft" /> Clue {stage + 1} — from {STOPS[stage].name}</span>
              <span className="text-xs text-dim">Tries: {tries}/3 {tries >= 3 ? '· hint phase' : ''}</span>
            </div>
            <p className="mt-3 rounded-2xl bg-white/5 p-4 text-sm italic leading-relaxed text-ink">{clue.riddle}</p>

            {hintShown && clue.hint && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
                <Lightbulb size={14} className="mt-0.5 shrink-0" /> {clue.hint}
              </motion.p>
            )}

            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit() }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
                placeholder="Your answer…" aria-label="Riddle answer"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-panel/70 px-3 py-2.5 text-sm text-ink placeholder:text-dim/60 focus:border-violet/60 focus:outline-none" />
              <Button type="submit" disabled={busy || !input.trim()} aria-label="Submit answer"><Send size={15} /></Button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!hintShown && (
                <Button size="sm" variant="secondary" onClick={useHint} disabled={busy}><Lightbulb size={14} /> Hint (−30)</Button>
              )}
              {hintShown && tries >= 3 && (
                <Button size="sm" variant="ghost" onClick={revealAnswer} disabled={busy}><HelpCircle size={14} /> Reveal answer & move on (−60)</Button>
              )}
              <span className="text-[11px] text-dim">3 wrong tries auto-reveal the hint (−30). Under 5 minutes: +100.</span>
            </div>

            {busy && clue && <p className="mt-3 flex items-center gap-2 text-xs text-dim"><Loader2 size={13} className="animate-spin" /> Checking your answer…</p>}
            {feedback && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status"
                className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs ${feedback.ok ? 'border-success/50 bg-success/10 text-success' : 'border-danger/40 bg-danger/10 text-danger'}`}>
                {feedback.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />} {feedback.text}
              </motion.p>
            )}
          </>
        ) : null}
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-dim"><Timer size={11} /> The clock counts up. Wrong guesses −25, hints −30, base 500.</p>
    </Frame>
  )
}
