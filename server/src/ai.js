// AI feature endpoints. Every route tries Gemini, then falls back to authored
// content so the platform stays playable offline. Answers for scored rounds
// (riddles, human-vs-ai, interrogation) stay on the server.
import { Router } from 'express'
import { z } from 'zod'
import { callGemini, parseJson, geminiEnabled } from './gemini.js'
import {
  fallbackStory, fallbackFusion, fallbackCaptionJudge, HVA_BANK, RIDDLE_BANK,
  fallbackNpc, SUSPECT_BANK, suspectAnswer, LEGENDARY,
} from './data/aiFallbacks.js'

export const aiRouter = Router()
const bad = (res, err) => res.status(400).json({ error: 'Invalid request', details: err.issues?.map((i) => `${i.path.join('.')}: ${i.message}`) })

// Short-lived round store with pruning (answers never leave the server).
const rounds = new Map()
function newRound(data) {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
  rounds.set(id, { ...data, at: Date.now() })
  if (rounds.size > 2000) for (const [k, v] of rounds) if (Date.now() - v.at > 30 * 60000) rounds.delete(k)
  return id
}
const takeRound = (id) => rounds.get(id)

const wrap = (fn) => async (req, res) => { try { await fn(req, res) } catch (e) { console.error(e); res.status(500).json({ error: 'AI request failed' }) } }

// ---------- Story ----------
const StoryReq = z.object({
  theme: z.string().trim().min(2).max(60),
  action: z.string().trim().min(1).max(400),
  history: z.array(z.object({ role: z.enum(['player', 'dm']), text: z.string().max(1200) })).max(24).default([]),
})
aiRouter.post('/story', wrap(async (req, res) => {
  const p = StoryReq.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const { theme, action, history } = p.data
  const turn = history.filter((h) => h.role === 'player').length
  if (geminiEnabled()) {
    try {
      const sys = 'You are a game master for a short interactive adventure. Respond ONLY with JSON: {"text": string (2-4 sentences, second person, vivid but concise), "choices": [3 short suggested actions], "ending": boolean}. Keep it PG-13. After 8+ player turns, or if the player asks to conclude, set ending true and write a satisfying conclusion reflecting their choices.'
      const prompt = `Theme: ${theme}\nTurn: ${turn + 1}\nStory so far:\n${history.map((h) => `${h.role === 'dm' ? 'GM' : 'Player'}: ${h.text}`).join('\n')}\nPlayer action: ${action}`
      const j = parseJson(await callGemini({ system: sys, prompt, json: true }))
      if (typeof j.text === 'string' && Array.isArray(j.choices)) {
        return res.json({ text: j.text.slice(0, 1200), choices: j.choices.slice(0, 3).map(String), ending: !!j.ending || turn >= 14, source: 'gemini' })
      }
    } catch { /* fall through */ }
  }
  res.json({ ...fallbackStory(theme, turn), source: 'fallback' })
}))

// ---------- Fusion ----------
const FusionReq = z.object({ a: z.string().trim().min(1).max(40), b: z.string().trim().min(1).max(40) })
aiRouter.post('/fusion', wrap(async (req, res) => {
  const p = FusionReq.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const { a, b } = p.data
  if (geminiEnabled()) {
    try {
      const sys = 'You power an item-combination game. Given two items, invent ONE meaningful, clever result of combining them. Respond ONLY with JSON: {"result": string (1-3 words, title case), "emoji": one emoji, "description": one short witty sentence}. The result should feel like a real discovery, not a random mashup. Keep it family friendly.'
      const j = parseJson(await callGemini({ system: sys, prompt: `Combine: ${a} + ${b}`, json: true, temperature: 1 }))
      if (j.result) return res.json({ result: String(j.result).slice(0, 40), emoji: String(j.emoji || '✨').slice(0, 8), description: String(j.description || '').slice(0, 200), source: 'gemini' })
    } catch { /* fall through */ }
  }
  res.json({ ...fallbackFusion(a, b), source: 'fallback' })
}))
aiRouter.get('/fusion/legendary', (_req, res) => res.json({ legendary: LEGENDARY }))

// ---------- Caption judge ----------
const CaptionReq = z.object({ prompt: z.string().trim().min(3).max(300), caption: z.string().trim().min(1).max(200) })
aiRouter.post('/caption', wrap(async (req, res) => {
  const p = CaptionReq.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const { prompt, caption } = p.data
  if (geminiEnabled()) {
    try {
      const sys = 'You judge a caption contest. Score the caption for the given scenario on humor, creativity and relevance. Be consistent: 0-30 weak, 31-55 okay, 56-75 good, 76-90 great, 91-100 exceptional. Respond ONLY with JSON: {"score": integer 0-100, "verdict": one or two sentences explaining the score, mentioning what worked or fell flat}.'
      const j = parseJson(await callGemini({ system: sys, prompt: `Scenario: ${prompt}\nCaption: ${caption}`, json: true, temperature: 0.4 }))
      const score = Math.max(0, Math.min(100, Math.round(Number(j.score) || 0)))
      return res.json({ score, verdict: String(j.verdict || '').slice(0, 300), source: 'gemini' })
    } catch { /* fall through */ }
  }
  res.json({ ...fallbackCaptionJudge(prompt, caption), source: 'fallback' })
}))

// ---------- Human vs AI ----------
const hvaDiff = z.object({ difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium') })
aiRouter.post('/human-or-ai/start', wrap(async (req, res) => {
  const p = hvaDiff.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  if (geminiEnabled()) {
    try {
      const sys = 'You create a "human or AI" guessing game. Write ONE short text (2-4 sentences) on a random everyday topic. Randomly decide whether it should sound like a casual human social-media post (informal, personal, imperfect) or like polished AI assistant prose (structured, hedged, generic). Do NOT reveal which. Respond ONLY with JSON: {"text": string, "wasAI": boolean, "explanation": one sentence on the tell-tale signs}.'
      const j = parseJson(await callGemini({ system: sys, prompt: `Difficulty: ${p.data.difficulty}. Make the distinction ${p.data.difficulty === 'Hard' ? 'subtle' : p.data.difficulty === 'Easy' ? 'obvious' : 'moderate'}.`, json: true, temperature: 1.1 }))
      if (j.text && typeof j.wasAI === 'boolean') {
        const id = newRound({ kind: 'hva', wasAI: j.wasAI, explanation: String(j.explanation || '').slice(0, 300) })
        return res.json({ roundId: id, text: String(j.text).slice(0, 600), source: 'gemini' })
      }
    } catch { /* fall through */ }
  }
  const item = HVA_BANK[Math.floor(Math.random() * HVA_BANK.length)]
  const id = newRound({ kind: 'hva', wasAI: item.wasAI, explanation: item.explanation })
  res.json({ roundId: id, text: item.text, source: 'fallback' })
}))
const HvaAnswer = z.object({ roundId: z.string().max(64), guess: z.enum(['human', 'ai']) })
aiRouter.post('/human-or-ai/answer', wrap(async (req, res) => {
  const p = HvaAnswer.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const r = takeRound(p.data.roundId)
  if (!r || r.kind !== 'hva') return res.status(404).json({ error: 'Round expired. Start a new one.' })
  rounds.delete(p.data.roundId)
  const wasAI = r.wasAI
  res.json({ correct: (p.data.guess === 'ai') === wasAI, wasAI, explanation: r.explanation, source: 'fallback' })
}))

// ---------- Riddles ----------
const RiddleReq = z.object({ theme: z.string().trim().max(60).optional(), difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium') })
aiRouter.post('/riddle', wrap(async (req, res) => {
  const p = RiddleReq.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  if (geminiEnabled()) {
    try {
      const sys = 'You write riddles for a treasure hunt game. Respond ONLY with JSON: {"riddle": string (2-4 lines, rhyming optional), "answer": one or two lowercase words, "hint": one short sentence}. The answer must be a common noun a player can guess. Difficulty: ' + p.data.difficulty + '.'
      const j = parseJson(await callGemini({ system: sys, prompt: `Theme: ${p.data.theme || 'places and objects'}. Write a fresh riddle.`, json: true }))
      if (j.riddle && j.answer) {
        const id = newRound({ kind: 'riddle', answer: String(j.answer).toLowerCase().trim() })
        return res.json({ id, riddle: String(j.riddle).slice(0, 500), hint: String(j.hint || 'Think literally.').slice(0, 150), source: 'gemini' })
      }
    } catch { /* fall through */ }
  }
  const item = RIDDLE_BANK[Math.floor(Math.random() * RIDDLE_BANK.length)]
  const id = newRound({ kind: 'riddle', answer: item.answer })
  res.json({ id, riddle: item.riddle, hint: item.hint, source: 'fallback' })
}))
const RiddleAnswer = z.object({ id: z.string().max(64), answer: z.string().trim().min(1).max(60) })
aiRouter.post('/riddle/answer', wrap(async (req, res) => {
  const p = RiddleAnswer.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const r = takeRound(p.data.id)
  if (!r || r.kind !== 'riddle') return res.status(404).json({ error: 'Riddle expired. Get a new one.' })
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(a|an|the)\b/g, '').replace(/\s+/g, ' ').trim()
  const guess = norm(p.data.answer), answer = norm(r.answer)
  const correct = guess === answer || guess === answer + 's' || guess + 's' === answer
  if (correct) rounds.delete(p.data.id)
  res.json({ correct, answer: correct ? r.answer : undefined, source: 'fallback' })
}))

// ---------- NPC dialogue ----------
const NpcReq = z.object({
  name: z.string().trim().min(1).max(40),
  personality: z.string().trim().max(200),
  context: z.string().trim().max(400).default(''),
  message: z.string().trim().min(1).max(400),
  history: z.array(z.object({ role: z.enum(['player', 'npc']), text: z.string().max(600) })).max(16).default([]),
})
aiRouter.post('/npc', wrap(async (req, res) => {
  const p = NpcReq.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const { name, personality, context, message, history } = p.data
  if (geminiEnabled()) {
    try {
      const sys = `You are ${name}, an NPC in a small fantasy world. Personality: ${personality}. World context: ${context}. Stay fully in character. Reply in 1-3 sentences. Never break character, never mention being an AI. You may hint at your quest but never solve it for the player.`
      const prompt = `${history.map((h) => `${h.role === 'player' ? 'Traveler' : name}: ${h.text}`).join('\n')}\nTraveler: ${message}\n${name}:`
      const reply = await callGemini({ system: sys, prompt, temperature: 0.9 })
      return res.json({ reply: reply.trim().slice(0, 500), source: 'gemini' })
    } catch { /* fall through */ }
  }
  res.json({ reply: fallbackNpc(name, personality, message), source: 'fallback' })
}))

// ---------- Interrogation ----------
const InterStart = z.object({ difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium') })
aiRouter.post('/interrogate/start', wrap(async (req, res) => {
  const p = InterStart.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const base = SUSPECT_BANK[Math.floor(Math.random() * SUSPECT_BANK.length)]
  if (geminiEnabled()) {
    try {
      const sys = 'You create an interrogation game. Invent a suspect hiding ONE secret. Respond ONLY with JSON: {"name": string, "role": string, "bio": 1-2 sentences with their alibi, "secret": short phrase, "options": [4 short possible truths, one being the secret, shuffled], "facts": {5 keyword: claimed-fact pairs the suspect will repeat}, "tell": one subtle inconsistency a smart player can catch}.'
      const j = parseJson(await callGemini({ system: sys, prompt: `Difficulty: ${p.data.difficulty}. Fresh suspect, crime setting: harbor town.`, json: true }))
      if (j.name && j.secret && Array.isArray(j.options) && j.options.length === 4) {
        const sessionId = newRound({ kind: 'inter', suspect: { name: j.name, role: j.role, bio: j.bio, secret: String(j.secret), options: j.options.map(String), facts: j.facts || {}, lies: [String(j.tell || '')] } })
        return res.json({ sessionId, suspect: { name: j.name, role: j.role, bio: j.bio }, options: j.options.map(String), intro: `${j.name} sits down and waits.`, source: 'gemini' })
      }
    } catch { /* fall through */ }
  }
  const sessionId = newRound({ kind: 'inter', suspect: base })
  res.json({ sessionId, suspect: { name: base.name, role: base.role, bio: base.bio }, options: base.options, intro: `${base.name} sits down and waits.`, source: 'fallback' })
}))
const InterAsk = z.object({ sessionId: z.string().max(64), question: z.string().trim().min(2).max(300) })
aiRouter.post('/interrogate/ask', wrap(async (req, res) => {
  const p = InterAsk.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const r = takeRound(p.data.sessionId)
  if (!r || r.kind !== 'inter') return res.status(404).json({ error: 'Session expired. Start a new interrogation.' })
  const s = r.suspect
  if (geminiEnabled() && s.facts) {
    try {
      const sys = `You are ${s.name}, ${s.role}, being interrogated. Your hidden secret: ${s.secret}. You lie about it but stay consistent with these claimed facts: ${JSON.stringify(s.facts)}. Subtle tell: ${s.lies?.[0] || 'none'}. Answer in 1-2 sentences, in character, defensive but not cartoonish. Never confess unless directly confronted with the exact truth.`
      const answer = await callGemini({ system: sys, prompt: `Detective asks: ${p.data.question}`, temperature: 0.7 })
      return res.json({ answer: answer.trim().slice(0, 400), source: 'gemini' })
    } catch { /* fall through */ }
  }
  res.json({ answer: suspectAnswer(s, p.data.question), source: 'fallback' })
}))
const InterAccuse = z.object({ sessionId: z.string().max(64), guess: z.string().trim().min(2).max(120) })
aiRouter.post('/interrogate/accuse', wrap(async (req, res) => {
  const p = InterAccuse.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const r = takeRound(p.data.sessionId)
  if (!r || r.kind !== 'inter') return res.status(404).json({ error: 'Session expired.' })
  rounds.delete(p.data.sessionId)
  const norm = (x) => x.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const correct = norm(p.data.guess) === norm(r.suspect.secret)
  res.json({ correct, truth: r.suspect.truth || `The truth: ${r.suspect.secret}.`, source: 'fallback' })
}))