import { useEffect, useReducer, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Brain, Cherry, Clock, Dna, Drumstick, Dumbbell, Lock, Moon, Sparkles, Wind, Zap } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'

const STAGES = ['Blob', 'Sprout', 'Critter', 'Beast', 'Mythic']
const STAGE_COLORS = ['#8B94FF', '#4ADE80', '#22D3EE', '#F472B6', '#FBBF24']
const AGE_REQ = [10, 25, 45, 70]
const STAT_REQ = [30, 45, 60, 75]
const MAX_AGE = 90
const BRANCHES = {
  str: { name: 'Armored', color: '#FBBF24', icon: Dumbbell },
  agi: { name: 'Winged', color: '#22D3EE', icon: Wind },
  int: { name: 'Crystal', color: '#A78BFA', icon: Brain },
}
const FOODS = {
  protein: { label: 'Protein', stat: 'str', icon: Drumstick, color: 'text-danger' },
  berry: { label: 'Berry', stat: 'agi', icon: Cherry, color: 'text-cyan' },
  mushroom: { label: 'Mushroom', stat: 'int', icon: Sparkles, color: 'text-violet-soft' },
}
const TRAINS = {
  str: { label: 'Strength', icon: Dumbbell, color: '#FBBF24' },
  agi: { label: 'Agility', icon: Wind, color: '#22D3EE' },
  int: { label: 'Intellect', icon: Brain, color: '#A78BFA' },
}
const STAT_LABEL = { str: 'Strength', agi: 'Agility', int: 'Intellect' }
const SCORE_MAX = 4 * 150 + 300 + 4 * 50 // 1100

// ---- procedural creature SVG ----
function blobPath(stage) {
  const n = 8 + stage * 2
  const r = 30 + stage * 9
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (1 + 0.13 * Math.sin(i * 2.7 + stage * 1.3))
    pts.push([100 + rr * Math.cos(a), 108 + rr * Math.sin(a) * 0.88])
  }
  let d = ''
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n]
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2
    d += i === 0 ? `M ${mx.toFixed(1)} ${my.toFixed(1)} ` : ''
    const q2 = pts[(i + 1) % n], r2 = pts[(i + 2) % n]
    d += `Q ${q2[0].toFixed(1)} ${q2[1].toFixed(1)} ${((q2[0] + r2[0]) / 2).toFixed(1)} ${((q2[1] + r2[1]) / 2).toFixed(1)} `
  }
  return d + 'Z'
}

function CreatureSVG({ stage, mutations, stats, size = 200 }) {
  const color = STAGE_COLORS[stage]
  const has = (b) => mutations.includes(b)
  const eyeCount = 1 + Math.min(2, Math.floor(stats.int / 35))
  const eyeR = 4.5 + stage * 1.2
  const gid = `evo-grad-${stage}-${mutations.join('')}`
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${STAGES[stage]} creature${mutations.length ? ', ' + mutations.map((m) => BRANCHES[m].name).join(' and ') : ''}`}>
      <defs>
        <radialGradient id={gid} cx="40%" cy="35%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={`${color}66`} />
        </radialGradient>
      </defs>
      {/* winged mutation */}
      {has('agi') && (
        <g fill="#22D3EE55" stroke="#22D3EE" strokeWidth="1.5">
          <path d="M 62 96 Q 20 60 14 88 Q 30 92 40 104 Q 26 104 22 116 Q 44 118 60 110 Z" />
          <path d="M 138 96 Q 180 60 186 88 Q 170 92 160 104 Q 174 104 178 116 Q 156 118 140 110 Z" />
        </g>
      )}
      {/* limbs grow with stage */}
      {stage >= 1 && Array.from({ length: stage + 1 }).map((_, i) => {
        const x = 70 + i * (60 / Math.max(1, stage))
        return <ellipse key={i} cx={x} cy={150 + stage * 4} rx={6} ry={12 + stage * 2} fill={`${color}99`} />
      })}
      {stage >= 2 && (
        <g stroke={color} strokeWidth="5" strokeLinecap="round">
          <line x1="58" y1="105" x2="38" y2="122" />
          <line x1="142" y1="105" x2="162" y2="122" />
        </g>
      )}
      {/* body */}
      <path d={blobPath(stage)} fill={`url(#${gid})`} stroke={color} strokeWidth="2" />
      {/* armored mutation: plates + spikes */}
      {has('str') && (
        <g fill="#FBBF24" stroke="#B45309" strokeWidth="1">
          <path d="M 70 74 L 78 56 L 86 72 Z" />
          <path d="M 92 68 L 100 48 L 108 68 Z" />
          <path d="M 114 72 L 122 56 L 130 74 Z" />
          <path d="M 74 118 Q 100 132 126 118 L 122 128 Q 100 140 78 128 Z" opacity="0.85" />
        </g>
      )}
      {/* crystal mutation: floating shards */}
      {has('int') && (
        <g fill="#A78BFA" stroke="#EDE9FE" strokeWidth="1">
          <path d="M 66 52 L 72 38 L 78 52 L 72 60 Z" opacity="0.9" />
          <path d="M 96 44 L 102 28 L 108 44 L 102 54 Z" />
          <path d="M 126 52 L 132 38 L 138 52 L 132 60 Z" opacity="0.9" />
        </g>
      )}
      {/* eyes (count scales with Intellect) */}
      {Array.from({ length: eyeCount }).map((_, i) => {
        const x = 100 + (i - (eyeCount - 1) / 2) * (eyeR * 3.2)
        const y = 96 - stage * 2
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={eyeR} fill="#F8FAFC" />
            <circle cx={x + eyeR * 0.25} cy={y} r={eyeR * 0.45} fill="#05060F" />
          </g>
        )
      })}
      {/* mouth */}
      <path d={`M ${92 - stage * 2} ${116 + stage * 2} Q 100 ${122 + stage * 2} ${108 + stage * 2} ${116 + stage * 2}`} stroke="#05060F" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// ---- game state reducer ----
const initial = {
  str: 8, agi: 8, int: 8, energy: 80, age: 0, stage: 0,
  mutations: [], forms: [{ stage: 0, branch: null }],
  stock: { protein: 3, berry: 3, mushroom: 3 },
  flash: 0, lastEvent: 'A tiny blob awakens in the lab.', ended: false,
}

const dominant = (s) => ['str', 'agi', 'int'].reduce((a, b) => (s[b] > s[a] ? b : a), 'str')

function checkEvolve(s, level) {
  let out = { ...s }
  while (
    out.stage < 4 &&
    out.age >= AGE_REQ[out.stage] &&
    out[dominant(out)] >= STAT_REQ[out.stage] + level * 5
  ) {
    const branch = dominant(out)
    out = {
      ...out,
      stage: out.stage + 1,
      mutations: [...out.mutations, branch],
      forms: [...out.forms, { stage: out.stage + 1, branch }],
      flash: out.flash + 1,
      lastEvent: `Evolved into ${STAGES[out.stage + 1]} — ${BRANCHES[branch].name} form!`,
    }
  }
  if (out.stage >= 4 || out.age >= MAX_AGE) out = { ...out, ended: true }
  return out
}

function reducerFactory(level) {
  const trainCost = 14 + level * 2
  return (s, action) => {
    if (s.ended) return s
    let n = s
    switch (action.type) {
      case 'TICK': {
        const age = s.age + 1
        n = { ...s, age, energy: clamp(s.energy - 2, 0, 100) }
        if (age % 4 === 0) n.stock = { protein: clamp(s.stock.protein + 1, 0, 3), berry: clamp(s.stock.berry + 1, 0, 3), mushroom: clamp(s.stock.mushroom + 1, 0, 3) }
        break
      }
      case 'FEED': {
        const f = FOODS[action.food]
        if (!f || s.stock[action.food] <= 0) return s
        n = {
          ...s,
          stock: { ...s.stock, [action.food]: s.stock[action.food] - 1 },
          energy: clamp(s.energy + 18, 0, 100),
          [f.stat]: clamp(s[f.stat] + 4, 0, 100),
          lastEvent: `Fed ${f.label}: +18 energy, +4 ${STAT_LABEL[f.stat]}.`,
        }
        break
      }
      case 'TRAIN': {
        if (!TRAINS[action.stat] || s.energy < trainCost) return s
        n = {
          ...s,
          energy: s.energy - trainCost,
          [action.stat]: clamp(s[action.stat] + 7, 0, 100),
          lastEvent: `Trained ${STAT_LABEL[action.stat]}: +7 (−${trainCost} energy).`,
        }
        break
      }
      case 'REST':
        n = { ...s, age: s.age + 2, energy: clamp(s.energy + 20, 0, 100), lastEvent: 'Rested. Time passed, energy restored.' }
        break
      default:
        return s
    }
    return checkEvolve(n, level)
  }
}

export default function EvoLab({ level, onFinish }) {
  const [s, dispatch] = useReducer(reducerFactory(level), initial)
  const [showCollection, setShowCollection] = useState(false)
  const finishedRef = useRef(false)
  const trainCost = 14 + level * 2

  // 3s life tick
  useEffect(() => {
    if (s.ended) return
    const id = setInterval(() => dispatch({ type: 'TICK' }), 3000)
    return () => clearInterval(id)
  }, [s.ended])

  // finish exactly once
  useEffect(() => {
    if (!s.ended || finishedRef.current) return
    const id = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      const sum = s.str + s.agi + s.int
      const score = s.stage * 150 + sum + s.mutations.length * 50
      const won = s.stage >= 4
      onFinish({
        score,
        rating: clamp(score / SCORE_MAX, 0, 1),
        won,
        summary: won
          ? `Your creature ascended to Mythic at age ${s.age}!`
          : `Your creature reached ${STAGES[s.stage]} before its time ran out at age ${s.age}.`,
        stats: [
          { label: 'Final stage', value: STAGES[s.stage] },
          { label: 'Age', value: s.age },
          { label: 'Mutations', value: s.mutations.length },
          { label: 'Stats total', value: sum },
        ],
      })
    }, 1500)
    return () => clearTimeout(id)
  }, [s, onFinish])

  const nextReq = s.stage < 4 ? { age: AGE_REQ[s.stage], stat: STAT_REQ[s.stage] + level * 5 } : null
  const dom = dominant(s)

  return (
    <Frame>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Stat label="Age" value={s.age} />
        <Stat label="Stage" value={STAGES[s.stage]} tone="text-violet-soft" />
        <Stat label="Energy" value={s.energy} tone={s.energy < 20 ? 'text-danger' : 'text-cyan'} />
      </div>

      {/* creature chamber */}
      <div className="glass relative overflow-hidden rounded-3xl p-4">
        <div className="flex items-center justify-between text-xs text-dim">
          <span className="flex items-center gap-1.5"><Dna size={14} className="text-violet-soft" /> Evolution chamber</span>
          <span className="flex items-center gap-1"><Clock size={12} /> tick every 3s</span>
        </div>
        <div className="relative mx-auto mt-1 flex h-52 items-center justify-center">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
            <CreatureSVG stage={s.stage} mutations={s.mutations} stats={s} size={190} />
          </motion.div>
          <AnimatePresence>
            {s.flash > 0 && (
              <motion.div
                key={s.flash}
                initial={{ opacity: 0.95, scale: 0.4 }}
                animate={{ opacity: 0, scale: 2.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(139,148,255,0.9) 0%, rgba(124,92,255,0.4) 45%, transparent 70%)' }}
              />
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {s.mutations.map((m, i) => {
            const B = BRANCHES[m]
            return <span key={i} className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ color: B.color, borderColor: `${B.color}66`, background: `${B.color}1a` }}>{B.name}</span>
          })}
          {!s.mutations.length && <span className="text-[11px] text-dim">No mutations yet</span>}
        </div>
        <p className="mt-2 text-center text-xs text-dim" aria-live="polite">{s.lastEvent}</p>
        {nextReq && (
          <p className="mt-1 text-center text-[11px] text-dim">
            Next evolution: age <b className={s.age >= nextReq.age ? 'text-success' : 'text-ink'}>{nextReq.age}</b> + dominant stat <b className={s[dom] >= nextReq.stat ? 'text-success' : 'text-ink'}>{nextReq.stat}</b> (yours: {STAT_LABEL[dom]} {s[dom]})
          </p>
        )}
      </div>

      {/* animated stat bars */}
      <div className="glass mt-3 rounded-2xl p-4">
        {Object.entries(TRAINS).map(([key, t]) => (
          <div key={key} className="mb-2 last:mb-0">
            <div className="flex justify-between text-xs"><span className="flex items-center gap-1.5 text-dim"><t.icon size={13} style={{ color: t.color }} /> {t.label}{dom === key && <span className="text-[9px] text-violet-soft">DOMINANT</span>}</span><span className="font-display text-ink">{s[key]}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full" style={{ background: t.color }} animate={{ width: `${s[key]}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
            </div>
          </div>
        ))}
      </div>

      {/* actions */}
      <div className="glass mt-3 rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-dim">Feed · +18 energy, +4 stat</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {Object.entries(FOODS).map(([key, f]) => (
            <button key={key} onClick={() => dispatch({ type: 'FEED', food: key })} disabled={s.stock[key] <= 0 || s.ended} className="glass rounded-xl px-2 py-2.5 text-center text-xs hover:border-violet/60 disabled:opacity-40">
              <f.icon size={18} className={`mx-auto ${f.color}`} />
              <span className="mt-1 block font-semibold">{f.label}</span>
              <span className="text-[10px] text-dim">stock {s.stock[key]}/3</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-dim">Train · −{trainCost} energy, +7 stat</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {Object.entries(TRAINS).map(([key, t]) => (
            <button key={key} onClick={() => dispatch({ type: 'TRAIN', stat: key })} disabled={s.energy < trainCost || s.ended} className="glass rounded-xl px-2 py-2.5 text-center text-xs hover:border-violet/60 disabled:opacity-40">
              <t.icon size={18} className="mx-auto" style={{ color: t.color }} />
              <span className="mt-1 block font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
        <Button variant="secondary" className="mt-3 w-full" disabled={s.ended} onClick={() => dispatch({ type: 'REST' })}><Moon size={16} /> Rest (age +2, energy +20)</Button>
      </div>

      {/* collection */}
      <div className="glass mt-3 rounded-2xl p-4">
        <button onClick={() => setShowCollection((v) => !v)} aria-expanded={showCollection} className="flex w-full items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2"><BookOpen size={16} className="text-violet-soft" /> Form collection</span>
          <span className="text-xs text-dim">{s.forms.length}/5 unlocked</span>
        </button>
        <AnimatePresence>
          {showCollection && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 grid grid-cols-5 gap-2">
                {STAGES.map((name, i) => {
                  const form = s.forms.find((f) => f.stage === i)
                  return (
                    <div key={name} className={`rounded-xl border p-1.5 text-center ${form ? 'border-violet/40 bg-violet/10' : 'border-white/10 opacity-50'}`}>
                      {form ? (
                        <CreatureSVG stage={i} mutations={form.branch ? [form.branch] : []} stats={{ str: 30, agi: 30, int: 30 }} size={52} />
                      ) : (
                        <div className="flex h-[52px] items-center justify-center"><Lock size={18} className="text-dim" /></div>
                      )}
                      <div className="mt-1 truncate text-[9px] font-semibold">{name}</div>
                      <div className="truncate text-[8px] text-dim">{form ? (form.branch ? BRANCHES[form.branch].name : 'Base') : '???'}</div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Frame>
  )
}
