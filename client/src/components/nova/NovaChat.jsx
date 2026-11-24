import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Send, X } from 'lucide-react'
import { api } from '../../api'
import { useProgress, levelInfo, currentStreak } from '../../engine/progress'
import { getGame, getCategory } from '../../data/games'

/** NOVA: floating assistant. Every message goes through the server, which holds the Gemini key. */
export default function NovaChat() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState([{ role: 'nova', text: 'Hi, I am NOVA. Ask me for a hint, a strategy tip, or what to play next.' }])
  const progress = useProgress()
  const { pathname } = useLocation()
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])

  const gameSlug = pathname.match(/^\/(?:play|games)\/([\w-]+)/)?.[1]

  const send = async (e) => {
    e.preventDefault()
    const message = text.trim()
    if (!message || busy) return
    setText(''); setBusy(true)
    const history = msgs.slice(-6).map(({ role, text }) => ({ role, text }))
    setMsgs((m) => [...m, { role: 'user', text: message }])
    // Only real stats and the game slug are sent. Solutions never exist in this context.
    const cats = {}
    progress.history.forEach((h) => { const c = getGame(h.slug)?.category; if (c) cats[c] = (cats[c] || 0) + 1 })
    const favCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0]
    const stats = {
      level: levelInfo(progress.xp).level, xp: progress.xp, coins: progress.coins, streak: currentStreak(progress), gamesPlayed: progress.history.length,
      ...(favCat && { favoriteCategory: getCategory(favCat).short }),
      recent: progress.history.slice(0, 5).map((h) => ({ game: getGame(h.slug)?.title || h.slug, rating: Math.round(h.rating * 100) / 100 })),
    }
    try {
      const r = await api('/nova', { message, context: { page: pathname, game: gameSlug, stats }, history }, { timeoutMs: 15000 })
      setMsgs((m) => [...m, { role: 'nova', text: r.reply }])
    } catch (err) {
      setMsgs((m) => [...m, { role: 'nova', text: `NOVA is offline: ${err.message}` }])
    } finally { setBusy(false) }
  }

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close NOVA' : 'Open NOVA assistant'} aria-expanded={open}
        className="fixed bottom-5 right-5 z-[90] grid h-14 w-14 place-items-center rounded-full bg-violet text-white shadow-glow-lg transition hover:scale-105">
        {open ? <X size={24} /> : <Bot size={26} />}
      </button>
      {open && (
        <section aria-label="NOVA chat" className="glass fixed bottom-24 right-4 z-[90] flex h-[26rem] max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl shadow-glow">
          <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold"><Bot size={18} className="text-cyan" /> NOVA {gameSlug && getGame(gameSlug) && <span className="text-xs font-normal text-dim">· {getGame(gameSlug).title}</span>}</header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm" aria-live="polite">
            {msgs.map((m, i) => <div key={i} className={`max-w-[88%] rounded-xl px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-violet/30' : 'bg-white/5'}`}>{m.text}</div>)}
            {busy && <div className="w-fit rounded-xl bg-white/5 px-3 py-2 text-dim">NOVA is thinking…</div>}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Ask for a hint…" aria-label="Message NOVA" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-void/60 px-3 py-2 text-sm outline-none focus:border-cyan" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-lg bg-violet text-white disabled:opacity-50"><Send size={16} /></button>
          </form>
        </section>
      )}
    </>
  )
}
