// Pure game logic for TraitorAmongUs — no React, no Math.random.
// Every function takes state and returns a NEW state (seeded RNG lives in state.rngState),
// so the whole module is deterministic and unit-testable. Online multiplayer can reuse it as-is.

export const clampN = (n, a, b) => Math.max(a, Math.min(b, n))

// --- seeded RNG (mulberry32 step, stored on state) ---
function draw(s) {
  let t = (s.rngState = (s.rngState + 0x6d2b79f5) | 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rint = (s, a, b) => a + Math.floor(draw(s) * (b - a + 1))
const pickFrom = (s, arr) => arr[Math.floor(draw(s) * arr.length)]

const clone = (s) => ({
  ...s,
  players: s.players.map((p) => ({ ...p })),
  events: [...s.events],
  log: [...s.log],
  votes: { ...s.votes },
  taskCards: s.taskCards.map((c) => ({ ...c })),
  roundInfo: s.roundInfo ? { ...s.roundInfo, botResults: [...s.roundInfo.botResults] } : null,
})

// --- authored content banks ---
const NAMES = ['Nova', 'Rex', 'Ivy', 'Orion', 'Zara', 'Milo', 'Luna', 'Pip']
const COLORS = ['#22D3EE', '#F472B6', '#4ADE80', '#FBBF24', '#FB7185', '#A78BFA', '#34D399', '#F97316']
const PERSONALITIES = ['paranoid', 'calm', 'joker', 'leader', 'quiet']

const TASK_NAMES = [
  'Fix the wiring', 'Enter the access code', 'Calibrate the engine',
  'Upload the nav data', 'Refuel the reactor', 'Scan the medbay',
  'Reset the shields', 'Chart the asteroid field',
]

const SABOTAGE_NAMES = ['cut the lights', 'vent the oxygen', 'jam the comms', 'overload the reactor']

// Bot discussion templates, keyed by personality. {t} = accusation target, {n} = near-sabotage names, {s} = skipper.
const LINES = {
  paranoid: [
    'I knew it. {t} has been shifty since round one. Watch them.',
    'The sabotage happened right next to {n}. Coincidence? I think NOT.',
    '{s} skipped a task. Skippers are traitors. That is just math.',
    'Nobody move. I am logging everyone who breathes weird.',
  ],
  calm: [
    'Let us stay factual. {s} has no task record this round.',
    'The report places {n} near the sabotage. We should weigh that.',
    'I completed my task. I suggest we vote on evidence, not vibes.',
    'Panic helps the traitor. Slow down and compare alibis.',
  ],
  joker: [
    'lol {t} is acting like a raccoon in a trench coat. Just saying.',
    'So the lights go out and {n} just HAPPEN to be there? Comedy gold.',
    '{s} ghosted their task. Relatable, but also sus.',
    'I for one welcome our new saboteur overlords. Kidding. Vote {t}.',
  ],
  leader: [
    'Focus. {s} skipped a task — that is a concrete lead.',
    'Witnesses place {n} at the sabotage scene. Explain yourselves.',
    'I am calling it: {t} is our best suspect right now.',
    'Stick to the plan. Tasks first, accusations with proof.',
  ],
  quiet: [
    '...saw {t} lingering by the vents. Do with that what you will.',
    '{n} were both near it. One of them is lying.',
    'I did my task. {s} did not. That is all I know.',
    'hm. Something about {t} does not add up.',
  ],
}

const ACKS = {
  paranoid: ['Finally someone said it. I KNEW it.', 'Agreed. I never trusted them anyway.'],
  calm: ['Noted. That is worth considering.', 'A fair point. Let us verify it.'],
  joker: ['lmao bold take. I respect it.', 'spicy! Adding that to the conspiracy board.'],
  leader: ['Good input. Keeping it on the record.', 'Alright, that changes my read a little.'],
  quiet: ['...maybe.', 'hm. Could be.'],
}

const TASK_CARDS_PER_ROUND = 3
export const MAX_ROUNDS = 3
export const MISSION_GOAL = 100

function makeTasks(s) {
  const names = [...TASK_NAMES]
  const cards = []
  for (let i = 0; i < TASK_CARDS_PER_ROUND; i++) {
    const ni = Math.floor(draw(s) * names.length)
    const name = names.splice(ni, 1)[0]
    const kind = draw(s) < 0.5 ? 'wires' : 'code'
    cards.push({
      id: i,
      name,
      kind,
      seq: kind === 'wires' ? [rint(s, 0, 3), rint(s, 0, 3), rint(s, 0, 3), rint(s, 0, 3)] : null,
      code: kind === 'code' ? String(rint(s, 1000, 9999)) : null,
      reward: 14 - s.level * 2,
    })
  }
  return cards
}

export function createGame(seed, level = 1) {
  const s = {
    rngState: (seed >>> 0) || 1,
    level,
    round: 1,
    phase: 'task', // task | discussion | vote | end
    mission: 15,
    tasksDone: 0,
    sabotages: 0,
    correctVotes: 0,
    events: [],
    log: [],
    votes: {},
    ejected: null,
    result: null,
    roundInfo: null,
    taskCards: [],
    players: [],
    traitorId: 0,
  }
  const nameIdx = NAMES.map((_, i) => i)
  // seeded shuffle of name indices
  for (let i = nameIdx.length - 1; i > 0; i--) {
    const j = Math.floor(draw(s) * (i + 1));
    [nameIdx[i], nameIdx[j]] = [nameIdx[j], nameIdx[i]]
  }
  s.players.push({ id: 0, name: 'You', color: '#7C5CFF', personality: 'player', isBot: false, alive: true, suspicion: 0, isTraitor: false })
  for (let b = 1; b <= 4; b++) {
    const ni = nameIdx[b - 1]
    s.players.push({ id: b, name: NAMES[ni], color: COLORS[ni], personality: PERSONALITIES[(ni + b) % PERSONALITIES.length], isBot: true, alive: true, suspicion: 0, isTraitor: false })
  }
  s.traitorId = rint(s, 0, 4)
  s.players[s.traitorId].isTraitor = true
  s.taskCards = makeTasks(s)
  return s
}

const bump = (s, id, amt) => { s.players[id].suspicion = clampN(s.players[id].suspicion + amt, 0, 100) }
const aliveBots = (s) => s.players.filter((p) => p.isBot && p.alive)
const aliveOthers = (s, id) => s.players.filter((p) => p.alive && p.id !== id)

function checkMission(s) {
  if (s.mission >= MISSION_GOAL) {
    s.mission = MISSION_GOAL
    s.result = { crewWin: true, reason: 'mission' }
    s.phase = 'end'
  } else if (s.mission <= 0) {
    s.mission = 0
    s.result = { crewWin: false, reason: 'mission-failed' }
    s.phase = 'end'
  }
}

// Simulate the 4 bots' task phase: tasks, skips, and a possible bot-traitor sabotage.
function resolveBots(s) {
  const info = { botResults: [], sabotage: null }
  const skipChance = 0.15 + s.level * 0.05
  for (const bot of aliveBots(s)) {
    if (bot.isTraitor && draw(s) < 0.4 + s.level * 0.1) {
      const near = [bot.id]
      const others = aliveOthers(s, bot.id)
      if (others.length) near.push(pickFrom(s, others).id)
      const what = pickFrom(s, SABOTAGE_NAMES)
      s.mission = clampN(s.mission - (18 + s.level * 2), 0, MISSION_GOAL)
      s.events.push({ round: s.round, type: 'sabotage', playerId: bot.id, near, what })
      near.forEach((id) => bump(s, id, 10))
      info.sabotage = { byId: bot.id, near, what }
      info.botResults.push({ playerId: bot.id, action: 'sabotage' })
    } else if (draw(s) < skipChance) {
      s.events.push({ round: s.round, type: 'skip', playerId: bot.id })
      bump(s, bot.id, 12)
      info.botResults.push({ playerId: bot.id, action: 'skip' })
    } else {
      const gain = rint(s, 8, 12)
      s.mission = clampN(s.mission + gain, 0, MISSION_GOAL)
      s.events.push({ round: s.round, type: 'task', playerId: bot.id, gain })
      info.botResults.push({ playerId: bot.id, action: 'task', gain })
    }
  }
  s.roundInfo = info
  checkMission(s)
}

/** You complete task card taskIdx. Bots act too. Returns new state. */
export function doTask(state, taskIdx) {
  const s = clone(state)
  const card = s.taskCards[taskIdx] || s.taskCards[0]
  s.tasksDone += 1
  s.mission = clampN(s.mission + card.reward, 0, MISSION_GOAL)
  s.events.push({ round: s.round, type: 'task', playerId: 0, name: card.name })
  resolveBots(s)
  return s
}

/** You (the traitor) sabotage instead of doing a task. */
export function sabotage(state) {
  const s = clone(state)
  s.sabotages += 1
  const others = aliveOthers(s, 0)
  const near = [0]
  if (others.length) near.push(pickFrom(s, others).id)
  const what = pickFrom(s, SABOTAGE_NAMES)
  s.mission = clampN(s.mission - (18 + s.level * 2), 0, MISSION_GOAL)
  s.events.push({ round: s.round, type: 'sabotage', playerId: 0, near, what })
  near.forEach((id) => bump(s, id, 10))
  s.roundInfo = { botResults: [], sabotage: { byId: 0, near, what } }
  resolveBots(s)
  if (s.roundInfo) s.roundInfo.sabotage = s.roundInfo.sabotage || { byId: 0, near, what }
  return s
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '???')
}

/** Bots post 4-6 messages derived from REAL round events. Returns { state, messages }. */
export function botMessages(state) {
  const s = clone(state)
  const messages = []
  const ev = s.events.filter((e) => e.round === s.round)
  const sab = ev.find((e) => e.type === 'sabotage')
  const skips = ev.filter((e) => e.type === 'skip')
  const nameOf = (id) => s.players[id].name
  for (const bot of aliveBots(s)) {
    const pool = LINES[bot.personality] || LINES.calm
    let line
    if (bot.isTraitor) {
      // Deflect: accuse the most-suspected innocent, or claim an alibi.
      const marks = aliveOthers(s, bot.id).filter((p) => !p.isTraitor)
      const target = marks.sort((a, b) => b.suspicion - a.suspicion)[0]
      if (target && draw(s) < 0.7) {
        line = pickFrom(s, [
          `Why is nobody talking about ${target.name}? Suspiciously quiet.`,
          `I was doing tasks the whole time. ${target.name}, however, vanished.`,
          `Vote ${target.name}. Trust me, I have a good feeling about this.`,
        ])
        bump(s, target.id, 6)
      } else {
        line = 'I did my task like a good little crewmate. Moving on.'
      }
    } else if (sab && draw(s) < 0.6) {
      line = fill(pool[1], { n: sab.near.map(nameOf).join(' and ') })
      const t = sab.near.find((id) => id !== bot.id)
      if (t !== undefined) bump(s, t, 4)
    } else if (skips.length && draw(s) < 0.7) {
      const sk = pickFrom(s, skips)
      line = fill(pool[2], { s: nameOf(sk.playerId) })
      bump(s, sk.playerId, 4)
    } else {
      const top = aliveOthers(s, bot.id).sort((a, b) => b.suspicion - a.suspicion)[0]
      line = fill(pool[0], { t: top ? top.name : 'someone' })
      if (top && draw(s) < 0.5) bump(s, top.id, 4)
    }
    messages.push({ playerId: bot.id, text: line })
  }
  // One extra hot take from a random chatty bot.
  const chatty = aliveBots(s).filter((b) => !b.isTraitor)
  if (chatty.length && draw(s) < 0.8) {
    const b = pickFrom(s, chatty)
    const top = aliveOthers(s, b.id).sort((a, b2) => b2.suspicion - a.suspicion)[0]
    messages.push({ playerId: b.id, text: fill((LINES[b.personality] || LINES.calm)[3], { t: top ? top.name : 'someone', s: top ? top.name : 'someone', n: 'the crew' }) })
  }
  s.log.push(...messages.map((m) => ({ ...m, round: s.round })))
  return { state: s, messages }
}

/** You accuse a player: raises everyone's suspicion of them. Returns { state, messages }. */
export function accuse(state, targetId) {
  const s = clone(state)
  bump(s, targetId, 15)
  s.events.push({ round: s.round, type: 'accuse', playerId: 0, targetId })
  s.log.push({ playerId: 0, text: `I accuse ${s.players[targetId].name}!`, round: s.round })
  const reactors = aliveBots(s).filter(() => draw(s) < 0.6).slice(0, 2)
  const messages = reactors.map((b) => ({
    playerId: b.id,
    text: b.isTraitor && targetId !== b.id
      ? pickFrom(s, [`Yes! ${s.players[targetId].name} has been sus all game.`, 'Finally, someone with eyes. Agreed.'])
      : pickFrom(s, ACKS[b.personality] || ACKS.calm),
  }))
  s.log.push(...messages.map((m) => ({ ...m, round: s.round })))
  return { state: s, messages }
}

/** You post a free-text message; bots acknowledge with templated reactions. */
export function playerMessage(state, text) {
  const s = clone(state)
  const clean = String(text).slice(0, 140)
  s.log.push({ playerId: 0, text: clean, round: s.round })
  const reactors = aliveBots(s).filter(() => draw(s) < 0.55).slice(0, 2)
  const messages = reactors.map((b) => ({ playerId: b.id, text: pickFrom(s, ACKS[b.personality] || ACKS.calm) }))
  s.log.push(...messages.map((m) => ({ ...m, round: s.round })))
  return { state: s, messages }
}

/** Everyone votes. yourVote = player id or null (abstain). Returns new state with ejection resolved. */
export function vote(state, yourVote) {
  const s = clone(state)
  s.votes = { 0: yourVote }
  if (yourVote === s.traitorId) s.correctVotes += 1
  for (const bot of aliveBots(s)) {
    let candidates = aliveOthers(s, bot.id)
    if (bot.isTraitor) candidates = candidates.filter((p) => !p.isTraitor)
    if (!candidates.length) { s.votes[bot.id] = null; continue }
    let best = null, bestScore = -1
    for (const c of candidates) {
      const score = c.suspicion + draw(s) * 8
      if (score > bestScore) { bestScore = score; best = c }
    }
    s.votes[bot.id] = best ? best.id : null
  }
  const tally = {}
  Object.values(s.votes).forEach((t) => { if (t !== null && t !== undefined) tally[t] = (tally[t] || 0) + 1 })
  let top = [], max = 0
  Object.entries(tally).forEach(([id, n]) => {
    if (n > max) { max = n; top = [Number(id)] } else if (n === max) top.push(Number(id))
  })
  const ejectedId = top.length ? pickFrom(s, top) : null
  s.ejected = ejectedId
  if (ejectedId !== null) {
    s.players[ejectedId].alive = false
    s.log.push({ playerId: -1, text: `${s.players[ejectedId].name} was ejected. They were ${s.players[ejectedId].isTraitor ? 'the TRAITOR' : 'innocent crew'}.`, round: s.round })
    if (ejectedId === s.traitorId) {
      s.result = { crewWin: true, reason: 'ejected' }
      s.phase = 'end'
    } else if (ejectedId === 0) {
      s.result = { crewWin: false, reason: 'you-ejected' }
      s.phase = 'end'
    }
  }
  if (!s.result && s.round >= MAX_ROUNDS) {
    s.result = { crewWin: false, reason: 'survived' }
    s.phase = 'end'
  }
  return s
}

/** Advance to the next round after an ejection reveal. */
export function nextRound(state) {
  const s = clone(state)
  s.round += 1
  s.phase = 'task'
  s.votes = {}
  s.ejected = null
  s.roundInfo = null
  s.taskCards = makeTasks(s)
  return s
}

/** Set phase (UI-driven transitions: task -> discussion -> vote). */
export function setPhase(state, phase) {
  return { ...clone(state), phase }
}

/** Score for the human player. */
export function scoreGame(state) {
  const youTraitor = state.traitorId === 0
  const won = state.result ? (youTraitor ? !state.result.crewWin : state.result.crewWin) : false
  const score = (won ? 400 : 0) + state.correctVotes * 50 + (youTraitor ? state.sabotages * 40 : state.tasksDone * 30)
  return { score, won, youTraitor }
}
