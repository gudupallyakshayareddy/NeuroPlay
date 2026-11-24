import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, Loader2, Sparkles, WifiOff, Quote, Check, X, Hourglass } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp, shuffle } from './ui.jsx'
import { api } from '../api.js'
import useCountdown from '../engine/useCountdown'

const ROUNDS = 8
const DECISION_SECONDS = 20
const DIFFICULTY = ['Easy', 'Medium', 'Hard']

// Offline content bank: 6 human-style + 6 AI-style texts, with authored explanations.
const BANK = [
  {
    text: 'ok so my landlord swears the heating works fine but i literally wore a winter coat to bed last tuesday?? anyway does anyone know if those space heaters are a fire risk or is my uncle just being dramatic',
    wasAI: false,
    explanation: 'Lowercase run-on sentences, a personal anecdote with a specific day, a double question mark, and a question pitched at peers — classic forum-human energy.',
  },
  {
    text: "I've tried every productivity app on the market and deleted them all within a week. The only thing that ever worked for me was a sticky note on the monitor. My brain is apparently a 1998 Dell.",
    wasAI: false,
    explanation: 'Self-deprecating humor with an oddly specific metaphor (“a 1998 Dell”) and a personal failure story. AI text rarely commits to a joke this particular.',
  },
  {
    text: "not to be that person but the coffee place on 5th changed their beans and didn't tell anyone. i asked the barista and she just shrugged. SHRUGGED. anyway i'm making coffee at home now, it's cheaper and nobody can betray me",
    wasAI: false,
    explanation: 'The capitalized “SHRUGGED” for emphasis, the casual betrayal joke, and the lowercase complaint style are very human ways of being dramatic online.',
  },
  {
    text: "My dog ate my headphones last week. Not the cable — the whole left earcup. The vet said 'he'll pass it' like that was a normal sentence. He did not pass it. $400 later, he's fine and I'm not.",
    wasAI: false,
    explanation: 'A concrete personal story with a price tag, quoted dialogue, and a punchline built on comic timing. The specifics (“whole left earcup”) feel lived, not generated.',
  },
  {
    text: "honestly i don't get the hype around that new show. watched two episodes with my sister and she fell asleep and i kept watching just to see if it got better. it did not. anyway what are you all watching",
    wasAI: false,
    explanation: 'Vague reference (“that new show”), a meandering anecdote, the deadpan “it did not”, and an open question to the room — human conversational drift.',
  },
  {
    text: "Quick update on the sourdough: it's alive?? Like actively bubbling. I named it Gerald. My partner thinks I've lost the plot but Gerald and I are doing great, thanks for asking.",
    wasAI: false,
    explanation: 'Naming a starter “Gerald”, the mock-defensive “thanks for asking”, and affectionate absurdity — humor rooted in a real ongoing personal situation.',
  },
  {
    text: 'There are several factors to consider when evaluating remote work. While studies suggest potential productivity gains, outcomes often depend on individual circumstances, role requirements, and organizational culture. A balanced approach may be most effective.',
    wasAI: true,
    explanation: 'Hedged throughout (“suggest”, “often”, “may”), a tidy three-item list, and a neutral both-sides conclusion. No personal stake, no specifics — polished AI balance.',
  },
  {
    text: 'To improve your sleep quality, consider the following evidence-based strategies: maintain a consistent sleep schedule, limit screen exposure before bed, and keep your bedroom cool and dark. If difficulties persist, consulting a healthcare professional is advisable.',
    wasAI: true,
    explanation: 'The “consider the following” structure, parallel imperative bullet-style advice, and the standard professional-referral disclaimer are hallmark AI assistant patterns.',
  },
  {
    text: 'The impact of social media on attention is a nuanced topic. Some research indicates that frequent task-switching may reduce sustained focus, though causality remains debated. It is important to interpret such findings with appropriate caution.',
    wasAI: true,
    explanation: '“A nuanced topic”, “some research indicates”, “causality remains debated” — careful epistemic hedging and a meta-comment about interpreting findings, typical of AI text.',
  },
  {
    text: 'Learning a new language offers cognitive, professional, and cultural benefits. Progress typically follows a non-linear trajectory, and consistent, spaced practice tends to yield better long-term retention than intensive short-term study.',
    wasAI: true,
    explanation: 'A clean triad of benefits, textbook phrasing like “non-linear trajectory”, and a generalized comparative claim with no personal experience behind it.',
  },
  {
    text: 'When choosing a laptop, it is helpful to first identify your primary use case. For general productivity, a mid-range processor and 16GB of RAM are typically sufficient. Creative workloads may benefit from a dedicated GPU and a color-accurate display.',
    wasAI: true,
    explanation: 'Structured buying-guide prose: condition → recommendation → caveat. Precise but impersonal specs, hedged with “typically” and “may benefit”.',
  },
  {
    text: 'Regular exercise is widely associated with improved cardiovascular health and mood regulation. That said, individual responses vary, and it is generally recommended to begin gradually and adjust intensity based on personal comfort and guidance.',
    wasAI: true,
    explanation: '“Widely associated with”, “that said, individual responses vary”, “it is generally recommended” — passive, hedged, liability-aware wellness prose.',
  },
]

export default function HumanVsAI({ level = 1, onFinish }) {
  const difficulty = DIFFICULTY[clamp(level, 0, 2)]
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState('loading') // loading | guess | answering | reveal
  const [text, setText] = useState('')
  const [reveal, setReveal] = useState(null)
  const [mode, setMode] = useState('unknown') // gemini | offline
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)

  const g = useRef({ score: 0, correct: 0, streak: 0, best: 0 })
  const finishedRef = useRef(false)
  const mountedRef = useRef(true)
  const startedRef = useRef(false)
  const offlineRef = useRef(false)
  const roundIdRef = useRef(null)
  const offlineItemRef = useRef(null)
  const bankRef = useRef(shuffle(BANK))
  const bankIdxRef = useRef(0)

  const nextBankItem = () => {
    if (bankIdxRef.current >= bankRef.current.length) { bankRef.current = shuffle(BANK); bankIdxRef.current = 0 }
    return bankRef.current[bankIdxRef.current++]
  }

  const finish = () => {
    if (finishedRef.current || !mountedRef.current) return
    finishedRef.current = true
    const { score: s, correct, best } = g.current
    onFinish({
      score: s,
      rating: clamp(s / 1000, 0, 1),
      won: correct >= 5,
      summary: `${correct} of ${ROUNDS} texts judged correctly${best >= 3 ? `, with a best streak of ${best}` : ''}.`,
      stats: [
        { label: 'Correct calls', value: `${correct}/${ROUNDS}` },
        { label: 'Best streak', value: best },
        { label: 'Points', value: s },
        { label: 'Mode', value: offlineRef.current ? 'Offline' : 'Gemini' },
      ],
    })
  }

  const dealOffline = () => {
    offlineRef.current = true
    setMode('offline')
    const item = nextBankItem()
    offlineItemRef.current = item
    roundIdRef.current = null
    setText(item.text)
    setPhase('guess')
  }

  const loadRound = async (n) => {
    setRound(n)
    setPhase('loading')
    setText('')
    setReveal(null)
    roundIdRef.current = null
    offlineItemRef.current = null
    if (!offlineRef.current) {
      try {
        const r = await api('/ai/human-or-ai/start', { difficulty }, { timeoutMs: 12000 })
        if (!mountedRef.current || finishedRef.current) return
        if (!r || !r.text || r.roundId == null) throw new Error('Bad round response')
        setMode(r.source === 'gemini' ? 'gemini' : 'offline')
        roundIdRef.current = r.roundId
        setText(r.text)
        setPhase('guess')
        return
      } catch { offlineRef.current = true }
    }
    if (!mountedRef.current || finishedRef.current) return
    dealOffline()
  }

  useEffect(() => {
    mountedRef.current = true
    if (!startedRef.current) { startedRef.current = true; loadRound(1) }
    return () => { mountedRef.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resolve = (correct, wasAI, explanation, timedOut) => {
    if (!mountedRef.current || finishedRef.current) return
    const st = correct ? g.current.streak + 1 : 0
    const mult = st >= 6 ? 3 : st >= 3 ? 2 : 1
    const pts = correct ? 50 * mult : 0
    g.current = { score: g.current.score + pts, correct: g.current.correct + (correct ? 1 : 0), streak: st, best: Math.max(g.current.best, st) }
    setScore(g.current.score)
    setStreak(st)
    setReveal({ correct, wasAI, explanation, timedOut, pts, mult })
    setPhase('reveal')
  }

  const guess = async (choice) => {
    if (phase !== 'guess') return
    setPhase('answering')
    if (roundIdRef.current != null && !offlineRef.current) {
      try {
        const r = await api('/ai/human-or-ai/answer', { roundId: roundIdRef.current, guess: choice }, { timeoutMs: 12000 })
        if (!mountedRef.current || finishedRef.current) return
        resolve(!!r.correct, !!r.wasAI, r.explanation || 'No explanation provided.', false)
        return
      } catch {
        if (!mountedRef.current || finishedRef.current) return
        dealOffline() // connection lost mid-round: re-deal this round from the local bank
        return
      }
    }
    const item = offlineItemRef.current
    resolve((choice === 'ai') === item.wasAI, item.wasAI, item.explanation, false)
  }

  const onTimeout = async () => {
    if (phase !== 'guess') return
    setPhase('answering')
    if (roundIdRef.current != null && !offlineRef.current) {
      try {
        const r = await api('/ai/human-or-ai/answer', { roundId: roundIdRef.current, guess: 'human' }, { timeoutMs: 12000 })
        if (!mountedRef.current || finishedRef.current) return
        resolve(false, !!r.wasAI, r.explanation || 'No explanation provided.', true)
        return
      } catch {
        if (!mountedRef.current || finishedRef.current) return
        resolve(false, null, 'Time ran out, and the server could not be reached to reveal the truth.', true)
        return
      }
    }
    const item = offlineItemRef.current
    resolve(false, item.wasAI, item.explanation, true)
  }

  const left = useCountdown(DECISION_SECONDS, { running: phase === 'guess', resetKey: round, onEnd: onTimeout })

  const next = () => {
    if (round >= ROUNDS) finish()
    else loadRound(round + 1)
  }

  const mult = streak >= 6 ? 3 : streak >= 3 ? 2 : 1

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Stat label="Round" value={`${round}/${ROUNDS}`} />
        <Stat label="Score" value={score} tone="text-violet-soft" />
        <Stat label="Streak" value={`${streak} · x${mult}`} tone={streak >= 3 ? 'text-warn' : ''} />
      </div>

      <div className="glass rounded-3xl p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-dim">Was this text written by a <b className="text-ink">human</b> or an <b className="text-ink">AI</b>? Trust your instincts — {DECISION_SECONDS}s per round.</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-dim">{difficulty}</span>
            {mode !== 'unknown' && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${mode === 'gemini' ? 'border-violet/50 bg-violet/15 text-violet-soft' : 'border-warn/50 bg-warn/10 text-warn'}`}>
                {mode === 'gemini' ? <Sparkles size={12} /> : <WifiOff size={12} />}
                {mode === 'gemini' ? 'Gemini' : 'Offline mode'}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-panel/70 p-4 sm:p-5" aria-live="polite">
          {phase === 'loading' ? (
            <div className="space-y-2.5 py-2" aria-label="Loading text">
              <div className="h-3.5 w-11/12 animate-pulse rounded bg-white/10" />
              <div className="h-3.5 w-full animate-pulse rounded bg-white/10" />
              <div className="h-3.5 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="flex items-center gap-2 pt-1 text-xs text-dim"><Loader2 size={13} className="animate-spin" /> Fetching a mysterious text…</div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Quote size={18} className="mt-0.5 shrink-0 text-violet-soft" />
              <p className="text-sm leading-relaxed sm:text-base">{text}</p>
            </div>
          )}
        </div>

        {(phase === 'guess' || phase === 'answering') && (
          <>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-dim">
                <span className="inline-flex items-center gap-1"><Hourglass size={12} /> Decision time</span>
                <span className={left < 6 ? 'font-bold text-danger' : ''}>{Math.ceil(left)}s</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full transition-all duration-100 ${left < 6 ? 'bg-danger' : 'bg-violet'}`} style={{ width: `${(left / DECISION_SECONDS) * 100}%` }} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" disabled={phase !== 'guess'} onClick={() => guess('human')} aria-label="Guess human">
                {phase === 'answering' ? <Loader2 size={18} className="animate-spin" /> : <User size={18} />} Human
              </Button>
              <Button size="lg" disabled={phase !== 'guess'} onClick={() => guess('ai')} aria-label="Guess AI">
                {phase === 'answering' ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />} AI
              </Button>
            </div>
          </>
        )}

        <AnimatePresence>
          {phase === 'reveal' && reveal && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-5 rounded-2xl border p-4 text-sm ${reveal.correct ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10'}`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {reveal.correct ? <Check size={16} className="text-success" /> : <X size={16} className="text-danger" />}
                {reveal.correct
                  ? `Correct! +${reveal.pts}${reveal.mult > 1 ? ` (x${reveal.mult} streak)` : ''}`
                  : reveal.timedOut ? "Time's up! +0" : 'Not quite. +0'}
              </div>
              <p className="mt-1.5 font-medium text-ink">
                {reveal.wasAI == null ? 'The truth stayed on the server.' : reveal.wasAI ? 'This text was written by an AI.' : 'This text was written by a human.'}
              </p>
              <p className="mt-1 text-dim">{reveal.explanation}</p>
              <Button className="mt-3" onClick={next}>{round >= ROUNDS ? 'See results' : 'Next round'}</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-3 text-center text-xs text-dim">Correct: +50 · streak 3+: x2 · streak 6+: x3 · timeout counts as wrong</p>
    </Frame>
  )
}
