import { useEffect, useRef, useState } from 'react'
import { Frame, Lives, Stat, shuffle } from './ui.jsx'

const sizeFor = (r) => (r <= 3 ? 3 : r <= 7 ? 4 : 5)
const countFor = (r) => Math.min(sizeFor(r) ** 2 - 3, r + 2)

export default function MemoryMatrix({ level, onFinish }) {
  const startRound = 1 + level // harder start for stronger players
  const [round, setRound] = useState(startRound)
  const [attempt, setAttempt] = useState(0)
  const [lives, setLives] = useState(3)
  const [score, setScore] = useState(0)
  const [cleared, setCleared] = useState(0)
  const [phase, setPhase] = useState('show') // show | input | fail | win
  const [pattern, setPattern] = useState([])
  const [picked, setPicked] = useState([])
  const timers = useRef([])
  const done = useRef(false)
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const size = sizeFor(round)
  const count = countFor(round)

  useEffect(() => {
    const cells = shuffle(Array.from({ length: size * size }, (_, i) => i)).slice(0, count)
    setPattern(cells); setPicked([]); setPhase('show')
    later(() => setPhase('input'), 900 + count * 380)
  }, [round, attempt]) // eslint-disable-line

  const finish = (lastCleared, finalScore) => {
    if (done.current) return
    done.current = true
    const rating = Math.min(1, lastCleared / 9)
    onFinish({
      score: finalScore, rating, won: lastCleared >= 5,
      summary: `You cleared ${lastCleared} round${lastCleared === 1 ? '' : 's'}.`,
      stats: [{ label: 'Rounds cleared', value: lastCleared }, { label: 'Largest pattern', value: `${countFor(startRound + Math.max(0, lastCleared - 1))} tiles` }],
    })
  }

  const tap = (i) => {
    if (phase !== 'input' || picked.includes(i)) return
    if (!pattern.includes(i)) {
      setPicked((p) => [...p, i]); setPhase('fail')
      const left = lives - 1
      setLives(left)
      later(() => (left <= 0 ? finish(cleared, score) : setAttempt((a) => a + 1)), 1400)
      return
    }
    const next = [...picked, i]
    setPicked(next)
    if (next.length === count) {
      const gained = count * 10 + round * 5
      setScore((s) => s + gained); setCleared((c) => c + 1); setPhase('win')
      later(() => setRound((r) => r + 1), 700)
    }
  }

  const status = { show: 'Memorise the lit tiles…', input: `Tap the ${count} tiles (${picked.length}/${count})`, fail: 'Wrong tile! Here is the pattern.', win: 'Perfect!' }[phase]

  return (
    <Frame>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Stat label="Round" value={round} /><Stat label="Score" value={score} /><div className="glass rounded-xl px-4 py-3"><Lives n={lives} /></div>
      </div>
      <p className="mb-4 text-center text-sm text-dim" role="status">{status}</p>
      <div className="mx-auto grid max-w-md gap-2" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size * size }, (_, i) => {
          const lit = phase === 'show' || phase === 'fail' ? pattern.includes(i) : false
          const good = picked.includes(i) && pattern.includes(i)
          const bad = picked.includes(i) && !pattern.includes(i)
          return (
            <button key={i} onClick={() => tap(i)} aria-label={`Tile ${i + 1}`}
              className={`aspect-square rounded-xl border transition-all duration-150 ${bad ? 'border-danger bg-danger/60' : good || lit ? 'border-cyan bg-cyan/70 shadow-glow-cyan' : 'border-white/10 bg-panel hover:border-violet/60'}`} />
          )
        })}
      </div>
    </Frame>
  )
}
