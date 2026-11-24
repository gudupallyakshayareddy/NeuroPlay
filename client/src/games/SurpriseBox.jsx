import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift as GiftIcon, HelpCircle, Zap, Brain, Shapes, Calculator, Sparkles, Timer } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, rand, pick, clamp } from './ui.jsx'
import useCountdown from '../engine/useCountdown'

const BOXES = 6
const TYPES = ['riddle', 'reaction', 'memory', 'odd', 'math']
const META = {
  riddle: { label: 'Riddle', Icon: HelpCircle },
  reaction: { label: 'Reaction tap', Icon: Zap },
  memory: { label: 'Memory flash', Icon: Brain },
  odd: { label: 'Odd one out', Icon: Shapes },
  math: { label: 'Quick math', Icon: Calculator },
}

// No two consecutive boxes share a type.
function makeSequence() {
  const seq = []
  for (let i = 0; i < BOXES; i++) seq.push(pick(TYPES.filter((t) => t !== seq[i - 1])))
  return seq
}

// ---- Fuzzy answer matching ----
const normalize = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
function lev(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}
const fuzzy = (guess, answers) => {
  const g = normalize(guess)
  if (!g) return false
  return answers.some((a) => {
    const c = normalize(a)
    return g === c || (c.length > 5 && g.length > 3 && lev(g, c) <= 2)
  })
}

const RIDDLES = [
  { q: 'I have keys but open no locks. What am I?', a: ['piano', 'a piano', 'keyboard'] },
  { q: 'I have a head and a tail but no body. What am I?', a: ['coin', 'a coin'] },
  { q: 'What gets wetter the more it dries?', a: ['towel', 'a towel', 'the towel'] },
  { q: 'I have hands but cannot clap. What am I?', a: ['clock', 'a clock', 'watch', 'a watch'] },
  { q: 'What goes up but never comes down?', a: ['age', 'your age', 'my age'] },
  { q: 'I have many teeth but cannot bite. What am I?', a: ['comb', 'a comb'] },
  { q: 'I have a neck but no head. What am I?', a: ['bottle', 'a bottle'] },
  { q: 'I am full of holes but still hold water. What am I?', a: ['sponge', 'a sponge'] },
  { q: 'What can you catch but never throw?', a: ['cold', 'a cold', 'the cold'] },
  { q: 'I have one eye but cannot see. What am I?', a: ['needle', 'a needle'] },
  { q: 'I have words but never speak. What am I?', a: ['book', 'a book'] },
  { q: 'I run but never walk, and murmur but never talk. What am I?', a: ['river', 'a river', 'stream', 'a stream'] },
]

const ODD_SETS = [
  { items: ['🍎', '🍌', '🍇', '🚗'], out: 3, why: 'The car is not a fruit.' },
  { items: ['🐶', '🐱', '🐹', '🦈'], out: 3, why: 'The shark is not a house pet.' },
  { items: ['⚽', '🏀', '🎾', '🎸'], out: 3, why: 'The guitar is not a ball.' },
  { items: ['🔴', '🔵', '🟢', '🔺'], out: 3, why: 'The triangle is not a circle.' },
  { items: ['🚗', '🚌', '🚲', '✈️'], out: 3, why: 'The plane travels by air, not road.' },
  { items: ['🍕', '🍔', '🌭', '🍦'], out: 3, why: 'Ice cream is a dessert, not fast-food savory.' },
  { items: ['🐦', '🦅', '🐧', '🦇'], out: 3, why: 'The bat is a mammal, not a bird.' },
  { items: ['🌵', '🌲', '🌻', '🍄'], out: 3, why: 'A mushroom is a fungus, not a plant.' },
  { items: ['👟', '👢', '👡', '🧤'], out: 3, why: 'A glove goes on a hand, not a foot.' },
  { items: ['Mercury', 'Venus', 'Mars', 'Sun'], out: 3, why: 'The Sun is a star, not a planet.' },
]

// ---- Mini-games (each self-contained, timers cleaned on unmount) ----

function RiddleGame({ level, onDone }) {
  const [riddle] = useState(() => pick(RIDDLES))
  const [val, setVal] = useState('')
  const [wrong, setWrong] = useState(0)
  const start = useRef(Date.now())
  const doneRef = useRef(false)
  const finish = (pts, info) => { if (!doneRef.current) { doneRef.current = true; onDone(pts, info) } }
  const left = useCountdown(30 - level * 4, { onEnd: () => finish(0, `Time! The answer was “${riddle.a[0]}”.`) })
  const submit = () => {
    if (!val.trim()) return
    if (fuzzy(val, riddle.a)) {
      const secs = (Date.now() - start.current) / 1000
      finish(clamp(Math.round(100 - wrong * 20 - secs * 2), 30, 100), `Answer: ${riddle.a[0]}.`)
    } else { setWrong((w) => w + 1); setVal('') }
  }
  return (
    <div>
      <p className="text-center text-base text-ink">{riddle.q}</p>
      <div className="mt-4 flex gap-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder="Your answer…" autoComplete="off" aria-label="Riddle answer"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-void/60 px-4 py-3 text-sm outline-none focus:border-violet" />
        <Button onClick={submit} disabled={!val.trim()}>Answer</Button>
      </div>
      <p className="mt-3 flex items-center justify-between text-xs text-dim">
        <span>{wrong > 0 ? `${wrong} wrong — each costs 20 pts.` : 'Speed and first-try accuracy earn more.'}</span>
        <span className="flex items-center gap-1"><Timer size={12} aria-hidden="true" /> {Math.ceil(left)}s</span>
      </p>
    </div>
  )
}

function ReactionGame({ level, onDone }) {
  const [phase, setPhase] = useState('wait')
  const doneRef = useRef(false)
  const goAt = useRef(0)
  const timers = useRef([])
  const finish = (pts, info) => { if (!doneRef.current) { doneRef.current = true; onDone(pts, info) } }
  useEffect(() => {
    timers.current.push(setTimeout(() => {
      setPhase('go'); goAt.current = performance.now()
      timers.current.push(setTimeout(() => finish(0, 'Too slow — the green moment passed.'), 1600 - level * 250))
    }, rand(1200, 3200)))
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const tap = () => {
    if (doneRef.current) return
    if (phase === 'wait') { finish(0, 'False start! You tapped before green.'); return }
    const ms = Math.round(performance.now() - goAt.current)
    const pts = ms <= 180 ? 100 : clamp(Math.round(100 - (ms - 180) / 6), 10, 100)
    finish(pts, `${ms} ms reaction time.`)
  }
  return (
    <div>
      <button onClick={tap} aria-label={phase === 'wait' ? 'Wait for green, then tap' : 'Tap now!'}
        className={`h-44 w-full rounded-2xl border-2 font-display text-2xl font-bold transition-colors ${phase === 'wait' ? 'border-danger/60 bg-danger/15 text-danger' : 'border-success/70 bg-success/25 text-success'}`}>
        {phase === 'wait' ? 'Wait for green…' : 'TAP!'}
      </button>
      <p className="mt-3 text-center text-xs text-dim">Tap as fast as you can when it turns green. Early tap = 0 points.</p>
    </div>
  )
}

function MemoryGame({ level, onDone }) {
  const [code] = useState(() => String(rand(1000, 9999)))
  const [phase, setPhase] = useState('show')
  const [val, setVal] = useState('')
  const doneRef = useRef(false)
  const inputStart = useRef(0)
  const finish = (pts, info) => { if (!doneRef.current) { doneRef.current = true; onDone(pts, info) } }
  const flashMs = [2600, 2000, 1300][clamp(level, 0, 2)]
  useEffect(() => {
    const t = setTimeout(() => { setPhase('input'); inputStart.current = Date.now() }, flashMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const left = useCountdown(10, { running: phase === 'input', onEnd: () => finish(0, `Time! The code was ${code}.`) })
  const submit = () => {
    if (val.length !== 4) return
    if (val === code) {
      const secs = (Date.now() - inputStart.current) / 1000
      finish(clamp(100 - Math.floor(secs * 4), 60, 100), `The code was ${code}.`)
    } else {
      const hits = [...val].filter((d, i) => d === code[i]).length
      finish(hits * 20, `The code was ${code} — ${hits}/4 digits right.`)
    }
  }
  return (
    <div className="text-center">
      {phase === 'show' ? (
        <>
          <p className="text-xs uppercase tracking-wider text-dim">Memorize the code</p>
          <div className="mt-3 font-display text-5xl font-bold tracking-[0.3em] text-cyan" aria-live="polite">{code}</div>
          <p className="mt-3 text-xs text-dim">It vanishes in a moment…</p>
        </>
      ) : (
        <>
          <p className="text-xs uppercase tracking-wider text-dim">Type the code you saw</p>
          <input value={val} inputMode="numeric" autoComplete="off" aria-label="Memory code"
            onChange={(e) => setVal(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            className="mx-auto mt-3 block w-44 rounded-xl border border-white/15 bg-void/60 px-4 py-3 text-center font-mono text-3xl tracking-[0.3em] outline-none focus:border-cyan" />
          <div className="mt-3 flex items-center justify-center gap-3">
            <Button size="sm" onClick={submit} disabled={val.length !== 4}>Submit</Button>
            <span className="flex items-center gap-1 text-xs text-dim"><Timer size={12} aria-hidden="true" /> {Math.ceil(left)}s</span>
          </div>
          <p className="mt-2 text-xs text-dim">Partial credit: 20 pts per correct digit.</p>
        </>
      )}
    </div>
  )
}

function OddGame({ level, onDone }) {
  const [set] = useState(() => pick(ODD_SETS))
  const start = useRef(Date.now())
  const doneRef = useRef(false)
  const finish = (pts, info) => { if (!doneRef.current) { doneRef.current = true; onDone(pts, info) } }
  const left = useCountdown(12 - level * 2, { onEnd: () => finish(0, `Time! ${set.why}`) })
  const choose = (i) => {
    const secs = (Date.now() - start.current) / 1000
    if (i === set.out) finish(clamp(100 - Math.floor(secs * 6), 50, 100), set.why)
    else finish(0, `Not quite — ${set.why}`)
  }
  return (
    <div>
      <p className="text-center text-sm text-dim">Tap the one that does not belong. <span className="text-ink">{Math.ceil(left)}s</span></p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {set.items.map((it, i) => (
          <button key={i} onClick={() => choose(i)} aria-label={`Choice ${i + 1}: ${it}`}
            className="glass glass-hover rounded-2xl px-4 py-6 text-center text-3xl hover:border-violet/60">
            {it}
          </button>
        ))}
      </div>
    </div>
  )
}

function MathGame({ level, onDone }) {
  const [q] = useState(() => {
    const [lo, hi, clo, chi] = [[2, 6, 1, 9], [3, 9, 5, 20], [6, 12, 10, 40]][clamp(level, 0, 2)]
    const a = rand(lo, hi), b = rand(lo, hi), c = rand(clo, chi)
    return { a, b, c, ans: a * b + c }
  })
  const [val, setVal] = useState('')
  const start = useRef(Date.now())
  const doneRef = useRef(false)
  const finish = (pts, info) => { if (!doneRef.current) { doneRef.current = true; onDone(pts, info) } }
  const left = useCountdown(10, { onEnd: () => finish(0, `Time! ${q.a} × ${q.b} + ${q.c} = ${q.ans}.`) })
  const submit = () => {
    if (val === '') return
    const secs = (Date.now() - start.current) / 1000
    if (Number(val) === q.ans) finish(clamp(100 - Math.floor(secs * 6), 40, 100), `${q.a} × ${q.b} + ${q.c} = ${q.ans}.`)
    else finish(0, `Wrong — ${q.a} × ${q.b} + ${q.c} = ${q.ans}.`)
  }
  return (
    <div className="text-center">
      <div className="font-display text-4xl font-bold" aria-live="polite">{q.a} × {q.b} + {q.c} = ?</div>
      <input value={val} inputMode="numeric" autoComplete="off" aria-label="Math answer"
        onChange={(e) => setVal(e.target.value.replace(/[^0-9-]/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        className="mx-auto mt-4 block w-40 rounded-xl border border-white/15 bg-void/60 px-4 py-3 text-center font-mono text-2xl outline-none focus:border-cyan" />
      <div className="mt-3 flex items-center justify-center gap-3">
        <Button size="sm" onClick={submit} disabled={val === ''}>Submit</Button>
        <span className="flex items-center gap-1 text-xs text-dim"><Timer size={12} aria-hidden="true" /> {Math.ceil(left)}s</span>
      </div>
    </div>
  )
}

const GAMES = { riddle: RiddleGame, reaction: ReactionGame, memory: MemoryGame, odd: OddGame, math: MathGame }

// ---- Animated gift box ----
function GiftArt({ opening }) {
  return (
    <motion.svg viewBox="0 0 120 120" className="mx-auto w-40 sm:w-48" role="img" aria-label="Surprise gift box"
      animate={opening ? { rotate: 0 } : { rotate: [0, -3, 3, -3, 0] }}
      transition={opening ? { duration: 0.2 } : { duration: 0.7, repeat: Infinity, repeatDelay: 1.1 }}>
      <motion.circle cx="60" cy="62" r="26" fill="#ffd166" initial={{ opacity: 0 }}
        animate={opening ? { opacity: [0, 0.45, 0], r: [26, 44, 54] } : { opacity: 0 }} transition={{ duration: 0.8 }} />
      <rect x="28" y="58" width="64" height="46" rx="6" fill="#7c5cff" />
      <rect x="54" y="58" width="12" height="46" fill="#ffd166" />
      <motion.g style={{ transformOrigin: '60px 48px' }}
        animate={opening ? { y: -52, rotate: -22, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}>
        <rect x="20" y="42" width="80" height="18" rx="5" fill="#9d7bff" />
        <rect x="54" y="42" width="12" height="18" fill="#ffd166" />
        <path d="M60 42 C48 24 34 30 46 40 Z" fill="#ffd166" />
        <path d="M60 42 C72 24 86 30 74 40 Z" fill="#ffd166" />
        <circle cx="60" cy="40" r="4" fill="#e0a800" />
      </motion.g>
      {opening && (
        <g fill="#8ecae6">
          <motion.circle cx="30" cy="50" r="3" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -26 }} transition={{ duration: 0.7 }} />
          <motion.circle cx="90" cy="46" r="3" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -30 }} transition={{ duration: 0.7, delay: 0.05 }} />
          <motion.circle cx="60" cy="40" r="2.5" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -34 }} transition={{ duration: 0.7, delay: 0.1 }} />
        </g>
      )}
    </motion.svg>
  )
}

export default function SurpriseBox({ level = 0, onFinish }) {
  const [seq] = useState(makeSequence)
  const [box, setBox] = useState(0)
  const [phase, setPhase] = useState('box') // box | play | result
  const [opening, setOpening] = useState(false)
  const [total, setTotal] = useState(0)
  const [points, setPoints] = useState([])
  const [last, setLast] = useState(null)
  const openTimer = useRef(null)
  const finishedRef = useRef(false)
  useEffect(() => () => clearTimeout(openTimer.current), [])

  const type = seq[box]
  const { label, Icon } = META[type]
  const Mini = GAMES[type]

  const open = () => {
    if (phase !== 'box' || opening) return
    setOpening(true)
    openTimer.current = setTimeout(() => setPhase('play'), 900)
  }
  const onDone = (pts, info) => {
    setLast({ pts, info })
    setPoints((p) => [...p, pts])
    setTotal((t) => t + pts)
    setPhase('result')
  }
  const next = () => {
    if (box + 1 >= BOXES) {
      if (finishedRef.current) return
      finishedRef.current = true
      const best = Math.max(...points)
      onFinish({
        score: total, rating: clamp(total / (BOXES * 100), 0, 1), won: total >= 350,
        summary: `Opened ${BOXES} surprise boxes and banked ${total} points.`,
        stats: [
          { label: 'Boxes opened', value: `${BOXES}/${BOXES}` },
          { label: 'Best box', value: best },
          { label: 'Avg / box', value: Math.round(total / BOXES) },
          { label: 'Perfect boxes', value: points.filter((p) => p === 100).length },
        ],
      })
      return
    }
    setBox(box + 1); setOpening(false); setLast(null); setPhase('box')
  }

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3">
        <Stat label="Box" value={`${box + 1}/${BOXES}`} />
        <Stat label="Total" value={total} />
        <Stat label="Best box" value={points.length ? Math.max(...points) : 0} />
      </div>

      <div className="glass rounded-3xl p-5 sm:p-8">
        <AnimatePresence mode="wait">
          {phase === 'box' && (
            <motion.div key={`box-${box}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center">
              <p className="flex items-center justify-center gap-2 text-sm text-dim"><GiftIcon size={16} className="text-violet-soft" aria-hidden="true" /> A mystery challenge is inside.</p>
              <button onClick={open} disabled={opening} aria-label={`Open surprise box ${box + 1}`} className="mt-2 w-full rounded-2xl py-2 disabled:cursor-default">
                <GiftArt opening={opening} />
              </button>
              <Button className="mt-2" onClick={open} disabled={opening}>{opening ? 'Opening…' : 'Tap to open'}</Button>
            </motion.div>
          )}

          {phase === 'play' && (
            <motion.div key={`play-${box}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold text-violet-soft">
                <Icon size={18} aria-hidden="true" /> {label}
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-dim">up to 100 pts</span>
              </div>
              <Mini level={level} onDone={onDone} />
            </motion.div>
          )}

          {phase === 'result' && last && (
            <motion.div key={`res-${box}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <div className={`font-display text-4xl font-bold ${last.pts >= 80 ? 'text-success' : last.pts > 0 ? 'text-cyan' : 'text-danger'}`}>
                {last.pts > 0 ? `+${last.pts}` : '+0'}
              </div>
              <p className="mt-2 text-sm text-dim">{last.info}</p>
              <p className="mt-3 text-sm">Running total: <b className="text-ink">{total}</b> / {BOXES * 100}</p>
              <Button className="mt-4" onClick={next}><Sparkles size={16} /> {box + 1 >= BOXES ? 'See results' : 'Next box'}</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Frame>
  )
}
