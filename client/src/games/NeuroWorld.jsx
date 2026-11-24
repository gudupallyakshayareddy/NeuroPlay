import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Anchor, BookOpen, CheckCircle2, Circle, Clock, Landmark, Leaf, Loader2,
  MapPin, MessageCircle, Package, ScrollText, Search, Send, Sparkles, Telescope, WifiOff,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'
import { api } from '../api.js'

// ---------------------------------------------------------------------------
// World data
// ---------------------------------------------------------------------------
const LOCATIONS = [
  { id: 'plaza', name: 'Plaza', icon: Landmark, items: ['Brass Compass', 'Faded Poster'] },
  { id: 'observatory', name: 'Observatory', icon: Telescope, items: ['Sealed Folio', 'Star Chart'] },
  { id: 'greenhouse', name: 'Greenhouse', icon: Leaf, items: ['Moonpetal Bloom', 'Silver Trowel'] },
  { id: 'docks', name: 'Docks', icon: Anchor, items: ['Cracked Lens', 'Salt-stained Map'] },
  { id: 'archive', name: 'Archive', icon: BookOpen, items: ['Ink of the First Star', 'Bone Key'] },
]
const LOC = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]))

const NPCS = [
  {
    id: 'astronomer', name: 'Vela', role: 'Astronomer', loc: 'observatory',
    personality: 'An anxious dreamer. Speaks in worried whispers about the sky, apologizes often, trails into wonder mid-sentence.',
    greeting: 'Oh! A visitor. Mind the cables — the telescope is nervous tonight. I mean, I am. The telescope is fine. Probably.',
    quest: { title: 'The Cracked Lens', text: 'Vela dropped her lens somewhere at the Docks. Search the Docks to find the Cracked Lens, then bring it back to her.' },
    tree: [
      { k: ['lens'], t: 'The lens! It slipped from my coat at the Docks while I was counting reflections in the water. If you find it, please — I cannot read the comet without it.' },
      { k: ['quest', 'help', 'need', 'task'], t: 'I hate to ask, but my lens is lost at the Docks. Find it and I will show you what the comet is really pointing at.' },
      { k: ['comet', 'star', 'sky'], t: 'The comet returns every 211 years. It is not a warning, I think. I hope. It looks like it is... waving? Do stars wave?' },
      { k: ['afraid', 'scared', 'worry', 'dark', 'nervous'], t: 'The dark between stars is so loud. But the Archive keeps a record of every comet since the founding. Three completed favors unlock its secret, they say.' },
      { k: ['observatory', 'telescope'], t: 'The dome creaks, the gears slip, and I love it more than sleep. With my lens back I could finally focus the great refractor.' },
      { k: ['docks', 'captain'], t: 'The Captain mocks my stargazing, but he polishes the harbor lamp every night so ships can see the sky too. Do not tell him I noticed.' },
      { k: ['archive', 'secret'], t: 'The Archivist guards the town\'s first secret. Help three of us and the Archive will open its sealed shelf to you. I have never seen it. I dream about it.' },
      { k: ['name', 'who are you', 'vela'], t: 'Vela. Named for a star, which is a lot of pressure for one person. I chart the sky so the town does not forget to look up.' },
      { k: ['hello', 'hi', 'hey'], t: 'Hello! Sorry — I was mid-thought about the comet. It is fine. Everything is fine. What can I do for you?' },
    ],
    fallback: 'I keep losing my thread tonight... the comet, the lens, the dark. Ask me about the lens, the sky, or the Archive\'s secret.',
  },
  {
    id: 'botanist', name: 'Marigold', role: 'Botanist', loc: 'greenhouse',
    personality: 'A warm gossip. Knows everyone\'s business, shares it kindly, calls the player dear, digresses about plants and neighbors.',
    greeting: 'Well, hello dear! Come in, mind the moonpetals — they bite when they\'re shy. Tea? I have gossip instead, which is better.',
    quest: { title: 'A Letter for the Captain', text: 'Take Marigold\'s letter and deliver it to the Captain at the Docks.' },
    tree: [
      { k: ['letter', 'deliver', 'captain'], t: 'You\'ll take my letter to the Captain? Bless you. He pretends not to care about the greenhouse, but he fixes our roof every storm. Off you go, dear — the Docks.' },
      { k: ['quest', 'help', 'need', 'task'], t: 'Just one little errand, dear: my letter to the Captain at the Docks. Accept it and I\'ll press it into your hands right now.' },
      { k: ['gossip', 'rumor', 'news', 'heard'], t: 'They say Vela talks to the comet, the Archivist hasn\'t slept since spring, and the Captain keeps a flower pressed in his logbook. I saw it! Don\'t ask which flower.' },
      { k: ['plant', 'flower', 'moonpetal', 'greenhouse'], t: 'The moonpetals bloom only when someone tells the truth nearby. Watch them around the Archivist, dear. Watch them closely.' },
      { k: ['vela', 'astronomer', 'observatory'], t: 'Poor Vela lost her lens at the Docks and has been apologizing to the telescope ever since. Search the Docks if you want to make her whole week.' },
      { k: ['archivist', 'archive', 'secret'], t: 'The Archive\'s sealed shelf opens for anyone who completes three favors in town. The Archivist calls it "the debt of kindness." I call it a to-do list, dear.' },
      { k: ['plaza', 'town'], t: 'The Plaza fountain runs backwards on festival days. Nobody knows why. The Archivist knows why. He won\'t say. Typical.' },
      { k: ['name', 'who are you', 'marigold'], t: 'Marigold, dear. Named for the flower, which is stubborn and grows anywhere — also like me.' },
      { k: ['hello', 'hi', 'hey'], t: 'Hello again, dear! The kettle\'s on and the rumors are fresh. What\'ll it be?' },
    ],
    fallback: 'Hmm, I\'m all ears, dear — ask me about the letter, the neighbors, the moonpetals, or that sealed shelf in the Archive.',
  },
  {
    id: 'captain', name: 'Brine', role: 'Captain', loc: 'docks',
    personality: 'A gruff skeptic. Short sentences. Distrusts dreams and riddles alike, secretly sentimental, respects plain dealing.',
    greeting: 'Hm. A landlubber with questions. Make it quick — tide doesn\'t wait and neither do I.',
    quest: { title: 'The Captain\'s Riddle', text: 'Old Brine tests everyone with a riddle. Answer it correctly to earn his trust.' },
    riddle: { q: '"The more of me you take, the more you leave behind." What am I?', options: ['Footsteps', 'Gold coins', 'Breaths'], answer: 'Footsteps' },
    tree: [
      { k: ['riddle', 'test', 'trust'], t: 'Fine. Earn my trust the old way: the more of me you take, the more you leave behind. Answer with the buttons below. No guessing twice for free — well, actually, guess all you want. Tide\'s slow today.' },
      { k: ['letter', 'marigold', 'botanist'], t: '...She wrote again? Hm. Hand it over when you\'ve got it. I\'ll read it. Eventually. Don\'t watch me read it.' },
      { k: ['lens', 'vela', 'astronomer'], t: 'Star-girl dropped something shiny on my pier. Might still be here. Search the Docks if you care. I don\'t. I just notice things.' },
      { k: ['sea', 'ship', 'sail', 'docks', 'tide'], t: 'Forty years on this water. Sea doesn\'t lie, doesn\'t flatter, doesn\'t ask riddles. Best crew I ever had.' },
      { k: ['dream', 'comet', 'star'], t: 'Dreams don\'t patch hulls. But... the comet does look like it\'s waving. Tell Vela I said that and I\'ll deny it.' },
      { k: ['archive', 'secret', 'shelf'], t: 'Three favors done in town and the Archive opens its sealed shelf. That\'s the rule. Don\'t look at me like that — I didn\'t write it, I just respect it.' },
      { k: ['plaza', 'town'], t: 'Town\'s small. Five places worth standing: Plaza, Observatory, Greenhouse, my Docks, the Archive. Everything else is water.' },
      { k: ['name', 'who are you', 'brine'], t: 'Captain Brine. Named for the sea, or the sea named for me. Either way, we\'re even.' },
      { k: ['hello', 'hi', 'hey'], t: 'Hm. Still here. Tide\'s still going out. Ask your question.' },
    ],
    fallback: 'Spit it out. Riddle, letter, lens, sea, or the Archive — those are the topics I tolerate.',
  },
  {
    id: 'archivist', name: 'Sable', role: 'Archivist', loc: 'archive',
    personality: 'A cryptic scholar. Answers questions with older questions, quotes invented proverbs, speaks of records and debts, never plain.',
    greeting: 'A reader arrives. The shelves noticed before I did. State your question — or let the question state you.',
    quest: { title: 'The Sealed Folio', text: 'A Sealed Folio was misfiled in the Observatory. Search there, recover it, and give it to Sable.' },
    tree: [
      { k: ['folio', 'book', 'misfiled'], t: 'A folio wandered from my shelf to the Observatory\'s dust. "A book unread is a door unopened." Search the Observatory. Return it, and the debt is recorded.' },
      { k: ['quest', 'help', 'need', 'task'], t: 'The Archive requires a recovery: the Sealed Folio, last seen beneath the Observatory\'s dome. Bring it home. Kindness, properly shelved, is the only currency here.' },
      { k: ['secret', 'shelf', 'sealed', 'win'], t: 'Three favors completed, and the sealed shelf unseals itself. That is the founding rule. What is inside? "The map of a town is not the town." Complete three, and see.' },
      { k: ['riddle', 'proverb', 'wisdom'], t: '"Every hour spent is a page turned; every page turned is an hour kept." The founders wrote that. Or I did. The record is ambiguous.' },
      { k: ['vela', 'astronomer', 'comet'], t: 'The comet is catalogued: 211 years, seven sightings, one apology per sighting. Vela continues the tradition faithfully.' },
      { k: ['captain', 'brine', 'docks'], t: 'The Captain\'s logbook contains one pressed flower. The Archive records facts, not explanations. Some debts are paid in petals.' },
      { k: ['marigold', 'botanist', 'greenhouse'], t: 'Marigold trades in truths that bloom. The moonpetals are my only honest colleagues. Do not tell her I said colleagues.' },
      { k: ['name', 'who are you', 'sable'], t: 'Sable. Ink-black, patient, and older than the catalogue suggests. Names are the first thing the Archive shelves.' },
      { k: ['hello', 'hi', 'hey'], t: 'Greetings are the preface of intent. Proceed to the chapter.' },
    ],
    fallback: 'The shelves hold no entry for that. Ask of the folio, the sealed shelf, the townsfolk, or the founding rules.',
  },
]
const NPC = Object.fromEntries(NPCS.map((n) => [n.id, n]))
const NPC_AT = Object.fromEntries(NPCS.map((n) => [n.loc, n.id]))

function offlineReply(npc, message, state) {
  const m = message.toLowerCase()
  for (const line of npc.tree) if (line.k.some((k) => m.includes(k))) return line.t
  // Context-aware nudge so quests stay completable offline.
  if (state.hoursLeft <= 5) return `${npc.fallback} (The day is nearly spent — ${state.hoursLeft} hours remain.)`
  return npc.fallback
}

// ---------------------------------------------------------------------------
// Inline SVG mini-scenes (game art)
// ---------------------------------------------------------------------------
function MiniScene({ loc }) {
  const common = { viewBox: '0 0 120 64', className: 'h-16 w-full', 'aria-hidden': true }
  if (loc === 'plaza') return (
    <svg {...common}>
      <rect x="0" y="48" width="120" height="16" fill="#1b2340" />
      <circle cx="60" cy="40" r="14" fill="#233059" stroke="#7c6cf0" strokeWidth="1.5" />
      <path d="M60 26 q4 -10 0 -16 q-4 6 0 16" fill="#67e8f9" opacity="0.8" />
      <rect x="56" y="40" width="8" height="10" fill="#7c6cf0" />
      <circle cx="24" cy="52" r="3" fill="#67e8f9" opacity="0.5" /><circle cx="98" cy="52" r="3" fill="#67e8f9" opacity="0.5" />
    </svg>
  )
  if (loc === 'observatory') return (
    <svg {...common}>
      <rect x="0" y="50" width="120" height="14" fill="#1b2340" />
      <path d="M36 50 a24 24 0 0 1 48 0 z" fill="#233059" stroke="#7c6cf0" strokeWidth="1.5" />
      <rect x="56" y="18" width="6" height="20" fill="#67e8f9" transform="rotate(24 59 28)" />
      <circle cx="94" cy="14" r="2" fill="#f5f3ff" /><circle cx="20" cy="10" r="1.5" fill="#f5f3ff" /><circle cx="106" cy="30" r="1.5" fill="#f5f3ff" />
      <path d="M14 24 l10 -4" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
  if (loc === 'greenhouse') return (
    <svg {...common}>
      <rect x="0" y="50" width="120" height="14" fill="#14302a" />
      <path d="M24 50 v-20 l36 -14 l36 14 v20" fill="none" stroke="#34d399" strokeWidth="1.5" />
      <path d="M40 50 q0 -14 8 -18 q8 4 8 18" fill="#34d399" opacity="0.7" />
      <path d="M66 50 q0 -10 6 -14 q6 4 6 14" fill="#67e8f9" opacity="0.6" />
      <circle cx="88" cy="34" r="3" fill="#f5f3ff" opacity="0.8" />
    </svg>
  )
  if (loc === 'docks') return (
    <svg {...common}>
      <rect x="0" y="44" width="120" height="20" fill="#123047" />
      <path d="M0 48 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#67e8f9" strokeWidth="1.5" fill="none" opacity="0.7" />
      <path d="M30 44 l6 -14 l28 0 l6 14 z" fill="#233059" stroke="#7c6cf0" strokeWidth="1.5" />
      <rect x="48" y="12" width="3" height="18" fill="#7c6cf0" />
      <path d="M51 12 l14 6 l-14 6 z" fill="#67e8f9" opacity="0.8" />
    </svg>
  )
  return (
    <svg {...common}>
      <rect x="0" y="50" width="120" height="14" fill="#1b2340" />
      <rect x="26" y="16" width="68" height="34" fill="#233059" stroke="#7c6cf0" strokeWidth="1.5" />
      <rect x="34" y="24" width="8" height="26" fill="#7c6cf0" opacity="0.8" /><rect x="46" y="28" width="8" height="22" fill="#67e8f9" opacity="0.7" />
      <rect x="58" y="22" width="8" height="28" fill="#f5f3ff" opacity="0.5" /><rect x="70" y="26" width="8" height="24" fill="#7c6cf0" opacity="0.6" />
      <path d="M20 16 l40 -8 l40 8" fill="none" stroke="#67e8f9" strokeWidth="1.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
export default function NeuroWorld({ level = 1, onFinish }) {
  const totalHours = [28, 24, 20][level] ?? 24
  const [hoursLeft, setHoursLeft] = useState(totalHours)
  const [loc, setLoc] = useState('plaza')
  const [quests, setQuests] = useState({ astronomer: 'new', botanist: 'new', captain: 'new', archivist: 'new' })
  const [found, setFound] = useState({ plaza: 0, observatory: 0, greenhouse: 0, docks: 0, archive: 0 })
  const [inv, setInv] = useState([])
  const [hasLetter, setHasLetter] = useState(false)
  const [chats, setChats] = useState(() => Object.fromEntries(NPCS.map((n) => [n.id, [{ role: 'npc', text: n.greeting }]])))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const [note, setNote] = useState('You arrive in town with a full day ahead. Talk to people, search for curiosities, and earn three favors.')
  const finishedRef = useRef(false)
  const chatRef = useRef(null)
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  const doneCount = Object.values(quests).filter((q) => q === 'done').length
  const npcId = NPC_AT[loc]
  const npc = npcId ? NPC[npcId] : null
  const score = () => doneCount * 200 + inv.length * 30 + hoursLeft * 10

  const finish = (won) => {
    if (finishedRef.current) return
    finishedRef.current = true
    const s = score()
    onFinish({
      score: s, rating: clamp(s / 1000, 0, 1), won,
      summary: won
        ? `You unlocked the Archive's secret with ${doneCount} favors and ${hoursLeft} hours to spare.`
        : `The day ended with ${doneCount} of 3 favors — the Archive's shelf stayed sealed.`,
      stats: [
        { label: 'Quests done', value: `${doneCount}/4` },
        { label: 'Curiosities', value: `${inv.length}/10` },
        { label: 'Hours left', value: hoursLeft },
        { label: 'Voices', value: offline ? 'Offline' : 'AI' },
      ],
    })
  }

  useEffect(() => {
    if (hoursLeft <= 0 && !finishedRef.current) finish(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoursLeft])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chats, npcId, busy])

  const travel = (id) => {
    if (id === loc || hoursLeft <= 0 || busy) return
    setLoc(id)
    setHoursLeft((h) => h - 1)
    setNote(`You walk to the ${LOC[id].name}. (−1 hour)`)
  }

  const search = () => {
    if (hoursLeft <= 0 || found[loc] >= 2) return
    const item = LOC[loc].items[found[loc]]
    setFound((f) => ({ ...f, [loc]: f[loc] + 1 }))
    setInv((v) => [...v, item])
    setHoursLeft((h) => h - 1)
    setNote(`You search the ${LOC[loc].name} and find: ${item}. (−1 hour)`)
  }

  const appendChat = (id, msgs) => setChats((c) => ({ ...c, [id]: [...c[id], ...msgs] }))

  const send = async () => {
    const text = input.trim()
    if (!text || busy || !npc) return
    setInput('')
    const history = chats[npc.id].slice(-8)
    appendChat(npc.id, [{ role: 'player', text }])
    if (offline) {
      appendChat(npc.id, [{ role: 'npc', text: offlineReply(npc, text, { hoursLeft }) }])
      return
    }
    setBusy(true)
    try {
      const context = `NeuroPlay's NeuroWorld: a small island town with Plaza, Observatory, Greenhouse, Docks and Archive. The player is at the ${LOC[loc].name}. Their inventory: ${inv.join(', ') || 'empty'}. Quests done: ${doneCount}/4. Reply in character, under 60 words. Never claim quest completion for the player.`
      const r = await api('/ai/npc', { name: `${npc.name} the ${npc.role}`, personality: npc.personality, context, history, message: text })
      if (!aliveRef.current) return
      appendChat(npc.id, [{ role: 'npc', text: r.reply || npc.fallback }])
    } catch {
      if (!aliveRef.current) return
      setOffline(true)
      appendChat(npc.id, [{ role: 'npc', text: offlineReply(npc, text, { hoursLeft }) }])
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  const accept = (id) => {
    setQuests((q) => ({ ...q, [id]: 'active' }))
    if (id === 'botanist') { setHasLetter(true); setNote('Marigold presses a sealed letter into your hands. The Captain waits at the Docks.') }
    else setNote(`Quest accepted: ${NPC[id].quest.title}. Check the quest log for details.`)
  }
  const complete = (id, msg) => {
    setQuests((q) => ({ ...q, [id]: 'done' }))
    setNote(msg)
    const reactions = {
      captain: '...Hm. Correct. Footsteps. You\'ll do. Don\'t let it go to your head.',
      botanist: 'He read it?! Oh, tell me everything later, dear. You\'ve made an old gardener very happy.',
      astronomer: 'The lens! Oh — oh, the comet is going to be so clear tonight. Thank you, thank you!',
      archivist: 'The folio returns. The shelf breathes easier. Your kindness is recorded, reader.',
    }
    appendChat(id, [{ role: 'npc', text: reactions[id] }])
    if (id === 'botanist' && npcId === 'captain') appendChat('captain', [{ role: 'npc', text: '...Tell Marigold the roof held fine. And the letter. The letter was fine too. Hm.' }])
  }

  const answerRiddle = (opt) => {
    if (opt === NPC.captain.riddle.answer) complete('captain', 'The Captain grunts — almost a smile. His trust is earned. Quest complete!')
    else { appendChat('captain', [{ role: 'npc', text: 'Wrong. The sea takes gold and gives nothing back; breaths leave nothing at all. Think about walking.' }]); setNote('Not quite. The Captain lets you try again.') }
  }

  const canGiveLens = npcId === 'astronomer' && quests.astronomer === 'active' && inv.includes('Cracked Lens')
  const canGiveFolio = npcId === 'archivist' && quests.archivist === 'active' && inv.includes('Sealed Folio')
  const canDeliver = npcId === 'captain' && quests.botanist === 'active' && hasLetter
  const secretReady = loc === 'archive' && doneCount >= 3

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Stat label="Hours left" value={`${hoursLeft}/${totalHours}`} tone={hoursLeft <= 5 ? 'text-warn' : ''} />
          <Stat label="Favors" value={`${doneCount}/3`} tone={doneCount >= 3 ? 'text-success' : ''} />
          <Stat label="Curiosities" value={inv.length} />
        </div>
        {offline && <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-warn"><WifiOff size={12} /> Offline</span>}
      </div>

      {/* World map */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {LOCATIONS.map((l) => {
          const here = l.id === loc
          const Icon = l.icon
          return (
            <button key={l.id} onClick={() => travel(l.id)} disabled={here || hoursLeft <= 0 || busy}
              aria-label={here ? `You are at the ${l.name}` : `Travel to the ${l.name} (costs 1 hour)`}
              className={`glass rounded-2xl p-2.5 text-left transition-all ${here ? 'border-violet/70 ring-1 ring-violet/40' : 'glass-hover disabled:opacity-60'} ${l.id === 'archive' ? 'col-span-2 sm:col-span-1' : ''}`}>
              <MiniScene loc={l.id} />
              <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold">
                <Icon size={14} className={here ? 'text-violet-soft' : 'text-dim'} /> {l.name}
              </div>
              <div className="text-[11px] text-dim">{here ? <span className="flex items-center gap-1 text-violet-soft"><MapPin size={11} /> You are here</span> : 'Travel · 1 hour'}</div>
            </button>
          )
        })}
      </div>

      <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-dim" role="status">{note}</p>

      {/* Current location */}
      <div className="glass mt-4 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">{LOC[loc].name}</h2>
          <Button size="sm" variant="secondary" onClick={search} disabled={hoursLeft <= 0 || found[loc] >= 2}>
            <Search size={15} /> {found[loc] >= 2 ? 'Nothing left to find' : `Search location (1h)`}
          </Button>
        </div>
        <div className="mt-2 text-xs text-dim">
          Found here: {found[loc] === 0 ? 'nothing yet' : LOC[loc].items.slice(0, found[loc]).join(', ')} · {2 - found[loc]} hidden {2 - found[loc] === 1 ? 'item' : 'items'} remain
        </div>

        {secretReady && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 rounded-2xl border border-success/50 bg-success/10 p-4">
            <p className="text-sm"><Sparkles size={15} className="mr-1 inline text-success" /> Three favors are recorded. The sealed shelf hums, waiting for your hand.</p>
            <Button className="mt-3" onClick={() => finish(true)}><BookOpen size={16} /> Unlock the Archive secret</Button>
          </motion.div>
        )}
        {loc === 'archive' && doneCount < 3 && (
          <p className="mt-3 rounded-xl border border-white/10 bg-panel/60 p-3 text-xs text-dim">The sealed shelf will not open yet. Complete {3 - doneCount} more {3 - doneCount === 1 ? 'favor' : 'favors'} in town.</p>
        )}

        {npc && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><MessageCircle size={15} className="text-cyan" /> {npc.name} the {npc.role}</div>

            {/* Quest box */}
            <div className="mt-3 rounded-2xl border border-white/10 bg-panel/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><ScrollText size={14} className="text-violet-soft" /> {npc.quest.title}
                {quests[npc.id] === 'done' && <CheckCircle2 size={14} className="text-success" />}
              </div>
              {quests[npc.id] === 'new' && (
                <>
                  <p className="mt-1 text-xs text-dim">{npc.quest.text}</p>
                  <Button size="sm" className="mt-2" onClick={() => accept(npc.id)}>Accept quest</Button>
                </>
              )}
              {quests[npc.id] === 'active' && (
                <>
                  <p className="mt-1 text-xs text-dim">{npc.quest.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {canGiveLens && <Button size="sm" onClick={() => complete('astronomer', 'Vela cradles the lens like a rescued star. Quest complete!')}><Package size={14} /> Give lens</Button>}
                    {canGiveFolio && <Button size="sm" onClick={() => complete('archivist', 'Sable shelves the folio with ceremonial slowness. Quest complete!')}><Package size={14} /> Give folio</Button>}
                    {canDeliver && <Button size="sm" onClick={() => { setHasLetter(false); complete('botanist', 'The Captain takes the letter, turns away, and reads it twice. Marigold\'s quest complete!') }}><Send size={14} /> Deliver letter</Button>}
                  </div>
                  {npc.id === 'captain' && (
                    <div className="mt-3">
                      <p className="text-sm italic text-ink">{npc.riddle.q}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {npc.riddle.options.map((o) => (
                          <button key={o} onClick={() => answerRiddle(o)} className="glass rounded-xl px-4 py-2.5 text-sm hover:border-violet/60">{o}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {npc.id === 'botanist' && hasLetter && <p className="mt-2 text-xs text-cyan">You carry Marigold's letter. The Captain is at the Docks.</p>}
                </>
              )}
              {quests[npc.id] === 'done' && <p className="mt-1 text-xs text-success">Favor completed. The town remembers.</p>}
            </div>

            {/* Chat */}
            <div ref={chatRef} className="mt-3 h-56 space-y-2 overflow-y-auto rounded-2xl bg-white/5 p-3" aria-label={`Conversation with ${npc.name}`}>
              {chats[npc.id].map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === 'player' ? 'ml-auto bg-violet/25 text-ink' : 'bg-white/10 text-ink'}`}>
                  {m.role === 'npc' && <span className="mr-1 text-xs font-semibold text-cyan">{npc.name}:</span>}{m.text}
                </div>
              ))}
              {busy && <div className="flex items-center gap-2 text-xs text-dim"><Loader2 size={13} className="animate-spin" /> {npc.name} is thinking…</div>}
            </div>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send() }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
                placeholder={`Ask ${npc.name} about their quest, the town, the secret…`}
                aria-label={`Message ${npc.name}`}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-panel/70 px-3 py-2.5 text-sm text-ink placeholder:text-dim/60 focus:border-violet/60 focus:outline-none" />
              <Button type="submit" size="md" disabled={busy || !input.trim()} aria-label="Send message"><Send size={15} /></Button>
            </form>
          </div>
        )}
        {!npc && <p className="mt-3 text-sm text-dim">The Plaza is quiet — fountain water, distant gulls, and somewhere a greenhouse door banging. Everyone worth talking to is elsewhere.</p>}
      </div>

      {/* Quest log + inventory */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><ScrollText size={14} className="text-violet-soft" /> Quest log</div>
          <ul className="mt-2 space-y-1.5 text-xs">
            {NPCS.map((n) => (
              <li key={n.id} className="flex items-start gap-2">
                {quests[n.id] === 'done' ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" /> : <Circle size={13} className={`mt-0.5 shrink-0 ${quests[n.id] === 'active' ? 'text-cyan' : 'text-dim/50'}`} />}
                <span className={quests[n.id] === 'done' ? 'text-dim line-through' : 'text-dim'}>
                  <b className="text-ink">{n.quest.title}</b> — {n.name}, {LOC[n.loc].name}. {quests[n.id] !== 'done' && n.quest.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Package size={14} className="text-cyan" /> Satchel</div>
          {inv.length === 0 && !hasLetter ? <p className="mt-2 text-xs text-dim">Empty. Search locations to find curiosities (1 hour each).</p> : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {hasLetter && <li className="rounded-lg border border-cyan/40 bg-cyan/10 px-2 py-1 text-xs text-cyan">Marigold's letter</li>}
              {inv.map((it) => <li key={it} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-ink">{it}</li>)}
            </ul>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-dim"><Clock size={11} /> Travel and searching each cost 1 hour. Talking is free.</p>
        </div>
      </div>
    </Frame>
  )
}
