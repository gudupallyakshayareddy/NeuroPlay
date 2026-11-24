import { useRef, useState } from 'react'
import { Loader2, Sparkles, Database } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat } from './ui.jsx'
import useCountdown from '../engine/useCountdown'
import { api } from '../api'

const TOPICS = ['Science', 'Technology', 'Geography', 'History', 'General']
const DIFFS = ['Easy', 'Medium', 'Hard']
const SECONDS = 20
const COUNT = 8

export default function TriviaParty({ level, onFinish }) {
  const [stage, setStage] = useState('setup') // setup | loading | play
  const [topic, setTopic] = useState('Science')
  const [custom, setCustom] = useState('')
  const [diff, setDiff] = useState(DIFFS[level])
  const [error, setError] = useState('')
  const [quiz, setQuiz] = useState(null)
  const [i, setI] = useState(0)
  const [reveal, setReveal] = useState(null) // { choice, correct, answerIndex, explanation }
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const stats = useRef({ score: 0, correct: 0, best: 0, streak: 0 })

  const begin = async () => {
    setStage('loading'); setError('')
    try {
      const data = await api('/trivia/quiz', { topic: (custom.trim() || topic), difficulty: diff, count: COUNT }, { timeoutMs: 25000 })
      setQuiz(data); setI(0); setReveal(null); setStage('play')
    } catch (e) { setError(e.message); setStage('setup') }
  }

  const answer = async (choice) => {
    if (reveal) return
    setReveal({ choice, pending: true })
    try {
      const r = await api('/trivia/answer', { quizId: quiz.quizId, index: i, choice })
      const s = stats.current
      if (r.correct) {
        s.streak++; s.best = Math.max(s.best, s.streak); s.correct++
        s.score += Math.round((100 + Math.ceil(left) * 5) * (1 + Math.min(s.streak - 1, 5) * 0.1))
      } else s.streak = 0
      setScore(s.score); setStreak(s.streak)
      setReveal({ choice, ...r })
    } catch (e) { setReveal(null); setError(e.message) }
  }
  const left = useCountdown(SECONDS, { running: stage === 'play' && !reveal, resetKey: i, onEnd: () => answer(-1) })

  const next = () => {
    if (i + 1 >= quiz.questions.length) {
      const s = stats.current
      onFinish({ score: s.score, rating: s.correct / quiz.questions.length, won: s.correct / quiz.questions.length >= 0.6,
        summary: `${s.correct} of ${quiz.questions.length} correct on ${custom.trim() || topic} (${diff}).`,
        stats: [{ label: 'Correct', value: `${s.correct}/${quiz.questions.length}` }, { label: 'Best streak', value: s.best }, { label: 'Questions from', value: quiz.source === 'gemini' ? 'Gemini AI' : 'Offline bank' }] })
      return
    }
    setI(i + 1); setReveal(null); setError('')
  }

  if (stage === 'setup' || stage === 'loading') {
    return (
      <Frame>
        <div className="glass rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Pick your party</h2>
          <p className="mt-1 text-sm text-dim">Choose a topic or type your own. Gemini writes fresh questions; if it is unavailable you get questions from the offline bank.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {TOPICS.map((t) => <button key={t} onClick={() => { setTopic(t); setCustom('') }} aria-pressed={!custom && topic === t} className={`rounded-full border px-4 py-1.5 text-sm ${!custom && topic === t ? 'border-violet bg-violet/20' : 'border-white/10 text-dim hover:text-ink'}`}>{t}</button>)}
          </div>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} placeholder="…or any topic (e.g. Space, Cricket, Movies)" aria-label="Custom topic" className="mt-4 w-full rounded-xl border border-white/15 bg-void/60 px-4 py-2.5 text-sm outline-none focus:border-cyan" />
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm"><span className="text-dim">Difficulty</span>
            {DIFFS.map((d) => <button key={d} onClick={() => setDiff(d)} aria-pressed={diff === d} className={`rounded-lg border px-3 py-1.5 ${diff === d ? 'border-violet bg-violet/20' : 'border-white/10 text-dim hover:text-ink'}`}>{d}</button>)}
            <span className="text-xs text-dim">(suggested for you: {DIFFS[level]})</span></div>
          {error && <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
          <Button size="lg" className="mt-6" onClick={begin} disabled={stage === 'loading'}>{stage === 'loading' ? <><Loader2 size={18} className="animate-spin" /> Writing questions…</> : <><Sparkles size={18} /> Start quiz</>}</Button>
        </div>
      </Frame>
    )
  }

  const q = quiz.questions[i]
  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3"><Stat label="Question" value={`${i + 1}/${quiz.questions.length}`} /><Stat label="Score" value={score} /><Stat label="Streak" value={streak} /><Stat label="Time" value={Math.ceil(left)} tone={left < 6 ? 'text-danger' : ''} /></div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
      <div className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-1.5 text-xs text-dim">{quiz.source === 'gemini' ? <><Sparkles size={13} className="text-cyan" /> Written by Gemini AI</> : <><Database size={13} /> Offline question bank</>}{quiz.note && <span className="ml-2 text-warn">· {quiz.note}</span>}</div>
        <p className="mt-3 text-xl font-medium leading-relaxed sm:text-2xl">{q.question}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {q.options.map((o, k) => {
            const right = reveal && !reveal.pending && k === reveal.answerIndex
            const wrong = reveal && !reveal.pending && reveal.choice === k && !reveal.correct
            return <button key={k} disabled={!!reveal} onClick={() => answer(k)} className={`rounded-xl border px-4 py-3 text-left transition ${right ? 'border-success bg-success/20' : wrong ? 'border-danger bg-danger/20' : 'border-white/10 bg-panel/70 hover:border-violet/60'}`}>{o}</button>
          })}
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        {reveal && !reveal.pending && (
          <div className="mt-5">
            <p className="rounded-xl bg-white/5 p-3 text-sm text-dim"><b className={reveal.correct ? 'text-success' : 'text-danger'}>{reveal.correct ? 'Correct! ' : reveal.choice === -1 ? 'Time is up. ' : 'Not quite. '}</b>{reveal.explanation}</p>
            <Button className="mt-3" onClick={next}>{i + 1 >= quiz.questions.length ? 'See results' : 'Next question'}</Button>
          </div>
        )}
      </div>
    </Frame>
  )
}
