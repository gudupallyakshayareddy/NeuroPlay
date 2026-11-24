import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { geminiEnabled } from './gemini.js'
import { askNova, NovaRequest } from './nova.js'
import { checkAnswer, createQuiz } from './trivia.js'
import { triviaTopics } from './data/trivia.js'
import { initStore, storeMode } from './store.js'
import { authRouter } from './auth.js'
import { progressRouter } from './progress.js'
import { aiRouter } from './ai.js'
import { attachMultiplayer } from './rooms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const app = express()
const corsOrigin = process.env.CLIENT_ORIGIN || true
app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '64kb' }))

// Tiny per-IP rate limit so a demo cannot burn the Gemini quota.
const hits = new Map()
app.use('/api', (req, res, next) => {
  const now = Date.now(), key = req.ip
  const recent = (hits.get(key) || []).filter((t) => now - t < 60000)
  const limit = req.path.startsWith('/ai') || req.path === '/nova' || req.path === '/trivia/quiz' ? 20 : 120
  if (recent.length >= limit) return res.status(429).json({ error: 'Too many requests. Slow down a little.' })
  hits.set(key, [...recent, now])
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60000)) hits.delete(k) // keep memory bounded
  next()
})

const bad = (res, err) => res.status(400).json({ error: 'Invalid request', details: err.issues?.map((i) => `${i.path.join('.')}: ${i.message}`) })

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  gemini: geminiEnabled() ? 'configured' : 'not configured (fallback content in use)',
  store: storeMode(),
  multiplayer: true,
}))

app.post('/api/nova', async (req, res) => {
  const p = NovaRequest.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  res.json(await askNova(p.data))
})

const QuizReq = z.object({ topic: z.string().trim().min(2).max(40), difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'), count: z.number().int().min(3).max(10).default(8) })
app.get('/api/trivia/topics', (_req, res) => res.json({ topics: triviaTopics }))
app.post('/api/trivia/quiz', async (req, res) => {
  const p = QuizReq.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  res.json(await createQuiz(p.data))
})
const AnswerReq = z.object({ quizId: z.string().max(64), index: z.number().int().min(0).max(20), choice: z.number().int().min(-1).max(3) })
app.post('/api/trivia/answer', (req, res) => {
  const p = AnswerReq.safeParse(req.body)
  if (!p.success) return bad(res, p.error)
  const r = checkAnswer(p.data)
  if (!r) return res.status(404).json({ error: 'Quiz expired. Start a new one.' })
  res.json(r)
})

app.use('/api/auth', authRouter)
app.use('/api', progressRouter)
app.use('/api/ai', aiRouter)

// In production the built client is served by this same server, so one URL runs
// the complete website (frontend + API + multiplayer).
const dist = path.join(__dirname, '..', '..', 'client', 'dist')
const hasClient = fs.existsSync(path.join(dist, 'index.html'))
if (hasClient) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error' }) })

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = process.env.PORT || 3001
  await initStore()
  const server = http.createServer(app)
  attachMultiplayer(server, corsOrigin)
  server.listen(port, () => console.log(`NeuroPlay server on :${port} | Gemini ${geminiEnabled() ? 'ON' : 'OFF (fallbacks)'} | store: ${storeMode()} | multiplayer: ON`))
}