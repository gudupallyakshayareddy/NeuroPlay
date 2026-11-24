import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, MessageSquareQuote, Plus, LogIn, Wifi, WifiOff } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../engine/auth.jsx'
import { useProgress } from '../engine/progress'
import { createRoom, useRoom, connectSocket } from '../engine/room'
import { getGame } from '../data/games'
import GameArt from '../components/game/GameArt.jsx'

const ONLINE_GAMES = ['traitor-among-us', 'caption-battle']

export default function OnlinePage() {
  const { user } = useAuth()
  const progress = useProgress()
  const { connected, error } = useRoom()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const name = user?.name || progress.name
  const avatar = user?.avatar || 'nova'

  useEffect(() => { connectSocket() }, [])

  const create = async (slug) => {
    setBusy(true)
    const r = await createRoom(slug, name, avatar)
    setBusy(false)
    if (r?.room) nav(`/online/${r.room.code}`)
  }
  const join = (e) => {
    e.preventDefault()
    if (code.trim().length === 6) nav(`/online/${code.trim().toUpperCase()}`)
  }

  return (
    <div className="section-pad py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Play <span className="text-gradient">Online</span></h1>
          <p className="mt-2 text-dim">Create a room, share the code, play together in real time.</p>
        </div>
        <span className={`glass flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${connected ? 'text-success' : 'text-dim'}`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Multiplayer server connected' : 'Connecting…'}
        </span>
      </div>
      {error && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {ONLINE_GAMES.map((slug, i) => {
          const g = getGame(slug)
          return (
            <motion.div key={slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass glass-hover overflow-hidden rounded-3xl">
              <GameArt game={g} color={slug === 'traitor-among-us' ? '#8B5CF6' : '#34D399'} className="h-36 w-full" />
              <div className="p-5">
                <div className="flex items-center gap-2">
                  {slug === 'traitor-among-us' ? <Users size={18} className="text-violet-soft" /> : <MessageSquareQuote size={18} className="text-success" />}
                  <h2 className="text-lg font-bold">{g.title}</h2>
                </div>
                <p className="mt-2 text-sm text-dim">{g.description}</p>
                <p className="mt-2 text-xs text-dim">{slug === 'traitor-among-us' ? '3–8 players · hidden roles · voting' : '2–8 players · AI-judged captions · 3 rounds'}</p>
                <Button className="mt-4 w-full" disabled={busy} onClick={() => create(slug)}><Plus size={16} /> Create room</Button>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="glass mt-8 max-w-md rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><LogIn size={18} className="text-cyan" /> Join with a code</h2>
        <form onSubmit={join} className="mt-3 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123"
            className="w-full rounded-xl border border-white/10 bg-navy/70 px-4 py-3 font-mono text-sm tracking-widest placeholder:text-dim/50 focus:border-violet/60 focus:outline-none" aria-label="Room code" />
          <Button type="submit" disabled={code.trim().length !== 6}>Join</Button>
        </form>
        <p className="mt-3 text-xs text-dim">Solo player? Both games also work offline against AI opponents from the <Link to="/games" className="text-violet-soft hover:underline">game library</Link>.</p>
      </div>
    </div>
  )
}