// Server-side mirror of the game catalogue: difficulty multipliers and score caps
// used to validate rewards. Keep in sync with client/src/data/games.js.
export const gameMeta = {
  'escape-room': { difficulty: 'Medium', maxScore: 1200 },
  'detective-mode': { difficulty: 'Hard', maxScore: 800 },
  'interrogation-master': { difficulty: 'Hard', maxScore: 700 },
  'traitor-among-us': { difficulty: 'Medium', maxScore: 800 },
  'survival-simulator': { difficulty: 'Hard', maxScore: 1600 },
  'time-loop': { difficulty: 'Hard', maxScore: 1200 },
  'treasure-hunt-ai': { difficulty: 'Medium', maxScore: 700 },
  'dream-maze': { difficulty: 'Medium', maxScore: 900 },
  'stair-jump': { difficulty: 'Easy', maxScore: 5000 },
  'story-quest': { difficulty: 'Easy', maxScore: 900 },
  'potion-master': { difficulty: 'Medium', maxScore: 1100 },
  'ai-story-adventure': { difficulty: 'Medium', maxScore: 800 },
  'mind-games': { difficulty: 'Medium', maxScore: 2000 },
  'two-doors': { difficulty: 'Medium', maxScore: 300 },
  'code-breaker': { difficulty: 'Medium', maxScore: 1000 },
  'memory-matrix': { difficulty: 'Easy', maxScore: 2000 },
  'who-am-i': { difficulty: 'Easy', maxScore: 500 },
  'caption-battle': { difficulty: 'Easy', maxScore: 400 },
  'surprise-box': { difficulty: 'Easy', maxScore: 600 },
  'alien-decoder': { difficulty: 'Hard', maxScore: 500 },
  'ai-fusion': { difficulty: 'Easy', maxScore: 1500 },
  'human-vs-ai': { difficulty: 'Medium', maxScore: 1200 },
  'trivia-party': { difficulty: 'Medium', maxScore: 2000 },
  'neuro-world': { difficulty: 'Medium', maxScore: 1000 },
  'mind-counter': { difficulty: 'Medium', maxScore: 800 },
  'endless-quest': { difficulty: 'Hard', maxScore: 3000 },
  'neon-survivor': { difficulty: 'Medium', maxScore: 10000 },
  'beat-sync': { difficulty: 'Medium', maxScore: 12000 },
  'city-architect': { difficulty: 'Medium', maxScore: 1500 },
  'bounce-lab': { difficulty: 'Medium', maxScore: 1000 },
  'evo-lab': { difficulty: 'Easy', maxScore: 1200 },
  'one-minute-challenge': { difficulty: 'Easy', maxScore: 2000 },
}
export const DIFF_MULT = { Easy: 1, Medium: 1.25, Hard: 1.5 }

// Server-side achievements mirror (ids must match client/src/engine/achievements.js).
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

export const xpForLevel = (L) => 50 * L * (L - 1)
export function levelInfo(xp) {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  return { level }
}