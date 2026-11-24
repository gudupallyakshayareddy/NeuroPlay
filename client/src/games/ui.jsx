// Small shared pieces for game screens.
export const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
export const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]] } return a }
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n))

export function Stat({ label, value, tone = '' }) {
  return (
    <div className="glass rounded-xl px-4 py-2 text-center">
      <div className="text-[11px] uppercase tracking-wider text-dim">{label}</div>
      <div className={`font-display text-xl font-bold ${tone}`}>{value}</div>
    </div>
  )
}
export function Lives({ n, max = 3 }) {
  return <div className="flex gap-1" aria-label={`${n} lives left`}>{Array.from({ length: max }).map((_, i) => <span key={i} className={`h-3 w-3 rounded-full ${i < n ? 'bg-danger' : 'bg-white/15'}`} />)}</div>
}
export function Frame({ children, className = '' }) {
  return <div className={`mx-auto w-full max-w-2xl ${className}`}>{children}</div>
}
