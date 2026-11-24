import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Heart, Info, SearchX, Search as SearchIcon, X } from 'lucide-react'
import GameCard from '../components/game/GameCard.jsx'
import Chip from '../components/ui/Chip.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import useFavorites from '../hooks/useFavorites.js'
import { categories, difficulties, durations, games } from '../data/games'

export default function GameLibrary() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState(null)
  const [duration, setDuration] = useState(null)
  const [onlyFavs, setOnlyFavs] = useState(false)
  const { favs, isFav, toggle } = useFavorites()
  const toast = useToast()

  // The selected category lives in the URL (?category=logic) so links can point to it.
  const urlCategory = params.get('category')
  const category = categories.some((c) => c.id === urlCategory) ? urlCategory : null
  const setCategory = (id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('category', id)
    else next.delete('category')
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const bucket = durations.find((d) => d.id === duration)
    return games.filter(
      (g) =>
        (!category || g.category === category) &&
        (!difficulty || g.difficulty === difficulty) &&
        (!bucket || bucket.test(g.minutes)) &&
        (!onlyFavs || favs.includes(g.slug)) &&
        (!q || `${g.title} ${g.description}`.toLowerCase().includes(q)),
    )
  }, [query, category, difficulty, duration, onlyFavs, favs])

  const hasFilters = query || category || difficulty || duration || onlyFavs
  const clearAll = () => {
    setQuery('')
    setDifficulty(null)
    setDuration(null)
    setOnlyFavs(false)
    setCategory(null)
  }

  const handleToggle = (slug) => {
    const was = isFav(slug)
    toggle(slug)
    toast(was ? 'Removed from favorites' : 'Added to favorites')
  }

  return (
    <div className="section-pad py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold sm:text-5xl">Game Library</h1>
        <p className="mt-3 text-dim">Thirty-two games, seven categories. Filter by mood, difficulty, or how much time you have.</p>
      </header>

      <div className="glass mt-6 flex items-start gap-3 rounded-xl p-3.5 text-sm text-dim">
        <Info size={18} className="mt-0.5 shrink-0 text-cyan" />
        <p>
          <strong className="font-medium text-ink">30 games are playable now.</strong> City Architect and Bounce Lab are still in the workshop. Sign in to sync progress, earn leaderboard ranks and play online with friends; guest play stays in this browser.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <div className="relative">
          <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games…"
            aria-label="Search games"
            className="glass h-12 w-full rounded-xl pl-11 pr-4 text-sm text-ink placeholder:text-dim focus:border-violet/70 focus:outline-none focus:ring-2 focus:ring-violet/30"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Category filter">
          <Chip active={!category} onClick={() => setCategory(null)}>All</Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={category === c.id} color={c.color} onClick={() => setCategory(category === c.id ? null : c.id)}>
              {c.short}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Difficulty filter">
            <span className="text-xs uppercase tracking-wider text-dim">Difficulty</span>
            {difficulties.map((d) => (
              <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>{d}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Duration filter">
            <span className="text-xs uppercase tracking-wider text-dim">Time</span>
            {durations.map((d) => (
              <Chip key={d.id} active={duration === d.id} onClick={() => setDuration(duration === d.id ? null : d.id)}>{d.label}</Chip>
            ))}
          </div>
          <Chip active={onlyFavs} onClick={() => setOnlyFavs((v) => !v)}>
            <Heart size={12} className={onlyFavs ? 'fill-current' : ''} /> Favorites ({favs.length})
          </Chip>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between text-sm text-dim" aria-live="polite">
        <span>{filtered.length} of {games.length} games</span>
        {hasFilters && (
          <button type="button" onClick={clearAll} className="flex items-center gap-1 hover:text-ink">
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={onlyFavs && favs.length === 0 ? Heart : SearchX}
            title={onlyFavs && favs.length === 0 ? 'No favorites yet' : 'No games match'}
            text={onlyFavs && favs.length === 0 ? 'Tap the heart on any game to save it here.' : 'Try a different search or remove a filter.'}
            action={<Button variant="secondary" onClick={clearAll}>Reset filters</Button>}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((g, i) => (
              <GameCard key={g.slug} game={g} index={i} isFav={isFav(g.slug)} onToggleFav={handleToggle} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
