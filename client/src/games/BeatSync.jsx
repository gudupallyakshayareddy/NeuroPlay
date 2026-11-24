import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Music, Volume2, VolumeX } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'

// ---- constants ----
const W = 480, H = 640, JUDGE_Y = 548
const LANE_X = [20, 132, 244, 356], LANE_W = 104
const LANE_COLORS = ['#7C5CFF', '#22D3EE', '#F472B6', '#4ADE80']
const KEY_CODES = ['KeyD', 'KeyF', 'KeyJ', 'KeyK']
const KEY_LABELS = ['D', 'F', 'J', 'K']
const PENTA = [0, 3, 5, 7, 10] // minor pentatonic
const PERFECT_WIN = 0.06, GOOD_WIN = 0.12
const RATING_MAX = 9000
const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12)

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Build the music event list AND the note chart from the SAME beat schedule,
// so every falling note lands on a real synthesized sound.
function buildChart(level) {
  const rng = mulberry32(0xbea7 + level * 777)
  const bpm = [100, 112, 126][level]
  const beat = 60 / bpm
  const slot = beat / 2 // eighth notes
  const slots = Math.floor(60 / slot)
  const density = [0.36, 0.42, 0.5][level]
  const travel = [2.2, 1.8, 1.45][level] // seconds from spawn to judgment line
  const lead = 2 // 2s count-in
  const events = [], notes = []
  let lastLane = -1
  for (let i = 0; i < slots; i++) {
    const t = lead + i * slot
    const isBeat = i % 2 === 0
    const barBeat = isBeat ? (i / 2) % 4 : -1
    events.push({ t, type: 'hat', accent: isBeat })
    if (barBeat === 0 || barBeat === 2) events.push({ t, type: 'kick' })
    if (isBeat) events.push({ t, type: 'bass', midi: 45 + PENTA[Math.floor(rng() * 5)] })
    if (rng() < density) {
      let lane = Math.floor(rng() * 4)
      if (lane === lastLane && rng() < 0.6) lane = (lane + 1 + Math.floor(rng() * 3)) % 4
      lastLane = lane
      notes.push({ t, lane, judged: false })
      events.push({ t, type: 'pluck', midi: 69 + PENTA[lane] + (rng() < 0.3 ? 12 : 0) })
    }
  }
  events.sort((a, b) => a.t - b.t)
  return { events, notes, bpm, beat, travel, duration: lead + slots * slot }
}

export default function BeatSync({ level, onFinish }) {
  const chart = useMemo(() => buildChart(level), [level])
  const canvasRef = useRef(null)
  const audioRef = useRef({ ctx: null, master: null, noise: null })
  const st = useRef({
    start: 0, score: 0, combo: 0, maxCombo: 0, health: 100,
    perfect: 0, good: 0, miss: 0, over: false,
    popups: [], laneFlash: [0, 0, 0, 0],
  })
  const finishedRef = useRef(false)
  const mutedRef = useRef(false)
  const [muted, setMuted] = useState(false)
  const [needSound, setNeedSound] = useState(false)
  const [hud, setHud] = useState({ score: 0, combo: 0, health: 100, acc: 100, time: 0 })

  const finishTimer = useRef(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const finish = useCallback((failed) => {
    const s = st.current
    if (s.over) return
    s.over = true
    const total = s.perfect + s.good + s.miss
    const acc = total ? (s.perfect + s.good * 0.5) / total : 0
    const id = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      onFinishRef.current({
        score: s.score,
        rating: clamp(s.score / RATING_MAX, 0, 1),
        won: !failed && acc >= 0.6,
        summary: failed
          ? 'The crowd booed you off the stage — health ran out.'
          : `You played the full 60s set with ${Math.round(acc * 100)}% accuracy.`,
        stats: [
          { label: 'Perfect', value: s.perfect },
          { label: 'Good', value: s.good },
          { label: 'Miss', value: s.miss },
          { label: 'Max combo', value: s.maxCombo },
          { label: 'Accuracy', value: `${Math.round(acc * 100)}%` },
        ],
      })
    }, 800)
    finishTimer.current = id
  }, [])

  // ---- audio + game loop ----
  useEffect(() => {
    const s = st.current
    let ctx = null, master = null, noise = null
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = mutedRef.current ? 0 : 0.5
      master.connect(ctx.destination)
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.15), ctx.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    } catch { ctx = null }
    audioRef.current = { ctx, master, noise }
    if (ctx && ctx.state === 'suspended') {
      setNeedSound(true)
      ctx.resume().then(() => { if (ctx.state === 'running') setNeedSound(false) }).catch(() => {})
    }

    const start = (ctx ? ctx.currentTime : performance.now() / 1000) + 0.15
    s.start = start
    const now = () => (ctx ? ctx.currentTime : performance.now() / 1000)

    // -- synth voices --
    const playEvent = (ev, when) => {
      if (!ctx || ctx.state !== 'running') return
      const t = Math.max(when, ctx.currentTime)
      if (ev.type === 'kick') {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'sine'
        o.frequency.setValueAtTime(160, t)
        o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
        g.gain.setValueAtTime(0.9, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.18)
      } else if (ev.type === 'hat') {
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
        src.buffer = noise; f.type = 'highpass'; f.frequency.value = 6500
        g.gain.setValueAtTime(ev.accent ? 0.22 : 0.1, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
        src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + 0.06)
      } else if (ev.type === 'bass') {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain()
        o.type = 'sawtooth'; o.frequency.value = midiFreq(ev.midi)
        f.type = 'lowpass'; f.frequency.value = 520
        g.gain.setValueAtTime(0.22, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
        o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.26)
      } else if (ev.type === 'pluck') {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.type = 'triangle'; o.frequency.value = midiFreq(ev.midi)
        g.gain.setValueAtTime(0.18, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2)
      }
    }

    // -- lookahead scheduler (25ms tick, 150ms horizon) --
    let ei = 0
    const sched = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return
      const horizon = ctx.currentTime + 0.15
      while (ei < chart.events.length && start + chart.events[ei].t < horizon) {
        const when = start + chart.events[ei].t
        if (when > ctx.currentTime - 0.05) playEvent(chart.events[ei], when)
        ei++
      }
    }, 25)

    // -- render / judgment loop --
    const canvas = canvasRef.current
    const g2 = canvas ? canvas.getContext('2d') : null
    const speed = (JUDGE_Y + 40) / chart.travel
    let raf = 0, lastHud = 0
    const loop = () => {
      const t = now() - start
      // auto-miss notes that sailed past the window
      if (!s.over) {
        for (const n of chart.notes) {
          if (!n.judged && t > n.t + GOOD_WIN) {
            n.judged = true
            s.miss++
            s.combo = 0
            s.health = clamp(s.health - 8, 0, 100)
            s.popups.push({ text: 'MISS', color: '#F87171', lane: n.lane, t0: t })
            if (s.health <= 0) finish(true)
          }
        }
        if (!s.over && t > chart.duration + 1.2) finish(false)
      }
      // draw
      if (g2) {
        g2.clearRect(0, 0, W, H)
        g2.fillStyle = '#070B1E'
        g2.fillRect(0, 0, W, H)
        const beatPhase = ((t % chart.beat) + chart.beat) % chart.beat / chart.beat
        const pulse = Math.max(0, 1 - beatPhase * 2.2)
        for (let l = 0; l < 4; l++) {
          const x = LANE_X[l]
          const flash = Math.max(0, 1 - (t - s.laneFlash[l]) * 4)
          g2.fillStyle = `rgba(255,255,255,${0.03 + pulse * 0.04 + flash * 0.1})`
          g2.fillRect(x, 0, LANE_W, H)
          g2.strokeStyle = 'rgba(255,255,255,0.08)'
          g2.strokeRect(x + 0.5, 0.5, LANE_W - 1, H - 1)
          // receptor
          g2.save()
          g2.shadowColor = LANE_COLORS[l]
          g2.shadowBlur = 10 + pulse * 16 + flash * 20
          g2.strokeStyle = LANE_COLORS[l]
          g2.lineWidth = 2.5
          g2.beginPath()
          g2.roundRect(x + 10, JUDGE_Y - 14, LANE_W - 20, 28, 8)
          g2.stroke()
          g2.restore()
          // key label
          g2.fillStyle = 'rgba(255,255,255,0.55)'
          g2.font = 'bold 16px system-ui, sans-serif'
          g2.textAlign = 'center'
          g2.fillText(KEY_LABELS[l], x + LANE_W / 2, H - 24)
        }
        // judgment line glow
        g2.save()
        g2.shadowColor = '#8B94FF'
        g2.shadowBlur = 14 + pulse * 22
        g2.strokeStyle = `rgba(139,148,255,${0.6 + pulse * 0.4})`
        g2.lineWidth = 2
        g2.beginPath(); g2.moveTo(12, JUDGE_Y); g2.lineTo(W - 12, JUDGE_Y); g2.stroke()
        g2.restore()
        // notes
        for (const n of chart.notes) {
          if (n.judged) continue
          const y = JUDGE_Y - (n.t - t) * speed
          if (y < -30 || y > H + 30) continue
          const x = LANE_X[n.lane]
          g2.save()
          g2.shadowColor = LANE_COLORS[n.lane]
          g2.shadowBlur = 14
          g2.fillStyle = LANE_COLORS[n.lane]
          g2.beginPath()
          g2.roundRect(x + 12, y - 11, LANE_W - 24, 22, 7)
          g2.fill()
          g2.fillStyle = 'rgba(255,255,255,0.35)'
          g2.beginPath()
          g2.roundRect(x + 16, y - 7, LANE_W - 32, 6, 3)
          g2.fill()
          g2.restore()
        }
        // judgment popups
        s.popups = s.popups.filter((p) => t - p.t0 < 0.6)
        for (const p of s.popups) {
          const age = (t - p.t0) / 0.6
          g2.save()
          g2.globalAlpha = 1 - age
          g2.fillStyle = p.color
          g2.font = 'bold 20px system-ui, sans-serif'
          g2.textAlign = 'center'
          g2.shadowColor = p.color
          g2.shadowBlur = 12
          g2.fillText(p.text, LANE_X[p.lane] + LANE_W / 2, JUDGE_Y - 50 - age * 36)
          g2.restore()
        }
        // count-in
        if (t < 2 && t > -0.2) {
          g2.fillStyle = 'rgba(255,255,255,0.8)'
          g2.font = 'bold 42px system-ui, sans-serif'
          g2.textAlign = 'center'
          g2.fillText(t < 0 ? 'READY' : String(Math.ceil(2 - t)), W / 2, 280)
        }
      }
      // throttled HUD
      if (t - lastHud > 0.1) {
        lastHud = t
        const total = s.perfect + s.good + s.miss
        setHud({
          score: s.score, combo: s.combo, health: s.health,
          acc: total ? Math.round(((s.perfect + s.good * 0.5) / total) * 100) : 100,
          time: clamp(t / chart.duration, 0, 1),
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(sched)
      if (finishTimer.current) clearTimeout(finishTimer.current)
      if (ctx) ctx.close().catch(() => {})
    }
  }, [chart, finish])

  // ---- input ----
  const hit = useCallback((lane) => {
    const s = st.current
    if (s.over || lane < 0 || lane > 3) return
    const { ctx } = audioRef.current
    const t = (ctx ? ctx.currentTime : performance.now() / 1000) - s.start
    s.laneFlash[lane] = t
    let best = null, bestDt = Infinity
    for (const n of chart.notes) {
      if (n.judged || n.lane !== lane) continue
      const dt = Math.abs(t - n.t)
      if (dt <= GOOD_WIN && dt < bestDt) { best = n; bestDt = dt }
    }
    if (!best) return
    best.judged = true
    const perfect = bestDt <= PERFECT_WIN
    s.combo++
    s.maxCombo = Math.max(s.maxCombo, s.combo)
    const mult = 1 + Math.min(3, Math.floor(s.combo / 10))
    s.score += (perfect ? 100 : 50) * mult
    if (perfect) { s.perfect++; s.health = clamp(s.health + 2, 0, 100) } else s.good++
    s.popups.push({ text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? '#4ADE80' : '#FBBF24', lane, t0: t })
  }, [chart])

  useEffect(() => {
    const h = (e) => {
      const lane = KEY_CODES.indexOf(e.code)
      if (lane >= 0 && !e.repeat) { e.preventDefault(); hit(lane) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [hit])

  const onCanvasPointer = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (W / rect.width)
    hit(clamp(Math.floor((x - 20) / 112), 0, 3))
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    mutedRef.current = next
    const { master, ctx } = audioRef.current
    if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.5, ctx.currentTime, 0.02)
  }

  const enableSound = () => {
    const { ctx } = audioRef.current
    if (ctx) ctx.resume().then(() => setNeedSound(false)).catch(() => setNeedSound(false))
    else setNeedSound(false)
  }

  const mult = 1 + Math.min(3, Math.floor(hud.combo / 10))
  return (
    <Frame>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Stat label="Score" value={hud.score} />
        <Stat label="Combo" value={`${hud.combo} (x${mult})`} tone={hud.combo >= 10 ? 'text-violet-soft' : ''} />
        <Stat label="Accuracy" value={`${hud.acc}%`} />
        <button onClick={toggleMute} aria-label={muted ? 'Unmute music' : 'Mute music'} className="glass rounded-xl p-3 text-dim hover:text-ink">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* health + track progress */}
      <div className="glass mb-3 rounded-2xl p-3">
        <div className="flex justify-between text-[11px] text-dim"><span>Health</span><span>{hud.health}/100</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full transition-all duration-200 ${hud.health > 50 ? 'bg-success' : hud.health > 25 ? 'bg-warn' : 'bg-danger'}`} style={{ width: `${hud.health}%` }} />
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-violet" style={{ width: `${hud.time * 100}%` }} />
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onCanvasPointer}
          aria-label="Rhythm game: four neon lanes. Press D, F, J or K when notes reach the glowing line."
          className="h-auto max-h-[70vh] w-full rounded-2xl border border-white/10"
          style={{ touchAction: 'none' }}
        />
        {needSound && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-void/80">
            <Button size="lg" onClick={enableSound}><Music size={18} /> Tap to enable sound</Button>
          </div>
        )}
      </div>

      {/* touch tap zones */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {KEY_LABELS.map((k, l) => (
          <button
            key={k}
            onPointerDown={(e) => { e.preventDefault(); hit(l) }}
            aria-label={`Tap lane ${k}`}
            className="glass h-14 rounded-xl font-display text-lg font-bold transition-transform active:scale-95"
            style={{ color: LANE_COLORS[l], borderColor: `${LANE_COLORS[l]}55`, touchAction: 'none' }}
          >
            {k}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-dim">Keys <kbd className="rounded bg-white/10 px-1.5">D</kbd> <kbd className="rounded bg-white/10 px-1.5">F</kbd> <kbd className="rounded bg-white/10 px-1.5">J</kbd> <kbd className="rounded bg-white/10 px-1.5">K</kbd> or tap the lanes. Perfect ±60ms · Good ±120ms. Music is synthesized live — every note you hit is a real sound in the track.</p>
    </Frame>
  )
}
