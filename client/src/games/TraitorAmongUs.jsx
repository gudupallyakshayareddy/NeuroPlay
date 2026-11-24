import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Eye, MessageSquare, Rocket, Send, ShieldAlert, Skull, Vote, Zap } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'
import {
  MAX_ROUNDS, accuse, botMessages, createGame, doTask, nextRound,
  playerMessage, sabotage, scoreGame, setPhase, vote,
} from './content/traitorLogic.js'

const WIRE_COLORS = ['#F87171', '#FBBF24', '#22D3EE', '#4ADE80']
const PHASES = {
  task: { label: 'Task phase', icon: Zap, tone: 'text-cyan' },
  discussion: { label: 'Discussion', icon: MessageSquare, tone: 'text-violet-soft' },
  vote: { label: 'Emergency vote', icon: Vote, tone: 'text-warn' },
  end: { label: 'Mission over', icon: Rocket, tone: 'text-success' },
}

function MiniTask({ card, onDone }) {
  const [progress, setProgress] = useState(0)
  const [wrong, setWrong] = useState(false)
  const target = card.kind === 'wires' ? card.seq : card.code.split('').map(Number)
  const tap = (v) => {
    if (v === target[progress]) {
      const next = progress + 1
      setProgress(next)
      if (next >= target.length) setTimeout(onDone, 250)
    } else {
      setProgress(0); setWrong(true)
      setTimeout(() => setWrong(false), 350)
    }
  }
  return (
    <div className={`rounded-2xl border p-4 ${wrong ? 'border-danger/60 bg-danger/10' : 'border-violet/40 bg-violet/10'}`}>
      <p className="text-sm font-semibold">{card.name}</p>
      {card.kind === 'wires' ? (
        <>
          <p className="mt-1 text-xs text-dim">Connect the wires in the order shown.</p>
          <div className="mt-3 flex items-center justify-center gap-2" aria-label="Wire sequence">
            {card.seq.map((c, i) => (
              <span key={i} className="h-5 w-5 rounded-full border-2" style={{ background: i < progress ? WIRE_COLORS[c] : 'transparent', borderColor: WIRE_COLORS[c], opacity: i < progress ? 1 : 0.7 }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {WIRE_COLORS.map((c, i) => (
              <button key={i} onClick={() => tap(i)} aria-label={`Wire ${i + 1}`} className="h-12 rounded-xl border border-white/15 transition-transform active:scale-95" style={{ background: `${c}55`, boxShadow: `inset 0 0 12px ${c}66` }} />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-dim">Tap the access code: <b className="tracking-[0.3em] text-ink">{card.code}</b></p>
          <div className="mt-3 flex justify-center gap-2" aria-label="Code progress">
            {target.map((d, i) => (
              <span key={i} className={`flex h-9 w-9 items-center justify-center rounded-lg border font-display text-lg ${i < progress ? 'border-success/60 bg-success/15 text-success' : 'border-white/15 text-dim'}`}>{i < progress ? d : '·'}</span>
            ))}
          </div>
          <div className="mx-auto mt-4 grid max-w-[240px] grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
              <button key={d} onClick={() => tap(d)} className={`glass h-11 rounded-xl font-display text-lg hover:border-violet/60 ${d === 0 ? 'col-start-2' : ''}`}>{d}</button>
            ))}
          </div>
        </>
      )}
      <p className="mt-2 text-center text-xs text-dim">{progress}/{target.length} connected</p>
    </div>
  )
}

export default function TraitorAmongUs({ level, onFinish }) {
  const [game, setGame] = useState(() => createGame((Date.now() % 100000) + level * 7919, level))
  const [activeCard, setActiveCard] = useState(null) // index | 'sabotage' | null
  const [chat, setChat] = useState('')
  const [myVote, setMyVote] = useState(null)
  const timers = useRef([])
  const finishedRef = useRef(false)
  const chatRef = useRef(null)

  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const youTraitor = game.traitorId === 0
  const phase = PHASES[game.phase] || PHASES.task
  const PhaseIcon = phase.icon

  // Finish exactly once when logic reports a result.
  useEffect(() => {
    if (!game.result || finishedRef.current) return
    const id = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      const { score, won } = scoreGame(game)
      const reasons = {
        mission: 'The mission meter hit 100% — the crew finished the job.',
        'mission-failed': 'Sabotage drained the mission meter to zero.',
        ejected: 'The traitor was ejected into the void.',
        survived: 'The traitor survived all 3 rounds.',
        'you-ejected': 'You were ejected by the crew.',
      }
      onFinish({
        score,
        rating: clamp(score / 650, 0, 1),
        won,
        summary: `${reasons[game.result.reason]} ${youTraitor ? 'You were the traitor.' : 'You were crew.'}`,
        stats: [
          { label: 'Role', value: youTraitor ? 'Traitor' : 'Crew' },
          { label: 'Correct votes', value: game.correctVotes },
          youTraitor ? { label: 'Sabotages', value: game.sabotages } : { label: 'Tasks done', value: game.tasksDone },
          { label: 'Mission', value: `${game.mission}%` },
        ],
      })
    }, 1400)
    timers.current.push(id)
    return () => clearTimeout(id)
  }, [game, onFinish, youTraitor])

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [game.log.length])

  const finishTask = (idx) => { setGame((g) => doTask(g, idx)); setActiveCard(null) }
  const doSabotage = () => { setGame((g) => sabotage(g)); setActiveCard(null) }

  const startDiscussion = () => {
    const { state, messages } = botMessages(game)
    const withPhase = setPhase(state, 'discussion')
    const base = withPhase.log.length - messages.length
    setGame({ ...withPhase, log: withPhase.log.slice(0, base) })
    // Stagger bot messages into the log for a live-chat feel.
    messages.forEach((m, i) => later(() => {
      setGame((cur) => ({ ...cur, log: [...cur.log, { ...m, round: cur.round }] }))
    }, 500 + i * 750))
  }

  const sendChat = () => {
    const text = chat.trim()
    if (!text || game.phase !== 'discussion') return
    setChat('')
    setGame((g) => playerMessage(g, text).state)
  }

  const doAccuse = (id) => {
    if (game.phase !== 'discussion') return
    setGame((g) => accuse(g, id).state)
  }

  const lockVote = () => { setGame((g) => vote(g, myVote)); setMyVote(null) }

  const ejectedPlayer = game.ejected !== null && game.ejected !== undefined ? game.players[game.ejected] : null

  return (
    <Frame>
      {/* HUD */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Stat label="Round" value={`${game.round}/${MAX_ROUNDS}`} />
        <Stat label="Score" value={scoreGame(game).score} />
        <div className={`glass flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${youTraitor ? 'text-danger' : 'text-success'}`}>
          {youTraitor ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
          {youTraitor ? 'TRAITOR' : 'CREW'}
        </div>
      </div>

      {/* Mission meter */}
      <div className="glass rounded-2xl p-3">
        <div className="flex items-center justify-between text-xs text-dim">
          <span className="flex items-center gap-1.5"><Rocket size={14} className="text-cyan" /> Mission progress</span>
          <span className="font-display text-sm text-ink">{game.mission}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
          <motion.div className={`h-full rounded-full ${game.mission > 60 ? 'bg-success' : game.mission > 25 ? 'bg-cyan' : 'bg-danger'}`} animate={{ width: `${game.mission}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
        </div>
      </div>

      {/* Phase banner */}
      <div className={`mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-panel/70 px-4 py-2 text-sm font-semibold ${phase.tone}`}>
        <PhaseIcon size={16} /> {phase.label}
        {game.phase === 'task' && <span className="ml-auto text-xs font-normal text-dim">{youTraitor ? 'Do a task… or sabotage.' : 'Pick one task card.'}</span>}
      </div>

      {/* Player cards */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {game.players.map((p) => {
          const votable = game.phase === 'vote' && p.alive && p.id !== 0 && game.ejected === null
          const selected = myVote === p.id
          return (
            <div key={p.id} className={`glass relative rounded-xl p-2.5 text-center ${!p.alive ? 'opacity-45' : ''} ${selected ? 'border-warn/70' : ''}`}>
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold text-void" style={{ background: p.color }}>
                {p.alive ? p.name[0] : <Skull size={16} />}
              </div>
              <div className="mt-1 truncate text-xs font-semibold">{p.name}{p.id === 0 && <span className="text-violet-soft"> ★</span>}</div>
              <div className="text-[10px] capitalize text-dim">{p.personality}</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" title={`Suspicion ${p.suspicion}`}>
                <div className={`h-full rounded-full ${p.suspicion > 50 ? 'bg-danger' : p.suspicion > 25 ? 'bg-warn' : 'bg-success'}`} style={{ width: `${p.suspicion}%` }} />
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-1 text-[9px] text-dim"><Eye size={9} /> {p.suspicion}</div>
              {game.phase === 'discussion' && p.alive && p.id !== 0 && (
                <button onClick={() => doAccuse(p.id)} className="mt-1 w-full rounded-lg border border-danger/40 bg-danger/10 px-1 py-1 text-[10px] font-semibold text-danger hover:bg-danger/20">Accuse</button>
              )}
              {votable && (
                <button onClick={() => setMyVote(selected ? null : p.id)} aria-pressed={selected} className={`mt-1 w-full rounded-lg border px-1 py-1 text-[10px] font-semibold ${selected ? 'border-warn bg-warn/20 text-warn' : 'border-white/15 text-dim hover:text-ink'}`}>{selected ? 'Voted' : 'Vote'}</button>
              )}
              {game.votes && game.ejected !== null && game.votes[p.id] !== undefined && game.votes[p.id] !== null && (
                <div className="mt-1 text-[9px] text-dim">voted {game.players[game.votes[p.id]].name}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* TASK PHASE */}
      {game.phase === 'task' && !game.result && (
        <div className="glass mt-3 rounded-2xl p-4">
          {game.roundInfo ? (
            <div>
              <p className="text-sm font-semibold">Round {game.round} report</p>
              {game.roundInfo.sabotage && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm text-danger">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>Someone tried to <b>{game.roundInfo.sabotage.what}</b>! Witnesses place <b>{game.roundInfo.sabotage.near.map((id) => game.players[id].name).join(' and ')}</b> nearby.</span>
                </div>
              )}
              <ul className="mt-2 space-y-1 text-xs text-dim">
                {game.roundInfo.botResults.map((r) => (
                  <li key={r.playerId}>
                    <b style={{ color: game.players[r.playerId].color }}>{game.players[r.playerId].name}</b>{' '}
                    {r.action === 'task' ? `completed a task (+${r.gain}%)` : r.action === 'skip' ? 'skipped their task ⚠' : 'was up to something…'}
                  </li>
                ))}
              </ul>
              <Button className="mt-3 w-full" onClick={startDiscussion}><MessageSquare size={16} /> Start discussion</Button>
            </div>
          ) : activeCard === 'sabotage' ? (
            <div className="rounded-2xl border border-danger/50 bg-danger/10 p-4 text-center">
              <ShieldAlert size={28} className="mx-auto text-danger" />
              <p className="mt-2 text-sm">Sabotage drains the mission meter — but witnesses may place <b>you</b> at the scene.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setActiveCard(null)}>Back</Button>
                <Button className="flex-1 !bg-danger hover:!bg-danger/80" onClick={doSabotage}>Sabotage!</Button>
              </div>
            </div>
          ) : activeCard !== null ? (
            <MiniTask card={game.taskCards[activeCard]} onDone={() => finishTask(activeCard)} />
          ) : (
            <div className="grid gap-2">
              {game.taskCards.map((c, i) => (
                <button key={c.id} onClick={() => setActiveCard(i)} className="glass flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm hover:border-violet/60">
                  <Zap size={18} className="shrink-0 text-cyan" />
                  <span className="flex-1">{c.name}<span className="block text-xs text-dim">{c.kind === 'wires' ? 'Wire connect' : 'Code tap'} · +{c.reward}% mission</span></span>
                </button>
              ))}
              {youTraitor && (
                <button onClick={() => setActiveCard('sabotage')} className="flex items-center gap-3 rounded-xl border border-danger/50 bg-danger/10 px-4 py-3 text-left text-sm text-danger hover:bg-danger/20">
                  <ShieldAlert size={18} className="shrink-0" />
                  <span className="flex-1">SABOTAGE<span className="block text-xs opacity-80">Drain the mission meter instead</span></span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* DISCUSSION PHASE */}
      {game.phase === 'discussion' && (
        <div className="glass mt-3 rounded-2xl p-4">
          <div ref={chatRef} className="max-h-56 space-y-2 overflow-y-auto pr-1" aria-label="Chat log" aria-live="polite">
            <AnimatePresence initial={false}>
              {game.log.filter((m) => m.round === game.round).map((m, i) => (
                <motion.div key={`${m.round}-${i}-${m.text.slice(0, 8)}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-2.5 text-sm ${m.playerId === 0 ? 'bg-violet/15' : m.playerId === -1 ? 'bg-danger/15 text-danger' : 'bg-white/5'}`}>
                  {m.playerId >= 0 && <b style={{ color: game.players[m.playerId].color }}>{game.players[m.playerId].name}: </b>}
                  {m.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-3 flex gap-2">
            <input value={chat} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} maxLength={140} placeholder="Say something to the crew…" className="h-11 flex-1 rounded-xl border border-white/15 bg-panel px-3 text-sm text-ink placeholder:text-dim focus:border-violet/60 focus:outline-none" />
            <Button size="md" onClick={sendChat} disabled={!chat.trim()} aria-label="Send message"><Send size={16} /></Button>
          </div>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setGame((g) => setPhase(g, 'vote'))}><Vote size={16} /> Call emergency vote</Button>
        </div>
      )}

      {/* VOTE PHASE */}
      {game.phase === 'vote' && (
        <div className="glass mt-3 rounded-2xl p-4">
          {ejectedPlayer ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`rounded-2xl border p-4 text-center ${ejectedPlayer.isTraitor ? 'border-success/60 bg-success/10' : 'border-danger/60 bg-danger/10'}`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full font-display text-lg font-bold text-void" style={{ background: ejectedPlayer.color }}>{ejectedPlayer.name[0]}</div>
              <p className="mt-2 font-display text-lg font-bold">{ejectedPlayer.name} was ejected.</p>
              <p className={`text-sm font-semibold ${ejectedPlayer.isTraitor ? 'text-success' : 'text-danger'}`}>
                {ejectedPlayer.isTraitor ? 'They WERE the traitor!' : 'They were innocent crew…'}
              </p>
              {!game.result && <Button className="mt-3" onClick={() => setGame((g) => nextRound(g))}>Next round</Button>}
            </motion.div>
          ) : (
            <>
              <p className="text-sm text-dim">Who is the traitor? Select a player above, then lock it in. Bots vote on their suspicion meters.</p>
              <Button className="mt-3 w-full" disabled={myVote === null} onClick={lockVote}><Vote size={16} /> {myVote === null ? 'Select a suspect' : `Eject ${game.players[myVote].name}`}</Button>
            </>
          )}
        </div>
      )}

      {/* END */}
      {game.result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 rounded-2xl border p-4 text-center ${scoreGame(game).won ? 'border-success/60 bg-success/10' : 'border-danger/60 bg-danger/10'}`}>
          <p className="font-display text-lg font-bold">{scoreGame(game).won ? 'Victory!' : 'Defeat.'}</p>
          <p className="text-sm text-dim">The traitor was <b style={{ color: game.players[game.traitorId].color }}>{game.players[game.traitorId].name}</b>.</p>
        </motion.div>
      )}
    </Frame>
  )
}
