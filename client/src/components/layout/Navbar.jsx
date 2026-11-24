import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Logo from '../brand/Logo.jsx'
import Avatar from '../ui/Avatar.jsx'
import { Coins, Flame, LogIn, LogOut } from 'lucide-react'
import { currentStreak, levelInfo, useProgress } from '../../engine/progress'
import { useAuth } from '../../engine/auth.jsx'
import { cn } from '../../utils/cn'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/games', label: 'Games' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/online', label: 'Play Online' },
  { to: '/friends', label: 'Friends' },
  { to: '/profile', label: 'Profile' },
]

const linkClass = ({ isActive }) =>
  cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-ink' : 'text-dim hover:text-ink')

function PlayerChip({ className = '' }) {
  const p = useProgress()
  const { user, logout } = useAuth()
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Link to="/profile" className="glass flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm" aria-label={`${p.name}: level ${levelInfo(p.xp).level}`}>
        {user && <Avatar id={user.avatar} size={24} />}
        <span className="font-semibold">Lv {levelInfo(p.xp).level}</span>
        <span className="flex items-center gap-1 text-warn"><Coins size={14} />{p.coins}</span>
        <span className="flex items-center gap-1 text-orange-300"><Flame size={14} />{currentStreak(p)}</span>
      </Link>
      {user ? (
        <button onClick={logout} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 place-items-center rounded-lg text-dim hover:bg-white/5 hover:text-ink">
          <LogOut size={16} />
        </button>
      ) : (
        <Link to="/auth" className="glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-violet-soft hover:border-violet/60">
          <LogIn size={15} /> Sign in
        </Link>
      )}
    </div>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile menu when the page changes.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn('sticky top-0 z-50 transition-all', scrolled ? 'glass border-x-0 border-t-0' : 'border-b border-transparent')}>
      <nav className="section-pad flex h-16 items-center justify-between" aria-label="Main">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          <Link to="/#features" className="rounded-lg px-3 py-2 text-sm font-medium text-dim transition-colors hover:text-ink">
            Features
          </Link>
        </div>

        <PlayerChip className="hidden md:flex" />

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-white/5 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass overflow-hidden border-x-0 md:hidden"
          >
            <div className="section-pad flex flex-col gap-1 py-4">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
              <Link to="/#features" className="rounded-lg px-3 py-2 text-sm font-medium text-dim hover:text-ink">Features</Link>
              <PlayerChip className="mt-3 w-fit" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
