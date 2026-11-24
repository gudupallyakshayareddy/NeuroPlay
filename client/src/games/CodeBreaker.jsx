import { useEffect, useRef, useState } from 'react'
import { Delete, Send } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, rand } from './ui.jsx'
import useCountdown from '../engine/useCountdown'
import { feedback } from './codeLogic.js'

const COLORS = ['bg-red-500', 'bg-amber-400', 'bg-emerald-500', 'bg-sky-500', 'bg-violet', 'bg-pink-500']
const CONFIG = [{ len: 4, tries: 10 }, { len: 4, tries: 8 }, { len: 5, tries: 10 }]

const fbClass = { hit: 'bg-success border-success', near: 'bg-warn border-warn', miss: 'bg-white/10 border-white/20' }

export default function CodeBreaker({ level, onFinish }) {
  const { len, tries } = CONFIG[level]
  const [secret] = useState(() => Array.from({ length: len }, () => rand(0, 5)))
  const [current, setCurrent] = useState([])
  const [rows, setRows] = useState([])
  const [over, setOver] = useState(false)
  const start = useRef(Date.now())
  const elapsed = Math.round(60 * 60 - useCountdown(3600, { running: !over }))

  const add = (d) => setCurrent((c) => (c.length < len && !over ? [...c, d] : c))
  const del = () => setCurrent((c) => c.slice(0, -1))
  const submit = () => {
    if (current.length !== len || over) return
    const fb = feedback(secret, current)
    const nextRows = [...rows, { guess: current, fb }]
    setRows(nextRows); setCurrent([])
    const won = fb.every((f) => f === 'hit')
    if (won || nextRows.length >= tries) {
      setOver(true)
      const secs = Math.round((Date.now() - start.current) / 1000)
      const left = tries - nextRows.length
      const score = won ? 100 + left * 50 + Math.max(0, 100 - secs) : nextRows.reduce((n, r) => n + r.fb.filter((f) => f === 'hit').length * 5, 0)
      const rating = won ? 0.45 + 0.55 * (left / (tries - 1)) : 0.1
      setTimeout(() => onFinish({
        score, rating, won,
        summary: won ? `Cracked in ${nextRows.length} guess${nextRows.length > 1 ? 'es' : ''}!` : `Out of attempts. The code was ${secret.map((s) => s + 1).join(' ')}.`,
        stats: [{ label: 'Attempts used', value: `${nextRows.length}/${tries}` }, { label: 'Time', value: `${secs}s` }, { label: 'Code length', value: len }],
      }), won ? 900 : 1800)
    }
  }

  const key = useRef()
  key.current = { add, del, submit }
  useEffect(() => {
    const h = (e) => {
      if (/^[1-6]$/.test(e.key)) key.current.add(Number(e.key) - 1)
      else if (e.key === 'Backspace') key.current.del()
      else if (e.key === 'Enter') key.current.submit()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const Peg = ({ d, cls = '' }) => <span className={`grid h-11 w-11 place-items-center rounded-full font-mono text-sm font-bold text-white sm:h-12 sm:w-12 ${COLORS[d]} ${cls}`}>{d + 1}</span>

  return (
    <Frame>
      <div className="mb-4 flex justify-between gap-3"><Stat label="Attempts left" value={tries - rows.length} /><Stat label="Time" value={`${elapsed}s`} /></div>
      <p className="mb-3 text-center text-sm text-dim">Crack the {len}-symbol code (symbols 1–6, repeats allowed). Green = right spot · Amber = wrong spot · Grey = not in code.</p>
      <div className="glass space-y-2 rounded-2xl p-4">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-center gap-2">
            {r.guess.map((g, j) => <span key={j} className={`rounded-full border-2 p-0.5 ${fbClass[r.fb[j]]}`}><Peg d={g} /></span>)}
          </div>
        ))}
        {!over && (
          <div className="flex items-center justify-center gap-2" aria-label="Current guess">
            {Array.from({ length: len }, (_, i) => current[i] !== undefined ? <span key={i} className="p-[3px]"><Peg d={current[i]} /></span> : <span key={i} className="m-[3px] h-11 w-11 rounded-full border-2 border-dashed border-white/20 sm:h-12 sm:w-12" />)}
          </div>
        )}
        {over && rows.length >= tries && !rows[rows.length - 1].fb.every((f) => f === 'hit') && (
          <div className="flex justify-center gap-2 pt-2">{secret.map((s, i) => <Peg key={i} d={s} />)}</div>
        )}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {COLORS.map((_, d) => <button key={d} onClick={() => add(d)} aria-label={`Symbol ${d + 1}`} disabled={over}><Peg d={d} cls="transition hover:scale-110" /></button>)}
      </div>
      <div className="mt-4 flex justify-center gap-3">
        <Button variant="secondary" onClick={del} disabled={over}><Delete size={16} /> Delete</Button>
        <Button onClick={submit} disabled={over || current.length !== len}><Send size={16} /> Submit guess</Button>
      </div>
    </Frame>
  )
}
