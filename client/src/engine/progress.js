// Player progress: XP, level, coins, streak, history, achievements.
// Stored in this browser (localStorage) behind one small API, so it can later
// be swapped for the backend/MongoDB without touching any game code.
import { useSyncExternalStore } from 'react'
import { getGame } from '../data/games'
import { getDailySlug } from './daily'
import { evaluateAchievements } from './achievements'

const KEY = 'neuroplay:progress:v1'
const DIFF_MULT = { Easy: 1, Medium: 1.25, Hard: 1.5 }

const emptyState = () => ({
  name: 'Player', xp: 0, coins: 0, streak: 0, bestStreak: 0, lastPlayDate: null, lastLoginReward: null,
  history: [], best: {}, plays: {}, achievements: {}, dailyDone: {}, createdAt: Date.now(),
})

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return emptyState()
    const merged = { ...emptyState(), ...raw }
    // Corrupted or hand-edited storage must never crash the app.
    if (!Array.isArray(merged.history)) merged.history = []
    for (const k of ['best', 'plays', 'achievements', 'dailyDone']) if (!merged[k] || typeof merged[k] !== 'object' || Array.isArray(merged[k])) merged[k] = {}
    for (const k of ['xp', 'coins', 'streak', 'bestStreak']) if (!Number.isFinite(merged[k])) merged[k] = 0
    return merged
  } catch {
    return emptyState()
  }
}

let state = load()
const listeners = new Set()
function commit(next) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage blocked: still works this session */ }
  listeners.forEach((l) => l())
}

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d) }

/** The streak to DISPLAY: a streak not played yesterday or today is already broken. */
export function currentStreak(s = state) {
  return s.lastPlayDate === dayKey() || s.lastPlayDate === yesterdayKey() ? s.streak : 0
}

// ---- levels: level L needs 50*L*(L-1) total XP (L2=100, L3=300, L4=600 ...)
export const xpForLevel = (L) => 50 * L * (L - 1)
export function levelInfo(xp) {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, base, next, into: xp - base, span: next - base, pct: Math.min(1, (xp - base) / (next - base)) }
}

/** Called by the game shell when a game ends. Returns the reward summary shown on the results screen. */
export function recordResult(slug, result) {
  const game = getGame(slug)
  const s = state
  const today = dayKey()
  const rating = Math.max(0, Math.min(1, result.rating ?? 0))
  const mult = DIFF_MULT[game?.difficulty] ?? 1

  const baseXp = Math.round((15 + 55 * rating + (result.won ? 20 : 0)) * mult)
  const firstToday = s.lastPlayDate !== today
  let streak = currentStreak(s) // a lapsed streak restarts at 1
  if (firstToday) streak += 1
  const streakBonus = firstToday ? Math.min(streak, 10) * 2 : 0
  const isDaily = getDailySlug() === slug && !s.dailyDone[today]
  const dailyBonus = isDaily ? baseXp : 0
  const xp = baseXp + streakBonus + dailyBonus
  const coins = Math.round(xp / 5)

  const before = levelInfo(s.xp)
  const newXp = s.xp + xp
  const after = levelInfo(newXp)

  const prevBest = s.best[slug]?.score ?? -1
  const isBest = result.score > 0 && result.score > prevBest
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    slug, at: Date.now(), score: result.score, rating, won: !!result.won, xp, coins, daily: isDaily,
    summary: result.summary || '',
  }
  const next = {
    ...s,
    xp: newXp, coins: s.coins + coins, streak, bestStreak: Math.max(s.bestStreak, streak),
    lastPlayDate: today,
    history: [entry, ...s.history].slice(0, 200),
    plays: { ...s.plays, [slug]: (s.plays[slug] || 0) + 1 },
    best: isBest ? { ...s.best, [slug]: { score: result.score, at: Date.now() } } : s.best,
    dailyDone: isDaily ? { ...s.dailyDone, [today]: slug } : s.dailyDone,
  }
  const unlocked = evaluateAchievements(next, entry)
  next.achievements = { ...next.achievements, ...Object.fromEntries(unlocked.map((a) => [a.id, Date.now()])) }
  const achievementCoins = unlocked.reduce((n, a) => n + a.coins, 0)
  next.coins += achievementCoins
  commit(next)

  return {
    xp, baseXp, streakBonus, dailyBonus, coins: coins + achievementCoins, isBest,
    levelBefore: before.level, levelAfter: after.level, leveledUp: after.level > before.level,
    streak, unlocked,
  }
}

export function setName(name) { commit({ ...state, name: name.trim().slice(0, 20) || 'Player' }) }
export function resetProgress() { commit(emptyState()) }

/** Replace local progress with a server snapshot (account is the source of truth when signed in). */
export function replaceProgress(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  const merged = { ...emptyState(), ...state, ...snapshot }
  if (!Array.isArray(merged.history)) merged.history = []
  for (const k of ['best', 'plays', 'achievements', 'dailyDone']) if (!merged[k] || typeof merged[k] !== 'object' || Array.isArray(merged[k])) merged[k] = {}
  for (const k of ['xp', 'coins', 'streak', 'bestStreak']) if (!Number.isFinite(merged[k])) merged[k] = 0
  commit(merged)
}

/** The subset of local progress the server accepts for a one-time guest import. */
export function exportProgress() {
  const { xp, coins, streak, bestStreak, lastPlayDate, history, best, plays, achievements, dailyDone } = state
  return { xp, coins, streak, bestStreak, lastPlayDate, history, best, plays, achievements, dailyDone }
}

/** Guest daily login reward (signed-in players claim on the server instead). */
export function claimDailyLogin() {
  const today = dayKey()
  if (state.lastLoginReward === today) return null
  const bonus = 20 + Math.min(currentStreak(state), 10) * 2
  commit({ ...state, coins: state.coins + bonus, lastLoginReward: today })
  return bonus
}

/** Adaptive difficulty: 0 (easier), 1 (normal), 2 (harder) from the last 3 real results of this game. */
export function adaptiveLevel(slug, s = state) {
  const last = s.history.filter((h) => h.slug === slug).slice(0, 3)
  if (last.length < 2) return 1
  const avg = last.reduce((n, h) => n + h.rating, 0) / last.length
  if (avg >= 0.75) return 2
  if (avg <= 0.3) return 0
  return 1
}

export function useProgress() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)
}
