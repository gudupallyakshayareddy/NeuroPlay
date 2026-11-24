import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Heart, Play, Users } from 'lucide-react'
import GameArt from './GameArt.jsx'
import { getCategory } from '../../data/games'
import { isPlayable } from '../../games/registry'
import { cn } from '../../utils/cn'

const difficultyColor = { Easy: 'bg-success', Medium: 'bg-warn', Hard: 'bg-danger' }

export default function GameCard({ game, isFav, onToggleFav, index = 0 }) {
  const cat = getCategory(game.category)
  const Icon = game.icon

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.04 }}
      className="glass glass-hover group relative flex flex-col overflow-hidden rounded-2xl"
    >
      <Link to={`/games/${game.slug}`} className="relative block aspect-[5/3] overflow-hidden" tabIndex={-1} aria-hidden="true">
        <GameArt game={game} color={cat.color} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
        <div
          className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-xl border backdrop-blur-md"
          style={{ borderColor: `${cat.color}66`, background: 'rgb(5 6 15 / 0.6)', color: cat.color }}
        >
          <Icon size={20} />
        </div>
      </Link>

      {onToggleFav && (
        <button
          type="button"
          onClick={() => onToggleFav(game.slug)}
          aria-pressed={isFav}
          aria-label={isFav ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-void/60 backdrop-blur-md transition hover:scale-110 hover:border-white/30"
        >
          <Heart size={16} className={cn(isFav ? 'fill-danger text-danger' : 'text-ink')} />
        </button>
      )}

      <div className="flex flex-1 flex-col p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: cat.color }}>
          {cat.short}
        </span>
        <h3 className="mt-1 text-lg font-semibold leading-tight">{game.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-dim">{game.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-dim">
          <span className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', difficultyColor[game.difficulty])} />
            {game.difficulty}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} /> ~{game.minutes} min
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={13} /> {game.modes.join(' · ')}
          </span>
        </div>

        <Link
          to={`/games/${game.slug}`}
          className={cn(
            'mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium transition',
            isPlayable(game.slug)
              ? 'bg-violet/15 text-violet-soft hover:bg-violet hover:text-white hover:shadow-glow'
              : 'bg-white/5 text-dim hover:bg-white/10 hover:text-ink',
          )}
        >
          <Play size={15} /> {isPlayable(game.slug) ? 'Play' : 'Coming soon'}
        </Link>
      </div>
    </motion.article>
  )
}
