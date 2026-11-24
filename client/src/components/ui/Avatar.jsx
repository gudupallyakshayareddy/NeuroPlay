// Procedural SVG avatars. Eight selectable identities, no external images.
const DEFS = {
  nova: { bg: '#7C5CFF', fg: '#E8EAFF', shape: 'star' },
  orbit: { bg: '#22D3EE', fg: '#05060F', shape: 'ring' },
  pixel: { bg: '#34D399', fg: '#05060F', shape: 'pixel' },
  cipher: { bg: '#A68BFF', fg: '#05060F', shape: 'glyph' },
  ember: { bg: '#F87171', fg: '#05060F', shape: 'flame' },
  flux: { bg: '#60A5FA', fg: '#05060F', shape: 'wave' },
  sage: { bg: '#FBBF24', fg: '#05060F', shape: 'leaf' },
  volt: { bg: '#EC4899', fg: '#E8EAFF', shape: 'bolt' },
}
export const AVATAR_IDS = Object.keys(DEFS)

function Shape({ shape, fg }) {
  switch (shape) {
    case 'star': return <path d="M24 8l4.5 10.5L39 23l-10.5 4.5L24 38l-4.5-10.5L9 23l10.5-4.5z" fill={fg} />
    case 'ring': return <><circle cx="24" cy="24" r="11" fill="none" stroke={fg} strokeWidth="4" /><circle cx="35" cy="13" r="4" fill={fg} /></>
    case 'pixel': return <g fill={fg}><rect x="12" y="12" width="10" height="10" rx="2" /><rect x="26" y="12" width="10" height="10" rx="2" /><rect x="12" y="26" width="10" height="10" rx="2" /><rect x="26" y="26" width="10" height="10" rx="2" opacity="0.5" /></g>
    case 'glyph': return <path d="M14 34V14h12a7 7 0 010 14h-8m8 0l8 6" fill="none" stroke={fg} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    case 'flame': return <path d="M24 8c2 8 10 10 10 20a10 10 0 01-20 0c0-6 4-8 6-14 2 4 4 5 4 5s0-6 0-11z" fill={fg} />
    case 'wave': return <path d="M8 28c6-10 10-10 16 0s10 10 16 0M8 20c6-10 10-10 16 0s10 10 16 0" fill="none" stroke={fg} strokeWidth="4" strokeLinecap="round" />
    case 'leaf': return <path d="M34 12C20 12 12 22 12 36c14 0 24-8 24-22zM14 34C20 26 26 20 32 16" fill="none" stroke={fg} strokeWidth="3.5" strokeLinecap="round" />
    case 'bolt': return <path d="M27 6L12 27h9l-3 15 17-23h-10z" fill={fg} />
    default: return <circle cx="24" cy="24" r="10" fill={fg} />
  }
}

export default function Avatar({ id = 'nova', size = 40, className = '' }) {
  const d = DEFS[id] || DEFS.nova
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`shrink-0 rounded-xl ${className}`} role="img" aria-label={`${id} avatar`}>
      <rect width="48" height="48" rx="12" fill={d.bg} fillOpacity="0.25" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="10.5" fill="none" stroke={d.bg} strokeOpacity="0.7" strokeWidth="1.5" />
      <Shape shape={d.shape} fg={d.bg} />
    </svg>
  )
}