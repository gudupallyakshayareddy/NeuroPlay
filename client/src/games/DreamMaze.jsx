import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, DoorOpen,
  Footprints, Lock, Moon, RefreshCw, Sparkles,
} from 'lucide-react'
import { Frame, Stat, clamp, pick, rand, shuffle } from './ui.jsx'

// ---------------------------------------------------------------------------
// Perfect maze (recursive backtracker) on an N×N cell grid. Each cell holds
// four wall booleans; shared walls are always updated on both sides.
// ---------------------------------------------------------------------------
const DIRS = { up: [-1, 0, 'n', 's'], down: [1, 0, 's', 'n'], left: [0, -1, 'w', 'e'], right: [0, 1, 'e', 'w'] }
const SIZES = [9, 11, 13]
const DRAIN = [1, 1, 1.5]
const TRAPS = [2, 3, 4]
const C = 26 // cell px in SVG space
const key = (r, c) => `${r},${c}`

function genMaze(N) {
  const m = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ n: true, e: true, s: true, w: true })))
  const seen = Array.from({ length: N }, () => Array(N).fill(false))
  const stack = [[0, 0]]
  seen[0][0] = true
  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const opts = Object.values(DIRS).filter(([dr, dc]) => {
      const nr = r + dr, nc = c + dc
      return nr >= 0 && nr < N && nc >= 0 && nc < N && !seen[nr][nc]
    })
    if (!opts.length) { stack.pop(); continue }
    const [dr, dc, a, b] = pick(opts)
    m[r][c][a] = false
    m[r + dr][c + dc][b] = false
    seen[r + dr][c + dc] = true
    stack.push([r + dr, c + dc])
  }
  return m
}

// BFS over open walls — used to verify the exit and every shard stay reachable.
function reachable(maze, N, start) {
  const seen = new Set([key(start.r, start.c)])
  const q = [[start.r, start.c]]
  while (q.length) {
    const [r, c] = q.shift()
    for (const [dr, dc, a] of Object.values(DIRS)) {
      const nr = r + dr, nc = c + dc
      if (maze[r][c][a] || nr < 0 || nr >= N || nc < 0 || nc >= N || seen.has(key(nr, nc))) continue
      seen.add(key(nr, nc))
      q.push([nr, nc])
    }
  }
  return seen
}

// Rotate walls in a small 3×3 region: re-carve it as a perfect sub-maze while
// leaving every boundary wall untouched, then BFS-verify. Revert on failure.
function shiftMaze(maze, N, player, shards) {
  const size = 3
  for (let attempt = 0; attempt < 12; attempt++) {
    const r0 = rand(0, N - size), c0 = rand(0, N - size)
    if (player.r >= r0 && player.r < r0 + size && player.c >= c0 && player.c < c0 + size) continue
    const inBlock = (r, c) => r >= r0 && r < r0 + size && c >= c0 && c < c0 + size
    const next = maze.map((row) => row.map((cell) => ({ ...cell })))
    for (let r = r0; r < r0 + size; r++) for (let c = c0; c < c0 + size; c++) {
      for (const [dr, dc, a] of Object.values(DIRS)) if (inBlock(r + dr, c + dc)) next[r][c][a] = true
    }
    const seen = Array.from({ length: size }, () => Array(size).fill(false))
    const stack = [[r0, c0]]
    seen[0][0] = true
    while (stack.length) {
      const [r, c] = stack[stack.length - 1]
      const opts = Object.values(DIRS).filter(([dr, dc]) => {
        const nr = r + dr, nc = c + dc
        return inBlock(nr, nc) && !seen[nr - r0][nc - c0]
      })
      if (!opts.length) { stack.pop(); continue }
      const [dr, dc, a, b] = pick(opts)
      next[r][c][a] = false
      next[r + dr][c + dc][b] = false
      seen[r + dr - r0][c + dc - c0] = true
      stack.push([r + dr, c + dc])
    }
    const reach = reachable(next, N, player)
    const exitOk = reach.has(key(N - 1, N - 1))
    const shardsOk = shards.every((s) => reach.has(key(s.r, s.c)))
    if (exitOk && shardsOk) return { maze: next, region: { r0, c0, size } }
  }
  return null
}

function init(level) {
  const N = SIZES[level] ?? 11
  const maze = genMaze(N)
  const spots = shuffle(
    Array.from({ length: N * N }, (_, i) => ({ r: Math.floor(i / N), c: i % N }))
      .filter(({ r, c }) => !(r === 0 && c === 0) && !(r === N - 1 && c === N - 1))
  )
  const trapCount = TRAPS[level] ?? 3
  return {
    N, maze, player: { r: 0, c: 0 },
    visited: new Set([key(0, 0)]), revealed: new Set(),
    shards: spots.slice(0, 3), traps: spots.slice(3, 3 + trapCount), echoes: spots.slice(3 + trapCount, 5 + trapCount),
    got: 0, lucidity: 100, moves: 0, shifts: 0, over: false, region: null,
    drain: DRAIN[level] ?? 1,
    msg: 'Find 3 moon shards to unseal the exit. The fog hides everything beyond your reach.',
  }
}

export default function DreamMaze({ level = 1, onFinish }) {
  const [g, setG] = useState(() => init(level))
  const ref = useRef(g)
  const finishedRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const commit = (n) => { ref.current = n; setG(n) }

  const finish = (s, won) => {
    if (finishedRef.current) return
    finishedRef.current = true
    const luc = Math.max(0, s.lucidity)
    const score = Math.max(0, s.got * 100 + Math.round(luc * 3) + (won ? 300 : 0) - s.moves)
    onFinishRef.current({
      score, rating: clamp(score / 900, 0, 1), won,
      summary: won
        ? `You escaped the dream with ${Math.round(luc)} lucidity to spare.`
        : `You woke up lost — ${s.got}/3 shards, ${s.moves} moves deep.`,
      stats: [
        { label: 'Moves', value: s.moves },
        { label: 'Moon shards', value: `${s.got}/3` },
        { label: 'Lucidity left', value: Math.round(luc) },
        { label: 'Dream shifts', value: s.shifts },
      ],
    })
  }

  const doMove = useCallback((dir) => {
    const s = ref.current
    if (s.over) return
    const [dr, dc, a] = DIRS[dir]
    const { r, c } = s.player
    if (s.maze[r][c][a]) { commit({ ...s, msg: 'A dream-wall blocks the way.' }); return }
    const nr = r + dr, nc = c + dc
    const n = {
      ...s, player: { r: nr, c: nc }, moves: s.moves + 1, region: null,
      visited: new Set(s.visited), revealed: new Set(s.revealed),
      shards: [...s.shards], traps: [...s.traps], echoes: [...s.echoes],
      lucidity: s.lucidity - s.drain, msg: '',
    }
    n.visited.add(key(nr, nc))
    // Symbols
    const si = n.shards.findIndex((x) => x.r === nr && x.c === nc)
    if (si >= 0) {
      n.shards.splice(si, 1); n.got += 1
      n.lucidity = clamp(n.lucidity + 6, 0, 100)
      n.msg = n.got >= 3 ? 'Third shard! The exit is unsealed — run.' : `Moon shard ${n.got}/3. A spark of clarity (+6 lucidity).`
    }
    const ti = n.traps.findIndex((x) => x.r === nr && x.c === nc)
    if (ti >= 0) {
      n.traps.splice(ti, 1)
      n.lucidity -= 1
      const dest = pick([...n.visited]).split(',').map(Number)
      n.player = { r: dest[0], c: dest[1] }
      n.msg = 'A dream trap! You are pulled back to familiar ground (-1 lucidity).'
    }
    const ei = n.echoes.findIndex((x) => x.r === nr && x.c === nc)
    if (ei >= 0) {
      n.echoes.splice(ei, 1)
      for (let rr = nr - 3; rr <= nr + 3; rr++) for (let cc = nc - 3; cc <= nc + 3; cc++) {
        if (rr >= 0 && rr < n.N && cc >= 0 && cc < n.N) n.revealed.add(key(rr, cc))
      }
      n.msg = 'An echo ripples outward — a region of the maze is revealed.'
    }
    // Exit
    if (nr === n.N - 1 && nc === n.N - 1) {
      if (n.got >= 3) { n.over = true; n.msg = 'The exit opens. You wake up smiling.'; commit(n); finish(n, true); return }
      n.msg = `The exit is sealed — ${3 - n.got} more moon shard${3 - n.got === 1 ? '' : 's'} needed.`
    }
    // Dream shift every 25 moves
    if (n.moves % 25 === 0) {
      const sh = shiftMaze(n.maze, n.N, n.player, n.shards)
      if (sh) { n.maze = sh.maze; n.region = sh.region; n.shifts += 1; n.msg = 'The dream shifts — walls rearrange somewhere in the maze.' }
    }
    if (!n.msg) n.msg = `${Math.round(Math.max(0, n.lucidity))} lucidity left. Keep moving.`
    // Wake up
    if (n.lucidity <= 0) { n.lucidity = 0; n.over = true; n.msg = 'Lucidity gone. The dream dissolves...'; commit(n); finish(n, false); return }
    commit(n)
  }, [])

  useEffect(() => {
    const map = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
    const h = (e) => {
      const d = map[e.code]
      if (!d) return
      e.preventDefault()
      doMove(d)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [doMove])

  const { N, maze, player } = g
  const visOf = (r, c) => {
    if (Math.max(Math.abs(r - player.r), Math.abs(c - player.c)) <= 2) return 2
    return g.visited.has(key(r, c)) || g.revealed.has(key(r, c)) ? 1 : 0
  }
  const pad = 4
  const dim = N * C + pad * 2
  const cx = (c) => pad + c * C + C / 2
  const cy = (r) => pad + r * C + C / 2
  const inRegion = (r, c) => g.region && r >= g.region.r0 && r < g.region.r0 + g.region.size && c >= g.region.c0 && c < g.region.c0 + g.region.size

  const walls = []
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = visOf(r, c)
    const x = pad + c * C, y = pad + r * C
    if (maze[r][c].n) {
      const vv = Math.max(v, r > 0 ? visOf(r - 1, c) : v)
      if (vv > 0) walls.push(<line key={`n${r}-${c}`} x1={x} y1={y} x2={x + C} y2={y} stroke="#8B94FF" strokeWidth="2" strokeLinecap="round" opacity={vv === 2 ? 0.9 : 0.28} />)
    }
    if (maze[r][c].w) {
      const vv = Math.max(v, c > 0 ? visOf(r, c - 1) : v)
      if (vv > 0) walls.push(<line key={`w${r}-${c}`} x1={x} y1={y} x2={x} y2={y + C} stroke="#8B94FF" strokeWidth="2" strokeLinecap="round" opacity={vv === 2 ? 0.9 : 0.28} />)
    }
    if (r === N - 1 && maze[r][c].s && v > 0) walls.push(<line key={`s${r}-${c}`} x1={x} y1={y + C} x2={x + C} y2={y + C} stroke="#8B94FF" strokeWidth="2" strokeLinecap="round" opacity={v === 2 ? 0.9 : 0.28} />)
    if (c === N - 1 && maze[r][c].e && v > 0) walls.push(<line key={`e${r}-${c}`} x1={x + C} y1={y} x2={x + C} y2={y + C} stroke="#8B94FF" strokeWidth="2" strokeLinecap="round" opacity={v === 2 ? 0.9 : 0.28} />)
  }

  const symbolAt = (list) => list.map(({ r, c }) => ({ r, c, v: visOf(r, c) })).filter((s) => s.v > 0)
  const unlocked = g.got >= 3
  const lucPct = clamp(g.lucidity, 0, 100)

  const DPad = ({ dir, icon: Icon, label, className }) => (
    <button onClick={() => doMove(dir)} aria-label={label} disabled={g.over} className={`glass glass-hover flex h-12 items-center justify-center rounded-xl text-violet-soft disabled:opacity-40 ${className}`}>
      <Icon size={22} />
    </button>
  )

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap items-stretch justify-between gap-3">
        <Stat label="Moves" value={g.moves} />
        <Stat label="Shards" value={`${g.got}/3`} tone={unlocked ? 'text-success' : 'text-cyan'} />
        <div className="glass flex min-w-[140px] flex-1 flex-col justify-center rounded-xl px-4 py-2">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-dim">
            <span className="flex items-center gap-1"><Brain size={12} className={lucPct <= 25 ? 'text-danger' : 'text-violet-soft'} /> Lucidity</span>
            <span className={lucPct <= 25 ? 'font-semibold text-danger' : ''}>{Math.round(lucPct)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${lucPct <= 25 ? 'bg-danger' : lucPct <= 50 ? 'bg-warn' : 'bg-cyan'}`} style={{ width: `${lucPct}%`, transition: 'width 0.3s ease, background-color 0.3s ease' }} />
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-3 sm:p-5">
        <div style={{ touchAction: 'none' }}>
          <svg viewBox={`0 0 ${dim} ${dim}`} className="h-auto w-full rounded-2xl border border-white/10 bg-void" role="img" aria-label={`Dream maze, ${N} by ${N}. You are at row ${player.r + 1}, column ${player.c + 1}. ${g.got} of 3 shards collected.`}>
            {/* cell backgrounds + fog */}
            {Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => {
              const v = visOf(r, c)
              if (v === 0) return null
              return <rect key={`bg${r}-${c}`} x={pad + c * C} y={pad + r * C} width={C} height={C} fill={inRegion(r, c) ? '#7C5CFF' : v === 2 ? '#1B2350' : '#141A3A'} opacity={inRegion(r, c) ? 0.35 : v === 2 ? 0.85 : 0.4} />
            }))}
            {walls}
            {/* exit */}
            {visOf(N - 1, N - 1) > 0 && (
              <g opacity={visOf(N - 1, N - 1) === 2 ? 1 : 0.4}>
                <rect x={pad + (N - 1) * C + 5} y={pad + (N - 1) * C + 5} width={C - 10} height={C - 10} rx="3" fill={unlocked ? '#34D399' : '#334155'} opacity="0.9" />
                {!unlocked && <circle cx={cx(N - 1)} cy={cy(N - 1)} r="3" fill="none" stroke="#0B1026" strokeWidth="1.5" />}
              </g>
            )}
            {/* moon shards */}
            {symbolAt(g.shards).map(({ r, c, v }) => (
              <polygon key={`sh${r}-${c}`} points={`${cx(c)},${cy(r) - 7} ${cx(c) + 5},${cy(r)} ${cx(c)},${cy(r) + 7} ${cx(c) - 5},${cy(r)}`} fill="#22D3EE" opacity={v === 2 ? 1 : 0.35} />
            ))}
            {/* traps */}
            {symbolAt(g.traps).map(({ r, c, v }) => (
              <g key={`tr${r}-${c}`} opacity={v === 2 ? 1 : 0.35} stroke="#F87171" strokeWidth="1.5" fill="none">
                <circle cx={cx(c)} cy={cy(r)} r="6" />
                <line x1={cx(c) - 3} y1={cy(r) - 3} x2={cx(c) + 3} y2={cy(r) + 3} />
                <line x1={cx(c) + 3} y1={cy(r) - 3} x2={cx(c) - 3} y2={cy(r) + 3} />
              </g>
            ))}
            {/* echoes */}
            {symbolAt(g.echoes).map(({ r, c, v }) => (
              <g key={`ec${r}-${c}`} opacity={v === 2 ? 1 : 0.35} stroke="#A78BFA" fill="none">
                <circle cx={cx(c)} cy={cy(r)} r="3" />
                <circle cx={cx(c)} cy={cy(r)} r="6.5" opacity="0.6" />
              </g>
            ))}
            {/* player */}
            <motion.circle initial={false} animate={{ cx: cx(player.c), cy: cy(player.r) }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} r="9" fill="#22D3EE" opacity="0.25" />
            <motion.circle initial={false} animate={{ cx: cx(player.c), cy: cy(player.r) }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} r="5.5" fill="#22D3EE" />
          </svg>
        </div>

        <p className="mt-3 min-h-[2.5rem] text-sm text-dim" aria-live="polite">{g.msg}</p>

        {/* touch d-pad + legend */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="grid w-40 grid-cols-3 gap-1.5">
            <span />
            <DPad dir="up" icon={ChevronUp} label="Move up" />
            <span />
            <DPad dir="left" icon={ChevronLeft} label="Move left" />
            <DPad dir="down" icon={ChevronDown} label="Move down" />
            <DPad dir="right" icon={ChevronRight} label="Move right" />
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-dim">
            <span className="flex items-center gap-2"><Sparkles size={13} className="text-cyan" /> Moon shard — collect 3 (+6 lucidity)</span>
            <span className="flex items-center gap-2"><RefreshCw size={13} className="text-danger" /> Trap — teleports you, -1 lucidity</span>
            <span className="flex items-center gap-2"><Moon size={13} className="text-violet-soft" /> Echo — reveals a region</span>
            <span className="flex items-center gap-2">{unlocked ? <DoorOpen size={13} className="text-success" /> : <Lock size={13} />} Exit — {unlocked ? 'open, go!' : 'sealed'}</span>
            <span className="flex items-center gap-2"><Footprints size={13} /> Arrows / WASD · shift every 25 moves</span>
          </div>
        </div>
      </div>
    </Frame>
  )
}
