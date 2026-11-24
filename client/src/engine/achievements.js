import { levelInfo } from './progress'

// Every achievement is checked against real progress data, nothing is faked.
export const achievements = [
  { id: 'first-game', title: 'First Steps', text: 'Finish your first game.', coins: 10, check: (p) => p.history.length >= 1 },
  { id: 'five-games', title: 'Warming Up', text: 'Finish 5 games.', coins: 20, check: (p) => p.history.length >= 5 },
  { id: 'twenty-five', title: 'Regular', text: 'Finish 25 games.', coins: 60, check: (p) => p.history.length >= 25 },
  { id: 'explorer', title: 'Explorer', text: 'Play 4 different games.', coins: 30, check: (p) => Object.keys(p.plays).length >= 4 },
  { id: 'all-rounder', title: 'All-Rounder', text: 'Play 8 different games.', coins: 80, check: (p) => Object.keys(p.plays).length >= 8 },
  { id: 'perfect', title: 'Flawless', text: 'Score 95%+ in any game.', coins: 40, check: (p, e) => e.rating >= 0.95 },
  { id: 'winner', title: 'Winner', text: 'Win 10 games.', coins: 40, check: (p) => p.history.filter((h) => h.won).length >= 10 },
  { id: 'streak-3', title: 'On Fire', text: 'Reach a 3-day streak.', coins: 30, check: (p) => p.streak >= 3 },
  { id: 'streak-7', title: 'Unstoppable', text: 'Reach a 7-day streak.', coins: 100, check: (p) => p.streak >= 7 },
  { id: 'level-5', title: 'Rising Star', text: 'Reach level 5.', coins: 50, check: (p) => levelInfo(p.xp).level >= 5 },
  { id: 'level-10', title: 'Veteran', text: 'Reach level 10.', coins: 150, check: (p) => levelInfo(p.xp).level >= 10 },
  { id: 'daily', title: 'Daily Hero', text: 'Complete a daily challenge.', coins: 25, check: (p, e) => e.daily },
  { id: 'rich', title: 'Coin Collector', text: 'Hold 300 coins.', coins: 0, check: (p) => p.coins >= 300 },
]

/** Returns achievements newly unlocked by `progress` (already includes the latest entry). */
export function evaluateAchievements(progress, entry) {
  return achievements.filter((a) => !progress.achievements[a.id] && a.check(progress, entry))
}
