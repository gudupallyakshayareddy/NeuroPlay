import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive, BookOpen, CheckCircle2, CloudSun, DoorOpen, Eye, Gauge, Lightbulb,
  Lock, MapPin, Moon, MoonStar, Radio, RotateCcw, ShieldCheck, Sun, Sunrise,
  Sunset, TreePine, UserCheck, Wrench, XCircle,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp, rand } from './ui.jsx'

// ---------------------------------------------------------------------------
// THE OBSERVATORY INCIDENT — one hidden, deterministic rule table.
// Each option may require a flag, set flags, and reveal a fact (success or
// failure). Facts persist across loops; flags reset. No contradictions: every
// outcome below is computed from the same flags.
// ---------------------------------------------------------------------------
const SLOTS = [
  { name: 'Morning', icon: Sunrise },
  { name: 'Midday', icon: Sun },
  { name: 'Afternoon', icon: CloudSun },
  { name: 'Dusk', icon: Sunset },
  { name: 'Evening', icon: MoonStar },
  { name: 'Night', icon: Moon },
]

const FACTS = {
  wrench: 'The workshop wrench fits the maintenance hatch bolts exactly.',
  notes: "The engineer's notes: the coolant loop over-pressurizes at nightfall. He must be warned with proof.",
  perimeter: 'A service drone patrols the east fence at dusk. The grounds are watched.',
  warnedOk: "Shown the proof, the engineer went pale. He will shut the valve remotely and evacuate before nightfall.",
  warnedNo: 'The engineer scoffed at a vague warning. He needs proof — his notes or the pressure logs.',
  logs: 'The pressure logs confirm a nightly spike in the coolant loop. Proof the engineer would believe.',
  vaultRule: 'Archive memo: the vault code rotates daily and is read aloud on the dusk radio broadcast.',
  code: 'The dusk broadcast reads the vault code aloud. Memorize the three numbers.',
  hatchOk: 'The hatch opens onto the coolant manifold — and its manual shutoff valve.',
  hatchNo: 'The maintenance hatch is bolted shut. A wrench from the workshop would open it.',
  static: 'The radio room is dead static until the dusk broadcast begins.',
  routine: 'The engineer always works late in the east bay. He never leaves on his own.',
  fuses: 'Spare fuses on the bench — the dampeners were repaired last week. They still cannot stop a runaway.',
  valveOk: "The shutoff valve hisses closed. Tonight's pressure spike will pass harmlessly.",
  dampeners: 'Dampeners slow the spike but cannot stop a coolant runaway. Only the valve — or the engineer — can.',
  fence: "From the fence you can see the east bay's lights burn late into the night.",
  vaultOk: 'The code works. The vault swings open — the star charts are safe.',
  vaultNo: "The keypad blinks red. Without tonight's code, the vault stays sealed.",
  bayEmpty: 'The bay is empty and charred — an electrical fire swept it at midnight. The engineer evacuated in time.',
  bayFire: 'An electrical fire gutted the bay at midnight. The engineer never left. Even a quiet coolant loop could not save him.',
  bayBoom: 'The east wing is rubble. The explosion took the bay — and the engineer with it.',
  monitorsSafe: "The monitors show the engineer's badge exit the gate at dusk. He is safe.",
  monitorsQuiet: "Monitors: a harmless pressure ripple, then the bay's fire alarm. The engineer's badge never left the building.",
  monitorsBoom: 'The monitors flatline one by one as the explosion rolls through the east wing.',
  calm: 'The engineer is packing his instruments, calm and quick. Your warning took.',
}

// option: { loc, act, icon, requires?, sets?, fact, failFact?, text, failText?, alt? }
const PLAN = [
  [ // Morning
    { loc: 'Workshop', act: 'Take the wrench', icon: Wrench, sets: ['wrench'], fact: 'wrench', text: 'Heavy, cold, perfect. You slip it into your belt.' },
    { loc: 'Quarters', act: "Read the engineer's notes", icon: BookOpen, sets: ['notes'], fact: 'notes', text: 'His handwriting grows more frantic line by line. You memorize the warning.' },
    { loc: 'Grounds', act: 'Scout the perimeter', icon: TreePine, fact: 'perimeter', text: 'You time the drone patrol and map the fence line.' },
  ],
  [ // Midday
    { loc: "Engineer's Bay", act: 'Warn the engineer', icon: UserCheck, requires: 'notes', sets: ['warned'], fact: 'warnedOk', failFact: 'warnedNo', text: 'You lay out the proof. He reads it twice, then nods once.', failText: '"Evidence?" he snorts. "Come back with some." He turns back to his work.' },
    { loc: 'Control Room', act: 'Study the pressure logs', icon: Gauge, sets: ['notes'], fact: 'logs', text: 'Night after night, the same spike. You copy the pages — proof.' },
    { loc: 'Archive', act: 'Search the vault records', icon: Archive, fact: 'vaultRule', text: 'A dusty memo explains the rotating code. Someone reads it aloud on air.' },
  ],
  [ // Afternoon
    { loc: 'Maintenance Hatch', act: 'Unbolt the hatch', icon: DoorOpen, requires: 'wrench', sets: ['hatch'], fact: 'hatchOk', failFact: 'hatchNo', text: 'Four bolts, four turns. The manifold waits in the dark below.', failText: 'The bolts do not budge bare-handed. You need a tool.' },
    { loc: 'Radio Room', act: 'Eavesdrop early', icon: Radio, fact: 'static', text: 'Nothing but hiss. The broadcast has not started yet.' },
    { loc: 'Courtyard', act: 'Observe the routine', icon: Eye, fact: 'routine', text: 'You watch the bay windows. His silhouette never leaves the bench.' },
  ],
  [ // Dusk
    { loc: 'Radio Room', act: 'Catch the dusk broadcast', icon: Radio, sets: ['code'], fact: 'code', text: 'A calm voice reads the numbers between weather reports. You burn them into memory.' },
    { loc: 'Workshop', act: 'Grab the wrench', icon: Wrench, sets: ['wrench'], fact: 'wrench', text: 'Better late than never. The wrench is yours.', alt: { act: 'Search the benches', icon: Wrench, fact: 'fuses', text: 'No wrench left — you took it. But the repair log tells a story.' } },
    { loc: "Engineer's Bay", act: 'Warn the engineer', icon: UserCheck, requires: 'notes', sets: ['warned'], fact: 'warnedOk', failFact: 'warnedNo', text: 'Last chance, and you take it. He believes you this time.', failText: 'Still no proof, still no belief. The dusk shift begins.', alt: { act: 'Watch him pack', icon: Eye, fact: 'calm', text: 'He is already evacuating. There is nothing left to say.' } },
  ],
  [ // Evening
    { loc: 'Coolant Manifold', act: 'Shut the coolant valve', icon: Gauge, requires: 'wrench', sets: ['valve'], fact: 'valveOk', failFact: 'hatchNo', text: 'You reach through the open hatch and crank the valve until it seats.', failText: 'The hatch is still bolted shut. The valve might as well be on the moon.' },
    { loc: 'Control Room', act: 'Activate the dampeners', icon: ShieldCheck, fact: 'dampeners', text: 'The needles soften — but the underlying spike keeps climbing.' },
    { loc: 'Grounds', act: 'Wait by the fence', icon: TreePine, fact: 'fence', text: 'You watch the bay lights and count the minutes.' },
  ],
  [ // Night
    { loc: 'The Vault', act: 'Try the keypad', icon: Lock, requires: 'code', sets: ['vault'], fact: 'vaultOk', failFact: 'vaultNo', text: 'Three numbers, one click. Cold air and old starlight spill out.', failText: 'You punch in guesses. The keypad locks you out with a bored beep.' },
    { loc: "Engineer's Bay", act: 'Check on the engineer', icon: UserCheck, fact: 'bayEmpty', text: '' }, // fact/text resolved at nightfall
    { loc: 'Control Room', act: 'Watch the monitors', icon: Eye, fact: 'monitorsSafe', text: '' },
  ],
]

const LOOPS = [6, 5, 4]

// Nightfall resolution — the single source of truth for the three objectives.
function nightfall(flags) {
  const explosionPrevented = !!(flags.warned || flags.valve)
  const engineerSaved = !!flags.warned
  const report = flags.warned
    ? "Nightfall: the engineer's remote shutdown holds. No explosion. But at midnight an electrical fire sweeps the empty east bay."
    : flags.valve
      ? 'Nightfall: the spike passes harmlessly through the closed valve. At midnight an electrical fire breaks out in the east bay. The engineer was still inside.'
      : 'Nightfall: the coolant loop ruptures. The explosion tears through the east wing. The engineer never made it out.'
  return { explosionPrevented, engineerSaved, report }
}

export default function TimeLoop({ level = 1, onFinish }) {
  const maxLoops = LOOPS[level] ?? 5
  const finishedRef = useRef(false)
  const [code] = useState(() => String(rand(100, 999)))

  const [loop, setLoop] = useState(1)
  const [slot, setSlot] = useState(0)
  const [flags, setFlags] = useState({})
  const [facts, setFacts] = useState([]) // persists across loops
  const [picked, setPicked] = useState(null) // { ok, text, night? }
  const [summary, setSummary] = useState(null) // { objectives, count, newFacts }
  const [best, setBest] = useState(0)

  const factText = (id) => (id === 'code' ? `Dusk broadcast, vault code: ${code.slice(0, 1)}-${code.slice(1, 2)}-${code.slice(2)}. Memorized.` : FACTS[id])

  const discover = (id) => { if (id) setFacts((f) => (f.includes(id) ? f : [...f, id])) }

  const resolveOption = (opt) => {
    // Dusk workshop / engineer bay swap to their alt once their flag is set.
    if (opt.alt && ((opt.sets && opt.sets.every((f) => flags[f])) || (opt.requires === 'notes' && flags.warned))) return opt.alt
    return opt
  }

  const choose = (raw) => {
    if (picked || summary) return
    const opt = resolveOption(raw)
    const ok = !opt.requires || !!flags[opt.requires]
    const nextFlags = { ...flags }
    if (ok && opt.sets) for (const k of opt.sets) nextFlags[k] = true
    if (ok && opt.sets) setFlags(nextFlags)
    let factId = ok ? opt.fact : opt.failFact
    let text = ok ? opt.text : opt.failText
    let night = null
    if (slot === 5 && raw.loc === "Engineer's Bay") {
      // Night-slot observations reflect the resolved timeline.
      factId = nextFlags.warned ? 'bayEmpty' : nextFlags.valve ? 'bayFire' : 'bayBoom'
      text = FACTS[factId]
    } else if (slot === 5 && raw.loc === 'Control Room') {
      factId = nextFlags.warned ? 'monitorsSafe' : nextFlags.valve ? 'monitorsQuiet' : 'monitorsBoom'
      text = FACTS[factId]
    }
    discover(factId)
    if (slot === 4) night = nightfall(nextFlags).report
    setPicked({ ok, text: text || factText(factId), night, loc: opt.loc, act: opt.act })
  }

  const advance = () => {
    if (!picked) return
    if (slot < 5) { setSlot(slot + 1); setPicked(null); return }
    // End of loop: score the timeline.
    const nf = nightfall(flags)
    const objectives = { explosion: nf.explosionPrevented, vault: !!flags.vault, engineer: nf.engineerSaved }
    const count = Object.values(objectives).filter(Boolean).length
    setBest((b) => Math.max(b, count))
    setSummary({ objectives, count })
    setPicked(null)
  }

  const finish = (won, count) => {
    if (finishedRef.current) return
    finishedRef.current = true
    const score = facts.length * 40 + count * 150 + (won ? 300 : 0)
    const max = Object.keys(FACTS).length * 40 + 450 + 300
    onFinish({
      score, rating: clamp(score / max, 0, 1), won,
      summary: won
        ? `Perfect timeline on loop ${loop}: no explosion, the vault open, the engineer alive.`
        : `The loop closed after ${maxLoops} attempts. Best timeline: ${count}/3 objectives.`,
      stats: [
        { label: 'Loops used', value: `${loop}/${maxLoops}` },
        { label: 'Facts known', value: facts.length },
        { label: 'Best timeline', value: `${count}/3` },
        { label: 'Vault code', value: facts.includes('code') ? code : '???' },
      ],
    })
  }

  const nextLoop = () => {
    if (summary.count === 3) { finish(true, 3); return }
    if (loop >= maxLoops) { finish(false, summary.count); return }
    setLoop(loop + 1); setSlot(0); setFlags({}); setSummary(null); setPicked(null)
  }

  const objectives = [
    { key: 'explosion', label: 'Prevent the explosion', icon: ShieldCheck },
    { key: 'vault', label: 'Open the vault', icon: Lock },
    { key: 'engineer', label: 'Save the engineer', icon: UserCheck },
  ]

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        <Stat label="Loop" value={`${loop}/${maxLoops}`} />
        <Stat label="Facts" value={facts.length} tone="text-cyan" />
        <Stat label="Best timeline" value={`${best}/3`} tone={best === 3 ? 'text-success' : ''} />
      </div>

      {/* Timeline strip */}
      <div className="glass rounded-2xl p-3" aria-label="Timeline of the day">
        <div className="grid grid-cols-6 gap-1.5">
          {SLOTS.map((s, i) => {
            const Icon = s.icon
            const done = i < slot || (i === slot && !!picked) || !!summary
            const current = i === slot && !summary
            return (
              <div key={s.name} className={`rounded-xl border px-1 py-2 text-center transition-colors duration-300 ${current ? 'border-violet bg-violet/20' : done ? 'border-success/40 bg-success/10' : 'border-white/10 bg-white/5'}`}>
                <Icon size={16} className={`mx-auto ${current ? 'text-violet-soft' : done ? 'text-success' : 'text-dim'}`} />
                <div className={`mt-1 text-[10px] leading-tight ${current ? 'text-ink' : 'text-dim'}`}>{s.name}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main play card */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {summary ? (
            <motion.div key={`sum-${loop}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="glass rounded-3xl p-5 sm:p-8">
              <h3 className="font-display text-lg font-bold text-ink">Loop {loop} — timeline report</h3>
              <p className="mt-1 text-sm text-dim">{nightfall(flags).report}</p>
              <div className="mt-4 flex flex-col gap-2">
                {objectives.map(({ key, label, icon: Icon }) => {
                  const ok = summary.objectives[key]
                  return (
                    <div key={key} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${ok ? 'border-success/50 bg-success/10 text-success' : 'border-danger/40 bg-danger/10 text-danger'}`}>
                      {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} <Icon size={16} /> {label}
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 text-sm text-dim">
                {summary.count === 3
                  ? 'The perfect timeline. The loop has nothing left to teach you.'
                  : loop >= maxLoops
                    ? 'The loop is collapsing — no attempts remain. Your knowledge is all you keep.'
                    : 'Midnight resets the day. Your knowledge carries over; your actions do not. Try a different route.'}
              </p>
              <Button className="mt-4" onClick={nextLoop}>
                {summary.count === 3 || loop >= maxLoops ? 'See results' : <><RotateCcw size={16} /> Begin loop {loop + 1}</>}
              </Button>
            </motion.div>
          ) : picked ? (
            <motion.div key={`pick-${loop}-${slot}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="glass rounded-3xl p-5 sm:p-8">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-dim"><MapPin size={13} /> {picked.loc} — {picked.act}</div>
              <div className={`mt-3 rounded-2xl border p-4 text-sm ${picked.ok ? 'border-success/50 bg-success/10 text-ink' : 'border-warn/50 bg-warn/10 text-ink'}`}>
                {picked.text}
              </div>
              {picked.night && <p className="mt-3 rounded-2xl bg-white/5 p-4 text-sm text-dim">{picked.night}</p>}
              <Button className="mt-4" onClick={advance}>{slot < 5 ? `Continue to ${SLOTS[slot + 1].name}` : 'End the loop'}</Button>
            </motion.div>
          ) : (
            <motion.div key={`slot-${loop}-${slot}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="glass rounded-3xl p-5 sm:p-8">
              <h3 className="font-display text-lg font-bold text-ink">{SLOTS[slot].name} — choose where to be</h3>
              <p className="mt-1 text-sm text-dim">One place, one action. The day will not wait.</p>
              <div className="mt-4 flex flex-col gap-2">
                {PLAN[slot].map((raw, i) => {
                  const opt = resolveOption(raw)
                  const Icon = opt.icon
                  const act = slot === 5 && raw.loc === 'The Vault' && flags.code ? `Enter ${code.slice(0, 1)}-${code.slice(1, 2)}-${code.slice(2)}` : opt.act
                  return (
                    <button key={i} onClick={() => choose(raw)} className="glass rounded-xl px-4 py-3 text-left text-sm hover:border-violet/60">
                      <span className="flex items-center gap-2 text-ink"><Icon size={16} className="text-violet-soft" /> <b>{opt.loc}</b></span>
                      <span className="mt-0.5 block text-dim">{act}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Knowledge journal — persists across loops */}
      <div className="glass mt-4 rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-dim"><BookOpen size={13} /> Knowledge journal</span>
          <span className="text-xs text-cyan">{facts.length} facts</span>
        </div>
        {facts.length === 0 ? (
          <p className="text-sm text-dim">Nothing yet. Everything you learn here survives the reset.</p>
        ) : (
          <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1 text-sm" aria-live="polite">
            {[...facts].reverse().map((id) => (
              <li key={id} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-dim">
                <Lightbulb size={14} className="mt-0.5 shrink-0 text-warn" /> {factText(id)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Frame>
  )
}
