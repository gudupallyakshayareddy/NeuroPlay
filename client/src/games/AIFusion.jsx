import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, Loader2, Sparkles, Crown, WifiOff, Plus } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'
import { api } from '../api.js'
import useCountdown from '../engine/useCountdown'

const SESSION_SECONDS = 90
const FUSIONS_BY_LEVEL = [15, 12, 10]
const WIN_DISCOVERIES = 8

const BASE_ITEMS = [
  { name: 'Water', emoji: '💧', desc: 'The source of all life.' },
  { name: 'Fire', emoji: '🔥', desc: 'Hungry, warm, and a little dangerous.' },
  { name: 'Earth', emoji: '🌍', desc: 'Patient stone and soil.' },
  { name: 'Air', emoji: '🌬️', desc: 'Invisible, everywhere, always moving.' },
]

// Authored offline combination table. Keys are the two lowercased names, sorted, joined with '+'.
// Chains run many levels deep: e.g. Earth+Fire→Lava→Stone→Metal→Energy→Life→Lizard→Dragon.
const AUTHORED = {
  'air+fire': { name: 'Smoke', emoji: '💨', desc: 'Hot air carrying the memory of flame.' },
  'earth+fire': { name: 'Lava', emoji: '🌋', desc: 'The earth, melted and furious.' },
  'earth+water': { name: 'Mud', emoji: '🟤', desc: 'Soft, squishy, and full of potential.' },
  'air+water': { name: 'Mist', emoji: '🌫️', desc: 'Water that learned to float.' },
  'fire+water': { name: 'Steam', emoji: '♨️', desc: 'Water, excited beyond its limits.' },
  'air+earth': { name: 'Dust', emoji: '🏜️', desc: 'Tiny mountains, drifting on the wind.' },
  'air+steam': { name: 'Cloud', emoji: '☁️', desc: 'Steam that climbed too high and stayed.' },
  'cloud+water': { name: 'Rain', emoji: '🌧️', desc: 'The sky returning what it borrowed.' },
  'earth+rain': { name: 'Plant', emoji: '🌱', desc: 'The first green answer to an empty world.' },
  'fire+plant': { name: 'Coal', emoji: '⚫', desc: 'Ancient sunlight, pressed into black stone.' },
  'fire+mud': { name: 'Brick', emoji: '🧱', desc: 'Mud that survived the kiln.' },
  'lava+water': { name: 'Stone', emoji: '🪨', desc: 'Lava, cooled and humbled.' },
  'air+stone': { name: 'Sand', emoji: '🏖️', desc: 'Stone, patiently taken apart by the wind.' },
  'fire+sand': { name: 'Glass', emoji: '🪟', desc: 'Sand made transparent by heat.' },
  'plant+water': { name: 'Tree', emoji: '🌳', desc: 'A plant with ambition.' },
  'air+tree': { name: 'Leaf', emoji: '🍃', desc: 'A tree’s solar panel, loose in the breeze.' },
  'leaf+water': { name: 'Tea', emoji: '🍵', desc: 'Civilization in a cup.' },
  'fire+stone': { name: 'Metal', emoji: '⚙️', desc: 'What the stone was hiding all along.' },
  'fire+metal': { name: 'Steel', emoji: '🔧', desc: 'Metal, forged into something trustworthy.' },
  'cloud+fire': { name: 'Lightning', emoji: '⚡', desc: 'The sky’s shortest, loudest sentence.' },
  'lightning+metal': { name: 'Energy', emoji: '🔋', desc: 'Lightning, caught and tamed in a wire.' },
  'energy+water': { name: 'Life', emoji: '🧬', desc: 'A spark in the right puddle. Everything starts here.' },
  'air+life': { name: 'Bird', emoji: '🐦', desc: 'Life that refused to stay on the ground.' },
  'bird+fire': { name: 'Phoenix', emoji: '🐦‍🔥', desc: 'LEGENDARY — a bird that burns, and returns.', legendary: true },
  'earth+life': { name: 'Lizard', emoji: '🦎', desc: 'Life, armored in patience and scales.' },
  'fire+lizard': { name: 'Dragon', emoji: '🐉', desc: 'LEGENDARY — the lizard that answered fire with fire.', legendary: true },
  'energy+stone': { name: 'Golem', emoji: '🗿', desc: 'LEGENDARY — stone, woken up and given a purpose.', legendary: true },
  'life+water': { name: 'Fish', emoji: '🐟', desc: 'Life that went swimming and never came back.' },
  'air+cloud': { name: 'Storm', emoji: '🌪️', desc: 'Clouds with somewhere to be.' },
  'fish+storm': { name: 'Kraken', emoji: '🐙', desc: 'LEGENDARY — a fish the storm rewrote into a monster.', legendary: true },
  'energy+metal': { name: 'Robot', emoji: '🤖', desc: 'LEGENDARY — metal that thinks, or close enough.', legendary: true },
  'energy+fire': { name: 'Star', emoji: '⭐', desc: 'LEGENDARY — pure energy, set alight and hung in the sky.', legendary: true },
  'fire+glass': { name: 'Lens', emoji: '🔍', desc: 'Glass with a point of view.' },
  'lens+star': { name: 'Telescope', emoji: '🔭', desc: 'A way to eavesdrop on the universe.' },
  'cloud+stone': { name: 'Pressure', emoji: '🗜️', desc: 'The weight of the sky, leaning on rock.' },
  'coal+pressure': { name: 'Diamond', emoji: '💎', desc: 'Coal that endured long enough to shine.' },
  'earth+tree': { name: 'Forest', emoji: '🌲', desc: 'Trees, organizing.' },
  'fire+tree': { name: 'Campfire', emoji: '🏕️', desc: 'A tree’s warm farewell.' },
  'bird+water': { name: 'Duck', emoji: '🦆', desc: 'A bird with a boat mode.' },
  'bird+stone': { name: 'Egg', emoji: '🥚', desc: 'A bird, pre-assembled.' },
  'egg+fire': { name: 'Omelette', emoji: '🍳', desc: 'The egg’s most delicious destiny.' },
  'fire+fish': { name: 'Sushi', emoji: '🍣', desc: 'The catch of the day, dressed for dinner.' },
  'air+mist': { name: 'Frost', emoji: '❄️', desc: 'Mist, caught freezing mid-air.' },
  'frost+water': { name: 'Ice', emoji: '🧊', desc: 'Water, holding very still.' },
  'brick+stone': { name: 'House', emoji: '🏠', desc: 'The first place worth calling home.' },
  'energy+house': { name: 'City', emoji: '🌆', desc: 'Houses, multiplied and electrified.' },
  'dust+water': { name: 'Clay', emoji: '🏺', desc: 'Dust that remembers every shape you give it.' },
  'clay+fire': { name: 'Pottery', emoji: '🫖', desc: 'Clay, made permanent.' },
  'metal+water': { name: 'Rust', emoji: '🟠', desc: 'Metal’s slow, orange surrender.' },
  'bird+metal': { name: 'Plane', emoji: '✈️', desc: 'A bird that traded feathers for rivets.' },
  'energy+glass': { name: 'Neon', emoji: '💡', desc: 'Glass, glowing with borrowed lightning.' },
  'life+stone': { name: 'Fossil', emoji: '🦴', desc: 'Life, filed away in the rock record.' },
  'fossil+life': { name: 'Dinosaur', emoji: '🦖', desc: 'The fossil record, roaring back.' },
  'storm+water': { name: 'Flood', emoji: '🌊', desc: 'The storm’s aftermath, spreading.' },
  'earth+flood': { name: 'Island', emoji: '🏝️', desc: 'Earth that refused to drown.' },
  'island+life': { name: 'Crab', emoji: '🦀', desc: 'Life, armored and sideways.' },
  'glass+metal': { name: 'Mirror', emoji: '🪞', desc: 'Glass that tells the truth, ruthlessly.' },
  'mirror+star': { name: 'Galaxy', emoji: '🌌', desc: 'A star, reflected until it became billions.' },
}
const LEGENDARY_NAMES = new Set(['dragon', 'phoenix', 'golem', 'kraken', 'robot', 'star'])

// Deterministic fallback for any pair not in the authored table.
const hashStr = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h }
const GEN_TEMPLATES = [
  (a, b) => `${a}-touched ${b}`,
  (a, b) => `${a}-infused ${b}`,
  (a, b) => `${b} of ${a}`,
  (a, b) => `${a}-${b} alloy`,
  (a, b) => `Wild ${a} ${b}`,
  (a, b) => `${a}bound ${b}`,
]
const GEN_EMOJI = ['✨', '🔮', '🌀', '⚗️', '🧿', '🪄', '💠', '🎇']
const GEN_DESCS = [
  (a, b) => `Nobody expected ${a.toLowerCase()} and ${b.toLowerCase()} to mix. They did.`,
  (a, b) => `A strange new substance hums with the essence of ${a.toLowerCase()} and ${b.toLowerCase()}.`,
  (a, b) => `The lab notes just said “${a.toLowerCase()} + ${b.toLowerCase()} = ???” — now you know.`,
]
function localFuse(a, b) {
  const key = [a, b].map((s) => s.toLowerCase()).sort().join('+')
  if (AUTHORED[key]) return AUTHORED[key]
  const [x, y] = [a, b].sort((p, q) => p.toLowerCase().localeCompare(q.toLowerCase()))
  const h = hashStr(key)
  return {
    name: GEN_TEMPLATES[h % GEN_TEMPLATES.length](x, y),
    emoji: GEN_EMOJI[(h >>> 3) % GEN_EMOJI.length],
    desc: GEN_DESCS[(h >>> 6) % GEN_DESCS.length](x, y),
  }
}

export default function AIFusion({ level = 1, onFinish }) {
  const maxFusions = FUSIONS_BY_LEVEL[clamp(level, 0, 2)]
  const [items, setItems] = useState(BASE_ITEMS)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [msg, setMsg] = useState(null)
  const [mode, setMode] = useState('unknown') // 'gemini' | 'offline'
  const [newest, setNewest] = useState(null)
  const [score, setScore] = useState(0)
  const [discoveries, setDiscoveries] = useState(0)
  const [legendaries, setLegendaries] = useState(0)
  const [fusions, setFusions] = useState(0)

  const g = useRef({ score: 0, disc: 0, leg: 0, fus: 0 })
  const finishedRef = useRef(false)
  const mountedRef = useRef(true)
  const offlineRef = useRef(false)
  const endTimerRef = useRef(null)
  const timeLeftRef = useRef(SESSION_SECONDS)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; clearTimeout(endTimerRef.current) }
  }, [])

  const finish = () => {
    if (finishedRef.current || !mountedRef.current) return
    finishedRef.current = true
    clearTimeout(endTimerRef.current)
    setOver(true)
    const { score: s, disc, leg, fus } = g.current
    const realisticMax = maxFusions * 60 + 100
    onFinish({
      score: s,
      rating: clamp(s / realisticMax, 0, 1),
      won: disc >= WIN_DISCOVERIES,
      summary: disc >= WIN_DISCOVERIES
        ? `${disc} new elements discovered${leg ? `, including ${leg} legendary find${leg > 1 ? 's' : ''}` : ''}!`
        : `${disc} new element${disc === 1 ? '' : 's'} discovered — ${WIN_DISCOVERIES} needed to win.`,
      stats: [
        { label: 'Discoveries', value: disc },
        { label: 'Legendary', value: `${leg}/6` },
        { label: 'Fusions used', value: `${fus}/${maxFusions}` },
        { label: 'Time left', value: `${Math.ceil(timeLeftRef.current)}s` },
      ],
    })
  }

  const left = useCountdown(SESSION_SECONDS, { running: !over, onEnd: finish })
  timeLeftRef.current = left

  const toggle = (name) => {
    if (over || busy) return
    setSelected((sel) => sel.includes(name) ? sel.filter((n) => n !== name) : sel.length < 2 ? [...sel, name] : sel)
  }

  const fuse = async () => {
    if (busy || over || selected.length !== 2) return
    const [a, b] = selected
    setBusy(true)
    setMsg(null)
    let res = null
    if (!offlineRef.current) {
      try {
        const r = await api('/ai/fusion', { a, b }, { timeoutMs: 12000 })
        if (r && r.result) res = r
        else throw new Error('Empty fusion response')
      } catch { offlineRef.current = true }
    }
    if (!res) res = localFuse(a, b)
    if (!mountedRef.current || finishedRef.current) return
    setMode(offlineRef.current || res.source !== 'gemini' ? 'offline' : 'gemini')

    const name = String(res.result).trim()
    const lname = name.toLowerCase()
    const dup = items.some((i) => i.name.toLowerCase() === lname)
    const fus = g.current.fus + 1
    g.current.fus = fus
    setFusions(fus)

    if (dup) {
      setMsg({ kind: 'dup', text: `${res.emoji || ''} ${name} — already discovered.` })
    } else {
      const legendary = !!res.legendary || LEGENDARY_NAMES.has(lname)
      const item = { name, emoji: res.emoji || '✨', desc: res.description || '', legendary }
      setItems((prev) => [...prev, item])
      setNewest(name)
      g.current.disc += 1
      g.current.score += 60 + (legendary ? 100 : 0)
      if (legendary) g.current.leg += 1
      setDiscoveries(g.current.disc)
      setScore(g.current.score)
      setLegendaries(g.current.leg)
      setMsg({ kind: 'new', text: `${res.emoji || '✨'} ${name}! ${res.description || ''}`, legendary })
    }
    setSelected([])
    setBusy(false)
    if (fus >= maxFusions) endTimerRef.current = setTimeout(finish, 1200)
  }

  const selItems = selected.map((n) => items.find((i) => i.name === n))

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Stat label="Time" value={`${Math.ceil(left)}s`} tone={left < 15 ? 'text-danger' : ''} />
        <Stat label="Fusions left" value={maxFusions - fusions} />
        <Stat label="Found" value={`${discoveries}/${WIN_DISCOVERIES}`} tone={discoveries >= WIN_DISCOVERIES ? 'text-success' : ''} />
        <Stat label="Score" value={score} tone="text-violet-soft" />
      </div>

      <div className="glass rounded-3xl p-5 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-dim">Pick <b className="text-ink">two elements</b>, fuse them, and discover something new. Each new find is <b className="text-ink">+60</b>; legendary finds are <b className="text-warn">+100</b> extra. Discover {WIN_DISCOVERIES} to win.</p>
          {mode !== 'unknown' && (
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${mode === 'gemini' ? 'border-violet/50 bg-violet/15 text-violet-soft' : 'border-warn/50 bg-warn/10 text-warn'}`}>
              {mode === 'gemini' ? <Sparkles size={12} /> : <WifiOff size={12} />}
              {mode === 'gemini' ? 'Gemini' : 'Offline'}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          {[0, 1].map((slot) => (
            <div key={slot} className={`grid h-20 w-20 place-items-center rounded-2xl border text-center sm:h-24 sm:w-24 ${selItems[slot] ? 'border-violet/60 bg-violet/15' : 'border-dashed border-white/20 bg-white/5'}`}>
              {selItems[slot] ? (
                <div><div className="text-3xl">{selItems[slot].emoji}</div><div className="mt-0.5 text-xs font-medium">{selItems[slot].name}</div></div>
              ) : <Plus className="text-dim" size={20} />}
            </div>
          ))}
          <Button onClick={fuse} disabled={busy || over || selected.length !== 2} aria-label="Fuse selected elements">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
            {busy ? 'Fusing…' : 'Fuse'}
          </Button>
        </div>

        <div className="mt-3 min-h-[2.5rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            {msg && (
              <motion.p
                key={msg.text}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-xl border px-3 py-2 text-sm ${msg.kind === 'dup' ? 'border-white/10 bg-white/5 text-dim' : msg.legendary ? 'border-warn/50 bg-warn/10 text-warn' : 'border-success/50 bg-success/10 text-success'}`}
              >
                {msg.kind === 'dup' ? msg.text : <><b>{msg.legendary ? 'Legendary find! ' : 'New discovery! '}</b>{msg.text}</>}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="glass mt-4 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-dim">Collection · {items.length}</h3>
          <span className="inline-flex items-center gap-1 text-xs text-warn"><Crown size={13} /> {legendaries}/6 legendary</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((it) => (
            <motion.button
              key={it.name}
              type="button"
              layout
              initial={it.name === newest ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              onClick={() => toggle(it.name)}
              disabled={over}
              aria-pressed={selected.includes(it.name)}
              aria-label={`${it.name}${it.legendary ? ' (legendary)' : ''}`}
              className={`glass rounded-xl px-3 py-2 text-sm transition-colors disabled:opacity-60 ${
                selected.includes(it.name) ? 'border-violet bg-violet/25'
                  : it.legendary ? 'border-warn/60 bg-warn/10 hover:border-warn'
                  : 'hover:border-violet/60'
              } ${it.name === newest ? 'ring-2 ring-violet/60' : ''}`}
            >
              <span className="mr-1.5">{it.emoji}</span>{it.name}
              {it.legendary && <Crown size={11} className="ml-1 inline text-warn" />}
            </motion.button>
          ))}
        </div>
        <p className="mt-3 text-xs text-dim">Tap a chip to select it for fusion. Tap again to deselect.</p>
      </div>
    </Frame>
  )
}
