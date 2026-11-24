import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Lives, Stat, clamp } from './ui.jsx'

const STEP_W = 64, STEP_H = 36
const zoneFor = (score, level) => ({ width: clamp(0.3 - score * 0.011 - level * 0.03, 0.09, 0.3), center: 0.2 + Math.random() * 0.6 })
const speedFor = (score, level) => clamp(0.8 + score * 0.045 + level * 0.15, 0.8, 2.4) // bar widths per second

export default function StairJump({ level, onFinish }) {
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [flash, setFlash] = useState(null) // 'ok' | 'bad'
  const [zone, setZone] = useState(() => zoneFor(0, level))
  const markerEl = useRef(null)
  const pos = useRef(0)
  const dir = useRef(1)
  const st = useRef({ score: 0, lives: 3, zone, over: false })
  st.current.zone = zone

  useEffect(() => {
    let raf, last = performance.now()
    const loop = (t) => {
      const dt = (t - last) / 1000; last = t
      if (!st.current.over) {
        pos.current += dir.current * speedFor(st.current.score, level) * dt
        if (pos.current >= 1) { pos.current = 1; dir.current = -1 } else if (pos.current <= 0) { pos.current = 0; dir.current = 1 }
        if (markerEl.current) markerEl.current.style.left = `${pos.current * 100}%`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [level])

  const jump = useCallback(() => {
    const s = st.current
    if (s.over) return
    const hit = Math.abs(pos.current - s.zone.center) <= s.zone.width / 2
    if (hit) {
      s.score += 1
      setScore(s.score); setFlash('ok')
      const z = zoneFor(s.score, level); s.zone = z; setZone(z)
    } else {
      s.lives -= 1
      setLives(s.lives); setFlash('bad')
      if (s.lives <= 0) {
        s.over = true
        setTimeout(() => onFinish({
          score: s.score * 10, rating: Math.min(1, s.score / 30), won: s.score >= 15,
          summary: `You climbed ${s.score} stair${s.score === 1 ? '' : 's'} before falling.`,
          stats: [{ label: 'Stairs climbed', value: s.score }, { label: 'Top speed', value: `${speedFor(s.score, level).toFixed(1)}x` }],
        }), 900)
      }
    }
    setTimeout(() => setFlash(null), 250)
  }, [level, onFinish])

  useEffect(() => {
    const h = (e) => { if (e.code === 'Space') { e.preventDefault(); jump() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [jump])

  const steps = Array.from({ length: 14 }, (_, i) => score - 3 + i).filter((i) => i >= 0)
  return (
    <Frame>
      <div className="mb-4 flex items-center justify-between gap-3"><Stat label="Stairs" value={score} /><Stat label="Points" value={score * 10} /><div className="glass rounded-xl px-4 py-3"><Lives n={lives} /></div></div>

      <div className="glass relative h-64 overflow-hidden rounded-2xl">
        <svg viewBox="0 0 400 256" className="h-full w-full" role="img" aria-label={`Climber on stair ${score}`}>
          <g style={{ transform: `translate(${-(score - 3) * STEP_W + 60}px, ${(score - 3) * STEP_H + 20}px)`, transition: 'transform 0.25s ease-out' }}>
            {steps.map((i) => (
              <rect key={i} x={i * STEP_W} y={150 - i * STEP_H} width={STEP_W} height={600} fill={i === score ? '#7C5CFF' : '#1B2350'} stroke="#8B94FF33" />
            ))}
            <g style={{ transition: 'transform 0.25s ease-out' }} transform={`translate(${score * STEP_W + 32}, ${150 - score * STEP_H - 20})`}>
              <circle r="14" fill={flash === 'bad' ? '#F87171' : '#22D3EE'} style={{ transition: 'fill 0.15s' }} />
              <circle cx="5" cy="-3" r="2.5" fill="#05060F" />
            </g>
          </g>
        </svg>
      </div>

      <div className="mt-5">
        <div className="relative h-10 overflow-hidden rounded-xl border border-white/10 bg-panel" aria-hidden="true">
          <div className="absolute inset-y-0 rounded bg-success/50" style={{ left: `${(zone.center - zone.width / 2) * 100}%`, width: `${zone.width * 100}%` }} />
          <div ref={markerEl} className={`absolute inset-y-0 w-1.5 -translate-x-1/2 rounded ${flash === 'bad' ? 'bg-danger' : 'bg-white'}`} />
        </div>
        <p className="mt-2 text-center text-xs text-dim">Press <kbd className="rounded bg-white/10 px-1.5">Space</kbd> or the button when the marker is inside the green zone.</p>
        <Button size="lg" className="mt-3 w-full" onPointerDown={(e) => { e.preventDefault(); jump() }} onClick={(e) => { if (e.detail === 0) jump() }}><ArrowUp size={18} /> JUMP</Button>
      </div>
    </Frame>
  )
}
