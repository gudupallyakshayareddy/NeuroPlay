import { Link } from 'react-router-dom'
import Logo from '../brand/Logo.jsx'
import { categories } from '../../data/games'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-navy/60">
      <div className="section-pad grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-dim">Think. Play. Adapt. Survive.</p>
          <p className="mt-4 max-w-xs text-xs text-dim/80">
            Student project. Playable games, XP, NOVA, accounts and online rooms are live.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Explore</h4>
          <ul className="space-y-2 text-sm text-dim">
            <li><Link className="hover:text-ink" to="/games">All games</Link></li>
            <li><Link className="hover:text-ink" to="/#features">Features</Link></li>
            <li><Link className="hover:text-ink" to="/dashboard">Dashboard</Link></li>
            <li><Link className="hover:text-ink" to="/profile">Profile</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Categories</h4>
          <ul className="space-y-2 text-sm text-dim">
            {categories.map((c) => (
              <li key={c.id}>
                <Link className="hover:text-ink" to={`/games?category=${c.id}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-dim/70">
        © {new Date().getFullYear()} NeuroPlay. A student project.
      </div>
    </footer>
  )
}
