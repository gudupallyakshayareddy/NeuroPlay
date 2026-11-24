import { games } from '../data/games'

// The daily challenge is the same game for everyone on a given date.
// Uses the sorted full catalogue so the server computes the identical slug
// (see server/src/progress.js dailySlug).
function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h }
export function getDailySlug(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  const list = games.map((g) => g.slug).sort()
  return list[hash(key) % list.length]
}