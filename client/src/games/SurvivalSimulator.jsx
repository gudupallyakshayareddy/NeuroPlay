import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, Apple, Backpack, BedDouble, BriefcaseMedical, Cable, Cherry,
  CloudFog, CloudLightning, CloudRain, Droplets, Fish, Flame, Footprints, Heart,
  Leaf, Moon, PawPrint, RadioTower, Rocket, Siren, Skull, Snowflake, Sprout,
  Sun, Tent, ThermometerSun, TreePine, Users, Waves, Zap,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp, rand, shuffle } from './ui.jsx'

// ---------------------------------------------------------------------------
// Hidden event data. Every choice's costs/gains are computed from this table.
// fx = stat deltas, items = found gear, uses = consumed gear, requires = needed
// gear, risk = random branch, rescue = instant win.
// ---------------------------------------------------------------------------
const EVENTS = [
  {
    id: 'storm', icon: CloudLightning, title: 'Storm on the ridge',
    text: 'Black clouds swallow the ridge. Lightning walks the treeline toward your camp.',
    choices: [
      { label: 'Shelter in a shallow cave', cost: { energy: 5 }, fx: {}, log: 'You wait out the thunder in dry silence.' },
      { label: 'Rig a tarp and ride it out', cost: { energy: 10 }, fx: { health: -6, water: 10 }, log: 'The tarp leaks, but you catch some rain. Bruised and damp.' },
      { label: 'Stand in the downpour collecting water', cost: { energy: 14 }, fx: { water: 26, health: -10 }, log: 'You fill every container, shivering to the bone.' },
    ],
  },
  {
    id: 'wolves', icon: PawPrint, title: 'Eyes in the dark',
    text: 'A wolf pack circles the camp at dusk, patient and thin. They smell your food.',
    choices: [
      { label: 'Wave a burning branch', cost: { energy: 15 }, fx: {}, log: 'Fire wins the argument. The pack melts into the trees.' },
      { label: 'Fight them off', cost: { energy: 12 }, risk: { p: 0.5, good: { fx: { food: 8 }, log: 'You drive them off and scavenge their kill. Grim calories.' }, bad: { fx: { health: -22 }, log: 'Teeth find your forearm before they retreat.' } } },
      { label: 'Toss them food and back away', cost: { energy: 4 }, fx: { food: -14 }, log: 'They take the offering. You keep your skin.' },
    ],
  },
  {
    id: 'river', icon: Waves, title: 'The swollen river',
    text: 'Snowmelt has turned the river into a gray, muscular current. The far bank has fruit trees.',
    choices: [
      { label: 'Rope across to the far bank', requires: 'rope', cost: { energy: 10 }, fx: { water: 24, food: 12 }, log: 'The rope holds. You drink deep and pick fruit on the far side.' },
      { label: 'Wade across at the shallows', cost: { energy: 14 }, risk: { p: 0.55, good: { fx: { water: 20, food: 10 }, log: 'Waist-deep and freezing, but you make it and forage the bank.' }, bad: { fx: { health: -18, water: 8 }, log: 'The current takes your legs. You crawl out battered.' } } },
      { label: 'Follow the bank to a calm bend', cost: { energy: 10 }, fx: { water: 14 }, log: 'A patient walk finds still water. You refill and rest.' },
    ],
  },
  {
    id: 'berries', icon: Cherry, title: 'The berry thicket',
    text: 'A thicket heavy with dark berries. Some you recognize. Some you do not.',
    choices: [
      { label: 'Pick only what you know', cost: { energy: 8 }, fx: { food: 16 }, log: 'Slow, careful picking. Safe calories.' },
      { label: 'Eat handfuls of everything', cost: { energy: 3 }, risk: { p: 0.7, good: { fx: { food: 24 }, log: 'Sweet and plentiful. Your stomach stays quiet.' }, bad: { fx: { food: 12, health: -14 }, log: 'Something bitter disagrees with you. Violently.' } } },
      { label: 'Mark the thicket and move on', cost: { energy: 2 }, fx: {}, log: 'You note the spot for a hungrier day.' },
    ],
  },
  {
    id: 'camp', icon: Tent, title: 'Abandoned camp',
    text: 'A collapsed tent, a cold fire ring, and a pack left in a hurry. Whoever camped here never came back.',
    choices: [
      { label: 'Search the pack thoroughly', cost: { energy: 10 }, fx: { food: 10 }, items: ['rope'], log: 'A coil of good rope and a ration brick. You leave a stone on the fire ring.' },
      { label: 'Grab the signal flare and go', cost: { energy: 4 }, items: ['flare'], log: 'One flare, sealed and dry. A sky-colored promise.' },
      { label: 'Sleep in the sheltered tent', cost: {}, fx: { energy: 22 }, log: 'You sleep with one ear open, but you sleep.' },
    ],
  },
  {
    id: 'ankle', icon: AlertTriangle, title: 'A bad step',
    text: 'A hidden root turns your ankle with a wet click. The joint swells hot and angry.',
    choices: [
      { label: 'Splint it and rest', cost: { energy: 8 }, fx: { health: 6 }, log: 'Bound tight with green wood. It throbs, but holds.' },
      { label: 'Push through the pain', cost: {}, fx: { health: -14, energy: -6 }, log: 'Every step is a negotiation you lose.' },
      { label: 'Treat it properly', requires: 'medkit', uses: 'medkit', cost: {}, fx: { health: 26 }, log: 'Antiseptic, wrap, painkillers. The medkit earns its weight.' },
    ],
  },
  {
    id: 'heat', icon: ThermometerSun, title: 'Heatwave',
    text: 'The air shimmers. The sun is a white hole in the sky and the shade has gone to hide.',
    choices: [
      { label: 'Push on through the heat', cost: { energy: 16, water: 12 }, fx: { health: -6 }, log: 'You cover ground, but the sun takes its tax.' },
      { label: 'Hide in shade until dusk', cost: { water: 10 }, fx: { energy: 8 }, log: 'You doze under a rock shelf, sipping sparingly.' },
      { label: 'Dig at the dry streambed', cost: { energy: 14 }, risk: { p: 0.6, good: { fx: { water: 22 }, log: 'Muddy seep-water, filtered through your shirt. It works.' }, bad: { fx: { water: 4 }, log: 'Damp sand and a wasted afternoon.' } } },
    ],
  },
  {
    id: 'fog', icon: CloudFog, title: 'Whiteout fog',
    text: 'Fog erases the world beyond your outstretched hand. Every direction looks like the wrong one.',
    choices: [
      { label: 'Wait it out', cost: { energy: 4, food: 5 }, fx: {}, log: 'You sit on your pack and eat a little, listening to nothing.' },
      { label: 'Navigate by the stream\'s sound', cost: { energy: 12 }, risk: { p: 0.6, good: { fx: { water: 12 }, log: 'The sound leads true. You find the water and a game trail.' }, bad: { fx: { health: -10 }, log: 'The sound was a trickle over a drop. You fall hard.' } } },
      { label: 'Blaze a trail and circle camp', cost: { energy: 8 }, fx: {}, log: 'You mark trees so tomorrow-you wastes nothing.' },
    ],
  },
  {
    id: 'traveler', icon: Users, title: 'The gaunt traveler',
    text: 'A stranger with hollow cheeks and a good coat waves from the trail. They eye your pack.',
    choices: [
      { label: 'Share a meal', cost: { food: 14 }, items: ['flare'], log: 'Over stew they press a signal flare into your hand. "For the sky," they say.' },
      { label: 'Trade food for their medkit', cost: { food: 10 }, items: ['medkit'], log: 'A fair trade. Their kit is military-grade, barely opened.' },
      { label: 'Keep your distance', cost: { energy: 3 }, fx: {}, log: 'You nod and pass. Their eyes follow you a long way.' },
    ],
  },
  {
    id: 'greenhouse', icon: Sprout, title: 'The ruined greenhouse',
    text: 'Shattered glass panels, but inside: rows of vegetables gone feral and fat.',
    choices: [
      { label: 'Harvest everything you can carry', cost: { energy: 12 }, fx: { food: 26 }, log: 'Tomatoes, beans, a squash the size of your head.' },
      { label: 'Take only what ripens today', cost: { energy: 5 }, fx: { food: 12 }, log: 'A light, honest haul. You leave the rest to grow.' },
      { label: 'Climb the frame for a lookout', cost: { energy: 10 }, risk: { p: 0.5, good: { fx: {}, log: 'From the ridge beam you spot a smoke column — people, far east.' }, bad: { fx: { health: -12 }, log: 'Rusted steel gives way. Glass and gravity both bite.' } } },
    ],
  },
  {
    id: 'snake', icon: AlertTriangle, title: 'Coiled on the trail',
    text: 'A thick viper suns itself on the only flat stone across the stream. It does not move.',
    choices: [
      { label: 'Freeze and let it pass', cost: { energy: 3 }, fx: {}, log: 'Ten long minutes. It pours itself into the grass like water.' },
      { label: 'Kill it for meat', cost: { energy: 8 }, risk: { p: 0.55, good: { fx: { food: 14 }, log: 'One clean strike. Protein is protein.' }, bad: { fx: { health: -24 }, log: 'It is faster than you. The venom burns up your arm.' } } },
      { label: 'Take the long way around', cost: { energy: 10 }, fx: {}, log: 'An extra mile, but your heartbeat stays yours.' },
    ],
  },
  {
    id: 'rain', icon: CloudRain, title: 'Soft, steady rain',
    text: 'A gray, gentle rain — the kind that fills canteens and softens the world.',
    choices: [
      { label: 'Spread every container', cost: { energy: 6 }, fx: { water: 30 }, log: 'Every pot, bottle and bag brims with clean sky-water.' },
      { label: 'Shelter and nap through it', cost: {}, fx: { energy: 16, water: 8 }, log: 'Rain on leaves is the best sleeping sound there is.' },
      { label: 'March while it\'s cool', cost: { water: 4 }, fx: { energy: -8 }, log: 'You make good time in the cool gray light.' },
    ],
  },
  {
    id: 'lake', icon: Fish, title: 'The still lake',
    text: 'A black lake at dawn, dimpled with rising fish. The water is clear and cold.',
    choices: [
      { label: 'Fashion a net from rope', requires: 'rope', cost: { energy: 10 }, fx: { food: 22, water: 18 }, log: 'A woven trap takes three fat fish. You drink your fill too.' },
      { label: 'Spear fish in the shallows', cost: { energy: 14 }, risk: { p: 0.5, good: { fx: { food: 20, water: 14 }, log: 'Patience pays: two fish on a sharpened stick.' }, bad: { fx: { water: 12 }, log: 'The fish mock your splashing. At least you drink.' } } },
      { label: 'Just refill and rest', cost: { energy: 2 }, fx: { water: 16, energy: 4 }, log: 'Cold water, flat stones, a quiet hour.' },
    ],
  },
  {
    id: 'bear', icon: TreePine, title: 'Fresh bear sign',
    text: 'Claw marks at head height, scat full of berries, and a smell like wet fur. The owner is near.',
    choices: [
      { label: 'Detour wide and silent', cost: { energy: 12 }, fx: {}, log: 'You give the valley a respectful berth.' },
      { label: 'Climb and scout from a pine', cost: { energy: 9 }, fx: {}, log: 'From the crown you map two ridges and a distant road.' },
      { label: 'Follow the sign to its kill', cost: { energy: 10 }, risk: { p: 0.4, good: { fx: { food: 28 }, log: 'You steal cached meat while the bear is away. Heart in throat.' }, bad: { fx: { health: -26 }, log: 'The bear was NOT away. You run like you\'ve never run.' } } },
    ],
  },
  {
    id: 'tower', icon: RadioTower, title: 'The dead radio tower',
    text: 'A rusted relay tower leans over the valley. The equipment hut below is half-open.',
    choices: [
      { label: 'Broadcast an SOS on the dead set', cost: { energy: 12 }, rescueIfLate: true, fx: {}, log: 'Static... then a voice: "Copy, survivor. Hold position." A rescue bird is inbound!' , lateLog: 'You broadcast into silence. Maybe someone heard. Maybe not.' },
      { label: 'Search the equipment hut', cost: { energy: 8 }, fx: { food: 8 }, items: ['medkit'], log: 'A first-aid cabinet and a forgotten lunchbox. Both useful.' },
      { label: 'Salvage wire and move on', cost: { energy: 6 }, items: ['rope'], log: 'Copper wire braids into a serviceable line.' },
    ],
  },
  {
    id: 'cold', icon: Snowflake, title: 'A killing frost',
    text: 'The temperature falls off a cliff after sunset. Your breath turns to smoke.',
    choices: [
      { label: 'Build a long-fire', cost: { energy: 12 }, fx: { health: 4 }, log: 'You feed the flames till dawn, warm and watchful.' },
      { label: 'Huddle in your bedroll', cost: {}, fx: { health: -10, energy: 8 }, log: 'You sleep in fits, teeth chattering like dice.' },
      { label: 'Keep moving to stay warm', cost: { energy: 16 }, fx: { food: -6 }, log: 'You walk the frost off under hard, bright stars.' },
    ],
  },
  {
    id: 'shrooms', icon: Leaf, title: 'The fairy ring',
    text: 'A ring of pale mushrooms after the rain. Edible? You genuinely cannot remember.',
    choices: [
      { label: 'Boil them twice, then eat', cost: { energy: 8 }, fx: { food: 14 }, log: 'The old trick works. Earthy, safe, filling.' },
      { label: 'Eat them raw and hope', cost: { energy: 2 }, risk: { p: 0.5, good: { fx: { food: 18 }, log: 'Mild and nutty. Luck is a resource too.' }, bad: { fx: { food: 8, health: -18 }, log: 'The world tilts sideways for six awful hours.' } } },
      { label: 'Leave the fairy ring alone', cost: {}, fx: {}, log: 'Some doors are better left unknocked.' },
    ],
  },
]

const RESCUE_EVENT = {
  id: 'heli', icon: Siren, title: 'Rotor sound!',
  text: 'A search helicopter sweeps the valley, low and slow. This is the chance you have been waiting for.',
  choices: [
    { label: 'Fire the signal flare', requires: 'flare', uses: 'flare', cost: {}, rescue: true, fx: {}, log: 'Red star over the canopy. The bird banks hard toward you.' },
    { label: 'Wave and shout from the ridge', cost: { energy: 8 }, risk: { p: 0.3, good: { rescue: true, fx: {}, log: 'They see you! The helicopter settles onto the meadow.' }, bad: { fx: {}, log: 'The noise swallows your voice. It passes on.' } } },
    { label: 'Stay hidden — it might not be friendly', cost: {}, fx: {}, log: 'You watch it go, heart hammering, and second-guess everything.' },
  ],
}

const ITEMS = {
  rope: { name: 'Rope', icon: Cable },
  medkit: { name: 'Medkit', icon: BriefcaseMedical },
  flare: { name: 'Flare', icon: Rocket },
}

const TARGET = [8, 10, 12]
const DRAIN_SCALE = [0.85, 1, 1.2]
const BASE_DRAIN = { food: 12, water: 15, energy: 10 }
const CAMP_ACTIONS = [
  { id: 'forage', label: 'Forage', icon: Apple, cost: 15, desc: '-15 energy → food' },
  { id: 'water', label: 'Find water', icon: Droplets, cost: 12, desc: '-12 energy → water' },
  { id: 'rest', label: 'Rest', icon: BedDouble, cost: 0, desc: '+25 energy (1/day)' },
]

const fxText = (fx = {}) => {
  const names = { health: 'HP', food: 'food', water: 'water', energy: 'energy' }
  return Object.entries(fx).filter(([, v]) => v !== 0).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${names[k]}`).join(', ')
}

export default function SurvivalSimulator({ level = 1, onFinish }) {
  const target = TARGET[level] ?? 10
  const scale = DRAIN_SCALE[level] ?? 1
  const finishedRef = useRef(false)

  const [g, setG] = useState(() => {
    const deck = shuffle(EVENTS.map((e) => e.id))
    return {
      day: 1, phase: 'event', // 'event' | 'camp'
      health: 100, food: 82, water: 82, energy: 90,
      items: [], log: [{ day: 1, text: 'You wake alone in the wild. Survive.', tone: 'info' }],
      deck: deck.slice(1), event: EVENTS.find((e) => e.id === deck[0]), campUsed: 0, rested: false,
      heliDone: false, outcome: null, // {won, reason}
    }
  })

  const finish = (s, won, reason) => {
    if (finishedRef.current) return
    finishedRef.current = true
    const daysSurvived = won && reason === 'survived' ? target : won ? s.day : s.day - 1
    const resources = Math.round(s.health + s.food + s.water + s.energy)
    const score = Math.max(0, daysSurvived * 80 + resources + (won ? 200 : 0))
    const max = target * 80 + 400 + 200
    onFinish({
      score, rating: clamp(score / max, 0, 1), won,
      summary: won
        ? reason === 'rescued' ? `Rescued on day ${s.day} with ${Math.round(s.health)} health to spare.` : `You survived all ${target} days in the wild.`
        : `${reason} on day ${s.day}. The wild keeps what it takes.`,
      stats: [
        { label: 'Days survived', value: `${daysSurvived}/${target}` },
        { label: 'Health left', value: Math.round(s.health) },
        { label: 'Supplies left', value: Math.round(s.food + s.water) },
        { label: 'Gear found', value: s.items.length },
      ],
    })
  }

  const applyFx = (s, fx = {}) => {
    for (const k of ['health', 'food', 'water', 'energy']) s[k] = clamp(s[k] + (fx[k] || 0), 0, 100)
  }

  const pushLog = (s, text, tone = 'info') => { s.log = [...s.log.slice(-30), { day: s.day, text, tone }] }

  const checkDeath = (s) => {
    if (s.health <= 0) {
      s.outcome = { won: false, reason: s.food <= 0 && s.water <= 0 ? 'Starved and parched, you collapsed' : s.water <= 0 ? 'Dehydration claimed you' : s.food <= 0 ? 'Starvation claimed you' : 'Your injuries were too much' }
      return true
    }
    return false
  }

  const choose = (ci) => {
    if (g.phase !== 'event' || g.outcome) return
    const ev = g.event
    const c = ev.choices[ci]
    if (c.requires && !g.items.includes(c.requires)) return
    const cost = c.cost || {}
    if ((cost.energy || 0) > g.energy) return
    const s = { ...g, items: [...g.items], log: g.log }
    applyFx(s, { energy: -(cost.energy || 0), food: -(cost.food || 0), water: -(cost.water || 0) })
    let fx = c.fx || {}, log = c.log, rescue = !!c.rescue
    if (c.risk) {
      const good = Math.random() < c.risk.p
      const branch = good ? c.risk.good : c.risk.bad
      fx = branch.fx || {}; log = branch.log; rescue = !!branch.rescue
    }
    if (c.rescueIfLate) {
      if (s.day >= target - 2) { rescue = true } else { log = c.lateLog }
    }
    applyFx(s, fx)
    if (c.items) for (const it of c.items) if (!s.items.includes(it)) { s.items.push(it); pushLog(s, `Found: ${ITEMS[it].name}.`, 'good') }
    if (c.uses) s.items = s.items.filter((i) => i !== c.uses)
    pushLog(s, log, rescue ? 'good' : (fx.health || 0) < 0 ? 'bad' : 'info')
    if (rescue) { s.outcome = { won: true, reason: 'rescued' }; setG(s); finish(s, true, 'rescued'); return }
    if (checkDeath(s)) { setG(s); finish(s, false, s.outcome.reason); return }
    s.phase = 'camp'
    setG(s)
  }

  const camp = (id) => {
    if (g.phase !== 'camp' || g.outcome || g.campUsed >= 3) return
    const s = { ...g, log: g.log }
    if (id === 'rest') {
      if (s.rested) return
      s.rested = true; applyFx(s, { energy: 25 }); pushLog(s, 'You rest deeply. Strength returns.', 'good')
    } else if (id === 'forage') {
      if (s.energy < 15) return
      const gain = rand(10, 18); applyFx(s, { energy: -15, food: gain }); pushLog(s, `Foraging pays off: +${gain} food.`)
    } else {
      if (s.energy < 12) return
      const gain = rand(12, 20); applyFx(s, { energy: -12, water: gain }); pushLog(s, `You find and filter water: +${gain} water.`)
    }
    s.campUsed += 1
    if (checkDeath(s)) { setG(s); finish(s, false, s.outcome.reason); return }
    setG(s)
  }

  const useMedkit = () => {
    if (g.outcome || !g.items.includes('medkit') || g.health >= 100) return
    const s = { ...g, items: g.items.filter((i) => i !== 'medkit'), log: g.log }
    applyFx(s, { health: 30 })
    pushLog(s, 'You patch yourself up with the medkit. +30 health.', 'good')
    setG(s)
  }

  const endDay = () => {
    if (g.phase !== 'camp' || g.outcome) return
    if (g.day >= target) {
      const s = { ...g, outcome: { won: true, reason: 'survived' } }
      pushLog(s, `Dawn of day ${target + 1}. You made it.`, 'good')
      setG(s); finish(s, true, 'survived'); return
    }
    const s = { ...g, items: [...g.items], log: g.log, day: g.day + 1, phase: 'event', campUsed: 0, rested: false }
    applyFx(s, {
      food: -Math.round(BASE_DRAIN.food * scale),
      water: -Math.round(BASE_DRAIN.water * scale),
      energy: -Math.round(BASE_DRAIN.energy * scale) + 20, // sleep restores some energy
    })
    pushLog(s, `Day ${s.day}. The night took its toll: -${Math.round(BASE_DRAIN.food * scale)} food, -${Math.round(BASE_DRAIN.water * scale)} water.`, 'info')
    if (s.food <= 0) { applyFx(s, { health: -18 }); pushLog(s, 'Nothing to eat. Your body feeds on itself. -18 health.', 'bad') }
    if (s.water <= 0) { applyFx(s, { health: -22 }); pushLog(s, 'No water. Your blood thickens. -22 health.', 'bad') }
    if (checkDeath(s)) { setG(s); finish(s, false, s.outcome.reason); return }
    // Draw next event; rescue flyover appears late-game, once.
    let ev = null
    if (!s.heliDone && s.day >= 5 && (s.items.includes('flare') || s.day >= target - 2)) {
      ev = RESCUE_EVENT; s.heliDone = true
    } else {
      if (s.deck.length === 0) s.deck = shuffle(EVENTS.map((e) => e.id))
      ev = EVENTS.find((e) => e.id === s.deck[0]); s.deck = s.deck.slice(1)
    }
    s.event = ev
    setG(s)
  }

  const bars = [
    { k: 'health', label: 'Health', icon: Heart },
    { k: 'food', label: 'Food', icon: Apple },
    { k: 'water', label: 'Water', icon: Droplets },
    { k: 'energy', label: 'Energy', icon: Zap },
  ]
  const barColor = (v) => (v <= 20 ? 'bg-danger' : v <= 45 ? 'bg-warn' : 'bg-success')
  const sky = g.phase === 'event'
    ? 'linear-gradient(120deg, rgba(245,158,11,0.28), rgba(124,92,255,0.16) 55%, rgba(5,6,15,0))'
    : 'linear-gradient(120deg, rgba(124,92,255,0.30), rgba(34,211,238,0.10) 60%, rgba(5,6,15,0))'
  const ev = g.event
  const EvIcon = ev ? ev.icon : Sun

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        <Stat label="Day" value={`${g.day}/${target}`} />
        <Stat label="Gear" value={g.items.length} />
        <Stat label="Goal" value={g.items.includes('flare') ? 'Signal!' : 'Survive'} tone={g.items.includes('flare') ? 'text-cyan' : ''} />
      </div>

      {/* Day/night gradient header + animated stat bars */}
      <div className="glass overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between px-5 py-3" style={{ backgroundImage: sky }}>
          <div className="flex items-center gap-2 text-sm text-ink">
            {g.phase === 'event' ? <Sun size={18} className="text-warn" /> : <Moon size={18} className="text-violet-soft" />}
            <span className="font-display font-semibold">Day {g.day} — {g.phase === 'event' ? 'Morning' : 'Camp, dusk'}</span>
          </div>
          <span className="text-xs text-dim">{g.phase === 'event' ? 'A situation unfolds' : `${3 - g.campUsed} camp action${3 - g.campUsed === 1 ? '' : 's'} left`}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3 p-5 sm:grid-cols-4">
          {bars.map(({ k, label, icon: Icon }) => (
            <div key={k} aria-label={`${label}: ${Math.round(g[k])} of 100`}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-dim"><Icon size={13} className={g[k] <= 20 ? 'text-danger' : 'text-violet-soft'} />{label}</span>
                <span className={g[k] <= 20 ? 'font-semibold text-danger' : 'text-dim'}>{Math.round(g[k])}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${barColor(g[k])}`} style={{ width: `${g[k]}%`, transition: 'width 0.6s ease, background-color 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs uppercase tracking-wider text-dim"><Backpack size={14} /> Inventory</span>
        {g.items.length === 0 && <span className="text-xs text-dim">Empty — search camps and trade.</span>}
        {g.items.map((it) => {
          const Icon = ITEMS[it].icon
          return it === 'medkit' ? (
            <button key={it} onClick={useMedkit} disabled={g.health >= 100 || !!g.outcome} aria-label="Use medkit, restores 30 health" className="glass glass-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-success disabled:opacity-40">
              <Icon size={14} /> Medkit <span className="text-dim">use +30 HP</span>
            </button>
          ) : (
            <span key={it} className="glass flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-cyan"><Icon size={14} /> {ITEMS[it].name}</span>
          )
        })}
      </div>

      {/* Situation card / camp */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {g.phase === 'event' && ev && (
            <motion.div key={`${g.day}-${ev.id}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="glass rounded-3xl p-5 sm:p-8">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-violet/20 p-3"><EvIcon size={24} className="text-violet-soft" /></div>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{ev.title}</h3>
                  <p className="mt-1 text-sm text-dim">{ev.text}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {ev.choices.map((c, i) => {
                  const locked = c.requires && !g.items.includes(c.requires)
                  const tired = (c.cost?.energy || 0) > g.energy
                  const disabled = locked || tired || !!g.outcome
                  return (
                    <button key={i} onClick={() => choose(i)} disabled={disabled} className="glass rounded-xl px-4 py-3 text-left text-sm hover:border-violet/60 disabled:opacity-40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-ink">{c.label}</span>
                        {c.risk && <span className="flex items-center gap-1 rounded-md bg-warn/15 px-2 py-0.5 text-[11px] text-warn"><AlertTriangle size={11} /> risky</span>}
                        {c.rescue && <span className="rounded-md bg-success/15 px-2 py-0.5 text-[11px] text-success">rescue</span>}
                      </div>
                      <div className="mt-1 text-xs text-dim">
                        {locked ? `Requires ${ITEMS[c.requires].name}` : tired ? 'Too exhausted' : [
                          c.cost?.energy ? `-${c.cost.energy} energy` : null,
                          c.cost?.food ? `-${c.cost.food} food` : null,
                          c.cost?.water ? `-${c.cost.water} water` : null,
                          c.risk ? 'outcome uncertain' : fxText(c.fx) || null,
                          c.items ? `find ${c.items.map((x) => ITEMS[x].name).join(' + ')}` : null,
                          c.uses ? `uses ${ITEMS[c.uses].name}` : null,
                        ].filter(Boolean).join(' · ') || 'no cost'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {g.phase === 'camp' && (
            <motion.div key={`camp-${g.day}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="glass rounded-3xl p-5 sm:p-8">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-warn" />
                <h3 className="font-display text-lg font-bold text-ink">Evening camp</h3>
              </div>
              <p className="mt-1 text-sm text-dim">Spend what energy you have left before night falls. Sleeping restores some energy, but food and water drain overnight{level === 2 ? ' — harshly, at this difficulty' : ''}.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {CAMP_ACTIONS.map((a) => {
                  const Icon = a.icon
                  const disabled = !!g.outcome || g.campUsed >= 3 || (a.id === 'rest' ? g.rested : g.energy < a.cost)
                  return (
                    <button key={a.id} onClick={() => camp(a.id)} disabled={disabled} className="glass rounded-xl px-4 py-3 text-left text-sm hover:border-violet/60 disabled:opacity-40">
                      <span className="flex items-center gap-2 text-ink"><Icon size={16} className="text-cyan" />{a.label}</span>
                      <span className="mt-1 block text-xs text-dim">{a.desc}{a.id === 'rest' && g.rested ? ' — used' : ''}</span>
                    </button>
                  )
                })}
              </div>
              <Button className="mt-5 w-full sm:w-auto" onClick={endDay} disabled={!!g.outcome}>
                <Moon size={16} /> {g.day >= target ? 'Sleep through the final night' : `Sleep → Day ${g.day + 1}`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event log */}
      <div className="glass mt-4 rounded-2xl p-4">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-dim"><Footprints size={13} /> Trail log</div>
        <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1 text-sm" aria-live="polite">
          {[...g.log].reverse().map((l, i) => (
            <li key={g.log.length - i} className={`rounded-lg px-3 py-1.5 ${l.tone === 'bad' ? 'bg-danger/10 text-danger' : l.tone === 'good' ? 'bg-success/10 text-success' : 'bg-white/5 text-dim'}`}>
              <span className="mr-2 text-[11px] uppercase opacity-60">D{l.day}</span>{l.text}
            </li>
          ))}
        </ul>
      </div>

      {g.outcome && !g.outcome.won && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger">
          <Skull size={18} /> {g.outcome.reason}.
        </div>
      )}
      {g.outcome?.won && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-success/50 bg-success/10 p-4 text-sm text-success">
          <Siren size={18} /> {g.outcome.reason === 'rescued' ? 'Rescued! You are going home.' : `You survived all ${target} days.`}
        </div>
      )}
    </Frame>
  )
}
