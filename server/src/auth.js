// Authentication: signup/login with bcrypt hashing and JWT bearer tokens.
// No plain-text passwords are ever stored; no secrets reach the frontend.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createUser, getUserById, getUserWithHashByEmail, updateUser } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  // Dev convenience: persist a random secret so tokens survive restarts.
  const f = path.join(__dirname, '..', '.data', 'jwt-secret')
  try { return fs.readFileSync(f, 'utf8').trim() } catch { /* generate below */ }
  const s = crypto.randomBytes(48).toString('hex')
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s) } catch { /* in-memory only */ }
  return s
}
const SECRET = getSecret()

export const AVATARS = ['nova', 'orbit', 'pixel', 'cipher', 'ember', 'flux', 'sage', 'volt']

const bad = (res, err) => res.status(400).json({ error: 'Invalid request', details: err.issues?.map((i) => `${i.path.join('.')}: ${i.message}`) })
const friendCode = () => Array.from(crypto.randomBytes(6)).map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Sign in required' })
  try {
    const payload = jwt.verify(token, SECRET)
    const user = await getUserById(payload.sub)
    if (!user) return res.status(401).json({ error: 'Account not found' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Session expired. Sign in again.' })
  }
}

export const authRouter = Router()

const SignupReq = z.object({
  name: z.string().trim().min(2).max(20),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(100),
})
authRouter.post('/signup', async (req, res, next) => {
  try {
    const p = SignupReq.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const { name, email, password } = p.data
    if (await getUserWithHashByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists.' })
    const passwordHash = await bcrypt.hash(password, 10)
    let code = friendCode()
    const user = await createUser({
      email, passwordHash, name, avatar: 'nova', friendCode: code, friends: [],
      xp: 0, coins: 0, streak: 0, bestStreak: 0, lastPlayDate: null, lastLoginReward: null,
      history: [], best: {}, plays: {}, achievements: {}, dailyDone: {}, createdAt: Date.now(),
    })
    const token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (e) { next(e) }
})

const LoginReq = z.object({ email: z.string().trim().toLowerCase().email().max(120), password: z.string().min(1).max(100) })
authRouter.post('/login', async (req, res, next) => {
  try {
    const p = LoginReq.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const u = await getUserWithHashByEmail(p.data.email)
    // Same message for unknown email and wrong password (no account enumeration).
    if (!u || !(await bcrypt.compare(p.data.password, u.passwordHash))) {
      return res.status(401).json({ error: 'Wrong email or password.' })
    }
    const { passwordHash, ...user } = u
    const token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (e) { next(e) }
})

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))

const PatchMe = z.object({
  name: z.string().trim().min(2).max(20).optional(),
  avatar: z.enum(AVATARS).optional(),
})
authRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const p = PatchMe.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const user = await updateUser(req.user.id, p.data)
    res.json({ user })
  } catch (e) { next(e) }
})

const ChangePw = z.object({ current: z.string().min(1).max(100), next: z.string().min(8).max(100) })
authRouter.post('/password', requireAuth, async (req, res, next) => {
  try {
    const p = ChangePw.safeParse(req.body)
    if (!p.success) return bad(res, p.error)
    const u = await getUserWithHashByEmail(req.user.email)
    if (!(await bcrypt.compare(p.data.current, u.passwordHash))) return res.status(401).json({ error: 'Current password is wrong.' })
    await updateUser(req.user.id, { passwordHash: await bcrypt.hash(p.data.next, 10) })
    res.json({ ok: true })
  } catch (e) { next(e) }
})