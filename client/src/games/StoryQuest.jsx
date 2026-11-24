import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Flame, Flashlight, Users, Lock, ChevronRight, BookOpen, Sparkles } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'
import {
  STORY_TITLE, FLAG_META, START_SCENE, START_FLAGS, SCENES, ACT_NAMES,
  RATING_MAX, computeScore, meetsRequirement,
} from './content/storyQuest.js'

const FLAG_ICONS = { trust: Heart, courage: Flame, lantern: Flashlight, ally: Users }
const FLAG_TONES = { trust: 'text-success', courage: 'text-warn', lantern: 'text-cyan', ally: 'text-violet-soft' }

function flagValueLabel(flag, v) {
  if (flag === 'lantern') return v >= 2 ? 'Stormglass' : v === 1 ? 'Lit' : 'Dark'
  if (flag === 'ally') return v >= 1 ? 'Mira' : '—'
  return v
}

function effectPreview(effects) {
  return Object.entries(effects || {}).map(([f, d]) => `${d > 0 ? '+' : ''}${d} ${FLAG_META[f].label}`)
}

export default function StoryQuest({ level = 1, onFinish }) {
  const [sceneId, setSceneId] = useState(START_SCENE)
  const [flags, setFlags] = useState({ ...START_FLAGS })
  const [visited, setVisited] = useState(1)
  const finishedRef = useRef(false)

  const scene = SCENES[sceneId]
  const ending = scene.ending || null
  const paragraphs = scene.text.split('\n\n')
  const revealBase = 0.12
  const choicesDelay = revealBase + paragraphs.length * 0.35

  const choose = (choice) => {
    if (ending || !meetsRequirement(flags, choice.requires)) return
    setFlags((f) => {
      const next = { ...f }
      for (const [k, d] of Object.entries(choice.effects || {})) {
        next[k] = clamp((next[k] || 0) + d, 0, FLAG_META[k].max)
      }
      return next
    })
    setVisited((v) => v + 1)
    setSceneId(choice.next)
  }

  const finish = () => {
    if (finishedRef.current || !ending) return
    finishedRef.current = true
    const { score, collected } = computeScore(ending, flags, visited)
    onFinish({
      score,
      rating: clamp(score / RATING_MAX, 0, 1),
      won: ending.type === 'good',
      summary: `Reached “${ending.title}” — a ${ending.type} ending after ${visited} scenes.`,
      stats: [
        { label: 'Ending', value: ending.title },
        { label: 'Scenes', value: visited },
        { label: 'Flags', value: `${collected}/4` },
        { label: 'Trust', value: flags.trust },
        { label: 'Courage', value: flags.courage },
      ],
    })
  }

  const endingTone = ending
    ? ending.type === 'good' ? 'border-success/50 bg-success/10' : ending.type === 'bad' ? 'border-danger/50 bg-danger/10' : 'border-warn/50 bg-warn/10'
    : ''

  return (
    <Frame>
      <div className="mb-4 flex items-stretch justify-between gap-3">
        <Stat label="Act" value={`${scene.act}/3`} />
        <Stat label="Scenes" value={visited} />
        <Stat label="Flags" value={`${Object.keys(FLAG_META).filter((f) => flags[f] > 0).length}/4`} />
      </div>

      {/* Act progress */}
      <div className="mb-4 flex gap-2" aria-label={`Act ${scene.act}: ${ACT_NAMES[scene.act]}`}>
        {[1, 2, 3].map((a) => (
          <div key={a} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${a < scene.act ? 'bg-violet' : a === scene.act ? 'bg-cyan' : 'bg-white/10'}`} />
            <div className={`mt-1 truncate text-[10px] uppercase tracking-wider ${a === scene.act ? 'text-cyan' : 'text-dim'}`}>{ACT_NAMES[a]}</div>
          </div>
        ))}
      </div>

      {/* Flag chips */}
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Your story flags">
        {Object.keys(FLAG_META).map((f) => {
          const Icon = FLAG_ICONS[f]
          const active = flags[f] > 0
          return (
            <span key={f} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${active ? 'border-white/20 bg-white/10 text-ink' : 'border-white/10 text-dim opacity-60'}`}>
              <Icon size={13} className={active ? FLAG_TONES[f] : ''} />
              {FLAG_META[f].label}: <b>{flagValueLabel(f, flags[f])}</b>
            </span>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sceneId}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="glass rounded-3xl p-5 sm:p-8"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-dim">
            <BookOpen size={14} className="text-violet-soft" />
            {STORY_TITLE} · {ACT_NAMES[scene.act]}
          </div>

          {ending && (
            <div className={`mt-4 rounded-2xl border p-4 ${endingTone}`}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className={ending.type === 'good' ? 'text-success' : ending.type === 'bad' ? 'text-danger' : 'text-warn'} />
                <span className="font-display text-lg font-bold">{ending.title}</span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-dim">{ending.type} ending · worth {ending.quality} pts</div>
            </div>
          )}

          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink">
            {paragraphs.map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: revealBase + i * 0.35, duration: 0.45 }}
              >
                {p}
              </motion.p>
            ))}
          </div>

          {ending ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: choicesDelay }} className="mt-6">
              <Button size="lg" className="w-full sm:w-auto" onClick={finish}>
                See results <ChevronRight size={16} />
              </Button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: choicesDelay, duration: 0.35 }} className="mt-6 flex flex-col gap-2" aria-label="Choices">
              {scene.choices.map((c, i) => {
                const locked = !meetsRequirement(flags, c.requires)
                return (
                  <button
                    key={i}
                    onClick={() => choose(c)}
                    disabled={locked}
                    aria-disabled={locked}
                    className={`glass rounded-xl px-4 py-3 text-left text-sm transition-colors ${locked ? 'cursor-not-allowed opacity-60' : 'hover:border-violet/60'}`}
                  >
                    <span className="flex items-start gap-2">
                      {locked ? <Lock size={15} className="mt-0.5 shrink-0 text-dim" /> : <ChevronRight size={15} className="mt-0.5 shrink-0 text-violet-soft" />}
                      <span>
                        <span className={locked ? 'text-dim' : 'text-ink'}>{c.text}</span>
                        {locked && <span className="mt-1 block text-xs text-warn">{c.lockReason}</span>}
                        {!locked && level === 0 && c.effects && (
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            {effectPreview(c.effects).map((e) => (
                              <span key={e} className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] text-violet-soft">{e}</span>
                            ))}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                )
              })}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </Frame>
  )
}
