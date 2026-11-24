import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BatteryMedium, Combine, Delete, DoorOpen, Flashlight, KeyRound, Lightbulb,
  Lock, StickyNote, Timer, X, Zap,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Stat, rand, pick, shuffle, clamp } from './ui.jsx'
import useCountdown from '../engine/useCountdown'

// ---------------------------------------------------------------------------
// Hidden state: every clue is computed from the same room object, so the
// bookshelf count, painting number, note digit and UV sequence always match
// the locks they open. Nothing is hardcoded against a mismatched key.
// ---------------------------------------------------------------------------

const SYMBOLS = [
  { id: 'moon', glyph: '\u263E', name: 'Moon' },
  { id: 'star', glyph: '\u2605', name: 'Star' },
  { id: 'triangle', glyph: '\u25B2', name: 'Triangle' },
  { id: 'diamond', glyph: '\u25C6', name: 'Diamond' },
]
const DIGITS = Array.from({ length: 10 }, (_, i) => ({ id: String(i), label: String(i), key: String(i), aria: `Digit ${i}` }))
const SAFE_KEYS = SYMBOLS.map((s, i) => ({ ...s, key: String(i + 1), aria: s.name }))
const TOTALS = [720, 540, 420] // seconds per level
const HOTSPOT_LABELS = {
  window: 'Window', shelf: 'Bookshelf', painting: 'Painting', patch: 'Bare wall',
  safe: 'Safe', desk: 'Desk drawer', door: 'Exit door', rug: 'Rug',
}

const LAYOUTS = [
  {
    name: 'The Study',
    wallTop: '#262e4e', wallBottom: '#1a2038', floor: '#33291f', rugColor: '#5b3a5e',
    spots: {
      window: { x: 55, y: 45, w: 120, h: 140 },
      shelf: { x: 30, y: 120, w: 150, h: 260 },
      painting: { x: 350, y: 75, w: 110, h: 90 },
      patch: { x: 540, y: 120, w: 90, h: 90 },
      safe: { x: 215, y: 290, w: 90, h: 90 },
      desk: { x: 330, y: 270, w: 180, h: 110 },
      door: { x: 660, y: 150, w: 110, h: 230 },
      rug: { x: 290, y: 402, w: 260, h: 76 },
    },
  },
  {
    name: 'The Attic Office',
    wallTop: '#2e2a4a', wallBottom: '#1e1b33', floor: '#2b2620', rugColor: '#3a5e5b',
    spots: {
      door: { x: 30, y: 150, w: 110, h: 230 },
      desk: { x: 180, y: 270, w: 180, h: 110 },
      painting: { x: 200, y: 75, w: 110, h: 90 },
      patch: { x: 420, y: 130, w: 90, h: 90 },
      safe: { x: 520, y: 290, w: 90, h: 90 },
      shelf: { x: 640, y: 120, w: 150, h: 260 },
      window: { x: 630, y: 45, w: 120, h: 140 },
      rug: { x: 300, y: 402, w: 260, h: 76 },
    },
  },
]

function makeRoom() {
  const layout = LAYOUTS[rand(0, 1)]
  const redCount = rand(2, 6)
  const paintingNum = rand(1, 9)
  const noteDigit = rand(0, 9)
  const reds = new Set(shuffle(Array.from({ length: 14 }, (_, i) => i)).slice(0, redCount))
  const palette = ['#3b6ea5', '#4a7c59', '#8a5a44', '#5b4a8a', '#a58a3b', '#446b8a']
  const books = Array.from({ length: 14 }, (_, i) => ({
    color: reds.has(i) ? '#c0392b' : pick(palette),
    h: rand(42, 58),
    w: rand(13, 16),
  }))
  return {
    layout, redCount, paintingNum, noteDigit, books,
    drawerCode: [redCount, paintingNum, noteDigit],
    safeSeq: shuffle(SYMBOLS.map((s) => s.id)),
  }
}

const itemMeta = (room) => ({
  note: { name: 'Scribbled note', Icon: StickyNote, desc: `A torn note in a hurried hand: \u201cThe last digit is ${room.noteDigit}. Books, canvas, note \u2014 in that order.\u201d` },
  battery: { name: 'Battery', Icon: BatteryMedium, desc: 'A heavy-duty battery, still warm from its hidey-hole under the rug.' },
  flashlight: { name: 'UV flashlight (dead)', Icon: Flashlight, desc: 'A UV flashlight from the drawer. The battery slot is empty \u2014 it needs power.' },
  uv: { name: 'UV flashlight', Icon: Zap, desc: 'A working UV flashlight. Violet light makes hidden ink glow. Try it on the bare wall.' },
  key: { name: 'Brass key', Icon: KeyRound, desc: 'A brass key from the safe. It looks exactly like a door key.' },
})

const fmt = (s) => {
  const t = Math.max(0, Math.ceil(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2 } }

function hintFor(room, flags, inv, used) {
  const has = (id) => inv.includes(id)
  const ladder = [
    { id: 'd1', when: !flags.drawerOpen, text: 'The desk scratch gives the order: red books, the canvas\u2019s secret, the note underfoot. Count the red spines, look behind the painting, lift the rug.' },
    { id: 'd2', when: !flags.drawerOpen, text: `The padlock code is ${room.drawerCode.join(' \u2013 ')}.` },
    { id: 'p1', when: flags.drawerOpen && !has('uv') && !has('battery'), text: 'The drawer\u2019s flashlight is dead. Something under the rug could power it.' },
    { id: 'p2', when: flags.drawerOpen && !has('uv') && has('battery'), text: 'Press Combine in your inventory: flashlight + battery = a working UV light.' },
    { id: 'w1', when: has('uv') && !flags.safeOpen && !flags.wallRevealed, text: 'Bare plaster hides UV ink. Inspect the plain wall patch with the UV flashlight in your pocket.' },
    { id: 'w2', when: has('uv') && !flags.safeOpen, text: `The safe sequence is ${room.safeSeq.map((id) => SYMBOLS.find((s) => s.id === id).name).join(' \u2192 ')}.` },
    { id: 'k1', when: flags.safeOpen, text: 'The brass key fits the exit door. Inspect the door and use it.' },
  ]
  return ladder.find((h) => h.when && !used.includes(h.id))
    || { id: 'misc', text: 'Re-read the note in your inventory, and inspect anything you haven\u2019t touched yet.' }
}

// ------------------------------- SVG scene --------------------------------

function WindowSvg({ s }) {
  return (
    <g transform={`translate(${s.x},${s.y})`}>
      <rect x="-6" y="138" width="132" height="10" rx="3" fill="#3d466b" />
      <rect width="120" height="140" rx="6" fill="#141b33" stroke="#3d466b" strokeWidth="5" />
      <rect x="8" y="8" width="104" height="124" fill="url(#er-night)" />
      <circle cx="88" cy="34" r="12" fill="#e8e4d0" opacity="0.9" />
      <circle cx="82" cy="30" r="10" fill="url(#er-night)" opacity="0.55" />
      <g stroke="#7f9cc9" strokeWidth="2" opacity="0.3">
        <line x1="24" y1="20" x2="18" y2="44" /><line x1="42" y1="60" x2="36" y2="84" />
        <line x1="92" y1="82" x2="86" y2="106" /><line x1="30" y1="96" x2="24" y2="120" />
        <line x1="76" y1="16" x2="70" y2="40" />
      </g>
      <line x1="60" y1="8" x2="60" y2="132" stroke="#3d466b" strokeWidth="5" />
      <line x1="8" y1="70" x2="112" y2="70" stroke="#3d466b" strokeWidth="5" />
    </g>
  )
}

function ShelfSvg({ s, books }) {
  const rows = [books.slice(0, 7), books.slice(7)]
  return (
    <g transform={`translate(${s.x},${s.y})`}>
      <rect x="-4" y="-8" width="158" height="10" rx="3" fill="#5a4232" />
      <rect width="150" height="260" rx="4" fill="#4a3527" />
      <rect x="8" y="8" width="134" height="244" fill="#241812" />
      <rect x="8" y="126" width="134" height="8" fill="#5a4232" />
      {rows.map((row, r) => {
        let cx = 14
        const base = r === 0 ? 126 : 252
        return row.map((b, i) => {
          const x = cx
          cx += b.w + 2
          return (
            <g key={`${r}-${i}`}>
              <rect x={x} y={base - b.h} width={b.w} height={b.h} rx="2" fill={b.color} />
              <rect x={x + 2} y={base - b.h + 5} width="2" height={b.h - 10} fill="#ffffff" opacity="0.14" />
            </g>
          )
        })
      })}
    </g>
  )
}

function PaintingSvg({ s, flipped, num }) {
  return (
    <g transform={`translate(${s.x},${s.y})`}>
      <rect width="110" height="90" rx="3" fill="#8a6d3b" />
      {flipped ? (
        <>
          <rect x="6" y="6" width="98" height="78" fill="#6b5a44" />
          <text x="55" y="60" textAnchor="middle" fontSize="44" fontFamily="monospace" fill="#efe9d8">{num}</text>
          <line x1="16" y1="72" x2="94" y2="72" stroke="#efe9d8" strokeWidth="1" opacity="0.3" />
        </>
      ) : (
        <>
          <rect x="7" y="7" width="96" height="76" fill="url(#er-sea)" />
          <circle cx="80" cy="26" r="9" fill="#e8e4d0" opacity="0.85" />
          <path d="M7 56 Q 30 48 55 56 T 103 56" stroke="#9fc3d9" strokeWidth="2.5" fill="none" opacity="0.7" />
          <path d="M7 68 Q 30 60 55 68 T 103 68" stroke="#7fa8c9" strokeWidth="2.5" fill="none" opacity="0.6" />
        </>
      )}
    </g>
  )
}

function SafeSvg({ s, open }) {
  return (
    <g transform={`translate(${s.x},${s.y})`}>
      <rect width="90" height="90" rx="6" fill="#323b5c" stroke="#4a5578" strokeWidth="3" />
      {open ? (
        <>
          <rect x="10" y="10" width="70" height="70" rx="3" fill="#10142a" />
          <rect x="-18" y="8" width="26" height="74" rx="3" fill="#262e4a" stroke="#4a5578" strokeWidth="2" />
          <circle cx="72" cy="18" r="3" fill="#4ade80" />
        </>
      ) : (
        <>
          <rect x="8" y="8" width="74" height="74" rx="3" fill="#262e4a" />
          <circle cx="45" cy="40" r="14" fill="none" stroke="#8f9bc0" strokeWidth="3" />
          <line x1="45" y1="40" x2="45" y2="28" stroke="#8f9bc0" strokeWidth="3" />
          <rect x="58" y="58" width="16" height="6" rx="3" fill="#8f9bc0" />
          <circle cx="20" cy="18" r="3" fill="#f87171" />
        </>
      )}
    </g>
  )
}

function DeskSvg({ s, open }) {
  return (
    <g transform={`translate(${s.x},${s.y})`}>
      <rect x="6" y="14" width="10" height="96" fill="#3d2f24" />
      <rect x="164" y="14" width="10" height="96" fill="#3d2f24" />
      <rect x="30" y="16" width="120" height="52" rx="3" fill="#4a3527" />
      {open ? (
        <>
          <rect x="36" y="22" width="108" height="16" fill="#1c130d" />
          <rect x="32" y="38" width="116" height="34" rx="3" fill="#5a4232" />
          <rect x="78" y="52" width="24" height="5" rx="2.5" fill="#c9a227" />
        </>
      ) : (
        <>
          <rect x="36" y="22" width="108" height="40" rx="3" fill="#5a4232" />
          <rect x="78" y="38" width="24" height="5" rx="2.5" fill="#c9a227" />
          <path d="M84 52 v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="#c9a227" strokeWidth="3" />
          <rect x="80" y="52" width="20" height="14" rx="3" fill="#c9a227" />
        </>
      )}
      <rect width="180" height="14" rx="4" fill="#5a4232" />
      <path d="M150 0 v-26 q0 -10 -12 -10" stroke="#8f9bc0" strokeWidth="3" fill="none" />
      <circle cx="132" cy="-34" r="7" fill="#f5d78e" />
      <rect x="14" y="-10" width="34" height="6" rx="2" fill="#3b6ea5" />
      <rect x="18" y="-16" width="28" height="6" rx="2" fill="#8a5a44" />
    </g>
  )
}

function DoorSvg({ s, escaped }) {
  return (
    <g transform={`translate(${s.x},${s.y})`}>
      <rect width="110" height="230" rx="4" fill="#3d2f24" />
      {escaped ? (
        <>
          <rect x="6" y="6" width="98" height="218" fill="#f5e9c8" opacity="0.9" />
          <polygon points="6,6 40,16 40,214 6,224" fill="#5a4232" />
        </>
      ) : (
        <>
          <rect x="6" y="6" width="98" height="218" rx="3" fill="#5a4232" />
          <rect x="16" y="20" width="78" height="80" rx="3" fill="none" stroke="#3d2f24" strokeWidth="3" />
          <rect x="16" y="116" width="78" height="90" rx="3" fill="none" stroke="#3d2f24" strokeWidth="3" />
          <circle cx="88" cy="112" r="5" fill="#c9a227" />
          <circle cx="88" cy="126" r="3" fill="#c9a227" />
          <rect x="86.5" y="126" width="3" height="8" fill="#c9a227" />
        </>
      )}
    </g>
  )
}

function RugSvg({ s, lifted, color }) {
  const cx = s.x + s.w / 2
  const cy = s.y + s.h / 2
  return (
    <g transform={lifted ? `rotate(-7 ${cx} ${cy})` : undefined}>
      <ellipse cx={cx} cy={cy} rx="130" ry="38" fill={color} />
      <ellipse cx={cx} cy={cy} rx="100" ry="27" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.14" />
      <ellipse cx={cx} cy={cy} rx="60" ry="16" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.1" />
      {lifted && <path d={`M ${cx + 88} ${cy + 18} q 30 -18 42 -2 q -18 16 -42 2`} fill="#ffffff" opacity="0.15" />}
    </g>
  )
}

function PatchSvg({ s, revealed, seq }) {
  return (
    <g transform={`translate(${s.x},${s.y})`}>
      <rect width="90" height="90" rx="4" fill="#ffffff" opacity="0.03" />
      <rect width="90" height="90" rx="4" fill="none" stroke="#ffffff" opacity="0.07" strokeDasharray="4 4" />
      {revealed && seq.map((id, i) => (
        <text key={id} x={14 + i * 21} y="55" fontSize="20" textAnchor="middle" fill="#b48cff">{SYMBOLS.find((s) => s.id === id).glyph}</text>
      ))}
    </g>
  )
}

function RoomScene({ room, flags, escaped }) {
  const L = room.layout
  const P = L.spots
  return (
    <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="er-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={L.wallTop} /><stop offset="100%" stopColor={L.wallBottom} />
        </linearGradient>
        <linearGradient id="er-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e1630" /><stop offset="100%" stopColor="#233457" />
        </linearGradient>
        <linearGradient id="er-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a4a6b" /><stop offset="100%" stopColor="#16324f" />
        </linearGradient>
      </defs>
      <rect width="800" height="380" fill="url(#er-wall)" />
      <rect y="380" width="800" height="120" fill={L.floor} />
      <g stroke="#000000" opacity="0.15" strokeWidth="2">
        <line x1="0" y1="412" x2="800" y2="412" /><line x1="0" y1="444" x2="800" y2="444" /><line x1="0" y1="476" x2="800" y2="476" />
      </g>
      <rect y="374" width="800" height="8" fill="#000000" opacity="0.25" />
      <WindowSvg s={P.window} />
      <PatchSvg s={P.patch} revealed={flags.wallRevealed} seq={room.safeSeq} />
      <PaintingSvg s={P.painting} flipped={flags.paintingFlipped} num={room.paintingNum} />
      <ShelfSvg s={P.shelf} books={room.books} />
      <SafeSvg s={P.safe} open={flags.safeOpen} />
      <DeskSvg s={P.desk} open={flags.drawerOpen} />
      <DoorSvg s={P.door} escaped={escaped} />
      <RugSvg s={P.rug} lifted={flags.rugLifted} color={L.rugColor} />
    </svg>
  )
}

// -------------------------------- Keypad ----------------------------------

function Keypad({ symbols, length, onTry }) {
  const [entry, setEntry] = useState([])
  const [err, setErr] = useState(0)
  const add = (id) => setEntry((e) => (e.length < length ? [...e, id] : e))
  const del = () => setEntry((e) => e.slice(0, -1))
  const submit = () => {
    if (entry.length !== length) return
    if (!onTry(entry)) { setErr((n) => n + 1); setEntry([]) }
  }
  const api = useRef({})
  api.current = { add, del, submit }
  useEffect(() => {
    const h = (e) => {
      const s = symbols.find((s) => s.key === e.key)
      if (s) { e.preventDefault(); api.current.add(s.id) }
      else if (e.key === 'Backspace') api.current.del()
      else if (e.key === 'Enter') api.current.submit()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [symbols])
  const wide = symbols.length > 4
  return (
    <div>
      <motion.div key={err} animate={err ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }} className="flex justify-center gap-2" aria-label="Code entry">
        {Array.from({ length }, (_, i) => {
          const s = symbols.find((s) => s.id === entry[i])
          return (
            <span key={i} className={`grid h-12 w-10 place-items-center rounded-lg border font-mono text-xl ${s ? 'border-violet bg-violet/20 text-ink' : 'border-dashed border-white/20 text-dim'}`}>
              {s ? (s.glyph || s.label) : '\u00B7'}
            </span>
          )
        })}
      </motion.div>
      {err > 0 && <p className="mt-2 text-center text-xs text-danger">The lock doesn&rsquo;t budge.</p>}
      <div className={`mt-4 grid gap-2 ${wide ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {symbols.map((s) => (
          <button key={s.id} type="button" onClick={() => add(s.id)} aria-label={s.aria}
            className="glass rounded-xl py-3 font-mono text-lg text-ink transition hover:border-violet/60">
            {s.glyph || s.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={del} disabled={entry.length === 0}><Delete size={15} /> Delete</Button>
        <Button size="sm" className="flex-1" onClick={submit} disabled={entry.length !== length}>Enter</Button>
      </div>
    </div>
  )
}

// --------------------------------- Game -----------------------------------

export default function EscapeRoom({ level = 1, onFinish }) {
  const lvl = clamp(level ?? 1, 0, 2)
  const total = TOTALS[lvl]
  const [room] = useState(makeRoom)
  const [flags, setFlags] = useState({ drawerOpen: false, safeOpen: false, paintingFlipped: false, rugLifted: false, wallRevealed: false })
  const [inventory, setInventory] = useState([])
  const [found, setFound] = useState([])
  const [inspected, setInspected] = useState([])
  const [panel, setPanel] = useState(null)
  const [hintsLog, setHintsLog] = useState([])
  const [msg, setMsg] = useState('The door locked behind you. Click anything in the room to inspect it.')
  const [over, setOver] = useState(null) // null | 'won' | 'lost'

  const finishedRef = useRef(false)
  const finishRef = useRef(null)
  const finishTimer = useRef(null)
  const left = useCountdown(total, { running: !over, onEnd: () => finishRef.current?.(false) })

  const meta = itemMeta(room)
  const locks = (flags.drawerOpen ? 1 : 0) + (flags.safeOpen ? 1 : 0) + (over === 'won' ? 1 : 0)
  const canCombine = inventory.includes('flashlight') && inventory.includes('battery')

  const gain = (ids) => {
    setInventory((inv) => [...inv, ...ids.filter((id) => !inv.includes(id))])
    setFound((f) => [...f, ...ids.filter((id) => !f.includes(id))])
  }

  const finish = (won) => {
    if (finishedRef.current) return
    finishedRef.current = true
    setOver(won ? 'won' : 'lost')
    setPanel(null)
    const opened = (flags.drawerOpen ? 1 : 0) + (flags.safeOpen ? 1 : 0) + (won ? 1 : 0)
    const elapsed = total - left
    const hintCost = hintsLog.length * 50
    const score = won
      ? clamp(Math.round(1000 - 400 * (elapsed / total)) - hintCost, 0, 1000)
      : clamp(opened * 150 - hintCost, 0, 450)
    const result = {
      score,
      rating: score / 1000,
      won,
      summary: won
        ? `Escaped ${room.layout.name} with ${fmt(left)} to spare.`
        : `Time ran out in ${room.layout.name} \u2014 ${opened} of 3 locks opened.`,
      stats: [
        { label: 'Locks opened', value: `${opened}/3` },
        { label: 'Hints used', value: `${hintsLog.length}/3` },
        { label: 'Time left', value: fmt(left) },
        { label: 'Items found', value: found.length },
      ],
    }
    finishTimer.current = setTimeout(() => onFinish(result), won ? 1100 : 1500)
  }
  finishRef.current = finish
  useEffect(() => () => clearTimeout(finishTimer.current), [])

  useEffect(() => {
    if (!panel) return
    const h = (e) => { if (e.key === 'Escape') setPanel(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [panel])

  const inspect = (id) => {
    if (over) return
    setInspected((s) => (s.includes(id) ? s : [...s, id]))
    if (id === 'patch' && inventory.includes('uv') && !flags.wallRevealed) {
      setFlags((f) => ({ ...f, wallRevealed: true }))
      setMsg('The UV beam catches hidden ink on the plaster.')
    }
    setPanel({ kind: id })
  }

  const tryDrawer = (code) => {
    if (code.join('') === room.drawerCode.join('')) {
      setFlags((f) => ({ ...f, drawerOpen: true }))
      gain(['flashlight'])
      setMsg('The padlock clicks open.')
      setPanel({ kind: 'found', item: 'flashlight' })
      return true
    }
    setMsg('The padlock doesn\u2019t budge.')
    return false
  }
  const trySafe = (seq) => {
    if (seq.join(',') === room.safeSeq.join(',')) {
      setFlags((f) => ({ ...f, safeOpen: true }))
      gain(['key'])
      setMsg('The safe door swings wide.')
      setPanel({ kind: 'found', item: 'key' })
      return true
    }
    setMsg('The safe stays shut.')
    return false
  }
  const combine = () => {
    setInventory((inv) => [...inv.filter((i) => i !== 'flashlight' && i !== 'battery'), 'uv'])
    setFound((f) => (f.includes('uv') ? f : [...f, 'uv']))
    setMsg('The UV flashlight hums to life. Try it on the bare wall.')
  }
  const liftRug = () => {
    setFlags((f) => ({ ...f, rugLifted: true }))
    gain(['battery', 'note'])
    setMsg('Under the rug: a battery and a scribbled note.')
  }
  const flipPainting = () => {
    setFlags((f) => ({ ...f, paintingFlipped: true }))
    setMsg(`Chalked on the backing board: ${room.paintingNum}.`)
  }
  const useHint = () => {
    if (over || hintsLog.length >= 3) return
    const h = hintFor(room, flags, inventory, hintsLog)
    setHintsLog((l) => [...l, h.id])
    setPanel({ kind: 'hint', text: h.text })
  }
  const escape = () => { setMsg('The brass key turns\u2026'); finish(true) }

  // ---- panel content ----
  let panelTitle = ''
  let panelBody = null
  if (panel) {
    switch (panel.kind) {
      case 'desk':
        panelTitle = 'The desk'
        panelBody = (
          <>
            <p>A heavy oak desk. Scratched into the wood: <b className="text-ink">&ldquo;Books &middot; canvas &middot; note &mdash; in that order.&rdquo;</b></p>
            {flags.drawerOpen
              ? <p className="mt-2">The drawer hangs open, empty now.</p>
              : <>
                <p className="mt-2">A 3-digit padlock seals the drawer.</p>
                <Button size="sm" className="mt-3" onClick={() => setPanel({ kind: 'padlock' })}><Lock size={15} /> Try the padlock</Button>
              </>}
          </>
        )
        break
      case 'padlock':
        panelTitle = 'Drawer padlock'
        panelBody = (
          <>
            <p className="mb-3">Three digits. The desk scratch says: books, canvas, note.</p>
            <Keypad symbols={DIGITS} length={3} onTry={tryDrawer} />
          </>
        )
        break
      case 'shelf':
        panelTitle = 'The bookshelf'
        panelBody = <p>Two rows of tired volumes. Exactly <b className="text-ink">{room.redCount} spines</b> are bound in red. Someone has been counting them &mdash; the dust is disturbed.</p>
        break
      case 'painting':
        panelTitle = 'The painting'
        panelBody = flags.paintingFlipped
          ? <p>Behind the canvas, chalked large on the backing board: <b className="font-display text-2xl text-ink">{room.paintingNum}</b></p>
          : <>
            <p>A moonlit seascape in a gilt frame. The canvas hangs slightly loose, as if it has been lifted before.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={flipPainting}>Look behind the canvas</Button>
          </>
        break
      case 'window':
        panelTitle = 'The window'
        panelBody = <p>Rain streaks the glass. The window is painted shut &mdash; no way out this way. The storm outside is getting worse.</p>
        break
      case 'rug':
        panelTitle = 'The rug'
        panelBody = flags.rugLifted
          ? <p>The rug lies folded back. You already took the battery and the note reading <b className="text-ink">&ldquo;{room.noteDigit}&rdquo;</b>.</p>
          : <>
            <p>A threadbare rug. One corner is curled up, just slightly, as if something is hidden underneath.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={liftRug}>Lift the rug</Button>
          </>
        break
      case 'patch':
        panelTitle = 'The bare wall'
        panelBody = flags.wallRevealed
          ? <>
            <p>Under the violet beam, four glyphs burn on the plaster:</p>
            <div className="mt-3 flex justify-center gap-5 rounded-xl bg-violet/15 p-4 text-3xl text-violet-soft">
              {room.safeSeq.map((id) => <span key={id}>{SYMBOLS.find((s) => s.id === id).glyph}</span>)}
            </div>
            <p className="mt-2 text-center text-xs">Left to right. The safe takes four symbols.</p>
          </>
          : <p>Bare plaster between the furniture. Faint smudges &mdash; like wiped-away ink. Ordinary light shows nothing. Something here needs a different kind of light.</p>
        break
      case 'safe':
        panelTitle = 'The safe'
        panelBody = flags.safeOpen
          ? <p>The safe stands open and empty. You already took the brass key.</p>
          : <>
            <p>A steel safe with a four-symbol dial. No keyhole &mdash; it wants a sequence.</p>
            <Button size="sm" className="mt-3" onClick={() => setPanel({ kind: 'safekey' })}><Lock size={15} /> Enter the sequence</Button>
          </>
        break
      case 'safekey':
        panelTitle = 'Safe dial'
        panelBody = (
          <>
            <p className="mb-3">Four symbols, in the right order.</p>
            <Keypad symbols={SAFE_KEYS} length={4} onTry={trySafe} />
          </>
        )
        break
      case 'door':
        panelTitle = 'The exit door'
        panelBody = inventory.includes('key')
          ? <>
            <p>A solid door with a brass keyhole. The key from the safe is warm in your pocket.</p>
            <Button className="mt-3" onClick={escape}><DoorOpen size={16} /> Unlock the door</Button>
          </>
          : <p>A solid door with a brass keyhole. Locked tight. Somewhere in this room there must be a key.</p>
        break
      case 'found': {
        const m = meta[panel.item]
        panelTitle = `Found: ${m.name}`
        panelBody = (
          <div className="text-center">
            <m.Icon size={40} className="mx-auto text-cyan" />
            <p className="mt-3">{m.desc}</p>
          </div>
        )
        break
      }
      case 'item': {
        const m = meta[panel.item]
        panelTitle = m.name
        panelBody = (
          <>
            <p>{m.desc}</p>
            {panel.item === 'note' && <div className="mt-3 text-center font-display text-5xl font-bold text-gradient">{room.noteDigit}</div>}
          </>
        )
        break
      }
      case 'hint':
        panelTitle = 'Hint (\u221250 points)'
        panelBody = (
          <div>
            <Lightbulb size={28} className="text-warn" />
            <p className="mt-2 text-ink">{panel.text}</p>
          </div>
        )
        break
      default:
        break
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-dim">Escape room</div>
          <h2 className="font-display text-lg font-bold text-ink">{room.layout.name}</h2>
        </div>
        <div className="flex gap-2">
          <Stat label="Time" value={fmt(left)} tone={left <= 60 ? 'text-danger' : left <= 180 ? 'text-warn' : ''} />
          <Stat label="Locks" value={`${locks}/3`} />
          <Stat label="Hints" value={3 - hintsLog.length} />
        </div>
      </div>

      <div className="glass rounded-3xl p-3 sm:p-5">
        <div className="relative aspect-[8/5] w-full overflow-hidden rounded-2xl border border-white/10">
          <RoomScene room={room} flags={flags} escaped={over === 'won'} />
          {Object.entries(room.layout.spots).map(([id, s]) => (
            <button key={id} type="button" onClick={() => inspect(id)} disabled={!!over}
              aria-label={`Inspect ${HOTSPOT_LABELS[id]}`}
              className="absolute rounded-xl border-2 border-transparent transition hover:border-violet/70 hover:bg-violet/10 focus-visible:border-violet focus-visible:outline-none disabled:pointer-events-none"
              style={{ left: `${s.x / 8}%`, top: `${s.y / 10}%`, width: `${s.w / 8}%`, height: `${s.h / 10}%` }}>
              {!inspected.includes(id) && !over && <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-violet/80" />}
            </button>
          ))}
          <AnimatePresence>
            {over && (
              <motion.div key="banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`absolute inset-0 z-10 grid place-items-center p-4 backdrop-blur-[2px] ${over === 'won' ? 'bg-success/15' : 'bg-danger/15'}`}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  className={`glass rounded-2xl border p-4 text-center ${over === 'won' ? 'border-success/50' : 'border-danger/50'}`}>
                  {over === 'won' ? <DoorOpen className="mx-auto text-success" size={32} /> : <Timer className="mx-auto text-danger" size={32} />}
                  <p className="mt-2 font-display font-bold">
                    {over === 'won' ? 'The door swings open \u2014 you\u2019re out!' : 'Time\u2019s up. The room keeps its secrets.'}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-panel/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-dim">Inventory</span>
            {canCombine && <Button size="sm" variant="secondary" onClick={combine}><Combine size={14} /> Combine flashlight + battery</Button>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {inventory.length === 0 && <span className="text-xs text-dim">Pockets empty &mdash; search the room.</span>}
            {inventory.map((id) => {
              const m = meta[id]
              return (
                <button key={id} type="button" onClick={() => setPanel({ kind: 'item', item: id })}
                  className="glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-ink transition hover:border-violet/60">
                  <m.Icon size={15} className={id === 'uv' ? 'text-violet-soft' : 'text-cyan'} /> {m.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <AnimatePresence mode="wait">
            <motion.p key={msg} {...fade} className="min-w-0 flex-1 text-xs text-dim sm:text-sm">{msg}</motion.p>
          </AnimatePresence>
          <Button size="sm" variant="secondary" onClick={useHint} disabled={!!over || hintsLog.length >= 3}>
            <Lightbulb size={15} /> Hint (&minus;50)
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {panel && (
          <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-void/70 p-4 backdrop-blur-sm" onClick={() => setPanel(null)}>
            <motion.div initial={{ scale: 0.92, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
              className="glass max-h-[82vh] w-full max-w-md overflow-y-auto rounded-3xl p-5" onClick={(e) => e.stopPropagation()}
              role="dialog" aria-modal="true" aria-label={panelTitle}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-ink">{panelTitle}</h3>
                <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="rounded-lg p-1.5 text-dim transition hover:bg-white/10 hover:text-ink"><X size={18} /></button>
              </div>
              <div className="mt-3 text-sm leading-relaxed text-dim">{panelBody}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
