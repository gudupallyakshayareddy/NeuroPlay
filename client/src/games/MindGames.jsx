import { useMemo, useRef, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp, pick, rand, shuffle } from './ui.jsx'
import useCountdown from '../engine/useCountdown'

const TOTAL = 10
const SECONDS = 30
const DIFF_NAMES = ['Easy', 'Medium', 'Hard', 'Expert']

function numOptions(ans, spread) {
  const set = new Set([ans])
  const deltas = shuffle([1, -1, 2, -2, 3, -3, spread, -spread, 2 * spread])
  for (const d of deltas) { if (set.size >= 4) break; set.add(ans + d) }
  const opts = shuffle([...set]).map(String)
  return { options: opts, answerIndex: opts.indexOf(String(ans)) }
}

// ---- generators (d = difficulty 0..3). Answers are computed by code.
function sequence(d) {
  let terms, ans, rule
  if (d === 0) { const a = rand(1, 15), s = rand(2, 7); terms = [0, 1, 2, 3, 4].map((i) => a + s * i); ans = a + s * 5; rule = `add ${s} each time` }
  else if (d === 1) { const a = rand(1, 4), m = pick([2, 3]); terms = [0, 1, 2, 3, 4].map((i) => a * m ** i); ans = a * m ** 5; rule = `multiply by ${m} each time` }
  else if (d === 2) { const a = rand(1, 9), k = rand(1, 3), s = rand(1, 4); terms = []; let v = a; for (let i = 0; i < 5; i++) { terms.push(v); v += s + k * i } ans = v; rule = `the gap grows by ${k} each step` }
  else { const x = rand(1, 5), y = rand(2, 6); terms = [x, y]; for (let i = 2; i < 6; i++) terms.push(terms[i - 1] + terms[i - 2]); ans = terms[5] + terms[4]; terms = terms.slice(0, 6); rule = 'each number is the sum of the two before it' }
  const { options, answerIndex } = numOptions(ans, Math.max(2, Math.round(ans * 0.1)))
  return { kind: 'Number sequence', prompt: `What comes next?  ${terms.join(', ')}, ?`, options, answerIndex, explain: `Rule: ${rule}. The next number is ${ans}.` }
}
function ordering(d) {
  const names = shuffle(['Ana', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus']).slice(0, d >= 2 ? 5 : d === 1 ? 4 : 3)
  // names[0] is tallest ... names[n-1] shortest
  const lines = names.slice(0, -1).map((n, i) => (Math.random() < 0.5 ? `${n} is taller than ${names[i + 1]}.` : `${names[i + 1]} is shorter than ${n}.`))
  const askTall = Math.random() < 0.5
  const ans = askTall ? names[0] : names[names.length - 1]
  const extra = ['Hal', 'Ivy', 'Jo'].slice(0, Math.max(0, 4 - names.length))
  const pool = shuffle([...names.slice(0, 4), ...extra]).slice(0, 4)
  if (!pool.includes(ans)) pool[0] = ans
  const options = shuffle(pool)
  return { kind: 'Logic ordering', prompt: `${shuffle(lines).join(' ')}  Who is the ${askTall ? 'tallest' : 'shortest'}?`, options, answerIndex: options.indexOf(ans), explain: `Order from tallest to shortest: ${names.join(' > ')}.` }
}
function symbols(d) {
  const a = rand(2, 6), b = rand(1, 8), c = rand(1, 9)
  const L = d >= 2
    ? [`▲ + ▲ + ▲ = ${3 * a}`, `▲ + ● = ${a + b}`, `● + ■ = ${b + c}`]
    : [`▲ + ▲ = ${2 * a}`, `▲ + ● = ${a + b}`, `● + ■ = ${b + c}`]
  const ans = d >= 2 ? a * b + c : b + c
  const q = d >= 2 ? '▲ × ● + ■ = ?' : '● + ■ = ?'
  const { options, answerIndex } = numOptions(ans, 3)
  return { kind: 'Symbol equations', prompt: `${L.join('   ·   ')}   →   ${q}`, options, answerIndex, explain: `▲ = ${a}, ● = ${b}, ■ = ${c}, so ${q.replace(' = ?', '')} = ${ans}.` }
}
const makePuzzle = (d) => ({ ...pick([sequence, ordering, symbols, sequence])(d), diff: d })

export default function MindGames({ level, onFinish }) {
  const [i, setI] = useState(0)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [hinted, setHinted] = useState(false)
  const [chosen, setChosen] = useState(null)
  const [hidden, setHidden] = useState([])
  const stats = useRef({ score: 0, correct: 0, hints: 0 })
  const diff = clamp(level + Math.floor(streak / 2), 0, 3) // streaks raise difficulty
  const puzzle = useMemo(() => makePuzzle(diff), [i]) // eslint-disable-line
  const answered = chosen !== null

  const resolve = (idx) => {
    if (answered) return
    setChosen(idx)
    const ok = idx === puzzle.answerIndex
    if (ok) {
      const pts = Math.round((60 + 20 * puzzle.diff + Math.ceil(left) * 2) * (hinted ? 0.5 : 1))
      stats.current.score += pts; stats.current.correct++
      setScore(stats.current.score); setCorrect(stats.current.correct); setStreak((s) => s + 1)
    } else setStreak(0)
  }
  const left = useCountdown(SECONDS, { running: !answered, resetKey: i, onEnd: () => resolve(-1) })

  const useHint = () => {
    if (hinted || answered) return
    const wrong = puzzle.options.map((_, k) => k).filter((k) => k !== puzzle.answerIndex)
    setHidden(shuffle(wrong).slice(0, 2)); setHinted(true); stats.current.hints++
  }
  const next = () => {
    if (i + 1 >= TOTAL) {
      const s = stats.current
      onFinish({ score: s.score, rating: s.correct / TOTAL, won: s.correct >= 6, summary: `${s.correct} of ${TOTAL} puzzles solved.`,
        stats: [{ label: 'Solved', value: `${s.correct}/${TOTAL}` }, { label: 'Hints used', value: s.hints }, { label: 'Final difficulty', value: DIFF_NAMES[puzzle.diff] }] })
      return
    }
    setI(i + 1); setChosen(null); setHinted(false); setHidden([])
  }

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3"><Stat label="Puzzle" value={`${i + 1}/${TOTAL}`} /><Stat label="Score" value={score} /><Stat label="Streak" value={streak} /><Stat label="Time" value={Math.ceil(left)} tone={left < 8 ? 'text-danger' : ''} /></div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
      <div className="glass rounded-3xl p-6 sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-cyan">{puzzle.kind} · {DIFF_NAMES[puzzle.diff]}</div>
        <p className="mt-3 text-xl font-medium leading-relaxed sm:text-2xl">{puzzle.prompt}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {puzzle.options.map((o, k) => {
            const right = answered && k === puzzle.answerIndex
            const wrong = answered && chosen === k && k !== puzzle.answerIndex
            return (
              <button key={k} onClick={() => resolve(k)} disabled={answered || hidden.includes(k)}
                className={`rounded-xl border px-4 py-3 text-left font-mono text-lg transition ${right ? 'border-success bg-success/20' : wrong ? 'border-danger bg-danger/20' : 'border-white/10 bg-panel/70 hover:border-violet/60'} ${hidden.includes(k) ? 'opacity-20' : ''}`}>{o}</button>
            )
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={useHint} disabled={hinted || answered}><Lightbulb size={15} /> {hinted ? 'Hint used (half points)' : 'Hint: remove 2 wrong answers'}</Button>
          {answered && <Button onClick={next}>{i + 1 >= TOTAL ? 'See results' : 'Next puzzle'}</Button>}
        </div>
        {answered && <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-dim">{chosen === puzzle.answerIndex ? 'Correct! ' : chosen === -1 ? 'Time is up. ' : 'Not quite. '}{puzzle.explain}</p>}
      </div>
    </Frame>
  )
}
