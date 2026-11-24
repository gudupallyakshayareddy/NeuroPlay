import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, Eye, SkipForward, Send, Sparkles, Check, X, Lightbulb } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, shuffle, clamp } from './ui.jsx'

const ROUNDS = 5
const CLUE_POINTS = [100, 80, 60, 40, 20] // points for guessing after N clues revealed
const WRONG_PENALTY = 15

// ---- Content bank: 21 identities, 5 ordered clues each (vague -> obvious) ----
const BANK = [
  {
    name: 'Albert Einstein', category: 'Famous person', aliases: ['einstein', 'albert einstein'],
    clues: [
      'I changed how humans think about time, mostly by thinking very hard about it.',
      'A short equation made me the most quoted scientist in history.',
      'I won a Nobel Prize, but not for the theory everyone associates with me.',
      'My wild hair and stuck-out tongue became the universal face of genius.',
      'I described gravity as curved spacetime, and wrote E = mc².',
    ],
    fact: 'In 1952 he was offered the presidency of Israel — he politely said no.',
  },
  {
    name: 'Cleopatra', category: 'Famous person', aliases: ['cleopatra', 'cleopatra vii'],
    clues: [
      'I ruled one of the richest kingdoms on Earth before it became a province.',
      'I spoke many languages and was the first of my dynasty to learn the local one.',
      'Two of the most powerful men in Rome fell for my politics — and for me.',
      'My story involves a river, a carpet, and a very dramatic snake.',
      'I was the last pharaoh of Egypt, allied with Julius Caesar and Mark Antony.',
    ],
    fact: 'She lived closer in time to the Moon landing than to the building of the Great Pyramid.',
  },
  {
    name: 'William Shakespeare', category: 'Famous person', aliases: ['shakespeare', 'the bard', 'bard', 'william shakespeare'],
    clues: [
      'I invented hundreds of words people still use without knowing it was me.',
      'My workplace was a round open-air building by a river in London.',
      'I killed off most of my main characters, sometimes in the last scene.',
      'To be, or not to be — that is my most famous question.',
      'I wrote Romeo and Juliet, Hamlet and Macbeth, and I am called the Bard.',
    ],
    fact: 'He invented or popularized words like "eyeball", "swagger" and "lonely".',
  },
  {
    name: 'Marie Curie', category: 'Famous person', aliases: ['curie', 'marie curie', 'madame curie', 'maria curie'],
    clues: [
      'My notebooks are still radioactive and kept in lead-lined boxes.',
      'I coined a term for a phenomenon that made atoms seem alive.',
      'I am the only person to win Nobel Prizes in two different sciences.',
      'I discovered two elements, one named after my homeland.',
      'I pioneered radioactivity research and discovered polonium and radium.',
    ],
    fact: 'During WWI she drove mobile X-ray vans to the front lines herself.',
  },
  {
    name: 'Leonardo da Vinci', category: 'Famous person', aliases: ['da vinci', 'leonardo', 'davinci', 'leonardo da vinci'],
    clues: [
      'My to-do lists from 500 years ago include "describe the tongue of a woodpecker".',
      'I designed flying machines, tanks and bridges that were never built in my lifetime.',
      'I wrote most of my notes backwards, readable only in a mirror.',
      'My most famous painting smiles at you from behind bulletproof glass.',
      'I painted the Mona Lisa and The Last Supper — the original Renaissance man.',
    ],
    fact: 'He could reportedly write with one hand while drawing with the other.',
  },
  {
    name: 'Neil Armstrong', category: 'Famous person', aliases: ['armstrong', 'neil armstrong'],
    clues: [
      'My biggest career moment lasted one small step.',
      'I was a test pilot before I got the most famous assignment in history.',
      'Millions watched me on grainy black-and-white television in 1969.',
      'I left footprints somewhere that has no wind to erase them.',
      'I was the first human to walk on the Moon, from Apollo 11.',
    ],
    fact: 'He was a quiet, humble man who rarely gave interviews about the Moon landing.',
  },
  {
    name: 'Penguin', category: 'Animal', aliases: ['penguin', 'the penguin', 'emperor penguin'],
    clues: [
      'I wear formal clothes every single day and never own a suit.',
      'I am a bird, but the sky is not where you will find me.',
      'I propose to my partner with a carefully chosen pebble.',
      'I waddle on land but fly underwater at 20 km/h.',
      'I am a black-and-white flightless bird of the Antarctic — happy feet.',
    ],
    fact: 'Emperor penguins can dive over 500 metres deep on a single breath.',
  },
  {
    name: 'Octopus', category: 'Animal', aliases: ['octopus', 'the octopus'],
    clues: [
      'I have three of something most animals have only one of: hearts.',
      'My blood is blue, and most of my neurons are not in my head.',
      'I can squeeze through any gap bigger than my only hard part.',
      'I taste things with my arms and edit my own RNA.',
      'I am an eight-armed sea creature that shoots ink and solves puzzles.',
    ],
    fact: 'Two-thirds of an octopus’s neurons live in its arms, so each arm can "think" alone.',
  },
  {
    name: 'Elephant', category: 'Animal', aliases: ['elephant', 'the elephant'],
    clues: [
      'I am the only animal with four knees — or so the old riddle claims.',
      'I mourn my dead and recognize myself in a mirror.',
      'My nose has over 40,000 muscles and can pick up a single blade of grass.',
      'I am the largest animal that walks on land, and I never forget (allegedly).',
      'I am the big grey animal with a trunk, tusks and enormous ears.',
    ],
    fact: 'Elephants "hear" distant rumbles through their feet, sensing vibrations in the ground.',
  },
  {
    name: 'Honeybee', category: 'Animal', aliases: ['bee', 'honeybee', 'honey bee', 'the bee'],
    clues: [
      'I do a dance to give directions, and it actually works.',
      'One third of the food you eat exists because of my work.',
      'I visit up to 5,000 flowers a day and report back with coordinates.',
      'I make a golden food that never spoils — archaeologists have eaten 3,000-year-old jars.',
      'I am the striped pollinator that lives in a hive and makes honey.',
    ],
    fact: 'To make one jar of honey, a colony flies the equivalent of several trips around Earth.',
  },
  {
    name: 'Chameleon', category: 'Animal', aliases: ['chameleon', 'the chameleon'],
    clues: [
      'My eyes work independently — I can watch two things at once.',
      'My tongue is longer than my body and launches like a catapult.',
      'I change color mostly to talk, not to hide.',
      'I walk in slow-motion rocking steps that mimic a leaf in the wind.',
      'I am the color-changing lizard with swiveling eyes and a sticky tongue.',
    ],
    fact: 'Their color changes signal mood and temperature more often than camouflage.',
  },
  {
    name: 'Eiffel Tower', category: 'Object / place', aliases: ['eiffel tower', 'the eiffel tower', 'tour eiffel', 'eiffel'],
    clues: [
      'I was supposed to be temporary and was nearly scrapped after 20 years.',
      'I grow about 15 cm taller in summer because heat expands my metal.',
      'I was the tallest thing humans had ever built when I opened in 1889.',
      'Parisians once called me a useless iron monstrosity; now I am their symbol.',
      'I am the 330-metre iron lattice tower on the Champ de Mars in Paris.',
    ],
    fact: 'It was saved from demolition because it made a perfect radio antenna.',
  },
  {
    name: 'Piano', category: 'Object', aliases: ['piano', 'the piano', 'grand piano'],
    clues: [
      'I am percussion and strings at the same time, depending on who you ask.',
      'I have 88 of something, split into two colors.',
      'My full name means "soft-loud" in Italian, because I can do both.',
      'Inside me, little felt hammers strike strings when you press my keys.',
      'I am the big keyboard instrument with black and white keys — a grand one has a curved body.',
    ],
    fact: 'A piano has over 12,000 parts, about 10,000 of which move.',
  },
  {
    name: 'Compass', category: 'Object', aliases: ['compass', 'magnetic compass', 'the compass'],
    clues: [
      'I have a needle, but I have never sewn anything.',
      'I always know where I am pointing, even when you are completely lost.',
      'I was invented in China, first for fortune-telling, later for navigation.',
      'My red tip chases the north like it is homesick.',
      'I am the little device with a spinning magnetic needle that points north.',
    ],
    fact: 'The first compasses were carved from lodestone and used for feng shui, not sailing.',
  },
  {
    name: 'Smartphone', category: 'Object', aliases: ['smartphone', 'smart phone', 'phone', 'cell phone', 'mobile phone', 'iphone', 'mobile'],
    clues: [
      'You probably touched me within five minutes of waking up today.',
      'I have more computing power than the machines that landed humans on the Moon.',
      'I am a camera, a map, a library and a slot machine, all in your pocket.',
      'People panic more when they lose me than when they lose their wallet.',
      'I am the touchscreen rectangle you are probably reading this on right now.',
    ],
    fact: 'The average person taps, swipes or types on their phone over 2,600 times a day.',
  },
  {
    name: 'Refrigerator', category: 'Object', aliases: ['refrigerator', 'fridge', 'the fridge', 'freezer'],
    clues: [
      'I hum all day and night, and you only notice me when I stop.',
      'I am the most opened thing in your house that is not a door.',
      'I keep a little winter trapped inside a metal box.',
      'You open me hoping new food has appeared, then lower your standards.',
      'I am the kitchen appliance that keeps food cold — the fridge.',
    ],
    fact: 'Before electric fridges, people bought blocks of ice delivered by horse cart.',
  },
  {
    name: 'Sherlock Holmes', category: 'Fictional character', aliases: ['sherlock', 'holmes', 'sherlock holmes'],
    clues: [
      'I never existed, yet I have a museum and thousands of letters sent to my address.',
      'My best friend is a doctor who writes down everything I do.',
      'I notice the mud on your shoes before you notice my hat.',
      'I live at 221B Baker Street and play the violin when I am thinking.',
      'I am the deerstalker-wearing detective created by Arthur Conan Doyle — elementary.',
    ],
    fact: 'He is the most-portrayed human literary character in film history.',
  },
  {
    name: 'Harry Potter', category: 'Fictional character', aliases: ['harry', 'potter', 'harry potter', 'the boy who lived'],
    clues: [
      'I am famous in my world for something that happened when I was one year old.',
      'I inherited a cloak, a map and a very complicated destiny.',
      'My scar is the most recognized lightning bolt in literature.',
      'I play a sport on a broomstick and catch a tiny golden ball.',
      'I am the boy who lived, the wizard with round glasses from Hogwarts.',
    ],
    fact: 'The books have been translated into over 80 languages, including Latin and Ancient Greek.',
  },
  {
    name: 'Darth Vader', category: 'Fictional character', aliases: ['vader', 'darth vader', 'anakin', 'anakin skywalker'],
    clues: [
      'My breathing is more famous than most singers’ voices.',
      'I was chosen to bring balance, and technically I did — eventually.',
      'My employer built a moon-sized weapon; I mostly force-choked middle management.',
      'I am someone’s father, which was the biggest plot twist of 1980.',
      'I am the black-armored Sith lord from Star Wars with the red lightsaber.',
    ],
    fact: 'The breathing sound was made by breathing through a scuba regulator.',
  },
  {
    name: 'Pikachu', category: 'Fictional character', aliases: ['pikachu', 'pika'],
    clues: [
      'I say my own name, and somehow everyone understands me.',
      'I refuse to live inside the thing designed to hold me.',
      'I am the mascot of the highest-grossing media franchise ever.',
      'I store electricity in my red cheeks and hate ketchup.',
      'I am the yellow electric mouse Pokémon that shocks people with thunderbolts.',
    ],
    fact: 'Pikachu’s design was inspired by a squirrel, not a mouse, according to its designer.',
  },
  {
    name: 'Batman', category: 'Fictional character', aliases: ['batman', 'bruce wayne', 'the dark knight', 'bat man'],
    clues: [
      'I have no superpowers — just trauma, money and excellent gadgets.',
      'My city is fictional but its crime rate feels very real.',
      'My butler is arguably the most competent person in my entire operation.',
      'I drive a car named after myself and answer to a signal in the sky.',
      'I am the caped crusader of Gotham, also known as the Dark Knight.',
    ],
    fact: 'Batman’s first appearance in 1939 had him carrying a gun — quickly dropped by the writers.',
  },
]

// ---- Fuzzy matching helpers ----
const normalize = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
function lev(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}
function matches(guess, identity) {
  const g = normalize(guess)
  if (!g) return false
  const candidates = [identity.name, ...identity.aliases].map(normalize)
  for (const c of candidates) {
    if (g === c) return true
    if (c.length > 5 && g.length > 3 && lev(g, c) <= 2) return true
    // also accept a close match on any long word of the name ("einstein" for "albert einstein")
    for (const w of c.split(' ')) if (w.length > 5 && g.length > 3 && lev(g, w) <= 2) return true
  }
  return false
}

export default function WhoAmI({ level = 0, onFinish }) {
  const startClues = level >= 2 ? 2 : 1 // hard mode opens on clue 2 (vaguer start removed)
  const maxPossible = ROUNDS * CLUE_POINTS[startClues - 1]
  const [deck] = useState(() => shuffle(BANK).slice(0, ROUNDS))
  const [n, setN] = useState(0)
  const [clues, setClues] = useState(startClues)
  const [status, setStatus] = useState('play') // play | done
  const [outcome, setOutcome] = useState(null) // correct | wrong | skip
  const [earned, setEarned] = useState(0)
  const [guess, setGuess] = useState('')
  const [flash, setFlash] = useState(null) // wrong-guess feedback
  const [score, setScore] = useState(0)
  const [tally, setTally] = useState({ correct: 0, wrong: 0, skips: 0, best: 0 })
  const finishedRef = useRef(false)

  const identity = deck[n]

  const endRound = (result, pts) => {
    setStatus('done'); setOutcome(result); setEarned(pts); setFlash(null); setGuess('')
    setScore((s) => s + pts)
    setTally((t) => ({
      correct: t.correct + (result === 'correct' ? 1 : 0),
      wrong: t.wrong, skips: t.skips + (result === 'skip' ? 1 : 0),
      best: Math.max(t.best, pts),
    }))
  }

  const submit = () => {
    if (status !== 'play' || !guess.trim()) return
    if (matches(guess, identity)) {
      endRound('correct', CLUE_POINTS[clues - 1])
    } else {
      setScore((s) => s - WRONG_PENALTY)
      setTally((t) => ({ ...t, wrong: t.wrong + 1 }))
      setGuess('')
      if (clues < 5) {
        setClues(clues + 1)
        setFlash(`Not quite. −${WRONG_PENALTY} points — a new clue appeared.`)
      } else {
        endRound('wrong', 0)
      }
    }
  }

  const reveal = () => { if (status === 'play' && clues < 5) { setClues(clues + 1); setFlash(null) } }
  const skip = () => { if (status === 'play') endRound('skip', 0) }

  const next = () => {
    if (n + 1 >= ROUNDS) {
      if (finishedRef.current) return
      finishedRef.current = true
      const final = Math.max(0, score)
      onFinish({
        score: final, rating: clamp(final / maxPossible, 0, 1), won: final >= 300,
        summary: `Identified ${tally.correct} of ${ROUNDS} mysteries for ${final} points.`,
        stats: [
          { label: 'Solved', value: `${tally.correct}/${ROUNDS}` },
          { label: 'Wrong guesses', value: tally.wrong },
          { label: 'Skipped', value: tally.skips },
          { label: 'Best round', value: tally.best },
        ],
      })
      return
    }
    setN(n + 1); setClues(startClues); setStatus('play'); setOutcome(null); setEarned(0); setGuess(''); setFlash(null)
  }

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3">
        <Stat label="Round" value={`${n + 1}/${ROUNDS}`} />
        <Stat label="Clues" value={`${clues}/5`} />
        <Stat label="Score" value={score} tone={score < 0 ? 'text-danger' : ''} />
      </div>

      <div className="glass rounded-3xl p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-dim">
            <HelpCircle size={18} className="text-violet-soft" aria-hidden="true" />
            <span>Who (or what) am I?</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-dim">{identity.category}</span>
        </div>

        <ul className="mt-4 space-y-2" aria-label="Revealed clues">
          <AnimatePresence initial={false}>
            {identity.clues.slice(0, clues).map((c, i) => (
              <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 rounded-xl bg-white/5 p-3 text-sm">
                <span className="font-display font-bold text-violet-soft">{i + 1}</span>
                <span className={i === clues - 1 ? 'text-ink' : 'text-dim'}>{c}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {status === 'play' && (
          <>
            <div className="mt-5 flex gap-2">
              <input value={guess} onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                placeholder="Type your guess…" autoComplete="off" aria-label="Your guess"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-void/60 px-4 py-3 text-sm outline-none focus:border-violet" />
              <Button onClick={submit} disabled={!guess.trim()} aria-label="Submit guess"><Send size={16} /> Guess</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={reveal} disabled={clues >= 5}>
                <Eye size={15} /> {clues >= 5 ? 'All clues shown' : `Reveal clue ${clues + 1}`}
              </Button>
              <Button variant="ghost" size="sm" onClick={skip}><SkipForward size={15} /> Skip (0 pts)</Button>
              <span className="ml-auto text-xs text-dim">
                {clues < 5 ? `Guess now for ${CLUE_POINTS[clues - 1]} pts` : `Last chance: ${CLUE_POINTS[4]} pts`}
              </span>
            </div>
            {flash && <p className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">{flash}</p>}
            <p className="mt-3 text-xs text-dim">Wrong guess: −{WRONG_PENALTY} points and the next clue is revealed. Fewer clues = more points.</p>
          </>
        )}

        {status === 'done' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-5 rounded-2xl border p-4 ${outcome === 'correct' ? 'border-success/50 bg-success/10' : outcome === 'skip' ? 'border-white/15 bg-white/5' : 'border-danger/50 bg-danger/10'}`}>
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              {outcome === 'correct' ? <Check size={20} className="text-success" aria-hidden="true" /> : <X size={20} className={outcome === 'skip' ? 'text-dim' : 'text-danger'} aria-hidden="true" />}
              {identity.name}
              <span className={`ml-auto text-base ${earned > 0 ? 'text-success' : 'text-dim'}`}>{earned > 0 ? `+${earned}` : '+0'}</span>
            </div>
            <p className="mt-1 text-sm text-dim">
              {outcome === 'correct' ? `Solved after ${clues} clue${clues > 1 ? 's' : ''}.` : outcome === 'skip' ? 'Skipped — no points, no penalty.' : 'Out of clues and guesses.'}
            </p>
            <p className="mt-2 flex gap-2 text-sm"><Lightbulb size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" /><span className="text-dim">{identity.fact}</span></p>
            <Button className="mt-4" onClick={next}>
              <Sparkles size={16} /> {n + 1 >= ROUNDS ? 'See results' : 'Next identity'}
            </Button>
          </motion.div>
        )}
      </div>
    </Frame>
  )
}
