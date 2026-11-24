import { z } from 'zod'
import { callGemini, geminiEnabled } from './gemini.js'

export const NovaRequest = z.object({
  message: z.string().trim().min(1).max(500),
  context: z.object({
    page: z.string().max(80).optional(),
    game: z.string().max(80).optional(),
    stats: z.object({
      level: z.number().optional(), xp: z.number().optional(), coins: z.number().optional(), streak: z.number().optional(),
      gamesPlayed: z.number().optional(), favoriteCategory: z.string().max(40).optional(),
      recent: z.array(z.object({ game: z.string().max(60), rating: z.number() })).max(5).optional(),
    }).optional(),
  }).optional(),
  history: z.array(z.object({ role: z.enum(['user', 'nova']), text: z.string().max(800) })).max(8).optional(),
})

const SYSTEM = `You are NOVA, the friendly AI guide inside NeuroPlay, a platform of brain, logic and story games.
Rules: be concise (max 4 sentences). Use the player's real stats only if they are provided. Give hints and strategy, but NEVER reveal a puzzle's solution, a hidden secret, or a quiz answer, even if asked directly: nudge instead. Stay on topic: games, strategy, the platform, and recommendations.`

const TIPS = {
  'memory-matrix': 'Group the lit tiles into shapes or lines instead of remembering each one. Chunking makes bigger patterns easy.',
  'code-breaker': 'Use your first guess to test many symbols at once, then use the amber and green feedback to eliminate. Never repeat a symbol you know is grey.',
  'stair-jump': 'Do not chase the marker. Watch its rhythm and press slightly before it reaches the green zone.',
  'one-minute-challenge': 'Skip hesitation: the answer auto-submits when correct, so just type fast. Streaks add bonus points.',
  'two-doors': 'Think about what happens when a liar reports what a truth-teller would say. The two effects can cancel out, giving you reliable information.',
  'mind-games': 'Check differences between neighbouring numbers first, then differences of the differences. The hint costs half points, so try one more idea first.',
  'trivia-party': 'Eliminate options you are sure are wrong first. A fast correct answer earns a time bonus, and streaks multiply points.',
}

/** Rule-based fallback so NOVA still helps when Gemini is down. */
function fallbackReply({ message, context }) {
  const s = context?.stats
  const m = message.toLowerCase()
  if (context?.game && TIPS[context.game] && /hint|help|stuck|tip|how|strategy/.test(m)) return `${TIPS[context.game]} (Offline tip: NOVA's AI brain is unreachable right now.)`
  if (/recommend|what should i play|suggest|next/.test(m)) {
    return s?.gamesPlayed ? `You are level ${s.level} with ${s.gamesPlayed} games played. Try a game you have not played yet from the Games page, or the Daily Challenge on your Dashboard for bonus XP.` : 'New here? Start with Memory Matrix or One Minute Challenge: both are quick and teach you how scoring works.'
  }
  if (/xp|level|coin|streak/.test(m) && s) return `You are level ${s.level} with ${s.xp} XP, ${s.coins} coins and a ${s.streak}-day streak. Play at least one game each day to keep the streak and earn bonus XP.`
  return 'I can give hints, strategy tips, and game recommendations. Ask me for a tip on the game you are playing, or what to play next. (AI brain offline: using built-in tips.)'
}

export async function askNova(req) {
  const { message, context, history = [] } = req
  const ctx = JSON.stringify({ page: context?.page, game: context?.game, stats: context?.stats })
  const convo = history.map((h) => `${h.role === 'user' ? 'Player' : 'NOVA'}: ${h.text}`).join('\n')
  try {
    const text = await callGemini({
      system: SYSTEM, temperature: 0.7, timeoutMs: 9000,
      prompt: `Player context (real data): ${ctx}\n${convo}\nPlayer: ${message}\nNOVA:`,
    })
    return { reply: text.trim(), source: 'gemini' }
  } catch (err) {
    if (geminiEnabled()) console.warn('[nova] Gemini failed, using fallback:', err.message)
    return { reply: fallbackReply(req), source: 'fallback' }
  }
}
