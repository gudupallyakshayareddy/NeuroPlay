import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PenLine, Send, Loader2, Trophy, Bot, WifiOff, Timer, Sparkles } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, shuffle, clamp } from './ui.jsx'
import { api } from '../api.js'
import useCountdown from '../engine/useCountdown'

const ROUNDS = 4
const TIME = 60
const MAX_CHARS = 140

// ---- Authored scenario bank (12 scenes, each with 2 rival captions) ----
const SCENES = [
  {
    id: 'cat-interview', prompt: 'A cat is at a job interview. Its résumé lists "naps" under skills.',
    rivals: [
      { text: 'References available upon meow.', score: 72, verdict: 'Short, punchy, and perfectly in character.' },
      { text: 'Five years of experience knocking things off desks.', score: 78, verdict: 'Turns a cat flaw into a résumé strength. Clever.' },
    ],
  },
  {
    id: 'dog-pilot', prompt: 'A dog is piloting a passenger plane and just announced turbulence.',
    rivals: [
      { text: 'Please fasten your seatbelts. I chased the autopilot off.', score: 80, verdict: 'Dog logic meets cockpit announcements. Excellent.' },
      { text: 'We will be landing shortly. Or fetching. One of those.', score: 66, verdict: 'A solid pun, if a little predictable.' },
    ],
  },
  {
    id: 'robot-date', prompt: 'A robot is on a first date and trying very hard to flirt.',
    rivals: [
      { text: 'Are you Wi-Fi? Because I am feeling a connection.', score: 74, verdict: 'A classic, delivered with mechanical sincerity.' },
      { text: 'I downloaded 400 pickup lines and chose the worst one.', score: 69, verdict: 'Self-aware robot humor. Charming.' },
    ],
  },
  {
    id: 'penguin-beach', prompt: 'A penguin is working as a lifeguard at a very sunny beach.',
    rivals: [
      { text: 'No running. No diving. No melting.', score: 71, verdict: 'The rule-of-three escalation lands well.' },
      { text: 'I am on duty. The duty is standing here looking formal.', score: 63, verdict: 'Dry humor from a bird in a tuxedo.' },
    ],
  },
  {
    id: 'grandma-esports', prompt: 'A grandma just won the world esports championship.',
    rivals: [
      { text: 'GG, kids. I was fragging before your parents met.', score: 82, verdict: 'Trash talk from the elderly. Devastating.' },
      { text: 'My secret? Decades of bingo. Same skills, better loot.', score: 76, verdict: 'A genuinely insightful joke about transferable skills.' },
    ],
  },
  {
    id: 'alien-dmv', prompt: 'An alien is at the DMV trying to renew its spaceship license.',
    rivals: [
      { text: 'Take a number. Our galaxy is 40 million numbers behind.', score: 70, verdict: 'Bureaucracy is universal. Good scale joke.' },
      { text: 'Parallel parking is hard when your car has 11 dimensions.', score: 67, verdict: 'Nerdy and specific. Works.' },
    ],
  },
  {
    id: 'fish-ted', prompt: 'A goldfish is giving a TED talk about memory.',
    rivals: [
      { text: 'I forgot my point three seconds ago. Thank you.', score: 79, verdict: 'The shortest possible TED talk. Perfect.' },
      { text: 'They say we remember nothing. I say… what was I saying?', score: 73, verdict: 'Self-demonstrating humor. Nicely done.' },
    ],
  },
  {
    id: 'skeleton-gym', prompt: 'A skeleton is at the gym. It is leg day.',
    rivals: [
      { text: 'No pain, no gain. Mostly no muscles either.', score: 68, verdict: 'An honest gym slogan for the anatomically challenged.' },
      { text: 'I am just here to work on my bone density. Again.', score: 61, verdict: 'A quiet, sensible joke. Respectable.' },
    ],
  },
  {
    id: 'toddler-ceo', prompt: 'A toddler is the CEO and has called a board meeting about snacks.',
    rivals: [
      { text: 'Q3 goals: more juice boxes. Any questions? Nap time.', score: 77, verdict: 'Corporate structure meets toddler priorities. Great.' },
      { text: 'The board is sticky. The board is also me.', score: 64, verdict: 'Absurdist and a little dark. Funny.' },
    ],
  },
  {
    id: 'snail-speeding', prompt: 'A snail has been pulled over for speeding.',
    rivals: [
      { text: 'Officer, I swear I was going at least 0.003 mph.', score: 75, verdict: 'Absurd precision makes this one shine.' },
      { text: 'Do you know how fast you were going? Neither do I. Ever.', score: 62, verdict: 'A gentle twist on the cop cliché.' },
    ],
  },
  {
    id: 'octopus-chef', prompt: 'An octopus is a head chef running eight pans at once.',
    rivals: [
      { text: 'Eight arms, eight pans, zero health inspections passed.', score: 72, verdict: 'The escalation to the inspection is the punchline. Good.' },
      { text: 'Yes, I can take your order, your complaint, and your coat.', score: 66, verdict: 'Multitasking humor, efficiently delivered.' },
    ],
  },
  {
    id: 'ghost-review', prompt: 'A ghost is leaving a one-star review of a haunted house.',
    rivals: [
      { text: 'I have died twice and this place still bores me.', score: 69, verdict: 'A professional critic speaks. Solid.' },
      { text: 'One star. The chains are plastic and the fog is a vape.', score: 81, verdict: 'Specific, modern, and brutally funny.' },
    ],
  },
]

// ---- Simple geometric SVG illustrations (game art) ----
function SceneArt({ id }) {
  const common = { viewBox: '0 0 200 120', className: 'mx-auto w-full max-w-[280px]', role: 'img', 'aria-label': 'Scene illustration' }
  switch (id) {
    case 'cat-interview': return (
      <svg {...common}>
        <rect x="20" y="78" width="160" height="10" rx="3" fill="#8b6f47" />
        <rect x="30" y="88" width="8" height="26" fill="#6b5436" /><rect x="162" y="88" width="8" height="26" fill="#6b5436" />
        <ellipse cx="60" cy="66" rx="18" ry="14" fill="#f2a65a" />
        <circle cx="60" cy="44" r="13" fill="#f2a65a" />
        <path d="M50 36 L48 24 L58 32 Z" fill="#f2a65a" /><path d="M70 36 L72 24 L62 32 Z" fill="#f2a65a" />
        <circle cx="55" cy="42" r="2" fill="#2b2118" /><circle cx="65" cy="42" r="2" fill="#2b2118" />
        <path d="M78 70 Q94 60 92 78" stroke="#f2a65a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="96" y="70" width="22" height="8" rx="1" fill="#f5f0e6" />
        <circle cx="145" cy="42" r="12" fill="#e8c39e" /><rect x="132" y="54" width="26" height="24" rx="6" fill="#3d5a80" />
        <path d="M145 54 L141 66 L145 74 L149 66 Z" fill="#c1121f" />
      </svg>
    )
    case 'dog-pilot': return (
      <svg {...common}>
        <circle cx="100" cy="58" r="46" fill="#1b2a4a" stroke="#8ecae6" strokeWidth="4" />
        <ellipse cx="80" cy="44" rx="14" ry="7" fill="#e8f1f8" /><ellipse cx="118" cy="70" rx="16" ry="8" fill="#e8f1f8" />
        <circle cx="100" cy="62" r="16" fill="#c68b59" />
        <ellipse cx="86" cy="60" rx="6" ry="12" fill="#8a5a33" /><ellipse cx="114" cy="60" rx="6" ry="12" fill="#8a5a33" />
        <circle cx="95" cy="60" r="2.5" fill="#2b2118" /><circle cx="105" cy="60" r="2.5" fill="#2b2118" />
        <ellipse cx="100" cy="68" rx="4" ry="3" fill="#2b2118" />
        <rect x="86" y="42" width="28" height="7" rx="3" fill="#22335c" /><rect x="92" y="36" width="16" height="8" rx="2" fill="#22335c" />
        <rect x="96" y="38" width="8" height="3" fill="#ffd166" />
        <path d="M70 96 Q100 108 130 96" stroke="#8ecae6" strokeWidth="4" fill="none" />
      </svg>
    )
    case 'robot-date': return (
      <svg {...common}>
        <rect x="60" y="80" width="80" height="8" rx="3" fill="#7a4a2b" /><rect x="96" y="88" width="8" height="26" fill="#5c371f" />
        <rect x="42" y="46" width="26" height="22" rx="5" fill="#9aa5b1" />
        <line x1="55" y1="46" x2="55" y2="36" stroke="#9aa5b1" strokeWidth="3" /><circle cx="55" cy="33" r="4" fill="#ef476f" />
        <circle cx="50" cy="55" r="3" fill="#06d6a0" /><circle cx="60" cy="55" r="3" fill="#06d6a0" />
        <rect x="46" y="68" width="18" height="14" rx="4" fill="#6c7a89" />
        <rect x="132" y="48" width="24" height="20" rx="5" fill="#e8c39e" /><rect x="136" y="68" width="16" height="14" rx="4" fill="#b56576" />
        <path d="M100 40 C96 32 84 34 88 44 C90 50 100 56 100 56 C100 56 110 50 112 44 C116 34 104 32 100 40 Z" fill="#ef476f" />
        <line x1="100" y1="80" x2="100" y2="66" stroke="#f5f0e6" strokeWidth="4" /><ellipse cx="100" cy="62" rx="3" ry="5" fill="#ffd166" />
      </svg>
    )
    case 'penguin-beach': return (
      <svg {...common}>
        <circle cx="164" cy="26" r="14" fill="#ffd166" />
        <g stroke="#ffd166" strokeWidth="3" strokeLinecap="round">
          <line x1="164" y1="4" x2="164" y2="10" /><line x1="186" y1="26" x2="192" y2="26" /><line x1="180" y1="10" x2="184" y2="6" /><line x1="180" y1="42" x2="184" y2="46" />
        </g>
        <rect x="0" y="92" width="200" height="28" fill="#e9c46a" />
        <path d="M20 92 Q60 40 100 92 Z" fill="#ef476f" /><line x1="60" y1="66" x2="60" y2="104" stroke="#7a4a2b" strokeWidth="4" />
        <ellipse cx="136" cy="76" rx="16" ry="22" fill="#22335c" />
        <ellipse cx="136" cy="82" rx="10" ry="14" fill="#f5f0e6" />
        <circle cx="131" cy="62" r="2" fill="#f5f0e6" /><circle cx="141" cy="62" r="2" fill="#f5f0e6" />
        <path d="M133 66 L139 66 L136 72 Z" fill="#f2a65a" />
        <path d="M120 74 Q112 82 118 92" stroke="#22335c" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="150" cy="86" r="4" fill="#c0c8d0" /><line x1="150" y1="86" x2="158" y2="82" stroke="#c0c8d0" strokeWidth="2" />
      </svg>
    )
    case 'grandma-esports': return (
      <svg {...common}>
        <rect x="52" y="34" width="70" height="44" rx="4" fill="#1b2a4a" stroke="#8ecae6" strokeWidth="3" />
        <rect x="80" y="78" width="14" height="8" fill="#3d5a80" /><rect x="66" y="86" width="42" height="5" rx="2" fill="#3d5a80" />
        <path d="M62 66 L74 54 L84 62 L98 46 L110 58" stroke="#06d6a0" strokeWidth="3" fill="none" />
        <circle cx="150" cy="52" r="13" fill="#e8c39e" /><circle cx="150" cy="38" r="7" fill="#c0c8d0" />
        <circle cx="145" cy="52" r="4" fill="none" stroke="#22335c" strokeWidth="2" /><circle cx="155" cy="52" r="4" fill="none" stroke="#22335c" strokeWidth="2" />
        <rect x="138" y="65" width="24" height="22" rx="6" fill="#b56576" />
        <path d="M28 40 L44 40 L42 56 Q36 62 30 56 Z" fill="#ffd166" /><rect x="33" y="60" width="6" height="8" fill="#e0a800" /><rect x="28" y="68" width="16" height="4" rx="2" fill="#e0a800" />
        <rect x="20" y="16" width="5" height="5" fill="#ef476f" /><rect x="120" y="14" width="5" height="5" fill="#06d6a0" /><rect x="176" y="20" width="5" height="5" fill="#8ecae6" /><rect x="90" y="12" width="5" height="5" fill="#ffd166" />
      </svg>
    )
    case 'alien-dmv': return (
      <svg {...common}>
        <rect x="0" y="84" width="200" height="36" fill="#3d5a80" /><rect x="0" y="80" width="200" height="6" fill="#8ecae6" />
        <ellipse cx="60" cy="58" rx="18" ry="22" fill="#06d6a0" />
        <ellipse cx="52" cy="54" rx="5" ry="8" fill="#22335c" /><ellipse cx="68" cy="54" rx="5" ry="8" fill="#22335c" />
        <line x1="52" y1="38" x2="48" y2="28" stroke="#06d6a0" strokeWidth="3" /><circle cx="47" cy="25" r="3" fill="#ef476f" />
        <line x1="68" y1="38" x2="72" y2="28" stroke="#06d6a0" strokeWidth="3" /><circle cx="73" cy="25" r="3" fill="#ef476f" />
        <rect x="86" y="70" width="26" height="12" rx="2" fill="#f5f0e6" />
        <rect x="130" y="24" width="52" height="24" rx="4" fill="#1b2a4a" stroke="#ffd166" strokeWidth="2" />
        <text x="156" y="41" textAnchor="middle" fill="#ffd166" fontSize="13" fontFamily="monospace">A-97</text>
        <circle cx="156" cy="66" r="10" fill="#e8c39e" /><rect x="146" y="76" width="20" height="8" rx="3" fill="#6c7a89" />
      </svg>
    )
    case 'fish-ted': return (
      <svg {...common}>
        <rect x="0" y="96" width="200" height="24" fill="#22335c" />
        <rect x="120" y="60" width="34" height="36" rx="3" fill="#7a4a2b" /><rect x="116" y="56" width="42" height="6" rx="2" fill="#8b6f47" />
        <circle cx="80" cy="72" r="24" fill="#8ecae6" opacity="0.35" stroke="#8ecae6" strokeWidth="3" />
        <path d="M58 78 Q80 88 102 78 L102 90 Q80 100 58 90 Z" fill="#8ecae6" opacity="0.5" />
        <ellipse cx="78" cy="72" rx="10" ry="6" fill="#f2a65a" /><path d="M88 72 L96 66 L96 78 Z" fill="#f2a65a" />
        <circle cx="73" cy="70" r="1.8" fill="#2b2118" />
        <rect x="20" y="20" width="52" height="20" rx="4" fill="#c1121f" />
        <text x="46" y="35" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="sans-serif">TED</text>
        <line x1="137" y1="56" x2="137" y2="44" stroke="#c0c8d0" strokeWidth="3" /><circle cx="137" cy="41" r="4" fill="#6c7a89" />
      </svg>
    )
    case 'skeleton-gym': return (
      <svg {...common}>
        <rect x="0" y="100" width="200" height="20" fill="#22335c" />
        <circle cx="100" cy="34" r="14" fill="#f5f0e6" />
        <circle cx="94" cy="32" r="4" fill="#22335c" /><circle cx="106" cy="32" r="4" fill="#22335c" />
        <rect x="96" y="40" width="8" height="4" fill="#f5f0e6" />
        <line x1="100" y1="48" x2="100" y2="78" stroke="#f5f0e6" strokeWidth="5" />
        <g stroke="#f5f0e6" strokeWidth="3" strokeLinecap="round">
          <line x1="88" y1="56" x2="112" y2="56" /><line x1="88" y1="63" x2="112" y2="63" /><line x1="90" y1="70" x2="110" y2="70" />
          <line x1="100" y1="52" x2="76" y2="64" /><line x1="100" y1="52" x2="124" y2="64" />
          <line x1="100" y1="78" x2="88" y2="98" /><line x1="100" y1="78" x2="112" y2="98" />
        </g>
        <line x1="40" y1="64" x2="160" y2="64" stroke="#c0c8d0" strokeWidth="4" />
        <rect x="34" y="52" width="8" height="24" rx="2" fill="#6c7a89" /><rect x="158" y="52" width="8" height="24" rx="2" fill="#6c7a89" />
        <rect x="26" y="56" width="6" height="16" rx="2" fill="#3d5a80" /><rect x="168" y="56" width="6" height="16" rx="2" fill="#3d5a80" />
      </svg>
    )
    case 'toddler-ceo': return (
      <svg {...common}>
        <ellipse cx="100" cy="92" rx="80" ry="16" fill="#7a4a2b" />
        <circle cx="100" cy="52" r="14" fill="#e8c39e" />
        <circle cx="94" cy="50" r="2" fill="#2b2118" /><circle cx="106" cy="50" r="2" fill="#2b2118" />
        <circle cx="100" cy="58" r="4" fill="#ef476f" /><circle cx="100" cy="58" r="1.6" fill="#b56576" />
        <rect x="88" y="66" width="24" height="18" rx="6" fill="#8ecae6" />
        <rect x="30" y="30" width="34" height="26" rx="3" fill="#f5f0e6" />
        <path d="M34 50 L42 42 L48 46 L60 34" stroke="#06d6a0" strokeWidth="3" fill="none" />
        <rect x="146" y="56" width="16" height="22" rx="2" fill="#ffd166" /><line x1="154" y1="56" x2="160" y2="44" stroke="#ef476f" strokeWidth="3" />
        <circle cx="52" cy="86" r="8" fill="#e8c39e" /><circle cx="150" cy="86" r="8" fill="#e8c39e" />
      </svg>
    )
    case 'snail-speeding': return (
      <svg {...common}>
        <rect x="0" y="88" width="200" height="32" fill="#3a3f4b" />
        <g stroke="#ffd166" strokeWidth="3" strokeDasharray="12 10"><line x1="0" y1="104" x2="200" y2="104" /></g>
        <path d="M50 88 Q50 74 66 74 L96 74 Q104 74 104 88 Z" fill="#e9c46a" />
        <circle cx="70" cy="62" r="18" fill="#b56576" /><circle cx="70" cy="62" r="11" fill="none" stroke="#7d3c4a" strokeWidth="3" /><circle cx="70" cy="62" r="4" fill="#7d3c4a" />
        <line x1="98" y1="74" x2="104" y2="60" stroke="#e9c46a" strokeWidth="4" /><circle cx="105" cy="57" r="3" fill="#2b2118" />
        <g stroke="#8ecae6" strokeWidth="3" strokeLinecap="round"><line x1="20" y1="70" x2="38" y2="70" /><line x1="14" y1="80" x2="34" y2="80" /></g>
        <rect x="140" y="40" width="34" height="24" rx="4" fill="#f5f0e6" stroke="#c1121f" strokeWidth="3" />
        <text x="157" y="57" textAnchor="middle" fill="#22335c" fontSize="12" fontWeight="bold" fontFamily="monospace">0.003</text>
        <rect x="146" y="28" width="10" height="8" rx="2" fill="#ef476f" /><rect x="158" y="28" width="10" height="8" rx="2" fill="#3d5a80" />
      </svg>
    )
    case 'octopus-chef': return (
      <svg {...common}>
        <rect x="0" y="92" width="200" height="28" fill="#3d5a80" />
        <ellipse cx="100" cy="52" rx="22" ry="20" fill="#b56576" />
        <circle cx="92" cy="50" r="3" fill="#f5f0e6" /><circle cx="108" cy="50" r="3" fill="#f5f0e6" />
        <rect x="86" y="24" width="28" height="12" rx="3" fill="#f5f0e6" /><circle cx="90" cy="22" r="6" fill="#f5f0e6" /><circle cx="100" cy="19" r="7" fill="#f5f0e6" /><circle cx="110" cy="22" r="6" fill="#f5f0e6" />
        <g stroke="#b56576" strokeWidth="6" fill="none" strokeLinecap="round">
          <path d="M82 66 Q60 74 44 88" /><path d="M90 70 Q76 82 66 92" /><path d="M110 70 Q124 82 134 92" /><path d="M118 66 Q140 74 156 88" />
        </g>
        <ellipse cx="42" cy="90" rx="14" ry="5" fill="#6c7a89" /><line x1="28" y1="90" x2="18" y2="86" stroke="#6c7a89" strokeWidth="4" />
        <ellipse cx="100" cy="94" rx="14" ry="5" fill="#6c7a89" /><ellipse cx="158" cy="90" rx="14" ry="5" fill="#6c7a89" /><line x1="172" y1="90" x2="182" y2="86" stroke="#6c7a89" strokeWidth="4" />
        <ellipse cx="42" cy="86" rx="6" ry="3" fill="#ffd166" /><ellipse cx="158" cy="86" rx="6" ry="3" fill="#ef476f" />
      </svg>
    )
    default: return ( // ghost-review
      <svg {...common}>
        <rect x="120" y="50" width="60" height="50" fill="#22335c" /><path d="M114 50 L150 22 L186 50 Z" fill="#3d5a80" />
        <rect x="142" y="70" width="16" height="30" fill="#1b2a4a" /><rect x="126" y="58" width="12" height="12" fill="#ffd166" opacity="0.7" />
        <path d="M50 34 Q50 12 70 12 Q90 12 90 34 L90 78 L82 70 L74 78 L66 70 L58 78 L50 70 Z" fill="#e8f1f8" opacity="0.9" />
        <circle cx="63" cy="34" r="4" fill="#22335c" /><circle cx="77" cy="34" r="4" fill="#22335c" />
        <path d="M63 48 Q70 44 77 48" stroke="#22335c" strokeWidth="3" fill="none" />
        <rect x="20" y="88" width="70" height="24" rx="4" fill="#f5f0e6" />
        <path d="M30 96 L32 101 L37 101 L33 104 L35 109 L30 106 L25 109 L27 104 L23 101 L28 101 Z" fill="#ffd166" />
        <g stroke="#c0c8d0" strokeWidth="2"><line x1="44" y1="96" x2="82" y2="96" /><line x1="44" y1="102" x2="76" y2="102" /></g>
      </svg>
    )
  }
}

// ---- Offline heuristic judge (honest, deterministic, 30-85 for real captions) ----
function localJudge(caption) {
  const text = caption.trim()
  const len = text.length
  let s = 40
  if (len >= 40 && len <= 100) s += 20
  else if (len >= 20 && len <= 120) s += 10
  else if (len < 15) s -= 10
  const words = text.toLowerCase().match(/[a-z']+/g) || []
  const variety = words.length ? new Set(words).size / words.length : 0
  s += Math.round(variety * 15)
  const lower = text.toLowerCase()
  const wit = ['but', 'plot twist', 'meanwhile', 'except', 'however', 'actually', 'somehow', 'nobody', 'pov', 'when you', 'still', 'never', 'always', 'technically']
  s += Math.min(15, wit.filter((w) => lower.includes(w)).length * 5)
  const letters = text.replace(/[^a-zA-Z]/g, '')
  if (letters.length > 8 && letters === letters.toUpperCase()) s -= 15
  const score = clamp(Math.round(s), 30, 85)
  const verdict = score >= 70 ? 'Offline judge: tight wording and a real punchline.'
    : score >= 50 ? 'Offline judge: a decent gag — sharpen the twist.'
      : 'Offline judge: the idea is there, the punch is not.'
  return { score, verdict }
}

export default function CaptionBattle({ onFinish }) {
  const [rounds] = useState(() => shuffle(SCENES).slice(0, ROUNDS).map((scene) => ({ scene, rival: scene.rivals[Math.floor(Math.random() * scene.rivals.length)] })))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('write') // write | judging | result
  const [caption, setCaption] = useState('')
  const [results, setResults] = useState([]) // { player: {score, verdict}, rival, offline }
  const [offline, setOffline] = useState(false)
  const captionRef = useRef('')
  const phaseRef = useRef('write')
  const mounted = useRef(true)
  const finishedRef = useRef(false)
  useEffect(() => () => { mounted.current = false }, [])

  const round = rounds[idx]
  const playerTotal = results.reduce((a, r) => a + r.player.score, 0)
  const rivalTotal = results.reduce((a, r) => a + r.rival.score, 0)

  const judge = async (text) => {
    if (phaseRef.current !== 'write') return
    phaseRef.current = 'judging'; setPhase('judging')
    const trimmed = text.trim()
    let player, usedOffline = false
    if (!trimmed) {
      player = { score: 0, verdict: 'The buzzer beat you — no caption submitted.' }
    } else {
      try {
        const r = await api('/ai/caption', { prompt: round.scene.prompt, caption: trimmed })
        player = { score: clamp(Math.round(Number(r.score) || 0), 0, 100), verdict: r.verdict || 'The AI judge has spoken.' }
      } catch {
        player = localJudge(trimmed); usedOffline = true
      }
    }
    if (!mounted.current) return
    if (usedOffline) setOffline(true)
    setResults((rs) => [...rs, { player, rival: round.rival, offline: usedOffline }])
    phaseRef.current = 'result'; setPhase('result')
  }

  const left = useCountdown(TIME, {
    running: phase === 'write', resetKey: idx,
    onEnd: () => judge(captionRef.current),
  })

  const next = () => {
    if (idx + 1 >= ROUNDS) {
      if (finishedRef.current) return
      finishedRef.current = true
      const wins = results.filter((r) => r.player.score > r.rival.score).length
      onFinish({
        score: playerTotal, rating: clamp(playerTotal / (ROUNDS * 100), 0, 1), won: playerTotal > rivalTotal,
        summary: playerTotal > rivalTotal
          ? `Out-captioned the rival bot ${playerTotal} to ${rivalTotal}.`
          : `The rival bot edged you ${rivalTotal} to ${playerTotal}.`,
        stats: [
          { label: 'Your total', value: playerTotal },
          { label: 'Rival total', value: rivalTotal },
          { label: 'Rounds won', value: `${wins}/${ROUNDS}` },
          { label: 'Judging', value: offline ? 'Mixed/offline' : 'AI' },
        ],
      })
      return
    }
    setIdx(idx + 1); setCaption(''); captionRef.current = ''
    phaseRef.current = 'write'; setPhase('write')
  }

  const last = results[results.length - 1]
  const playerWonRound = last && last.player.score > last.rival.score
  const tie = last && last.player.score === last.rival.score

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3">
        <Stat label="Round" value={`${idx + 1}/${ROUNDS}`} />
        <Stat label="You" value={playerTotal} tone="text-cyan" />
        <Stat label="Rival bot" value={rivalTotal} tone="text-violet-soft" />
        <Stat label="Time" value={phase === 'write' ? Math.ceil(left) : '—'} tone={phase === 'write' && left < 10 ? 'text-danger' : ''} />
      </div>

      <div className="glass rounded-3xl p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-dim"><PenLine size={16} className="text-violet-soft" aria-hidden="true" /> Write the funniest caption.</div>
          {offline && <span className="flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-3 py-1 text-xs text-warn"><WifiOff size={12} aria-hidden="true" /> Offline judging</span>}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-panel/70 p-4">
          <SceneArt id={round.scene.id} />
          <p className="mt-2 text-center text-sm text-ink">{round.scene.prompt}</p>
        </div>

        {phase === 'write' && (
          <div className="mt-4">
            <textarea value={caption} maxLength={MAX_CHARS} rows={3}
              onChange={(e) => { setCaption(e.target.value); captionRef.current = e.target.value }}
              placeholder="Your caption…" aria-label="Your caption"
              className="w-full resize-none rounded-xl border border-white/15 bg-void/60 px-4 py-3 text-sm outline-none focus:border-violet" />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={`text-xs ${caption.length >= MAX_CHARS ? 'text-warn' : 'text-dim'}`}>{caption.length}/{MAX_CHARS}</span>
              <span className="flex items-center gap-1 text-xs text-dim"><Timer size={12} aria-hidden="true" /> auto-submits at 0s</span>
              <Button onClick={() => judge(caption)} disabled={!caption.trim()}><Send size={16} /> Submit</Button>
            </div>
          </div>
        )}

        {phase === 'judging' && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-dim" role="status">
            <Loader2 size={32} className="animate-spin text-violet-soft" aria-hidden="true" />
            <p className="text-sm">The judge is reading your caption…</p>
          </div>
        )}

        {phase === 'result' && last && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-2xl border p-4 ${playerWonRound ? 'border-success/60 bg-success/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-cyan"><PenLine size={14} aria-hidden="true" /> You</span>
                  <span className="font-display text-xl font-bold">{last.player.score}</span>
                </div>
                <p className="mt-2 text-sm text-ink">{caption.trim() || <span className="text-dim">(no caption)</span>}</p>
                <p className="mt-2 text-xs text-dim">{last.player.verdict}</p>
                {playerWonRound && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-success"><Trophy size={12} aria-hidden="true" /> Round winner</span>}
              </div>
              <div className={`rounded-2xl border p-4 ${last && !playerWonRound && !tie ? 'border-violet/60 bg-violet/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-violet-soft"><Bot size={14} aria-hidden="true" /> Rival bot</span>
                  <span className="font-display text-xl font-bold">{last.rival.score}</span>
                </div>
                <p className="mt-2 text-sm text-ink">“{last.rival.text}”</p>
                <p className="mt-2 text-xs text-dim">{last.rival.verdict}</p>
                {!playerWonRound && !tie && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-soft"><Trophy size={12} aria-hidden="true" /> Round winner</span>}
              </div>
            </div>
            {tie && <p className="mt-3 text-center text-sm text-dim">A tie — the judge refuses to pick a favorite.</p>}
            <Button className="mt-4" onClick={next}><Sparkles size={16} /> {idx + 1 >= ROUNDS ? 'See results' : 'Next scene'}</Button>
          </motion.div>
        )}
      </div>
    </Frame>
  )
}
