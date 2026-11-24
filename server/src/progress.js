// Server-validated progression: game sessions, rewards, leaderboards,
// daily login rewards, friends. Rewards are computed HERE, not trusted
// from the client, and each session can only be claimed once.
import crypto from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from './auth.js'
import {
  createSession, takeSession, getUserById, updateUser, topUsers, getUserByFriendCode,
} from './store.js'
import { gameMeta, DIFF_MULT, achievements, levelInfo } from './data/games.js'

export const progressRouter = Router()
const bad = (res, err) => res.status(400).json({ error: 'Invalid request', details: err.issues?.map((i) => `${i.path.join('.')}: ${i.message}`) })

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d) }
const currentStreak = (u) => (u.lastPlayDate === dayKey() || u.lastPlayDate === yesterdayKey() ? u.streak : 0)

// Daily challenge: same game for everyone, derived from the sorted slug list
// (identical algorithm on the client, see client/src/engine/daily.js).
function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h }
export function dailySlug(date = new Date()) {
  const list = Object.keys(gameMeta).sort()
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  return list[hash(key) % list.length]
}
progressRouter.get('/daily', (_req, res) => res.json({ slug: dailySlug() }))

// ---- validated game sessions ----
const StartReq = z.object({ slug: z.string().max(40) })
progressRouter.post('/sessions/start', requireAuth, async (req, res, next) => {
  try {
    const p = StartReq.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    if (!gameMeta[p.data.slug]) return res.status(404).json({ error: 'Unknown game' })
    const sessionId = crypto.randomBytes(16).toString('hex')
    await createSession(sessionId, { userId: req.user.id, slug: p.data.slug, startedAt: Date.now() })
    res.json({ sessionId })
  } catch (e) { next(e) }
})

const FinishReq = z.object({
  sessionId: z.string().max(64),
  score: z.number().int().min(0),
  rating: z.number().min(0).max(1),
  won: z.boolean(),
  summary: z.string().max(200).default(''),
})
progressRouter.post('/sessions/finish', requireAuth, async (req, res, next) => {
  try {
    const p = FinishReq.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const session = await takeSession(p.data.sessionId) // single-use: prevents duplicate claims
    if (!session || session.userId !== req.user.id) return res.status(404).json({ error: 'Session expired or already claimed. Play again.' })
    const meta = gameMeta[session.slug]
    if (Date.now() - session.startedAt < 3000) return res.status(400).json({ error: 'That run was too short to count.' })
    if (p.data.score > meta.maxScore) return res.status(400).json({ error: 'Score above the game maximum was rejected.' })

    const u = req.user
    const { score, rating, won, summary } = p.data
    const today = dayKey()
    const mult = DIFF_MULT[meta.difficulty] ?? 1
    const baseXp = Math.round((15 + 55 * rating + (won ? 20 : 0)) * mult)
    const firstToday = u.lastPlayDate !== today
    let streak = currentStreak(u)
    if (firstToday) streak += 1
    const streakBonus = firstToday ? Math.min(streak, 10) * 2 : 0
    const isDaily = dailySlug() === session.slug && !u.dailyDone[today]
    const dailyBonus = isDaily ? baseXp : 0
    const xp = baseXp + streakBonus + dailyBonus
    const coins = Math.round(xp / 5)

    const before = levelInfo(u.xp)
    const newXp = u.xp + xp
    const after = levelInfo(newXp)
    const prevBest = u.best[session.slug]?.score ?? -1
    const isBest = score > 0 && score > prevBest
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      slug: session.slug, at: Date.now(), score, rating, won, xp, coins, daily: isDaily, summary,
    }
    const nextU = {
      xp: newXp, coins: u.coins + coins, streak, bestStreak: Math.max(u.bestStreak, streak),
      lastPlayDate: today,
      history: [entry, ...u.history].slice(0, 200),
      plays: { ...u.plays, [session.slug]: (u.plays[session.slug] || 0) + 1 },
      best: isBest ? { ...u.best, [session.slug]: { score, at: Date.now() } } : u.best,
      dailyDone: isDaily ? { ...u.dailyDone, [today]: session.slug } : u.dailyDone,
    }
    const unlocked = achievements.filter((a) => !u.achievements[a.id] && a.check({ ...u, ...nextU }, entry))
    nextU.achievements = { ...u.achievements, ...Object.fromEntries(unlocked.map((a) => [a.id, Date.now()])) }
    nextU.coins += unlocked.reduce((n, a) => n + a.coins, 0)
    const user = await updateUser(u.id, nextU)

    res.json({
      reward: {
        xp, baseXp, streakBonus, dailyBonus, coins: coins + unlocked.reduce((n, a) => n + a.coins, 0), isBest,
        levelBefore: before.level, levelAfter: after.level, leveledUp: after.level > before.level,
        streak, unlocked: unlocked.map(({ id, title, text, coins: c }) => ({ id, title, text, coins: c })),
      },
      progress: progressOf(user),
    })
  } catch (e) { next(e) }
})

const progressOf = (u) => ({
  name: u.name, avatar: u.avatar, xp: u.xp, coins: u.coins, streak: u.streak, bestStreak: u.bestStreak,
  lastPlayDate: u.lastPlayDate, history: u.history, best: u.best, plays: u.plays,
  achievements: u.achievements, dailyDone: u.dailyDone, lastLoginReward: u.lastLoginReward,
})
progressRouter.get('/progress', requireAuth, (req, res) => res.json({ progress: progressOf(req.user) }))

// One-time import of guest progress when the account is still empty.
const ImportReq = z.object({
  xp: z.number().int().min(0).max(200000), coins: z.number().int().min(0).max(50000),
  streak: z.number().int().min(0).max(365), bestStreak: z.number().int().min(0).max(365),
  lastPlayDate: z.string().max(10).nullable().default(null),
  history: z.array(z.object({
    id: z.string().max(40), slug: z.string().max(40), at: z.number(), score: z.number().int().min(0).max(100000),
    rating: z.number().min(0).max(1), won: z.boolean(), xp: z.number().int().min(0).max(1000),
    coins: z.number().int().min(0).max(500), daily: z.boolean().default(false), summary: z.string().max(200).default(''),
  })).max(200).default([]),
  best: z.record(z.object({ score: z.number().int().min(0).max(100000), at: z.number() })).default({}),
  plays: z.record(z.number().int().min(0).max(100000)).default({}),
  achievements: z.record(z.number()).default({}),
  dailyDone: z.record(z.string().max(40)).default({}),
})
progressRouter.post('/progress/import', requireAuth, async (req, res, next) => {
  try {
    if (req.user.xp > 0 || req.user.history.length > 0) return res.status(409).json({ error: 'Account already has progress.' })
    const p = ImportReq.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const clean = { ...p.data }
    for (const slug of Object.keys(clean.best)) if (!gameMeta[slug]) delete clean.best[slug]
    clean.history = clean.history.filter((h) => gameMeta[h.slug])
    const user = await updateUser(req.user.id, clean)
    res.json({ progress: progressOf(user) })
  } catch (e) { next(e) }
})

// ---- daily login reward ----
progressRouter.post('/rewards/daily', requireAuth, async (req, res, next) => {
  try {
    const today = dayKey()
    if (req.user.lastLoginReward === today) return res.status(409).json({ error: 'Already claimed today.' })
    const bonus = 20 + Math.min(currentStreak(req.user), 10) * 2
    const user = await updateUser(req.user.id, { coins: req.user.coins + bonus, lastLoginReward: today })
    res.json({ coins: bonus, progress: progressOf(user) })
  } catch (e) { next(e) }
})

// ---- leaderboards ----
progressRouter.get('/leaderboard', async (req, res, next) => {
  try {
    const slug = typeof req.query.slug === 'string' ? req.query.slug : null
    const users = await topUsers(50)
    let rows
    if (slug && gameMeta[slug]) {
      rows = users.filter((u) => u.best?.[slug]).map((u) => ({ name: u.name, avatar: u.avatar, score: u.best[slug].score, level: levelInfo(u.xp).level }))
        .sort((a, b) => b.score - a.score).slice(0, 10)
    } else {
      rows = users.map((u) => ({ name: u.name, avatar: u.avatar, score: u.xp, level: levelInfo(u.xp).level })).slice(0, 10)
    }
    res.json({ rows, metric: slug ? 'score' : 'xp' })
  } catch (e) { next(e) }
})

// ---- friends ----
progressRouter.get('/friends', requireAuth, async (req, res, next) => {
  try {
    const friends = []
    for (const code of req.user.friends || []) {
      const f = await getUserByFriendCode(code)
      if (f) friends.push({ name: f.name, avatar: f.avatar, friendCode: f.friendCode, xp: f.xp, level: levelInfo(f.xp).level })
    }
    res.json({ friends, myCode: req.user.friendCode })
  } catch (e) { next(e) }
})
const AddFriend = z.object({ code: z.string().trim().toUpperCase().length(6) })
progressRouter.post('/friends', requireAuth, async (req, res, next) => {
  try {
    const p = AddFriend.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    if (p.data.code === req.user.friendCode) return res.status(400).json({ error: 'That is your own code.' })
    const f = await getUserByFriendCode(p.data.code)
    if (!f) return res.status(404).json({ error: 'No player with that code.' })
    if ((req.user.friends || []).includes(p.data.code)) return res.status(409).json({ error: 'Already friends.' })
    await updateUser(req.user.id, { friends: [...(req.user.friends || []), p.data.code] })
    if (!(f.friends || []).includes(req.user.friendCode)) await updateUser(f.id, { friends: [...(f.friends || []), req.user.friendCode] })
    res.json({ ok: true, friend: { name: f.name, avatar: f.avatar, friendCode: f.friendCode, xp: f.xp, level: levelInfo(f.xp).level } })
  } catch (e) { next(e) }
})
progressRouter.delete('/friends/:code', requireAuth, async (req, res, next) => {
  try {
    const code = String(req.params.code).toUpperCase()
    await updateUser(req.user.id, { friends: (req.user.friends || []).filter((c) => c !== code) })
    res.json({ ok: true })
  } catch (e) { next(e) }
})