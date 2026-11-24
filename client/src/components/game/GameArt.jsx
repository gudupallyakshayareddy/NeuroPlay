import { useId } from 'react'

// Procedural artwork. Each game picks a style (`art`) and its slug seeds the
// randomness, so every card looks different but stays the same on every visit.

const W = 400
const H = 240

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makeRng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const range = (n) => Array.from({ length: n }, (_, i) => i)

const styles = {
  doors: (r, c) => {
    const lit = Math.floor(r() * 3)
    return range(3).map((i) => (
      <g key={i}>
        <path d={`M${70 + i * 100} 190V100a35 35 0 0170 0v90z`} fill={i === lit ? c : 'none'} fillOpacity={0.22} stroke={c} strokeOpacity={i === lit ? 1 : 0.45} strokeWidth="2" />
        <circle cx={128 + i * 100} cy="150" r="3" fill={c} />
      </g>
    ))
  },
  nodes: (r, c) => {
    const pts = range(9).map(() => [40 + r() * 320, 30 + r() * 180])
    return (
      <g>
        {pts.map((p, i) => {
          const q = pts[(i + 1 + Math.floor(r() * 3)) % pts.length]
          return <line key={`l${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={c} strokeOpacity="0.4" />
        })}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 9 : 4 + r() * 3} fill={c} fillOpacity={i === 0 ? 1 : 0.6} />
        ))}
      </g>
    )
  },
  beams: (r, c) => {
    const x = 130 + r() * 140
    return (
      <g>
        <polygon points={`${x - 12},10 ${x + 12},10 ${x + 120},235 ${x - 120},235`} fill={c} fillOpacity="0.16" />
        <polygon points={`${x - 6},10 ${x + 6},10 ${x + 50},235 ${x - 50},235`} fill={c} fillOpacity="0.2" />
        <circle cx={x} cy="150" r="22" fill="#05060F" stroke={c} strokeWidth="2" />
        <path d={`M${x - 38} 235a38 38 0 0176 0z`} fill="#05060F" stroke={c} strokeWidth="2" />
      </g>
    )
  },
  cards: (r, c) =>
    range(3).map((i) => (
      <rect
        key={i} x="150" y="55" width="100" height="130" rx="12" fill={c} fillOpacity={0.1 + i * 0.07}
        stroke={c} strokeOpacity={0.5 + i * 0.2} strokeWidth="2"
        transform={`rotate(${(i - 1) * 18 + (r() - 0.5) * 8} 200 120)`}
      />
    )),
  peaks: (r, c) =>
    range(4).map((i) => {
      const x = i * 110 - 30 + r() * 30
      const h = 90 + r() * 90
      return <polygon key={i} points={`${x},240 ${x + 90},${240 - h} ${x + 180},240`} fill={c} fillOpacity={0.12 + i * 0.07} stroke={c} strokeOpacity="0.5" />
    }),
  rings: (r, c) =>
    range(5).map((i) => (
      <circle
        key={i} cx="200" cy="120" r={22 + i * 20} fill="none" stroke={c} strokeWidth="2.5"
        strokeOpacity={0.9 - i * 0.14}
        strokeDasharray={`${40 + r() * 80} ${14 + r() * 20}`}
        transform={`rotate(${r() * 360} 200 120)`}
      />
    )),
  maze: (r, c) => (
    <g stroke={c} strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round">
      {range(10).flatMap((x) =>
        range(5).map((y) => {
          const px = 40 + x * 32
          const py = 30 + y * 40
          return r() > 0.5 ? <line key={`${x}-${y}`} x1={px} y1={py} x2={px + 32} y2={py} /> : <line key={`${x}-${y}`} x1={px} y1={py} x2={px} y2={py + 40} />
        }),
      )}
      <circle cx={40 + Math.floor(r() * 9) * 32 + 16} cy={50} r="7" fill={c} stroke="none" />
    </g>
  ),
  waves: (r, c) =>
    range(6).map((i) => {
      const y = 50 + i * 26
      const a = 10 + r() * 22
      return <path key={i} d={`M0 ${y}Q100 ${y - a} 200 ${y}T400 ${y}`} fill="none" stroke={c} strokeOpacity={0.25 + i * 0.12} strokeWidth="2.5" />
    }),
  stairs: (r, c) =>
    range(8).map((i) => (
      <rect key={i} x={30 + i * 42} y={200 - i * 20} width="42" height={40 + i * 20} fill={c} fillOpacity={0.1 + i * 0.05} stroke={c} strokeOpacity="0.55" />
    )),
  orbs: (r, c) =>
    range(12).map((i) => (
      <circle key={i} cx={40 + r() * 320} cy={30 + r() * 180} r={5 + r() * 22} fill={c} fillOpacity={0.1 + r() * 0.3} stroke={c} strokeOpacity="0.6" />
    )),
  grid: (r, c) =>
    range(5).flatMap((x) =>
      range(3).map((y) => {
        const on = r() > 0.55
        return <rect key={`${x}-${y}`} x={70 + x * 52} y={55 + y * 52} width="42" height="42" rx="8" fill={on ? c : 'none'} fillOpacity={on ? 0.75 : 0} stroke={c} strokeOpacity="0.5" strokeWidth="2" />
      }),
    ),
  glyphs: (r, c) =>
    range(18).map((i) => {
      const x = 45 + (i % 6) * 58
      const y = 45 + Math.floor(i / 6) * 62
      const d = `M${x} ${y}l${(r() - 0.5) * 36} ${(r() - 0.5) * 36}l${(r() - 0.5) * 36} ${(r() - 0.5) * 36}${r() > 0.5 ? `m-10 ${r() * 20}l24 0` : ''}`
      return <path key={i} d={d} fill="none" stroke={c} strokeOpacity={0.5 + r() * 0.5} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    }),
  burst: (r, c) => (
    <g>
      {range(18).map((i) => {
        const a = (i / 18) * Math.PI * 2
        const len = 60 + r() * 60
        return <line key={i} x1={200 + Math.cos(a) * 30} y1={120 + Math.sin(a) * 30} x2={200 + Math.cos(a) * len} y2={120 + Math.sin(a) * len} stroke={c} strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
      })}
      <circle cx="200" cy="120" r="20" fill={c} fillOpacity="0.9" />
    </g>
  ),
}

export default function GameArt({ game, color, className }) {
  const uid = useId().replace(/:/g, '')
  const render = styles[game.art] || styles.nodes
  const rng = makeRng(hash(game.slug))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${game.title} artwork`}>
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor={color} stopOpacity="0.38" />
          <stop offset="1" stopColor="#0A0E1F" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#bg${uid})`} />
      {render(rng, color)}
    </svg>
  )
}
