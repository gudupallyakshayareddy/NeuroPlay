import { useState } from 'react'
import { DoorClosed, DoorOpen } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, pick } from './ui.jsx'

const ROUNDS = 3
const newRound = () => ({ safe: pick(['Left', 'Right']), liar: pick(['A', 'B']), asked: [], picked: null })
const other = (g) => (g === 'A' ? 'B' : 'A')
const doorName = (d) => d // 'Left' | 'Right'
const opposite = (d) => (d === 'Left' ? 'Right' : 'Left')

// All answers are computed by code from the hidden state, so they are always consistent.
const QUESTIONS = [
  { id: 'direct', text: 'Which door is safe?' },
  { id: 'other', text: 'Which door would the other guardian say is safe?' },
  { id: 'liar', text: 'Are you the liar?' },
]
function answer(round, guardian, qid) {
  const isLiar = round.liar === guardian
  const truthfulSafe = (g) => (round.liar === g ? opposite(round.safe) : round.safe) // what guardian g says is safe
  if (qid === 'direct') return `The ${truthfulSafe(guardian)} door is safe.`
  if (qid === 'other') {
    const truth = truthfulSafe(other(guardian)) // what the other would say
    return `They would say the ${isLiar ? opposite(truth) : truth} door.`
  }
  return 'No, I always tell the truth.' // both a truth-teller and a liar say this
}

export default function TwoDoors({ onFinish }) {
  const [n, setN] = useState(1)
  const [round, setRound] = useState(newRound)
  const [guardian, setGuardian] = useState('A')
  const [points, setPoints] = useState([])
  const [resolved, setResolved] = useState(null)

  const ask = (qid) => {
    if (round.asked.length >= 2 || resolved) return
    setRound({ ...round, asked: [...round.asked, { g: guardian, q: qid, a: answer(round, guardian, qid) }] })
  }
  const choose = (door) => {
    if (resolved) return
    const ok = door === round.safe
    const used = round.asked.length
    const pts = ok ? (used === 0 ? 40 : used === 1 ? 100 : 70) : 0
    setResolved({ door, ok, pts })
    setPoints((p) => [...p, pts])
  }
  const nextRound = () => {
    if (n >= ROUNDS) {
      const total = points.reduce((a, b) => a + b, 0)
      const wins = points.filter((p) => p > 0).length
      onFinish({
        score: total, rating: total / (ROUNDS * 100), won: wins >= 2,
        summary: `${wins} of ${ROUNDS} doors were safe.`,
        stats: [{ label: 'Safe doors', value: `${wins}/${ROUNDS}` }, { label: 'Best round', value: Math.max(...points) }],
      })
      return
    }
    setN(n + 1); setRound(newRound()); setResolved(null); setGuardian('A')
  }

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3"><Stat label="Round" value={`${n}/${ROUNDS}`} /><Stat label="Points" value={points.reduce((a, b) => a + b, 0)} /></div>
      <div className="glass rounded-3xl p-5 sm:p-8">
        <p className="text-sm text-dim">One door leads to safety, the other to doom. One guardian <b className="text-ink">always lies</b>, the other <b className="text-ink">always tells the truth</b>. You do not know which is which. You may ask up to <b className="text-ink">2 questions</b>; fewer questions score more.</p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          {['Left', 'Right'].map((d, i) => (
            <div key={d} className="rounded-2xl border border-white/10 bg-panel/70 p-4 text-center">
              {resolved && d === round.safe ? <DoorOpen className="mx-auto text-success" size={40} /> : <DoorClosed className="mx-auto text-violet-soft" size={40} />}
              <div className="mt-1 font-semibold">{d} door</div>
              <div className="text-xs text-dim">Guardian {i === 0 ? 'A' : 'B'}</div>
              <Button size="sm" variant={resolved ? 'ghost' : 'primary'} className="mt-3 w-full" disabled={!!resolved} onClick={() => choose(d)}>Open {d}</Button>
            </div>
          ))}
        </div>

        {!resolved && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-dim">Ask guardian:</span>
              {['A', 'B'].map((g) => (
                <button key={g} onClick={() => setGuardian(g)} aria-pressed={guardian === g} className={`rounded-lg border px-3 py-1.5 ${guardian === g ? 'border-violet bg-violet/20' : 'border-white/10 text-dim hover:text-ink'}`}>{g}</button>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {QUESTIONS.map((q) => <button key={q.id} onClick={() => ask(q.id)} disabled={round.asked.length >= 2} className="glass rounded-xl px-4 py-2.5 text-left text-sm hover:border-violet/60 disabled:opacity-40">“{q.text}”</button>)}
            </div>
          </div>
        )}

        {round.asked.length > 0 && (
          <ul className="mt-5 space-y-2 text-sm" aria-label="Answers so far">
            {round.asked.map((a, i) => (
              <li key={i} className="rounded-xl bg-white/5 p-3"><span className="text-dim">You asked {a.g}: “{QUESTIONS.find((q) => q.id === a.q).text}”</span><br /><b>{a.g}:</b> {a.a}</li>
            ))}
          </ul>
        )}

        {resolved && (
          <div className={`mt-5 rounded-2xl border p-4 text-sm ${resolved.ok ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10'}`}>
            <b>{resolved.ok ? `Safe! +${resolved.pts} points.` : 'The wrong door. +0 points.'}</b>
            <p className="mt-1 text-dim">The safe door was {round.safe}; guardian {round.liar} was the liar. Hint for next time: asking a guardian what the <i>other</i> would say always points to the wrong door, because the lie cancels the truth.</p>
            <Button className="mt-3" onClick={nextRound}>{n >= ROUNDS ? 'See results' : 'Next round'}</Button>
          </div>
        )}
      </div>
    </Frame>
  )
}
