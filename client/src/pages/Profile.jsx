import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Award, Lock, LogIn, LogOut, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import Avatar, { AVATAR_IDS } from '../components/ui/Avatar.jsx'
import LevelRing from '../components/ui/LevelRing.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { achievements } from '../engine/achievements'
import { currentStreak, levelInfo, resetProgress, setName, useProgress } from '../engine/progress'
import { useAuth } from '../engine/auth.jsx'
import { api } from '../api'
import { games, getGame } from '../data/games'
import { isPlayable } from '../games/registry'
import { timeAgo } from './Dashboard.jsx'

const tabs = ['overview', 'history', 'achievements', 'settings']

export default function Profile() {
  const { hash } = useLocation()
  const [tab, setTab] = useState(tabs.includes(hash.slice(1)) ? hash.slice(1) : 'overview')
  const p = useProgress()
  const toast = useToast()
  const { user, logout, updateMe } = useAuth()
  const info = levelInfo(p.xp)
  const [name, setNameInput] = useState(p.name)
  const [confirm, setConfirm] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const wins = p.history.filter((h) => h.won).length
  const avg = p.history.length ? Math.round((p.history.reduce((n, h) => n + h.rating, 0) / p.history.length) * 100) : 0

  const saveName = async (e) => {
    e.preventDefault()
    const clean = name.trim().slice(0, 20)
    if (clean.length < 2) return toast('Name needs at least 2 characters', 'error')
    try {
      if (user) await updateMe({ name: clean })
      else setName(clean)
      toast('Name saved')
    } catch (err) { toast(err.message, 'error') }
  }

  const pickAvatar = async (avatar) => {
    try { await updateMe({ avatar }); toast('Avatar updated') } catch (err) { toast(err.message, 'error') }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwBusy(true)
    try {
      await api('/auth/password', pw)
      setPw({ current: '', next: '' })
      toast('Password changed')
    } catch (err) { toast(err.message, 'error') } finally { setPwBusy(false) }
  }

  const field = 'w-full rounded-xl border border-white/15 bg-void/60 px-4 py-2.5 outline-none focus:border-cyan'

  return (
    <div className="section-pad py-8 sm:py-12">
      <div className="glass flex flex-wrap items-center gap-6 rounded-3xl p-6">
        {user ? <Avatar id={user.avatar} size={96} /> : <LevelRing level={info.level} pct={info.pct} size={110} />}
        <div>
          <h1 className="text-3xl font-bold">{p.name}</h1>
          <p className="text-sm text-dim">{p.xp} XP · {p.coins} coins · {currentStreak(p)}-day streak (best {p.bestStreak})</p>
          <p className="mt-1 text-xs text-dim">
            {user ? `Signed in as ${user.email} · progress synced to your account` : 'Guest mode: progress is saved in this browser only. Sign in to sync it across devices.'}
          </p>
          {!user && <Button to="/auth?next=/profile" size="sm" className="mt-3"><LogIn size={15} /> Sign in</Button>}
        </div>
        <div className="ml-auto flex gap-2">
          <Button to="/leaderboard" variant="secondary" size="sm">Leaderboard</Button>
          {user && <Button to="/friends" variant="ghost" size="sm">Friends</Button>}
        </div>
      </div>

      <div role="tablist" className="mt-6 flex gap-2 overflow-x-auto">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-violet text-white' : 'glass text-dim hover:text-ink'}`}>{t}</button>)}
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[['Games played', p.history.length], ['Wins', wins], ['Average score rating', `${avg}%`], ['Games tried', `${Object.keys(p.plays).length}/${games.filter((g) => isPlayable(g.slug)).length}`]].map(([l, v]) => (
                <div key={l} className="glass rounded-2xl p-4"><div className="text-xs text-dim">{l}</div><div className="mt-1 font-display text-2xl font-bold">{v}</div></div>
              ))}
            </div>
            <h2 className="mt-8 text-lg font-semibold">Personal bests</h2>
            {Object.keys(p.best).length === 0 ? <p className="mt-2 text-sm text-dim">Play a game to set your first record.</p> : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(p.best).map(([slug, b]) => <li key={slug} className="glass flex justify-between rounded-xl p-3 text-sm"><Link to={`/games/${slug}`} className="font-medium hover:text-violet-soft">{getGame(slug)?.title ?? slug}</Link><span className="text-dim">{b.score} pts · {p.plays[slug]} plays</span></li>)}
              </ul>
            )}
          </>
        )}

        {tab === 'history' && (p.history.length === 0
          ? <EmptyState icon={Award} title="No games yet" text="Finish a game and it will be listed here." action={<Button to="/games">Browse games</Button>} />
          : <ul className="space-y-2" id="history">
              {p.history.map((h) => (
                <li key={h.id} className="glass flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-sm">
                  <div><Link to={`/games/${h.slug}`} className="font-medium hover:text-violet-soft">{getGame(h.slug)?.title ?? h.slug}</Link>{h.daily && <span className="ml-2 rounded-full bg-violet/25 px-2 py-0.5 text-xs">Daily</span>}<div className="text-xs text-dim">{h.summary}</div></div>
                  <div className="text-right text-xs text-dim"><b className="text-ink">{h.score} pts</b> · +{h.xp} XP · {h.won ? 'won' : 'lost'}<div>{timeAgo(h.at)}</div></div>
                </li>
              ))}
            </ul>)}

        {tab === 'achievements' && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((a) => {
              const got = p.achievements[a.id]
              return <li key={a.id} className={`glass flex items-start gap-3 rounded-xl p-4 ${got ? 'border-warn/40' : 'opacity-60'}`}>
                {got ? <Award className="mt-0.5 text-warn" size={20} /> : <Lock className="mt-0.5 text-dim" size={20} />}
                <div><div className="font-medium">{a.title}</div><div className="text-xs text-dim">{a.text}{a.coins ? ` · +${a.coins} coins` : ''}</div>{got && <div className="mt-1 text-xs text-success">Unlocked {new Date(got).toLocaleDateString()}</div>}</div></li>
            })}
          </ul>
        )}

        {tab === 'settings' && (
          <div className="max-w-md space-y-8">
            <form onSubmit={saveName}>
              <label htmlFor="pname" className="text-sm font-medium">Display name</label>
              <div className="mt-2 flex gap-2">
                <input id="pname" value={name} onChange={(e) => setNameInput(e.target.value)} maxLength={20} className={field} />
                <Button type="submit">Save</Button>
              </div>
            </form>

            {user && (
              <>
                <div>
                  <h2 className="text-sm font-medium">Avatar</h2>
                  <p className="mt-1 text-sm text-dim">Pick the identity other players see.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {AVATAR_IDS.map((id) => (
                      <button key={id} type="button" onClick={() => pickAvatar(id)} aria-label={`Use ${id} avatar`} aria-pressed={user.avatar === id}
                        className={`rounded-xl p-1 transition-all ${user.avatar === id ? 'ring-2 ring-violet' : 'opacity-70 hover:opacity-100'}`}>
                        <Avatar id={id} size={44} />
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={changePassword}>
                  <h2 className="text-sm font-medium">Change password</h2>
                  <div className="mt-2 space-y-2">
                    <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} placeholder="Current password" autoComplete="current-password" required className={field} aria-label="Current password" />
                    <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required className={field} aria-label="New password" />
                    <Button type="submit" variant="secondary" disabled={pwBusy}>{pwBusy ? 'Saving…' : 'Change password'}</Button>
                  </div>
                </form>

                <div>
                  <h2 className="text-sm font-medium">Account</h2>
                  <p className="mt-1 text-sm text-dim">Signed in as {user.email}{user.friendCode ? ` · friend code ${user.friendCode}` : ''}.</p>
                  <Button variant="secondary" className="mt-3" onClick={logout}><LogOut size={15} /> Sign out</Button>
                </div>
              </>
            )}

            <div>
              <h2 className="text-sm font-medium">Reset progress</h2>
              <p className="mt-1 text-sm text-dim">
                Deletes XP, coins, streak, history and achievements stored in this browser. Favorites are kept.
                {user && ' Your account keeps its synced progress and will restore it on the next load.'}
              </p>
              {!confirm ? <Button variant="secondary" className="mt-3" onClick={() => setConfirm(true)}><Trash2 size={15} /> Reset progress</Button> : (
                <div className="mt-3 flex gap-2"><Button className="bg-danger hover:bg-danger/80" onClick={() => { resetProgress(); setConfirm(false); setNameInput('Player'); toast('Progress reset', 'info') }}>Yes, delete everything</Button><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
