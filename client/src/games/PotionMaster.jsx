import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Snowflake, Droplets, Leaf, Mountain, Feather, Cloud, Sparkles, Wind, Sun,
  FlaskConical, TestTube, CheckCircle2, XCircle, Plus, X, RotateCcw, SkipForward, Package,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'

// === DATA START (pure JS — satisfiability verified by brute force) ===
const INGREDIENTS = [
  { id: 'emberroot', name: 'Emberroot', icon: 'flame', color: '#f97316', element: 'fire', potency: 3, toxicity: 1 },
  { id: 'frostleaf', name: 'Frostleaf', icon: 'snowflake', color: '#22d3ee', element: 'water', potency: 2, toxicity: 0 },
  { id: 'riverpearl', name: 'Riverpearl', icon: 'droplets', color: '#3b82f6', element: 'water', potency: 3, toxicity: 1 },
  { id: 'mossheart', name: 'Mossheart', icon: 'leaf', color: '#22c55e', element: 'earth', potency: 2, toxicity: 0 },
  { id: 'stonebloom', name: 'Stonebloom', icon: 'mountain', color: '#b45309', element: 'earth', potency: 3, toxicity: 1 },
  { id: 'skyfeather', name: 'Skyfeather', icon: 'feather', color: '#7dd3fc', element: 'air', potency: 2, toxicity: 0 },
  { id: 'mistcap', name: 'Mistcap', icon: 'cloud', color: '#2dd4bf', element: 'water', potency: 1, toxicity: 0 },
  { id: 'cinderbell', name: 'Cinderbell', icon: 'sparkles', color: '#fb7185', element: 'fire', potency: 1, toxicity: 0 },
  { id: 'galespore', name: 'Galespore', icon: 'wind', color: '#818cf8', element: 'air', potency: 3, toxicity: 1 },
  { id: 'sunamber', name: 'Sunamber', icon: 'sun', color: '#facc15', element: 'fire', potency: 2, toxicity: 2 },
]
const BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]))
const PROP_ORDER = ['element', 'potency', 'toxicity']
const ELEMENTS = ['fire', 'water', 'earth', 'air']
const MAX_SLOTS = 4
const START_STOCK = 4

const EASY_ORDERS = [
  { name: 'Healing Draught', customer: 'Midwife Hanna', flavor: 'For the fever on the dockside. Gentle, clean, and no more than three things in the pot.', constraints: [{ kind: 'element', element: 'water', min: 4 }, { kind: 'toxicity', max: 1 }, { kind: 'count', exact: 3 }] },
  { name: 'Ember Tonic', customer: 'Glassblower Ren', flavor: 'My furnace arm aches. Something hot — but keep the burn honest.', constraints: [{ kind: 'element', element: 'fire', min: 4 }, { kind: 'toxicity', max: 2 }, { kind: 'count', exact: 2 }] },
  { name: 'Stoneguard Salve', customer: 'Mason Odric', flavor: 'Hands cracked like old mortar. Two ingredients at most — I drink it on the scaffold.', constraints: [{ kind: 'element', element: 'earth', min: 4 }, { kind: 'toxicity', max: 1 }, { kind: 'count', max: 2 }] },
  { name: 'Clear Skies Elixir', customer: 'Courier Pip', flavor: 'I run the cliff road in all weather. Light enough to float, clean enough to fly.', constraints: [{ kind: 'element', element: 'air', min: 4 }, { kind: 'toxicity', max: 1 }, { kind: 'count', exact: 2 }] },
  { name: 'Gentle Warmth', customer: 'Granny Ilsa', flavor: 'Nothing that bites, dear. Just a small kindness for old bones.', constraints: [{ kind: 'element', element: 'fire', min: 2 }, { kind: 'toxicity', max: 0 }, { kind: 'count', min: 2 }] },
]
const MEDIUM_ORDERS = [
  { name: 'Tidecaller’s Broth', customer: 'Fisherwoman Brann', flavor: 'The sea takes and the wind gives. I need both in one bowl, and mild enough to drink at dawn.', constraints: [{ kind: 'element', element: 'water', min: 5 }, { kind: 'element', element: 'air', min: 2 }, { kind: 'toxicity', max: 1 }, { kind: 'count', max: 4 }] },
  { name: 'Balanced Bitters', customer: 'Alchemist Voss', flavor: 'Four ingredients, nine measures of power, and not a drop of poison past two. Precision, apprentice.', constraints: [{ kind: 'potency', min: 9 }, { kind: 'toxicity', max: 2 }, { kind: 'count', exact: 4 }] },
]
const HARD_ORDERS = [
  { name: 'Phoenix Tears', customer: 'Captain Mirelle', flavor: 'Fire to wake the dead, water to keep them living. Four things in the pot, and the poison may not exceed two.', constraints: [{ kind: 'element', element: 'fire', min: 6 }, { kind: 'element', element: 'water', min: 2 }, { kind: 'toxicity', max: 2 }, { kind: 'count', exact: 4 }] },
  { name: 'Philosopher’s Sip', customer: 'Archmage Sedd', flavor: 'No fire — fire is for amateurs. Nine measures of power in exactly four ingredients, poison at most one.', constraints: [{ kind: 'potency', min: 9 }, { kind: 'toxicity', max: 1 }, { kind: 'count', exact: 4 }, { kind: 'ban', element: 'fire' }] },
]

function ordersForLevel(level) {
  if (level === 0) return EASY_ORDERS.slice(0, 5)
  if (level === 2) return [...EASY_ORDERS.slice(0, 3), ...MEDIUM_ORDERS, ...HARD_ORDERS]
  return [...EASY_ORDERS.slice(0, 4), ...MEDIUM_ORDERS]
}

function evalConstraint(c, items) {
  const elementPower = (el) => items.filter((i) => i.element === el).reduce((a, i) => a + i.potency, 0)
  const tox = items.reduce((a, i) => a + i.toxicity, 0)
  const pot = items.reduce((a, i) => a + i.potency, 0)
  switch (c.kind) {
    case 'element': return elementPower(c.element) >= c.min
    case 'toxicity': return tox <= c.max
    case 'potency': return pot >= c.min
    case 'ban': return !items.some((i) => i.element === c.element)
    case 'count':
      if (c.exact != null && items.length !== c.exact) return false
      if (c.min != null && items.length < c.min) return false
      if (c.max != null && items.length > c.max) return false
      return true
    default: return false
  }
}

function constraintLabel(c) {
  const cap = (s) => s[0].toUpperCase() + s.slice(1)
  switch (c.kind) {
    case 'element': return `${cap(c.element)} power ≥ ${c.min}`
    case 'toxicity': return c.max === 0 ? 'No toxicity' : `Toxicity ≤ ${c.max}`
    case 'potency': return `Total potency ≥ ${c.min}`
    case 'ban': return `No ${c.element} ingredients`
    case 'count':
      if (c.exact != null) return `Exactly ${c.exact} ingredients`
      if (c.min != null) return `At least ${c.min} ingredients`
      return `At most ${c.max} ingredients`
    default: return ''
  }
}
// === DATA END ===

const ICONS = { flame: Flame, snowflake: Snowflake, droplets: Droplets, leaf: Leaf, mountain: Mountain, feather: Feather, cloud: Cloud, sparkles: Sparkles, wind: Wind, sun: Sun }
const ELEMENT_ICONS = { fire: Flame, water: Droplets, earth: Mountain, air: Wind }
const ELEMENT_TONES = { fire: 'text-warn', water: 'text-cyan', earth: 'text-success', air: 'text-violet-soft' }
const BREW_POINTS = [150, 100, 50]

function mixColor(items) {
  if (!items.length) return '#4c1d95'
  const rgb = items.reduce((a, i) => {
    const n = parseInt(i.color.slice(1), 16)
    return [a[0] + ((n >> 16) & 255), a[1] + ((n >> 8) & 255), a[2] + (n & 255)]
  }, [0, 0, 0])
  const c = rgb.map((v) => Math.round(v / items.length))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

function Cauldron({ items, brewing }) {
  const liquid = mixColor(items)
  return (
    <svg viewBox="0 0 220 150" className="mx-auto h-36 w-full max-w-[260px]" role="img" aria-label={`Cauldron with ${items.length} of ${MAX_SLOTS} ingredients`}>
      <style>{`
        @keyframes pm-rise { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: .85; } 100% { transform: translateY(-44px); opacity: 0; } }
        .pm-bubble { animation: pm-rise 2.4s ease-in infinite; }
        .pm-brewing .pm-bubble { animation-duration: .7s; }
      `}</style>
      <g className={brewing ? 'pm-brewing' : ''}>
        {/* legs */}
        <path d="M60 128 L52 144 M160 128 L168 144 M110 132 L110 146" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
        {/* body */}
        <path d="M40 62 Q36 128 110 130 Q184 128 180 62 Z" fill="#1e293b" stroke="#475569" strokeWidth="3" />
        {/* liquid */}
        <ellipse cx="110" cy="62" rx="70" ry="14" fill={liquid} opacity="0.9" />
        <ellipse cx="110" cy="60" rx="52" ry="9" fill="#ffffff" opacity="0.12" />
        {/* bubbles */}
        {items.length > 0 && [0, 1, 2, 3, 4].map((i) => (
          <circle key={i} className="pm-bubble" cx={72 + i * 19} cy={60} r={3 + (i % 3)} fill="#ffffff" opacity="0" style={{ animationDelay: `${i * 0.45}s` }} />
        ))}
        {/* rim */}
        <ellipse cx="110" cy="62" rx="74" ry="16" fill="none" stroke="#64748b" strokeWidth="5" />
        {/* handles */}
        <path d="M36 70 Q22 74 30 88 M184 70 Q198 74 190 88" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default function PotionMaster({ level = 1, onFinish }) {
  const [orders] = useState(() => ordersForLevel(level))
  const [stock, setStock] = useState(() => Object.fromEntries(INGREDIENTS.map((i) => [i.id, START_STOCK])))
  const [revealed, setRevealed] = useState(() => Object.fromEntries(INGREDIENTS.map((i) => [i.id, level === 0 ? 1 : 0])))
  const [orderIdx, setOrderIdx] = useState(0)
  const [attempt, setAttempt] = useState(1)
  const [cauldron, setCauldron] = useState([])
  const [brewing, setBrewing] = useState(false)
  const [result, setResult] = useState(null)
  const [completed, setCompleted] = useState(0)
  const [points, setPoints] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const [tests, setTests] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef(null)
  const finishedRef = useRef(false)

  const order = orders[orderIdx]
  const items = cauldron.map((id) => BY_ID[id])
  const totalStock = Object.values(stock).reduce((a, b) => a + b, 0)
  const liveChecks = order ? order.constraints.map((c) => ({ label: constraintLabel(c), ok: evalConstraint(c, items) })) : []
  const busy = brewing || done

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // End when orders run out, or stock is exhausted with an empty cauldron.
  useEffect(() => {
    if (done || brewing || result) return
    if (orderIdx >= orders.length || (totalStock === 0 && cauldron.length === 0)) setDone(true)
  }, [done, brewing, result, orderIdx, orders.length, totalStock, cauldron.length])

  useEffect(() => {
    if (!done || finishedRef.current) return
    finishedRef.current = true
    const max = orders.length * 150
    onFinish({
      score: points,
      rating: clamp(points / max, 0, 1),
      won: completed >= 5,
      summary: `Completed ${completed} of ${orders.length} orders${completed >= 5 ? ' — the guild signs you on.' : ' — the guild will not sign you on.'}`,
      stats: [
        { label: 'Orders', value: `${completed}/${orders.length}` },
        { label: 'First-try brews', value: firstTry },
        { label: 'Tests run', value: tests },
        { label: 'Stock left', value: totalStock },
      ],
    })
  }, [done, points, completed, firstTry, tests, totalStock, orders.length, onFinish])

  const test = (id) => {
    if (busy || result || stock[id] <= 0 || revealed[id] >= PROP_ORDER.length) return
    setStock((s) => ({ ...s, [id]: s[id] - 1 }))
    setRevealed((r) => ({ ...r, [id]: r[id] + 1 }))
    setTests((t) => t + 1)
  }

  const add = (id) => {
    if (busy || result || stock[id] <= 0 || cauldron.length >= MAX_SLOTS) return
    setStock((s) => ({ ...s, [id]: s[id] - 1 }))
    setCauldron((c) => [...c, id])
  }

  const removeAt = (idx) => {
    if (busy || result) return
    const id = cauldron[idx]
    setCauldron((c) => c.filter((_, i) => i !== idx))
    setStock((s) => ({ ...s, [id]: s[id] + 1 }))
  }

  const brew = () => {
    if (busy || result || !cauldron.length) return
    setBrewing(true)
    timerRef.current = setTimeout(() => {
      const checks = order.constraints.map((c) => ({ label: constraintLabel(c), ok: evalConstraint(c, items) }))
      const success = checks.every((c) => c.ok)
      if (success) {
        const pts = BREW_POINTS[attempt - 1] || 0
        setPoints((p) => p + pts)
        setCompleted((c) => c + 1)
        if (attempt === 1) setFirstTry((f) => f + 1)
        setStock((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v + 1])))
        setResult({ success, checks, pts })
      } else {
        setResult({ success, checks, orderLost: attempt >= 3 })
      }
      setBrewing(false)
    }, 900)
  }

  const advance = () => {
    setResult(null)
    setCauldron([])
    setAttempt(1)
    setOrderIdx((i) => i + 1)
  }

  const retry = () => {
    setResult(null)
    setCauldron([])
    setAttempt((a) => a + 1)
  }

  if (done || !order) return null

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3">
        <Stat label="Order" value={`${Math.min(orderIdx + 1, orders.length)}/${orders.length}`} />
        <Stat label="Score" value={points} />
        <Stat label="Done" value={completed} tone={completed >= 5 ? 'text-success' : ''} />
      </div>

      {/* Order card */}
      <div className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-lg font-bold text-ink">{order.name}</div>
            <div className="text-xs text-dim">from {order.customer} · brew {attempt}/3 · first try {BREW_POINTS[attempt - 1]} pts</div>
          </div>
          <button onClick={advance} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-dim hover:text-ink disabled:opacity-40" aria-label="Decline this order">
            <SkipForward size={13} /> Decline
          </button>
        </div>
        <p className="mt-2 text-sm italic text-dim">“{order.flavor}”</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Order constraints">
          {liveChecks.map((c, i) => (
            <li key={i} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${c.ok ? 'border-success/50 bg-success/10 text-success' : 'border-white/15 text-dim'}`}>
              {c.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {c.label}
            </li>
          ))}
        </ul>

        {/* Cauldron */}
        <div className="mt-4">
          <Cauldron items={items} brewing={brewing} />
          <div className="mt-2 flex justify-center gap-2" aria-label="Cauldron slots">
            {Array.from({ length: MAX_SLOTS }).map((_, i) => {
              const it = items[i]
              const Icon = it ? ICONS[it.icon] : Plus
              return (
                <button
                  key={i}
                  onClick={() => it && removeAt(i)}
                  disabled={!it || busy || !!result}
                  aria-label={it ? `Remove ${it.name}` : `Empty slot ${i + 1}`}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${it ? 'border-white/25 bg-white/10 hover:border-danger/60' : 'border-dashed border-white/15 text-dim'}`}
                  style={it ? { color: it.color } : undefined}
                >
                  <Icon size={20} />
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex justify-center">
            {result ? (
              result.success ? (
                <Button onClick={advance}>Next order <SkipForward size={15} /></Button>
              ) : result.orderLost ? (
                <Button variant="secondary" onClick={advance}>Order lost — next customer</Button>
              ) : (
                <Button variant="secondary" onClick={retry}><RotateCcw size={15} /> Try again ({3 - attempt} left)</Button>
              )
            ) : (
              <Button onClick={brew} disabled={busy || !cauldron.length}>
                <FlaskConical size={16} /> {brewing ? 'Brewing…' : 'Brew'}
              </Button>
            )}
          </div>
        </div>

        {/* Brew result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-4 rounded-2xl border p-4 text-sm ${result.success ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10'}`}>
              <b className={result.success ? 'text-success' : 'text-danger'}>
                {result.success ? `Perfect brew! +${result.pts} pts. The guild restocks +1 of every ingredient.` : result.orderLost ? 'Third failure — the customer storms out. Ingredients wasted.' : 'The brew fails. Ingredients wasted.'}
              </b>
              <ul className="mt-2 space-y-1">
                {result.checks.map((c, i) => (
                  <li key={i} className={`flex items-center gap-2 ${c.ok ? 'text-success' : 'text-danger'}`}>
                    {c.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {c.label}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ingredient shelf */}
      <div className="mt-4 glass rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-dim">Ingredient shelf</h3>
          <span className="inline-flex items-center gap-1 text-xs text-dim"><Package size={13} /> {totalStock} in stock</span>
        </div>
        <p className="mt-1 text-xs text-dim">Properties are hidden. <b className="text-ink">Test</b> an ingredient (costs 1) to reveal its element, then potency, then toxicity. <b className="text-ink">Add</b> it to the cauldron to brew.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INGREDIENTS.map((ing) => {
            const Icon = ICONS[ing.icon]
            const known = revealed[ing.id]
            const ElIcon = ELEMENT_ICONS[ing.element]
            return (
              <div key={ing.id} className="rounded-2xl border border-white/10 bg-panel/70 p-3">
                <div className="flex items-center gap-2">
                  <Icon size={18} style={{ color: ing.color }} />
                  <span className="truncate text-sm font-semibold text-ink">{ing.name}</span>
                  <span className="ml-auto text-xs text-dim">×{stock[ing.id]}</span>
                </div>
                <div className="mt-2 flex min-h-[22px] flex-wrap gap-1">
                  {PROP_ORDER.map((p, pi) => {
                    if (pi >= known) return <span key={p} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-dim">?</span>
                    if (p === 'element') return <span key={p} className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] ${ELEMENT_TONES[ing.element]}`}><ElIcon size={10} /> {ing.element}</span>
                    if (p === 'potency') return <span key={p} className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] text-violet-soft">pow {ing.potency}</span>
                    return <span key={p} className={`rounded-full px-2 py-0.5 text-[10px] ${ing.toxicity > 0 ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>tox {ing.toxicity}</span>
                  })}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => add(ing.id)} disabled={busy || !!result || stock[ing.id] <= 0 || cauldron.length >= MAX_SLOTS} className="flex-1 rounded-lg bg-violet/20 px-2 py-1.5 text-xs font-medium text-violet-soft hover:bg-violet/30 disabled:opacity-40" aria-label={`Add ${ing.name} to cauldron`}>
                    <Plus size={12} className="mr-0.5 inline" /> Add
                  </button>
                  <button onClick={() => test(ing.id)} disabled={busy || !!result || stock[ing.id] <= 0 || known >= PROP_ORDER.length} className="flex-1 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-dim hover:text-ink disabled:opacity-40" aria-label={`Test ${ing.name}, costs 1 stock`}>
                    <TestTube size={12} className="mr-0.5 inline" /> Test
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Frame>
  )
}
