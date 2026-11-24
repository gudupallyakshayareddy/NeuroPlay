// Storage layer. Uses MongoDB (Atlas or local) when MONGODB_URI is set,
// otherwise a local JSON file so the project runs with zero setup.
// Both modes expose the same async API.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '.data')
const FILE = path.join(DATA_DIR, 'db.json')

let mode = 'file'
let mongo = null

// ---- file mode ----
let fileDb = { users: [], sessions: [] }
let writeTimer = null
function loadFile() {
  try {
    fileDb = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    if (!Array.isArray(fileDb.users)) fileDb.users = []
    if (!Array.isArray(fileDb.sessions)) fileDb.sessions = []
  } catch { fileDb = { users: [], sessions: [] } }
}
function persist() {
  clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      fs.writeFileSync(FILE, JSON.stringify(fileDb))
    } catch (e) { console.error('store write failed', e.message) }
  }, 150)
}

// ---- mongoose mode ----
async function initMongo(uri) {
  const mongoose = (await import('mongoose')).default
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, index: true },
    passwordHash: String,
    name: String,
    avatar: { type: String, default: 'nova' },
    friendCode: { type: String, unique: true, index: true },
    friends: { type: [String], default: [] },
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastPlayDate: { type: String, default: null },
    lastLoginReward: { type: String, default: null },
    history: { type: Array, default: [] },
    best: { type: Object, default: {} },
    plays: { type: Object, default: {} },
    achievements: { type: Object, default: {} },
    dailyDone: { type: Object, default: {} },
    createdAt: { type: Number, default: () => Date.now() },
  }, { minimize: false })
  const sessionSchema = new mongoose.Schema({
    _id: String,
    userId: String,
    slug: String,
    startedAt: Number,
    createdAt: { type: Date, default: Date.now, expires: 3600 }, // TTL: sessions die after 1h
  })
  const User = mongoose.model('User', userSchema)
  const Session = mongoose.model('GameSession', sessionSchema)
  mongo = { mongoose, User, Session }
  mode = 'mongo'
}

export async function initStore() {
  const uri = process.env.MONGODB_URI
  if (uri) {
    try {
      await initMongo(uri)
      console.log('Store: MongoDB connected')
      return mode
    } catch (e) {
      console.error('MongoDB connection failed, falling back to local file store:', e.message)
    }
  }
  loadFile()
  console.log('Store: local JSON file (set MONGODB_URI for MongoDB Atlas)')
  return mode
}
export const storeMode = () => mode

const publicUser = (u) => {
  if (!u) return null
  const { passwordHash, ...rest } = u
  return rest
}

// ---- users ----
export async function getUserByEmail(email) {
  if (mode === 'mongo') return publicUser(await mongo.User.findOne({ email }).lean().then((u) => u && { ...u, id: String(u._id) }))
  return publicUser(fileDb.users.find((u) => u.email === email))
}
export async function getUserWithHashByEmail(email) {
  if (mode === 'mongo') return mongo.User.findOne({ email }).lean().then((u) => u && { ...u, id: String(u._id) })
  return fileDb.users.find((u) => u.email === email) || null
}
export async function getUserById(id) {
  if (mode === 'mongo') return publicUser(await mongo.User.findById(id).lean().then((u) => u && { ...u, id: String(u._id) }))
  return publicUser(fileDb.users.find((u) => u.id === id))
}
export async function getUserByFriendCode(code) {
  if (mode === 'mongo') return publicUser(await mongo.User.findOne({ friendCode: code }).lean().then((u) => u && { ...u, id: String(u._id) }))
  return publicUser(fileDb.users.find((u) => u.friendCode === code))
}
export async function createUser(data) {
  if (mode === 'mongo') {
    const u = await mongo.User.create(data)
    return publicUser({ ...u.toObject(), id: String(u._id) })
  }
  const u = { id: Math.random().toString(36).slice(2) + Date.now().toString(36), ...data }
  fileDb.users.push(u)
  persist()
  return publicUser(u)
}
export async function updateUser(id, patch) {
  if (mode === 'mongo') {
    const u = await mongo.User.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean()
    return publicUser(u && { ...u, id: String(u._id) })
  }
  const u = fileDb.users.find((x) => x.id === id)
  if (!u) return null
  Object.assign(u, patch)
  persist()
  return publicUser(u)
}
export async function topUsers(limit = 10) {
  if (mode === 'mongo') {
    const list = await mongo.User.find({}, { name: 1, avatar: 1, xp: 1, best: 1, friendCode: 1 }).sort({ xp: -1 }).limit(limit).lean()
    return list.map((u) => ({ ...u, id: String(u._id) }))
  }
  return [...fileDb.users].sort((a, b) => b.xp - a.xp).slice(0, limit).map(publicUser)
}

// ---- validated game sessions ----
export async function createSession(id, data) {
  if (mode === 'mongo') { await mongo.Session.create({ _id: id, ...data }); return }
  fileDb.sessions.push({ id, ...data })
  // prune old sessions so the file stays small
  const cutoff = Date.now() - 3600000
  fileDb.sessions = fileDb.sessions.filter((s) => s.startedAt > cutoff)
  persist()
}
export async function takeSession(id) {
  if (mode === 'mongo') return mongo.Session.findByIdAndDelete(id).lean()
  const i = fileDb.sessions.findIndex((s) => s.id === id)
  if (i === -1) return null
  const [s] = fileDb.sessions.splice(i, 1)
  persist()
  return s
}