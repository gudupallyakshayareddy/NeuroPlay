import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, ArrowDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  FlaskConical, Gift, Heart, MapPin, Shield, Skull, Sparkles, Sword, Trophy,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — one stream per run
// ---------------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIZE = 5
const ENEMY_NAMES = ['Gutter Rat', 'Bone Sentry', 'Mire Imp', 'Hollow Knight', 'Ash Wraith', 'Deep Crawler', 'Grave Moth', 'Rust Golem']
const LOOT_KINDS = ['gold', 'gold', 'potion', 'potion', 'weapon', 'armor']

function genFloor(depth, rng, enemyMul) {
  const cells = Array.from({ length: SIZE * SIZE }, () => ({ type: 'empty', data: null, cleared: false }))
  // Stairs far from the entrance; every cell is walkable so they are always reachable.
  const far = []
  for (let i = 0; i < SIZE * SIZE; i++) {
    const x = i % SIZE, y = Math.floor(i / SIZE)
    if (x + y >= 5) far.push(i)
  }
  const stairsIdx = far[Math.floor(rng() * far.length)]
  cells[stairsIdx] = { type: 'stairs', data: null, cleared: false }
  for (let i = 0; i < cells.length; i++) {
    if (i === 0 || i === stairsIdx) continue
    const r = rng()
    if (r < 0.3) {
      const hp = Math.round((8 + depth * 4 + rng() * 4) * enemyMul)
      cells[i] = {
        type: 'enemy', cleared: false,
        data: {
          name: ENEMY_NAMES[Math.floor(rng() * ENEMY_NAMES.length)],
          hp, maxHp: hp,
          atk: Math.round((3 + depth * 2) * enemyMul),
          def: 1 + Math.floor(depth / 2),
        },
      }
    } else if (r < 0.5) {
      const kind = LOOT_KINDS[Math.floor(rng() * LOOT_KINDS.length)]
      cells[i] = { type: 'loot', cleared: false, data: { kind, gold: 5 + Math.floor(rng() * 10) + depth * 3 } }
    } else if (r < 0.62) cells[i] = { type: 'trap', cleared: false, data: null }
    else if (r < 0.72) cells[i] = { type: 'shrine', cleared: false, data: null }
  }
  cells[0].cleared = true
  return cells
}

const reveal = (seen, idx) => {
  const s = [...seen]
  const x = idx % SIZE, y = Math.floor(idx / SIZE)
  s[idx] = true
  if (x > 0) s[idx - 1] = true
  if (x < SIZE - 1) s[idx + 1] = true
  if (y > 0) s[idx - SIZE] = true
  if (y < SIZE - 1) s[idx + SIZE] = true
  return s
}

function HpBar({ n, max, tone = 'bg-success' }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full rounded-full transition-all duration-300 ${n / max <= 0.3 ? 'bg-danger' : tone}`} style={{ width: `${clamp((n / max) * 100, 0, 100)}%` }} />
    </div>
  )
}

const ROOM_ICON = { enemy: Skull, loot: Gift, trap: AlertTriangle, shrine: Sparkles, stairs: ArrowDown, empty: null }

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
export default function EndlessQuest({ level = 1, onFinish }) {
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const rngRef = useRef(null)
  if (!rngRef.current) rngRef.current = mulberry32(seed)
  const rng = rngRef.current
  const v = (n) => Math.floor(rng() * (2 * n + 1)) - n // variance in [-n, n]
  const enemyMul = [0.85, 1, 1.2][level] ?? 1

  const [S, setS] = useState(() => {
    const grid = genFloor(1, rngRef.current, enemyMul)
    return {
      depth: 1, grid, pos: 0, seen: reveal(Array(SIZE * SIZE).fill(false), 0), visited: [0],
      player: { hp: 30, maxHp: 30, atk: 5, def: 2, gold: 0, potions: 2, weapon: 1, armor: 0 },
      combat: null, pending: null, slain: 0, reached5: false,
      log: ['You descend into the endless dungeon. Find the stairs on each floor.'],
    }
  })
  const finishedRef = useRef(false)

  const scoreOf = (st) => st.depth * 150 + st.player.gold + st.slain * 20
  const finish = (st, won, how) => {
    if (finishedRef.current) return
    finishedRef.current = true
    const score = scoreOf(st)
    onFinish({
      score, rating: clamp(score / 1200, 0, 1), won,
      summary: how === 'retire'
        ? `Retired victorious at depth ${st.depth} with ${st.player.gold} gold and ${st.slain} foes slain.`
        : st.reached5
          ? `Conquered depth 5, then fell on depth ${st.depth}. The dungeon remembers.`
          : `Slain on depth ${st.depth} after killing ${st.slain} foes. Death is permanent down here.`,
      stats: [
        { label: 'Depth', value: st.depth },
        { label: 'Gold', value: st.player.gold },
        { label: 'Foes slain', value: st.slain },
        { label: 'Weapon', value: `Lv ${st.player.weapon}` },
      ],
    })
  }

  const pushLog = (st, msg) => ({ ...st, log: [...st.log, msg].slice(-4) })

  const dieIfDead = (st) => {
    if (st.player.hp <= 0) { setS(st); finish(st, st.reached5, 'death'); return true }
    return false
  }

  const move = (dx, dy) => {
    if (S.combat || S.pending || finishedRef.current) return
    const x = (S.pos % SIZE) + dx, y = Math.floor(S.pos / SIZE) + dy
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
    const idx = y * SIZE + x
    let st = { ...S, pos: idx, seen: reveal(S.seen, idx), visited: S.visited.includes(idx) ? S.visited : [...S.visited, idx], grid: S.grid.map((c) => ({ ...c })) }
    const cell = st.grid[idx]
    if (!cell.cleared) {
      if (cell.type === 'enemy') {
        st.combat = { enemy: { ...cell.data }, turn: 0, telegraph: false, defending: false, idx }
        st = pushLog(st, `A ${cell.data.name} lunges from the dark!`)
      } else if (cell.type === 'loot') {
        cell.cleared = true
        const p = { ...st.player }
        if (cell.data.kind === 'gold') { p.gold += cell.data.gold; st = pushLog(st, `You pry open a cache: +${cell.data.gold} gold.`) }
        if (cell.data.kind === 'potion') { p.potions += 1; st = pushLog(st, 'A glowing potion joins your belt. (+1 potion)') }
        if (cell.data.kind === 'weapon') { p.weapon += 1; st = pushLog(st, `You claim a finer blade. Weapon Lv ${p.weapon}!`) }
        if (cell.data.kind === 'armor') { p.armor += 1; st = pushLog(st, `You strap on better plate. Armor Lv ${p.armor}!`) }
        st.player = p
      } else if (cell.type === 'trap') {
        cell.cleared = true
        const dmg = Math.max(1, 2 + st.depth - Math.floor(st.player.def / 2))
        st.player = { ...st.player, hp: st.player.hp - dmg }
        st = pushLog(st, `Snapping jaws hidden in the floor! −${dmg} HP.`)
        if (dieIfDead(st)) return
      } else if (cell.type === 'shrine') {
        st.pending = { type: 'shrine', idx }
        st = pushLog(st, 'A quiet shrine glows. It offers one boon.')
      } else if (cell.type === 'stairs') {
        st.pending = { type: 'stairs', idx }
        st = pushLog(st, 'Cold air rises from a stairwell. Down is the only way.')
      } else {
        cell.cleared = true
      }
    }
    setS(st)
  }

  // Keyboard controls (cleaned up on every state change / unmount)
  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }
      const dir = map[e.key]
      if (dir) { e.preventDefault(); move(dir[0], dir[1]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S])

  const enemyTurn = (st) => {
    const c = { ...st.combat, enemy: { ...st.combat.enemy } }
    c.turn += 1
    if (c.turn % 3 === 0) {
      c.telegraph = true
      st = pushLog(st, `The ${c.enemy.name} winds up a heavy blow — defend!`)
    } else {
      let dmg = Math.max(1, c.enemy.atk - st.player.def - st.player.armor + v(1))
      if (c.telegraph) { dmg *= 2; c.telegraph = false }
      if (c.defending) { dmg = Math.ceil(dmg / 2); c.defending = false }
      st.player = { ...st.player, hp: st.player.hp - dmg }
      st = pushLog(st, `The ${c.enemy.name} hits you for ${dmg}.`)
    }
    st.combat = c
    return st
  }

  const attack = () => {
    if (!S.combat || finishedRef.current) return
    let st = { ...S, grid: S.grid.map((c) => ({ ...c })), player: { ...S.player } }
    const e = { ...st.combat.enemy }
    const dmg = Math.max(1, st.player.atk + st.player.weapon * 2 - e.def + v(1))
    e.hp -= dmg
    st = pushLog(st, `You strike the ${e.name} for ${dmg}.`)
    if (e.hp <= 0) {
      const bounty = 2 + st.depth * 2 + Math.max(0, v(2))
      st.grid[st.combat.idx].cleared = true
      st.combat = null
      st.slain += 1
      st.player.gold += bounty
      st = pushLog(st, `The ${e.name} falls! +${bounty} gold.`)
      setS(st)
      return
    }
    st.combat = { ...st.combat, enemy: e, defending: false }
    st = enemyTurn(st)
    if (dieIfDead(st)) return
    setS(st)
  }

  const defend = () => {
    if (!S.combat || finishedRef.current) return
    let st = { ...S, player: { ...S.player }, combat: { ...S.combat, defending: true } }
    st = pushLog(st, 'You raise your guard — the next hit is halved.')
    st = enemyTurn(st)
    if (dieIfDead(st)) return
    setS(st)
  }

  const drink = () => {
    if (!S.combat || S.player.potions <= 0 || finishedRef.current) return
    let st = { ...S, player: { ...S.player } }
    st.player.potions -= 1
    const heal = Math.min(15, st.player.maxHp - st.player.hp)
    st.player.hp += heal
    st = pushLog(st, `You quaff a potion. +${heal} HP.`)
    st = enemyTurn(st)
    if (dieIfDead(st)) return
    setS(st)
  }

  const shrineChoice = (boon) => {
    if (!S.pending || S.pending.type !== 'shrine') return
    let st = { ...S, grid: S.grid.map((c) => ({ ...c })), player: { ...S.player }, pending: null }
    st.grid[S.pending.idx].cleared = true
    if (boon === 'heal') {
      const heal = Math.min(Math.ceil(st.player.maxHp * 0.4), st.player.maxHp - st.player.hp)
      st.player.hp += heal
      st = pushLog(st, `The shrine's light knits your wounds. +${heal} HP.`)
    } else {
      st.player.atk += 1
      st = pushLog(st, 'The shrine brands your arm with strength. +1 ATK forever.')
    }
    setS(st)
  }

  const descend = () => {
    if (!S.pending || S.pending.type !== 'stairs') return
    const depth = S.depth + 1
    const grid = genFloor(depth, rng, enemyMul)
    let st = {
      ...S, depth, grid, pos: 0, seen: reveal(Array(SIZE * SIZE).fill(false), 0), visited: [0],
      player: { ...S.player, hp: Math.min(S.player.maxHp, S.player.hp + 4) },
      pending: null, reached5: S.reached5 || depth >= 5,
    }
    st = pushLog(st, depth >= 5 && !S.reached5 ? 'Depth 5. You have conquered the dungeon\'s heart — retire, or push your luck.' : `You descend to depth ${depth}. The dark grows teeth. (+4 HP)`)
    setS(st)
  }

  const p = S.player
  const cellIcon = (i) => {
    if (i === S.pos) return <MapPin size={16} className="text-violet-soft" />
    if (!S.visited.includes(i)) return S.seen[i] ? <span className="text-xs text-dim/60">?</span> : null
    const cell = S.grid[i]
    if (cell.cleared && cell.type !== 'stairs') return <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
    const Icon = ROOM_ICON[cell.type]
    if (!Icon) return <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
    const tone = cell.type === 'enemy' ? 'text-danger' : cell.type === 'trap' ? 'text-warn' : cell.type === 'shrine' ? 'text-cyan' : cell.type === 'stairs' ? 'text-success' : 'text-violet-soft'
    return <Icon size={16} className={tone} />
  }

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap gap-2">
        <Stat label="Depth" value={S.depth} tone={S.reached5 ? 'text-success' : ''} />
        <Stat label="Gold" value={p.gold} />
        <Stat label="Slain" value={S.slain} />
        <Stat label="Score" value={scoreOf(S)} />
      </div>

      <div className="glass rounded-3xl p-5 sm:p-6">
        {/* Player vitals */}
        <div className="flex items-center gap-3">
          <Heart size={16} className={p.hp / p.maxHp <= 0.3 ? 'text-danger' : 'text-success'} />
          <div className="flex-1"><HpBar n={p.hp} max={p.maxHp} /></div>
          <span className="text-sm font-semibold">{p.hp}/{p.maxHp}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-dim">
          <span className="rounded-lg bg-white/5 px-2 py-1"><Sword size={11} className="mr-1 inline" />ATK {p.atk} + weapon Lv{p.weapon}</span>
          <span className="rounded-lg bg-white/5 px-2 py-1"><Shield size={11} className="mr-1 inline" />DEF {p.def} + armor Lv{p.armor}</span>
          <span className="rounded-lg bg-white/5 px-2 py-1"><FlaskConical size={11} className="mr-1 inline" />Potions {p.potions}</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          {/* Dungeon grid */}
          <div className="grid grid-cols-5 gap-1.5" role="grid" aria-label={`Dungeon floor, depth ${S.depth}`}>
            {S.grid.map((_, i) => (
              <div key={i} className={`flex aspect-square items-center justify-center rounded-lg border ${i === S.pos ? 'border-violet/70 bg-violet/15' : S.visited.includes(i) ? 'border-white/15 bg-white/5' : S.seen[i] ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-void/60'}`}>
                {cellIcon(i)}
              </div>
            ))}
          </div>
          {/* D-pad */}
          <div className="mx-auto grid w-32 grid-cols-3 gap-1.5 self-center" aria-label="Movement controls">
            <span /><Button size="sm" variant="secondary" aria-label="Move up" onClick={() => move(0, -1)} disabled={!!S.combat || !!S.pending}><ChevronUp size={16} /></Button><span />
            <Button size="sm" variant="secondary" aria-label="Move left" onClick={() => move(-1, 0)} disabled={!!S.combat || !!S.pending}><ChevronLeft size={16} /></Button>
            <span className="flex items-center justify-center text-dim"><MapPin size={14} /></span>
            <Button size="sm" variant="secondary" aria-label="Move right" onClick={() => move(1, 0)} disabled={!!S.combat || !!S.pending}><ChevronRight size={16} /></Button>
            <span /><Button size="sm" variant="secondary" aria-label="Move down" onClick={() => move(0, 1)} disabled={!!S.combat || !!S.pending}><ChevronDown size={16} /></Button><span />
          </div>
        </div>

        {/* Combat panel */}
        {S.combat && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold"><Skull size={15} className="text-danger" /> {S.combat.enemy.name}</span>
              <span className="text-xs text-dim">ATK {S.combat.enemy.atk} · DEF {S.combat.enemy.def}</span>
            </div>
            <div className="mt-2 flex items-center gap-2"><div className="flex-1"><HpBar n={S.combat.enemy.hp} max={S.combat.enemy.maxHp} tone="bg-danger" /></div><span className="text-xs">{S.combat.enemy.hp}/{S.combat.enemy.maxHp}</span></div>
            {S.combat.telegraph && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warn"><AlertTriangle size={13} /> A heavy blow is coming — Defend to halve it!</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={attack}><Sword size={14} /> Attack</Button>
              <Button size="sm" variant="secondary" onClick={defend}><Shield size={14} /> Defend</Button>
              <Button size="sm" variant="secondary" onClick={drink} disabled={p.potions <= 0}><FlaskConical size={14} /> Potion ({p.potions})</Button>
            </div>
          </motion.div>
        )}

        {/* Shrine choice */}
        {S.pending?.type === 'shrine' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-cyan/40 bg-cyan/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-cyan" /> The shrine offers one boon</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => shrineChoice('heal')}><Heart size={14} /> Heal 40% HP</Button>
              <Button size="sm" variant="secondary" onClick={() => shrineChoice('buff')}><Sword size={14} /> +1 ATK forever</Button>
            </div>
          </motion.div>
        )}

        {/* Stairs */}
        {S.pending?.type === 'stairs' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-success/40 bg-success/10 p-4">
            <p className="text-sm">Stairs spiral down into colder dark. Descending heals 4 HP — and deepens every foe.</p>
            <Button size="sm" className="mt-3" onClick={descend}><ArrowDown size={14} /> Descend to depth {S.depth + 1}</Button>
          </motion.div>
        )}

        {/* Victory banner */}
        {S.reached5 && !S.combat && (
          <div className="mt-4 rounded-2xl border border-success/50 bg-success/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-success"><Trophy size={15} /> Depth 5 conquered. You may retire victorious — or keep crawling for score.</p>
            <Button size="sm" className="mt-3" onClick={() => finish(S, true, 'retire')}><Trophy size={14} /> Retire victorious</Button>
          </div>
        )}

        {/* Event log */}
        <ul className="mt-4 space-y-1 rounded-2xl bg-white/5 p-3 text-xs text-dim" aria-label="Recent events" aria-live="polite">
          {S.log.map((l, i) => <li key={`${S.log.length}-${i}`} className={i === S.log.length - 1 ? 'text-ink' : ''}>• {l}</li>)}
        </ul>
        <p className="mt-3 text-[11px] text-dim">Move with arrow keys / WASD or the d-pad. Fog hides unexplored rooms. Every floor's stairs are reachable. Death is permanent.</p>
      </div>
    </Frame>
  )
}
