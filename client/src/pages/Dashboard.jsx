import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Award, CalendarCheck, Clock, Coins, Flame, Gamepad2, Sparkles } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import GameCard from '../components/game/GameCard.jsx'
import LevelRing from '../components/ui/LevelRing.jsx'
import useFavorites from '../hooks/useFavorites.js'
import { achievements } from '../engine/achievements'
import { getDailySlug } from '../engine/daily'
import { recommend } from '../engine/recommend'
import { currentStreak, dayKey, levelInfo, useProgress } from '../engine/progress'
import { getGame } from '../data/games'

export const timeAgo = (t) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-dim"><Icon size={15} className={tone} /> {label}</div>
      <div className="mt-1 font-display text-3xl font-bold">{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const p = useProgress()
  const { isFav, toggle } = useFavorites()
  const info = levelInfo(p.xp)
  const dailySlug = getDailySlug()
  const daily = getGame(dailySlug)
  const dailyDone = !!p.dailyDone[dayKey()]
  const recs = useMemo(() => recommend(p, 3), [p.history.length]) // eslint-disable-line
  const unlockedCount = Object.keys(p.achievements).length
  const streak = currentStreak(p)
  const todayPlayed = p.lastPlayDate === dayKey()

  return (
    <div className="section-pad py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Welcome back, <span className="text-gradient">{p.name}</span></h1>
          <p className="mt-1 text-dim">{p.history.length === 0 ? 'Play your first game to start earning XP.' : todayPlayed ? 'Your streak is safe for today. Keep going!' : streak > 0 ? `Play today to keep your ${streak}-day streak alive.` : 'Play today to start a streak.'}</p>
        </div>
        <div className="flex gap-2">
          <Button to="/leaderboard" variant="secondary" size="sm">Leaderboard</Button>
          <Button to="/online" variant="secondary" size="sm">Play online</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="glass flex items-center gap-5 rounded-2xl p-5">
          <LevelRing level={info.level} pct={info.pct} />
          <div className="min-w-[10rem]">
            <div className="text-sm font-medium">{p.xp} XP total</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${info.pct * 100}%` }} /></div>
            <div className="mt-1 text-xs text-dim">{info.span - info.into} XP to level {info.level + 1}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Coins} label="Coins" value={p.coins} tone="text-warn" />
          <StatCard icon={Flame} label="Streak (days)" value={streak} tone="text-orange-300" />
          <StatCard icon={Gamepad2} label="Games played" value={p.history.length} tone="text-cyan" />
          <StatCard icon={Award} label="Achievements" value={`${unlockedCount}/${achievements.length}`} tone="text-violet-soft" />
        </div>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-labelledby="daily">
        <div className="glass rounded-2xl p-5" style={{ boxShadow: '0 0 40px -20px rgb(124 92 255 / 0.7)' }}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-soft"><CalendarCheck size={15} /> Daily challenge</div>
          <h2 id="daily" className="mt-2 text-2xl font-bold">{daily.title}</h2>
          <p className="mt-1 text-sm text-dim">{dailyDone ? 'Completed today. Come back tomorrow for a new one.' : 'Finish this game today for a 2x XP bonus. Same game for every player.'}</p>
          <Button to={`/play/${dailySlug}`} className="mt-4" variant={dailyDone ? 'secondary' : 'primary'}>{dailyDone ? 'Play again' : 'Take the challenge'}</Button>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan"><Clock size={15} /> Recent games</div>
          {p.history.length === 0 ? (
            <p className="mt-3 text-sm text-dim">Nothing yet. Your last games will show up here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {p.history.slice(0, 4).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link to={`/games/${h.slug}`} className="font-medium hover:text-violet-soft">{getGame(h.slug)?.title ?? h.slug}</Link>
                  <span className="text-dim">{h.score} pts · +{h.xp} XP · {timeAgo(h.at)}</span>
                </li>
              ))}
            </ul>
          )}
          {p.history.length > 0 && <Link to="/profile#history" className="mt-3 inline-block text-xs text-violet-soft hover:text-ink">Full history →</Link>}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="rec">
        <h2 id="rec" className="flex items-center gap-2 text-xl font-semibold"><Sparkles size={18} className="text-violet-soft" /> Recommended for you</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recs.map((r, i) => (
            <div key={r.game.slug}>
              <GameCard game={r.game} index={i} isFav={isFav(r.game.slug)} onToggleFav={toggle} />
              <p className="mt-2 px-1 text-xs text-dim">{r.why}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
