import { games, getGame } from '../data/games'
import { isPlayable } from '../games/registry'

/**
 * Simple, explainable recommendations from real play history.
 * The reason text is always derived from the saved data:
 *  - "not tried yet" is only used when plays[slug] is really 0
 *  - the 2 most recently played games are left out while there are enough alternatives
 */
export function recommend(progress, count = 3) {
  const recent = [...new Set(progress.history.slice(0, 6).map((h) => h.slug))].slice(0, 2)
  const tally = {}
  progress.history.slice(0, 20).forEach((h) => { const c = getGame(h.slug)?.category; if (c) tally[c] = (tally[c] || 0) + h.rating })
  const bestCat = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]

  const all = games.filter((g) => isPlayable(g.slug)).map((g) => {
    const plays = progress.plays[g.slug] || 0
    const last = progress.history.find((h) => h.slug === g.slug)
    let score = 0, why
    if (plays === 0) {
      score += 3
      why = g.category === bestCat ? 'New for you, and it matches the games you do best at' : 'You have not tried this yet'
    } else if (last && last.rating < 0.5) {
      score += 2
      why = `Your last run scored ${Math.round(last.rating * 100)}%. Worth another shot`
    } else {
      score += 1
      why = 'Time for a rematch. Beat your personal best'
    }
    if (g.category === bestCat) score += 1
    const wasRecent = recent.includes(g.slug)
    return { game: g, score: score + Math.random() * 0.01, why, wasRecent }
  })
  const fresh = all.filter((r) => !r.wasRecent)
  const pool = fresh.length >= count ? fresh : all.map((r) => (r.wasRecent ? { ...r, score: r.score - 2, why: 'You played this recently' } : r))
  return pool.sort((a, b) => b.score - a.score).slice(0, count)
}
