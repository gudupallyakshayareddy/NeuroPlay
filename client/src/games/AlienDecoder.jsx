import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, BookOpen, Delete, Eraser, Send, Check, Lock, Sparkles, Satellite, X } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, rand, shuffle, clamp } from './ui.jsx'

const SENTENCES = 3
const PER_SENTENCE = 150
const CLEAN_BONUS = 50
const MAX_SCORE = SENTENCES * PER_SENTENCE + CLEAN_BONUS // 500

// ---- Vocabulary pools (nouns pluralize with a simple +s; past-tense verbs never change) ----
const NOUNS = ['cat', 'robot', 'star', 'chef', 'pilot', 'garden', 'comet', 'wizard']
const VERBS = ['chased', 'helped', 'found', 'visited', 'painted', 'rescued']
const ADJS = ['big', 'sleepy', 'shiny', 'tiny', 'grumpy', 'cosmic']

// ---- Seeded RNG so a run's glyphs are stable ----
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Random alien glyphs: 3-4 strokes on a 5x5 grid, unique per word.
function makeGlyphs(rng) {
  const pt = () => 6 + Math.floor(rng() * 5) * 7
  const seen = new Set()
  const out = []
  for (let i = 0; i < 8; i++) {
    let d
    do {
      d = `M${pt()} ${pt()}`
      const segs = 3 + Math.floor(rng() * 2)
      for (let s = 0; s < segs; s++) {
        const x = pt(), y = pt()
        d += rng() < 0.4 ? ` Q${pt()} ${pt()} ${x} ${y}` : ` L${x} ${y}`
      }
      if (rng() < 0.5) d += ` M${pt()} ${pt()} l0.1 0` // a dot, rendered round by strokeLinecap
    } while (seen.has(d))
    seen.add(d)
    out.push(d)
  }
  return out
}

// ---- Puzzle generation ----
// Rules: REVERSE = alien word order is the reverse of English.
//        PLURAL  = a suffix glyph (id -1) right after a noun marks it plural.
// Examples are constructed to cover all 8 words and to demonstrate every active rule.
function buildPuzzle(level) {
  const seed = rand(1, 2 ** 31)
  const rng = mulberry32(seed)
  const nouns = shuffle(NOUNS).slice(0, 4)
  const verbs = shuffle(VERBS).slice(0, 2)
  const adjs = shuffle(ADJS).slice(0, 2)
  const words = [...nouns, ...verbs, ...adjs]
  const reverse = level >= 2 ? true : level === 1 ? rng() < 0.5 : false
  const plural = level >= 2 ? true : level === 1 ? !reverse : false
  const T = (w, pl = false) => ({ w, pl: plural && pl })

  const examples = [
    [T(nouns[0], true), T(verbs[0]), T(nouns[1])],            // plural subject (if rule on)
    [T(nouns[2]), T(verbs[1]), T(nouns[3], true)],            // plural object (if rule on)
    [T(adjs[0]), T(nouns[1]), T(verbs[0]), T(adjs[1]), T(nouns[2])], // all-singular contrast, covers adjectives
    [T(nouns[3], true), T(verbs[1]), T(adjs[0]), T(nouns[0], true)], // both plural (if rule on)
  ]
  const tests = [
    [T(nouns[1]), T(verbs[1]), T(nouns[0], true)],
    [T(nouns[2], true), T(verbs[0]), T(adjs[1]), T(nouns[3])],
    [T(adjs[0]), T(nouns[3], true), T(verbs[0]), T(nouns[1])],
  ]

  const glyphs = makeGlyphs(rng)
  const encode = (tokens) => {
    const groups = tokens.map((t) => (t.pl ? [words.indexOf(t.w), -1] : [words.indexOf(t.w)]))
    return (reverse ? [...groups].reverse() : groups).flat()
  }
  const english = (tokens) => tokens.map((t) => (t.pl ? t.w + 's' : t.w)).join(' ')
  return {
    seed, words, reverse, plural, examples, tests, glyphs, encode, english,
    expected: tests.map(encode),
    palette: shuffle(words.map((_, i) => i)), // display order leaks nothing
  }
}

// Solvability check: every test word must be learnable from the examples,
// every active rule must be demonstrated (and contrasted), sentences distinct.
function verify(p) {
  const seen = new Set()
  let pluralSeen = false, singularSeen = false
  for (const ex of p.examples) for (const t of ex) { seen.add(t.w); if (t.pl) pluralSeen = true; else singularSeen = true }
  if (p.words.some((w) => !seen.has(w))) return false
  if (p.tests.some((ts) => ts.some((t) => !seen.has(t.w)))) return false
  if (new Set([...p.examples, ...p.tests].map(p.english)).size !== p.examples.length + p.tests.length) return false
  if (p.plural && !(pluralSeen && singularSeen && p.tests.some((ts) => ts.some((t) => t.pl)))) return false
  if (p.reverse && !p.examples.every((e) => e.length >= 3)) return false
  return p.expected.every((seq) => seq.length >= 3)
}

function Glyph({ d, suffix, size = 34, className = '' }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      {suffix
        ? <><circle cx="20" cy="13" r="4.5" fill="currentColor" /><circle cx="20" cy="27" r="4.5" fill="currentColor" /></>
        : <path d={d} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

export default function AlienDecoder({ level = 0, onFinish }) {
  const [puzzle] = useState(() => {
    let p = buildPuzzle(level)
    for (let i = 0; i < 25 && !verify(p); i++) p = buildPuzzle(level)
    return p
  })
  const [idx, setIdx] = useState(0)
  const [built, setBuilt] = useState([])
  const [wrongHere, setWrongHere] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)
  const [score, setScore] = useState(0)
  const [solvedCount, setSolvedCount] = useState(0)
  const [unlocked, setUnlocked] = useState([]) // word strings revealed so far
  const [suffixKnown, setSuffixKnown] = useState(false)
  const [phase, setPhase] = useState('solve') // solve | solved
  const [feedback, setFeedback] = useState(null)
  const finishedRef = useRef(false)

  const test = puzzle.tests[idx]
  const rulesActive = (puzzle.reverse ? 1 : 0) + (puzzle.plural ? 1 : 0)
  const renderGlyph = (id, size, className) => id === -1
    ? <Glyph suffix size={size} className={className} />
    : <Glyph d={puzzle.glyphs[id]} size={size} className={className} />

  const submit = () => {
    if (phase !== 'solve' || built.length === 0) return
    const expected = puzzle.expected[idx]
    const ok = built.length === expected.length && built.every((g, i) => g === expected[i])
    if (ok) {
      setScore((s) => s + PER_SENTENCE)
      setSolvedCount((c) => c + 1)
      setUnlocked((u) => [...new Set([...u, ...test.map((t) => t.w)])])
      if (puzzle.plural) setSuffixKnown(true)
      setFeedback(null); setPhase('solved')
    } else {
      setWrongHere((w) => w + 1)
      setTotalWrong((w) => w + 1)
      setFeedback('Not quite. Study the training pairs — order and markers matter.')
    }
  }

  const advance = () => {
    if (idx + 1 >= SENTENCES) {
      if (finishedRef.current) return
      finishedRef.current = true
      const bonus = totalWrong === 0 ? CLEAN_BONUS : 0
      const final = score + bonus
      onFinish({
        score: final, rating: clamp(final / MAX_SCORE, 0, 1), won: final >= 300,
        summary: `Decoded ${solvedCount}/${SENTENCES} alien sentences${bonus ? ' with a flawless record' : ''}.`,
        stats: [
          { label: 'Decoded', value: `${solvedCount}/${SENTENCES}` },
          { label: 'Wrong submits', value: totalWrong },
          { label: 'Clean bonus', value: bonus ? `+${bonus}` : '—' },
          { label: 'Grammar rules', value: rulesActive },
        ],
      })
      return
    }
    setIdx(idx + 1); setBuilt([]); setWrongHere(0); setFeedback(null); setPhase('solve')
  }

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3">
        <Stat label="Sentence" value={`${idx + 1}/${SENTENCES}`} />
        <Stat label="Score" value={score} />
        <Stat label="Clean bonus" value={totalWrong === 0 ? `+${CLEAN_BONUS}` : 'lost'} tone={totalWrong === 0 ? 'text-success' : 'text-danger'} />
      </div>

      <div className="glass rounded-3xl p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-dim"><Satellite size={16} className="text-violet-soft" aria-hidden="true" /> First contact: learn the language.</div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-dim">
            {rulesActive === 0 ? 'Direct mapping — no grammar tricks' : `${rulesActive} hidden grammar rule${rulesActive > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Training data */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-panel/70 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-dim"><BookOpen size={14} aria-hidden="true" /> Training data — intercepted transmissions</p>
          <ul className="mt-3 space-y-3">
            {puzzle.examples.map((ex, i) => (
              <li key={i} className="rounded-xl bg-white/5 p-3">
                <div className="flex flex-wrap items-center gap-1 text-violet-soft">
                  {puzzle.encode(ex).map((g, j) => <span key={j}>{renderGlyph(g, 28)}</span>)}
                </div>
                <p className="mt-1 text-sm text-ink">“{puzzle.english(ex)}”</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Current test sentence */}
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wider text-dim">Translate into alien — tap glyphs in the right order</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">“{puzzle.english(test)}”</p>

          <div className="mt-3 flex min-h-[56px] flex-wrap items-center gap-1 rounded-xl border border-dashed border-white/20 bg-void/40 p-2" aria-label="Your alien sentence">
            {built.length === 0 && <span className="px-2 text-sm text-dim">Tap glyphs below to build the sentence…</span>}
            <AnimatePresence initial={false}>
              {built.map((g, i) => (
                <motion.button key={`${i}-${g}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                  onClick={() => phase === 'solve' && setBuilt(built.filter((_, j) => j !== i))}
                  aria-label={`Remove glyph at position ${i + 1}`}
                  className="rounded-lg bg-cyan/10 p-1 text-cyan hover:bg-danger/20 hover:text-danger">
                  {renderGlyph(g, 32)}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          {phase === 'solve' && (
            <>
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Glyph palette">
                {puzzle.palette.map((wi) => (
                  <button key={wi} onClick={() => setBuilt([...built, wi])} aria-label={`Add alien glyph ${puzzle.palette.indexOf(wi) + 1}`}
                    className="glass glass-hover rounded-xl p-2 text-violet-soft hover:border-violet/60">
                    <Glyph d={puzzle.glyphs[wi]} size={36} />
                  </button>
                ))}
                {puzzle.plural && (
                  <button onClick={() => setBuilt([...built, -1])} aria-label="Add the double-dot marker glyph"
                    className="glass glass-hover rounded-xl border-warn/30 p-2 text-warn hover:border-warn/60">
                    <Glyph suffix size={36} />
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={submit} disabled={built.length === 0}><Send size={15} /> Submit</Button>
                <Button size="sm" variant="secondary" onClick={() => setBuilt(built.slice(0, -1))} disabled={built.length === 0} aria-label="Undo last glyph"><Delete size={15} /> Undo</Button>
                <Button size="sm" variant="ghost" onClick={() => setBuilt([])} disabled={built.length === 0} aria-label="Clear sentence"><Eraser size={15} /> Clear</Button>
                {wrongHere >= 2 && <Button size="sm" variant="ghost" onClick={() => advance()}>Skip (0 pts)</Button>}
              </div>
              {feedback && <p className="mt-3 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert"><X size={15} aria-hidden="true" /> {feedback}</p>}
              <p className="mt-3 text-xs text-dim">150 pts per correct sentence. Keep a flawless record for a +{CLEAN_BONUS} bonus. Tap a placed glyph to remove it.</p>
            </>
          )}

          {phase === 'solved' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-success/50 bg-success/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-success"><Check size={18} aria-hidden="true" /> Transmission decoded! +{PER_SENTENCE} points.</p>
              <p className="mt-1 text-sm text-dim">New dictionary entries unlocked below.</p>
              <Button className="mt-3" onClick={() => advance()}><Sparkles size={16} /> {idx + 1 >= SENTENCES ? 'See results' : 'Next sentence'}</Button>
            </motion.div>
          )}
        </div>

        {/* Progressive dictionary */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-panel/70 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-dim"><Languages size={14} aria-hidden="true" /> Dictionary — unlocks as you decode</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {puzzle.words.map((w, i) => {
              const known = unlocked.includes(w)
              return (
                <div key={w} className={`rounded-xl border p-2 text-center ${known ? 'border-success/40 bg-success/5' : 'border-white/10 bg-white/5'}`}>
                  <Glyph d={puzzle.glyphs[i]} size={30} className={`mx-auto ${known ? 'text-success' : 'text-dim'}`} />
                  <div className="mt-1 flex items-center justify-center gap-1 text-xs">
                    {known ? <span className="text-ink">{w}</span> : <><Lock size={10} className="text-dim" aria-hidden="true" /><span className="text-dim">???</span></>}
                  </div>
                </div>
              )
            })}
            {puzzle.plural && (
              <div className={`rounded-xl border p-2 text-center ${suffixKnown ? 'border-warn/40 bg-warn/5' : 'border-white/10 bg-white/5'}`}>
                <Glyph suffix size={30} className={`mx-auto ${suffixKnown ? 'text-warn' : 'text-dim'}`} />
                <div className="mt-1 flex items-center justify-center gap-1 text-xs">
                  {suffixKnown ? <span className="text-ink">plural</span> : <><Lock size={10} className="text-dim" aria-hidden="true" /><span className="text-dim">???</span></>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Frame>
  )
}
