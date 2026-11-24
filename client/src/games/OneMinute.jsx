import { useEffect, useRef, useState } from 'react'
import { Frame, Stat, pick, rand } from './ui.jsx'
import useCountdown from '../engine/useCountdown'

function makeQuestion(tier) {
  let a, b, c
  switch (Math.min(tier, 3)) {
    case 0: a = rand(2, 20); b = rand(2, 20); return pick([{ t: `${a} + ${b}`, a: a + b }, { t: `${a + b} − ${b}`, a }])
    case 1: a = rand(3, 9); b = rand(3, 9); return pick([{ t: `${a} × ${b}`, a: a * b }, { t: `${a * b} ÷ ${a}`, a: b }])
    case 2: a = rand(20, 99); b = rand(11, 60); return pick([{ t: `${a} + ${b}`, a: a + b }, { t: `${a + b} − ${b}`, a }])
    default: a = rand(3, 12); b = rand(3, 9); c = rand(2, 30); return pick([{ t: `${a} × ${b} + ${c}`, a: a * b + c }, { t: `${a} × ${b} − ${c}`, a: a * b - c }])
  }
}

export default function OneMinute({ level, onFinish }) {
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [score, setScore] = useState(0)
  const [q, setQ] = useState(() => makeQuestion(level))
  const [val, setVal] = useState('')
  const [shake, setShake] = useState(false)
  const input = useRef(null)
  const live = useRef({ correct: 0, wrong: 0, score: 0, best: 0 })
  const ended = useRef(false)

  const left = useCountdown(60, {
    onEnd: () => {
      if (ended.current) return
      ended.current = true
      const l = live.current
      onFinish({
        score: l.score, rating: Math.min(1, l.correct / 20), won: l.correct >= 10,
        summary: `${l.correct} correct answers in 60 seconds.`,
        stats: [{ label: 'Correct', value: l.correct }, { label: 'Wrong', value: l.wrong }, { label: 'Best streak', value: l.best }],
      })
    },
  })
  useEffect(() => { input.current?.focus() }, [q])

  const next = (ok) => {
    const l = live.current
    if (ok) {
      const ns = streak + 1
      l.correct++; l.score += 10 + Math.min(streak, 5) * 2; l.best = Math.max(l.best, ns)
      setCorrect(l.correct); setScore(l.score); setStreak(ns); setBest(l.best)
      setQ(makeQuestion(level + Math.floor(l.correct / 5)))
    } else {
      l.wrong++; setWrong(l.wrong); setStreak(0); setShake(true); setTimeout(() => setShake(false), 300)
    }
    setVal('')
  }
  const onChange = (e) => {
    const v = e.target.value.replace(/[^0-9-]/g, '')
    setVal(v)
    if (v === String(q.a)) next(true) // instant check on the exact answer
  }
  const onKey = (e) => { if (e.key === 'Enter' && val !== '') next(val === String(q.a)) }

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3"><Stat label="Time" value={Math.ceil(left)} tone={left < 10 ? 'text-danger' : ''} /><Stat label="Correct" value={correct} /><Stat label="Streak" value={streak} /><Stat label="Score" value={score} /></div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${(left / 60) * 100}%` }} /></div>
      <div className={`glass rounded-3xl p-8 text-center sm:p-12 ${shake ? 'animate-pulse border-danger' : ''}`}>
        <div className="font-display text-5xl font-bold sm:text-6xl" aria-live="polite">{q.t} = ?</div>
        <input ref={input} value={val} onChange={onChange} onKeyDown={onKey} inputMode="numeric" autoComplete="off" aria-label="Your answer"
          className="mx-auto mt-8 block w-48 rounded-xl border border-white/15 bg-void/60 px-4 py-3 text-center font-mono text-3xl outline-none focus:border-cyan" />
        <p className="mt-3 text-xs text-dim">Correct answers submit automatically. Press Enter to submit a wrong guess ({wrong} wrong so far).</p>
      </div>
    </Frame>
  )
}
