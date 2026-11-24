import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, LogIn, Trash2, UserPlus, Users } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuth } from '../engine/auth.jsx'
import { api } from '../api'

export default function FriendsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      setData(await api('/friends'))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  if (!user) {
    return (
      <div className="section-pad py-20">
        <EmptyState
          icon={Users}
          title="Friends live on your account"
          text="Sign in to add friends by their friend code, compare progress and appear on leaderboards. Guest play stays local to this browser."
          action={<Button to="/auth?next=/friends"><LogIn size={16} /> Sign in</Button>}
        />
      </div>
    )
  }

  const add = async (e) => {
    e.preventDefault()
    if (code.trim().length !== 6) return
    setBusy(true)
    try {
      await api('/friends', { code: code.trim().toUpperCase() })
      setCode('')
      toast('Friend added')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (friendCode) => {
    try {
      await api(`/friends/${friendCode}`, undefined, { method: 'DELETE' })
      toast('Friend removed')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const copyMine = async () => {
    if (!data?.myCode) return
    try { await navigator.clipboard.writeText(data.myCode); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard blocked */ }
  }

  return (
    <div className="section-pad py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Your <span className="text-gradient">friends</span></h1>
          <p className="mt-2 text-dim">Swap friend codes, then challenge each other on the leaderboard.</p>
        </div>
        <Button to="/leaderboard" variant="secondary">View leaderboard</Button>
      </div>

      {data?.myCode && (
        <div className="glass mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
          <div>
            <div className="text-xs text-dim">Your friend code</div>
            <div className="mt-1 font-mono text-2xl tracking-[0.25em] text-violet-soft">{data.myCode}</div>
          </div>
          <Button variant="secondary" onClick={copyMine}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy code'}</Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form onSubmit={add} className="glass h-fit rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-semibold"><UserPlus size={17} className="text-cyan" /> Add a friend</h2>
          <p className="mt-1 text-sm text-dim">Ask for their 6-character friend code.</p>
          <div className="mt-3 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} placeholder="ABC123"
              aria-label="Friend code" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-navy/70 px-3 py-2.5 font-mono tracking-widest placeholder:text-dim/50 focus:border-violet/60 focus:outline-none" />
            <Button type="submit" disabled={busy || code.trim().length !== 6}>{busy ? 'Adding…' : 'Add'}</Button>
          </div>
        </form>

        <section aria-labelledby="friend-list">
          <h2 id="friend-list" className="flex items-center gap-2 font-semibold"><Users size={17} className="text-violet-soft" /> {data?.friends?.length ?? 0} friend{data?.friends?.length === 1 ? '' : 's'}</h2>
          {loading ? (
            <p className="mt-3 text-sm text-dim">Loading friends…</p>
          ) : error ? (
            <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error} <button className="underline" onClick={load}>Retry</button></p>
          ) : (data?.friends?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-dim">No friends yet. Add someone with their code to get started.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.friends.map((f) => (
                <li key={f.friendCode} className="glass flex items-center gap-3 rounded-xl p-3 text-sm">
                  <Avatar id={f.avatar} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{f.name}</div>
                    <div className="text-xs text-dim">Level {f.level} · {f.xp} XP</div>
                  </div>
                  <button onClick={() => remove(f.friendCode)} aria-label={`Remove ${f.name}`} className="rounded-lg p-2 text-dim hover:bg-danger/10 hover:text-danger"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
