export default function LevelRing({ level, pct, size = 120 }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`Level ${level}, ${Math.round(pct * 100)}% to next level`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs><linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7C5CFF" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-g)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute text-center"><div className="text-[10px] uppercase tracking-wider text-dim">Level</div><div className="font-display text-3xl font-bold">{level}</div></div>
    </div>
  )
}
