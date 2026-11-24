import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mountain, Scroll, Scissors, Brain, Eye, Radar } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, rand, clamp } from './ui.jsx'

const ROUNDS = 20
const EPS_BY_LEVEL = [0.4, 0.2, 0.1] // chance the AI throws a random move instead of its prediction's counter
const ENTROPY_THRESHOLD = 1.5 // Shannon entropy (bits) of a near-uniform 3-move distribution; max is log2(3) ≈ 1.585

// Order matters: (move + 1) % 3 is the move that beats it. Rock→Paper→Scissors→Rock.
const MOVES = [
  { name: 'Rock', icon: Mountain, text: 'text-cyan', dot: 'bg-cyan', ring: 'border-cyan/60 bg-cyan/10' },
  { name: 'Paper', icon: Scroll, text: 'text-violet-soft', dot: 'bg-violet', ring: 'border-violet/60 bg-violet/10' },
  { name: 'Scissors', icon: Scissors, text: 'text-warn', dot: 'bg-warn', ring: 'border-warn/60 bg-warn/10' },
]
const beats = (a, b) => (a + 2) % 3 === b // a beats b

const sum = (arr) => arr.reduce((x, y) => x + y, 0)
const argmax = (arr) => arr.indexOf(Math.max(...arr))

// Real predictor: Markov transition counts (last move → next move), falling back to overall frequency.
function predictNext(model) {
  const total = sum(model.freq)
  if (model.last != null) {
    const row = model.trans[model.last]
    const rowTotal = sum(row)
    if (rowTotal >= 2) {
      const move = argmax(row)
      return { move, conf: row[move] / rowTotal, informed: true }
    }
  }
  if (total > 0) {
    const move = argmax(model.freq)
    return { move, conf: model.freq[move] / total, informed: true }
  }
  return { move: rand(0, 2), conf: 1 / 3, informed: false }
}

function entropy(freq) {
  const total = sum(freq)
  if (!total) return 0
  return -freq.reduce((h, c) => (c > 0 ? h + (c / total) * Math.log2(c / total) : h), 0)
}

export default function MindCounter({ level = 1, onFinish }) {
  const eps = EPS_BY_LEVEL[clamp(level, 0, 2)]
  const model = useRef({ freq: [0, 0, 0], trans: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], last: null, reads: 0, hits: 0 })
  const [history, setHistory] = useState([])
  const [phase, setPhase] = useState('pick') // pick | reveal
  const [last, setLast] = useState(null)
  const [you, setYou] = useState(0)
  const [ai, setAi] = useState(0)
  const [conf, setConf] = useState(1 / 3)
  const [over, setOver] = useState(false)

  const scoresRef = useRef({ you: 0, ai: 0 })
  const finishedRef = useRef(false)
  const mountedRef = useRef(true)
  const revealTimerRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; clearTimeout(revealTimerRef.current) }
  }, [])

  const finish = () => {
    if (finishedRef.current || !mountedRef.current) return
    finishedRef.current = true
    clearTimeout(revealTimerRef.current)
    setOver(true)
    const md = model.current
    const bonus = entropy(md.freq) >= ENTROPY_THRESHOLD ? 100 : 0
    const total = scoresRef.current.you + bonus
    const aiScore = scoresRef.current.ai
    const predictability = md.reads ? Math.round((md.hits / md.reads) * 100) : 0
    onFinish({
      score: total,
      rating: clamp(total / 700, 0, 1),
      won: total > aiScore,
      summary: total > aiScore
        ? `You outscored the AI ${total}–${aiScore}${bonus ? ', with a +100 unpredictability bonus' : ''}.`
        : `The AI read you ${aiScore}–${total}. Mix your moves to stay unreadable.`,
      stats: [
        { label: 'Your score', value: total },
        { label: 'AI score', value: aiScore },
        { label: 'Predictability', value: `${predictability}%` },
        { label: 'AI correct reads', value: `${md.hits}/${md.reads}` },
        { label: 'Entropy bonus', value: `+${bonus}` },
      ],
    })
  }

  const play = (m) => {
    if (phase !== 'pick' || over) return
    const md = model.current
    const pred = predictNext(md)
    const aiMove = Math.random() < eps ? rand(0, 2) : (pred.move + 1) % 3
    const result = m === aiMove ? 'draw' : beats(m, aiMove) ? 'win' : 'loss'
    const pts = result === 'win' ? 30 : result === 'draw' ? 10 : 0
    const aiPts = result === 'loss' ? 30 : result === 'draw' ? 10 : 0

    // The AI genuinely learns from every move you make.
    if (pred.informed) { md.reads += 1; if (pred.move === m) md.hits += 1 }
    if (md.last != null) md.trans[md.last][m] += 1
    md.freq[m] += 1
    md.last = m

    scoresRef.current = { you: scoresRef.current.you + pts, ai: scoresRef.current.ai + aiPts }
    setYou(scoresRef.current.you)
    setAi(scoresRef.current.ai)
    setConf(predictNext(md).conf)
    const entry = { p: m, a: aiMove, result, pred: pred.informed ? pred.move : null, hit: pred.informed && pred.move === m }
    const nextHistory = [...history, entry]
    setHistory(nextHistory)
    setLast(entry)
    setPhase('reveal')
    revealTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || finishedRef.current) return
      if (nextHistory.length >= ROUNDS) finish()
      else setPhase('pick')
    }, 1100)
  }

  const round = Math.min(history.length + 1, ROUNDS)
  const favourite = sum(model.current.freq) ? argmax(model.current.freq) : -1
  const confPct = Math.round(conf * 100)

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Stat label="Round" value={`${round}/${ROUNDS}`} />
        <Stat label="You" value={you} tone="text-cyan" />
        <Stat label="AI" value={ai} tone="text-danger" />
      </div>

      <div className="glass rounded-3xl p-5 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-dim">The AI is <b className="text-ink">learning your patterns</b> — it tracks your move frequencies and what you play after each move. Win rounds <b className="text-ink">+30</b>, draw <b className="text-ink">+10</b>. Stay unpredictable for a <b className="text-warn">+100</b> bonus.</p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet/50 bg-violet/15 px-2.5 py-1 text-[11px] font-medium text-violet-soft"><Brain size={12} /> Learning AI</span>
        </div>

        {/* AI confidence meter */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-dim">
            <span className="inline-flex items-center gap-1"><Radar size={12} /> AI confidence in its next read</span>
            <span className={confPct >= 60 ? 'font-bold text-danger' : confPct >= 45 ? 'text-warn' : 'text-success'}>{confPct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={confPct} aria-valuemin={0} aria-valuemax={100} aria-label="AI confidence">
            <motion.div
              className={`h-full rounded-full ${confPct >= 60 ? 'bg-danger' : confPct >= 45 ? 'bg-warn' : 'bg-success'}`}
              animate={{ width: `${confPct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* Move buttons */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {MOVES.map((mv, i) => {
            const Icon = mv.icon
            return (
              <button
                key={mv.name}
                type="button"
                onClick={() => play(i)}
                disabled={phase !== 'pick' || over}
                aria-label={`Play ${mv.name}`}
                className={`glass glass-hover rounded-2xl border p-4 text-center transition-all disabled:opacity-40 ${phase === 'pick' && !over ? mv.ring : 'border-white/10'}`}
              >
                <Icon size={30} className={`mx-auto ${mv.text}`} />
                <div className="mt-1.5 text-sm font-semibold">{mv.name}</div>
              </button>
            )
          })}
        </div>

        {/* Round reveal */}
        <div className="mt-4 min-h-[4.5rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            {last && phase === 'reveal' && (
              <motion.div
                key={history.length}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`rounded-2xl border p-3.5 text-sm ${last.result === 'win' ? 'border-success/50 bg-success/10' : last.result === 'draw' ? 'border-white/15 bg-white/5' : 'border-danger/50 bg-danger/10'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {last.result === 'win' ? 'You win! +30' : last.result === 'draw' ? 'Draw. +10' : 'AI wins. +0'}
                  </span>
                  <span className="text-xs text-dim">
                    You played {MOVES[last.p].name} · AI played {MOVES[last.a].name}
                  </span>
                </div>
                {last.pred != null && (
                  <p className={`mt-1 text-xs ${last.hit ? 'text-danger' : 'text-success'}`}>
                    <Eye size={11} className="mr-1 inline" />
                    {last.hit ? `The AI predicted your ${MOVES[last.pred].name} — it knows you.` : `The AI expected ${MOVES[last.pred].name}. You fooled it.`}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Live pattern chart */}
      <div className="glass mt-4 rounded-3xl p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-dim">Your pattern — the AI sees this</h3>
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Your move history">
          {Array.from({ length: ROUNDS }, (_, i) => {
            const h = history[i]
            return <span key={i} className={`h-3.5 w-3.5 rounded-full ${h ? MOVES[h.p].dot : 'bg-white/10'}`} title={h ? MOVES[h.p].name : 'Not played yet'} />
          })}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {MOVES.map((mv, i) => {
            const Icon = mv.icon
            const count = model.current.freq[i]
            return (
              <div key={mv.name} className={`rounded-xl border p-2.5 text-center ${i === favourite && count > 0 ? `${mv.ring} ring-1 ring-current` : 'border-white/10 bg-white/5'}`}>
                <Icon size={16} className={`mx-auto ${mv.text}`} />
                <div className="mt-1 text-xs text-dim">{mv.name}</div>
                <div className="font-display text-lg font-bold">{count}</div>
                {i === favourite && count > 0 && <div className="text-[10px] text-warn">AI's top read</div>}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-dim">Keep the three counts even to earn the +100 entropy bonus. The highlighted move is what the AI expects most.</p>
      </div>

      {over && <div className="mt-4 text-center"><Button variant="secondary" disabled>Calculating results…</Button></div>}
    </Frame>
  )
}
