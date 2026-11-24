// Real-time multiplayer: room codes, lobbies, ready states, chat, and
// server-authoritative games (Traitor Among Us, Caption Battle).
import { Server } from 'socket.io'
import { fallbackCaptionJudge } from './data/aiFallbacks.js'
import { callGemini, parseJson, geminiEnabled } from './gemini.js'

const ROOMS = new Map()
const MAX_ROOMS = 200
const code6 = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

const CAPTION_PROMPTS = [
  'A cat has been hired as the office HR manager. This is its first performance review.',
  'Aliens land and demand to speak to Earth\u2019s manager. You are the manager.',
  'A medieval knight tries to explain Wi-Fi to a dragon.',
  'The office printer has achieved sentience and is refusing to print on Mondays.',
  'A pigeon wins the lottery and is interviewed about its plans.',
  'Your GPS develops attitude and starts judging your life choices.',
]

function publicRoom(room) {
  return {
    code: room.code, game: room.game, hostId: room.hostId, phase: room.phase,
    players: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, ready: p.ready, score: p.score })),
  }
}
const sendRoom = (io, room) => io.to(room.code).emit('room:update', publicRoom(room))
const sysChat = (io, room, text) => io.to(room.code).emit('room:chat', { from: 'Mission Control', text, at: Date.now(), system: true })

// ---------- Traitor Among Us (server-authoritative) ----------
function traitorStart(io, room) {
  const players = [...room.players.values()]
  const traitor = players[Math.floor(Math.random() * players.length)]
  room.state = { round: 1, maxRounds: 3, mission: 0, phase: 'tasks', log: [], votes: {}, acted: {}, ejected: null, suspicion: {} }
  for (const p of players) {
    p.role = p.id === traitor.id ? 'traitor' : 'crew'
    p.score = 0
    io.to(p.socketId).emit('game:private', { role: p.role })
  }
  sysChat(io, room, 'Round 1: complete your tasks. The traitor may sabotage instead. Mission needs 100%.')
  io.to(room.code).emit('game:state', traitorPublic(room))
}
const traitorPublic = (room) => ({
  game: 'traitor-among-us', round: room.state.round, maxRounds: room.state.maxRounds,
  mission: room.state.mission, phase: room.state.phase, log: room.state.log.slice(-12),
  acted: Object.keys(room.state.acted), ejected: room.state.ejected,
})
function traitorAction(io, room, player, a) {
  const s = room.state
  if (s.phase === 'tasks' && (a.type === 'task' || a.type === 'sabotage') && !s.acted[player.id]) {
    if (a.type === 'sabotage' && player.role !== 'traitor') return
    s.acted[player.id] = a.type
    if (a.type === 'task') { s.mission = Math.min(100, s.mission + Math.ceil(100 / (room.players.size * 2))); s.log.push(`${player.name} completed a task.`) }
    else { s.mission = Math.max(0, s.mission - 15); s.log.push('Someone sabotaged the mission! (-15%)') }
    if (Object.keys(s.acted).length >= room.players.size) traitorToDiscussion(io, room)
    else io.to(room.code).emit('game:state', traitorPublic(room))
  } else if (s.phase === 'discussion' && a.type === 'accuse' && room.players.has(a.target)) {
    s.log.push(`${player.name} suspects ${room.players.get(a.target).name}.`)
    s.suspicion[a.target] = (s.suspicion[a.target] || 0) + 1
    io.to(room.code).emit('game:state', traitorPublic(room))
  } else if (s.phase === 'vote' && a.type === 'vote' && room.players.has(a.target) && !s.votes[player.id]) {
    s.votes[player.id] = a.target
    if (Object.keys(s.votes).length >= room.players.size) traitorResolveVote(io, room)
    else io.to(room.code).emit('game:state', traitorPublic(room))
  }
}
function traitorToDiscussion(io, room) {
  room.state.phase = 'discussion'
  sysChat(io, room, `Discussion: who is acting strangely? Accuse someone, then the host calls the vote.`)
  io.to(room.code).emit('game:state', traitorPublic(room))
}
function traitorResolveVote(io, room) {
  const s = room.state
  const tally = {}
  for (const t of Object.values(s.votes)) tally[t] = (tally[t] || 0) + 1
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
  const ejected = top ? room.players.get(top[0]) : null
  if (ejected) {
    s.ejected = { name: ejected.name, role: ejected.role }
    sysChat(io, room, `${ejected.name} was ejected. They were ${ejected.role === 'traitor' ? 'THE TRAITOR' : 'innocent crew'}.`)
    if (ejected.role === 'traitor') return traitorEnd(io, room, 'crew', 'The crew found the traitor!')
    room.players.delete(ejected.id)
    io.to(ejected.socketId).emit('game:private', { eliminated: true })
    if (room.players.size <= 2) return traitorEnd(io, room, 'traitor', 'Too few crew remain. The traitor wins.')
  }
  if (s.mission >= 100) return traitorEnd(io, room, 'crew', 'Mission complete!')
  if (s.round >= s.maxRounds) return traitorEnd(io, room, 'traitor', 'The traitor survived every vote.')
  s.round += 1; s.phase = 'tasks'; s.acted = {}; s.votes = {}; s.ejected = null
  sysChat(io, room, `Round ${s.round}: back to tasks.`)
  io.to(room.code).emit('game:state', traitorPublic(room))
}
function traitorEnd(io, room, winner, reason) {
  room.phase = 'results'
  const rows = [...room.players.values()].map((p) => {
    const won = p.role === winner
    p.score = (won ? 400 : 100) + (p.role === 'crew' ? Object.values(room.state.acted).filter((x) => x === 'task').length * 20 : 0)
    return { id: p.id, name: p.name, avatar: p.avatar, score: p.score, won, role: p.role }
  })
  sysChat(io, room, reason)
  io.to(room.code).emit('game:results', { game: 'traitor-among-us', winner, reason, rows })
  sendRoom(io, room)
}

// ---------- Caption Battle (server-authoritative) ----------
async function judgeCaption(prompt, caption) {
  if (geminiEnabled()) {
    try {
      const sys = 'You judge a caption contest on humor, creativity, relevance. Respond ONLY with JSON {"score": 0-100, "verdict": one sentence}.'
      const j = parseJson(await callGemini({ system: sys, prompt: `Scenario: ${prompt}\nCaption: ${caption}`, json: true, temperature: 0.4, timeoutMs: 9000 }))
      return { score: Math.max(0, Math.min(100, Math.round(Number(j.score) || 0))), verdict: String(j.verdict || '').slice(0, 200) }
    } catch { /* fallback */ }
  }
  return fallbackCaptionJudge(prompt, caption)
}
function captionStart(io, room) {
  room.state = { round: 0, maxRounds: 3, submissions: {}, timer: null, prompt: null }
  for (const p of room.players.values()) p.score = 0
  captionRound(io, room)
}
function captionRound(io, room) {
  const s = room.state
  s.round += 1
  s.submissions = {}
  s.prompt = CAPTION_PROMPTS[Math.floor(Math.random() * CAPTION_PROMPTS.length)]
  io.to(room.code).emit('game:state', { game: 'caption-battle', round: s.round, maxRounds: s.maxRounds, prompt: s.prompt, submitted: [], seconds: 60 })
  sysChat(io, room, `Round ${s.round}: write your caption! 60 seconds.`)
  clearTimeout(s.timer)
  s.timer = setTimeout(() => captionJudge(io, room), 60000)
}
async function captionJudge(io, room) {
  const s = room.state
  if (!s || room.phase !== 'playing') return
  clearTimeout(s.timer)
  s.phase = 'judging'
  io.to(room.code).emit('game:state', { game: 'caption-battle', round: s.round, maxRounds: s.maxRounds, prompt: s.prompt, judging: true })
  const rows = []
  for (const p of room.players.values()) {
    const text = s.submissions[p.id] || ''
    const j = text ? await judgeCaption(s.prompt, text) : { score: 0, verdict: 'No caption submitted.' }
    p.score += j.score
    rows.push({ id: p.id, name: p.name, avatar: p.avatar, caption: text, score: j.score, verdict: j.verdict, total: p.score })
  }
  rows.sort((a, b) => b.score - a.score)
  io.to(room.code).emit('game:round', { round: s.round, rows })
  if (s.round >= s.maxRounds) {
    room.phase = 'results'
    const final = [...room.players.values()].map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, won: false }))
    final.sort((a, b) => b.score - a.score)
    if (final[0]) final[0].won = true
    io.to(room.code).emit('game:results', { game: 'caption-battle', winner: 'top', reason: `${final[0]?.name || 'Nobody'} wins the caption battle!`, rows: final })
    sendRoom(io, room)
  } else {
    setTimeout(() => { if (room.phase === 'playing') captionRound(io, room) }, 8000)
  }
}

// ---------- socket wiring ----------
export function attachMultiplayer(httpServer, corsOrigin) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin || true } })

  io.on('connection', (socket) => {
    let roomCode = null

    const myRoom = () => ROOMS.get(roomCode)
    const me = (room) => room?.players.get(socket.id)

    socket.on('room:create', ({ game, name, avatar } = {}, cb) => {
      if (!['traitor-among-us', 'caption-battle'].includes(game)) return cb?.({ error: 'That game has no online mode yet.' })
      if (ROOMS.size >= MAX_ROOMS) return cb?.({ error: 'Too many rooms right now. Try again later.' })
      let code = code6()
      while (ROOMS.has(code)) code = code6()
      const room = { code, game, hostId: socket.id, phase: 'lobby', players: new Map(), state: null, createdAt: Date.now() }
      room.players.set(socket.id, { id: socket.id, socketId: socket.id, name: String(name || 'Player').slice(0, 20), avatar: String(avatar || 'nova').slice(0, 12), ready: false, score: 0 })
      ROOMS.set(code, room)
      roomCode = code
      socket.join(code)
      cb?.({ room: publicRoom(room) })
      sendRoom(io, room)
    })

    socket.on('room:join', ({ code, name, avatar } = {}, cb) => {
      const room = ROOMS.get(String(code || '').toUpperCase())
      if (!room) return cb?.({ error: 'No room with that code.' })
      if (room.phase !== 'lobby') return cb?.({ error: 'That game already started.' })
      if (room.players.size >= 8) return cb?.({ error: 'Room is full (8 players max).' })
      roomCode = room.code
      room.players.set(socket.id, { id: socket.id, socketId: socket.id, name: String(name || 'Player').slice(0, 20), avatar: String(avatar || 'nova').slice(0, 12), ready: false, score: 0 })
      socket.join(room.code)
      cb?.({ room: publicRoom(room) })
      sysChat(io, room, `${String(name || 'Player').slice(0, 20)} joined.`)
      sendRoom(io, room)
    })

    socket.on('room:ready', ({ ready } = {}) => {
      const room = myRoom(); const p = me(room)
      if (!room || !p || room.phase !== 'lobby') return
      p.ready = !!ready
      sendRoom(io, room)
    })

    socket.on('room:rematch', () => {
      const room = myRoom()
      if (!room || room.hostId !== socket.id || room.phase !== 'results') return
      clearTimeout(room.state?.timer)
      room.state = null
      room.phase = 'lobby'
      for (const p of room.players.values()) { p.ready = false; p.score = 0; delete p.role }
      sysChat(io, room, 'Rematch! Back in the lobby — ready up.')
      sendRoom(io, room)
    })

    socket.on('room:start', () => {
      const room = myRoom()
      if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return
      const players = [...room.players.values()]
      if (room.game === 'traitor-among-us' && players.length < 3) return socket.emit('room:error', { error: 'Traitor needs at least 3 players. Invite friends or play solo vs AI.' })
      if (players.some((p) => !p.ready && p.id !== room.hostId)) return socket.emit('room:error', { error: 'Everyone must be ready first.' })
      room.phase = 'playing'
      sendRoom(io, room)
      if (room.game === 'traitor-among-us') traitorStart(io, room)
      else captionStart(io, room)
    })

    socket.on('room:chat', ({ text } = {}) => {
      const room = myRoom(); const p = me(room)
      if (!room || !p || typeof text !== 'string') return
      const clean = text.trim().slice(0, 200)
      if (clean) io.to(room.code).emit('room:chat', { from: p.name, text: clean, at: Date.now() })
    })

    socket.on('game:action', (a = {}) => {
      const room = myRoom(); const p = me(room)
      if (!room || !p || room.phase !== 'playing') return
      if (room.game === 'traitor-among-us') {
        if (a.type === 'callVote' && room.hostId === socket.id && room.state.phase === 'discussion') {
          room.state.phase = 'vote'
          sysChat(io, room, 'Vote: who is the traitor?')
          io.to(room.code).emit('game:state', traitorPublic(room))
          return
        }
        traitorAction(io, room, p, a)
      } else if (room.game === 'caption-battle' && a.type === 'caption' && typeof a.text === 'string') {
        if (room.state.submissions[p.id]) return
        room.state.submissions[p.id] = a.text.trim().slice(0, 200)
        io.to(room.code).emit('game:state', { game: 'caption-battle', round: room.state.round, maxRounds: room.state.maxRounds, prompt: room.state.prompt, submitted: Object.keys(room.state.submissions), seconds: 60 })
        if (Object.keys(room.state.submissions).length >= room.players.size) captionJudge(io, room)
      }
    })

    socket.on('room:leave', () => leave())
    socket.on('disconnect', () => leave())

    function leave() {
      const room = myRoom()
      roomCode = null
      if (!room) return
      const p = room.players.get(socket.id)
      room.players.delete(socket.id)
      socket.leave(room.code)
      if (room.players.size === 0) {
        clearTimeout(room.state?.timer)
        ROOMS.delete(room.code)
        return
      }
      if (room.hostId === socket.id) room.hostId = [...room.players.keys()][0]
      if (p) sysChat(io, room, `${p.name} left.`)
      // A mid-game departure can stall phases; resolve gracefully.
      if (room.phase === 'playing' && room.game === 'traitor-among-us' && room.state) {
        if (p?.role === 'traitor') traitorEnd(io, room, 'crew', 'The traitor fled. Crew wins!')
        else if (room.state.phase === 'tasks' && Object.keys(room.state.acted).length >= room.players.size) traitorToDiscussion(io, room)
        else if (room.state.phase === 'vote' && Object.keys(room.state.votes).length >= room.players.size) traitorResolveVote(io, room)
        else io.to(room.code).emit('game:state', traitorPublic(room))
      }
      if (room.phase === 'playing' && room.game === 'caption-battle' && room.state && Object.keys(room.state.submissions).length >= room.players.size) captionJudge(io, room)
      sendRoom(io, room)
    }
  })

  // Prune stale rooms every 10 minutes.
  const prune = setInterval(() => {
    for (const [code, room] of ROOMS) {
      if (Date.now() - room.createdAt > 2 * 3600000) {
        clearTimeout(room.state?.timer)
        io.to(code).emit('room:error', { error: 'Room expired.' })
        ROOMS.delete(code)
      }
    }
  }, 600000)
  prune.unref()
  return io
}