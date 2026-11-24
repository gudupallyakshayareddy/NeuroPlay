// Authored fallback content so every AI feature works without Gemini.

// ---------- AI Story Adventure ----------
const STORY_ARCS = {
  'Cyberpunk heist': [
    { text: 'Rain hisses on neon. You crouch on a ledge above the Kessler Tower vault floor. Your handler crackles in your ear: "Cameras loop for ninety seconds. The window is now." Below, a laser grid breathes red across the corridor.', choices: ['Drop into the corridor', 'Hack the camera hub first', 'Call your handler for another way in'] },
    { text: 'You move. The building answers — a maintenance drone swivels toward your heat signature, and somewhere below a guard laughs at something you cannot hear. The vault door glows at the end of the hall, a black slab with a biometric seal.', choices: ['Freeze and let the drone pass', 'Throw a decoy emitter', 'Sprint for the vault'] },
    { text: 'The vault antechamber smells of ozone. A dead man\u2019s handprint is required — but the vault keeper, Ms. Ito, is very much alive and standing right behind you, holding a stun baton and looking more disappointed than angry.', choices: ['Talk your way out', 'Offer her a cut', 'Run for the service shaft'] },
    { text: 'Ito lowers the baton a fraction. "Everyone who comes here wants the ledger," she says. "Nobody asks what it costs." The alarm clock in your HUD reads forty seconds. Whatever you came for, it is decision time.', choices: ['Grab the ledger and go', 'Ask what the ledger costs', 'Leave empty-handed but alive'] },
    { text: 'Sirens bloom across the city grid. You are out on the wire, the night wind tearing at your jacket, and the question is no longer what you took — it is who you became on the way out. The city lights blur below like a circuit board dreaming.', choices: ['Vanish into the undercity', 'Turn yourself in', 'Broadcast the ledger to everyone'] },
  ],
  'Haunted library': [
    { text: 'The library breathes. Shelves lean like old men, and every book you pass whispers its own title. The restricted wing is chained shut, but the chain is warm, as if recently held. A candle burns at the librarian\u2019s empty desk.', choices: ['Read the nearest whispering book', 'Follow the candle smoke', 'Break the chain'] },
    { text: 'The smoke leads you to a reading room where a chair rocks by itself. On the table: a catalog card with your name on it, dated forty years before you were born. The rocking stops. Something is waiting for you to understand.', choices: ['Take the card', 'Ask the room what it wants', 'Burn the card in the candle'] },
    { text: 'The restricted wing opens without a sound — it was never locked against you, only against forgetting. Inside, the books are blank. A voice like turning pages says: "One story is missing. Yours. Will you write it, or will you shelf it?"', choices: ['Write your story', 'Refuse and leave', 'Ask what happens to the unwritten'] },
    { text: 'Ink moves across the blank pages on its own, spelling out memories you had buried. The library is not haunted by the dead — it is haunted by everything visitors chose not to remember. Your chapter is almost full.', choices: ['Finish the chapter honestly', 'Tear out the painful page', 'Close the book gently'] },
    { text: 'Dawn leaks through the high windows. The chain lies quiet on the floor, and the candle has burned to nothing. You walk out carrying either a story or a silence — the library keeps whichever one you did not choose.', choices: ['Return the book someday', 'Never come back', 'Become the new librarian'] },
  ],
  'Desert caravan': [
    { text: 'The caravan master is dead, the water skins are half empty, and the map ends at a dry riverbed. Twelve travelers look at you because you are the only one who can read the old script. The dunes hum in the wind like a struck bowl.', choices: ['Follow the dry river north', 'Climb the tallest dune to scout', 'Search the master\u2019s tent'] },
    { text: 'In the master\u2019s tent you find a sealed letter and a brass key. The letter names a well "that drinks travelers" and begs the reader to turn back. Outside, an argument breaks out over the last water skin.', choices: ['Open the letter to everyone', 'Keep the letter secret', 'Trade the key for water'] },
    { text: 'A sandstorm rises like a wall of amber glass. In its heart you glimpse towers — the lost city of Zerath, exactly where the old script promised. But the storm is moving, and the caravan is not.', choices: ['Lead everyone into the storm', 'Wait it out and lose the city', 'Go alone'] },
    { text: 'Zerath is real: cool stone, cisterns singing with water, and a gatekeeper made of carved salt who asks one question — "What do you carry that you would not trade?" The caravan waits behind you, thirsty and afraid.', choices: ['Answer truthfully', 'Offer the brass key', 'Try to slip past'] },
    { text: 'The cisterns open. Water runs through channels carved a thousand years ago, and the caravan drinks under a sky going violet with dusk. The salt gatekeeper crumbles a little more each year; soon someone will have to take its place, or the city will close again.', choices: ['Stay as gatekeeper', 'Lead the caravan onward', 'Teach the city to open itself'] },
  ],
}
export function fallbackStory(theme, turn) {
  const arc = STORY_ARCS[theme] || STORY_ARCS['Haunted library']
  const i = Math.min(turn, arc.length - 1)
  return { ...arc[i], ending: turn >= arc.length - 1 }
}

// ---------- AI Fusion ----------
export const FUSION_TABLE = {
  'water+fire': { result: 'Steam', emoji: '💨', description: 'Water meets fire and escapes as vapor.' },
  'earth+water': { result: 'Mud', emoji: '🟤', description: 'Soil drinks the water and softens.' },
  'air+fire': { result: 'Smoke', emoji: '🌫️', description: 'Fire breathes into the wind.' },
  'air+water': { result: 'Cloud', emoji: '☁️', description: 'Vapor rides the sky.' },
  'earth+fire': { result: 'Lava', emoji: '🌋', description: 'Stone forgets its patience.' },
  'earth+air': { result: 'Dust', emoji: '🏜️', description: 'The wind erodes the patient earth.' },
  'cloud+water': { result: 'Rain', emoji: '🌧️', description: 'The sky returns what it borrowed.' },
  'rain+earth': { result: 'Plant', emoji: '🌱', description: 'Green answers the rain.' },
  'plant+fire': { result: 'Coal', emoji: '⚫', description: 'Ancient forests compressed to carbon.' },
  'plant+water': { result: 'Algae', emoji: '🦠', description: 'Life blooms in the shallows.' },
  'coal+fire': { result: 'Energy', emoji: '⚡', description: 'Stored sunlight, released.' },
  'energy+water': { result: 'Lightning', emoji: '🌩️', description: 'Charge leaps through the storm.' },
  'lava+water': { result: 'Obsidian', emoji: '🖤', description: 'Molten rock quenched to glass.' },
  'obsidian+fire': { result: 'Blade', emoji: '🗡️', description: 'Volcanic glass honed to an edge.' },
  'mud+fire': { result: 'Brick', emoji: '🧱', description: 'Earth fired hard enough to build with.' },
  'brick+brick': { result: 'House', emoji: '🏠', description: 'Walls learn to shelter.' },
  'house+house': { result: 'Village', emoji: '🏘️', description: 'Neighbors gather.' },
  'village+village': { result: 'City', emoji: '🏙️', description: 'A skyline of shared ambition.' },
  'stone+air': { result: 'Sand', emoji: '⏳', description: 'Time, made visible.' },
  'earth+earth': { result: 'Stone', emoji: '🪨', description: 'Pressure makes the earth stubborn.' },
  'fire+fire': { result: 'Inferno', emoji: '🔥', description: 'Fire feeds on itself.' },
  'water+water': { result: 'Lake', emoji: '🏞️', description: 'Water finds its level.' },
  'air+air': { result: 'Storm', emoji: '🌪️', description: 'Wind arguing with wind.' },
  'lake+plant': { result: 'Swamp', emoji: '🐸', description: 'Where water and green negotiate.' },
  'swamp+fire': { result: 'Will-o-wisp', emoji: '👻', description: 'Marsh gas dancing in the dark.' },
  'stone+blade': { result: 'Sword', emoji: '⚔️', description: 'A sharper argument.' },
  'sword+energy': { result: 'Plasma Blade', emoji: '🔆', description: 'An edge of contained lightning.' },
  'cloud+energy': { result: 'Storm Caller', emoji: '⛈️', description: 'Someone the sky listens to.' },
  'plant+energy': { result: 'Treant', emoji: '🌳', description: 'A forest that walks.' },
  'lava+air': { result: 'Dragon', emoji: '🐉', description: 'Fire given wings and appetite.' },
  'inferno+air': { result: 'Phoenix', emoji: '🐦‍🔥', description: 'A bird that refuses endings.' },
  'stone+energy': { result: 'Golem', emoji: '🗿', description: 'The earth stands up.' },
  'lake+storm': { result: 'Kraken', emoji: '🐙', description: 'The deep learns to reach.' },
  'city+energy': { result: 'Robot', emoji: '🤖', description: 'A city\u2019s cleverness in one body.' },
  'inferno+stone': { result: 'Star', emoji: '⭐', description: 'Stone squeezed until it shines.' },
  'sand+fire': { result: 'Glass', emoji: '🔮', description: 'Sand melted clear.' },
  'glass+glass': { result: 'Lens', emoji: '🔍', description: 'Light, persuaded.' },
  'lens+star': { result: 'Telescope', emoji: '🔭', description: 'A way to eavesdrop on the universe.' },
  'glass+energy': { result: 'Fiber Optic', emoji: '💡', description: 'Light carrying messages.' },
  'robot+robot': { result: 'AI', emoji: '🧠', description: 'Machines teaching machines.' },
  'ai+cloud': { result: 'The Cloud Mind', emoji: '🌐', description: 'Thought, distributed.' },
  'smoke+cloud': { result: 'Smog', emoji: '🏭', description: 'The sky, unimpressed.' },
  'dust+water': { result: 'Clay', emoji: '🏺', description: 'Earth that remembers shapes.' },
  'clay+fire': { result: 'Pottery', emoji: '🫖', description: 'The first technology.' },
  'pottery+plant': { result: 'Tea', emoji: '🍵', description: 'Civilization in a cup.' },
}
export const LEGENDARY = ['Dragon', 'Phoenix', 'Golem', 'Kraken', 'Robot', 'Star']
export function fallbackFusion(a, b) {
  const key = [a, b].map((s) => s.trim().toLowerCase()).sort().join('+')
  const direct = FUSION_TABLE[key] || FUSION_TABLE[[a, b].map((s) => s.trim().toLowerCase()).join('+')]
  if (direct) return direct
  // Deterministic template for unknown pairs: same inputs, same result.
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const A = cap(a.trim()), B = cap(b.trim())
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const templates = [
    { result: `${B}-touched ${A}`, emoji: '✨', description: `${A} changed by its encounter with ${B}.` },
    { result: `${A} ${B} Hybrid`, emoji: '🧬', description: `Neither ${A} nor ${B}, but something between.` },
    { result: `Essence of ${A}`, emoji: '🫧', description: `${B} distilled the spirit out of ${A}.` },
    { result: `${A}storm`, emoji: '🌀', description: `${A} and ${B} in violent agreement.` },
    { result: `Crystallized ${B}`, emoji: '💎', description: `${A} pressed ${B} into permanence.` },
  ]
  return templates[h % templates.length]
}

// ---------- Caption judge (heuristic fallback) ----------
export function fallbackCaptionJudge(prompt, caption) {
  const c = caption.trim()
  const words = c.split(/\s+/).filter(Boolean)
  let score = 30
  const notes = []
  if (c.length >= 30 && c.length <= 110) { score += 15; notes.push('good length') }
  else notes.push(c.length < 30 ? 'a bit short' : 'a bit long')
  const unique = new Set(words.map((w) => w.toLowerCase())).size
  if (words.length >= 5 && unique / words.length > 0.8) { score += 10; notes.push('varied wording') }
  if (/\b(but|except|meanwhile|plot twist|actually|somehow)\b/i.test(c)) { score += 12; notes.push('a comic turn') }
  if (/[!?]/.test(c) && !/[A-Z]{5,}/.test(c)) { score += 5 }
  if (/[A-Z]{5,}/.test(c)) { score -= 10; notes.push('shouting loses points') }
  if (/\b(interview|taxes|wifi|deadline|HR|Monday)\b/i.test(c)) { score += 8; notes.push('relatable detail') }
  score = Math.max(20, Math.min(85, score))
  return { score, verdict: `Offline judge: ${notes.join(', ')}. Connect Gemini for full judging.` }
}

// ---------- Human vs AI ----------
export const HVA_BANK = [
  { text: 'ok so my roommate swears the fridge hums louder when hes anxious and honestly?? after last tuesday i believe him. we dont talk about last tuesday', wasAI: false, explanation: 'Lowercase, missing apostrophes, fragmented rhythm and an in-joke ("last tuesday") are strongly human informal patterns.' },
  { text: 'The hum of a refrigerator is a fascinating phenomenon. It typically results from the compressor cycling on and off, and while ambient stress may heighten our perception of sound, there is no established mechanism linking appliance noise to human anxiety.', wasAI: true, explanation: 'Balanced clauses, hedged claims ("typically", "no established mechanism") and a tidy explanatory arc are classic AI register.' },
  { text: 'I kept a journal for exactly nine days in 2019. Day one: three pages. Day nine: "tired." My therapist said that was still data.', wasAI: false, explanation: 'Specific autobiographical detail, self-deprecating timing, and an abrupt quoted fragment read as lived experience.' },
  { text: 'Journaling can be a powerful tool for self-reflection. Even brief entries offer valuable insights into your emotional patterns, and consistency matters less than honesty. Many people find that short, regular check-ins reduce stress over time.', wasAI: true, explanation: 'Encouraging generic advice, parallel structure and no concrete personal detail — typical assistant prose.' },
  { text: 'The pigeon outside my window has one foot and a lot of opinions. I named him Greg. Greg does not care about my deadlines and frankly that is the energy I need.', wasAI: false, explanation: 'Idiosyncratic naming, comic escalation and internet-idiom ("that is the energy I need") are human signatures.' },
  { text: 'Urban pigeons are remarkably adaptable birds. Their ability to thrive in city environments demonstrates impressive resilience, and observing them can provide a calming counterpoint to the pressures of modern work life.', wasAI: true, explanation: 'Encyclopedia-adjacent framing plus a neat moral at the end; AI text often lands on a tidy takeaway.' },
  { text: 'my grandma labels leftovers with the date and a threat. "eat by friday or else." or else WHAT, grandma. the ambiguity is the seasoning', wasAI: false, explanation: 'Family specificity, rhetorical outburst in caps, and a coined metaphor ("the ambiguity is the seasoning").' },
  { text: 'Food safety in shared households benefits from clear labeling. Writing dates on leftovers helps reduce waste and confusion, and a playful note can encourage family members to follow the system.', wasAI: true, explanation: 'The anecdote is flattened into a general recommendation with neutral tone — a hallmark of AI rewriting.' },
  { text: 'Learned to whistle properly at 34. Nobody told me you basically just adjust the shape of your mouth?? I spent three decades thinking some people were born with it. I am owed an apology.', wasAI: false, explanation: 'Late-blooming personal discovery, double question marks, mock-indignation — very human voice.' },
  { text: 'Whistling is a skill that can be learned at any age. It involves controlling airflow and lip shape, and with a little practice most people can produce a clear tone. It is never too late to pick up small, joyful skills.', wasAI: true, explanation: 'Instructional structure, universal claims and an uplifting closing sentence are typical of generated text.' },
  { text: 'There is a specific grief in finishing a book you loved. Like the place still exists but your visa expired. I just sit there holding it like an idiot.', wasAI: false, explanation: 'Unusual personal metaphor ("visa expired"), raw self-description, no resolution offered.' },
  { text: 'Finishing a beloved book can evoke a bittersweet sense of loss. Readers often describe feeling as though they have left a world behind, which reflects how deeply narrative can engage our emotions and imagination.', wasAI: true, explanation: 'Emotion described from outside ("readers often describe"), explanatory closure, even cadence.' },
]

// ---------- Riddles ----------
export const RIDDLE_BANK = [
  { riddle: 'I have cities but no houses, forests but no trees, and water but no fish. What am I?', answer: 'map', hint: 'You can fold me.' },
  { riddle: 'The more you take, the more you leave behind. What am I?', answer: 'footsteps', hint: 'Look down at the sand.' },
  { riddle: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?', answer: 'echo', hint: 'Shout into a canyon.' },
  { riddle: 'I am always in front of you but can never be seen. What am I?', answer: 'future', hint: 'It has not happened yet.' },
  { riddle: 'What has keys but opens no locks, space but no room, and you can enter but not go inside?', answer: 'keyboard', hint: 'You are probably touching one.' },
  { riddle: 'I have a head and a tail but no body. What am I?', answer: 'coin', hint: 'Flip me to decide.' },
  { riddle: 'What gets wetter the more it dries?', answer: 'towel', hint: 'You use it after a shower.' },
  { riddle: 'I am full of holes but still hold water. What am I?', answer: 'sponge', hint: 'It lives by the kitchen sink.' },
  { riddle: 'What can travel around the world while staying in a corner?', answer: 'stamp', hint: 'It rides on an envelope.' },
  { riddle: 'What has many teeth but cannot bite?', answer: 'comb', hint: 'It fixes your hair.' },
  { riddle: 'What building has the most stories?', answer: 'library', hint: 'Its stories are on shelves.' },
  { riddle: 'I am tall when I am young and short when I am old. What am I?', answer: 'candle', hint: 'I melt as I work.' },
]

// ---------- NPC dialogue ----------
export function fallbackNpc(name, personality, message) {
  const m = message.toLowerCase()
  const p = (personality || '').toLowerCase()
  if (/\b(hello|hi|hey|greetings)\b/.test(m)) return `Well met, traveler. ${p.includes('gruff') ? 'Make it quick.' : 'What brings you to me?'}`
  if (/\b(quest|help|need|task)\b/.test(m)) return 'There is something you could do for me. Bring me what I lack, and I will tell you what I know.'
  if (/\b(secret|hidden|mystery|archive)\b/.test(m)) return 'Some doors open only for those the others trust. Earn their favor first.'
  if (/\b(name|who are you)\b/.test(m)) return `I am ${name}. ${personality || 'I keep to myself.'}`
  if (/\b(thank|thanks)\b/.test(m)) return 'Kindness is rare here. Keep it.'
  if (/\b(bye|goodbye|later)\b/.test(m)) return 'Walk carefully. The world watches.'
  return p.includes('cryptic')
    ? 'Hmm. The answer you want is shaped like the question you avoided. Ask me about the quest, or the secret.'
    : 'Interesting. Tell me more — or ask me about my quest. I could use a hand.'
}

// ---------- Interrogation ----------
export const SUSPECT_BANK = [
  {
    name: 'Marlow Finch', role: 'Night accountant', bio: 'Keeps the ledger. Claims he left at nine and walked home along the canal.',
    secret: 'stole the ledger', options: ['stole the ledger', 'was at the docks', 'forged the signature', 'is innocent'],
    facts: { left: 'nine', route: 'canal', ledger: 'locked it myself', docks: 'never go near the docks', signature: 'my hand is steady, check it' },
    lies: ['I locked the ledger and gave the key to the captain.'],
    truth: 'Finch took the ledger home along the canal; the "locked" ledger was empty.',
  },
  {
    name: 'Ida Voss', role: 'Dock foreman', bio: 'Runs the night shift. Says she never left the crane cab between ten and two.',
    secret: 'was at the docks', options: ['stole the ledger', 'was at the docks', 'forged the signature', 'is innocent'],
    facts: { crane: 'in the cab all night', docks: 'I was nowhere near pier nine', ledger: 'not my problem', signature: 'I sign with a cross, always have' },
    lies: ['The crane log? It malfunctioned that night. Convenient, I know.'],
    truth: 'Voss left the crane cab to meet a smuggler at pier nine; the log gap proves it.',
  },
  {
    name: 'Petro Anselm', role: 'Clerk', bio: 'Copies documents. Nervous. Insists the shipping manifest signature is genuine.',
    secret: 'forged the signature', options: ['stole the ledger', 'was at the docks', 'forged the signature', 'is innocent'],
    facts: { signature: 'perfectly genuine, I checked twice', ink: 'standard issue ink', manifest: 'I only copy what I am given', hand: 'my handwriting is average' },
    lies: ['Anyone could have copied that signature. It is a simple hand.'],
    truth: 'Anselm forged the manifest signature — the ink matches his personal pen, not office issue.',
  },
  {
    name: 'Sera Quill', role: 'Archivist', bio: 'Catalogues everything. Says the vault was sealed when she arrived at dawn.',
    secret: 'is innocent', options: ['stole the ledger', 'was at the docks', 'forged the signature', 'is innocent'],
    facts: { vault: 'sealed at dawn, I logged it', ledger: 'I catalogue, I do not borrow', docks: 'salt air ruins paper, I avoid it', signature: 'compare my catalogues, same hand for years' },
    lies: [],
    truth: 'Quill is innocent — her catalogue timestamps place her in the archive all night.',
  },
  {
    name: 'Bram Okonkwo', role: 'Lamplighter', bio: 'Lights the harbor lamps at dusk. Claims he saw nothing unusual on his round.',
    secret: 'was at the docks', options: ['stole the ledger', 'was at the docks', 'forged the signature', 'is innocent'],
    facts: { round: 'lamps lit by seven, usual round', docks: 'pier nine lamp was already lit, not by me', ledger: 'what ledger?', signature: 'I barely write' },
    lies: ['The pier nine lamp? Must have been the wind. Lamps do not light themselves, but still.'],
    truth: 'Okonkwo skipped his round to gamble at the docks; someone else lit the pier nine lamp.',
  },
  {
    name: 'Lena Marsh', role: 'Captain\u2019s aide', bio: 'Manages the captain\u2019s keys. Admits she lent her key ring out "for a minute".',
    secret: 'stole the ledger', options: ['stole the ledger', 'was at the docks', 'forged the signature', 'is innocent'],
    facts: { keys: 'I lent the ring for a minute, that is all', ledger: 'the captain keeps it, not me', minute: 'a minute, maybe two', docks: 'I get seasick, ironically' },
    lies: ['Whoever borrowed the ring returned it before the vault was opened. Probably.'],
    truth: 'Marsh used her own key ring during the "lent minute" to take the ledger herself.',
  },
]
export function suspectAnswer(suspect, question) {
  const q = question.toLowerCase()
  for (const [key, val] of Object.entries(suspect.facts)) {
    if (q.includes(key)) return `${val.charAt(0).toUpperCase() + val.slice(1)}. That is my story.`
  }
  if (/\b(ledger|steal|stole|theft|take)\b/.test(q) && suspect.secret === 'stole the ledger') return suspect.lies[0]
  if (/\b(dock|pier|crane|ship)\b/.test(q) && suspect.secret === 'was at the docks') return suspect.lies[0]
  if (/\b(forge|signature|ink|manifest|hand)\b/.test(q) && suspect.secret === 'forged the signature') return suspect.lies[0]
  if (/\b(where|when|alibi|night|time)\b/.test(q)) return Object.values(suspect.facts)[0] + '. Ask me something specific.'
  if (/\b(innocent|guilty|truth|lie)\b/.test(q)) return suspect.secret === 'is innocent' ? 'I have nothing to hide. Check the records.' : 'I am telling you everything I know.'
  return 'I do not see what that has to do with anything. Ask about the ledger, the docks, or the signature.'
}