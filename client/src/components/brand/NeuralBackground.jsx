import { useEffect, useRef } from 'react'

/**
 * Fixed full-screen canvas of slowly drifting points joined by faint lines.
 * - Pauses when the tab is hidden.
 * - Draws one still frame if the user prefers reduced motion.
 */
export default function NeuralBackground() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let raf = 0
    let points = []

    function draw(move) {
      ctx.clearRect(0, 0, w, h)
      for (const p of points) {
        if (move) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
        }
        ctx.fillStyle = 'rgba(166,139,255,0.55)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x
          const dy = points[i].y - points[j].y
          const d = Math.hypot(dx, dy)
          if (d < 140) {
            ctx.strokeStyle = `rgba(124,92,255,${0.16 * (1 - d / 140)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(points[i].x, points[i].y)
            ctx.lineTo(points[j].x, points[j].y)
            ctx.stroke()
          }
        }
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(70, (w * h) / 22000))
      points = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }))
      draw(false)
    }

    function tick() {
      if (!document.hidden) draw(true)
      raf = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    if (!reduce) raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 0%, rgba(124,92,255,0.18), transparent 70%),' +
            'radial-gradient(50% 45% at 90% 20%, rgba(34,211,238,0.10), transparent 70%),' +
            'radial-gradient(70% 60% at 50% 110%, rgba(124,92,255,0.12), transparent 70%)',
        }}
      />
      <canvas ref={ref} className="absolute inset-0" />
    </div>
  )
}
