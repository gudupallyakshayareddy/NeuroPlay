import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Check, Copy, Crown, HelpCircle, LogOut, MessageSquare, Play,
  Send, ShieldAlert, Skull, Users, Wifi, WifiOff, X,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import {
  clearRoomError, connectSocket, gameAction, joinRoom, leaveRoom, rematchRoom,
  sendChat, setReady, startRoom, useRoom,
} from '../engine/room'
import { useAuth } from '../engine/auth.jsx'
import { useProgress } from '../engine/progress'
import { getGame } from '../data/games'
import { cn } from '../utils/cn'

export default function RoomPage() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()
  const { user } = useAuth()
  const progress = useProgress()
  const roomState = useRoom()
  const nav = useNavigate()
  const { connected, room, chat, gameState, priv, results, error } = roomState
  const myId = roomState.myId
  const name = user?.name || progress.name
  const avatar = user?.avatar || 'nova'

  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [copied, setCopied] = useState(false)
  const joinedRef = useRef('')
  const chatEndRef = useRef(null)

  const game = room ? getGame(room.game) : null
  const me = room?.players.find((p) => p.id === myId)
  const isHost = room?.hostId === myId
  const others = room?.players.filter((p) => p.id !== myId) ?? []
  const inviteUrl = useMemo(() => `${window.location.origin}/online/${roomCode}`, [roomCode])

  useEffect(() => { connectSocket() }, [])

  // Join once the socket is connected (a room created on the lobby page is already joined).
  useEffect(() => {
    if (!connected) return
    if (room?.code === roomCode) { joinedRef.current = roomCode; return }
    if (joinedRef.current === roomCode && !room) return // leave in progress, do not rejoin
    joinedRef.current = roomCode
    setJoining(true)
    joinRoom(roomCode, name, avatar).then((r) => {
      setJoining(false)
      if (r?.error) setJoinError(r.error)
    })
  }, [connected, roomCode, room?.code, name, avatar, room])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ block: 'nearest' }) }, [chat.length])

  const copy = async () => {
    try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard blocked */ }
  }

  const leave = () => { leaveRoom(); nav('/online') }

  if (joinError) {
    return (
      <div className="section-pad py-20">
        <div className="glass mx-auto max-w-md rounded-3xl p-8 text-center">
          <X className="mx-auto text-danger" size={36} />
          <h1 className="mt-3 text-2xl font-bold">Cannot join this room</h1>
          <p className="mt-2 text-sm text-dim">{joinError}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => { setJoinError(''); joinedRef.current = ''; connectSocket(); joinRoom(roomCode, name, avatar).then((r) => r?.error && setJoinError(r.error)) }}>Try again</Button>
            <Button to="/online" variant="secondary">Online lobby</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!room || room.code !== roomCode) {
    return (
      <div className="section-pad py-20 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="mx-auto h-8 w-8 rounded-full border-2 border-violet border-t-transparent" />
        <p className="mt-4 text-dim">{joining || connected ? 'Joining room…' : 'Connecting to the multiplayer server…'}</p>
        <p className="mt-1 text-xs text-dim">Room {roomCode}</p>
        <Button to="/online" variant="ghost" className="mt-6">Back to lobby</Button>
      </div>
    )
  }

  return (
    <div className="section-pad py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/online" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink" onClick={leave}>
          <ArrowLeft size={16} /> Online lobby
        </Link>
        <span className={cn('glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs', connected ? 'text-success' : 'text-dim')}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Connected' : 'Reconnecting…'}
        </span>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="glass rounded-3xl p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-violet-soft">{game?.title || room.game}</div>
                <h1 className="mt-1 text-3xl font-bold">
                  <span className="font-mono tracking-[0.3em] text-gradient">{room.code}</span>
                </h1>
                <p className="mt-1 text-sm text-dim">
                  {room.phase === 'lobby' ? 'Share this code or the invite link to bring friends in.' : room.phase === 'results' ? 'The round is over.' : 'Game in progress.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Invite link'}</Button>
                <Button variant="ghost" size="sm" onClick={leave}><LogOut size={15} /> Leave</Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <MiniStat label="Players" value={`${room.players.length}/8`} />
              <MiniStat label="Phase" value={room.phase} />
              <MiniStat label="You" value={priv?.role ? (priv.role === 'traitor' ? 'Traitor' : 'Crew') : 'Unknown'} tone={priv?.role === 'traitor' ? 'text-danger' : 'text-success'} />
              <MiniStat label="Host" value={isHost ? 'You' : (room.players.find((p) => p.id === room.hostId)?.name ?? '—')} />
            </div>

            {room.phase === 'lobby' && (
              <Lobby room={room} me={me} isHost={isHost} onReady={setReady} onStart={startRoom} />
            )}
            {room.phase === 'playing' && room.game === 'traitor-among-us' && (
              <TraitorGame room={room} gameState={gameState} priv={priv} myId={myId} isHost={isHost} />
            )}
            {room.phase === 'playing' && room.game === 'caption-battle' && (
              <CaptionGame room={room} gameState={gameState} myId={myId} />
            )}
            {room.phase === 'results' && <Results results={results} myId={myId} isHost={isHost} onRematch={rematchRoom} />}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <PlayerList room={room} myId={myId} />
          <Chat chat={chat} endRef={chatEndRef} />
        </aside>
      </div>

      {error && (
        <div role="alert" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-danger/40 bg-danger/15 px-4 py-2.5 text-sm text-danger backdrop-blur">
          {error}
          <button onClick={clearRoomError} aria-label="Dismiss error" className="rounded p-0.5 hover:bg-white/10"><X size={14} /></button>
        </div>
      )}
    </div>
  )
}

const MiniStat = ({ label, value, tone = 'text-ink' }) => (
  <div className="rounded-xl bg-white/5 p-3">
    <div className="text-xs text-dim">{label}</div>
    <div className={cn('mt-0.5 truncate font-medium capitalize', tone)}>{value}</div>
  </div>
)

function Lobby({ room, me, isHost, onReady, onStart }) {
  const allReady = room.players.every((p) => p.ready || p.id === room.hostId)
  const need = room.game === 'traitor-among-us' ? 3 : 2
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Users size={17} className="text-cyan" /> Lobby</h2>
      <p className="mt-1 text-sm text-dim">
        {room.players.length < need
          ? `${room.game === 'traitor-among-us' ? 'Traitor needs 3+ players' : 'Caption Battle works best with 2+ players'} — share the invite link.`
          : allReady ? 'Everyone is ready. The host can start.' : 'Waiting for everyone to ready up.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {!isHost && (
          <Button variant={me?.ready ? 'secondary' : 'primary'} onClick={() => onReady(!me?.ready)}>
            {me?.ready ? <><X size={16} /> Not ready</> : <><Check size={16} /> I&apos;m ready</>}
          </Button>
        )}
        {isHost && <Button onClick={onStart} disabled={!allReady || room.players.length < need}><Play size={16} /> Start game</Button>}
      </div>
      {isHost && <p className="mt-2 text-xs text-dim">You are the host. Start when everyone has readied up.</p>}
    </div>
  )
}

function PlayerList({ room, myId }) {
  return (
    <div className="glass rounded-3xl p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Users size={16} className="text-cyan" /> Players</h2>
      <ul className="mt-3 space-y-2">
        {room.players.map((p) => (
          <li key={p.id} className={cn('flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm', p.id === myId && 'bg-white/5')}>
            <Avatar id={p.avatar} size={30} />
            <span className="min-w-0 flex-1 truncate font-medium">{p.name}{p.id === myId && <span className="ml-1 text-xs text-dim">(you)</span>}</span>
            {room.hostId === p.id && <Crown size={14} className="text-warn" aria-label="Host" />}
            {room.phase === 'lobby' && <span className={cn('h-2 w-2 rounded-full', p.ready || p.id === room.hostId ? 'bg-success' : 'bg-white/20')} aria-label={p.ready ? 'Ready' : 'Not ready'} />}
            {room.phase !== 'lobby' && <span className="font-mono text-xs text-dim">{p.score}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Chat({ chat, endRef }) {
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    sendChat(text.trim())
    setText('')
  }
  return (
    <div className="glass flex min-h-[16rem] flex-1 flex-col rounded-3xl p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare size={16} className="text-violet-soft" /> Room chat</h2>
      <ul className="mt-3 max-h-64 flex-1 space-y-2 overflow-y-auto text-sm" aria-live="polite">
        {chat.length === 0 && <li className="text-xs text-dim">No messages yet. Say hello.</li>}
        {chat.map((m, i) => (
          <li key={`${m.at}-${i}`} className={cn('rounded-lg px-2.5 py-1.5', m.system ? 'bg-violet/10 text-xs text-violet-soft' : 'bg-white/5')}>
            {!m.system && <span className="font-semibold">{m.from}: </span>}{m.text}
          </li>
        ))}
        <li ref={endRef} />
      </ul>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Message…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-navy/70 px-3 py-2 text-sm placeholder:text-dim/60 focus:border-violet/60 focus:outline-none" aria-label="Chat message" />
        <Button type="submit" size="sm" disabled={!text.trim()} aria-label="Send message"><Send size={15} /></Button>
      </form>
    </div>
  )
}

function TraitorGame({ room, gameState, priv, myId, isHost }) {
  const [tab, setTab] = useState('mission')
  if (!gameState) return <p className="mt-6 text-sm text-dim">Dealing secret roles…</p>
  const s = gameState
  const players = room.players
  const iActed = s.acted?.includes(myId)
  const phase = s.phase

  const accuse = (id) => gameAction({ type: 'accuse', target: id })
  const vote = (id) => gameAction({ type: 'vote', target: id })
  const callVote = () => gameAction({ type: 'callVote' })

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Round {s.round} / {s.maxRounds}</h2>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', priv?.role === 'traitor' ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success')}>
          {priv?.eliminated ? 'Ejected' : priv?.role === 'traitor' ? <><Skull size={12} className="mr-1 inline" /> You are the traitor</> : <><ShieldAlert size={12} className="mr-1 inline" /> You are crew</>}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-dim"><span>Mission progress</span><span>{s.mission}%</span></div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className={cn('h-full rounded-full transition-all', s.mission >= 100 ? 'bg-success' : 'bg-gradient-to-r from-violet to-cyan')} style={{ width: `${Math.min(100, s.mission)}%` }} />
        </div>
      </div>

      <div className="mt-4 flex gap-1 rounded-xl bg-white/5 p-1" role="tablist">
        {[['mission', 'Mission'], ['players', phase === 'vote' ? 'Vote' : 'Suspects']].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn('flex-1 rounded-lg py-1.5 text-sm font-medium', tab === id ? 'bg-violet text-white' : 'text-dim hover:text-ink')}>{label}</button>
        ))}
      </div>

      {tab === 'mission' && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {phase === 'tasks' && (
            <>
              <p className="text-sm text-dim">Complete one action this round. The traitor can sabotage instead.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button disabled={iActed || priv?.eliminated} onClick={() => gameAction({ type: 'task' })}><Check size={16} /> Complete task</Button>
                {priv?.role === 'traitor' && <Button variant="secondary" disabled={iActed} onClick={() => gameAction({ type: 'sabotage' })}><Skull size={16} /> Sabotage (-15%)</Button>}
              </div>
              {iActed && <p className="mt-2 text-xs text-success">Action locked in. Waiting for the others…</p>}
            </>
          )}
          {phase === 'discussion' && (
            <>
              <p className="text-sm text-dim">Talk it out in chat. The host calls the vote when the room is ready.</p>
              {isHost && <Button className="mt-3" onClick={callVote}><HelpCircle size={16} /> Call the vote</Button>}
            </>
          )}
          {phase === 'vote' && <p className="text-sm text-dim">Voting is open — pick a suspect in the Suspects tab.</p>}
          {s.ejected && <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">Last vote ejected {s.ejected.name} ({s.ejected.role}).</p>}
        </div>
      )}

      {tab === 'players' && (
        <ul className="mt-4 space-y-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-2.5 text-sm">
              <Avatar id={p.avatar} size={26} />
              <span className="min-w-0 flex-1 truncate">{p.name}{p.id === myId && <span className="ml-1 text-xs text-dim">(you)</span>}</span>
              {phase === 'discussion' && p.id !== myId && <Button size="sm" variant="secondary" onClick={() => accuse(p.id)}>Accuse</Button>}
              {phase === 'vote' && p.id !== myId && <Button size="sm" onClick={() => vote(p.id)}>Vote</Button>}
            </li>
          ))}
        </ul>
      )}

      {s.log?.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-dim">
          {s.log.slice(-5).map((l, i) => <li key={i}>· {l}</li>)}
        </ul>
      )}
    </div>
  )
}

function CaptionGame({ room, gameState, myId }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const s = gameState
  useEffect(() => { setSent(false); setText('') }, [s?.round])
  if (!s) return <p className="mt-6 text-sm text-dim">Preparing the first prompt…</p>
  const submitted = s.submitted?.includes(myId)
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim() || submitted) return
    gameAction({ type: 'caption', text: text.trim() })
    setSent(true)
  }
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Round {s.round} / {s.maxRounds}</span>
        <span className="text-xs text-dim">{s.judging ? 'Judging…' : `${s.submitted?.length ?? 0}/${room.players.length} submitted`}</span>
      </div>
      <p className="mt-3 rounded-xl bg-violet/10 p-3 text-sm">{s.prompt}</p>
      {!s.judging && (
        <form onSubmit={submit} className="mt-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={200} rows={3} disabled={submitted || sent}
            placeholder="Write the caption that wins…" aria-label="Your caption"
            className="w-full resize-none rounded-xl border border-white/10 bg-navy/70 px-3 py-2 text-sm placeholder:text-dim/60 focus:border-violet/60 focus:outline-none disabled:opacity-60" />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-dim">{text.length}/200</span>
            <Button type="submit" size="sm" disabled={!text.trim() || submitted || sent}>{submitted || sent ? 'Caption locked in' : 'Submit caption'}</Button>
          </div>
        </form>
      )}
      {s.roundResult?.rows && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Round {s.roundResult.round} results</h3>
          <ul className="mt-2 space-y-2">
            {s.roundResult.rows.map((r) => (
              <li key={r.id} className="rounded-xl bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.name}{r.id === myId && <span className="ml-1 text-xs text-dim">(you)</span>}</span>
                  <span className="font-mono text-violet-soft">{r.score} pts</span>
                </div>
                <p className="mt-1 text-dim">{r.caption || <i>No caption</i>}</p>
                {r.verdict && <p className="mt-1 text-xs text-dim">{r.verdict}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.judging && <p className="mt-3 text-sm text-dim">The judge is reading every caption…</p>}
    </div>
  )
}

function Results({ results, myId, isHost, onRematch }) {
  const rows = results?.rows ?? []
  const mine = rows.find((r) => r.id === myId)
  return (
    <div className="mt-6 rounded-2xl border border-warn/30 bg-warn/5 p-5">
      <h2 className="text-xl font-bold text-warn">{results?.reason || 'Game over'}</h2>
      <p className="mt-1 text-sm text-dim">{mine ? (mine.won ? 'You won this one.' : `You scored ${mine.score} points.`) : 'The room is finishing up.'}</p>
      <ol className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <li key={r.id} className={cn('flex items-center gap-3 rounded-xl p-2.5 text-sm', r.id === myId ? 'bg-violet/15' : 'bg-white/5')}>
            <span className="w-5 text-center font-mono text-xs text-dim">{i + 1}</span>
            <Avatar id={r.avatar} size={26} />
            <span className="min-w-0 flex-1 truncate">{r.name}{r.id === myId && <span className="ml-1 text-xs text-dim">(you)</span>}{r.won && <span className="ml-2 rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">Winner</span>}</span>
            <span className="font-mono">{r.score}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        {isHost ? <Button onClick={onRematch}>Back to lobby</Button> : <p className="self-center text-xs text-dim">Waiting for the host to start a rematch…</p>}
        <Button to="/games" variant="secondary">Solo games</Button>
        <Button to="/online" variant="ghost">Leave room</Button>
      </div>
    </div>
  )
}
