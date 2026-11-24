import { useCallback, useEffect, useRef, useState } from 'react'
import { Landmark, Zap } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Lives, Stat, clamp, pick, rand } from './ui.jsx'

// Neon Survivor — canvas space shooter. Survive 3 waves to win, then bank or keep flying.
const W = 480, H = 640
const AST_SCORE = { 3: 10, 2: 15, 1: 25 }
const AST_R = { 3: 26, 2: 17, 1: 10 }
const POWER_TYPES = ['shield', 'triple', 'slow']
const POWER_COLOR = { shield: '#22D3EE', triple: '#7C5CFF', slow: '#FBBF24' }
const POWER_LABEL = { shield: 'S', triple: 'T', slow: 'Z' }
const CAPS = { ast: 40, pb: 60, eb: 80, parts: 260, enemies: 12, powers: 5 }
const MOVE_KEYS = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
}

function makeState(level) {
  return {
    level, t: 0, score: 0, lives: 3, wave: 1, waveT: 20, waveActive: false, wavesCleared: 0,
    introT: 1.2, astT: 1.6, won: false, over: false, deathT: 0, paused: false,
    player: { x: W / 2, y: H - 70, r: 13, fireT: 0, invuln: 2, shield: 0, triple: 0, slow: 0 },
    asteroids: [], enemies: [], pb: [], eb: [], powers: [], parts: [],
    stars: Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.6 + 0.4, s: Math.random() * 34 + 12,
    })),
    banner: { text: 'WAVE 1', t: 2.2, color: '#22D3EE' },
    kills: { enemies: 0, asteroids: 0, powers: 0 },
    hudT: 0, shake: 0,
  }
}

function spawnWave(s) {
  const count = clamp(3 + s.wave + s.level, 4, 10)
  for (let i = 0; i < count && s.enemies.length < CAPS.enemies; i++) {
    const baseX = rand(70, W - 70)
    s.enemies.push({
      x: baseX, baseX, y: -30 - i * 46, ty: rand(70, 190),
      t: Math.random() * 6, amp: rand(40, 90), freq: 1 + Math.random() * 0.8 + s.wave * 0.05,
      hp: 2, fireT: 1.6 + Math.random() * 1.6, r: 14,
    })
  }
  s.waveActive = true
  s.banner = { text: `WAVE ${s.wave}`, t: 2.2, color: '#22D3EE' }
}

function spawnAsteroid(s, size, x, y, vx, vy) {
  if (s.asteroids.length >= CAPS.ast) return
  s.asteroids.push({
    x, y, vx, vy, size, r: AST_R[size], rot: Math.random() * 6.28,
    rv: (Math.random() - 0.5) * 2.4,
    verts: Array.from({ length: 9 }, () => 0.72 + Math.random() * 0.4),
  })
}

function burst(s, x, y, color, n) {
  for (let i = 0; i < n && s.parts.length < CAPS.parts; i++) {
    const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 160
    s.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45 + Math.random() * 0.45, t: 0, color })
  }
}

function maybeDrop(s, x, y, chance) {
  if (Math.random() < chance && s.powers.length < CAPS.powers) {
    s.powers.push({ x, y, type: pick(POWER_TYPES), r: 12, t: 0 })
  }
}

function breakAsteroid(s, i, scored) {
  const a = s.asteroids[i]
  s.asteroids.splice(i, 1)
  burst(s, a.x, a.y, '#9AA3FF', 6 + a.size * 3)
  if (scored) { s.score += AST_SCORE[a.size]; s.kills.asteroids++ }
  if (a.size > 1) {
    for (const dir of [-1, 1]) {
      spawnAsteroid(s, a.size - 1, a.x + dir * 6, a.y, dir * (30 + Math.random() * 50), a.vy * 0.9 + 20)
    }
  } else if (scored) {
    maybeDrop(s, a.x, a.y, 0.12)
  }
}

function hitPlayer(s) {
  const p = s.player
  if (p.invuln > 0 || s.over) return
  if (p.shield > 0) {
    p.shield = 0; p.invuln = 1
    burst(s, p.x, p.y, '#22D3EE', 14)
    return
  }
  s.lives--
  p.invuln = 2.2
  s.shake = 0.5
  burst(s, p.x, p.y, '#F87171', 22)
  if (s.lives <= 0) {
    s.over = true
    s.deathT = 1.5
    burst(s, p.x, p.y, '#FBBF24', 30)
    burst(s, p.x, p.y, '#F87171', 24)
  }
}

function update(s, dt, keys, autoFire, target) {
  s.t += dt
  const p = s.player
  const ws = p.slow > 0 ? 0.45 : 1
  const wdt = dt * ws

  // timers run on real time
  p.invuln = Math.max(0, p.invuln - dt)
  p.shield = Math.max(0, p.shield - dt)
  p.triple = Math.max(0, p.triple - dt)
  p.slow = Math.max(0, p.slow - dt)
  s.shake = Math.max(0, s.shake - dt)
  if (s.banner.t > 0) s.banner.t -= dt

  // starfield + particles always animate
  for (const st of s.stars) { st.y += st.s * wdt; if (st.y > H) { st.y = -2; st.x = Math.random() * W } }
  for (let i = s.parts.length - 1; i >= 0; i--) {
    const q = s.parts[i]; q.t += wdt
    if (q.t >= q.life) { s.parts.splice(i, 1); continue }
    q.x += q.vx * wdt; q.y += q.vy * wdt; q.vx *= 0.985; q.vy *= 0.985
  }

  if (s.over) { s.deathT -= dt; return }

  // --- player movement ---
  let dx = 0, dy = 0
  if (keys.has('l')) dx -= 1
  if (keys.has('r')) dx += 1
  if (keys.has('u')) dy -= 1
  if (keys.has('d')) dy += 1
  if (dx || dy) {
    const m = Math.hypot(dx, dy)
    p.x += (dx / m) * 320 * dt
    p.y += (dy / m) * 320 * dt
  }
  if (target) {
    const k = Math.min(1, dt * 14)
    p.x += (target.x - p.x) * k
    p.y += (target.y - p.y) * k
  }
  p.x = clamp(p.x, 20, W - 20)
  p.y = clamp(p.y, H * 0.35, H - 24)

  // --- firing ---
  p.fireT -= dt
  if ((autoFire || keys.has('f')) && p.fireT <= 0 && s.pb.length < CAPS.pb) {
    p.fireT = 0.2
    const angles = p.triple > 0 ? [-0.18, 0, 0.18] : [0]
    for (const a of angles) {
      s.pb.push({ x: p.x, y: p.y - 16, vx: Math.sin(a) * 440, vy: -Math.cos(a) * 440 })
    }
  }

  // --- waves + asteroid spawning ---
  if (s.introT > 0) {
    s.introT -= dt
    if (s.introT <= 0) spawnWave(s)
  } else {
    s.waveT -= wdt
    if (s.waveT <= 0) { s.wave++; s.waveT = 20; spawnWave(s) }
  }
  s.astT -= wdt
  if (s.astT <= 0) {
    s.astT = clamp(1.7 - s.wave * 0.12 - s.level * 0.18, 0.55, 2)
    const size = Math.random() < 0.55 ? 3 : 2
    spawnAsteroid(s, size, rand(30, W - 30), -34,
      (Math.random() - 0.5) * 40, 42 + s.wave * 6 + s.level * 12 + Math.random() * 30)
  }

  // --- asteroids ---
  for (let i = s.asteroids.length - 1; i >= 0; i--) {
    const a = s.asteroids[i]
    a.x += a.vx * wdt; a.y += a.vy * wdt; a.rot += a.rv * wdt
    if (a.x < a.r && a.vx < 0) a.vx *= -1
    if (a.x > W - a.r && a.vx > 0) a.vx *= -1
    if (a.y > H + 50) s.asteroids.splice(i, 1)
  }

  // --- enemies ---
  const bulletSpeed = 150 + s.wave * 8 + s.level * 15
  for (const e of s.enemies) {
    e.t += wdt
    if (e.y < e.ty) e.y += 70 * wdt
    else e.x = clamp(e.baseX + Math.sin(e.t * e.freq) * e.amp, 24, W - 24)
    e.fireT -= wdt
    if (e.fireT <= 0 && e.y > 10 && s.eb.length < CAPS.eb) {
      const ang = Math.atan2(p.y - e.y, p.x - e.x)
      s.eb.push({ x: e.x, y: e.y + 10, vx: Math.cos(ang) * bulletSpeed, vy: Math.sin(ang) * bulletSpeed })
      e.fireT = clamp(2.2 - s.wave * 0.08 - s.level * 0.2, 1.1, 2.4) + Math.random() * 0.6
    }
  }

  // --- bullets / power-ups ---
  for (let i = s.pb.length - 1; i >= 0; i--) {
    const b = s.pb[i]; b.x += b.vx * wdt; b.y += b.vy * wdt
    if (b.y < -20 || b.x < -20 || b.x > W + 20) s.pb.splice(i, 1)
  }
  for (let i = s.eb.length - 1; i >= 0; i--) {
    const b = s.eb[i]; b.x += b.vx * wdt; b.y += b.vy * wdt
    if (b.y > H + 30 || b.y < -30 || b.x < -30 || b.x > W + 30) s.eb.splice(i, 1)
  }
  for (let i = s.powers.length - 1; i >= 0; i--) {
    const u = s.powers[i]; u.y += 55 * wdt; u.t += wdt
    if (u.y > H + 30) { s.powers.splice(i, 1); continue }
    if (Math.hypot(u.x - p.x, u.y - p.y) < p.r + u.r + 4) {
      if (u.type === 'shield') p.shield = 5
      else if (u.type === 'triple') p.triple = 8
      else p.slow = 5
      s.kills.powers++
      burst(s, u.x, u.y, POWER_COLOR[u.type], 12)
      s.powers.splice(i, 1)
    }
  }

  // --- collisions: player bullets vs asteroids / enemies ---
  for (let i = s.pb.length - 1; i >= 0; i--) {
    const b = s.pb[i]
    let hit = false
    for (let j = s.asteroids.length - 1; j >= 0; j--) {
      const a = s.asteroids[j]
      if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + 3) { breakAsteroid(s, j, true); hit = true; break }
    }
    if (!hit) {
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        const e = s.enemies[j]
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 3) {
          hit = true
          e.hp--
          burst(s, b.x, b.y, '#F87171', 4)
          if (e.hp <= 0) {
            s.enemies.splice(j, 1)
            s.score += 50; s.kills.enemies++
            burst(s, e.x, e.y, '#F87171', 16)
            maybeDrop(s, e.x, e.y, 0.2)
          }
          break
        }
      }
    }
    if (hit) s.pb.splice(i, 1)
  }

  // --- collisions vs player ---
  for (let i = s.eb.length - 1; i >= 0; i--) {
    const b = s.eb[i]
    if (Math.hypot(b.x - p.x, b.y - p.y) < p.r + 4) { s.eb.splice(i, 1); hitPlayer(s) }
  }
  for (let i = s.asteroids.length - 1; i >= 0; i--) {
    const a = s.asteroids[i]
    if (Math.hypot(a.x - p.x, a.y - p.y) < p.r + a.r * 0.8) { breakAsteroid(s, i, false); hitPlayer(s) }
  }
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i]
    if (Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r) {
      s.enemies.splice(i, 1)
      burst(s, e.x, e.y, '#F87171', 14)
      hitPlayer(s)
    }
  }

  // --- wave clear ---
  if (s.waveActive && s.enemies.length === 0) {
    s.waveActive = false
    s.score += 100
    s.wavesCleared++
    if (s.wavesCleared >= 3 && !s.won) {
      s.won = true
      s.banner = { text: 'VICTORY! BANK OR KEEP FLYING', t: 3.5, color: '#34D399' }
    } else {
      s.banner = { text: 'WAVE CLEAR +100', t: 2.2, color: '#34D399' }
    }
  }
}

function draw(ctx, s) {
  ctx.save()
  ctx.fillStyle = '#05060F'
  ctx.fillRect(0, 0, W, H)
  if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake * 10, (Math.random() - 0.5) * s.shake * 10)

  // starfield
  for (const st of s.stars) {
    ctx.globalAlpha = 0.25 + st.r * 0.3
    ctx.fillStyle = '#8B94FF'
    ctx.fillRect(st.x, st.y, st.r, st.r)
  }
  ctx.globalAlpha = 1

  // slow-mo tint
  if (s.player.slow > 0) {
    ctx.fillStyle = 'rgba(251,191,36,0.04)'
    ctx.fillRect(0, 0, W, H)
  }

  // power-ups (glow)
  for (const u of s.powers) {
    const c = POWER_COLOR[u.type]
    ctx.save()
    ctx.shadowColor = c; ctx.shadowBlur = 12
    ctx.strokeStyle = c; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(u.x, u.y, u.r + Math.sin(u.t * 5) * 1.5, 0, 6.283); ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = c
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(POWER_LABEL[u.type], u.x, u.y + 1)
    ctx.restore()
  }

  // asteroids
  for (const a of s.asteroids) {
    ctx.save()
    ctx.translate(a.x, a.y); ctx.rotate(a.rot)
    ctx.beginPath()
    for (let i = 0; i < a.verts.length; i++) {
      const ang = (i / a.verts.length) * Math.PI * 2
      const r = a.r * a.verts[i]
      if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r)
      else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(124,92,255,0.10)'
    ctx.strokeStyle = '#9AA3FF'; ctx.lineWidth = 1.6
    ctx.fill(); ctx.stroke()
    ctx.restore()
  }

  // enemies
  for (const e of s.enemies) {
    ctx.save()
    ctx.translate(e.x, e.y)
    ctx.beginPath()
    ctx.moveTo(0, e.r); ctx.lineTo(e.r, 0); ctx.lineTo(0, -e.r * 0.7); ctx.lineTo(-e.r, 0)
    ctx.closePath()
    ctx.fillStyle = 'rgba(248,113,113,0.14)'
    ctx.strokeStyle = '#F87171'; ctx.lineWidth = 2
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#F87171'
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, 6.283); ctx.fill()
    ctx.restore()
  }

  // bullets
  ctx.strokeStyle = '#22D3EE'; ctx.lineWidth = 2.5
  for (const b of s.pb) {
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); ctx.stroke()
  }
  ctx.fillStyle = '#F87171'
  for (const b of s.eb) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, 6.283); ctx.fill()
  }

  // player ship (glow, blink while invulnerable)
  const p = s.player
  if (!s.over && (p.invuln <= 0 || Math.floor(s.t * 12) % 2 === 0)) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.shadowColor = '#22D3EE'; ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(0, -16); ctx.lineTo(11, 12); ctx.lineTo(0, 6); ctx.lineTo(-11, 12)
    ctx.closePath()
    ctx.fillStyle = 'rgba(34,211,238,0.18)'
    ctx.strokeStyle = '#22D3EE'; ctx.lineWidth = 2
    ctx.fill(); ctx.stroke()
    ctx.shadowBlur = 0
    // engine flame
    ctx.fillStyle = '#FBBF24'
    ctx.beginPath()
    ctx.moveTo(-4, 12); ctx.lineTo(0, 18 + Math.random() * 5); ctx.lineTo(4, 12)
    ctx.closePath(); ctx.fill()
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(34,211,238,0.7)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(0, 0, 22 + Math.sin(s.t * 6) * 2, 0, 6.283); ctx.stroke()
    }
    ctx.restore()
  }

  // particles
  for (const q of s.parts) {
    ctx.globalAlpha = 1 - q.t / q.life
    ctx.fillStyle = q.color
    ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3)
  }
  ctx.globalAlpha = 1

  // banner
  if (s.banner.t > 0) {
    ctx.save()
    ctx.globalAlpha = clamp(s.banner.t, 0, 1)
    ctx.fillStyle = s.banner.color
    ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'
    ctx.shadowColor = s.banner.color; ctx.shadowBlur = 14
    ctx.fillText(s.banner.text, W / 2, H * 0.3)
    ctx.restore()
  }
  if (s.over) {
    ctx.fillStyle = '#F87171'
    ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('SHIP DESTROYED', W / 2, H * 0.42)
  }
  ctx.restore()
}

export default function NeonSurvivor({ level, onFinish }) {
  const canvasRef = useRef(null)
  const stRef = useRef(null)
  if (!stRef.current) stRef.current = makeState(level)
  const keysRef = useRef(new Set())
  const dragRef = useRef(null)
  const autoRef = useRef(true)
  const finishedRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const [autoFire, setAutoFire] = useState(true)
  autoRef.current = autoFire
  const [hud, setHud] = useState({ score: 0, wave: 1, lives: 3, won: false, over: false, shield: 0, triple: 0, slow: 0 })

  const finish = useCallback(() => {
    const s = stRef.current
    if (finishedRef.current || !s) return
    finishedRef.current = true
    const won = s.won
    onFinishRef.current({
      score: s.score,
      rating: clamp(s.score / 1500, 0, 1),
      won,
      summary: won
        ? `Survived ${s.wavesCleared} wave${s.wavesCleared === 1 ? '' : 's'} and banked ${s.score} points.`
        : `Ship destroyed on wave ${s.wave} with ${s.score} points.`,
      stats: [
        { label: 'Waves cleared', value: s.wavesCleared },
        { label: 'Enemies down', value: s.kills.enemies },
        { label: 'Asteroids broken', value: s.kills.asteroids },
        { label: 'Power-ups', value: s.kills.powers },
      ],
    })
  }, [])

  // main loop
  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv.getContext('2d')
    let raf
    let last = performance.now()
    const loop = (t) => {
      const s = stRef.current
      const dt = Math.min((t - last) / 1000, 0.05)
      last = t
      if (!s.paused) {
        update(s, dt, keysRef.current, autoRef.current, dragRef.current)
        if (s.over && s.deathT <= 0) finish()
      }
      draw(ctx, s)
      s.hudT += dt
      if (s.hudT >= 0.25) {
        s.hudT = 0
        setHud({
          score: s.score, wave: s.wave, lives: s.lives, won: s.won, over: s.over,
          shield: Math.ceil(s.player.shield), triple: Math.ceil(s.player.triple), slow: Math.ceil(s.player.slow),
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onVis = () => {
      stRef.current.paused = document.hidden
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [finish])

  // keyboard
  useEffect(() => {
    const down = (e) => {
      if (MOVE_KEYS[e.code]) { keysRef.current.add(MOVE_KEYS[e.code]); e.preventDefault() }
      if (e.code === 'Space') { keysRef.current.add('f'); e.preventDefault() }
    }
    const up = (e) => {
      if (MOVE_KEYS[e.code]) keysRef.current.delete(MOVE_KEYS[e.code])
      if (e.code === 'Space') keysRef.current.delete('f')
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const toXY = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
  }

  return (
    <Frame>
      <div className="mb-3 flex items-stretch justify-between gap-2">
        <Stat label="Score" value={hud.score} />
        <Stat label="Wave" value={hud.wave} />
        <div className="glass flex flex-col items-center justify-center rounded-xl px-4 py-2">
          <div className="text-[11px] uppercase tracking-wider text-dim">Lives</div>
          <Lives n={hud.lives} />
        </div>
      </div>

      {(hud.shield > 0 || hud.triple > 0 || hud.slow > 0) && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          {hud.shield > 0 && <span className="glass rounded-lg px-2.5 py-1 text-cyan">Shield {hud.shield}s</span>}
          {hud.triple > 0 && <span className="glass rounded-lg px-2.5 py-1 text-violet-soft">Triple shot {hud.triple}s</span>}
          {hud.slow > 0 && <span className="glass rounded-lg px-2.5 py-1 text-warn">Slow-mo {hud.slow}s</span>}
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          aria-label="Neon Survivor space shooter arena"
          className="h-auto max-h-[70vh] w-full rounded-2xl border border-white/10"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = toXY(e) }}
          onPointerMove={(e) => { if (dragRef.current) dragRef.current = toXY(e) }}
          onPointerUp={() => { dragRef.current = null }}
          onPointerCancel={() => { dragRef.current = null }}
        />
        {hud.won && !hud.over && (
          <div className="glass absolute left-1/2 top-2 -translate-x-1/2 rounded-xl px-3 py-1 text-xs text-success">
            Victory! Keep flying or bank your score.
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" aria-pressed={autoFire} onClick={() => setAutoFire((a) => !a)}>
          <Zap size={16} /> Auto-fire: {autoFire ? 'ON' : 'OFF'}
        </Button>
        <Button size="sm" onClick={finish} disabled={hud.over}>
          <Landmark size={16} /> Bank score
        </Button>
      </div>
      <p className="mt-2 text-xs text-dim">
        Move with arrows / WASD or drag on the canvas. Space shoots. Clear 3 waves to win — asteroids split, enemies fire back.
      </p>
    </Frame>
  )
}