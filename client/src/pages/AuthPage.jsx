import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import Logo from '../components/brand/Logo.jsx'
import { useAuth } from '../engine/auth.jsx'

export default function AuthPage() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { login, signup } = useAuth()
  const nav = useNavigate()
  const next = params.get('next') || '/dashboard'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (mode === 'signup' && name.trim().length < 2) return setError('Pick a player name (2+ characters).')
    if (password.length < 8 && mode === 'signup') return setError('Password needs at least 8 characters.')
    setBusy(true)
    try {
      if (mode === 'signup') await signup(name.trim(), email.trim(), password)
      else await login(email.trim(), password)
      nav(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-xl border border-white/10 bg-navy/70 px-4 py-3 text-sm text-ink placeholder:text-dim/60 focus:border-violet/60 focus:outline-none'

  return (
    <div className="section-pad flex min-h-[70vh] items-center justify-center py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass w-full max-w-md rounded-3xl p-6 sm:p-8">
        <div className="flex justify-center"><Logo /></div>
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1" role="tablist">
          {['login', 'signup'].map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError('') }}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-violet text-white' : 'text-dim hover:text-ink'}`}>
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>
        <h1 className="mt-6 text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Join NeuroPlay'}</h1>
        <p className="mt-1 text-sm text-dim">
          {mode === 'login' ? 'Your progress, friends and leaderboard rank live on your account.' : 'Free account. Your guest progress is imported on first sign-in.'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <label className="block text-sm">
              <span className="mb-1.5 block text-dim">Player name</span>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="NeonFox" autoComplete="nickname" required />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1.5 block text-dim">Email</span>
            <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-dim">Password</span>
            <div className="relative">
              <input className={field} type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? '8+ characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
              <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? <><LogIn size={18} /> Sign in</> : <><UserPlus size={18} /> Create account</>}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-dim">
          Passwords are hashed server-side. No email service is configured, so password reset is not available — pick a password you remember.
        </p>
        <p className="mt-3 text-center text-sm text-dim">
          Just browsing? <Link to="/games" className="text-violet-soft hover:underline">Play as a guest</Link> — progress stays in this browser.
        </p>
      </motion.div>
    </div>
  )
}