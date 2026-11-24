import { Link } from 'react-router-dom'

export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="np-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C5CFF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0F1530" stroke="rgba(139,148,255,0.3)" />
      <path d="M18 46V18l28 28V18" fill="none" stroke="url(#np-logo-g)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Logo({ size = 32 }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="NeuroPlay home">
      <LogoMark size={size} />
      <span className="font-display text-xl font-bold tracking-tight">
        Neuro<span className="text-gradient">Play</span>
      </span>
    </Link>
  )
}
