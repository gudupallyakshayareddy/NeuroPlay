import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Brain, Gauge, Gem, Orbit, ShieldCheck, Sparkles, Swords, Trophy, Users, Cpu,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import GameCard from '../components/game/GameCard.jsx'
import { LogoMark } from '../components/brand/Logo.jsx'
import { categories, games, gamesIn, getGame } from '../data/games'
import useFavorites from '../hooks/useFavorites.js'
import { useToast } from '../components/ui/Toast.jsx'

const featuredSlugs = ['escape-room', 'detective-mode', 'survival-simulator', 'story-quest', 'code-breaker', 'time-loop']

const floating = [
  { slug: 'escape-room', x: '6%', y: '10%', delay: 0 },
  { slug: 'detective-mode', x: '72%', y: '4%', delay: 0.6 },
  { slug: 'code-breaker', x: '80%', y: '62%', delay: 1.2 },
  { slug: 'survival-simulator', x: '2%', y: '66%', delay: 1.8 },
]

function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md" aria-hidden="true">
      <div className="absolute inset-[12%] rounded-full bg-violet/25 blur-3xl" />
      {[100, 76, 52].map((size, i) => (
        <motion.div
          key={size}
          className="absolute left-1/2 top-1/2 rounded-full border border-violet/30"
          style={{ width: `${size}%`, height: `${size}%`, x: '-50%', y: '-50%', borderStyle: i === 1 ? 'dashed' : 'solid' }}
          animate={{ rotate: i % 2 ? -360 : 360 }}
          transition={{ duration: 40 + i * 20, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 grid h-28 w-28 place-items-center rounded-full border border-cyan/40 bg-navy shadow-glow-cyan"
        style={{ x: '-50%', y: '-50%' }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet to-cyan opacity-80 blur-md" />
        <LogoMark size={56} />
      </motion.div>
      {floating.map(({ slug, x, y, delay }) => {
        const g = getGame(slug)
        const Icon = g.icon
        return (
          <motion.div
            key={slug}
            className="glass absolute flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow-glow"
            style={{ left: x, top: y }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon size={16} className="text-cyan" /> {g.title}
          </motion.div>
        )
      })}
    </div>
  )
}

const steps = [
  { icon: Cpu, title: 'AI creates the content', text: 'Stories, clues, suspects and puzzles are written fresh, so every run is different.' },
  { icon: ShieldCheck, title: 'The server keeps it fair', text: 'Answers, scores, timers and rewards are decided by game code, never by the AI.' },
  { icon: Gauge, title: 'The game adapts to you', text: 'Difficulty adjusts from how you actually play, not from guesses about who you are.' },
]

const features = [
  { icon: Brain, title: 'NOVA, your AI companion', text: 'Ask for hints without spoilers, rule explanations, and strategy tips.' },
  { icon: Sparkles, title: '30 playable games', text: 'Different mechanics, scoring and pacing. No reskins.' },
  { icon: Gem, title: 'XP, coins and rewards', text: 'Level up and unlock cosmetics as you play.' },
  { icon: Users, title: 'Private rooms', text: 'Join friends with a room code, invite link, or QR code.' },
  { icon: Trophy, title: 'Leaderboards', text: 'Global, weekly, friends, and per-game rankings.' },
  { icon: Swords, title: 'Daily challenges', text: 'A new challenge and missions every day.' },
]

const fadeUp = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5 } }

export default function Landing() {
  const { isFav, toggle } = useFavorites()
  const toast = useToast()
  const featured = featuredSlugs.map(getGame)
  const onFav = (slug) => {
    const was = isFav(slug)
    toggle(slug)
    toast(was ? 'Removed from favorites' : 'Added to favorites')
  }

  return (
    <>
      {/* Hero */}
      <section className="section-pad grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-medium text-violet-soft">
            <Orbit size={14} /> AI-powered gaming universe
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] sm:text-7xl">
            Neuro<span className="text-gradient">Play</span>
          </h1>
          <p className="mt-4 font-display text-xl text-ink sm:text-2xl">Think. Play. Adapt. Survive.</p>
          <p className="mt-4 max-w-lg text-dim">
            Thirty playable games of mystery, survival, logic and creativity, built around an AI that writes every scenario fresh and a server that keeps every score honest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/games" size="lg">Explore Games <ArrowRight size={18} /></Button>
            <Button to="/dashboard" variant="secondary" size="lg">My Dashboard</Button>
          </div>
          <p className="mt-6 text-xs text-dim">{games.length} games · {categories.length} categories · 30 playable · accounts live</p>
        </motion.div>
        <HeroVisual />
      </section>

      {/* Featured */}
      <section className="section-pad py-12" aria-labelledby="featured">
        <motion.div {...fadeUp} className="flex items-end justify-between gap-4">
          <div>
            <h2 id="featured" className="text-3xl font-bold">Featured games</h2>
            <p className="mt-2 text-dim">A taste of what is inside.</p>
          </div>
          <Link to="/games" className="hidden items-center gap-1 text-sm text-violet-soft hover:text-ink sm:flex">
            View all <ArrowRight size={15} />
          </Link>
        </motion.div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((g, i) => (
            <GameCard key={g.slug} game={g} index={i} isFav={isFav(g.slug)} onToggleFav={onFav} />
          ))}
        </div>
      </section>

      {/* AI explanation */}
      <section className="section-pad py-16" aria-labelledby="ai">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 id="ai" className="text-3xl font-bold">AI that creates. Code that judges.</h2>
          <p className="mt-3 text-dim">The AI imagines the game. The rules and the rewards belong to the server, so nothing is rigged.</p>
        </motion.div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass relative rounded-2xl p-6">
              <span className="absolute right-5 top-4 font-mono text-4xl font-bold text-white/5">0{i + 1}</span>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet/15 text-violet-soft"><s.icon size={22} /></div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-dim">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="section-pad py-12" aria-labelledby="cats">
        <motion.h2 {...fadeUp} id="cats" className="text-3xl font-bold">Pick your world</motion.h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <motion.div key={c.id} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
              <Link to={`/games?category=${c.id}`} className="glass glass-hover flex items-center gap-4 rounded-2xl p-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border" style={{ borderColor: `${c.color}55`, background: `${c.color}1f`, color: c.color }}>
                  <c.icon size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-dim">{c.blurb} · {gamesIn(c.id).length} games</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section-pad scroll-mt-24 py-16" aria-labelledby="feat">
        <motion.div {...fadeUp} className="max-w-2xl">
          <h2 id="feat" className="text-3xl font-bold">Built like a platform</h2>
          <p className="mt-3 text-dim">What NeuroPlay is growing into. Features arrive phase by phase.</p>
        </motion.div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }} className="glass rounded-2xl p-5">
              <f.icon size={22} className="text-cyan" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-dim">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad py-12">
        <motion.div {...fadeUp} className="glass relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet/20 via-transparent to-cyan/10" />
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to enter?</h2>
          <p className="mx-auto mt-3 max-w-md text-dim">Pick a game and start earning XP. Sign in to sync progress, climb leaderboards and play online with friends.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button to="/games" size="lg">Explore Games <ArrowRight size={18} /></Button>
            <Button to="/dashboard" variant="secondary" size="lg">My Dashboard</Button>
          </div>
        </motion.div>
      </section>
    </>
  )
}
