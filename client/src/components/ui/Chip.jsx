import { cn } from '../../utils/cn'

/** Small pill used for filters (selectable) and labels. */
export default function Chip({ active = false, color, onClick, children, className, ...rest }) {
  const style = active && color ? { borderColor: color, background: `${color}22`, color } : undefined
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      style={style}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active && !color && 'border-violet bg-violet/20 text-violet-soft',
        !active && 'border-white/10 text-dim',
        onClick && !active && 'hover:border-white/25 hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
