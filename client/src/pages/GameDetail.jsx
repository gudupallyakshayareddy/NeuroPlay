import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Gauge, Heart, Hammer, Play, Users, SearchX } from 'lucide-react'
import GameArt from '../components/game/GameArt.jsx'
import GameCard from '../components/game/GameCard.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import useFavorites from '../hooks/useFavorites.js'
import { getCategory, getGame, gamesIn } from '../data/games'
import { cn } from '../utils/cn'
import { isPlayable } from '../games/registry'
import { useProgress } from '../engine/progress'

export default function GameDetail() {
  const { slug } = useParams()
  const game = getGame(slug)
  const { isFav, toggle } = useFavorites()
  const toast = useToast()
  const progress = useProgress()

  if (!game) {
    return (
      <div className="section-pad py-24">
        <EmptyState
          icon={SearchX}
          title="Game not found"
          text="We could not find that game."
          action={<Button to="/games">Back to library</Button>}
        />
      </div>
    )
  }

  const cat = getCategory(game.category)
  const Icon = game.icon
  const fav = isFav(game.slug)
  const related = gamesIn(game.category).filter((g) => g.slug !== game.slug).slice(0, 3)

  const onFav = () => {
    toggle(game.slug)
    toast(fav ? 'Removed from favorites' : 'Added to favorites')
  }

  return (
    <div className="section-pad py-8 sm:py-12">
      <Link to="/games" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink">
        <ArrowLeft size={16} /> All games
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="glass overflow-hidden rounded-3xl" style={{ boxShadow: `0 0 60px -20px ${cat.color}88` }}>
          <GameArt game={game} color={cat.color} className="aspect-[5/3] w-full" />
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: cat.color }}>
            <Icon size={16} /> {cat.name}
          </div>
          <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{game.title}</h1>
          <p className="mt-4 text-dim">{game.description}</p>

          <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="glass rounded-xl p-3">
              <dt className="flex items-center gap-1.5 text-xs text-dim"><Gauge size={13} /> Difficulty</dt>
              <dd className="mt-1 font-medium">{game.difficulty}</dd>
            </div>
            <div className="glass rounded-xl p-3">
              <dt className="flex items-center gap-1.5 text-xs text-dim"><Clock size={13} /> Time</dt>
              <dd className="mt-1 font-medium">~{game.minutes} min</dd>
            </div>
            <div className="glass rounded-xl p-3">
              <dt className="flex items-center gap-1.5 text-xs text-dim"><Users size={13} /> Mode</dt>
              <dd className="mt-1 font-medium">{game.modes.join(' · ')}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {isPlayable(game.slug) ? (
              <Button to={`/play/${game.slug}`} size="lg"><Play size={18} /> Play now</Button>
            ) : (
              <Button disabled aria-disabled="true"><Hammer size={16} /> Coming soon</Button>
            )}
            {game.modes.some((m) => m === 'Multiplayer') && (
              <Button to="/online" size="lg" variant="secondary"><Users size={17} /> Play online</Button>
            )}
            <Button variant="secondary" onClick={onFav} aria-pressed={fav}>
              <Heart size={16} className={cn(fav && 'fill-danger text-danger')} />
              {fav ? 'Favorited' : 'Add to favorites'}
            </Button>
          </div>
          {isPlayable(game.slug) ? (
            progress.best[game.slug] && <p className="mt-3 text-sm text-dim">Your best: <b className="text-ink">{progress.best[game.slug].score}</b> · played {progress.plays[game.slug]}x</p>
          ) : (
            <p className="mt-3 text-xs text-dim">This game is on the roadmap and not playable yet.</p>
          )}
        </div>
      </div>

      <section className="mt-12 max-w-2xl" aria-labelledby="how-to">
        <h2 id="how-to" className="text-xl font-semibold">How to play</h2>
        <ol className="mt-4 space-y-3">
          {game.howTo.map((step, i) => (
            <li key={step} className="glass flex items-start gap-3 rounded-xl p-4 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet/20 font-mono text-xs text-violet-soft">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="more">
          <h2 id="more" className="text-xl font-semibold">More in {cat.short}</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((g, i) => (
              <GameCard key={g.slug} game={g} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
