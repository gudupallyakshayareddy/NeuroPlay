import { Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Coins, Flame, Play, RotateCcw, Star, Trophy, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { getCategory } from '../../data/games'
import { adaptiveLevel, levelInfo, recordResult, replaceProgress, useProgress } from '../../engine/progress'
import { useAuth } from '../../engine/auth.jsx'
import { api } from '../../api'
import { sfx } from '../../engine/sound'

const LEVEL_NAMES = ['Easier', 'Normal', 'Harder']

/**
 * Shared shell for every game: instructions -> play -> results.
 * A game component receives { level, onFinish } and calls
 *   onFinish({ score, rating (0..1), won, summary, stats: [{label, value}] })
 */
export default function GameShell({ game, Component }) {
  const [phase, setPhase] = useState('intro') // intro | playing | results
  const [run, setRun] = useState(0)
  const [level, setLevel] = useState(1)
  const [outcome, setOutcome] = useState(null)
  const savedRef = useRef(false)
  const runRef = useRef(0) // id of the run that may still finish; 0 = nothing is running (quit / results)
  const sessionRef = useRef(null) // server-side validated session (signed-in players)
  const progress = useProgress()
  const { user } = useAuth()
  const cat = getCategory(game.category)

  const start = () => {
    savedRef.current = false
    setLevel(adaptiveLevel(game.slug)) // difficulty adapts to your real past results
    const id = run + 1
    runRef.current = id
    setRun(id)
    setPhase('playing')
    sessionRef.current = null
    if (user) {
      // Register the run with the server so the reward can be validated later.
      api('/sessions/start', { slug: game.slug })
        .then((r) => { if (runRef.current === id) sessionRef.current = r.sessionId })
        .catch(() => { /* server down: play on locally */ })
    }
  }

  const quit = () => {
    runRef.current = 0 // a game's pending end-of-game timer must not award anything after quitting
    setPhase('intro')
  }

  const finish = async (result, runId) => {
    if (savedRef.current || runRef.current !== runId) return // never double-award, never award a quit/stale run
    runRef.current = 0
    savedRef.current = true
    let reward, note = null
    const sessionId = sessionRef.current
    sessionRef.current = null
    if (user && sessionId) {
      try {
        // Signed-in: the server validates the run and computes the reward.
        const r = await api('/sessions/finish', {
          sessionId, score: Math.round(result.score), rating: Math.max(0, Math.min(1, result.rating ?? 0)),
          won: !!result.won, summary: (result.summary || '').slice(0, 200),
        })
        reward = r.reward
        replaceProgress(r.progress)
      } catch (e) {
        note = e.status === 400 ? `Reward rejected by the server: ${e.message}` : 'Server unreachable — reward saved locally only.'
        reward = recordResult(game.slug, result)
      }
    } else {
      reward = recordResult(game.slug, result)
      if (user) note = 'Server unreachable — reward saved locally only.'
    }
    sfx(reward.leveledUp ? 'levelup' : result.won ? 'win' : 'bad')
    setOutcome({ result, reward, note })
    setPhase('results')
  }

  useEffect(() => { window.scrollTo(0, 0) }, [phase])

  return (
    <div className="section-pad py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link to={`/games/${game.slug}`} className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink">
          <ArrowLeft size={16} /> {game.title}
        </Link>
        {phase === 'playing' && (
          <button onClick={quit} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-dim hover:bg-white/5 hover:text-ink">
            <X size={15} /> Quit (no reward)
          </button>
        )}
      </div>

      {phase === 'intro' && (
        <div className="glass mx-auto max-w-2xl rounded-3xl p-6 sm:p-10" style={{ boxShadow: `0 0 60px -24px ${cat.color}aa` }}>
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: cat.color }}>{cat.name}</div>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{game.title}</h1>
          <p className="mt-3 text-dim">{game.description}</p>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-dim">How to play</h2>
          <ol className="mt-3 space-y-2">
            {game.howTo.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet/20 font-mono text-xs text-violet-soft">{i + 1}</span>{s}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-dim">
            <span className="glass rounded-lg px-3 py-1.5">Difficulty for you now: <b className="text-ink">{LEVEL_NAMES[adaptiveLevel(game.slug, progress)]}</b></span>
            {progress.best[game.slug] && <span className="glass rounded-lg px-3 py-1.5">Your best: <b className="text-ink">{progress.best[game.slug].score}</b></span>}
          </div>
          <Button size="lg" className="mt-8 w-full sm:w-auto" onClick={start}><Play size={18} /> Start game</Button>
        </div>
      )}

      {phase === 'playing' && (
        <Suspense fallback={<p className="mx-auto max-w-2xl animate-pulse text-center text-sm text-dim">Loading game…</p>}>
          <Component key={run} level={level} onFinish={(result) => finish(result, run)} />
        </Suspense>
      )}

      {phase === 'results' && outcome && <Results game={game} outcome={outcome} onReplay={start} />}
    </div>
  )
}

function Results({ game, outcome, onReplay }) {
  const { result, reward, note } = outcome
  const progress = useProgress()
  const info = levelInfo(progress.xp)
  const stars = result.rating >= 0.8 ? 3 : result.rating >= 0.5 ? 2 : result.rating >= 0.2 ? 1 : 0
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto max-w-2xl rounded-3xl p-6 text-center sm:p-10">
      <Trophy className="mx-auto text-warn" size={40} />
      <h1 className="mt-3 text-3xl font-bold">{result.won ? 'Well played!' : 'Game over'}</h1>
      {result.summary && <p className="mt-2 text-dim">{result.summary}</p>}
      {note && <p className="mt-2 rounded-lg bg-warn/10 px-3 py-1.5 text-xs text-warn">{note}</p>}
      <div className="mt-4 flex justify-center gap-1" aria-label={`${stars} of 3 stars`}>
        {[0, 1, 2].map((i) => <Star key={i} size={26} className={i < stars ? 'fill-warn text-warn' : 'text-white/15'} />)}
      </div>
      <div className="mt-5 font-display text-6xl font-bold text-gradient">{result.score}</div>
      <div className="text-sm text-dim">points{reward.isBest && <span className="ml-2 rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">New personal best</span>}</div>

      {result.stats?.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {result.stats.map((s) => (
            <div key={s.label} className="glass rounded-xl p-3"><dt className="text-xs text-dim">{s.label}</dt><dd className="mt-1 font-semibold">{s.value}</dd></div>
          ))}
        </dl>
      )}

      <div className="mt-6 rounded-2xl border border-violet/30 bg-violet/10 p-4 text-left text-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-medium">
          <span className="text-violet-soft">+{reward.xp} XP</span>
          <span className="flex items-center gap-1 text-warn"><Coins size={15} /> +{reward.coins}</span>
          <span className="flex items-center gap-1 text-orange-300"><Flame size={15} /> {reward.streak}-day streak</span>
        </div>
        <p className="mt-2 text-center text-xs text-dim">
          {reward.baseXp} from your score{reward.streakBonus ? ` + ${reward.streakBonus} streak bonus` : ''}{reward.dailyBonus ? ` + ${reward.dailyBonus} daily challenge bonus` : ''}
        </p>
        <div className="mx-auto mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${info.pct * 100}%` }} />
        </div>
        <p className="mt-1 text-center text-xs text-dim">Level {info.level} · {info.into}/{info.span} XP</p>
        {reward.leveledUp && <p className="mt-2 text-center font-semibold text-success">Level up! You reached level {reward.levelAfter}.</p>}
      </div>

      {reward.unlocked.length > 0 && (
        <div className="mt-4 space-y-2">
          {reward.unlocked.map((a) => (
            <div key={a.id} className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm"><b className="text-warn">Achievement unlocked: {a.title}</b> <span className="text-dim">· {a.text}</span></div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={onReplay}><RotateCcw size={16} /> Play again</Button>
        <Button to="/dashboard" variant="secondary">Dashboard</Button>
        <Button to="/games" variant="ghost">More games</Button>
      </div>
    </motion.div>
  )
}
