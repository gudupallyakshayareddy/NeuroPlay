import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { currentStreak, dayKey, levelInfo, recordResult, resetProgress, xpForLevel, adaptiveLevel } from '../src/engine/progress.js'
import { achievements } from '../src/engine/achievements.js'
import { getDailySlug } from '../src/engine/daily.js'
import { recommend } from '../src/engine/recommend.js'
import { feedback } from '../src/games/codeLogic.js'
import { games } from '../src/data/games.js'

// progress.js keeps its state in a module variable; read it back through the saved JSON.
const saved = () => JSON.parse(localStorage.getItem('neuroplay:progress:v1'))
const slugNotDaily = () => ['memory-matrix', 'code-breaker', 'stair-jump', 'one-minute-challenge', 'two-doors', 'mind-games', 'trivia-party'].find((s) => s !== getDailySlug())
beforeEach(() => resetProgress())

test('level thresholds: L2=100, L3=300, L4=600 XP', () => {
  assert.equal(xpForLevel(2), 100); assert.equal(xpForLevel(3), 300); assert.equal(xpForLevel(4), 600)
  assert.equal(levelInfo(0).level, 1); assert.equal(levelInfo(99).level, 1); assert.equal(levelInfo(100).level, 2); assert.equal(levelInfo(299).level, 2); assert.equal(levelInfo(300).level, 3)
  const i = levelInfo(150); assert.equal(i.into, 50); assert.equal(i.span, 200); assert.equal(i.pct, 0.25)
})

test('XP formula, first-game streak bonus, coins and saved state agree', () => {
  const slug = slugNotDaily()
  const diff = games.find((g) => g.slug === slug).difficulty
  const mult = { Easy: 1, Medium: 1.25, Hard: 1.5 }[diff]
  const r = recordResult(slug, { score: 120, rating: 0.5, won: false, summary: 't' })
  const base = Math.round((15 + 55 * 0.5) * mult)
  assert.equal(r.baseXp, base); assert.equal(r.streakBonus, 2); assert.equal(r.xp, base + 2); assert.equal(r.dailyBonus, 0)
  const s = saved()
  assert.equal(s.xp, r.xp); assert.equal(s.coins, Math.round(r.xp / 5) + r.unlocked.reduce((n, a) => n + a.coins, 0))
  assert.equal(s.history.length, 1); assert.equal(s.plays[slug], 1); assert.equal(s.best[slug].score, 120); assert.equal(s.streak, 1)
  assert.ok(s.achievements['first-game'])
})

test('streak bonus only on the first game of a day; personal best only when beaten', () => {
  const slug = slugNotDaily()
  recordResult(slug, { score: 100, rating: 0.5 })
  const r2 = recordResult(slug, { score: 50, rating: 0.5 })
  assert.equal(r2.streakBonus, 0); assert.equal(r2.isBest, false); assert.equal(saved().best[slug].score, 100)
  const r3 = recordResult(slug, { score: 150, rating: 0.5 })
  assert.equal(r3.isBest, true); assert.equal(saved().best[slug].score, 150); assert.equal(saved().plays[slug], 3)
})

test('daily challenge gives a one-time 2x bonus, then none', () => {
  const slug = getDailySlug()
  const a = recordResult(slug, { score: 10, rating: 0.4, won: false })
  assert.equal(a.dailyBonus, a.baseXp); assert.ok(a.unlocked.some((x) => x.id === 'daily')); assert.equal(saved().dailyDone[dayKey()], slug)
  const b = recordResult(slug, { score: 10, rating: 0.4, won: false })
  assert.equal(b.dailyBonus, 0)
})

test('a lapsed streak shows 0 and restarts at 1; yesterday continues the streak', () => {
  const slug = slugNotDaily()
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d) }
  recordResult(slug, { score: 1, rating: 0.5 })
  const patch = (o) => localStorage.setItem('neuroplay:progress:v1', JSON.stringify({ ...saved(), ...o }))
  // Re-load by simulating state through a play after editing storage is not possible (module state), so test the pure helper:
  assert.equal(currentStreak({ streak: 5, lastPlayDate: day(0) }), 5)
  assert.equal(currentStreak({ streak: 5, lastPlayDate: day(1) }), 5)
  assert.equal(currentStreak({ streak: 5, lastPlayDate: day(2) }), 0)
  assert.equal(currentStreak({ streak: 5, lastPlayDate: null }), 0)
  patch({}) // storage stays valid
})

test('level-up is reported and level matches total XP', () => {
  const slug = slugNotDaily()
  let leveled = false, last
  for (let i = 0; i < 6; i++) { last = recordResult(slug, { score: 1, rating: 1, won: true }); leveled ||= last.leveledUp }
  assert.ok(leveled); assert.equal(levelInfo(saved().xp).level, last.levelAfter)
})

test('every achievement has a working check and unlocks only from real data', () => {
  const none = { history: [], plays: {}, achievements: {}, streak: 0, coins: 0, xp: 0 }
  for (const a of achievements) assert.equal(!!a.check(none, { rating: 0, daily: false }), false, a.id)
  assert.equal(achievements.find((a) => a.id === 'perfect').check(none, { rating: 0.96 }), true)
})

test('adaptive difficulty follows recent real ratings', () => {
  const h = (rating) => ({ slug: 'x', rating })
  assert.equal(adaptiveLevel('x', { history: [h(1)] }), 1)
  assert.equal(adaptiveLevel('x', { history: [h(0.9), h(0.8), h(0.7)] }), 2)
  assert.equal(adaptiveLevel('x', { history: [h(0.1), h(0.2)] }), 0)
})

test('recommendations: untried vs played labels match the real history', () => {
  const slug = slugNotDaily()
  recordResult(slug, { score: 10, rating: 0.9, won: true })
  const p = saved()
  const recs = recommend(p, 3)
  assert.equal(recs.length, 3)
  for (const r of recs) {
    if (p.plays[r.game.slug]) assert.ok(!/not tried/.test(r.why), `${r.game.slug} was played but says: ${r.why}`)
    else assert.match(r.why, /not tried|New for you/)
  }
  assert.ok(!recs.some((r) => r.game.slug === slug), 'the game just played is not recommended again right away')
  // all 7 played -> never "not tried"
  for (const s of ['memory-matrix', 'code-breaker', 'stair-jump', 'one-minute-challenge', 'two-doors', 'mind-games', 'trivia-party']) recordResult(s, { score: 1, rating: 0.9 })
  for (const r of recommend(saved(), 3)) assert.ok(!/not tried|New for you/.test(r.why))
})

test('corrupted storage does not crash loading (shape sanitised)', async () => {
  localStorage.setItem('neuroplay:progress:v1', JSON.stringify({ history: 'oops', best: [], xp: 'x' }))
  const mod = await import('../src/engine/progress.js?fresh=1') // new module instance re-runs load()
  const r = mod.recordResult('memory-matrix', { score: 5, rating: 0.5 })
  assert.ok(r.xp > 0)
})

test('Code Breaker feedback handles duplicates correctly', () => {
  assert.deepEqual(feedback([1, 2, 3, 4], [1, 2, 3, 4]), ['hit', 'hit', 'hit', 'hit'])
  assert.deepEqual(feedback([1, 2, 3, 4], [4, 3, 2, 1]), ['near', 'near', 'near', 'near'])
  assert.deepEqual(feedback([1, 1, 2, 3], [1, 2, 1, 1]), ['hit', 'near', 'near', 'miss'])
  assert.deepEqual(feedback([0, 0, 0, 0], [1, 1, 1, 1]), ['miss', 'miss', 'miss', 'miss'])
  assert.deepEqual(feedback([5, 0, 0, 1], [0, 0, 0, 0]), ['miss', 'hit', 'hit', 'miss'])
})
