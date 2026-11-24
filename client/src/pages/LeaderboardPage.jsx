import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Crown, RefreshCw, Trophy } from 'lucide-react'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/ui/Button.jsx'
import { api } from '../api'
import { games, getGame } from '../data/games'
import { isPlayable } from '../games/registry'
import { useAuth } from '../engine/auth.jsx'

const playable = games.filter((g) => isPlayable(g.slug))

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [slug, setSlug] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api(`/leaderboard${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`)
      setRows(data.rows || [])
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

  const title = slug ? getGame(slug)?.title : 'Global'

  return (
    <div className="section-pad py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl"><Trophy className="text-warn" size={32} /> Leaderboard</h1>
          <p className="mt-2 text-dim">{slug ? `Best scores for ${title}.` : 'Top players by total XP. Sign in to appear here.'}</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</Button>
      </div>

      <div className="mt-6 max-w-sm">
        <label htmlFor="board-game" className="text-sm text-dim">Board</label>
        <select id="board-game" value={slug} onChange={(e) => setSlug(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-navy/70 px-3 py-2.5 text-sm focus:border-violet/60 focus:outline-none">
          <option value="">Global (total XP)</option>
          {playable.map((g) => <option key={g.slug} value={g.slug}>{g.title}</option>)}
        </select>
      </div>

      <div className="glass mt-6 overflow-hidden rounded-2xl">
        {loading ? (
          <p className="p-6 text-sm text-dim">Loading leaderboard…</p>
        ) : error ? (
          <p role="alert" className="p-6 text-sm text-danger">{error} <button className="underline" onClick={load}>Retry</button></p>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="mx-auto text-dim" size={30} />
            <p className="mt-2 font-medium">No scores yet</p>
            <p className="mt-1 text-sm text-dim">{user ? 'Play a game to claim the first spot.' : 'Sign in and play to put your name on the board.'}</p>
            <Button to={user ? '/games' : '/auth?next=/leaderboard'} className="mt-4">{user ? 'Browse games' : 'Sign in'}</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-dim">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 text-right font-medium">{slug ? 'Best score' : 'XP'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.name}-${i}`} className={`border-b border-white/5 last:border-0 ${user?.name === r.name ? 'bg-violet/10' : ''}`}>
                  <td className="px-4 py-3 font-mono text-dim">{i === 0 ? <Crown size={16} className="text-warn" /> : i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar id={r.avatar} size={26} />
                      <span className="font-medium">{r.name}{user?.name === r.name && <span className="ml-1 text-xs text-dim">(you)</span>}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-dim">{r.level}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-dim">
        {slug ? <Link to={`/games/${slug}`} className="text-violet-soft hover:underline">Open {title} →</Link> : 'Per-game boards rank personal bests; the global board ranks total XP.'}
      </p>
    </div>
  )
}
