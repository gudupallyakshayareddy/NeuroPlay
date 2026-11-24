import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, AlertTriangle, ArrowLeft, BookOpen, Camera, Check, CreditCard, DoorOpen,
  FileText, FlaskConical, FolderOpen, Footprints, Frame, Gavel, Image, KeyRound,
  Lightbulb, Mail, Package, Phone, Pill, Pin, Receipt, ScrollText, Search,
  Thermometer, Users, Video, X,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Stat, pick, clamp } from './ui.jsx'
import CASES from './content/cases.js'

const ICONS = {
  Activity, AlertTriangle, BookOpen, Camera, CreditCard, DoorOpen, FileText,
  FlaskConical, Footprints, Frame, Image, KeyRound, Lightbulb, Mail, Package,
  Phone, Pill, Receipt, ScrollText, Thermometer, Video,
}
const TABS = [
  { id: 'case', label: 'Case file', Icon: FolderOpen },
  { id: 'suspects', label: 'Suspects', Icon: Users },
  { id: 'evidence', label: 'Evidence', Icon: Search },
  { id: 'board', label: 'Board', Icon: Pin },
]
const EXAMS_BY_LEVEL = [7, 6, 5]
const MAX_PINS = 3
const MAX_ACCUSATIONS = 2
const MAX_SCORE = 650

const initials = (name) => name.replace(/^(Dr\.|Prof\.|Maestro|Mrs\.)\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('')
const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.22 } }

function Chip({ active, disabled, onClick, children, label }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} aria-label={label}
      className={`rounded-lg border px-3 py-1.5 text-left text-xs transition sm:text-sm ${active ? 'border-violet bg-violet/25 text-ink' : 'border-white/10 text-dim hover:border-violet/50 hover:text-ink'} disabled:cursor-not-allowed disabled:opacity-40`}>
      {children}
    </button>
  )
}

export default function DetectiveMode({ level = 1, onFinish }) {
  const lvl = clamp(level ?? 1, 0, 2)
  const [data] = useState(() => pick(CASES))
  const maxExams = EXAMS_BY_LEVEL[lvl]

  const [tab, setTab] = useState('case')
  const [selected, setSelected] = useState(null)
  const [inspected, setInspected] = useState([])
  const [exams, setExams] = useState([])
  const [pins, setPins] = useState([])
  const [attempts, setAttempts] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [end, setEnd] = useState(null)
  const [pinS, setPinS] = useState(null)
  const [pinE, setPinE] = useState(null)
  const [toast, setToast] = useState(null)

  const suspect = (id) => data.suspects.find((s) => s.id === id)
  const evidence = (id) => data.evidence.find((e) => e.id === id)
  const isRule = (s, e) => data.rules.some((r) => r.suspect === s && r.evidence === e)
  const examsLeft = maxExams - exams.length
  const accusationsLeft = MAX_ACCUSATIONS - attempts.length

  const examine = (sid, eid) => {
    if (end || examsLeft <= 0 || exams.some((x) => x.suspect === sid && x.evidence === eid)) return
    const s = suspect(sid)
    setExams((x) => [...x, { suspect: sid, evidence: eid, text: s.responses[eid] || s.default, contradiction: isRule(sid, eid) }])
  }
  const inspectEvidence = (eid) => setInspected((a) => (a.includes(eid) ? a : [...a, eid]))
  const addPin = () => {
    if (!pinS || !pinE || pins.length >= MAX_PINS || pins.some((p) => p.suspect === pinS && p.evidence === pinE)) return
    setPins((p) => [...p, { suspect: pinS, evidence: pinE }])
    setPinS(null); setPinE(null)
  }
  const accuse = (sid) => {
    if (end) return
    setConfirm(null)
    const next = [...attempts, sid]
    setAttempts(next)
    if (sid === data.culprit) { setEnd({ won: true }); return }
    if (next.length >= MAX_ACCUSATIONS) { setEnd({ won: false }); return }
    setToast(`The case against ${suspect(sid).name} collapses. −100 points. One accusation left.`)
  }

  const correctPins = pins.filter((p) => isRule(p.suspect, p.evidence)).length
  const wrong = attempts.filter((a) => a !== data.culprit).length
  const base = end?.won ? (wrong === 0 ? 500 : 250) : 0
  const score = clamp(base + correctPins * 50 - wrong * 100, 0, MAX_SCORE)
  const finish = () => onFinish({
    score,
    rating: score / MAX_SCORE,
    won: !!end?.won,
    summary: end?.won
      ? `${suspect(data.culprit).name} unmasked on accusation ${attempts.length}.`
      : `The culprit slipped away — it was ${suspect(data.culprit).name}.`,
    stats: [
      { label: 'Examinations', value: `${exams.length}/${maxExams}` },
      { label: 'Correct links', value: `${correctPins}/${MAX_PINS}` },
      { label: 'Accusations', value: `${attempts.length}/${MAX_ACCUSATIONS}` },
      { label: 'Evidence read', value: `${inspected.length}/${data.evidence.length}` },
    ],
  })

  const sel = selected ? suspect(selected) : null
  const selExams = sel ? exams.filter((x) => x.suspect === sel.id) : []

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-dim">Case file</div>
          <h2 className="font-display text-lg font-bold text-ink sm:text-xl">{data.title}</h2>
        </div>
        <div className="flex gap-2">
          <Stat label="Questions" value={examsLeft} tone={examsLeft === 0 ? 'text-danger' : ''} />
          <Stat label="Accusations" value={accusationsLeft} tone={accusationsLeft === 1 ? 'text-warn' : ''} />
        </div>
      </div>

      <AnimatePresence>
        {toast && !end && (
          <motion.p key={toast} {...fade} className="mb-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-center text-sm text-warn">{toast}</motion.p>
        )}
      </AnimatePresence>

      {!end && (
        <div className="glass mb-4 flex gap-1 rounded-2xl p-1" role="tablist" aria-label="Investigation panels">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); if (t.id !== 'suspects') setSelected(null) }}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-1 py-2.5 text-xs transition sm:text-sm ${tab === t.id ? 'text-ink' : 'text-dim hover:text-ink'}`}>
              {tab === t.id && <motion.span layoutId="det-tab" className="absolute inset-0 rounded-xl border border-violet/40 bg-violet/25" transition={{ duration: 0.25 }} />}
              <t.Icon size={15} className="relative shrink-0" /><span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {end ? (
          <motion.div key="end" {...fade} className="glass rounded-3xl p-5 sm:p-8">
            <Gavel className={`mx-auto ${end.won ? 'text-success' : 'text-danger'}`} size={36} />
            <h3 className="mt-2 text-center font-display text-2xl font-bold">{end.won ? 'Case closed' : 'The one that got away'}</h3>
            <p className="mt-2 text-center text-sm text-dim">
              The culprit was <b className="text-ink">{suspect(data.culprit).name}</b> ({suspect(data.culprit).role}).
            </p>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-dim">
              {data.solution.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="mt-5 rounded-2xl border border-violet/30 bg-violet/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-violet-soft">The threads that mattered</div>
              <ul className="mt-2 space-y-2 text-sm">
                {data.rules.map((r, i) => {
                  const pinned = pins.some((p) => p.suspect === r.suspect && p.evidence === r.evidence)
                  return (
                    <li key={i} className="flex items-start gap-2">
                      {pinned ? <Check size={16} className="mt-0.5 shrink-0 text-success" /> : <X size={16} className="mt-0.5 shrink-0 text-white/25" />}
                      <span className={pinned ? 'text-ink' : 'text-dim'}>{r.note}{pinned && <span className="ml-1 text-success">· pinned +50</span>}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-dim">
              <span>Accusation: <b className="text-ink">+{base}</b></span>
              <span>Links: <b className="text-ink">+{correctPins * 50}</b></span>
              <span>Wrong accusations: <b className="text-danger">−{wrong * 100}</b></span>
              <span>Total: <b className="text-gradient">{score}</b> / {MAX_SCORE}</span>
            </div>
            <Button className="mt-6 w-full sm:w-auto" onClick={finish}>See results</Button>
          </motion.div>
        ) : (
          <motion.div key={tab + (selected || '')} {...fade}>
            {tab === 'case' && (
              <div className="glass rounded-3xl p-5 sm:p-8">
                <p className="text-sm leading-relaxed text-dim">{data.intro}</p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-panel/70 p-4 text-sm">
                  <div className="font-semibold text-ink">Your brief</div>
                  <ul className="mt-2 space-y-1.5 text-dim">
                    <li>· Read the evidence, then cross-examine suspects about it ({maxExams} questions).</li>
                    <li>· The culprit's answers contradict the evidence. Innocents stay consistent.</li>
                    <li>· Pin up to {MAX_PINS} suspect–evidence links on the board (+50 each if right).</li>
                    <li>· Accuse: first correct +500, second +250, each wrong −100. Two attempts.</li>
                  </ul>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {data.suspects.map((s) => (
                    <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-sm font-semibold text-ink">{s.name}</div>
                      <div className="text-xs text-dim">{s.role}</div>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" className="mt-5" onClick={() => setTab('evidence')}><Search size={16} /> Start with the evidence</Button>
              </div>
            )}

            {tab === 'suspects' && !sel && (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.suspects.map((s) => (
                  <button key={s.id} onClick={() => setSelected(s.id)} className="glass glass-hover rounded-2xl p-4 text-left">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet/25 font-display text-sm font-bold text-violet-soft">{initials(s.name)}</span>
                      <div>
                        <div className="font-semibold text-ink">{s.name}</div>
                        <div className="text-xs text-dim">{s.role}</div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs text-dim">“{s.alibi}”</p>
                    <div className="mt-2 text-xs text-violet-soft">Open profile →</div>
                  </button>
                ))}
              </div>
            )}

            {tab === 'suspects' && sel && (
              <div className="glass rounded-3xl p-5 sm:p-6">
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><ArrowLeft size={15} /> All suspects</Button>
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet/25 font-display font-bold text-violet-soft">{initials(sel.name)}</span>
                  <div>
                    <div className="font-display text-lg font-bold text-ink">{sel.name}</div>
                    <div className="text-xs text-dim">{sel.role}</div>
                  </div>
                </div>
                <blockquote className="mt-4 rounded-xl border border-white/10 bg-panel/70 p-3 text-sm text-dim">“{sel.alibi}”</blockquote>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sel.traits.map((t) => <span key={t} className="rounded-full bg-white/5 px-3 py-1 text-xs text-dim">{t}</span>)}
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">Cross-examine about…</span>
                    <span className={`text-xs ${examsLeft === 0 ? 'text-danger' : 'text-dim'}`}>{examsLeft} question{examsLeft === 1 ? '' : 's'} left</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.evidence.map((e) => {
                      const asked = exams.some((x) => x.suspect === sel.id && x.evidence === e.id)
                      return (
                        <Chip key={e.id} disabled={asked || examsLeft === 0} onClick={() => examine(sel.id, e.id)} label={`Ask ${sel.name} about ${e.name}`}>
                          {asked ? '✓ ' : ''}{e.name}
                        </Chip>
                      )
                    })}
                  </div>
                </div>

                {selExams.length > 0 && (
                  <ul className="mt-4 space-y-2" aria-label="Transcript">
                    {selExams.map((x, i) => (
                      <li key={i} className="rounded-xl bg-white/5 p-3 text-sm">
                        <div className="text-xs text-dim">About {evidence(x.evidence).name}</div>
                        <p className="mt-1 text-ink">“{x.text}”</p>
                        {x.contradiction && lvl < 2 && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-xs text-warn">
                            <AlertTriangle size={12} /> That doesn't add up…
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <Button variant="secondary" className="mt-5 w-full border-danger/40 text-danger hover:border-danger/70 sm:w-auto" disabled={accusationsLeft === 0} onClick={() => setConfirm(sel.id)}>
                  <Gavel size={16} /> Accuse {sel.name.split(' ').slice(-1)[0]}
                </Button>
              </div>
            )}

            {tab === 'evidence' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.evidence.map((e) => {
                  const Icon = ICONS[e.icon] || FileText
                  const open = inspected.includes(e.id)
                  return (
                    <button key={e.id} onClick={() => inspectEvidence(e.id)} aria-expanded={open}
                      className={`glass rounded-2xl p-4 text-left transition ${open ? '' : 'glass-hover'}`}>
                      <div className="flex items-center gap-2">
                        <Icon size={18} className={open ? 'text-cyan' : 'text-dim'} />
                        <span className="text-sm font-semibold text-ink">{e.name}</span>
                        {open && <Check size={15} className="ml-auto shrink-0 text-success" />}
                      </div>
                      {open ? (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs leading-relaxed text-dim">{e.text}</motion.p>
                      ) : (
                        <p className="mt-2 text-xs text-dim">Sealed — tap to inspect.</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {tab === 'board' && (
              <div className="space-y-4">
                <div className="glass rounded-3xl p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-ink">Deduction board</h3>
                    <span className="text-xs text-dim">{pins.length}/{MAX_PINS} pinned</span>
                  </div>
                  <p className="mt-1 text-xs text-dim">Link a suspect to the evidence that breaks their story. Correct links earn +50 each.</p>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-dim">Suspect</div>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {data.suspects.map((s) => <Chip key={s.id} active={pinS === s.id} onClick={() => setPinS(pinS === s.id ? null : s.id)}>{s.name}</Chip>)}
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-dim">Evidence</div>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {data.evidence.map((e) => <Chip key={e.id} active={pinE === e.id} onClick={() => setPinE(pinE === e.id ? null : e.id)}>{e.name}</Chip>)}
                  </div>
                  <Button size="sm" className="mt-4" disabled={!pinS || !pinE || pins.length >= MAX_PINS} onClick={addPin}><Pin size={15} /> Pin this link</Button>

                  {pins.length > 0 && (
                    <ul className="mt-4 space-y-2" aria-label="Pinned links">
                      <AnimatePresence>
                        {pins.map((p, i) => (
                          <motion.li key={`${p.suspect}-${p.evidence}`} {...fade} className="flex items-center gap-2 rounded-xl border border-violet/30 bg-violet/10 p-3 text-sm">
                            <Pin size={14} className="shrink-0 text-violet-soft" />
                            <span className="text-ink">{suspect(p.suspect).name}</span>
                            <span className="text-dim">↔</span>
                            <span className="text-dim">{evidence(p.evidence).name}</span>
                            <button onClick={() => setPins((a) => a.filter((_, j) => j !== i))} aria-label={`Unpin ${suspect(p.suspect).name} and ${evidence(p.evidence).name}`}
                              className="ml-auto rounded-lg p-1 text-dim hover:bg-white/10 hover:text-ink"><X size={15} /></button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                <div className="glass rounded-3xl p-5">
                  <h3 className="font-display font-bold text-ink">Make the accusation</h3>
                  <p className="mt-1 text-xs text-dim">First correct +500 · second +250 · each wrong −100. {accusationsLeft} attempt{accusationsLeft === 1 ? '' : 's'} left.</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {data.suspects.map((s) => (
                      <Button key={s.id} variant="secondary" size="sm" disabled={accusationsLeft === 0 || attempts.includes(s.id)} onClick={() => setConfirm(s.id)}>
                        <Gavel size={15} /> {s.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirm && (
          <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-void/70 p-4 backdrop-blur-sm" onClick={() => setConfirm(null)}>
            <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass w-full max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirm accusation">
              <Gavel className="text-warn" size={28} />
              <h3 className="mt-2 font-display text-lg font-bold">Accuse {suspect(confirm).name}?</h3>
              <p className="mt-2 text-sm text-dim">
                This is attempt {attempts.length + 1} of {MAX_ACCUSATIONS}. A wrong accusation costs 100 points{attempts.length + 1 === MAX_ACCUSATIONS ? ' and ends the case' : ''}.
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" onClick={() => setConfirm(null)}>Not yet</Button>
                <Button className="flex-1" onClick={() => accuse(confirm)}>Accuse</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
